(()=>{
'use strict';
if(window.__ABU_OPERATION_LOG_STORAGE_MIGRATION_V1__)return;
window.__ABU_OPERATION_LOG_STORAGE_MIGRATION_V1__=true;
const OPS_KEY='abuBassamOpsV4';
const DONE_KEY='abuBassamOpsPrivacyMigrationV1';
function migrate(){
  const api=window.AbuBassamOperationLogV2;
  if(!api||typeof api.scrub!=='function')return false;
  try{
    const raw=localStorage.getItem(OPS_KEY)||'[]',list=JSON.parse(raw);
    if(!Array.isArray(list))throw new Error('INVALID_LOG');
    const cleaned=list.map(item=>api.scrub(item)).slice(0,500);
    localStorage.setItem(OPS_KEY,JSON.stringify(cleaned));
    localStorage.removeItem('abuBassamOpsV3');
    localStorage.removeItem('abuBassamOpsV2');
    localStorage.setItem(DONE_KEY,new Date().toISOString());
    return true;
  }catch(_){return false}
}
let attempts=0;const timer=setInterval(()=>{attempts++;if(migrate()||attempts>120)clearInterval(timer)},100);
window.addEventListener('storage',e=>{if(e.key===OPS_KEY)migrate()});
})();