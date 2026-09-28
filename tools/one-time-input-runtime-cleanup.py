from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def rep(s,old,new,label):
    n=s.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, found {n}')
    return s.replace(old,new)
def sub(s,pat,new,label,flags=0):
    out,n=re.subn(pat,new,s,count=1,flags=flags)
    if n!=1: raise SystemExit(f'{label}: expected 1 regex match, found {n}')
    return out

# Cards photo gestures: Pointer Events only, scoped to the photo stage.
p='web/cards-studio-runtime.js';s=read(p)
old=re.search(r"function bindPhotoGestures\(\)\{[^\n]*ontouchstart[\s\S]*?\}\nfunction syncPhotoControls",s)
if not old: raise SystemExit('cards-studio: legacy gesture block not found')
new="""function bindPhotoGestures(){let stage=document.querySelector('#csCardPair .cs-photo-stage');if(!stage||stage.dataset.abuPointerPhoto==='1')return;stage.dataset.abuPointerPhoto='1';stage.style.touchAction='none';const points=new Map();let pinchStart=0,startZoom=state.photoTransform.zoom,last=null;const list=()=>[...points.values()];const distance=a=>a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);const apply=()=>document.querySelectorAll('#csCardPair .cs-photo-img').forEach(image=>image.style.transform=`translate(${state.photoTransform.x}%,${state.photoTransform.y}%) scale(${state.photoTransform.zoom}) rotate(${state.photoTransform.rotate}deg)`);stage.addEventListener('pointerdown',event=>{points.set(event.pointerId,{x:event.clientX,y:event.clientY});try{stage.setPointerCapture(event.pointerId)}catch(_){}const a=list();if(a.length===2){pinchStart=distance(a);startZoom=state.photoTransform.zoom;last=null}else if(a.length===1)last={x:event.clientX,y:event.clientY};event.preventDefault()},{passive:false});stage.addEventListener('pointermove',event=>{if(!points.has(event.pointerId))return;points.set(event.pointerId,{x:event.clientX,y:event.clientY});const a=list();if(a.length===2&&pinchStart){state.photoTransform.zoom=cap(startZoom*distance(a)/pinchStart,1,3.5)}else if(a.length===1&&last){const point=a[0],rect=stage.getBoundingClientRect();state.photoTransform.x=cap(state.photoTransform.x+(point.x-last.x)/rect.width*100,-70,70);state.photoTransform.y=cap(state.photoTransform.y+(point.y-last.y)/rect.height*100,-70,70);last={x:point.x,y:point.y}}apply();event.preventDefault()},{passive:false});const end=event=>{points.delete(event.pointerId);const a=list();if(a.length<2)pinchStart=0;if(a.length===1)last={x:a[0].x,y:a[0].y};else if(!a.length){last=null;syncPhotoControls()}};stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('lostpointercapture',end)}
function syncPhotoControls"""
s=s[:old.start()]+new+s[old.end():]
write(p,s)

# National-ID zoom: Pointer Events only; also remove deleted section tabs from navigation.
p='web/national-id-runtime.js';s=read(p)
s=s.replace('<button id="tabQuestions" class="abu-tab">صياغة الأسئلة</button><button id="tabCompressor" class="abu-tab">ضغط الصور</button>','')
old=re.search(r"function setupZoomTouch\(\)\{[^\n]*touchstart[\s\S]*?\}\nfunction zoomPaper",s)
if not old: raise SystemExit('national-id: legacy zoom touch block not found')
new="""function setupZoomPointer(){let o=$('natZoom');if(!o||o.dataset.abuPointerZoom==='1')return;o.dataset.abuPointerZoom='1';o.style.touchAction='none';const points=new Map();let startD=0,startScale=1,last=null;const list=()=>[...points.values()];const dist=a=>a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);o.addEventListener('pointerdown',e=>{if(e.target?.closest?.('button'))return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});try{o.setPointerCapture(e.pointerId)}catch(_){}const a=list();if(a.length===2){startD=dist(a);startScale=z.scale;last=null}else if(a.length===1)last={x:e.clientX,y:e.clientY};e.preventDefault()},{passive:false});o.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=list();if(a.length===2&&startD){z.scale=Math.max(.7,Math.min(6,startScale*dist(a)/startD));zoomApply()}else if(a.length===1&&last){z.x+=a[0].x-last.x;z.y+=a[0].y-last.y;last={x:a[0].x,y:a[0].y};zoomApply()}e.preventDefault()},{passive:false});const end=e=>{points.delete(e.pointerId);const a=list();if(a.length<2)startD=0;last=a.length===1?{x:a[0].x,y:a[0].y}:null};o.addEventListener('pointerup',end);o.addEventListener('pointercancel',end);o.addEventListener('lostpointercapture',end)}
function zoomPaper"""
s=s[:old.start()]+new+s[old.end():]
s=s.replace('setupZoomTouch()','setupZoomPointer()')
write(p,s)

