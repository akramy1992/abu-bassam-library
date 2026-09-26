#!/usr/bin/env python3
"""Offline release checks for the Abu Bassam Android APK."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path

from apk_v2 import verify_apk
from rebuild_apk import parse_string_pool, u16, u32


REQUIRED_ASSETS = {
    "assets/library/index.html",
    "assets/library/residence-card.html",
    "assets/library/cards-studio-runtime.js",
    "assets/library/national-id-runtime.js",
    "assets/library/document-vault-runtime.js",
    "assets/library/app-settings-runtime.js",
    "assets/library/secure-sync-runtime.js",
    "assets/library/supabase-2.58.0.js",
    "assets/library/typography-runtime.js",
    "assets/library/productivity-tools-runtime.js",
    "assets/library/questions-ar.html",
    "assets/library/questions-en.html",
    "assets/library/image-compressor.html",
    "assets/library/qrcode.js",
    "assets/library/jszip.min.js",
    "assets/library/fonts/Cairo-Regular.ttf",
    "assets/library/fonts/Cairo-Bold.ttf",
    "assets/library/fonts/Tajawal-Regular.ttf",
    "assets/library/fonts/Tajawal-Bold.ttf",
    "assets/index.android.bundle",
}

FORBIDDEN_PAYLOADS = (
    b"sendTelegramFile",
    b"api.telegram.org/bot",
    b"/rest/v1/abu_bassam_sync?",
    b"service_role",
    b"sb_secret_",
    b"BEGIN " + b"PRIVATE KEY",
)


def typed_value(data: bytes, strings: list[str], attribute: int):
    raw = u32(data, attribute + 8)
    value_type = data[attribute + 15]
    value_data = u32(data, attribute + 16)
    if raw != 0xFFFFFFFF:
        return strings[raw]
    if value_type == 0x03:
        return strings[value_data]
    if value_type in {0x10, 0x11, 0x12}:
        return value_data
    return value_data


def manifest_details(manifest: bytes) -> dict:
    parsed, _ = parse_string_pool(manifest, 8)
    strings = [item.value for item in parsed]
    offset = 8 + u32(manifest, 12)
    manifest_attributes: dict[str, object] = {}
    permissions: list[str] = []
    while offset + 8 <= len(manifest):
        chunk_type = u16(manifest, offset)
        chunk_size = u32(manifest, offset + 4)
        if chunk_size < 8:
            raise ValueError("invalid AndroidManifest chunk")
        if chunk_type == 0x0102:
            element = strings[u32(manifest, offset + 20)]
            attribute_start = u16(manifest, offset + 24)
            attribute_size = u16(manifest, offset + 26)
            attribute_count = u16(manifest, offset + 28)
            base = offset + 16 + attribute_start
            attrs = {}
            for index in range(attribute_count):
                attribute = base + index * attribute_size
                name = strings[u32(manifest, attribute + 4)]
                attrs[name] = typed_value(manifest, strings, attribute)
            if element == "manifest":
                manifest_attributes.update(attrs)
            elif element in {"uses-permission", "uses-permission-sdk-23"} and attrs.get("name"):
                permissions.append(str(attrs["name"]))
        offset += chunk_size
    return {
        "package": manifest_attributes.get("package"),
        "version_name": manifest_attributes.get("versionName"),
        "version_code": manifest_attributes.get("versionCode"),
        "permissions": sorted(set(permissions)),
    }


def data_offset(apk_data: bytes, info: zipfile.ZipInfo) -> int:
    offset = info.header_offset
    if apk_data[offset : offset + 4] != b"PK\x03\x04":
        raise ValueError(f"bad local header for {info.filename}")
    name_length = struct.unpack_from("<H", apk_data, offset + 26)[0]
    extra_length = struct.unpack_from("<H", apk_data, offset + 28)[0]
    return offset + 30 + name_length + extra_length


def verify(path: Path, previous: Path | None) -> dict:
    apk_data = path.read_bytes()
    signer = verify_apk(path)
    with zipfile.ZipFile(path) as archive:
        corrupt = archive.testzip()
        infos = archive.infolist()
        names = [info.filename for info in infos]
        duplicates = sorted({name for name in names if names.count(name) > 1})
        missing = sorted(REQUIRED_ASSETS - set(names))
        manifest = manifest_details(archive.read("AndroidManifest.xml"))
        libraries = [info for info in infos if info.filename.startswith("lib/") and info.filename.endswith(".so")]
        bad_alignment = [
            info.filename
            for info in libraries
            if info.compress_type != zipfile.ZIP_STORED or data_offset(apk_data, info) % 16384
        ]
        payload = b"".join(
            archive.read(name)
            for name in names
            if name.startswith("assets/library/") or name == "assets/index.android.bundle"
        )
    forbidden = [needle.decode("utf-8", "replace") for needle in FORBIDDEN_PAYLOADS if needle in payload]
    previous_signer = verify_apk(previous) if previous else None
    checks = {
        "zip_integrity": corrupt is None,
        "no_duplicate_entries": not duplicates,
        "required_assets_present": not missing,
        "package_identity": manifest["package"] == "com.abubassam.librarycamera3",
        "version_name": manifest["version_name"] == "4.3.2",
        "version_code": manifest["version_code"] == 432,
        "camera_permission": "android.permission.CAMERA" in manifest["permissions"],
        "unused_storage_audio_overlay_permissions_removed": not {
            "android.permission.READ_EXTERNAL_STORAGE",
            "android.permission.WRITE_EXTERNAL_STORAGE",
            "android.permission.RECORD_AUDIO",
            "android.permission.SYSTEM_ALERT_WINDOW",
        }.intersection(manifest["permissions"]),
        "native_libraries_16k_aligned": not bad_alignment,
        "signature_matches_previous": previous_signer is None
        or signer["certificate_sha256"] == previous_signer["certificate_sha256"],
        "no_forbidden_secrets_or_direct_telegram_sender": not forbidden,
    }
    return {
        "apk": str(path),
        "size_bytes": len(apk_data),
        "sha256": hashlib.sha256(apk_data).hexdigest(),
        "certificate_sha256": signer["certificate_sha256"],
        "manifest": manifest,
        "entry_count": len(names),
        "native_library_count": len(libraries),
        "duplicates": duplicates,
        "missing_assets": missing,
        "bad_alignment": bad_alignment,
        "forbidden_payloads": forbidden,
        "checks": checks,
        "passed": all(checks.values()),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("apk", type=Path)
    parser.add_argument("--previous", type=Path)
    args = parser.parse_args()
    result = verify(args.apk, args.previous)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not result["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
