(()=>{
'use strict';
if(window.__ABU_NOTIFICATION_OPS_BRIDGE_V1__)return;
window.__ABU_NOTIFICATION_OPS_BRIDGE_V1__=true;
const SCOPE_KEY='abuBassamOperationDeviceScopeV1';
function currentDeviceId(){
  const secured=window.AbuBassamSecurity?.device?.()||{};
  const fallback=window.AbuBassamDevices?.ensure?.()||{};
  return String(secured.device_id||secured.id||fallback.device_id||fallback.id||localStorage.getItem('abuBassamLockedDeviceIdV3')||'').trim();
}
function readScope(){try{const value=JSON.parse(localStorage.getItem(SCOPE_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch(_){return{}}}
function bindOperationToDevice(operation){
  const id=String(operation?.id||'').trim(),deviceId=currentDeviceId();
  if(!id||!deviceId)return;
  const scope=readScope();
  scope[id]=deviceId;
  const keys=Object.keys(scope);
  if(keys.length>1200)keys.slice(0,keys.length-1200).forEach(key=>delete scope[key]);
  try{localStorage.setItem(SCOPE_KEY,JSON.stringify(scope))}catch(_){}
}
function loadScript(id,src,guard){
  if(window[guard]||document.getElementById(id))return;
  const script=document.createElement('script');script.id=id;script.src=src;script.async=false;script.onerror=()=>console.warn(src+' failed to load');(document.body||document.documentElement).appendChild(script);
}
function loadSecondaryPrivacy(){loadScript('abuSecondaryNotificationPrivacyRuntime','secondary-notification-privacy-runtime.js','__ABU_SECONDARY_NOTIFICATION_PRIVACY_V1__')}
function loadCorrections(){loadScript('abuNotificationCenterCorrectionsRuntime','notification-center-corrections-runtime.js','__ABU_NOTIFICATION_CENTER_CORRECTIONS_V2__')}
function rootOriginal(fn){let current=fn,guard=0;while(current&&current.__abuOriginal&&guard++<12)current=current.__abuOriginal;return current||fn}
function install(){
  const ops=window.AbuBassamOps,center=window.AbuBassamNotifications;
  if(!ops||!center||typeof ops.add!=='function'||typeof ops.list!=='function'||typeof center.fromOperation!=='function')return false;
  loadSecondaryPrivacy();loadCorrections();
  if(ops.add.__abuStableNotifyBridge)return true;
  const original=rootOriginal(ops.add);
  const wrapped=function(input,...rest){
    const previousId=ops.list?.()?.[0]?.id||'';
    const result=original.call(this,input,...rest);
    Promise.resolve(result).finally(()=>setTimeout(()=>{
      try{
        const latest=ops.list?.()?.[0];
        if(latest&&latest.id&&latest.id!==previousId){
          bindOperationToDevice(latest);
          center.fromOperation(latest);
        }
      }catch(_){}
    },0));
    return result;
  };
  wrapped.__abuStableNotifyBridge=true;
  wrapped.__abuOriginal=original;
  ops.add=wrapped;
  return true;
}
let attempts=0;const timer=setInterval(()=>{attempts++;install();if(attempts>50)clearInterval(timer)},120);
setTimeout(()=>{clearInterval(timer);install();loadSecondaryPrivacy();loadCorrections()},7000);
if(document.readyState!=='loading')install();else document.addEventListener('DOMContentLoaded',install,{once:true});
})();