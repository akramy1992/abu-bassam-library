from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]

# Remove deleted sections from settings decorations and synchronize visible release identity.
p=ROOT/'web'/'app-settings-runtime.js'
s=p.read_text(encoding='utf-8')
s=s.replace("const APP_VERSION='4.3.2',BUILD_NUMBER='432',RELEASE_DATE='2026-09-20';","const APP_VERSION='6.0.0',BUILD_NUMBER='600',RELEASE_DATE='2026-09-29';")
s=s.replace("['.app .panel','#nationalCenter','#cardsCenter','#vaultCenter','#questionsCenter','#compressorCenter']","['.app .panel','#nationalCenter','#cardsCenter','#vaultCenter']")
p.write_text(s,encoding='utf-8')

# A retired release number must not remain in live web source.
for p in (ROOT/'web').iterdir():
    if p.suffix.lower() not in {'.js','.html'}: continue
    s=p.read_text(encoding='utf-8')
    if '4.3.2' in s:
        p.write_text(s.replace('4.3.2','6.0.0'),encoding='utf-8')

# Strengthen release identity checker so old release identity cannot silently return to runtime files.
p=ROOT/'tools'/'check_release_identity.js'
s=p.read_text(encoding='utf-8')
needle="if(!app.android?.package)errors.push('Android package is missing');\n"
extra="""if(!app.android?.package)errors.push('Android package is missing');
for(const name of fs.readdirSync(path.join(root,'web')).filter(n=>/\\.(?:js|html)$/i.test(n))){const src=fs.readFileSync(path.join(root,'web',name),'utf8');if(src.includes('4.3.2'))errors.push(`${name}: retired release 4.3.2 remains in live source`)}
"""
if needle in s:s=s.replace(needle,extra,1)
p.write_text(s,encoding='utf-8')

# Update security verification to current non-intercepting V3/V2 implementations.
p=ROOT/'tools'/'check_security_controls.js'
s=p.read_text(encoding='utf-8')
old="need('web/login-throttle-fix-runtime.js',['__ABU_LOGIN_THROTTLE_FIX_V2__','loginBusy','legacyInstalled','credentialFailure(message)','deviceOrPostAuthFailure(message)','recordCredentialFailure','attributeFilter','وصل الحساب إلى الحد الأقصى']);"
new="need('web/login-throttle-fix-runtime.js',['__ABU_LOGIN_THROTTLE_FIX_V3__','loginBusy','credentialFailure(message)','deviceOrPostAuthFailure(message)','recordCredentialFailure','abu-bassam-auth-ui-ready',\"abuThrottleFix==='3'\",'وصل الحساب إلى الحد الأقصى']);"
s=s.replace(old,new)
old="need('web/permission-guard-runtime.js',['__ABU_PERMISSION_GUARD_V1__',\"return'print'\",\"return'export'\",\"return'appearance'\",\"return'sync'\",\"return'edit'\",'beforeinput','stopImmediatePropagation']);"
new="need('web/permission-guard-runtime.js',['__ABU_PERMISSION_GUARD_V2__',\"return'print'\",\"return'export'\",\"return'appearance'\",\"return'sync'\",\"return'edit'\",'abuPermissionDenied','abu-bassam-section-opened','pageshow']);\nforbid('web/permission-guard-runtime.js',['stopImmediatePropagation','beforeinput',\"document.addEventListener('click'\"]);"
s=s.replace(old,new)
p.write_text(s,encoding='utf-8')

# Remove retired question/compressor compatibility permission keys from live permission runtime.
p=ROOT/'web'/'admin-permissions-runtime.js'
s=p.read_text(encoding='utf-8')
s=re.sub(r"\n\s*questionsView:'edit'.*?questionsMaintenance:'edit',",'',s)
s=re.sub(r"\n\s*compressUse:'edit'.*?compressHighResolution:'edit',",'',s)
s=s.replace("printCards:'print',printQuestions:'print',printCustomerDocuments:'print'","printCards:'print',printCustomerDocuments:'print'")
s=s.replace('/^(vault|privateVault|customer|cards|questions|compress)/','/^(vault|privateVault|customer|cards)/')
s=s.replace('cardsPrint|questionsPrint|vaultPrint','cardsPrint|vaultPrint')
s=s.replace("['cardsView','questionsView','vaultView'","['cardsView','vaultView'")
s=s.replace("['printGeneral','printDocuments','printCards','printQuestions','printCustomerDocuments','printA4','printCardDirect','cardsPrint','questionsPrint','vaultPrint'","['printGeneral','printDocuments','printCards','printCustomerDocuments','printA4','printCardDirect','cardsPrint','vaultPrint'")
s=s.replace('/^(cards|questions|compress)/','/^cards/')
s=s.replace("&&!i.adminOnly&&i.key!=='compressDeleteOriginal'","&&!i.adminOnly")
s=s.replace("['printCards','printQuestions','printA4'","['printCards','printA4'")
p.write_text(s,encoding='utf-8')

