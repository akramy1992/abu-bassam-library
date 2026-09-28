(()=>{
'use strict';
if(window.__ABU_LOGIN_INPUT_DIRECTION_V1__)return;
window.__ABU_LOGIN_INPUT_DIRECTION_V1__=true;

function apply(){
  const user=document.getElementById('abuLoginUser');
  const pass=document.getElementById('abuLoginPass');
  [user,pass].forEach(input=>{
    if(!input)return;
    input.setAttribute('dir','ltr');
    input.setAttribute('lang','en');
    input.setAttribute('autocapitalize','off');
    input.setAttribute('spellcheck','false');
    input.style.direction='ltr';
    input.style.unicodeBidi='plaintext';
    input.style.textAlign='center';
  });
}

function init(){
  apply();
  let timer=0;
  (()=>{const cb=()=>{clearTimeout(timer);timer=setTimeout(apply,30)};const bus=window.__ABU_RUNTIME_REFRESH_BUS__||(window.__ABU_RUNTIME_REFRESH_BUS__=(()=>{const callbacks=new Set();let timer=0;const run=()=>{timer=0;for(const fn of [...callbacks]){try{fn([],null)}catch(e){console.warn('runtime refresh failed',e)}}};const schedule=()=>{if(timer)return;timer=setTimeout(run,40)};window.addEventListener('pageshow',schedule,{passive:true});window.addEventListener('focus',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()},{passive:true});document.addEventListener('abu-bassam-section-opened',schedule,{passive:true});document.addEventListener('abu-bassam-settings-opened',schedule,{passive:true});document.addEventListener('abu-bassam-auth-changed',schedule,{passive:true});[120,500,1500].forEach(ms=>setTimeout(schedule,ms));return{add(fn){callbacks.add(fn);schedule()},remove(fn){callbacks.delete(fn)}}})());bus.add(cb);return{disconnect(){bus.remove(cb)},observe(){},takeRecords(){return[]}}})();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
