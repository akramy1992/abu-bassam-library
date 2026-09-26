from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f"Expected marker not found for {label}")


admin = Path("web/admin-permissions-runtime.js")
admin_text = admin.read_text(encoding="utf-8")
admin_text = replace_once(
    admin_text,
    "if(!t)return,text=String(t.textContent||'');",
    "if(!t)return;const text=String(t.textContent||'');",
    "compressor permission guard syntax",
)
admin.write_text(admin_text, encoding="utf-8")


device = Path("web/device-reconcile-runtime.js")
device_text = device.read_text(encoding="utf-8")

limit_marker = "const LIMIT_KEY='abuBassamDeviceLimitV1';\n"
if "const DEVICE_TABLE='abu_bassam_devices';" not in device_text:
    if limit_marker not in device_text:
        raise SystemExit("Device limit marker not found")
    device_text = device_text.replace(
        limit_marker,
        limit_marker + "const DEVICE_TABLE='abu_bassam_devices';\n",
        1,
    )

if "c.from(DEVICE_TABLE).select(" not in device_text:
    rows_pattern = re.compile(r"async function rows\(\)\{[^\n]*\}\nasync function count")
    replacement = (
        "async function rows(){if(!owner()||!client()||!connected())return[];"
        "const args=await ownerArgs(),c=client(),r=await c.rpc('abu_bassam_owner_devices',args);"
        "if(!r.error)return dedupe(r.data||[]);"
        "const fallback=await c.from(DEVICE_TABLE)"
        ".select('device_id,device_name,model,platform,app_version,role,active,permissions,first_seen,last_seen')"
        ".order('last_seen',{ascending:false}).limit(50);"
        "if(fallback.error)throw r.error;return dedupe(fallback.data||[])}\n"
        "async function count"
    )
    device_text, patched = rows_pattern.subn(replacement, device_text, count=1)
    if patched != 1:
        raise SystemExit("Device rows function was not patched exactly once")

session_helper = (
    "function onSessionChanged(){setTimeout(()=>{patch();render();refreshLimitUi();"
    "syncSecurityCardLabel()},300)}\n"
)
if "function onSessionChanged()" not in device_text:
    init_marker = "function init(){"
    if init_marker not in device_text:
        raise SystemExit("Device init marker not found")
    device_text = device_text.replace(init_marker, session_helper + init_marker, 1)

old_listener = (
    "document.addEventListener('abu-bassam-auth-changed',()=>setTimeout(()=>{patch();render();"
    "refreshLimitUi();syncSecurityCardLabel()},300));"
)
new_listener = (
    "document.addEventListener('abu-bassam-auth-changed',onSessionChanged);"
    "window.AbuBassamCloud?.onSession?.(onSessionChanged);"
)
device_text = replace_once(
    device_text,
    old_listener,
    new_listener,
    "device session listener",
)

device.write_text(device_text, encoding="utf-8")
print("Verified migrated-source repairs applied or already present.")
