#!/usr/bin/env python3
"""Small APK Signature Scheme v2 signer/verifier for this offline build."""

from __future__ import annotations

import argparse
import hashlib
import re
import struct
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12


EOCD_MAGIC = b"PK\x05\x06"
SIG_MAGIC = b"APK Sig Block 42"
V2_ID = 0x7109871A
RSA_PKCS1_SHA256 = 0x0103
CHUNK_SIZE = 1024 * 1024


def u32(value: int) -> bytes:
    return struct.pack("<I", value)


def u64(value: int) -> bytes:
    return struct.pack("<Q", value)


def lp(value: bytes) -> bytes:
    return u32(len(value)) + value


def read_lp(data: bytes, offset: int = 0) -> tuple[bytes, int]:
    if offset + 4 > len(data):
        raise ValueError("truncated length-prefixed value")
    length = struct.unpack_from("<I", data, offset)[0]
    start = offset + 4
    end = start + length
    if end > len(data):
        raise ValueError("length-prefixed value exceeds container")
    return data[start:end], end


def find_eocd(data: bytes) -> int:
    start = max(0, len(data) - 65557)
    offset = data.rfind(EOCD_MAGIC, start)
    if offset < 0 or offset + 22 > len(data):
        raise ValueError("ZIP EOCD not found")
    comment_length = struct.unpack_from("<H", data, offset + 20)[0]
    if offset + 22 + comment_length != len(data):
        raise ValueError("unexpected data after ZIP EOCD")
    return offset


def find_signing_block(data: bytes) -> tuple[int, int, dict[int, bytes]]:
    eocd = find_eocd(data)
    central_directory = struct.unpack_from("<I", data, eocd + 16)[0]
    if central_directory < 24 or data[central_directory - 16 : central_directory] != SIG_MAGIC:
        raise ValueError("APK Signing Block not found")
    footer_size = struct.unpack_from("<Q", data, central_directory - 24)[0]
    start = central_directory - footer_size - 8
    if start < 0 or struct.unpack_from("<Q", data, start)[0] != footer_size:
        raise ValueError("APK Signing Block sizes disagree")
    pairs: dict[int, bytes] = {}
    offset = start + 8
    end = central_directory - 24
    while offset < end:
        pair_size = struct.unpack_from("<Q", data, offset)[0]
        if pair_size < 4 or offset + 8 + pair_size > end:
            raise ValueError("invalid APK Signing Block pair")
        pair_id = struct.unpack_from("<I", data, offset + 8)[0]
        pairs[pair_id] = data[offset + 12 : offset + 8 + pair_size]
        offset += 8 + pair_size
    if offset != end:
        raise ValueError("APK Signing Block pair alignment is invalid")
    return start, central_directory, pairs


def content_digest(sections: list[bytes]) -> bytes:
    chunk_digests: list[bytes] = []
    for section in sections:
        for offset in range(0, len(section), CHUNK_SIZE):
            chunk = section[offset : offset + CHUNK_SIZE]
            chunk_digests.append(hashlib.sha256(b"\xa5" + u32(len(chunk)) + chunk).digest())
    if len(chunk_digests) > 0xFFFFFFFF:
        raise ValueError("too many APK digest chunks")
    return hashlib.sha256(b"\x5a" + u32(len(chunk_digests)) + b"".join(chunk_digests)).digest()


def digest_sections(data: bytes, signing_block_start: int, central_directory: int) -> list[bytes]:
    eocd = find_eocd(data)
    patched_eocd = bytearray(data[eocd:])
    struct.pack_into("<I", patched_eocd, 16, signing_block_start)
    return [data[:signing_block_start], data[central_directory:eocd], bytes(patched_eocd)]


def parse_v2(value: bytes) -> tuple[bytes, bytes, bytes, bytes]:
    signers, end = read_lp(value)
    if end != len(value):
        raise ValueError("trailing bytes after v2 signer sequence")
    signer, signer_end = read_lp(signers)
    if signer_end != len(signers):
        raise ValueError("this verifier expects one v2 signer")
    signed_data, offset = read_lp(signer)
    signatures, offset = read_lp(signer, offset)
    public_key, offset = read_lp(signer, offset)
    if offset != len(signer):
        raise ValueError("trailing bytes in v2 signer")

    digests_blob, signed_offset = read_lp(signed_data)
    certificates_blob, signed_offset = read_lp(signed_data, signed_offset)
    _, signed_offset = read_lp(signed_data, signed_offset)
    # Recent apksig releases reserve one trailing zero word in v2 signed data.
    # Older releases omit it. Both layouts are accepted by Android's verifier.
    if signed_data[signed_offset:] == b"\x00\x00\x00\x00":
        signed_offset += 4
    if signed_offset != len(signed_data):
        raise ValueError("trailing bytes in signed data")

    digest_record, digest_end = read_lp(digests_blob)
    if digest_end != len(digests_blob):
        raise ValueError("this verifier expects one digest")
    algorithm = struct.unpack_from("<I", digest_record, 0)[0]
    digest, digest_offset = read_lp(digest_record, 4)
    if algorithm != RSA_PKCS1_SHA256 or digest_offset != len(digest_record):
        raise ValueError("unexpected v2 digest algorithm")

    certificate_der, cert_end = read_lp(certificates_blob)
    if cert_end != len(certificates_blob):
        raise ValueError("this verifier expects one certificate")

    signature_record, signature_end = read_lp(signatures)
    if signature_end != len(signatures):
        raise ValueError("this verifier expects one signature")
    signature_algorithm = struct.unpack_from("<I", signature_record, 0)[0]
    signature, signature_offset = read_lp(signature_record, 4)
    if signature_algorithm != RSA_PKCS1_SHA256 or signature_offset != len(signature_record):
        raise ValueError("unexpected v2 signature algorithm")
    return signed_data, digest, certificate_der, signature


