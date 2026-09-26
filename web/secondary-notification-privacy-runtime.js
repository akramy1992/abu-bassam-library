(()=>{
'use strict';
if(window.__ABU_SECONDARY_NOTIFICATION_PRIVACY_V1__)return;
window.__ABU_SECONDARY_NOTIFICATION_PRIVACY_V1__=true;
const STORE='abuBassamNotificationsV1';
const AUDIT_QUEUE='abuBassamAuditQueueV1';
const SCOPE_KEY='abuBassamOperationDeviceScopeV1';
function role(){return window.AbuBassamSecurity?.role?.()||''}
function deviceId(){const d=window.AbuBassamSecurity?.device?.()||window.AbuBassamDevices?.ensure?.()||{};return String(d.device_id||d.id||localStorage.getItem('abuBassamLockedDeviceIdV3')||'').trim()}
function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch(_){return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}}
function operationId(notification){const id=String(notification?.id||'');return id.startsWith('op:')?id.slice(3):''}
function belongsToCurrentDevice(notification,scope,id){
  if(!notification||typeof notification!=='object')return false;
  if(notification.source==='branch-audit')return false;
  if(notification.source==='operations'){
    const opId=operationId(notification),ownerId=opId?String(scope[opId]||'').trim():'';
    return !!ownerId&&ownerId===id;
  }
  const nDevice=String(notification.deviceId||'').trim();
  return !!nDevice&&nDevice===id;
}
function updateBadge(list){const unread=list.filter(n=>!n.read).length,badge=document.getElementById('abuNotificationBadge'),button=document.getElementById('abuNotificationBell');if(badge){badge.textContent=unread>99?'99+':String(unread);badge.style.display=unread?'grid':'none'}if(button)button.setAttribute('aria-label',unread?`الإشعارات، ${unread} غير مقروء`:'الإشعارات')}
function clean(){
  if(role()!=='secondary')return false;
  const id=deviceId();if(!id)return false;
  const scope=read(SCOPE_KEY,{});
  const list=read(STORE,[]);if(Array.isArray(list)){
    const own=list.filter(n=>belongsToCurrentDevice(n,scope,id));
    if(own.length!==list.length)write(STORE,own);
    updateBadge(own);
  }
  const queue=read(AUDIT_QUEUE,[]);if(Array.isArray(queue)){
    const ownQueue=queue.filter(n=>belongsToCurrentDevice(n,scope,id));
    if(ownQueue.length!==queue.length)write(AUDIT_QUEUE,ownQueue);
  }
  return true;
}
function guardFromOperation(){
  const center=window.AbuBassamNotifications;if(!center||typeof center.fromOperation!=='function'||center.fromOperation.__abuSecondaryGuard)return false;
  const original=center.fromOperation;
  const wrapped=function(op){
    if(role()==='secondary'){
      const id=deviceId(),scope=read(SCOPE_KEY,{}),opId=String(op?.id||'').trim(),ownerId=opId?String(scope[opId]||'').trim():'';
      if(!id||!ownerId||ownerId!==id)return null;
    }
    return original.apply(this,arguments);
  };
  wrapped.__abuSecondaryGuard=true;wrapped.__abuOriginal=original;center.fromOperation=wrapped;return true;
}
function boot(){
  let attempts=0;const timer=setInterval(()=>{attempts++;guardFromOperation();clean();if((window.AbuBassamNotifications&&role())||attempts>120)clearInterval(timer)},120);
  [100,300,900,1800,3500,7000].forEach(ms=>setTimeout(()=>{guardFromOperation();clean()},ms));
  setInterval(()=>{if(role()==='secondary'){guardFromOperation();clean()}},1500);
  window.addEventListener('online',()=>setTimeout(clean,100));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(clean,100)});
  window.addEventListener('storage',event=>{if(event.key===STORE||event.key===AUDIT_QUEUE||event.key===SCOPE_KEY)setTimeout(clean,0)});
}
window.AbuBassamSecondaryNotificationPrivacy={clean,guardFromOperation,deviceId};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
