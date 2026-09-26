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
  new MutationObserver(()=>{
    clearTimeout(timer);
    timer=setTimeout(clean,40);
  }).observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();