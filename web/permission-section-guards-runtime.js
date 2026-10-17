(()=>{
'use strict';
if(window.__ABU_PERMISSION_SECTION_GUARDS_V1__)return;
window.__ABU_PERMISSION_SECTION_GUARDS_V1__=true;
let opsPatched=false,notifyPatched=false,securityPatched=false,settingsPatched=false,printPatched=false;
const $=id=>document.getElementById(id);
const can=k=>window.AbuBassamPermissions?.can?.(k)!==false;
function deny(k){const item=window.AbuBassamPermissions?.items?.find?.(x=>x.key===k);alert('هذه الصلاحية معطلة لهذا الفرع من قبل الأدمن: '+(item?.label||k));return false}
function wrap(obj,name,key){const f=obj?.[name];if(typeof f!=='function'||f.__abuSectionPermissionGuard)return;const w=function(...args){if(!can(key))return deny(key);return f.apply(this,args)};w.__abuSectionPermissionGuard=true;w.__abuOriginal=f;obj[name]=w}
function patchOps(){const a=window.AbuBassamOps;if(!a||opsPatched)return;opsPatched=true;wrap(a,'open','logsViewOwn');wrap(a,'sync','syncManual');const oldOpen=window.openOps;if(typeof oldOpen==='function')window.openOps=function(...args){if(!can('logsViewOwn'))return deny('logsViewOwn');return a.open(...args)}}
function patchNotifications(){const a=window.AbuBassamNotifications;if(!a||notifyPatched)return;notifyPatched=true;wrap(a,'open','notificationsView');wrap(a,'read','notificationsMarkRead');wrap(a,'markAll','notificationsMarkRead');wrap(a,'remove','notificationsDelete');wrap(a,'clearRead','notificationsDelete');if(window.AbuBassamSecurity?.role?.()!=='owner'){wrap(a,'loadAdminReport','notificationsViewBranches');wrap(a,'exportAdmin','notificationsViewBranches');wrap(a,'pullOwnerActivity','notificationsViewBranches')}}
function patchSecurity(){const s=window.AbuBassamSecurity;if(!s||securityPatched)return;securityPatched=true;wrap(s,'toggleBiometric','securityBiometric');wrap(s,'setLockMinutes','securityAutoLock');wrap(s,'appearanceSync','settingsAppearance');wrap(s,'restorePreviousTheme','settingsAppearance')}
function patchSettings(){const s=window.AbuBassamSettings;if(!s||settingsPatched)return;settingsPatched=true;wrap(s,'privacyMode','securityPrivacyMode');wrap(s,'syncPolicy','syncSettings');wrap(s,'autoSync','syncAutomatic');wrap(s,'google','googleShare');wrap(s,'resetDefaults','settingsReset');wrap(s,'storage','settingsStorage')}
function patchPrint(){if(printPatched)return;printPatched=true;const globals=[['printDirectly','printGeneral'],['downloadPDF','pdfSave'],['downloadJPG','imageExport'],['openOptions','settingsPrinting']];globals.forEach(([n,k])=>{const f=window[n];if(typeof f!=='function'||f.__abuSectionPermissionGuard)return;const w=function(...args){if(!can(k))return deny(k);return f.apply(this,args)};w.__abuSectionPermissionGuard=true;w.__abuOriginal=f;window[n]=w})}
function forceHide(id,key){const el=$(id);if(!el)return;if(!can(key))el.style.setProperty('display','none','important');else if(el.style.getPropertyPriority('display')==='important'&&el.style.display==='none')el.style.removeProperty('display')}
function guardDisabled(el,denyAccess,opacity,title){
  if(!el)return;
  const data=el.dataset;
  if(denyAccess){
    if(data.abuSectionGuardDisabled!=='1'){
      data.abuSectionGuardDisabled='1';
      data.abuSectionGuardOriginalDisabled=el.disabled?'1':'0';
      data.abuSectionGuardOriginalOpacity=el.style.opacity||'';
      data.abuSectionGuardOriginalTitle=el.title||'';
    }
    el.disabled=true;el.style.opacity=opacity;if(title)el.title=title;
  }else if(data.abuSectionGuardDisabled==='1'){
    el.disabled=data.abuSectionGuardOriginalDisabled==='1';
    el.style.opacity=data.abuSectionGuardOriginalOpacity||'';
    el.title=data.abuSectionGuardOriginalTitle||'';
    delete data.abuSectionGuardDisabled;
    delete data.abuSectionGuardOriginalDisabled;
    delete data.abuSectionGuardOriginalOpacity;
    delete data.abuSectionGuardOriginalTitle;
  }
}
function guardImageLabel(el,denyAccess){
  const data=el.dataset;
  if(denyAccess){
    if(data.abuSectionGuardLabel!=='1'){
      data.abuSectionGuardLabel='1';
      data.abuSectionGuardOriginalPointer=el.style.pointerEvents||'';
      data.abuSectionGuardOriginalLabelOpacity=el.style.opacity||'';
    }
    el.style.pointerEvents='none';el.style.opacity='.45';
  }else if(data.abuSectionGuardLabel==='1'){
    el.style.pointerEvents=data.abuSectionGuardOriginalPointer||'';
    el.style.opacity=data.abuSectionGuardOriginalLabelOpacity||'';
    delete data.abuSectionGuardLabel;
    delete data.abuSectionGuardOriginalPointer;
    delete data.abuSectionGuardOriginalLabelOpacity;
  }
}
function guardTopButtons(){
  const rules=[[/سجل العمليات/,'logsViewOwn'],[/الإشعار/,'notificationsView'],[/مستمسكات الزبائن/,'customerView']];
  document.querySelectorAll('button').forEach(button=>{
    const title=button.dataset.abuSectionGuardDisabled==='1'?button.dataset.abuSectionGuardOriginalTitle:button.title;
    const label=String(button.textContent||title||'');
    const rule=rules.find(([pattern])=>pattern.test(label));
    if(rule)guardDisabled(button,!can(rule[1]),'.4','معطل من الأدمن');
    else if(button.dataset.abuSectionGuardDisabled==='1')guardDisabled(button,false,'.4');
  });
}
function guardCustomerPrivacy(){const btn=$('custBtn');if(btn){btn.style.display=can('customerView')?'':'none';btn.disabled=!can('customerView')}const add=$('custAdd'),save=$('custSave');if(add){add.disabled=!can('customerAdd');add.style.opacity=can('customerAdd')?'1':'.45'}if(save){save.disabled=!can('customerAdd');save.style.opacity=can('customerAdd')?'1':'.45'}if(!can('customerPhoneView'))document.querySelectorAll('#custGrid .cu small,#custDetail small').forEach(el=>{el.innerHTML=String(el.innerHTML||'').replace(/(?:\+?964|0)?7\d{9}/g,'[هاتف محجوب]')})}
function inferCardPermission(text){text=String(text||'');if(/طبع|Print/i.test(text))return'cardsPrint';if(/PDF/i.test(text))return'cardsExportPdf';if(/حفظ.*صورة|تنزيل.*صورة|Export.*Image/i.test(text))return'cardsExportImage';if(/باركود|Barcode/i.test(text))return'cardsBarcode';if(/QR/i.test(text))return'cardsQr';if(/قالب|Template/i.test(text))return/cardsManage|مخصص/i.test(text)?'cardsManageCustomTemplates':'cardsTemplatesEdit';if(/حذف|Delete/i.test(text))return'cardsDelete';if(/نسخ|Duplicate/i.test(text))return'cardsDuplicate';if(/صورة|Image|Photo/i.test(text))return'cardsEditImage';if(/نص|Text|خط|Font/i.test(text))return'cardsEditText';return'cardsEdit'}
function isCardContext(el){return !!el?.closest?.('#cardsCenter,.cs-modal,.ds-sheet,#abuRecoveryModal')}
function clickGuard(e){const t=e.target?.closest?.('button,a,label,[role="button"]');if(!t)return;const text=String(t.textContent||t.title||'').trim();if(isCardContext(t)){const k=inferCardPermission(text);if(!can(k)){e.preventDefault();e.stopImmediatePropagation();deny(k);return}}if(/إعادة ضبط المصنع|Factory Reset/i.test(text)&&!can('settingsFactoryReset')){e.preventDefault();e.stopImmediatePropagation();deny('settingsFactoryReset');return}if(/تغيير كلمة المرور/i.test(text)&&!can('securityChangePassword')){e.preventDefault();e.stopImmediatePropagation();deny('securityChangePassword');return}if(/بصمة/.test(text)&&!can('securityBiometric')){e.preventDefault();e.stopImmediatePropagation();deny('securityBiometric');return}}
function guardMainPhotoUi(){
  const map=[['imageInput','imageExport'],['paperSize','settingsPrinting'],['photoSize','settingsPrinting']];
  map.forEach(([id,key])=>guardDisabled($(id),!can(key),'.45'));
  document.querySelectorAll('label[for="imageInput"]').forEach(el=>guardImageLabel(el,!can('imageExport')));
}
function guardSections(){forceHide('questionsCenter','questionsView');forceHide('compressorCenter','compressUse');guardTopButtons();guardCustomerPrivacy();guardMainPhotoUi()}
function tick(){patchOps();patchNotifications();patchSecurity();patchSettings();patchPrint();guardSections()}
let tickQueued=false;
function scheduleTick(){if(tickQueued)return;tickQueued=true;requestAnimationFrame(()=>{tickQueued=false;tick()})}
function boot(){
  document.addEventListener('click',clickGuard,true);
  for(const name of ['abu-runtime-loaded','abu-bassam-auth-changed','abu-settings-ready','abu-cards-rendered','abu-bassam-section-opened','pageshow'])
    document.addEventListener(name,scheduleTick);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleTick()});
  tick();
  [120,350,1000,2500].forEach(ms=>setTimeout(scheduleTick,ms));
}
window.AbuPermissionSectionGuards={tick};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();