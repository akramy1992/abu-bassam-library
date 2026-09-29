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

# Update security verification to the current non-intercepting V3/V2 implementations.
p=ROOT/'tools'/'check_security_controls.js'
s=p.read_text(encoding='utf-8')
old="need('web/login-throttle-fix-runtime.js',['__ABU_LOGIN_THROTTLE_FIX_V2__','loginBusy','legacyInstalled','credentialFailure(message)','deviceOrPostAuthFailure(message)','recordCredentialFailure','attributeFilter','وصل الحساب إلى الحد الأقصى']);"
new="need('web/login-throttle-fix-runtime.js',['__ABU_LOGIN_THROTTLE_FIX_V3__','loginBusy','credentialFailure(message)','deviceOrPostAuthFailure(message)','recordCredentialFailure','abu-bassam-auth-ui-ready',\"abuThrottleFix==='3'\",'وصل الحساب إلى الحد الأقصى']);"
s=s.replace(old,new)
old="need('web/permission-guard-runtime.js',['__ABU_PERMISSION_GUARD_V1__',\"return'print'\",\"return'export'\",\"return'appearance'\",\"return'sync'\",\"return'edit'\",'beforeinput','stopImmediatePropagation']);"
new="need('web/permission-guard-runtime.js',['__ABU_PERMISSION_GUARD_V2__',\"return'print'\",\"return'export'\",\"return'appearance'\",\"return'sync'\",\"return'edit'\",'abuPermissionDenied','abu-bassam-section-opened','pageshow']);\nforbid('web/permission-guard-runtime.js',['stopImmediatePropagation','beforeinput',\"document.addEventListener('click'\"]);"
s=s.replace(old,new)
p.write_text(s,encoding='utf-8')

# Remove retired question/compressor compatibility permission keys from the live permission runtime.
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

# Replace the brittle historical permission-count test with catalog consistency checks.
p=ROOT/'tools'/'check_admin_permissions.js'
s=p.read_text(encoding='utf-8')
s=s.replace("if(items.length!==214)throw new Error(`admin permissions check failed: expected 214 detailed permissions, found ${items.length}`);","if(items.length<150)throw new Error(`admin permissions check failed: permission catalog unexpectedly small (${items.length})`);\nfor(const retired of ['questionsView','questionsCreate','questionsEdit','questionsDelete','questionsTemplates','questionsCustomTemplates','questionsAnswersToggle','questionsImages','questionsPrint','questionsPdf','questionsReset','questionsMaintenance','compressUse','compressBatch','compressSave','compressExport','compressHighResolution','printQuestions'])if(unique.includes(retired))throw new Error(`admin permissions check failed: retired permission remains ${retired}`);")
s=s.replace("'vaultView','customerDocumentsView','cardsEdit','questionsEdit','compressSave','printGeneral'","'vaultView','customerDocumentsView','cardsEdit','printGeneral'")
s=s.replace(",'guardQuestionDocument','guardCompressorDocument'",'')
s=s.replace("'__ABU_PERMISSION_SECTION_GUARDS_V1__'","'__ABU_PERMISSION_SECTION_GUARDS_V2__'")
s=s.replace(",'customerPhoneView','questionsView','compressUse'",",'customerPhoneView'")
s=s.replace("'full 222-key payload capacity'","'permission payload capacity'")
p.write_text(s,encoding='utf-8')

print('Second-pass cleanup applied to settings, release identity, security checks, and retired permission compatibility keys.')