# Build a forward-only database migration that retires deleted section permission keys.
retired=['questionsView','questionsCreate','questionsEdit','questionsDelete','questionsTemplates','questionsCustomTemplates','questionsAnswersToggle','questionsImages','questionsPrint','questionsPdf','questionsReset','questionsMaintenance','compressUse','compressBatch','compressSave','compressExport','compressHighResolution','compressDeleteOriginal','printQuestions']
items=[m.group(1) for m in re.finditer(r"\['([A-Za-z][A-Za-z0-9]+)','[^'\n]*',(true|false)\]",s)]
active=[]
for k in items:
    if k not in active: active.append(k)
legacy=['edit','print','export','appearance','sync','security','devices','reset']
allowed=legacy+active
quoted=','.join("'%s'"%k for k in allowed)
delete_chain='permissions'+''.join(" - '%s'"%k for k in retired)
migration=f"""-- Retire permissions for sections removed from the application on 2026-09-29.
-- Forward-only migration: historical migrations remain immutable.
create or replace function public._abu_bassam_permission_key_allowed(p_key text)
returns boolean
language sql
immutable
set search_path=public
as $$
  select coalesce(p_key,'') = any(array[{quoted}]::text[]);
$$;

update public.abu_bassam_devices
set permissions={delete_chain}
where permissions is not null;

revoke all on function public._abu_bassam_permission_key_allowed(text) from public,anon,authenticated;
"""
(ROOT/'supabase'/'migrations'/'202609290001_retire_removed_section_permissions.sql').write_text(migration,encoding='utf-8')

