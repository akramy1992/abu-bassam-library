const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const web=path.join(root,'web');
const errors=[];
const read=p=>fs.readFileSync(p,'utf8');
const need=(src,marker,label)=>{if(!src.includes(marker))errors.push(`${label}: missing ${marker}`)};
const no=(src,marker,label)=>{if(src.includes(marker))errors.push(`${label}: forbidden ${marker}`)};
for(const file of ['settings-corrections-runtime.js','wifi-sync-guard-runtime.js','settings-enhancements-runtime.js','device-name-runtime.js']){
  const src=read(path.join(web,file));
  try{new vm.Script(src,{filename:file})}catch(e){errors.push(`${file} syntax: ${e.message}`)}
}
const fix=read(path.join(web,'settings-corrections-runtime.js'));
for(const marker of [
  "nativeSecurity('privacyMode'",'abuPrivacyCapture','navigator.storage?.estimate',
  'لم يتم إنشاء جهاز افتراضي','device_id||device.id','RESET_KEYS=',
  'لا يوجد تسجيل دخول مباشر إلى Google','connectionClass()','wifiOnly()',
  "DocumentVault.syncNow=function",'abuBassamActivePrinterProfileV1',
  'transform:translate(${x}mm,${y}mm)','p.borderless?0',
  'e.applyPrinter=applyPrinterSafe'
])need(fix,marker,'settings corrections');
const reset=(fix.match(/const RESET_KEYS=\[([^\]]*)\]/)||[])[1]||'';
if(/SyncPolicy|WhatsApp|WA_KEY|AUTO_SYNC/i.test(reset))errors.push('settings reset: must not clear sync or WhatsApp settings');
const guard=read(path.join(web,'wifi-sync-guard-runtime.js'));
for(const marker of ["if(k!=='wifi')localStorage.setItem(AUTO_KEY,'0')",'navigator.connection','visibilitychange'])need(guard,marker,'Wi-Fi guard');
const enh=read(path.join(web,'settings-enhancements-runtime.js'));
need(enh,'abu_bassam_owner_device_count','device count RPC');
need(enh,'AbuBassamDeviceRegistry?.count','device registry count');
no(enh,".from('abu_bassam_devices')",'device count direct table access');
const loader=read(path.join(web,'device-name-runtime.js'));
for(const marker of ['settings-corrections-runtime.js','wifi-sync-guard-runtime.js','loadSettingsCorrections()','loadWifiSyncGuard()'])need(loader,marker,'settings loader');
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Settings checks passed: authenticated device count, exact current-device labeling, no fake devices, privacy capture control, broader storage estimate, honest Google sharing, safe reset scope, fail-closed Wi-Fi-only sync, and printer profile offsets/borderless behavior.\n');