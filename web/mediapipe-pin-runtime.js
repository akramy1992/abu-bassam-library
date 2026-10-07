(()=>{
'use strict';
if(window.__ABU_MEDIAPIPE_PIN_V1__)return;
window.__ABU_MEDIAPIPE_PIN_V1__=true;
const VERSION='0.1.1675465747';
const BASE='vendor/mediapipe/selfie_segmentation/';
window.getSelfie=async function(){
  if(typeof selfieModel!=='undefined'&&selfieModel)return selfieModel;
  if(typeof loadScript!=='function')throw new Error('أداة إزالة الخلفية غير جاهزة');
  await loadScript(BASE+'selfie_segmentation.js');
  if(!window.SelfieSegmentation)throw new Error('تعذر تشغيل محرك إزالة الخلفية المحلي. أعد تثبيت النسخة الكاملة من التطبيق.');
  selfieModel=new SelfieSegmentation({locateFile:file=>BASE+file});
  selfieModel.setOptions({modelSelection:1});
  selfieModel.onResults(result=>{
    if(typeof selfieResolve!=='undefined'&&selfieResolve){const resolve=selfieResolve;selfieResolve=null;resolve(result)}
  });
  return selfieModel;
};
window.AbuBassamMediaPipe={version:VERSION,base:BASE};
})();