# Replace brittle historical permission-count test with current catalog consistency checks.
checker=r'''const fs=require('fs'),vm=require('vm');
const read=p=>{if(!fs.existsSync(p))throw new Error('missing '+p);return fs.readFileSync(p,'utf8')};
const runtime=read('web/admin-permissions-runtime.js');
const guards=read('web/permission-section-guards-runtime.js');
const loader=read('web/device-name-runtime.js');
const baseMigration=read('supabase/migrations/202609250001_advanced_admin_permissions.sql');
const retireMigration=read('supabase/migrations/202609290001_retire_removed_section_permissions.sql');
const helper=read('supabase/migrations/202609250002_customer_permission_helper.sql');
const capacity=read('supabase/migrations/202609250003_advanced_permissions_capacity.sql');
const edge=read('supabase/functions/customer-documents/index.ts');
new vm.Script(runtime,{filename:'admin-permissions-runtime.js'});new vm.Script(guards,{filename:'permission-section-guards-runtime.js'});new vm.Script(loader,{filename:'device-name-runtime.js'});
const items=[...runtime.matchAll(/\['([A-Za-z][A-Za-z0-9]+)','[^'\n]*',(true|false)\]/g)].map(m=>m[1]);
const unique=[...new Set(items)];
if(items.length<150)throw new Error(`permission catalog unexpectedly small (${items.length})`);
if(unique.length!==items.length)throw new Error('duplicate detailed permission keys');
const retired=['questionsView','questionsCreate','questionsEdit','questionsDelete','questionsTemplates','questionsCustomTemplates','questionsAnswersToggle','questionsImages','questionsPrint','questionsPdf','questionsReset','questionsMaintenance','compressUse','compressBatch','compressSave','compressExport','compressHighResolution','compressDeleteOriginal','printQuestions'];
for(const key of retired){if(runtime.includes(key))throw new Error(`retired runtime permission remains: ${key}`);if(guards.includes(key))throw new Error(`retired guard permission remains: ${key}`);if(!retireMigration.includes(`- '${key}'`))throw new Error(`retirement migration does not scrub ${key}`)}
for(const key of unique)if(!retireMigration.includes(`'${key}'`))throw new Error(`current server catalog missing ${key}`);
for(const key of ['edit','print','export','appearance','sync','security','devices','reset'])if(!retireMigration.includes(`'${key}'`))throw new Error(`legacy compatibility missing ${key}`);
for(const marker of ['__ABU_ADMIN_PERMISSIONS_V1__','صلاحيات متقدمة','السماح للكل','منع الكل','قراءة فقط','موظف طباعة','موظف مستمسكات','موظف تصميم','مخصص / الحالي','vaultView','customerDocumentsView','cardsEdit','printGeneral','pdfSave','syncAutomatic','logsViewOwn','notificationsView','securityView','settingsView','adminViewAllBranches','ADMIN_ONLY','saveDevicePermissions','abu_bassam_manage_device','AbuBassamPermissions'])if(!runtime.includes(marker))throw new Error(`admin runtime missing ${marker}`);
for(const marker of ['__ABU_PERMISSION_SECTION_GUARDS_V2__','logsViewOwn','notificationsView','securityBiometric','securityAutoLock','securityPrivacyMode','syncAutomatic','printGeneral','pdfSave','imageExport','cardsPrint','customerPhoneView'])if(!guards.includes(marker))throw new Error(`section guards missing ${marker}`);
for(const marker of ['admin-permissions-runtime.js','permission-section-guards-runtime.js','loadAdminPermissions()','loadPermissionSectionGuards()'])if(!loader.includes(marker))throw new Error(`startup loader missing ${marker}`);
for(const marker of ['_abu_bassam_device_permission','secret_hash','p_permission'])if(!helper.includes(marker))throw new Error(`server permission helper missing ${marker}`);
for(const marker of ['customerDocumentsAdd','customerDocumentsEdit','customerDocumentsView','customerOriginalDocumentView','customerDocumentsDelete','sha256Hex','secret_hash'])if(!edge.includes(marker))throw new Error(`customer edge permission missing ${marker}`);
if(!capacity.includes('jsonb_object_length(p_permissions)>260'))throw new Error('server permission payload capacity regression');
const adminBlock=(runtime.match(/const ADMIN_ONLY=new Set\(\[([\s\S]*?)\]\);/)||[])[1]||'';
const adminKeys=[...adminBlock.matchAll(/'([A-Za-z][A-Za-z0-9]+)'/g)].map(m=>m[1]);
if(adminKeys.length<35)throw new Error(`admin-only set too small (${adminKeys.length})`);
for(const key of adminKeys)if(!baseMigration.includes(`'${key}'`))throw new Error(`admin-only server list missing ${key}`);
console.log(`Admin permissions current-state check passed: ${items.length} active detailed permissions, retired section keys scrubbed by forward migration, ${adminKeys.length} admin-only protections.`);
'''
(ROOT/'tools'/'check_admin_permissions.js').write_text(checker,encoding='utf-8')

# Align OCR packaging check with immutable-source cache path used by clean build.
p=ROOT/'tools'/'check_document_vault_advanced.js'
s=p.read_text(encoding='utf-8')
s=s.replace("need(assets,'Offline OCR assets (Arabic + English) are embedded','offline OCR packaging confirmation');","need(assets,\".cache', 'ocr-tesseract-v5.1.1\",'OCR cache outside source tree');\nneed(assets,\"cp(cacheRoot,resolve(destination,'vendor','tesseract')\",'OCR cache copied into Android assets');\nneed(assets,'Failed to prepare pinned OCR asset','OCR download failure is explicit');")
p.write_text(s,encoding='utf-8')

# Customer camera framing is now real native source, not a build-time patch.
p=ROOT/'tools'/'check_customer_documents.js'
s=p.read_text(encoding='utf-8')
s=s.replace("const patch=read('scripts/patch-customer-camera.mjs');","const native=read('index.js');")
s=s.replace("need(patch,\"cardDocumentFrame\",'ID-card live camera frame');","need(native,\"cardDocumentFrame\",'ID-card live camera frame in authoritative native source');")
s=s.replace("need(patch,\"photoDocumentFrame\",'portrait live camera frame');","need(native,\"photoDocumentFrame\",'portrait live camera frame in authoritative native source');")
s=s.replace("need(patch,\"message.frameKind\",'native bridge frame kind');","need(native,\"message.frameKind\",'native bridge frame kind in authoritative native source');\nneed(native,\"cameraFrameKind\",'native camera frame state');")
p.write_text(s,encoding='utf-8')

print('Second-pass cleanup applied to settings, release identity, security checks, permissions, OCR, customer camera check, and forward database retirement migration.')
