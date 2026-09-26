(()=>{
'use strict';
if(window.__ABU_QUESTION_PAPER_V3__)return;
window.__ABU_QUESTION_PAPER_V3__=true;
const $=id=>document.getElementById(id);
const KEY='abuQuestionPaperSettingsV3';
const presets={A4P:[210,297],A4L:[297,210],A5P:[148,210],A5L:[210,148]};
const allowed=new Set([...Object.keys(presets),'CUSTOM']);
let state={preset:'A4P',w:210,h:297};
function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:fallback}
try{
  const old=JSON.parse(localStorage.getItem(KEY)||'null')||JSON.parse(localStorage.getItem('abuQuestionPaperSettingsV2')||'null')||JSON.parse(localStorage.getItem('abuQuestionPaperSettingsV1')||'null')||{};
  const preset=allowed.has(old.preset)?old.preset:'A4P';
  if(preset==='CUSTOM')state={preset,w:clamp(old.w,70,330,210),h:clamp(old.h,100,480,297)};
  else {const d=presets[preset];state={preset,w:d[0],h:d[1]}}
}catch(e){}
function mmToPx(mm){return Math.round(mm*96/25.4)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
function css(){return `.abu-paper-modal{position:fixed;inset:0;z-index:12600;background:#000b;display:none;align-items:flex-end}.abu-paper-modal.show{display:flex}.abu-paper-sheet{width:100%;max-height:78vh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:13px;color:#1f2937}.abu-paper-head{display:flex;justify-content:space-between;align-items:center}.abu-paper-head button{border:0;border-radius:50%;width:36px;height:36px;font-size:20px}.abu-paper-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}.abu-paper-grid label{font-size:9px;font-weight:800}.abu-paper-grid select,.abu-paper-grid input{width:100%;min-height:42px;border:1px solid #cbd5e1;border-radius:9px;padding:6px;font-family:Tajawal}.abu-paper-custom{display:none;grid-template-columns:1fr 1fr;gap:8px}.abu-paper-custom.show{display:grid}.abu-paper-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.abu-paper-actions button{min-height:42px;border:0;border-radius:10px;background:#0f766e;color:#fff;font-family:Tajawal;font-weight:900}.abu-paper-btn{background:#1565c0!important}@media print{.abu-paper-modal{display:none!important}}`}
function modal(){return `<div id="abuPaperModal" class="abu-paper-modal"><div class="abu-paper-sheet"><div class="abu-paper-head"><div><b>إعدادات ورق الأسئلة</b><div style="font-size:9px;color:#64748b">A4 أو A5 أو قياس مخصص — عمودي أو أفقي</div></div><button onclick="AbuQuestionPaper.close()">×</button></div><div class="abu-paper-grid"><label>حجم الورق<select id="abuPaperPreset" onchange="AbuQuestionPaper.preset()"><option value="A4P">A4 عمودي — 210 × 297 ملم</option><option value="A4L">A4 أفقي — 297 × 210 ملم</option><option value="A5P">A5 عمودي — 148 × 210 ملم</option><option value="A5L">A5 أفقي — 210 × 148 ملم</option><option value="CUSTOM">مخصص</option></select></label><div id="abuPaperCustom" class="abu-paper-custom"><label>العرض (ملم)<input id="abuPaperW" type="number" min="70" max="330" step="1" inputmode="decimal"></label><label>الارتفاع (ملم)<input id="abuPaperH" type="number" min="100" max="480" step="1" inputmode="decimal"></label></div></div><div class="abu-paper-actions"><button onclick="AbuQuestionPaper.apply()">تطبيق</button><button onclick="AbuQuestionPaper.close()">إغلاق</button></div></div></div>`}
function ensure(){
  if(!$('abuQuestionPaperStyle')){let s=document.createElement('style');s.id='abuQuestionPaperStyle';s.textContent=css();document.head.appendChild(s)}
  if(!$('abuPaperModal'))document.body.insertAdjacentHTML('beforeend',modal());
  let bar=$('controls');if(bar&&!$('abuPaperBtn')){let b=document.createElement('button');b.id='abuPaperBtn';b.className='btn abu-paper-btn';b.onclick=open;bar.appendChild(b)}
}
function label(){const b=$('abuPaperBtn');if(!b)return;b.textContent=state.preset.startsWith('A5')?'📄 A5':state.preset==='CUSTOM'?'📄 مخصص':'📄 A4'}
function sync(){if($('abuPaperPreset'))$('abuPaperPreset').value=state.preset;if($('abuPaperW'))$('abuPaperW').value=String(state.w);if($('abuPaperH'))$('abuPaperH').value=String(state.h);$('abuPaperCustom')?.classList.toggle('show',state.preset==='CUSTOM');label()}
function open(){sync();$('abuPaperModal')?.classList.add('show')}
function close(){$('abuPaperModal')?.classList.remove('show')}
function preset(){const v=$('abuPaperPreset')?.value||'A4P';state.preset=allowed.has(v)?v:'A4P';if(state.preset!=='CUSTOM'){const d=presets[state.preset];state.w=d[0];state.h=d[1]}sync()}
function readCustom(){if(state.preset!=='CUSTOM')return true;const w=clamp($('abuPaperW')?.value,70,330,NaN),h=clamp($('abuPaperH')?.value,100,480,NaN);if(!Number.isFinite(w)||!Number.isFinite(h)){alert('أدخل قياسًا مخصصًا صحيحًا ضمن الحدود المسموحة.');return false}state.w=w;state.h=h;return true}
function deletePage(btn){const page=btn?.closest?.('.a4-page');if(!page)return;const pages=document.querySelectorAll('.a4-page');if(pages.length<=1){alert('يجب أن تبقى صفحة واحدة على الأقل.');return}try{window.saveState?.()}catch(e){}page.remove();try{window.fitToScreen?.();window.scheduleQuestionDraft?.()}catch(e){}}
function tagPages(){document.querySelectorAll('.a4-page').forEach(p=>{p.dataset.paperPreset=state.preset;p.dataset.paperW=String(state.w);p.dataset.paperH=String(state.h)})}
function installFit(){
  window.fitToScreen=function(){
    const container=$('pages-container'),workspace=$('workspace'),controls=$('controls');if(!container||!workspace)return;
    const page=container.querySelector('.a4-page');const pageWidth=page?.offsetWidth||mmToPx(state.w);const available=Math.max(280,window.innerWidth-20);
    const scale=Math.min(1,available/pageWidth);window.currentScale=scale;
    workspace.style.marginTop=((controls?.offsetHeight||0)+15)+'px';container.style.transformOrigin='top center';container.style.transform=`scale(${scale})`;
    const natural=container.offsetHeight;container.style.marginBottom=((natural*scale)-natural)+'px';
  };
}
function makeFlowPage(){if(typeof window.addNewPage==='function'){window.addNewPage(true);return document.querySelector('.a4-page:last-child')}return null}
function installFlow(){
  window.checkAutoFlow=function(){
    let guard=0,moved=false;
    while(guard++<40){
      const pages=[...document.querySelectorAll('.a4-page')];let overflow=null;
      for(const page of pages){if(page.scrollHeight>page.clientHeight+4){overflow=page;break}}
      if(!overflow)break;
      const area=overflow.querySelector('.questions-area'),last=area?.lastElementChild;if(!area||!last||!last.classList.contains('question-container'))break;
      if(area.children.length===1){overflow.classList.add('abu-question-overflow');break}
      let next=overflow.nextElementSibling;if(!next||!next.classList.contains('a4-page'))next=makeFlowPage();
      const nextArea=next?.querySelector('.questions-area');if(!nextArea)break;
      nextArea.insertBefore(last,nextArea.firstChild);moved=true;
    }
    if(moved){try{window.fitToScreen?.();window.scheduleQuestionDraft?.()}catch(e){}}
  };
}
function apply(closeAfter=true){
  const selected=$('abuPaperPreset')?.value;if(selected&&allowed.has(selected))state.preset=selected;
  if(state.preset!=='CUSTOM'){const d=presets[state.preset]||presets.A4P;state.w=d[0];state.h=d[1]}else if(!readCustom())return false;
  const old=$('abuQuestionPaperOverride');if(old)old.remove();
  const s=document.createElement('style');s.id='abuQuestionPaperOverride';const wpx=mmToPx(state.w),hpx=mmToPx(state.h);
  s.textContent=`.a4-page{width:${wpx}px!important;height:${hpx}px!important;min-height:${hpx}px!important;max-height:${hpx}px!important}.a4-page.abu-question-overflow{outline:3px solid #dc2626!important}@media print{@page{size:${state.w}mm ${state.h}mm!important;margin:0}.a4-page{width:${wpx}px!important;height:${hpx}px!important;min-height:${hpx}px!important;max-height:${hpx}px!important}}`;
  document.head.appendChild(s);tagPages();save();installFit();installFlow();sync();
  try{window.fitToScreen?.();window.checkAutoFlow?.();window.scheduleQuestionDraft?.()}catch(e){}
  if(closeAfter)close();return true;
}
function loadSupport(){
  [['abuQuestionTemplateToolsExternal','questions-template-tools-runtime.js'],['abuQuestionCompletionExternal','questions-completion-runtime.js'],['abuQuestionMaintenanceExternal','questions-maintenance-runtime.js'],['abuQuestionFinalFixesExternal','questions-final-fixes-runtime.js'],['abuQuestionCustomLibraryExternal','questions-custom-library-runtime.js']].forEach(([id,src])=>{if(document.getElementById(id))return;let s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.onerror=()=>console.warn(src+' failed to load');document.head.appendChild(s)})
}
function init(){ensure();sync();window.deletePage=deletePage;apply(false);loadSupport();new MutationObserver(()=>{tagPages()}).observe($('pages-container')||document.body,{childList:true,subtree:true})}
window.AbuQuestionPaper={open,close,preset,apply,deletePage,state:()=>({...state})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();