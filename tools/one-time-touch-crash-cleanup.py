from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def write(rel,text): (ROOT/rel).write_text(text,encoding='utf-8')
def exact(text,old,new,label):
    if old not in text: raise SystemExit(f'{label}: expected source pattern not found')
    if text.count(old)!=1: raise SystemExit(f'{label}: expected one source pattern, found {text.count(old)}')
    return text.replace(old,new)
def sub1(text,pattern,repl,label,flags=0):
    out,n=re.subn(pattern,repl,text,count=1,flags=flags)
    if n!=1: raise SystemExit(f'{label}: expected one match, found {n}')
    return out

p='web/app-security-runtime.js'; s=read(p)
s=exact(s,"function injectSecurityCard(){renderSecurityCard();const observer=new MutationObserver(()=>{if(document.querySelector('#abuSettingsModal .abu-settings-body')&&!$('abuSecuritySettings'))renderSecurityCard()});observer.observe(document.body,{childList:true,subtree:true})}","let securityCardSignalsBound=false;function injectSecurityCard(){renderSecurityCard();if(securityCardSignalsBound)return;securityCardSignalsBound=true;window.addEventListener('pageshow',renderSecurityCard,{passive:true});window.addEventListener('focus',renderSecurityCard,{passive:true});document.addEventListener('abu-bassam-settings-opened',renderSecurityCard,{passive:true})}",'app-security observer')
s=exact(s,"function guardClicks(){document.addEventListener('click',event=>{if(!unlocked||currentDevice?.role==='owner')return;const target=event.target?.closest?.('button,[role=\"button\"]');const need=permissionForTarget(target);if(need&&!can(need)){event.preventDefault();event.stopImmediatePropagation();toast('هذه العملية متاحة للحساب الرئيسي فقط')}},true)}","function guardClicks(){applySecondaryGuards()}",'app-security global click guard')
if 'stopImmediatePropagation' in s: raise SystemExit('app-security: stopImmediatePropagation still present')
if 'new MutationObserver' in s or 'MutationObserver(' in s: raise SystemExit('app-security: MutationObserver still present')
write(p,s)

p='web/feature-recovery-runtime.js'; s=read(p)
s=s.replace('#questionsFrame{touch-action:auto!important}','')
s=sub1(s,r"function restoreNativeTouch\(\)\{[\s\S]*?\n\}\nfunction removeFlex",'function removeFlex','feature-recovery restoreNativeTouch',re.M)
s=sub1(s,r"function cleanQuestions\(\)\{[\s\S]*?\nfunction applyRequestedTemplate",'function applyRequestedTemplate','feature-recovery cleanQuestions',re.M)
s=sub1(s,r"let recoveryTimer=0;function scheduleRecovery\(\)\{[^\n]*\}","let recoveryTimer=0;function scheduleRecovery(){clearTimeout(recoveryTimer);recoveryTimer=setTimeout(()=>{removeFlex();installCards();removeOldPlacements()},60)}",'feature-recovery scheduleRecovery')
s=sub1(s,r"function init\(\)\{[^\n]*new MutationObserver\(scheduleRecovery\)\.observe\(document\.documentElement,\{childList:true,subtree:true\}\);[^\n]*\}","function init(){addCss();removeFlex();installCards();removeOldPlacements();window.addEventListener('message',recoveryMessage);window.addEventListener('pageshow',scheduleRecovery,{passive:true});window.addEventListener('focus',scheduleRecovery,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRecovery()},{passive:true});[120,600,1800].forEach(ms=>setTimeout(scheduleRecovery,ms))}",'feature-recovery init')
for bad in ['restoreNativeTouch','cleanQuestions','MutationObserver(','style.touchAction','style.pointerEvents','inert=true']:
    if bad in s: raise SystemExit(f'feature-recovery: forbidden runtime touch/observer marker remains: {bad}')
write(p,s)

p='web/index.html'; s=read(p)
s=exact(s,'*{box-sizing:border-box;font-family:"Segoe UI",Tahoma,Arial,sans-serif;touch-action:manipulation}','*{box-sizing:border-box;font-family:"Segoe UI",Tahoma,Arial,sans-serif}','index global touch-action')
new_zoom="""function initPaperZoom(){let stage=$('paperZoomStage'),overlay=$('paperZoomOverlay');if(!stage||!overlay)return;const pointers=new Map();let pinchStart=0,pinchScale=1,lastX=0,lastY=0,dragging=false;const pts=()=>[...pointers.values()];const dist=a=>{if(a.length<2)return 0;let dx=a[0].x-a[1].x,dy=a[0].y-a[1].y;return Math.hypot(dx,dy)};stage.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{stage.setPointerCapture(e.pointerId)}catch(_){}let a=pts();if(a.length===2){pinchStart=dist(a);pinchScale=paperZoomScale;dragging=false}else if(a.length===1){dragging=true;lastX=e.clientX;lastY=e.clientY}e.preventDefault()});stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});let a=pts();if(a.length===2&&pinchStart>0){paperZoomScale=Math.max(.7,Math.min(6,pinchScale*dist(a)/pinchStart));applyPaperZoom()}else if(a.length===1&&dragging&&paperZoomScale>1){paperZoomX+=e.clientX-lastX;paperZoomY+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;applyPaperZoom()}e.preventDefault()});const end=e=>{pointers.delete(e.pointerId);let a=pts();if(a.length<2)pinchStart=0;if(!a.length)dragging=false;else if(a.length===1){lastX=a[0].x;lastY=a[0].y;dragging=true}};stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('lostpointercapture',end);stage.addEventListener('wheel',e=>{paperZoomScale=Math.max(.7,Math.min(6,paperZoomScale*(e.deltaY<0?1.12:.89)));applyPaperZoom();e.preventDefault()},{passive:false});stage.addEventListener('dblclick',()=>{paperZoomScale=paperZoomScale>1?1:2;paperZoomX=paperZoomY=0;applyPaperZoom()});overlay.addEventListener('click',e=>{if(e.target===overlay)closePaperZoom()})}"""
s=sub1(s,r"function initPaperZoom\(\)\{[\s\S]*?\}function updatePageNav",new_zoom+'function updatePageNav','index paper zoom touch handlers')
for bad in ["addEventListener('touchstart'","addEventListener('touchmove'","addEventListener('touchend'"]:
    if bad in s: raise SystemExit(f'index.html: old touch handler remains: {bad}')
