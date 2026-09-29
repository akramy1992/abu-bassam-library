(()=>{
'use strict';
if(window.__ABU_SECURITY_EXTRAS_V1__)return;
window.__ABU_SECURITY_EXTRAS_V1__=true;

const $=id=>document.getElementById(id);
const PIN_KEY='abu_bassam_danger_pin_hash_v1';
const SNAPSHOT_KEY='abuBassamEmergencySnapshotV1';
const PRIVACY_KEY='abuBassamPrivacyModeV1';
const ATTEMPT_KEY='abuBassamLoginAttemptsV1';
const LOGIN_LOCK_KEY='abuBassamLoginLockUntilV1';
const BLOCK_COUNT_KEY='abuBassamLoginBlockCountV1';
const MAIN_EMAIL='akrama1992@gmail.com';
const pending=new Map();
let seq=0;
let bypassTarget=null;
let snapshotTimer=null;
let originalLogin=null;
const previousNativeResult=window.AbuBassamNativeSecurityResult;

function log(title,details=''){try{window.AbuBassamOps?.add?.({type:'settings',title,section:'الأمان',details})}catch(e){}}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function isOwner(){return window.AbuBassamSecurity?.role?.()==='owner'}
function canSecurity(){return window.AbuBassamSecurity?.can?.('security')||isOwner()}
function nativeAvailable(){return !!(window.Android&&typeof Android.security==='function')}

function nativeRequest(action,payload={}){
  if(!nativeAvailable()){
    if(action==='secureGet'||action==='secureSet'||action==='secureDelete')return Promise.reject(new Error('SECURE_STORAGE_REQUIRED'))
    if(action==='privacyMode')return Promise.resolve(false);
    return Promise.resolve(null)
  }
  return new Promise((resolve,reject)=>{
    const requestId='secx-'+Date.now()+'-'+(++seq),timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('انتهت مهلة العملية'))},12000);
    pending.set(requestId,{resolve,reject,timer});Android.security(action,requestId,payload)
  })
}
window.AbuBassamNativeSecurityResult=function(message){
  const data=typeof message==='string'?(()=>{try{return JSON.parse(message)}catch(e){return{}}})():message||{},slot=pending.get(data.requestId);
  if(slot){clearTimeout(slot.timer);pending.delete(data.requestId);if(data.ok===false)slot.reject(new Error(data.error||'تعذر تنفيذ العملية'));else slot.resolve(data.value);return}
  if(typeof previousNativeResult==='function')previousNativeResult(message)
};

async function digest(value){
  const bytes=new TextEncoder().encode(String(value)),hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')
}
async function pinHash(){return String(await nativeRequest('secureGet',{key:PIN_KEY})||'')}
function validPin(value){return /^\d{4,8}$/.test(String(value||''))}
async function setDangerPin(){
  if(!isOwner())return alert('رمز العمليات الحساسة يضبطه الجهاز الرئيسي فقط.');
  const existing=await pinHash();
  if(existing){const old=String(prompt('أدخل رمز العمليات الحساسة الحالي:')||'');if(await digest(old)!==existing)return alert('الرمز الحالي غير صحيح.')}
  const first=String(prompt('اختر رمزًا رقميًا من ٤ إلى ٨ أرقام للعمليات الحساسة:')||'');if(!validPin(first))return alert('الرمز يجب أن يتكون من ٤ إلى ٨ أرقام.');
  const second=String(prompt('أعد كتابة الرمز للتأكيد:')||'');if(first!==second)return alert('الرمزان غير متطابقين.');
  await nativeRequest('secureSet',{key:PIN_KEY,value:await digest(first)});log(existing?'تغيير رمز العمليات الحساسة':'إنشاء رمز العمليات الحساسة');alert('تم حفظ رمز العمليات الحساسة داخل التخزين الآمن لهذا الجهاز.');render()
}
async function removeDangerPin(){
  if(!isOwner())return alert('هذه العملية للجهاز الرئيسي فقط.');
  const hash=await pinHash();if(!hash)return;
  const value=String(prompt('أدخل رمز العمليات الحساسة لإلغائه:')||'');if(await digest(value)!==hash)return alert('الرمز غير صحيح.');
  await nativeRequest('secureDelete',{key:PIN_KEY});log('إلغاء رمز العمليات الحساسة');render()
}
async function verifyDangerPin(reason='هذه عملية حساسة'){
  if(!isOwner())return false;
  let hash=await pinHash();
  if(!hash){if(!confirm(`${reason}\nلم يتم إنشاء رمز مستقل للعمليات الحساسة بعد. سيتم إنشاؤه الآن قبل المتابعة.`))return false;await setDangerPin();hash=await pinHash();if(!hash)return false}
  const value=String(prompt(`${reason}\nأدخل رمز العمليات الحساسة:`)||'');if(!value)return false;
  if(await digest(value)!==hash){alert('رمز العمليات الحساسة غير صحيح.');log('فشل تحقق رمز العمليات الحساسة',reason);return false}
  return true
}

