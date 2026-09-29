(()=>{
'use strict';
if(window.__ABU_QUESTION_GESTURES_DISABLED__)return;
window.__ABU_QUESTION_GESTURES_DISABLED__=true;

// Questions deliberately use only the browser/WebView native interaction model.
// No global touch listeners, no pinch/drag interception, no pointer capture,
// and no runtime rewriting of touch-action or pointer-events.
function reset(){return true}
window.AbuQuestionGestures={disabled:true,version:2,reset};
})();
