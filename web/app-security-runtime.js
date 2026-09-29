(()=>{
'use strict';
if(window.__ABU_APP_SECURITY_V1__)return;
window.__ABU_APP_SECURITY_V1__=true;

const $=id=>document.getElementById(id);
const MAIN_USERNAME='akrama1992';
const MAIN_EMAIL='akrama1992@gmail.com';
const APP_VERSION='6.0.0';
const MAX_DEVICES=5;
const DEVICE_ID_KEY='abuBassamLockedDeviceIdV3';
const DEVICE_NAME_KEY='abuBassamLockedDeviceNameV3';
const TRUST_KEY='abuBassamSecurityTrustV1';
const LOCK_MINUTES_KEY='abuBassamSecurityLockMinutesV1';
const APPEARANCE_SYNC_KEY='abuBassamAppearanceSyncV1';
const PREVIOUS_THEME_KEY='abuBassamPreviousThemeV1';
const BIO_KEY='abu_bassam_biometric_enabled_v1';
const SECRET_KEY='abu_bassam_device_secret_v1';
const OFFLINE_GRACE_MS=72*60*60*1000;
const SECONDARY_DEFAULT={edit:true,print:true,export:true,appearance:true,sync:true,security:false,devices:false,reset:false};
const OWNER_PERMISSIONS={edit:true,print:true,export:true,appearance:true,sync:true,security:true,devices:true,reset:true};
const pending=new Map();
let requestSeq=0;
let currentDevice=null;
let deviceSecret='';
let unlocked=false;
let busy=false;
let lastBackgroundAt=0;
let exitArmedAt=0;
let appearanceStamp='';
let deviceInfo={name:'Android',model:'Android',os:'Android',androidVersion:'',appVersion:APP_VERSION};

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function clone(v){return JSON.parse(JSON.stringify(v))}
function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')||clone(fallback)}catch(e){return clone(fallback)}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function log(title,details=''){try{window.AbuBassamOps?.add?.({type:'settings',title,section:'الأمان',details})}catch(e){}}
function cloud(){return window.AbuBassamCloud||null}
function client(){return cloud()?.client||null}
function identity(){return window.AbuBassamDevices?.ensure?.()||{id:localStorage.getItem(DEVICE_ID_KEY)||'',name:localStorage.getItem(DEVICE_NAME_KEY)||''}}
function roleLabel(){return currentDevice?.role==='owner'?'رئيسي':'فرعي'}
function permissions(){return currentDevice?.role==='owner'?OWNER_PERMISSIONS:Object.assign({},SECONDARY_DEFAULT,currentDevice?.permissions||{})}
function can(name){return !!permissions()[name]}
function nativeAvailable(){return !!(window.Android&&typeof Android.security==='function')}

function nativeRequest(action,payload={}){
  if(!nativeAvailable()){
    if(action==='secureGet')return Promise.resolve(localStorage.getItem('__dev_secure_'+payload.key)||'');
    if(action==='secureSet'){localStorage.setItem('__dev_secure_'+payload.key,String(payload.value||''));return Promise.resolve(true)}
    if(action==='secureDelete'){localStorage.removeItem('__dev_secure_'+payload.key);return Promise.resolve(true)}
    if(action==='deviceInfo')return Promise.resolve({name:'متصفح الاختبار',model:'Browser',os:'web',androidVersion:'',appVersion:APP_VERSION});
    if(action==='biometricStatus')return Promise.resolve({available:false,enrolled:false,types:[]});
    if(action==='biometricAuth')return Promise.resolve({success:false,error:'native_unavailable'});
    return Promise.resolve(null);
  }
  return new Promise((resolve,reject)=>{
    const requestId='sec-'+Date.now()+'-'+(++requestSeq);
    const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('انتهت مهلة الاتصال بالنظام'))},15000);
    pending.set(requestId,{resolve,reject,timer});
    Android.security(action,requestId,payload);
  })
}
window.AbuBassamNativeSecurityResult=function(message){
  const data=typeof message==='string'?(()=>{try{return JSON.parse(message)}catch(e){return{}}})():message||{};
  const slot=pending.get(data.requestId);if(!slot)return;
  clearTimeout(slot.timer);pending.delete(data.requestId);
  if(data.ok===false)slot.reject(new Error(data.error||'تعذر تنفيذ العملية'));else slot.resolve(data.value);
};
window.AbuBassamNativeAppState=function(payload){
  const state=payload?.state||payload;
  if(state==='background'||state==='inactive'){lastBackgroundAt=Number(payload?.at)||Date.now();return}
  if(state==='active'&&lastBackgroundAt){const elapsed=Date.now()-lastBackgroundAt;lastBackgroundAt=0;const mins=Number(localStorage.getItem(LOCK_MINUTES_KEY)||5);if(unlocked&&mins>=0&&elapsed>=mins*60000)lock('انتهت مهلة القفل التلقائي')}
};