function loginLockUntil(){return Number(localStorage.getItem(LOGIN_LOCK_KEY)||0)}
function loginRemaining(){return Math.max(0,loginLockUntil()-Date.now())}
function setLoginMessage(message){const el=$('abuLoginError');if(el)el.textContent=message}
function formatSeconds(ms){const n=Math.max(1,Math.ceil(ms/1000)),digits='٠١٢٣٤٥٦٧٨٩';return String(n).replace(/\d/g,d=>digits[+d])+' ثانية'}
function clearLoginFailures(){localStorage.removeItem(ATTEMPT_KEY);localStorage.removeItem(LOGIN_LOCK_KEY);localStorage.removeItem(BLOCK_COUNT_KEY)}
function recordLoginFailure(){
  let attempts=Number(localStorage.getItem(ATTEMPT_KEY)||0)+1;
  if(attempts<5){localStorage.setItem(ATTEMPT_KEY,String(attempts));setLoginMessage(`محاولة غير ناجحة. المتبقي قبل الانتظار: ${5-attempts}`);return}
  const blocks=Number(localStorage.getItem(BLOCK_COUNT_KEY)||0)+1,duration=Math.min(300000,30000*Math.max(1,blocks));
  localStorage.setItem(ATTEMPT_KEY,'0');localStorage.setItem(BLOCK_COUNT_KEY,String(blocks));localStorage.setItem(LOGIN_LOCK_KEY,String(Date.now()+duration));
  setLoginMessage(`محاولات كثيرة. انتظر ${formatSeconds(duration)} ثم حاول مرة أخرى.`);log('حظر مؤقت لمحاولات الدخول',`${Math.round(duration/1000)} ثانية`)
}
async function guardedLogin(){
  const remaining=loginRemaining();if(remaining>0){setLoginMessage(`الدخول متوقف مؤقتًا. حاول بعد ${formatSeconds(remaining)}.`);return}
  if(!originalLogin)originalLogin=window.AbuBassamSecurity?.login;if(typeof originalLogin!=='function')return;
  const gate=$('abuSecurityGate');await originalLogin();
  if(gate?.classList.contains('hide'))clearLoginFailures();else{const msg=String($('abuLoginError')?.textContent||'');if(msg&&!/جاري|الإنترنت|خدمة الدخول غير جاهزة/i.test(msg))recordLoginFailure()}
}
function installLoginThrottle(){
  if(!window.AbuBassamSecurity?.login||!$('abuLoginBtn'))return false;
  if($('abuLoginBtn').dataset.throttled==='1')return true;
  originalLogin=window.AbuBassamSecurity.login;$('abuLoginBtn').onclick=guardedLogin;$('abuLoginBtn').dataset.throttled='1';
  const pass=$('abuLoginPass');if(pass)pass.addEventListener('keydown',event=>{if(event.key!=='Enter')return;event.preventDefault();event.stopImmediatePropagation();guardedLogin()},true);
  const remaining=loginRemaining();if(remaining>0)setLoginMessage(`الدخول متوقف مؤقتًا. حاول بعد ${formatSeconds(remaining)}.`);
  return true
}

async function changePassword(){
  if(!isOwner())return alert('تغيير كلمة مرور الحساب متاح للجهاز الرئيسي فقط.');
  const c=window.AbuBassamCloud?.client;if(!c)return alert('خدمة الحساب غير جاهزة.');
  const current=String(prompt('أدخل كلمة المرور الحالية لتأكيد الهوية:')||'');if(!current)return;
  const auth=await c.auth.signInWithPassword({email:MAIN_EMAIL,password:current});if(auth.error)return alert('كلمة المرور الحالية غير صحيحة.');
  const next=String(prompt('أدخل كلمة المرور الجديدة (١٠ محارف على الأقل):')||'');if(next.length<10)return alert('كلمة المرور الجديدة قصيرة. استخدم ١٠ محارف على الأقل.');
  const repeat=String(prompt('أعد كتابة كلمة المرور الجديدة:')||'');if(next!==repeat)return alert('كلمتا المرور غير متطابقتين.');
  const result=await c.auth.updateUser({password:next});if(result.error)return alert('تعذر تغيير كلمة المرور: '+result.error.message);
  log('تغيير كلمة مرور الحساب');alert('تم تغيير كلمة مرور الحساب بنجاح. لن تُحفظ كلمة المرور داخل التطبيق أو المستودع.')
}
function logout(){window.AbuBassamSecurity?.logout?.()}