def verify_apk(path: Path) -> dict[str, str | int]:
    data = path.read_bytes()
    start, central_directory, pairs = find_signing_block(data)
    if V2_ID not in pairs:
        raise ValueError("APK Signature Scheme v2 block missing")
    signed_data, expected_digest, certificate_der, signature = parse_v2(pairs[V2_ID])
    actual_digest = content_digest(digest_sections(data, start, central_directory))
    if actual_digest != expected_digest:
        raise ValueError("APK content digest mismatch")
    certificate = x509.load_der_x509_certificate(certificate_der)
    public_key = certificate.public_key()
    public_key.verify(signature, signed_data, padding.PKCS1v15(), hashes.SHA256())
    public_key_der = public_key.public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    parsed_public_key = parse_v2_public_key(pairs[V2_ID])
    if public_key_der != parsed_public_key:
        raise ValueError("v2 public key does not match signer certificate")
    return {
        "size": len(data),
        "signing_block_offset": start,
        "central_directory_offset": central_directory,
        "certificate_sha256": certificate.fingerprint(hashes.SHA256()).hex(),
        "subject": certificate.subject.rfc4514_string(),
    }


def parse_v2_public_key(value: bytes) -> bytes:
    signers, _ = read_lp(value)
    signer, _ = read_lp(signers)
    _, offset = read_lp(signer)
    _, offset = read_lp(signer, offset)
    public_key, _ = read_lp(signer, offset)
    return public_key


def password_from_info(path: Path) -> bytes:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"كلمة\s+المرور\s*:\s*(\S+)", text)
    if not match:
        raise ValueError("keystore password not found in signing info")
    return match.group(1).encode("utf-8")


def load_identity(pkcs12_path: Path, info_path: Path):
    key, certificate, _ = pkcs12.load_key_and_certificates(
        pkcs12_path.read_bytes(), password_from_info(info_path)
    )
    if key is None or certificate is None:
        raise ValueError("PKCS#12 does not contain a private key and certificate")
    return key, certificate


def make_v2_value(digest: bytes, key, certificate: x509.Certificate) -> bytes:
    certificate_der = certificate.public_bytes(serialization.Encoding.DER)
    public_key_der = certificate.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    digest_record = u32(RSA_PKCS1_SHA256) + lp(digest)
    signed_data = lp(lp(digest_record)) + lp(lp(certificate_der)) + lp(b"")
    signature = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    signature_record = u32(RSA_PKCS1_SHA256) + lp(signature)
    signer = lp(signed_data) + lp(lp(signature_record)) + lp(public_key_der)
    return lp(lp(signer))


def make_signing_block(v2_value: bytes, alignment: int = 4096) -> bytes:
    v2_pair = u64(4 + len(v2_value)) + u32(V2_ID) + v2_value
    base_total = 8 + len(v2_pair) + 8 + len(SIG_MAGIC)
    padding_pair = b""
    remainder = base_total % alignment
    if remainder:
        required = alignment - remainder
        if required < 12:
            required += alignment
        padding_value = b"\x00" * (required - 12)
        padding_pair = u64(4 + len(padding_value)) + u32(0x42726577) + padding_value
    pairs = v2_pair + padding_pair
    size = len(pairs) + 24
    return u64(size) + pairs + u64(size) + SIG_MAGIC


def sign_apk(unsigned_path: Path, output_path: Path, pkcs12_path: Path, info_path: Path) -> None:
    data = unsigned_path.read_bytes()
    eocd = find_eocd(data)
    central_directory = struct.unpack_from("<I", data, eocd + 16)[0]
    if central_directory > eocd:
        raise ValueError("invalid central directory offset")
    try:
        find_signing_block(data)
    except ValueError:
        pass
    else:
        raise ValueError("input APK is already signed with an APK Signing Block")

    patched_eocd_for_digest = bytearray(data[eocd:])
    struct.pack_into("<I", patched_eocd_for_digest, 16, central_directory)
    digest = content_digest(
        [data[:central_directory], data[central_directory:eocd], bytes(patched_eocd_for_digest)]
    )
    key, certificate = load_identity(pkcs12_path, info_path)
    block = make_signing_block(make_v2_value(digest, key, certificate))

    final_eocd = bytearray(data[eocd:])
    struct.pack_into("<I", final_eocd, 16, central_directory + len(block))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(
        data[:central_directory] + block + data[central_directory:eocd] + bytes(final_eocd)
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    verify_parser = subparsers.add_parser("verify")
    verify_parser.add_argument("apk", type=Path)
    sign_parser = subparsers.add_parser("sign")
    sign_parser.add_argument("unsigned_apk", type=Path)
    sign_parser.add_argument("output_apk", type=Path)
    sign_parser.add_argument("pkcs12", type=Path)
    sign_parser.add_argument("signing_info", type=Path)
    args = parser.parse_args()
    if args.command == "verify":
        result = verify_apk(args.apk)
        for key, value in result.items():
            print(f"{key}={value}")
    else:
        sign_apk(args.unsigned_apk, args.output_apk, args.pkcs12, args.signing_info)
        result = verify_apk(args.output_apk)
        print(f"signed={args.output_apk}")
        print(f"size={result['size']}")
        print(f"certificate_sha256={result['certificate_sha256']}")


if __name__ == "__main__":
    main()
