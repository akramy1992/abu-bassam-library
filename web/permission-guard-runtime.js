(()=>{
'use strict';
if(window.__ABU_PERMISSION_GUARD_V2__)return;
window.__ABU_PERMISSION_GUARD_V2__=true;
const security=()=>window.AbuBassamSecurity;
function secondary(){return security()?.role?.()==='secondary'}
function allowed(permission){return !secondary()||security()?.can?.(permission)!==false}
function textOf(el){return `${el?.id||''} ${el?.className||''} ${el?.getAttribute?.('onclick')||''} ${el?.getAttribute?.('title')||''} ${el?.textContent||''}`.toLowerCase()}
function exempt(el){return !!el?.closest?.('#abuSecurityGate,#abuSecuritySettings,#abuSecurityExtrasSettings,#abuDeviceModal')}
function permissionFor(el){const text=textOf(el);if(/device|devices|جهاز|الأجهزة/.test(text)&&/manage|إدارة|remove|delete|إيقاف|تفعيل|صلاح/.test(text))return'devices';if(/security|أمان|بصمة|biometric|password|كلمة مرور/.test(text))return'security';if(/reset|resetdata|resetdefaults|إعادة ضبط|استعادة الإعدادات/.test(text))return'reset';if(/print|طباعة/.test(text))return'print';if(/theme|font|typography|appearance|ثيم|خطوط|الخط|مظهر/.test(text))return'appearance';if(/sync|cloud|backup|مزامنة|نسخ احتياطي/.test(text))return'sync';if(/download|export|savepdf|pdf|gallery|share|تصدير|مشاركة|حفظ في المعرض/.test(text))return'export';if(/delete|remove|clear|add|crop|rotate|move|duplicate|replace|edit|resize|قص|تدوير|حذف|إضافة|استبدال|نقل|تحرير|تغيير الحجم/.test(text))return'edit';return''}
function decorate(){
  const isSecondary=secondary();
  document.querySelectorAll('button,input,textarea,select,[contenteditable="true"]').forEach(el=>{
    if(exempt(el)||el.closest('#abuSettingsModal')&&/input|textarea|select/i.test(el.tagName))return;
    const permission=permissionFor(el),denied=isSecondary&&permission&&!allowed(permission);
    if(el.dataset.abuPermissionManaged!=='1'){el.dataset.abuPermissionManaged='1';el.dataset.abuPermissionInitialDisabled=el.disabled?'1':'0';if(el.hasAttribute('contenteditable'))el.dataset.abuPermissionInitialEditable=el.getAttribute('contenteditable')||'true'}
    if(denied){el.dataset.abuPermissionDenied='1';if('disabled'in el)el.disabled=true;if(el.hasAttribute('contenteditable'))el.setAttribute('contenteditable','false');el.style.opacity='.48';el.title=`الصلاحية موقوفة: ${permission}`}
    else if(el.dataset.abuPermissionDenied==='1'){el.dataset.abuPermissionDenied='0';if('disabled'in el&&el.dataset.abuPermissionInitialDisabled!=='1')el.disabled=false;if(el.dataset.abuPermissionInitialEditable)el.setAttribute('contenteditable',el.dataset.abuPermissionInitialEditable);el.style.removeProperty('opacity');if(String(el.title||'').startsWith('الصلاحية موقوفة:'))el.removeAttribute('title')}
  })
}
function schedule(){clearTimeout(schedule.timer);schedule.timer=setTimeout(decorate,30)}
function boot(){decorate();window.addEventListener('pageshow',schedule,{passive:true});window.addEventListener('focus',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()},{passive:true});document.addEventListener('abu-bassam-auth-changed',schedule,{passive:true});document.addEventListener('abu-bassam-section-opened',schedule,{passive:true});[100,400,1200].forEach(ms=>setTimeout(decorate,ms))}
window.AbuBassamPermissionGuard={allowed,permissionFor,decorate};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
