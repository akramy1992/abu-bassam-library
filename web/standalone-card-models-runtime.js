(()=>{
'use strict';
if(window.__ABU_STANDALONE_CARD_MODELS_V2__)return;
window.__ABU_STANDALONE_CARD_MODELS_V2__=true;
const $=id=>document.getElementById(id);
const RATION_IDS=new Set(['t1','t2','t3','t4','t5','t6','t7','t8','t9','t10']);
const MAWKIB_IDS=new Set(['t1','t2','t3','t4','t5','t6','t7','t8','t9','t10']);
const STUDENT_IDS=new Set(['t1','t2','t3','t4','t5','t6','t7','t8','t9','t10']);
function dispatch(select,value){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));select.dispatchEvent(new Event('input',{bubbles:true}))}
function hash(win){return decodeURIComponent((win.location.hash||'').replace(/^#/,''))}
function allCss(doc){return [...doc.querySelectorAll('style')].map(node=>node.textContent||'').join('\n')}
function installRationExports(doc,win){
  if(win.__ABU_RATION_EXPORT_FIX_V1__)return;
  win.__ABU_RATION_EXPORT_FIX_V1__=true;
  if(typeof win.printable==='function'){
    const originalPrintable=win.printable;
    win.printable=function(){
      const html=String(originalPrintable());
      const css=allCss(doc);
      return html.includes('</head>')?html.replace('</head>','<style>'+css+'</style></head>'):html;
    };
  }
  win.cardPng=async function(id){
    const el=doc.getElementById(id);if(!el)throw new Error('CARD_NOT_FOUND');
    const w=1712,h=1080,clone=el.cloneNode(true),css=allCss(doc);
    clone.style.width=w+'px';clone.style.height=h+'px';clone.style.aspectRatio='auto';clone.style.boxShadow='none';
    clone.querySelectorAll('.safe').forEach(n=>n.remove());
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:'+w+'px;height:'+h+'px;position:relative"><style>'+css+'</style>'+clone.outerHTML+'</div></foreignObject></svg>';
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),img=new Image();
    try{
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
      const canvas=doc.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);return canvas.toDataURL('image/png');
    }finally{URL.revokeObjectURL(url)}
  };
}
function selectByHash(doc,win,valid){const select=doc.getElementById('template');if(!select)return;const wanted=hash(win);if(valid.has(wanted)&&[...select.options].some(o=>o.value===wanted))setTimeout(()=>dispatch(select,wanted),30)}
function ration(doc,win){selectByHash(doc,win,RATION_IDS);installRationExports(doc,win)}
function mawkib(doc,win){selectByHash(doc,win,MAWKIB_IDS)}
function student(doc,win){selectByHash(doc,win,STUDENT_IDS)}
function apply(frame){try{const win=frame.contentWindow,doc=frame.contentDocument;if(!win||!doc?.head)return;const file=(win.location.pathname||'').split('/').pop().toLowerCase();if(file==='ration-card.html')ration(doc,win);if(file==='mawkib-cards.html')mawkib(doc,win);if(file==='student-thanks-cards.html')student(doc,win)}catch(e){}}
function watch(){const frame=$('abuRecoveryFrame');if(!frame||frame.dataset.abuCanonicalModelWatch==='2')return;frame.dataset.abuCanonicalModelWatch='2';frame.addEventListener('load',()=>setTimeout(()=>apply(frame),100));setTimeout(()=>apply(frame),120)}
function init(){watch();new MutationObserver(watch).observe(document.documentElement,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();