write(p,s)

p='index.js'; s=read(p)
s=exact(s,"  const [webReady, setWebReady] = useState(false);\n  const [startupAttempts, setStartupAttempts] = useState(0);","  const [webReady, setWebReady] = useState(false);\n  const [webInstanceKey, setWebInstanceKey] = useState(0);\n  const [startupAttempts, setStartupAttempts] = useState(0);",'index web instance state')
anchor="  const closeCamera = useCallback(() => {\n    setCameraMode(null); setCameraReady(false); setCameraBusy(false); setBarcodeLocked(false); setTorch(false); setCameraFacing('back');\n  }, []);"
replacement=anchor+"\n  const recoverWebRenderer = useCallback((didCrash = false) => {\n    closeCamera();\n    setWebReady(false);\n    setStartupAttempts(0);\n    setWebInstanceKey((value) => value + 1);\n    if (didCrash) Alert.alert('تمت استعادة التطبيق', 'تعطل محرك العرض الداخلي وتمت إعادة إنشائه تلقائيًا.');\n  }, [closeCamera]);"
s=exact(s,anchor,replacement,'index renderer recovery function')
s=exact(s,'      <WebView\n        ref={webRef} source={{ uri: APP_URL }} style={styles.webView}', '      <WebView\n        key={webInstanceKey} ref={webRef} source={{ uri: APP_URL }} style={styles.webView}','index WebView key')
s=exact(s,"        injectedJavaScriptBeforeContentLoaded={ANDROID_BRIDGE} onMessage={onWebMessage} onShouldStartLoadWithRequest={onShouldStartLoadWithRequest} onLoadEnd={() => setWebReady(true)}\n        onError={() => Alert.alert('تعذر فتح التطبيق', 'أعد تشغيل التطبيق وحاول مرة أخرى.')}","        injectedJavaScriptBeforeContentLoaded={ANDROID_BRIDGE} onMessage={onWebMessage} onShouldStartLoadWithRequest={onShouldStartLoadWithRequest} onLoadEnd={() => setWebReady(true)}\n        onRenderProcessGone={(event) => recoverWebRenderer(!!event.nativeEvent?.didCrash)}\n        onContentProcessDidTerminate={() => recoverWebRenderer(true)}\n        onError={() => recoverWebRenderer(false)}",'index WebView crash callbacks')
for need in ['webInstanceKey','recoverWebRenderer','onRenderProcessGone','onContentProcessDidTerminate']:
    if need not in s: raise SystemExit(f'index.js: missing crash recovery marker {need}')
write(p,s)

check=ROOT/'tools/check_input_and_crash_stability.js'
check.write_text(r'''const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),errors=[];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const security=read('web/app-security-runtime.js'),recovery=read('web/feature-recovery-runtime.js'),index=read('web/index.html'),native=read('index.js');
for(const [src,token,label] of [[security,'stopImmediatePropagation','security global click interception'],[security,'MutationObserver(','security global DOM observer'],[recovery,'restoreNativeTouch','runtime touch repair'],[recovery,'cleanQuestions','obsolete touch/question repair'],[recovery,'MutationObserver(','recovery global DOM observer'],[recovery,'style.touchAction','runtime touchAction rewrite'],[recovery,'style.pointerEvents','runtime pointer-events rewrite'],[index,"addEventListener('touchstart'",'legacy touchstart'],[index,"addEventListener('touchmove'",'legacy touchmove'],[index,"addEventListener('touchend'",'legacy touchend']])if(src.includes(token))errors.push(`${label}: ${token}`);
for(const token of ['webInstanceKey','recoverWebRenderer','onRenderProcessGone','onContentProcessDidTerminate'])if(!native.includes(token))errors.push(`native crash recovery missing: ${token}`);
for(const token of ["addEventListener('pointerdown'","addEventListener('pointermove'","addEventListener('pointerup'"])if(!index.includes(token))errors.push(`local paper zoom pointer event missing: ${token}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Input/crash stability checks passed: no global touch-repair/capture interceptor in security or recovery, legacy touch listeners removed from main zoom, local Pointer Events present, and WebView renderer reconstruction is wired.');
''',encoding='utf-8')

for f in sorted(x for x in (ROOT/'web').iterdir() if x.suffix in {'.js','.html'}):
    t=f.read_text(encoding='utf-8',errors='ignore'); hits=[]
    for token in ['touchstart','touchmove','touchend','stopImmediatePropagation','MutationObserver(']:
        if token in t: hits.append(token)
    if hits: print(f'AUDIT {f.relative_to(ROOT)}: {", ".join(hits)}')
print('one-time touch/crash cleanup applied')