function safeSnapshot(){
  const settings={};
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i)||'';
    if(key===SNAPSHOT_KEY||/pass|password|token|secret|session|credential|auth|trust/i.test(key))continue;
    const value=localStorage.getItem(key);if(value==null||value.length>250000)continue;settings[key]=value
  }
  return{format:'AbuBassamEmergencySnapshot',version:1,createdAt:new Date().toISOString(),settings}
}
function createSnapshot(manual=true){
  try{const snapshot=safeSnapshot();localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(snapshot));if(manual){log('إنشاء نقطة أمان',snapshot.createdAt);alert('تم إنشاء نقطة أمان محلية للإعدادات والتصاميم. المستندات الكبيرة في الأرشيف لا تُنسخ داخل هذه النقطة.')}render();return snapshot}catch(e){if(manual)alert('تعذر إنشاء نقطة الأمان: '+e.message);return null}
}
async function restoreSnapshot(){
  if(!isOwner())return alert('استعادة نقطة الأمان متاحة للجهاز الرئيسي فقط.');
  const raw=localStorage.getItem(SNAPSHOT_KEY);if(!raw)return alert('لا توجد نقطة أمان محفوظة.');
  if(!(await verifyDangerPin('استعادة آخر نقطة أمان')))return;
  let snapshot;try{snapshot=JSON.parse(raw)}catch(e){return alert('نقطة الأمان تالفة.')}
  if(!snapshot?.settings||!confirm(`استعادة نقطة الأمان المحفوظة بتاريخ ${new Date(snapshot.createdAt).toLocaleString('ar-IQ')}؟\nستُستبدل إعدادات وتصاميم التخزين المحلي فقط.`))return;
  Object.entries(snapshot.settings).forEach(([key,value])=>{if(!/pass|password|token|secret|session|credential|auth|trust/i.test(key))localStorage.setItem(key,String(value))});
  log('استعادة نقطة أمان',snapshot.createdAt||'');alert('تمت الاستعادة. سيعاد فتح الواجهة لتطبيق الإعدادات.');location.reload()
}
function snapshotInfo(){try{const data=JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'null');return data?.createdAt?new Date(data.createdAt).toLocaleString('ar-IQ'):'لا توجد نقطة أمان'}catch(e){return'لا توجد نقطة أمان'}}

function privacyCover(){let cover=$('abuPrivacyCover');if(cover)return cover;cover=document.createElement('div');cover.id='abuPrivacyCover';cover.style.cssText='position:fixed;z-index:49999;inset:0;background:#10242e;display:none;align-items:center;justify-content:center;color:#fff;text-align:center;font:900 18px Tahoma;';cover.innerHTML='<div><img src="abu_bassam_icon.webp" style="width:76px;height:76px;border-radius:18px;display:block;margin:0 auto 12px"><div>مكتبة أبو بسام</div><small style="font-size:10px;opacity:.8">المحتوى مخفي لحماية الخصوصية</small></div>';document.body.appendChild(cover);return cover}
async function applyPrivacy(enabled){localStorage.setItem(PRIVACY_KEY,enabled?'1':'0');privacyCover();try{await nativeRequest('privacyMode',{enabled:!!enabled})}catch(e){if(enabled)console.warn('Native privacy mode unavailable',e)}if(document.visibilityState==='hidden'&&enabled)privacyCover().style.display='flex';else privacyCover().style.display='none';log('وضع الخصوصية العالية',enabled?'مفعّل':'متوقف');render()}
function privacyEnabled(){return localStorage.getItem(PRIVACY_KEY)==='1'}
function visibilityPrivacy(){const cover=privacyCover();if(document.visibilityState==='hidden'&&privacyEnabled())cover.style.display='flex';else setTimeout(()=>cover.style.display='none',60)}

