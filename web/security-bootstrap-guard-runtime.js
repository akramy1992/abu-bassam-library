(()=>{
'use strict';
if(window.__ABU_SECURITY_BOOTSTRAP_GUARD_V1__)return;
window.__ABU_SECURITY_BOOTSTRAP_GUARD_V1__=true;

const LEGACY_TRUST_KEY='abuBassamSecurityTrustV1';
const LEGACY_SECRET_PREFIX='__dev_secure_';
let timer=0;

function wipeLegacyTrust(){
  try{localStorage.removeItem(LEGACY_TRUST_KEY)}catch(_){}
}
function wipeLegacySecretStorage(){
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(String(key||'').startsWith(LEGACY_SECRET_PREFIX))keys.push(key)
    }
    keys.forEach(key=>localStorage.removeItem(key))
  }catch(_){}
}
function installLegacySecretStorageBlock(){
  if(window.__ABU_LEGACY_SECRET_STORAGE_BLOCK_V1__)return;
  window.__ABU_LEGACY_SECRET_STORAGE_BLOCK_V1__=true;
  wipeLegacySecretStorage();
  try{
    const proto=globalThis.Storage?.prototype;
    if(!proto)return;
    const get0=proto.getItem,set0=proto.setItem;
    if(typeof get0==='function'&&!get0.__abuSecretBlocked){
      const safeGet=function(key){if(String(key||'').startsWith(LEGACY_SECRET_PREFIX))return null;return get0.call(this,key)};
      safeGet.__abuSecretBlocked=true;safeGet.__abuOriginal=get0;proto.getItem=safeGet
    }
    if(typeof set0==='function'&&!set0.__abuSecretBlocked){
      const safeSet=function(key,value){if(String(key||'').startsWith(LEGACY_SECRET_PREFIX))return;return set0.call(this,key,value)};
      safeSet.__abuSecretBlocked=true;safeSet.__abuOriginal=set0;proto.setItem=safeSet
    }
  }catch(_){}
}
function setError(message){
  const el=document.getElementById('abuLoginError');
  if(el)el.textContent=message;
}
function denyLegacyOffline(){
  wipeLegacyTrust();
  wipeLegacySecretStorage();
  setError('جاري تحميل طبقة الأمان المشددة. فتح التطبيق دون إنترنت يتطلب SecureStore + HMAC + البصمة.');
  return false;
}
function installRuntimeGuard(){
  wipeLegacyTrust();
  wipeLegacySecretStorage();
  installLegacySecretStorageBlock();
  if(window.__ABU_SECURITY_HARDENING_V2__){cleanup();return}
  const sec=window.AbuBassamSecurity;
  if(!sec||sec.__bootstrapOfflineGuarded)return;
  const baseBio=typeof sec.unlockWithBiometric==='function'?sec.unlockWithBiometric.bind(sec):null;
  sec.__bootstrapOfflineGuarded=true;
  sec.offlineUnlock=denyLegacyOffline;
  if(baseBio){
    sec.unlockWithBiometric=async function(...args){
      if(!navigator.onLine)return denyLegacyOffline();
      return baseBio(...args);
    };
  }
}
function captureSensitiveClick(event){
  if(window.__ABU_SECURITY_HARDENING_V2__){cleanup();return}
  const target=event.target?.closest?.('#abuOfflineBtn,#abuBioLoginBtn');
  if(!target)return;
  if(target.id==='abuOfflineBtn'||(target.id==='abuBioLoginBtn'&&!navigator.onLine)){
    event.preventDefault();
    event.stopImmediatePropagation();
    denyLegacyOffline();
  }
}
function cleanup(){
  if(timer){clearInterval(timer);timer=0}
  document.removeEventListener('click',captureSensitiveClick,true);
  wipeLegacyTrust();
  wipeLegacySecretStorage();
  installLegacySecretStorageBlock();
}

installLegacySecretStorageBlock();
wipeLegacyTrust();
wipeLegacySecretStorage();
document.addEventListener('click',captureSensitiveClick,true);
installRuntimeGuard();
timer=setInterval(installRuntimeGuard,20);
setTimeout(()=>{if(window.__ABU_SECURITY_HARDENING_V2__)cleanup()},2000);
})();
