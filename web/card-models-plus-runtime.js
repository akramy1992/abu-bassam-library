(()=>{
'use strict';
if(window.__ABU_CARD_MODELS_PLUS_V1__)return;
window.__ABU_CARD_MODELS_PLUS_V1__=true;
window.__ABU_CARD_MODELS_PLUS_RETIRED__=true;
const KEY='abuBassamCardModelsPlusV1';
const EXTRA=/^(?:personal-(?:6|7|8|9|10)|wifi-(?:4|5|6|7|8|9|10)|qr-(?:5|6|7|8|9|10))$/;
function clean(){
  try{localStorage.removeItem(KEY)}catch(e){}
  document.getElementById('abuCardModelsPlusStyle')?.remove();
  document.querySelectorAll('select option').forEach(option=>{
    if(EXTRA.test(String(option.value||'')))option.remove();
  });
}
function init(){
  clean();
  let timer=0;
  (()=>{const cb=()=>{
    clearTimeout(timer);
    timer=setTimeout(clean,40);
  };const bus=window.__ABU_RUNTIME_REFRESH_BUS__||(window.__ABU_RUNTIME_REFRESH_BUS__=(()=>{const callbacks=new Set();let timer=0;const run=()=>{timer=0;for(const fn of [...callbacks]){try{fn([],null)}catch(e){console.warn('runtime refresh failed',e)}}};const schedule=()=>{if(timer)return;timer=setTimeout(run,40)};window.addEventListener('pageshow',schedule,{passive:true});window.addEventListener('focus',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()},{passive:true});document.addEventListener('abu-bassam-section-opened',schedule,{passive:true});document.addEventListener('abu-bassam-settings-opened',schedule,{passive:true});document.addEventListener('abu-bassam-auth-changed',schedule,{passive:true});[120,500,1500].forEach(ms=>setTimeout(schedule,ms));return{add(fn){callbacks.add(fn);schedule()},remove(fn){callbacks.delete(fn)}}})());bus.add(cb);return{disconnect(){bus.remove(cb)},observe(){},takeRecords(){return[]}}})();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();