function randomSecret(){
  const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);let raw='';bytes.forEach(b=>raw+=String.fromCharCode(b));return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}
async function getSecret(){
  if(deviceSecret)return deviceSecret;
  deviceSecret=String(await nativeRequest('secureGet',{key:SECRET_KEY})||'');
  if(!deviceSecret){deviceSecret=randomSecret();await nativeRequest('secureSet',{key:SECRET_KEY,value:deviceSecret})}
  return deviceSecret
}
async function getBiometricEnabled(){return String(await nativeRequest('secureGet',{key:BIO_KEY})||'')==='1'}
async function setBiometricEnabled(value){if(value)await nativeRequest('secureSet',{key:BIO_KEY,value:'1'});else await nativeRequest('secureDelete',{key:BIO_KEY});renderSecurityCard()}
async function biometricStatus(){try{return await nativeRequest('biometricStatus')}catch(e){return{available:false,enrolled:false,types:[],error:e.message}}}
async function biometricAuth(reason='فتح مكتبة أبو بسام'){try{return await nativeRequest('biometricAuth',{reason})}catch(e){return{success:false,error:e.message}}}

function addCss(){if($('abuSecurityStyle'))return;const s=document.createElement('style');s.id='abuSecurityStyle';s.textContent=`
.abu-security-gate{position:fixed;z-index:40000;inset:0;background:linear-gradient(145deg,#10242e,#0b544e 60%,#3f2a1f);display:flex;align-items:center;justify-content:center;padding:14px;direction:rtl}.abu-security-gate.hide{display:none}.abu-security-card{width:min(440px,100%);max-height:94vh;overflow:auto;background:#fffaf3;color:#2b211d;border-radius:24px;padding:18px;box-shadow:0 22px 70px #000a;text-align:center}.abu-security-card img{width:72px;height:72px;border-radius:18px}.abu-security-card h2{font-size:19px;margin:8px 0 3px}.abu-security-card p{font-size:9px;color:#75675e;line-height:1.8}.abu-security-card input,.abu-security-card select{width:100%;min-height:46px;border:1px solid #c8b9ad;border-radius:11px;background:#fff;color:#222;padding:9px;margin:4px 0;text-align:center}.abu-security-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.abu-security-actions button{min-height:44px;border:0;border-radius:11px;background:#087f72;color:#fff;font-weight:900}.abu-security-actions .secondary{background:#6b5648}.abu-security-actions .wide{grid-column:1/-1}.abu-security-error{min-height:20px;color:#a62e3b;font-size:9px;margin-top:6px;line-height:1.6}.abu-security-device{font-size:8px;color:#087f72;font-weight:900;margin-top:5px}.abu-control-dock{position:fixed;z-index:30000;right:7px;bottom:8px;display:grid;grid-template-columns:repeat(4,40px);gap:5px;background:#0f172ad9;padding:6px;border-radius:15px;box-shadow:0 8px 22px #0006;direction:ltr}.abu-control-dock button{width:40px;height:40px;border:0;border-radius:10px;background:#ffffff17;color:#fff;font-size:18px;font-weight:900}.abu-control-dock button:last-child{background:#9f2735}.abu-control-toast{position:fixed;z-index:41000;left:50%;bottom:70px;transform:translateX(-50%) translateY(20px);opacity:0;transition:.2s;background:#111e;color:#fff;padding:9px 15px;border-radius:20px;font-size:10px;white-space:nowrap;pointer-events:none}.abu-control-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}body.abu-focus-mode .hero,body.abu-focus-mode #abuMainTabs,body.abu-focus-mode>.abu-programmer-stamp{display:none!important}body.abu-focus-mode .app{max-width:none!important}.abu-security-setting-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.abu-security-setting-grid button,.abu-security-setting-grid select{min-height:41px;border:0;border-radius:10px;background:#087f72;color:#fff;font-size:8px;font-weight:900;padding:5px}.abu-security-setting-grid select{background:#fff;color:#222;border:1px solid #b8957655}.abu-security-line{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px;border-radius:10px;background:#087f720b;margin:6px 0;font-size:9px;font-weight:900}.abu-security-line input{width:auto}.abu-device-modal{position:fixed;z-index:39000;inset:0;background:#000c;display:none;align-items:center;justify-content:center;padding:10px}.abu-device-modal.show{display:flex}.abu-device-dialog{width:min(650px,100%);max-height:94vh;overflow:auto;background:#fffaf3;color:#241f1b;border-radius:20px;padding:12px}.abu-device-head{display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fffaf3;padding-bottom:8px}.abu-device-head button{width:34px;height:34px;border:0;border-radius:50%;font-size:20px}.abu-device-row{border:1px solid #d7c8bc;border-radius:13px;padding:9px;margin:7px 0;background:#fff}.abu-device-row.owner{border-color:#b98b36;background:#fff9e8}.abu-device-row.off{opacity:.58}.abu-device-row b{font-size:10px}.abu-device-row small{display:block;color:#766b64;font-size:8px;line-height:1.6}.abu-device-row-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.abu-device-row-actions button{border:0;border-radius:8px;background:#087f72;color:#fff;padding:7px 9px;font-size:8px;font-weight:900}.abu-device-row-actions .danger{background:#a62d3a}.abu-device-row-actions .alt{background:#6b5648}.abu-perm-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.abu-perm-grid label{display:flex;align-items:center;justify-content:space-between;background:#f0ebe5;border-radius:8px;padding:7px;font-size:8px;font-weight:900}.abu-security-badge{display:inline-block;padding:3px 8px;border-radius:20px;background:#e7f4f1;color:#087f72;font-size:8px;font-weight:900}.abu-security-badge.owner{background:#fff0bd;color:#7d5614}@media(max-width:400px){.abu-control-dock{grid-template-columns:repeat(4,36px)}.abu-control-dock button{width:36px;height:36px}.abu-security-actions,.abu-security-setting-grid{grid-template-columns:1fr}.abu-security-actions .wide{grid-column:auto}}@media print{.abu-control-dock,.abu-control-toast,.abu-security-gate,.abu-device-modal{display:none!important}}
`;document.head.appendChild(s)}