# Advanced admin permissions: remove deleted sections and global document observer/message interception.
p='web/admin-permissions-runtime.js';s=read(p)
s=re.sub(r"\{key:'questions',label:'📝 صياغة الأسئلة',items:\[[\s\S]*?\n\]},\n",'',s,count=1)
s=re.sub(r"\{key:'compress',label:'🗜️ ضغط الصور',items:\[[\s\S]*?\n\]},\n",'',s,count=1)
s=s.replace("['printQuestions','طباعة الأسئلة',true],",'')
s=re.sub(r"function guardProductivity\(\)\{[\s\S]*?\nfunction applySettingsGuard",'function applySettingsGuard',s,count=1)
s=s.replace('guardProductivity();','')
s=sub(s,r"function boot\(\)\{installBridge\(\);[\s\S]*?\}\nwindow\.AbuBassamPermissions","function schedulePermissionTick(){clearTimeout(schedulePermissionTick.timer);schedulePermissionTick.timer=setTimeout(tick,30)}\nfunction boot(){installBridge();tick();document.addEventListener('abu-bassam-auth-changed',schedulePermissionTick,{passive:true});document.addEventListener('abu-bassam-section-opened',schedulePermissionTick,{passive:true});window.addEventListener('pageshow',schedulePermissionTick,{passive:true});window.addEventListener('focus',schedulePermissionTick,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedulePermissionTick()},{passive:true});[120,500,1500].forEach(ms=>setTimeout(tick,ms))}\nwindow.AbuBassamPermissions",'admin permissions boot')
write(p,s)

# Cards hardening: drop global message capture/observer/polling. API wrappers remain the permission boundary.
p='web/cards-hardening-runtime.js';s=read(p)
s=s.replace('event.stopImmediatePropagation?.();','')
s=sub(s,r"function boot\(\)\{window\.addEventListener\('message',blockRecoveryMessages,true\);let n=0,t=setInterval\(\(\)=>\{tick\(\);if\(\+\+n>350\)clearInterval\(t\)\},80\);tick\(\);new MutationObserver\(\(\)=>setTimeout\(tick,0\)\)\.observe\(document\.documentElement,\{childList:true,subtree:true\}\);document\.addEventListener\('abu-bassam-auth-changed',\(\)=>setTimeout\(tick,60\)\)\}","function scheduleHardening(){clearTimeout(scheduleHardening.timer);scheduleHardening.timer=setTimeout(tick,30)}\nfunction boot(){tick();document.addEventListener('abu-bassam-auth-changed',scheduleHardening,{passive:true});document.addEventListener('abu-bassam-section-opened',scheduleHardening,{passive:true});window.addEventListener('pageshow',scheduleHardening,{passive:true});window.addEventListener('focus',scheduleHardening,{passive:true});[100,450,1200].forEach(ms=>setTimeout(tick,ms))}",'cards hardening boot')
write(p,s)