function extrasHtml(){return `<section id="abuSecurityExtrasSettings" class="abu-setting-card" data-settings-keywords="خصوصية نقطة أمان استعادة رمز حساس حماية recent apps لقطة شاشة كلمة مرور خروج"><div class="abu-setting-title">🛡️ حماية إضافية واستعادة طوارئ</div><label class="abu-security-line"><span>خصوصية عالية ومنع لقطات الشاشة/المعاينة الحديثة</span><input id="abuPrivacyMode" type="checkbox" onchange="AbuBassamSecurityExtras.privacy(this.checked)"></label><div class="abu-security-setting-grid"><button onclick="AbuBassamSecurityExtras.setPin()">🔢 إنشاء/تغيير رمز العمليات الحساسة</button><button onclick="AbuBassamSecurityExtras.removePin()">إلغاء الرمز</button><button onclick="AbuBassamSecurityExtras.changePassword()">🔑 تغيير كلمة مرور الحساب</button><button onclick="AbuBassamSecurityExtras.logout()">⇥ تسجيل الخروج</button><button onclick="AbuBassamSecurityExtras.snapshot()">🛟 نقطة أمان الآن</button><button onclick="AbuBassamSecurityExtras.restore()">♻️ استعادة نقطة الأمان</button></div><div id="abuSnapshotInfo" class="abu-setting-note" style="margin-top:7px">آخر نقطة أمان: ${esc(snapshotInfo())}</div><div class="abu-setting-note">يُطلب الرمز المستقل قبل العمليات الخطرة مثل مسح السجل، إعادة ضبط الإعدادات، حذف جهاز موثوق أو استعادة نقطة أمان. لا تُخزن كلمات المرور داخل نقطة الأمان.</div></section>`}
async function render(){
  const body=document.querySelector('#abuSettingsModal .abu-settings-body');if(!body)return;
  let old=$('abuSecurityExtrasSettings');if(old)old.outerHTML=extrasHtml();else{const security=$('abuSecuritySettings');if(security)security.insertAdjacentHTML('afterend',extrasHtml());else body.insertAdjacentHTML('afterbegin',extrasHtml())}
  const privacy=$('abuPrivacyMode');if(privacy)privacy.checked=privacyEnabled();const info=$('abuSnapshotInfo');if(info)info.textContent='آخر نقطة أمان: '+snapshotInfo();
  const owner=isOwner();document.querySelectorAll('#abuSecurityExtrasSettings button:not([onclick*="logout"])').forEach(button=>{if(!owner){button.disabled=true;button.style.opacity='.45'}})
}
function inject(){render();new MutationObserver(()=>{if(document.querySelector('#abuSettingsModal .abu-settings-body')&&!$('abuSecurityExtrasSettings'))render()}).observe(document.body,{childList:true,subtree:true})}

function dangerousTarget(target){
  if(!target)return'';const onclick=String(target.getAttribute?.('onclick')||'');
  if(target.id==='opsClear'||/resetDefaults|resetData|removeDevice\(/.test(onclick))return target.id==='opsClear'?'مسح سجل العمليات':/removeDevice/.test(onclick)?'حذف جهاز موثوق':'إعادة ضبط بيانات أو إعدادات';
  return''
}
function guardDanger(){document.addEventListener('click',async event=>{const target=event.target?.closest?.('button,[role="button"]');if(!target||target===bypassTarget)return;const reason=dangerousTarget(target);if(!reason)return;if(!isOwner())return;event.preventDefault();event.stopImmediatePropagation();if(await verifyDangerPin(reason)){bypassTarget=target;try{target.click()}finally{setTimeout(()=>{bypassTarget=null},0)}}},true)}

function installTypographyApplyShim(){
  const timer=setInterval(()=>{const t=window.AbuBassamTypography;if(!t)return;if(typeof t.applyApp!=='function')t.applyApp=()=>{let state={};try{state=JSON.parse(localStorage.getItem('abuBassamTypographyV5')||'{}')}catch(e){}if(state.appFont)t.global('appFont',state.appFont);if(state.appScale)t.global('appScale',state.appScale)};clearInterval(timer)},400);
  setTimeout(()=>clearInterval(timer),15000)
}
function startSnapshots(){createSnapshot(false);clearInterval(snapshotTimer);snapshotTimer=setInterval(()=>{if(document.visibilityState!=='hidden')createSnapshot(false)},10*60*1000);window.addEventListener('pagehide',()=>createSnapshot(false));document.addEventListener('visibilitychange',()=>{visibilityPrivacy();if(document.visibilityState==='hidden')createSnapshot(false)})}

async function boot(){privacyCover();inject();guardDanger();installTypographyApplyShim();startSnapshots();const loginTimer=setInterval(()=>{if(installLoginThrottle())clearInterval(loginTimer)},200);setTimeout(()=>clearInterval(loginTimer),15000);await applyPrivacy(privacyEnabled());render()}
window.AbuBassamSecurityExtras={setPin:setDangerPin,removePin:removeDangerPin,verifyDangerPin,changePassword,logout,snapshot:()=>createSnapshot(true),restore:restoreSnapshot,privacy:applyPrivacy,render,guardedLogin};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