function gateHtml(){return `<div id="abuSecurityGate" class="abu-security-gate"><div class="abu-security-card"><img src="abu_bassam_icon.webp" alt="مكتبة أبو بسام"><h2>🔐 تسجيل الدخول</h2><p>دخول آمن إلى مكتبة أبو بسام. كلمة المرور لا تُحفظ داخل ملفات المشروع أو سجل العمليات.</p><input id="abuLoginUser" autocomplete="username" value="${MAIN_USERNAME}" placeholder="اسم المستخدم"><input id="abuLoginPass" type="password" autocomplete="current-password" placeholder="كلمة المرور"><div class="abu-security-actions"><button id="abuLoginBtn">دخول</button><button id="abuBioLoginBtn" class="secondary">بصمة</button><button id="abuOfflineBtn" class="wide secondary" style="display:none">فتح موثوق دون إنترنت</button></div><div id="abuLoginDevice" class="abu-security-device"></div><div id="abuLoginError" class="abu-security-error"></div></div></div>`}
function controlHtml(){return `<div id="abuControlDock" class="abu-control-dock"><button type="button" title="رجوع" onclick="AbuBassamSecurity.back()">←</button><button type="button" title="الرئيسية" onclick="AbuBassamSecurity.home()">⌂</button><button type="button" title="تكبير مساحة العمل" onclick="AbuBassamSecurity.focus()">⛶</button><button type="button" title="الخروج" onclick="AbuBassamSecurity.exit()">×</button></div><div id="abuControlToast" class="abu-control-toast"></div>`}
function deviceModalHtml(){return `<div id="abuDeviceModal" class="abu-device-modal"><div class="abu-device-dialog"><div class="abu-device-head"><div><b>📱 الأجهزة الموثوقة</b><div style="font-size:8px;color:#756b65">الحد الأقصى ${MAX_DEVICES} أجهزة • الرئيسي يتحكم بالفرعية</div></div><button onclick="AbuBassamSecurity.closeDevices()">×</button></div><div id="abuDeviceList"></div></div></div>`}
function buildUi(){addCss();document.body.insertAdjacentHTML('beforeend',gateHtml()+controlHtml()+deviceModalHtml());$('abuLoginBtn').onclick=login;$('abuBioLoginBtn').onclick=unlockWithBiometric;$('abuOfflineBtn').onclick=offlineUnlock;$('abuLoginPass').addEventListener('keydown',e=>{if(e.key==='Enter')login()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')lastBackgroundAt=Date.now();else if(lastBackgroundAt){window.AbuBassamNativeAppState({state:'active',at:Date.now()})}})}

function setError(message){if($('abuLoginError'))$('abuLoginError').textContent=message||''}
function toast(message){const el=$('abuControlToast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}
function showGate(message=''){unlocked=false;$('abuSecurityGate')?.classList.remove('hide');setError(message)}
function hideGate(){unlocked=true;$('abuSecurityGate')?.classList.add('hide');setError('');log('فتح التطبيق',`${roleLabel()} • ${currentDevice?.device_name||''}`)}
function localTrust(){return readJson(TRUST_KEY,{})}
function saveTrust(device){writeJson(TRUST_KEY,{device_id:device.device_id,device_name:device.device_name,role:device.role,active:device.active,permissions:device.permissions,verifiedAt:Date.now()})}
function offlineAllowed(){const trust=localTrust();return trust.device_id===identity().id&&trust.active!==false&&Date.now()-Number(trust.verifiedAt||0)<=OFFLINE_GRACE_MS}

async function fetchDeviceInfo(){try{deviceInfo=Object.assign(deviceInfo,await nativeRequest('deviceInfo')||{})}catch(e){}if($('abuLoginDevice'))$('abuLoginDevice').textContent=`هذا الجهاز: ${deviceInfo.model||deviceInfo.name||'Android'}`;return deviceInfo}
async function ensureDeviceName(){let id=identity(),name=String(localStorage.getItem(DEVICE_NAME_KEY)||'').trim();if(!name||/^(أ?كرم|akram)$/i.test(name)){const suggested=deviceInfo.model||deviceInfo.name||'هاتف المكتبة';name=String(prompt('اكتب اسم هذا الهاتف ليظهر ضمن الأجهزة الموثوقة:',suggested)||'').trim()||suggested;localStorage.setItem(DEVICE_NAME_KEY,name)}return{name,id:id.id}}
function normalizeDevice(data){if(!data)return null;return Array.isArray(data)?data[0]||null:data}
async function registerDevice(){
  const c=client();if(!c)throw new Error('خدمة الدخول غير جاهزة');
  const secret=await getSecret(),named=await ensureDeviceName();
  const {data,error}=await c.rpc('abu_bassam_register_device',{p_device_id:named.id,p_secret:secret,p_device_name:named.name,p_model:deviceInfo.model||deviceInfo.name||'',p_platform:deviceInfo.os||'Android',p_app_version:APP_VERSION});
  if(error)throw error;currentDevice=normalizeDevice(data);if(!currentDevice)throw new Error('تعذر تسجيل الجهاز');saveTrust(currentDevice);localStorage.setItem(DEVICE_NAME_KEY,currentDevice.device_name||named.name);renderSecurityCard();return currentDevice
}
async function touchDevice(){if(!cloud()?.isConnected?.()||!navigator.onLine)return;try{const secret=await getSecret(),id=identity(),name=localStorage.getItem(DEVICE_NAME_KEY)||deviceInfo.model||'هاتف';const {data,error}=await client().rpc('abu_bassam_touch_device',{p_device_id:id.id,p_secret:secret,p_device_name:name,p_model:deviceInfo.model||'',p_platform:deviceInfo.os||'Android',p_app_version:APP_VERSION});if(error)throw error;currentDevice=normalizeDevice(data);saveTrust(currentDevice);if(currentDevice.active===false)lock('تم إيقاف هذا الجهاز من الحساب الرئيسي')}catch(e){if(/DEVICE_NOT_AUTHORIZED|DEVICE_DISABLED/i.test(String(e.message||e)))lock('هذا الجهاز غير مصرح له بالدخول') }}

function authError(error){const m=String(error?.message||error||'تعذر تسجيل الدخول');if(/invalid login credentials/i.test(m))return 'اسم المستخدم أو كلمة المرور غير صحيحة.';if(/DEVICE_LIMIT_REACHED/i.test(m))return 'وصل الحساب إلى الحد الأقصى: ٥ أجهزة. احذف جهازًا فرعيًا من الجهاز الرئيسي أولاً.';if(/DEVICE_DISABLED/i.test(m))return 'هذا الجهاز موقوف من الجهاز الرئيسي.';if(/network|fetch/i.test(m))return 'تعذر الاتصال بالإنترنت.';return m.replace(/^.*?error:\s*/i,'')}
async function login(){
  if(busy)return;const username=String($('abuLoginUser')?.value||'').trim(),password=String($('abuLoginPass')?.value||'');if(username!==MAIN_USERNAME)return setError('اسم المستخدم غير صحيح.');if(password.length<8)return setError('أدخل كلمة المرور كاملة.');if(!client())return setError('خدمة الدخول غير جاهزة.');busy=true;setError('جاري التحقق...');
  try{const result=await client().auth.signInWithPassword({email:MAIN_EMAIL,password});if(result.error)throw result.error;if($('abuLoginPass'))$('abuLoginPass').value='';await fetchDeviceInfo();await registerDevice();hideGate();await pullAppearanceIfNeeded();log('تسجيل دخول ناجح',`${MAIN_USERNAME} • ${roleLabel()}`)}catch(e){setError(authError(e));log('فشل تسجيل الدخول',authError(e))}finally{busy=false}
}
async function unlockWithBiometric(){
  if(busy)return;busy=true;setError('جاري التحقق من البصمة...');
  try{const enabled=await getBiometricEnabled();if(!enabled)throw new Error('فعّل تسجيل الدخول بالبصمة أولاً من الإعدادات.');const status=await biometricStatus();if(!status.available||!status.enrolled)throw new Error('لا توجد بصمة مفعلة في إعدادات هذا الهاتف.');const result=await biometricAuth('افتح مكتبة أبو بسام');if(!result?.success)throw new Error(result?.error==='user_cancel'?'تم إلغاء البصمة.':'لم تنجح المصادقة بالبصمة.');if(cloud()?.isConnected?.()&&navigator.onLine){await fetchDeviceInfo();await registerDevice()}else if(offlineAllowed()){const trust=localTrust();currentDevice={device_id:trust.device_id,device_name:trust.device_name,role:trust.role,active:trust.active,permissions:trust.permissions}}else throw new Error('يلزم اتصال بالإنترنت للتحقق من هذا الجهاز.');hideGate();await pullAppearanceIfNeeded();log('فتح بالبصمة',currentDevice?.device_name||'') }catch(e){setError(authError(e))}finally{busy=false}
}
function offlineUnlock(){if(!offlineAllowed())return setError('انتهت صلاحية الفتح دون إنترنت. اتصل بالإنترنت وسجّل الدخول.');const trust=localTrust();currentDevice={device_id:trust.device_id,device_name:trust.device_name,role:trust.role,active:trust.active,permissions:trust.permissions};hideGate();log('فتح موثوق دون إنترنت',currentDevice.device_name||'')}
function lock(reason='تم قفل التطبيق'){showGate(reason);try{window.getSelection()?.removeAllRanges()}catch(e){} }

async function toggleBiometric(checked){
  const box=$('abuSecurityBio');if(box)box.disabled=true;
  try{if(checked){const status=await biometricStatus();if(!status.available)throw new Error('المصادقة الحيوية غير مدعومة على هذا الجهاز.');if(!status.enrolled)throw new Error('أضف بصمة من إعدادات Android أولاً.');const password=String(prompt('لتفعيل البصمة أدخل كلمة مرور الحساب مرة واحدة. لن يتم حفظها:')||'');if(!password)throw new Error('لم يتم إدخال كلمة المرور.');const result=await client().auth.signInWithPassword({email:MAIN_EMAIL,password});if(result.error)throw result.error;const auth=await biometricAuth('تأكيد تفعيل الدخول بالبصمة');if(!auth?.success)throw new Error('لم يتم تأكيد البصمة.');await setBiometricEnabled(true);log('تفعيل البصمة',currentDevice?.device_name||'');toast('تم تفعيل البصمة ✓')}else{await setBiometricEnabled(false);log('إلغاء البصمة',currentDevice?.device_name||'');toast('تم إلغاء البصمة')}}catch(e){if(box)box.checked=!checked;alert(authError(e))}finally{if(box)box.disabled=false;renderSecurityCard()}
}
function setLockMinutes(value){localStorage.setItem(LOCK_MINUTES_KEY,String(value));log('تغيير القفل التلقائي',String(value));toast('تم حفظ مدة القفل')}

async function deviceRows(){if(!client()||!cloud()?.isConnected?.())return[];const {data,error}=await client().from('abu_bassam_devices').select('device_id,device_name,model,platform,role,active,permissions,first_seen,last_seen,app_version').order('first_seen',{ascending:true});if(error)throw error;return data||[]}
async function openDevices(){if(!can('devices'))return alert('إدارة الأجهزة متاحة للحساب الرئيسي فقط.');$('abuDeviceModal')?.classList.add('show');await renderDevices()}
function closeDevices(){$('abuDeviceModal')?.classList.remove('show')}
function permLabel(key){return{edit:'تعديل المحتوى',print:'الطباعة',export:'الحفظ والتصدير',appearance:'الثيمات والخطوط',sync:'المزامنة',security:'إعدادات الأمان',devices:'إدارة الأجهزة',reset:'إعادة الضبط'}[key]||key}
async function renderDevices(){const box=$('abuDeviceList');if(!box)return;box.innerHTML='<div style="padding:20px;text-align:center">جاري تحميل الأجهزة...</div>';try{const rows=await deviceRows();box.innerHTML=rows.map(row=>`<div class="abu-device-row ${row.role==='owner'?'owner':''} ${row.active?'':'off'}"><b>${row.role==='owner'?'👑':'📱'} ${esc(row.device_name||row.model||'جهاز')}</b> <span class="abu-security-badge ${row.role==='owner'?'owner':''}">${row.role==='owner'?'رئيسي':'فرعي'}</span><small>${esc(row.model||row.platform||'Android')} • التطبيق ${esc(row.app_version||'—')}<br>آخر اتصال: ${new Date(row.last_seen||row.first_seen).toLocaleString('ar-IQ')} • ${row.active?'نشط':'موقوف'}</small>${row.role==='owner'?'<div style="font-size:8px;margin-top:6px;color:#7d5614">الجهاز الرئيسي لا يمكن تعطيله أو حذفه.</div>':`<div class="abu-device-row-actions"><button onclick="AbuBassamSecurity.renameDevice('${esc(row.device_id)}','${esc(row.device_name||'')}')">تسمية</button><button class="alt" onclick="AbuBassamSecurity.toggleDevice('${esc(row.device_id)}',${row.active?'false':'true'})">${row.active?'إيقاف':'تفعيل'}</button><button onclick="AbuBassamSecurity.permissionsDevice('${esc(row.device_id)}')">الصلاحيات</button><button class="danger" onclick="AbuBassamSecurity.removeDevice('${esc(row.device_id)}')">حذف</button></div>`}</div>`).join('')||'<div style="padding:20px;text-align:center">لا توجد أجهزة.</div>';if(rows.length<MAX_DEVICES)box.insertAdjacentHTML('beforeend',`<div style="text-align:center;font-size:8px;color:#087f72;padding:8px">المتاح: ${MAX_DEVICES-rows.length} جهاز/أجهزة إضافية</div>`)}catch(e){box.textContent=authError(e)}}
async function manageDevice(target,patch){if(!can('devices'))throw new Error('هذه العملية للحساب الرئيسي فقط');const secret=await getSecret(),actor=identity().id;const args={p_actor_device_id:actor,p_actor_secret:secret,p_target_device_id:target,p_device_name:patch.name===undefined?null:patch.name,p_active:patch.active===undefined?null:patch.active,p_permissions:patch.permissions===undefined?null:patch.permissions};const {data,error}=await client().rpc('abu_bassam_manage_device',args);if(error)throw error;log('تعديل جهاز',target);return normalizeDevice(data)}
async function renameDevice(id,old){const name=String(prompt('اسم الهاتف:',old)||'').trim();if(!name)return;try{await manageDevice(id,{name});await renderDevices()}catch(e){alert(authError(e))}}
async function toggleDevice(id,active){if(!confirm(active?'إعادة تفعيل هذا الجهاز؟':'إيقاف هذا الجهاز؟ لن يتمكن من الدخول بعد التحقق التالي.'))return;try{await manageDevice(id,{active});await renderDevices()}catch(e){alert(authError(e))}}
async function permissionsDevice(id){try{const rows=await deviceRows(),row=rows.find(x=>x.device_id===id);if(!row)return;const current=Object.assign({},SECONDARY_DEFAULT,row.permissions||{});const wrap=document.createElement('div');wrap.innerHTML=`<div class="abu-perm-grid">${Object.keys(SECONDARY_DEFAULT).map(k=>`<label>${permLabel(k)}<input type="checkbox" data-p="${k}" ${current[k]?'checked':''}></label>`).join('')}</div>`;const ok=confirm('ستفتح إعدادات الصلاحيات داخل الصفحة. اضغط موافق ثم عدّل الخيارات واضغط حفظ.');if(!ok)return;const modal=$('abuDeviceModal'),box=$('abuDeviceList');box.innerHTML=`<div class="abu-device-row"><b>صلاحيات ${esc(row.device_name||'الجهاز')}</b>${wrap.innerHTML}<div class="abu-device-row-actions"><button id="abuSavePerms">حفظ الصلاحيات</button><button class="alt" onclick="AbuBassamSecurity.renderDevices()">إلغاء</button></div></div>`;$('abuSavePerms').onclick=async()=>{const p={};box.querySelectorAll('[data-p]').forEach(x=>p[x.dataset.p]=x.checked);try{await manageDevice(id,{permissions:p});await renderDevices()}catch(e){alert(authError(e))}}}catch(e){alert(authError(e))}}
async function removeDevice(id){if(!confirm('حذف هذا الجهاز الفرعي من الأجهزة الموثوقة؟'))return;try{const secret=await getSecret(),actor=identity().id;const {error}=await client().rpc('abu_bassam_remove_device',{p_actor_device_id:actor,p_actor_secret:secret,p_target_device_id:id});if(error)throw error;log('حذف جهاز موثوق',id);await renderDevices()}catch(e){alert(authError(e))}}

function securityCardHtml(){const owner=currentDevice?.role==='owner';return `<section id="abuSecuritySettings" class="abu-setting-card" data-settings-keywords="أمان دخول بصمة كلمة مرور أجهزة قفل صلاحيات خروج"><div class="abu-setting-title">🔐 الأمان وتسجيل الدخول</div><div class="abu-security-line"><span>الحساب</span><span><b>${MAIN_USERNAME}</b> • <span class="abu-security-badge ${owner?'owner':''}">${roleLabel()}</span></span></div><div class="abu-security-line"><span>هذا الهاتف</span><span>${esc(currentDevice?.device_name||localStorage.getItem(DEVICE_NAME_KEY)||deviceInfo.model||'—')}</span></div><label class="abu-security-line"><span>تسجيل الدخول بالبصمة</span><input id="abuSecurityBio" type="checkbox" onchange="AbuBassamSecurity.toggleBiometric(this.checked)"></label><div class="abu-security-setting-grid"><select id="abuSecurityLock" onchange="AbuBassamSecurity.setLockMinutes(this.value)"><option value="0">قفل فور مغادرة التطبيق</option><option value="1">بعد دقيقة</option><option value="5">بعد ٥ دقائق</option><option value="15">بعد ١٥ دقيقة</option><option value="60">بعد ساعة</option></select><button onclick="AbuBassamSecurity.lockNow()">🔒 قفل الآن</button>${owner?'<button onclick="AbuBassamSecurity.openDevices()">📱 إدارة الأجهزة (٥)</button>':''}<button onclick="AbuBassamSecurity.restorePreviousTheme()">↶ المظهر السابق</button></div><label class="abu-security-line"><span>مزامنة الثيم والخط بين الأجهزة</span><input id="abuAppearanceSync" type="checkbox" onchange="AbuBassamSecurity.appearanceSync(this.checked)"></label><div class="abu-setting-note" style="margin-top:6px">الثيم والخط يطبقان فعليًا على هذا الجهاز. مزامنة المظهر اختيارية؛ خطوط المطبوعات تبقى مستقلة.</div></section>`}
async function renderSecurityCard(){const body=document.querySelector('#abuSettingsModal .abu-settings-body');if(!body)return;let old=$('abuSecuritySettings');if(old)old.outerHTML=securityCardHtml();else body.insertAdjacentHTML('afterbegin',securityCardHtml());const bio=$('abuSecurityBio');if(bio)bio.checked=await getBiometricEnabled().catch(()=>false);const lockSel=$('abuSecurityLock');if(lockSel)lockSel.value=String(localStorage.getItem(LOCK_MINUTES_KEY)||5);const sync=$('abuAppearanceSync');if(sync)sync.checked=localStorage.getItem(APPEARANCE_SYNC_KEY)==='1';applySecondaryGuards()}
let securityCardSignalsBound=false;function injectSecurityCard(){renderSecurityCard();if(securityCardSignalsBound)return;securityCardSignalsBound=true;window.addEventListener('pageshow',renderSecurityCard,{passive:true});window.addEventListener('focus',renderSecurityCard,{passive:true});document.addEventListener('abu-bassam-settings-opened',renderSecurityCard,{passive:true})}

function applySecondaryGuards(){if(currentDevice?.role==='owner')return;document.querySelectorAll('#abuSettingsModal button[onclick*="resetDefaults"],#opsClear').forEach(btn=>{btn.disabled=true;btn.title='متاح للحساب الرئيسي فقط';btn.style.opacity='.45'})}
function permissionForTarget(target){if(!target)return'';const onclick=String(target.getAttribute?.('onclick')||'');if(/resetDefaults|resetData/.test(onclick))return'reset';if(target.id==='opsClear'||/clearOperations/.test(onclick))return'security';if(/cloudLogin/.test(onclick))return'security';return''}
function guardClicks(){applySecondaryGuards()}

function appearancePayload(){return{theme:localStorage.getItem('theme')||'default',typography:readJson('abuBassamTypographyV5',{})}}
async function pushAppearance(){if(!cloud()?.isConnected?.()||!can('appearance')||currentDevice?.role!=='owner')return;const payload=appearancePayload(),stamp=JSON.stringify(payload);if(stamp===appearanceStamp)return;appearanceStamp=stamp;try{await cloud().upsert('appearance','shared',payload)}catch(e){}}
async function pullAppearanceIfNeeded(){if(localStorage.getItem(APPEARANCE_SYNC_KEY)!=='1'||!cloud()?.isConnected?.())return;try{const row=await cloud().get('appearance','shared');if(!row?.data)return;const data=row.data;if(data.theme){localStorage.setItem(PREVIOUS_THEME_KEY,localStorage.getItem('theme')||'default');localStorage.setItem('theme',data.theme);if(typeof window.applyTheme==='function')window.applyTheme(data.theme)}if(data.typography&&typeof data.typography==='object'){localStorage.setItem('abuBassamTypographyV5',JSON.stringify(data.typography));window.AbuBassamTypography?.applyApp?.()}appearanceStamp=JSON.stringify(appearancePayload())}catch(e){}}
async function appearanceSync(enabled){localStorage.setItem(APPEARANCE_SYNC_KEY,enabled?'1':'0');if(enabled){if(currentDevice?.role==='owner')await pushAppearance();else await pullAppearanceIfNeeded()}log('مزامنة المظهر',enabled?'مفعلة':'متوقفة')}
function wrapAppearance(){const timer=setInterval(()=>{if(window.AbuBassamSettings?.theme&&!window.AbuBassamSettings.theme.__securityWrapped){const original=window.AbuBassamSettings.theme;const wrapped=function(key){localStorage.setItem(PREVIOUS_THEME_KEY,localStorage.getItem('theme')||'default');const out=original.apply(this,arguments);setTimeout(pushAppearance,80);return out};wrapped.__securityWrapped=true;window.AbuBassamSettings.theme=wrapped}if(window.AbuBassamTypography?.global&&!window.AbuBassamTypography.global.__securityWrapped){const original=window.AbuBassamTypography.global;const wrapped=function(){const out=original.apply(this,arguments);setTimeout(pushAppearance,100);return out};wrapped.__securityWrapped=true;window.AbuBassamTypography.global=wrapped}},700);setTimeout(()=>clearInterval(timer),30000)}
function restorePreviousTheme(){const prev=localStorage.getItem(PREVIOUS_THEME_KEY);if(!prev)return toast('لا يوجد مظهر سابق محفوظ');const current=localStorage.getItem('theme')||'default';localStorage.setItem(PREVIOUS_THEME_KEY,current);localStorage.setItem('theme',prev);if(typeof window.applyTheme==='function')window.applyTheme(prev);window.AbuBassamSettings?.open?.();setTimeout(()=>window.AbuBassamSettings?.theme?.(prev),30);toast('تمت استعادة المظهر السابق')}

function closeTopLayer(){const ordered=['#abuDeviceModal.show','#abuTextEditor.show','#abuTypographySettings.show','#abuSettingsModal.show','#opsSheet.show','.v-modal.show','.cs-modal.show','.nat-modal.show','.sheet.show','.ds-sheet.show'];for(const sel of ordered){const el=document.querySelector(sel);if(!el)continue;if(el.id==='abuDeviceModal')closeDevices();else if(el.id==='abuSettingsModal')window.AbuBassamSettings?.close?.();else if(el.id==='opsSheet')window.AbuBassamOps?.close?.();else el.classList.remove('show');return true}return false}
function home(){if(closeTopLayer()){}try{if(typeof window.switchTab==='function')window.switchTab('photos')}catch(e){}document.body.classList.remove('abu-focus-mode');window.scrollTo({top:0,behavior:'smooth'});toast('الرئيسية')}
function focus(){document.body.classList.toggle('abu-focus-mode');toast(document.body.classList.contains('abu-focus-mode')?'وضع تكبير مساحة العمل':'الوضع العادي')}
function back(fromHardware=false){if(!unlocked)return true;if(closeTopLayer())return true;if(document.body.classList.contains('abu-focus-mode')){document.body.classList.remove('abu-focus-mode');return true}const active=document.querySelector('#abuMainTabs .abu-tab.active');if(active&&active.id!=='tabPhotos'){home();return true}if(window.scrollY>40){window.scrollTo({top:0,behavior:'smooth'});return true}return exit(fromHardware)}
function exit(){const now=Date.now();if(now-exitArmedAt<=2000){exitArmedAt=0;if(window.Android?.exitApp)Android.exitApp();return true}exitArmedAt=now;toast('اضغط مرة ثانية للخروج');return true}
window.AbuBassamNativeBackPress=function(){back(true)};

async function logout(){if(!confirm('تسجيل الخروج من هذا الجهاز؟'))return;try{await cloud()?.client?.auth?.signOut?.({scope:'local'})}catch(e){}currentDevice=null;unlocked=false;showGate('تم تسجيل الخروج.');log('تسجيل خروج')}
function lockNow(){lock('تم قفل التطبيق يدويًا')}

async function boot(){
  buildUi();guardClicks();injectSecurityCard();wrapAppearance();await fetchDeviceInfo();if(!localStorage.getItem(LOCK_MINUTES_KEY))localStorage.setItem(LOCK_MINUTES_KEY,'5');
  const trust=localTrust();if(offlineAllowed())$('abuOfflineBtn').style.display='block';
  try{await cloud()?.ready?.()}catch(e){}
  const bio=await getBiometricEnabled().catch(()=>false);if(bio&&((cloud()?.isConnected?.()&&navigator.onLine)||offlineAllowed())){setTimeout(unlockWithBiometric,180)}else showGate('أدخل بيانات الدخول لفتح التطبيق.');
  setInterval(()=>{if(unlocked)touchDevice();if(localStorage.getItem(APPEARANCE_SYNC_KEY)==='1'){if(currentDevice?.role==='owner')pushAppearance();else pullAppearanceIfNeeded()}},60000)
}

window.AbuBassamSecurity={
  username:MAIN_USERNAME,email:MAIN_EMAIL,maxDevices:MAX_DEVICES,can,role:()=>currentDevice?.role||'',device:()=>currentDevice,
  login,unlockWithBiometric,toggleBiometric,setLockMinutes,lockNow,logout,
  openDevices,closeDevices,renderDevices,renameDevice,toggleDevice,permissionsDevice,removeDevice,
  appearanceSync,restorePreviousTheme,pushAppearance,pullAppearanceIfNeeded,
  back,home,focus,exit,
  onSessionChanged:async()=>{if(unlocked&&cloud()?.isConnected?.())try{await registerDevice()}catch(e){}},
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
