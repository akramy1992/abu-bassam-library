const fs=require('fs'),vm=require('vm');
const read=p=>{if(!fs.existsSync(p))throw new Error('missing '+p);return fs.readFileSync(p,'utf8')};
const need=(s,t,l)=>{if(!s.includes(t))throw new Error(`admin permissions check failed: ${l}`)};
const runtime=read('web/admin-permissions-runtime.js');
const guards=read('web/permission-section-guards-runtime.js');
const loader=read('web/device-name-runtime.js');
const migration=read('supabase/migrations/202609250001_advanced_admin_permissions.sql');
const capacity=read('supabase/migrations/202609250003_advanced_permissions_capacity.sql');
const helper=read('supabase/migrations/202609250002_customer_permission_helper.sql');
const edge=read('supabase/functions/customer-documents/index.ts');
new vm.Script(runtime,{filename:'admin-permissions-runtime.js'});
new vm.Script(guards,{filename:'permission-section-guards-runtime.js'});
new vm.Script(loader,{filename:'device-name-runtime.js'});
const items=[...runtime.matchAll(/\['([A-Za-z][A-Za-z0-9]+)','[^'\n]*',(true|false)\]/g)].map(m=>m[1]);
const unique=[...new Set(items)];
if(items.length!==214)throw new Error(`admin permissions check failed: expected 214 detailed permissions, found ${items.length}`);
if(unique.length!==items.length)throw new Error('admin permissions check failed: duplicate detailed permission keys');
for(const key of unique)need(migration,`'${key}'`,`server catalog missing ${key}`);
for(const key of ['edit','print','export','appearance','sync','security','devices','reset'])need(migration,`'${key}'`,`legacy compatibility missing ${key}`);
for(const marker of [
  '__ABU_ADMIN_PERMISSIONS_V1__','صلاحيات متقدمة','السماح للكل','منع الكل','قراءة فقط','موظف طباعة','موظف مستمسكات','موظف تصميم','مخصص / الحالي',
  'vaultView','customerDocumentsView','cardsEdit','questionsEdit','compressSave','printGeneral','pdfSave','syncAutomatic','logsViewOwn','notificationsView','securityView','settingsView','adminViewAllBranches',
  'ADMIN_ONLY','saveDevicePermissions','abu_bassam_manage_device','AbuBassamPermissions','guardCustomerApi','guardQuestionDocument','guardCompressorDocument','guardMessage'
])need(runtime,marker,marker);
for(const marker of ['PERMISSION_KEY_NOT_ALLOWED','PERMISSION_VALUE_INVALID','ADMIN_ONLY_PERMISSION','OWNER_PERMISSIONS_IMMUTABLE','_abu_bassam_permission_key_allowed','_abu_bassam_permission_admin_only'])need(migration,marker,'server validation '+marker);
need(capacity,'jsonb_object_length(p_permissions)>260','full 222-key payload capacity');
for(const marker of ['_abu_bassam_device_permission','secret_hash','p_permission'])need(helper,marker,'server permission helper '+marker);
for(const marker of ['admin-permissions-runtime.js','permission-section-guards-runtime.js','loadAdminPermissions()','loadPermissionSectionGuards()'])need(loader,marker,'startup loader '+marker);
for(const marker of ['customerDocumentsAdd','customerDocumentsEdit','customerDocumentsView','customerOriginalDocumentView','customerDocumentsDelete','sha256Hex','secret_hash'])need(edge,marker,'customer edge permission '+marker);
for(const marker of ['__ABU_PERMISSION_SECTION_GUARDS_V1__','logsViewOwn','notificationsView','securityBiometric','securityAutoLock','securityPrivacyMode','syncAutomatic','printGeneral','pdfSave','imageExport','cardsPrint','customerPhoneView','questionsView','compressUse'])need(guards,marker,'section guard '+marker);
const adminBlock=(runtime.match(/const ADMIN_ONLY=new Set\(\[([\s\S]*?)\]\);/)||[])[1]||'';
const adminKeys=[...adminBlock.matchAll(/'([A-Za-z][A-Za-z0-9]+)'/g)].map(m=>m[1]);
if(adminKeys.length<35)throw new Error(`admin permissions check failed: admin-only set too small (${adminKeys.length})`);
for(const key of adminKeys)need(migration,`'${key}'`,`admin-only server list missing ${key}`);
console.log(`advanced admin permissions checks passed: ${items.length} detailed permissions + 8 legacy compatibility flags, ${adminKeys.length} admin-only protections, presets, server validation, customer document edge enforcement, and cross-section runtime guards`);
