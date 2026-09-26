(()=>{
'use strict';
if(window.__ABU_QUESTION_GESTURES_DISABLED__)return;
window.__ABU_QUESTION_GESTURES_DISABLED__=true;

// Latest approved behavior: no custom pinch/flex/drag gesture layer in questions.
// Keep native scrolling and the editor's original controls only.
function restoreNativeTouch(){
  try{
    document.documentElement.style.touchAction='auto';
    document.body.style.touchAction='auto';
    const workspace=document.getElementById('workspace');
    const pages=document.getElementById('pages-container');
    if(workspace)workspace.style.touchAction='pan-y';
    if(pages)pages.style.touchAction='pan-y';
    document.querySelectorAll('input,textarea,select,button,[contenteditable="true"]').forEach(el=>{el.style.touchAction='manipulation'});
  }catch(e){}
}

window.AbuQuestionGestures={disabled:true,reset:restoreNativeTouch};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restoreNativeTouch);else restoreNativeTouch();
})();