# Cards hardening fixes: keep scoped frame guards, but never use stopImmediatePropagation; remove global observer/polling.
p='web/cards-hardening-fixes-runtime.js';s=read(p).replace('stopImmediatePropagation()','stopPropagation()')
s=sub(s,r"function boot\(\)\{let n=0,t=setInterval\(\(\)=>\{tick\(\);if\(\+\+n>500\)clearInterval\(t\)\},80\);tick\(\);new MutationObserver\(\(\)=>setTimeout\(tick,0\)\)\.observe\(document\.documentElement,\{childList:true,subtree:true\}\);document\.addEventListener\('abu-bassam-auth-changed',\(\)=>setTimeout\(tick,20\)\)\}","function scheduleCardsFix(){clearTimeout(scheduleCardsFix.timer);scheduleCardsFix.timer=setTimeout(tick,30)}\nfunction boot(){tick();document.addEventListener('abu-bassam-auth-changed',scheduleCardsFix,{passive:true});document.addEventListener('abu-bassam-section-opened',scheduleCardsFix,{passive:true});window.addEventListener('pageshow',scheduleCardsFix,{passive:true});window.addEventListener('focus',scheduleCardsFix,{passive:true});[100,450,1200].forEach(ms=>setTimeout(tick,ms))}",'cards hardening fixes boot')
write(p,s)

# Document vault hardening: no global observer/24-second polling; close-lock interception is local and non-immediate.
p='web/document-vault-hardening-runtime.js';s=read(p).replace('e.stopImmediatePropagation();','')
s=sub(s,r"function boot\(\)\{let n=0,t=setInterval\(\(\)=>\{n\+\+;patchVault\(\);injectButtons\(\);lockEncryptedOnClose\(\);if\(n>240\)clearInterval\(t\)\},100\);new MutationObserver\(\(\)=>\{patchVault\(\);injectButtons\(\);lockEncryptedOnClose\(\)\}\)\.observe\(document\.documentElement,\{childList:true,subtree:true\}\)\}","function refreshVaultHardening(){patchVault();injectButtons();lockEncryptedOnClose()}\nfunction scheduleVaultHardening(){clearTimeout(scheduleVaultHardening.timer);scheduleVaultHardening.timer=setTimeout(refreshVaultHardening,30)}\nfunction boot(){refreshVaultHardening();document.addEventListener('abu-bassam-section-opened',scheduleVaultHardening,{passive:true});document.addEventListener('abu-bassam-auth-changed',scheduleVaultHardening,{passive:true});window.addEventListener('pageshow',scheduleVaultHardening,{passive:true});window.addEventListener('focus',scheduleVaultHardening,{passive:true});[120,500,1500].forEach(ms=>setTimeout(refreshVaultHardening,ms))}",'vault hardening boot')
write(p,s)

# Security extras: remove duplicate login interception, global settings observer, and global dangerous-click capture.
p='web/security-extras-runtime.js';s=read(p)
s=re.sub(r"function installLoginThrottle\(\)\{[\s\S]*?\n\}\n\nasync function changePassword",'async function changePassword',s,count=1)
s=s.replace("function inject(){render();new MutationObserver(()=>{if(document.querySelector('#abuSettingsModal .abu-settings-body')&&!$('abuSecurityExtrasSettings'))render()}).observe(document.body,{childList:true,subtree:true})}","function inject(){render()}")
s=re.sub(r"function dangerousTarget\(target\)\{[\s\S]*?function installTypographyApplyShim","function wrapDangerApi(obj,name,reason){const fn=obj?.[name];if(typeof fn!=='function'||fn.__abuDangerPinGuard)return;const wrapped=async function(...args){if(isOwner()&&!(await verifyDangerPin(reason)))return false;return fn.apply(this,args)};wrapped.__abuDangerPinGuard=true;wrapped.__abuOriginal=fn;obj[name]=wrapped}\nfunction installDangerApiGuards(){wrapDangerApi(window.AbuBassamSecurity,'removeDevice','حذف جهاز موثوق');wrapDangerApi(window.AbuBassamSettings,'resetDefaults','إعادة ضبط الإعدادات');wrapDangerApi(window.CardsStudio,'resetData','إعادة ضبط بيانات البطاقات');wrapDangerApi(window.AbuBassamOps,'clear','مسح سجل العمليات')}\nfunction installTypographyApplyShim",s,count=1)
s=s.replace("async function boot(){privacyCover();inject();guardDanger();installTypographyApplyShim();startSnapshots();const loginTimer=setInterval(()=>{if(installLoginThrottle())clearInterval(loginTimer)},200);setTimeout(()=>clearInterval(loginTimer),15000);await applyPrivacy(privacyEnabled());render()}","async function boot(){privacyCover();inject();installDangerApiGuards();installTypographyApplyShim();startSnapshots();document.addEventListener('abu-bassam-settings-opened',render,{passive:true});document.addEventListener('abu-bassam-auth-changed',()=>{render();installDangerApiGuards()},{passive:true});window.addEventListener('pageshow',()=>{render();installDangerApiGuards()},{passive:true});[150,600,1500].forEach(ms=>setTimeout(installDangerApiGuards,ms));await applyPrivacy(privacyEnabled());render()}")
s=s.replace(',guardedLogin','')
write(p,s)

