from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def replace_once(s,old,new,label):
    n=s.count(old)
    if n!=1: raise SystemExit(f'{label}: expected exactly one match, got {n}')
    return s.replace(old,new)

# 1) Child card templates: event-driven template refresh, no document observer.
p='web/child-card-templates-runtime.js';s=read(p)
old="""  const observer=new MutationObserver(()=>{if(window.CardsStudio?.currentType?.()==='child'){markCards();if(!document.getElementById('abuChildTemplatePicker'))installPicker()}});
  observer.observe(document.documentElement,{childList:true,subtree:true});"""
new="""  const refreshChildUi=()=>{if(window.CardsStudio?.currentType?.()==='child'){markCards();if(!document.getElementById('abuChildTemplatePicker'))installPicker()}};
  document.addEventListener('abu-bassam-section-opened',refreshChildUi,{passive:true});
  document.addEventListener('abu-bassam-auth-changed',refreshChildUi,{passive:true});
  window.addEventListener('pageshow',refreshChildUi,{passive:true});
  window.addEventListener('focus',refreshChildUi,{passive:true});
  [120,500,1400].forEach(ms=>setTimeout(refreshChildUi,ms));"""
s=replace_once(s,old,new,'child-card templates observer')
write(p,s)

# 2) Customer workflow: refresh only on section/auth/page signals and finite startup checks.
p='web/customer-documents-workflow-runtime.js';s=read(p)
old="""function boot(){addStyle();ensureEditor();ensureMerge();let n=0,t=setInterval(()=>{if(overrideApi()){clearInterval(t);return}if(++n>240)clearInterval(t)},100);const mo=new MutationObserver(()=>{if(!W.wired)overrideApi();if(W.wired&&$('custModal')?.classList.contains('on')&&!W.currentId){listControls()}});mo.observe(document.documentElement,{childList:true,subtree:true})}"""
new="""function refreshWorkflowUi(){if(!W.wired)overrideApi();if(W.wired&&$('custModal')?.classList.contains('on')&&!W.currentId)listControls()}
function scheduleWorkflowUi(){clearTimeout(scheduleWorkflowUi.timer);scheduleWorkflowUi.timer=setTimeout(refreshWorkflowUi,30)}
function boot(){addStyle();ensureEditor();ensureMerge();[80,180,400,800,1600,3000].forEach(ms=>setTimeout(refreshWorkflowUi,ms));document.addEventListener('abu-bassam-section-opened',scheduleWorkflowUi,{passive:true});document.addEventListener('abu-bassam-auth-changed',scheduleWorkflowUi,{passive:true});window.addEventListener('pageshow',scheduleWorkflowUi,{passive:true});window.addEventListener('focus',scheduleWorkflowUi,{passive:true})}"""
s=replace_once(s,old,new,'customer workflow observer')
write(p,s)

# 3) Customer image quality: wire directly to editor when it exists; no observer or endless interval.
p='web/customer-image-quality-runtime.js';s=read(p)
old="""function schedule(){clearTimeout(timer);timer=setTimeout(analyze,180)}function boot(){const mo=new MutationObserver(()=>{const m=document.getElementById('cwfEditor');if(!m)return;if(!m.dataset.qualityWired){m.dataset.qualityWired='1';m.addEventListener('input',schedule,true);m.addEventListener('change',schedule,true);m.addEventListener('pointerup',schedule,true)}if(m.classList.contains('on'))schedule()});mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});setInterval(()=>{const m=document.getElementById('cwfEditor');if(m?.classList.contains('on'))schedule()},2500)}"""
new="""function schedule(){clearTimeout(timer);timer=setTimeout(analyze,180)}function wireQuality(){const m=document.getElementById('cwfEditor');if(!m)return false;if(!m.dataset.qualityWired){m.dataset.qualityWired='1';m.addEventListener('input',schedule,true);m.addEventListener('change',schedule,true);m.addEventListener('pointerup',schedule,true)}if(m.classList.contains('on'))schedule();return true}function boot(){[80,180,400,800,1600,3000].forEach(ms=>setTimeout(wireQuality,ms));document.addEventListener('abu-bassam-section-opened',wireQuality,{passive:true});window.addEventListener('pageshow',wireQuality,{passive:true});window.addEventListener('focus',wireQuality,{passive:true})}"""
s=replace_once(s,old,new,'customer image quality observer')
write(p,s)
print('final three document-wide observers removed')
