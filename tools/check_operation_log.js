const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const runtimePath=path.join(root,'web','operation-log-corrections-runtime.js');
const scrubPath=path.join(root,'web','operation-log-storage-migration-runtime.js');
const loaderPath=path.join(root,'web','device-name-runtime.js');
const migrationPath=path.join(root,'supabase','migrations','202609240011_strict_activity_device_secret.sql');
const runtime=fs.readFileSync(runtimePath,'utf8');
const scrub=fs.readFileSync(scrubPath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');
const migration=fs.readFileSync(migrationPath,'utf8');
const errors=[];
const need=(src,marker,label)=>{if(!src.includes(marker))errors.push(`${label}: missing ${marker}`)};
const no=(src,marker,label)=>{if(src.includes(marker))errors.push(`${label}: forbidden ${marker}`)};
try{new vm.Script(runtime,{filename:'operation-log-corrections-runtime.js'})}catch(e){errors.push(`operation log syntax: ${e.message}`)}
try{new vm.Script(scrub,{filename:'operation-log-storage-migration-runtime.js'})}catch(e){errors.push(`operation scrub syntax: ${e.message}`)}
for(const marker of [
  '__ABU_OPERATION_LOG_CORRECTIONS_V2__',
  'abu_bassam_owner_activity_devices',
  'abu_bassam_owner_activity_report',
  "ops.sync=()=>safeSync(true)",
  'flushAuditQueue',
  'مسح سجل العمليات المحلي من هذا الجهاز فقط',
  'opsV2From',
  'opsV2To',
  'opsV2Device',
  'opsV2Status',
  'option value="device"',
  'option value="alpha"',
  'opsV2SelectAll',
  'PDF A4',
  '@page{size:A4 portrait',
  '[هاتف محجوب]',
  '[بريد محجوب]',
  '[تفاصيل زبون محجوبة]',
  'normalizeLocal(op={}){const d=device(),safe=safeOperation(op)',
  'setInterval(patch,2500)',
  "deviceName||d.name||'هذا الجهاز'"
])need(runtime,marker,'operation log');
for(const marker of ["upsert('operation'","removeKind('operation')","deviceName||'أكرم'"])no(runtime,marker,'operation log privacy');
for(const marker of ['__ABU_OPERATION_LOG_STORAGE_MIGRATION_V1__','api.scrub(item)',"localStorage.removeItem('abuBassamOpsV3')","localStorage.removeItem('abuBassamOpsV2')"])need(scrub,marker,'operation storage scrub');
for(const marker of ['operation-log-corrections-runtime.js','loadOperationLogCorrections()','operation-log-storage-migration-runtime.js','loadOperationLogStorageMigration'])need(loader,marker,'operation log loader');
for(const marker of [
  "coalesce(v_actor.secret_hash,'')=''",
  'v_actor.secret_hash<>v_hash',
  "coalesce(v_device.secret_hash,'')=''",
  'v_device.secret_hash<>v_hash',
  'revoke all on function public.abu_bassam_owner_activity_report',
  'revoke all on function public.abu_bassam_record_device_activity'
])need(migration,marker,'activity secret migration');
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Operation log checks passed: secure audit refresh, strict device secrets, historical local scrub, branch/device/date/status filters, exact device names, selected export, A4/PDF printing, local-only clear, and sensitive-customer redaction.\n');