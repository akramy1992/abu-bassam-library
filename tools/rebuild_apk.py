#!/usr/bin/env python3
"""Rebuild the Abu Bassam APK from an already compiled native Android shell."""

from __future__ import annotations

import argparse
import binascii
import io
import json
import struct
import zlib
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


OLD_PACKAGE = "com.akramghazali.phonerepair"
NEW_PACKAGE = "com.abubassam.librarycamera3"
OLD_NAME = "مركز أكرم الغزالي"
NEW_NAME = "مكتبة أبو بسام"
OLD_VERSION = "2.2.1"
NEW_VERSION = "4.3.2"
NEW_VERSION_CODE = 432

EOCD_MAGIC = b"PK\x05\x06"
LOCAL_MAGIC = b"PK\x03\x04"
CENTRAL_MAGIC = b"PK\x01\x02"
SIG_MAGIC = b"APK Sig Block 42"

UNUSED_PERMISSIONS = {
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.RECORD_AUDIO",
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.WRITE_EXTERNAL_STORAGE",
}

LAUNCHER_ICONS = {
    "res/d2.webp",
    "res/MO.webp",
    "res/qs.webp",
    "res/Sn.webp",
    "res/sK.webp",
    "res/Nt.webp",
    "res/13.webp",
    "res/9Q.webp",
    "res/iE.webp",
    "res/5c.webp",
    "res/yw.webp",
    "res/fq.webp",
    "res/u5.webp",
    "res/j_.webp",
    "res/-6.webp",
}

SPLASH_IMAGES = {
    "res/S7.png",
    "res/St.png",
    "res/42.png",
    "res/Zt.png",
    "res/gV.png",
}


