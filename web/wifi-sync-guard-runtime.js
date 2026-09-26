(()=>{
'use strict';
if(window.__ABU_WIFI_SYNC_GUARD_V1__)return;
window.__ABU_WIFI_SYNC_GUARD_V1__=true;
const POLICY_KEY='abuBassamSyncPolicyV5',AUTO_KEY='abuBassamVaultAutoSyncV4';
function policy(){try{return Object.assign({wifiOnly:false},JSON.parse(localStorage.getItem(POLICY_KEY)||'{}'))}catch(_){return{wifiOnly:false}}}
function kind(){const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection,t=String(c?.type||'').toLowerCase();if(t==='wifi')return'wifi';if(t&&t!=='unknown')return'other';return'unknown'}
function guard(){if(!policy().wifiOnly)return;const k=kind();if(k!=='wifi')localStorage.setItem(AUTO_KEY,'0')}
guard();window.addEventListener('online',guard);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')guard()});try{const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;c?.addEventListener?.('change',guard)}catch(_){}
})();