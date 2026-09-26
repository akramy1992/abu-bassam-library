(()=>{
'use strict';
if(window.__ABU_NOTIFICATION_CENTER_CORRECTIONS_V2__)return;
window.__ABU_NOTIFICATION_CENTER_CORRECTIONS_V2__=true;
const STORE='abuBassamNotificationsV1',QUEUE='abuBassamAuditQueueV1',SCOPE='abuBassamOperationDeviceScopeV1',MAX=1200;
const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??f}catch(_){return f}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
function role(){return window.AbuBassamSecurity?.role?.()||''}
function identity(){const s=window.AbuBassamSecurity?.device?.()||{},d=window.AbuBassamDevices?.ensure?.()||{};return{id:String(s.device_id||s.id||d.device_id||d.id||localStorage.getItem('abuBassamLockedDeviceIdV3')||'').trim(),name:String(s.device_name||s.name||d.device_name||d.name||localStorage.getItem('abuBassamLockedDeviceNameV3')||'هذا الجهاز').trim()||'هذا الجهاز'}}
function sensitiveContext(v){return /(مستمسك|مستمسكات|هوية|الوطنية|بطاقة السكن|تموين|التموينية|زبون|الزبون|زوجة|اطفال|أطفال|customer|document|national\s*id|residence)/i.test(String(v||''))}
function scrub(v){return String(v??'')
 .replace(/data:[^\s"']+/gi,'[بيانات محجوبة]')
 .replace(/(password|كلمة\s*السر|token|secret|authorization|رمز\s*الدخول|رمز\s*ربط)\s*[:=]?\s*\S+/gi,'[محجوب]')
 .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[بريد محجوب]')
 .replace(/(?:\+?964|0)?7\d{9}\b/g,'[هاتف محجوب]')
 .replace(/\b\d{8,}\b/g,'[رقم محجوب]')
 .slice(0,600)}
function cleanOne(n={}){const d=identity(),out={...n};out.id=String(out.id||'');out.title=scrub(out.title||'إشعار');out.section=scrub(out.section||'');out.deviceId=String(out.deviceId||d.id||'').trim();out.deviceName=scrub(out.deviceName||d.name||'هذا الجهاز');const context=`${n.section||''} ${n.title||''}`;if(sensitiveContext(context)){out.details=n.details?'[تفاصيل زبون محجوبة]':'';out.title=out.title.replace(/[:\-–—]\s*.+$/,'').trim()||'عملية مستمسكات'}else out.details=scrub(n.details||'');return out}
function operationIds(){try{return new Set((window.AbuBassamOps?.list?.()||[]).map(x=>String(x?.id||'').trim()).filter(Boolean))}catch(_){return new Set()}}
function operationTime(n){const t=Date.parse(n?.createdAt||n?.uploadedAt||n?.printedAt||0);return Number.isFinite(t)?t:0}
function sameOperation(a,b){return a&&b&&a.source==='operations'&&b.source==='operations'&&String(a.title||'')===String(b.title||'')&&String(a.details||'')===String(b.details||'')&&String(a.section||'')===String(b.section||'')&&String(a.deviceId||'')===String(b.deviceId||'')&&Math.abs(operationTime(a)-operationTime(b))<=5000}
function isPhantomOperation(n,stable,validOps){if(n.source!=='operations')return false;const opId=n.id.startsWith('op:')?n.id.slice(3):'';if(opId&&validOps.has(opId))return false;return stable.some(x=>sameOperation(n,x))}
function updateBadge(list){const unread=list.filter(x=>!x.read).length,b=document.getElementById('abuNotificationBadge'),btn=document.getElementById('abuNotificationBell');if(b){b.textContent=unread>99?'99+':String(unread);b.style.display=unread?'grid':'none'}if(btn)btn.setAttribute('aria-label',unread?`الإشعارات، ${unread} غير مقروء`:'الإشعارات')}
function belongs(n,scope,d){if(role()!=='secondary')return true;if(!d.id)return false;if(n.source==='branch-audit')return false;if(n.source==='operations'){const opId=String(n.id||'').startsWith('op:')?String(n.id).slice(3):'',owner=opId?String(scope[opId]||'').trim():'';return !!owner&&owner===d.id}return String(n.deviceId||'').trim()===d.id}
function cleanStore(){const d=identity(),scope=read(SCOPE,{}),validOps=operationIds(),rawList=read(STORE,[]),source=(Array.isArray(rawList)?rawList:[]).map(cleanOne),stable=source.filter(n=>n.source==='operations'&&validOps.has(n.id.startsWith('op:')?n.id.slice(3):'')),seen=new Set(),out=[];for(const n of source){if(!n.id||seen.has(n.id)||isPhantomOperation(n,stable,validOps))continue;if(!belongs(n,scope,d))continue;seen.add(n.id);out.push(n);if(out.length>=MAX)break}write(STORE,out);const rawQueue=read(QUEUE,[]),qSource=(Array.isArray(rawQueue)?rawQueue:[]).map(cleanOne),qStable=qSource.filter(n=>n.source==='operations'&&validOps.has(n.id.startsWith('op:')?n.id.slice(3):'')),qSeen=new Set(),qOut=[];for(const n of qSource){if(!n.id||qSeen.has(n.id)||isPhantomOperation(n,qStable,validOps)||!belongs(n,scope,d))continue;qSeen.add(n.id);qOut.push(n);if(qOut.length>=1000)break}write(QUEUE,qOut);updateBadge(out);return out}
function safeInput(input={}){const d=identity(),out=cleanOne({...input,deviceId:input.deviceId||d.id,deviceName:input.deviceName||d.name});return out}
function patchCenter(){const c=window.AbuBassamNotifications;if(!c||c.__abuCorrectionsV2)return false;c.__abuCorrectionsV2=true;
 const add0=c.add?.bind(c),from0=c.fromOperation?.bind(c),open0=c.open?.bind(c),refresh0=c.refresh?.bind(c),list0=c.list?.bind(c),remove0=c.remove?.bind(c),mark0=c.markAll?.bind(c),clear0=c.clearRead?.bind(c);
 if(add0)c.add=function(input,options){const out=add0(safeInput(input),options);cleanStore();return out};
 if(from0)c.fromOperation=function(op={}){const id=String(op.id||'').trim();if(!id)return null;const d=identity(),scope=read(SCOPE,{});if(role()==='secondary'&&String(scope[id]||'').trim()!==d.id)return null;const out=from0(safeInput(op));cleanStore();return out};
 if(list0)c.list=function(){cleanStore();return list0().map(cleanOne)};
 if(open0)c.open=function(){cleanStore();const out=open0();setTimeout(fixUi,0);return out};
 if(refresh0)c.refresh=function(){cleanStore();const out=refresh0();setTimeout(()=>{cleanStore();fixUi()},150);return out};
 if(remove0)c.remove=function(id){const n=(read(STORE,[])||[]).find(x=>String(x.id)===String(id));if(n?.severity==='critical'&&!confirm('هذا إشعار حرج. سيُحذف من هذا الجهاز فقط، بينما يبقى سجل التدقيق محفوظًا للأدمن. هل تريد المتابعة؟'))return;const out=remove0(id);cleanStore();return out};
 if(mark0)c.markAll=function(){const out=mark0();cleanStore();return out};
 if(clear0)c.clearRead=function(){const out=clear0();cleanStore();return out};
 return true}
function fixUi(){document.querySelectorAll('#abuNotificationTabs button').forEach(b=>{if((b.textContent||'').trim()==='تقارير الفرعين')b.textContent='تقارير الأجهزة الفرعية'});const s=document.getElementById('abuNotifyStatus');if(s&&role()==='secondary')s.title='يعرض هذا الجهاز فقط؛ لا تظهر إشعارات الأجهزة الفرعية الأخرى.'}
function boot(){cleanStore();let tries=0;const t=setInterval(()=>{tries++;patchCenter();cleanStore();fixUi();if(tries>100)clearInterval(t)},100);[300,800,1600,3500,7000].forEach(ms=>setTimeout(()=>{patchCenter();cleanStore();fixUi()},ms));setInterval(()=>{if(document.visibilityState!=='hidden'){patchCenter();cleanStore();fixUi()}},5000);window.addEventListener('online',()=>setTimeout(cleanStore,100));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(cleanStore,50)})}
window.AbuBassamNotificationCorrections={clean:cleanStore,scrub:safeInput,patch:patchCenter};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();