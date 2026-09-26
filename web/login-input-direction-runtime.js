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
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(apply,30)}).observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