# Strong permanent regression check.
p='tools/check_input_and_crash_stability.js'
write(p,r'''const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),web=path.join(root,'web'),errors=[];
const files=fs.readdirSync(web).filter(n=>/\.(js|html)$/i.test(n));
for(const f of files){const s=fs.readFileSync(path.join(web,f),'utf8');for(const token of ['touchstart','touchmove','touchend','stopImmediatePropagation'])if(s.includes(token))errors.push(`${f}: forbidden legacy/global input token ${token}`);if(/new\s+(?:window\.|win\.)?MutationObserver\([\s\S]{0,700}?\.observe\(document\.(?:documentElement|body),\{[^}]*subtree\s*:\s*true/i.test(s))errors.push(`${f}: document-wide MutationObserver`)}
const known=['admin-permissions-runtime.js','cards-hardening-runtime.js','cards-hardening-fixes-runtime.js','document-vault-hardening-runtime.js','permission-guard-runtime.js','permission-section-guards-runtime.js','security-extras-runtime.js','login-throttle-fix-runtime.js','feature-recovery-runtime.js','app-security-runtime.js'];
for(const f of known){const s=fs.readFileSync(path.join(web,f),'utf8');if(/document\.addEventListener\(['"](?:click|pointerdown|touchstart|touchmove)['"][\s\S]{0,800}?,\s*true\)/.test(s))errors.push(`${f}: document-level capture input interceptor`)}
const cards=fs.readFileSync(path.join(web,'cards-studio-runtime.js'),'utf8'),nat=fs.readFileSync(path.join(web,'national-id-runtime.js'),'utf8'),native=fs.readFileSync(path.join(root,'index.js'),'utf8');for(const [s,t,l] of [[cards,"addEventListener('pointerdown'",'cards pointerdown'],[cards,"addEventListener('pointermove'",'cards pointermove'],[nat,"addEventListener('pointerdown'",'national pointerdown'],[nat,"addEventListener('pointermove'",'national pointermove']])if(!s.includes(t))errors.push(`missing ${l}`);for(const t of ['webInstanceKey','recoverWebRenderer','onRenderProcessGone','onContentProcessDidTerminate'])if(!native.includes(t))errors.push(`native crash recovery missing ${t}`);if(/tabQuestions|tabCompressor|questionsCenter|compressorCenter/.test(nat))errors.push('national-id-runtime.js: deleted sections still referenced');if(errors.length){console.error(errors.join('\n'));process.exit(1)}console.log('Input/crash stability audit passed: legacy touch handlers and stopImmediatePropagation are absent, known global capture guards are gone, document-wide observers are rejected, card/national gestures use Pointer Events, deleted sections cannot return through national navigation, and WebView renderer recovery is wired.');
''')

# Make the stability audit part of every normal web check.
p='package.json';s=read(p)
if 'node tools/check_input_and_crash_stability.js' not in s:
    s=s.replace(' && node tools/check_no_global_flex.js',' && node tools/check_input_and_crash_stability.js && node tools/check_no_global_flex.js')
write(p,s)
print('final input runtime cleanup applied')
