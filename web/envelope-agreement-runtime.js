(()=>{
'use strict';
if(document.body?.dataset?.studioMode!=='envelope')return;
if(window.__ABU_ENVELOPE_AGREEMENT_V3__)return;window.__ABU_ENVELOPE_AGREEMENT_V3__=true;
const $=id=>document.getElementById(id);
const REMOVED_KEY='abuEnvelopeOptionalFieldsRemovedV1';
function readRemoved(){try{return JSON.parse(localStorage.getItem(REMOVED_KEY)||'{}')||{}}catch(_){return{}}}
function writeRemoved(value){try{localStorage.setItem(REMOVED_KEY,JSON.stringify(value||{}))}catch(_){}}
function markRemoved(marker){if(!marker)return;const state=readRemoved();state[marker]=true;writeRemoved(state)}
function clearRemoved(){try{localStorage.removeItem(REMOVED_KEY)}catch(_){}}
function relabelPresets(){const s=$('dsPreset');if(!s)return;const a=s.querySelector('option[value="A5"]'),b=s.querySelector('option[value="A4"]');if(a){a.textContent='ورق A5 — غلاف فقط ٢١٠ × ١٤٨ مم';a.title='مقاس ورق/غلاف وليس قياس ظرف قياسي'}if(b){b.textContent='ورق A4 — غلاف فقط ٢٩٧ × ٢١٠ مم';b.title='مقاس ورق/غلاف وليس قياس ظرف قياسي'}}
function textExists(label){return [...document.querySelectorAll('#dsCanvas .ds-text')].some(el=>(el.textContent||'').includes(label))}
function addBoundText(label,style,marker){if(readRemoved()[marker]||textExists(label)||!window.DesignStudio?.addText)return;const c=$('dsCanvas');if(!c)return;DesignStudio.addText();const items=c.querySelectorAll('.ds-el.ds-text');const el=items[items.length-1];if(!el)return;const textNode=[...el.childNodes].find(n=>n.nodeType===3);if(textNode)textNode.nodeValue=label;else el.insertBefore(document.createTextNode(label),el.firstChild);el.dataset.agreedField=marker;el.style.cssText=style;el.setAttribute('contenteditable','true')}
function ensureOptionalFields(){const c=$('dsCanvas');if(!c)return;addBoundText('التاريخ: ....................','left:5%;top:8%;width:24%;height:9%;font-size:clamp(9px,2vw,18px);font-weight:700;text-align:center;','date');addBoundText('اليوم: ......................','left:5%;top:18%;width:24%;height:9%;font-size:clamp(9px,2vw,18px);font-weight:700;text-align:center;','day')}
function note(){const status=$('dsStatus');if(status&&!status.dataset.agreedNote){status.dataset.agreedNote='1';status.textContent='كل تعديل يُحفظ تلقائيًا • اليوم والتاريخ اختياريان ويمكن حذفهما • A4/A5 مقاسات ورق/غلاف وليست أظرفًا قياسية'}}
function refreshAgreementFields(){relabelPresets();ensureOptionalFields();note()}
function patchTemplateApply(){if(!window.DesignStudio||DesignStudio.__abuEnvelopeAgreementPatched)return;const originalApply=DesignStudio.applyTemplate?.bind(DesignStudio),originalRemove=DesignStudio.remove?.bind(DesignStudio),originalReset=DesignStudio.reset?.bind(DesignStudio);if(!originalApply||!originalRemove)return;
  DesignStudio.applyTemplate=function(...args){clearRemoved();const result=originalApply(...args);setTimeout(refreshAgreementFields,0);return result};
  DesignStudio.remove=function(...args){const selected=document.querySelector('#dsCanvas .ds-el.selected');const marker=selected?.dataset?.agreedField||'';if(marker)markRemoved(marker);return originalRemove(...args)};
  if(originalReset)DesignStudio.reset=function(...args){clearRemoved();const result=originalReset(...args);setTimeout(refreshAgreementFields,0);return result};
  DesignStudio.__abuEnvelopeAgreementPatched=true
}
function init(){setTimeout(()=>{relabelPresets();patchTemplateApply();ensureOptionalFields();note()},0)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