def u16(data: bytes | bytearray, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def u32(data: bytes | bytearray, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def encode_length8(value: int) -> bytes:
    if value <= 0x7F:
        return bytes([value])
    if value <= 0x7FFF:
        return bytes([0x80 | (value >> 8), value & 0xFF])
    raise ValueError("UTF-8 Android string is too long")


def encode_length16(value: int) -> bytes:
    if value <= 0x7FFF:
        return struct.pack("<H", value)
    if value <= 0x7FFFFFFF:
        return struct.pack("<HH", 0x8000 | (value >> 16), value & 0xFFFF)
    raise ValueError("UTF-16 Android string is too long")


def decode_length8(data: bytes | bytearray, offset: int) -> tuple[int, int]:
    value = data[offset]
    offset += 1
    if value & 0x80:
        value = ((value & 0x7F) << 8) | data[offset]
        offset += 1
    return value, offset


def decode_length16(data: bytes | bytearray, offset: int) -> tuple[int, int]:
    value = u16(data, offset)
    offset += 2
    if value & 0x8000:
        value = ((value & 0x7FFF) << 16) | u16(data, offset)
        offset += 2
    return value, offset


@dataclass
class PoolString:
    index: int
    relative_start: int
    content_start: int
    content_end: int
    record_end: int
    value: str


def parse_string_pool(data: bytes | bytearray, offset: int) -> tuple[list[PoolString], bool]:
    if u16(data, offset) != 0x0001:
        raise ValueError(f"string pool missing at {offset:#x}")
    header_size = u16(data, offset + 2)
    string_count = u32(data, offset + 8)
    style_count = u32(data, offset + 12)
    flags = u32(data, offset + 16)
    strings_start = u32(data, offset + 20)
    if style_count:
        raise ValueError("styled string pools are not supported by this builder")
    utf8 = bool(flags & 0x100)
    result: list[PoolString] = []
    for index in range(string_count):
        relative_start = u32(data, offset + header_size + index * 4)
        position = offset + strings_start + relative_start
        if utf8:
            _, position = decode_length8(data, position)
            byte_length, position = decode_length8(data, position)
            content_start = position
            content_end = position + byte_length
            value = bytes(data[content_start:content_end]).decode("utf-8")
            record_end = content_end + 1
        else:
            char_length, position = decode_length16(data, position)
            content_start = position
            content_end = position + char_length * 2
            value = bytes(data[content_start:content_end]).decode("utf-16le")
            record_end = content_end + 2
        result.append(
            PoolString(index, relative_start, content_start, content_end, record_end, value)
        )
    return result, utf8


def encode_pool_record(value: str, utf8: bool) -> bytes:
    utf16_length = len(value.encode("utf-16le")) // 2
    if utf8:
        encoded = value.encode("utf-8")
        return encode_length8(utf16_length) + encode_length8(len(encoded)) + encoded + b"\x00"
    encoded = value.encode("utf-16le")
    return encode_length16(utf16_length) + encoded + b"\x00\x00"


def replace_string_pool(
    data: bytes, offset: int, replacements: dict[str, str]
) -> tuple[bytes, int]:
    strings, utf8 = parse_string_pool(data, offset)
    header_size = u16(data, offset + 2)
    old_size = u32(data, offset + 4)
    strings_start = u32(data, offset + 20)
    unique_starts = sorted({item.relative_start for item in strings})
    items_by_start = {item.relative_start: item for item in strings}
    final_record_end = max(item.record_end for item in strings) - (offset + strings_start)
    raw_strings = data[offset + strings_start : offset + strings_start + final_record_end]

    new_data = bytearray()
    remapped_offsets: dict[int, int] = {}
    for position, relative_start in enumerate(unique_starts):
        item = items_by_start[relative_start]
        next_start = (
            unique_starts[position + 1] if position + 1 < len(unique_starts) else final_record_end
        )
        remapped_offsets[relative_start] = len(new_data)
        replacement = replacements.get(item.value)
        if replacement is None:
            new_data.extend(raw_strings[relative_start:next_start])
        else:
            new_data.extend(encode_pool_record(replacement, utf8))

    prefix = bytearray(data[offset : offset + strings_start])
    for item in strings:
        struct.pack_into(
            "<I", prefix, header_size + item.index * 4, remapped_offsets[item.relative_start]
        )
    new_size = strings_start + len(new_data)
    padding_size = (-new_size) % 4
    new_pool = prefix + new_data + b"\x00" * padding_size
    struct.pack_into("<I", new_pool, 4, len(new_pool))
    return data[:offset] + bytes(new_pool) + data[offset + old_size :], len(new_pool) - old_size


def strip_manifest_permissions(manifest: bytes, unwanted: set[str]) -> bytes:
    """Remove complete binary-XML permission elements that the app does not use."""
    strings, _ = parse_string_pool(manifest, 8)
    values = [item.value for item in strings]
    output = bytearray(manifest[:8])
    removed: set[str] = set()
    skip_depth = 0
    offset = 8

    while offset + 8 <= len(manifest):
        chunk_type = u16(manifest, offset)
        chunk_size = u32(manifest, offset + 4)
        if chunk_size < 8 or offset + chunk_size > len(manifest):
            raise ValueError("invalid AndroidManifest XML chunk")

        keep = skip_depth == 0
        if chunk_type == 0x0102:
            if skip_depth:
                skip_depth += 1
                keep = False
            else:
                element_name = values[u32(manifest, offset + 20)]
                if element_name in {"uses-permission", "uses-permission-sdk-23"}:
                    attribute_start = u16(manifest, offset + 24)
                    attribute_size = u16(manifest, offset + 26)
                    attribute_count = u16(manifest, offset + 28)
                    attribute_base = offset + 16 + attribute_start
                    permission_name = None
                    for index in range(attribute_count):
                        attribute = attribute_base + index * attribute_size
                        name = values[u32(manifest, attribute + 4)]
                        if name != "name":
                            continue
                        raw_value = u32(manifest, attribute + 8)
                        value_type = manifest[attribute + 15]
                        value_data = u32(manifest, attribute + 16)
                        if raw_value != 0xFFFFFFFF:
                            permission_name = values[raw_value]
                        elif value_type == 0x03:
                            permission_name = values[value_data]
                    if permission_name in unwanted:
                        removed.add(permission_name)
                        skip_depth = 1
                        keep = False
        elif chunk_type == 0x0103 and skip_depth:
            skip_depth -= 1
            keep = False
        elif skip_depth:
            keep = False

        if keep:
            output.extend(manifest[offset : offset + chunk_size])
        offset += chunk_size

    if offset != len(manifest) or skip_depth:
        raise ValueError("AndroidManifest XML structure is incomplete")
    if removed != unwanted:
        missing = ", ".join(sorted(unwanted - removed))
        raise ValueError(f"expected unused permissions were not found: {missing}")
    struct.pack_into("<I", output, 4, len(output))
    return bytes(output)


def patch_manifest(manifest: bytes) -> bytes:
    data = bytearray(manifest)
    strings, utf8 = parse_string_pool(data, 8)
    if utf8:
        raise ValueError("expected UTF-16 AndroidManifest string pool")
    authority_values = {
        OLD_PACKAGE,
        OLD_PACKAGE + ".fileprovider",
        OLD_PACKAGE + ".androidx-startup",
        OLD_PACKAGE + ".mlkitinitprovider",
        OLD_PACKAGE + ".FileSystemFileProvider",
        OLD_PACKAGE + ".SharingFileProvider",
        OLD_PACKAGE + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION",
    }
    package_replacements = 0
    version_replacements = 0
    for item in strings:
        replacement = None
        if item.value in authority_values:
            replacement = item.value.replace(OLD_PACKAGE, NEW_PACKAGE, 1)
            package_replacements += 1
        elif item.value == OLD_VERSION:
            replacement = NEW_VERSION
            version_replacements += 1
        if replacement is not None:
            encoded = replacement.encode("utf-16le")
            if len(encoded) != item.content_end - item.content_start:
                raise ValueError("manifest string replacement changed byte length")
            data[item.content_start : item.content_end] = encoded

    string_values = [item.value for item in strings]
    offset = 8 + u32(data, 12)
    version_code_patched = False
    while offset + 8 <= len(data):
        chunk_type = u16(data, offset)
        chunk_size = u32(data, offset + 4)
        if chunk_type == 0x0102:
            element_name = string_values[u32(data, offset + 20)]
            if element_name == "manifest":
                attribute_start = u16(data, offset + 24)
                attribute_size = u16(data, offset + 26)
                attribute_count = u16(data, offset + 28)
                attribute_base = offset + 16 + attribute_start
                for index in range(attribute_count):
                    attribute = attribute_base + index * attribute_size
                    attribute_name = string_values[u32(data, attribute + 4)]
                    if attribute_name == "versionCode":
                        struct.pack_into("<I", data, attribute + 16, NEW_VERSION_CODE)
                        version_code_patched = True
        if chunk_size == 0:
            break
        offset += chunk_size
    if package_replacements < 6 or version_replacements != 1 or not version_code_patched:
        raise ValueError("manifest patch did not find all expected fields")
    return strip_manifest_permissions(bytes(data), UNUSED_PERMISSIONS)


def patch_resources(resources: bytes) -> bytes:
    patched, delta = replace_string_pool(
        resources,
        12,
        {
            OLD_NAME: NEW_NAME,
            OLD_PACKAGE: NEW_PACKAGE,
        },
    )
    data = bytearray(patched)
    struct.pack_into("<I", data, 4, len(data))
    package_offset = 12 + u32(data, 16)
    if u16(data, package_offset) != 0x0200:
        raise ValueError("resource package chunk not found after global string pool")
    package_name_offset = package_offset + 12
    old_package_name = bytes(data[package_name_offset : package_name_offset + 256]).decode(
        "utf-16le"
    ).split("\x00", 1)[0]
    if old_package_name != OLD_PACKAGE:
        raise ValueError(f"unexpected resource package name: {old_package_name}")
    replacement = NEW_PACKAGE.encode("utf-16le")
    data[package_name_offset : package_name_offset + len(replacement)] = replacement
    if delta == 0:
        raise ValueError("application label replacement unexpectedly had no size effect")
    return bytes(data)


def patch_app_config(config: bytes) -> bytes:
    parsed = json.loads(config.decode("utf-8"))
    parsed.update(
        {
            "name": NEW_NAME,
            "slug": "abu-bassam-library",
            "version": NEW_VERSION,
            "scheme": "abu-bassam-library",
            "userInterfaceStyle": "light",
        }
    )
    parsed.setdefault("android", {})["package"] = NEW_PACKAGE
    parsed["android"]["versionCode"] = NEW_VERSION_CODE
    if "ios" in parsed:
        parsed["ios"]["bundleIdentifier"] = NEW_PACKAGE
    return json.dumps(parsed, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def replacement_icon(original: bytes, icon_path: Path, suffix: str) -> bytes:
    with Image.open(io.BytesIO(original)) as template:
        size = template.size
    with Image.open(icon_path) as source:
        image = source.convert("RGBA").resize(size, Image.Resampling.LANCZOS)
    output = io.BytesIO()
    if suffix == ".webp":
        image.convert("RGB").save(output, "WEBP", quality=94, method=6)
    else:
        image.save(output, "PNG", optimize=True)
    return output.getvalue()


@dataclass
class CentralEntry:
    record: bytes
    name_bytes: bytes
    name: str
    version_needed: int
    flags: int
    method: int
    mod_time: int
    mod_date: int
    crc: int
    compressed_size: int
    uncompressed_size: int
    local_offset: int


def find_eocd(data: bytes) -> int:
    offset = data.rfind(EOCD_MAGIC, max(0, len(data) - 65557))
    if offset < 0:
        raise ValueError("ZIP EOCD not found")
    return offset


def parse_central_entries(data: bytes) -> tuple[list[CentralEntry], int, int, bytes]:
    eocd = find_eocd(data)
    central_offset = u32(data, eocd + 16)
    central_size = u32(data, eocd + 12)
    comment_length = u16(data, eocd + 20)
    entries: list[CentralEntry] = []
    offset = central_offset
    end = central_offset + central_size
    while offset < end:
        if data[offset : offset + 4] != CENTRAL_MAGIC:
            raise ValueError(f"bad central directory record at {offset:#x}")
        name_length = u16(data, offset + 28)
        extra_length = u16(data, offset + 30)
        comment_size = u16(data, offset + 32)
        record_size = 46 + name_length + extra_length + comment_size
        record = data[offset : offset + record_size]
        name_bytes = record[46 : 46 + name_length]
        flags = u16(record, 8)
        encoding = "utf-8" if flags & 0x800 else "cp437"
        name = name_bytes.decode(encoding)
        entries.append(
            CentralEntry(
                record=record,
                name_bytes=name_bytes,
                name=name,
                version_needed=u16(record, 6),
                flags=flags,
                method=u16(record, 10),
                mod_time=u16(record, 12),
                mod_date=u16(record, 14),
                crc=u32(record, 16),
                compressed_size=u32(record, 20),
                uncompressed_size=u32(record, 24),
                local_offset=u32(record, 42),
            )
        )
        offset += record_size
    if offset != end:
        raise ValueError("central directory size mismatch")
    return entries, central_offset, eocd, data[eocd + 22 : eocd + 22 + comment_length]


def compressed_payload(data: bytes, entry: CentralEntry) -> bytes:
    offset = entry.local_offset
    if data[offset : offset + 4] != LOCAL_MAGIC:
        raise ValueError(f"bad local record for {entry.name}")
    name_length = u16(data, offset + 26)
    extra_length = u16(data, offset + 28)
    start = offset + 30 + name_length + extra_length
    return data[start : start + entry.compressed_size]


def deflate(raw: bytes) -> bytes:
    compressor = zlib.compressobj(level=9, method=zlib.DEFLATED, wbits=-15)
    return compressor.compress(raw) + compressor.flush()


def local_extra(offset: int, name_length: int, method: int, name: str) -> bytes:
    if method != 0:
        return b""
    alignment = 16384 if name.startswith("lib/") and name.endswith(".so") else 4
    base = offset + 30 + name_length
    padding_size = (-base) % alignment
    if padding_size == 0:
        return b""
    if padding_size < 4:
        padding_size += alignment
    return struct.pack("<HH", 0xD935, padding_size - 4) + b"\x00" * (padding_size - 4)


def write_entry(
    output: bytearray,
    central_records: list[bytes],
    name: str,
    raw: bytes | None,
    template_data: bytes | None,
    template: CentralEntry | None,
    method: int | None = None,
) -> None:
    if template is None:
        name_bytes = name.encode("utf-8")
        flags = 0x800
        selected_method = 8 if method is None else method
        version_needed = 20
        mod_time = 0x0821
        mod_date = 0x0021
        external_attributes = (0o100644 << 16)
        central_extra = b""
        comment = b""
        version_made = 0x031E
        internal_attributes = 0
    else:
        name_bytes = template.name_bytes
        flags = template.flags & ~0x08
        selected_method = template.method if method is None else method
        version_needed = template.version_needed
        mod_time = template.mod_time
        mod_date = template.mod_date
        external_attributes = u32(template.record, 38)
        extra_length = u16(template.record, 30)
        comment_length = u16(template.record, 32)
        central_extra = template.record[46 + len(name_bytes) : 46 + len(name_bytes) + extra_length]
        comment = template.record[
            46 + len(name_bytes) + extra_length : 46 + len(name_bytes) + extra_length + comment_length
        ]
        version_made = u16(template.record, 4)
        internal_attributes = u16(template.record, 36)

    if raw is None:
        if template is None or template_data is None:
            raise ValueError(f"missing source data for {name}")
        payload = compressed_payload(template_data, template)
        crc = template.crc
        compressed_size = template.compressed_size
        uncompressed_size = template.uncompressed_size
    else:
        crc = binascii.crc32(raw) & 0xFFFFFFFF
        uncompressed_size = len(raw)
        if selected_method == 0:
            payload = raw
        elif selected_method == 8:
            payload = deflate(raw)
        else:
            raise ValueError(f"unsupported compression method {selected_method} for {name}")
        compressed_size = len(payload)

    local_offset = len(output)
    extra = local_extra(local_offset, len(name_bytes), selected_method, name)
    output.extend(
        struct.pack(
            "<IHHHHHIIIHH",
            0x04034B50,
            version_needed,
            flags,
            selected_method,
            mod_time,
            mod_date,
            crc,
            compressed_size,
            uncompressed_size,
            len(name_bytes),
            len(extra),
        )
    )
    output.extend(name_bytes)
    output.extend(extra)
    output.extend(payload)

    central = bytearray(
        struct.pack(
            "<IHHHHHHIIIHHHHHII",
            0x02014B50,
            version_made,
            version_needed,
            flags,
            selected_method,
            mod_time,
            mod_date,
            crc,
            compressed_size,
            uncompressed_size,
            len(name_bytes),
            len(central_extra),
            len(comment),
            0,
            internal_attributes,
            external_attributes,
            local_offset,
        )
    )
    central.extend(name_bytes)
    central.extend(central_extra)
    central.extend(comment)
    central_records.append(bytes(central))


def should_skip(name: str) -> bool:
    upper = name.upper()
    if name.startswith("lib/x86/") or name.startswith("lib/x86_64/"):
        return True
    if upper == "META-INF/MANIFEST.MF":
        return True
    if upper.startswith("META-INF/") and upper.endswith((".SF", ".RSA", ".DSA", ".EC")):
        return True
    return False


def build_apk(
    template_path: Path,
    bundle_path: Path,
    web_directory: Path,
    icon_path: Path,
    output_path: Path,
) -> dict[str, int]:
    template_data = template_path.read_bytes()
    entries, _, _, comment = parse_central_entries(template_data)
    entry_by_name = {entry.name: entry for entry in entries}
    expected = {"AndroidManifest.xml", "resources.arsc", "assets/app.config", "assets/index.android.bundle"}
    if not expected.issubset(entry_by_name):
        raise ValueError("native APK template is missing expected entries")

    replacements: dict[str, bytes] = {
        "AndroidManifest.xml": patch_manifest(
            zlib.decompress(compressed_payload(template_data, entry_by_name["AndroidManifest.xml"]), -15)
            if entry_by_name["AndroidManifest.xml"].method == 8
            else compressed_payload(template_data, entry_by_name["AndroidManifest.xml"])
        ),
        "resources.arsc": patch_resources(
            zlib.decompress(compressed_payload(template_data, entry_by_name["resources.arsc"]), -15)
            if entry_by_name["resources.arsc"].method == 8
            else compressed_payload(template_data, entry_by_name["resources.arsc"])
        ),
        "assets/app.config": patch_app_config(
            zlib.decompress(compressed_payload(template_data, entry_by_name["assets/app.config"]), -15)
            if entry_by_name["assets/app.config"].method == 8
            else compressed_payload(template_data, entry_by_name["assets/app.config"])
        ),
        "assets/index.android.bundle": bundle_path.read_bytes(),
    }

    for name in sorted(LAUNCHER_ICONS | SPLASH_IMAGES):
        if name not in entry_by_name:
            raise ValueError(f"icon template entry missing: {name}")
        entry = entry_by_name[name]
        payload = compressed_payload(template_data, entry)
        original = zlib.decompress(payload, -15) if entry.method == 8 else payload
        replacements[name] = replacement_icon(original, icon_path, Path(name).suffix.lower())

    web_entries = [
        (f"assets/library/{path.relative_to(web_directory).as_posix()}", path.read_bytes())
        for path in sorted(web_directory.rglob("*"))
        if path.is_file()
    ]
    output = bytearray()
    central_records: list[bytes] = []
    inserted_web = False
    kept = 0
    skipped = 0
    for entry in entries:
        if should_skip(entry.name):
            skipped += 1
            continue
        write_entry(
            output,
            central_records,
            entry.name,
            replacements.get(entry.name),
            template_data,
            entry,
        )
        kept += 1
        if entry.name == "assets/index.android.bundle":
            for name, raw in web_entries:
                write_entry(output, central_records, name, raw, None, None, method=8)
            inserted_web = True
    if not inserted_web:
        raise ValueError("failed to insert web application assets")

    central_offset = len(output)
    for record in central_records:
        output.extend(record)
    central_size = len(output) - central_offset
    if len(central_records) > 0xFFFF:
        raise ValueError("ZIP64 would be required")
    output.extend(
        struct.pack(
            "<IHHHHIIH",
            0x06054B50,
            0,
            0,
            len(central_records),
            len(central_records),
            central_size,
            central_offset,
            len(comment),
        )
    )
    output.extend(comment)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(output)
    return {
        "kept_entries": kept,
        "skipped_entries": skipped,
        "web_entries": len(web_entries),
        "output_entries": len(central_records),
        "output_size": len(output),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("template", type=Path)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("web_directory", type=Path)
    parser.add_argument("icon", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    result = build_apk(args.template, args.bundle, args.web_directory, args.icon, args.output)
    for key, value in result.items():
        print(f"{key}={value}")


if __name__ == "__main__":
    main()
