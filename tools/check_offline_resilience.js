const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const errors=[];
const need=(src,token,label)=>{if(!src.includes(token))errors.push(label+': missing '+token)};
const forbid=(src,token,label)=>{if(src.includes(token))errors.push(label+': forbidden '+token)};

const sync=read('web/secure-sync-runtime.js');
need(sync,"PENDING_SYNC_KEY = 'abuBassamPendingCloudSyncV1'","cloud sync pending marker");
need(sync,"const networkAvailable = () => navigator.onLine !== false","network guard");
need(sync,"دون إنترنت • الحفظ المحلي يعمل وستتم المزامنة عند عودة الاتصال","offline status");
need(sync,"window.addEventListener('offline'","offline event");
need(sync,"hasPendingSync: pendingSync","pending sync API");
need(sync,"PENDING_SETTINGS_KEY = 'abuBassamPendingPrintSettingsV1'","print settings pending marker");
need(sync,"hasPendingSettings: pendingSettings","pending settings API");
new Function(sync);

const security=read('web/security-hardening-runtime.js');
need(security,'const OFFLINE_GRACE_MS=7*24*60*60*1000;','seven day signed trust');
for(const token of ['SecureStore','HMAC','biometricAuth','secureOfflineUnlock','revalidateOfflineSession'])need(security,token,'secure offline unlock');
new Function(security);

const vault=read('web/document-vault-runtime.js');
for(const token of ['indexedDB.open','syncState===\'pending\'','if(!navigator.onLine)','التغييرات محفوظة محلياً'])need(vault,token,'document vault offline behavior');
new Function(vault);

const prep=read('scripts/prepare-android-assets.mjs');
for(const token of ['MEDIAPIPE_ASSETS','selfie_segmentation.tflite','selfie_segmentation_solution_simd_wasm_bin.wasm',"'vendor','mediapipe','selfie_segmentation'"])need(prep,token,'bundled MediaPipe assets');

const media=read('web/mediapipe-pin-runtime.js');
need(media,"const BASE='vendor/mediapipe/selfie_segmentation/';",'local MediaPipe base');
forbid(media,'https://cdn.jsdelivr.net','runtime CDN dependency');
new Function(media);

const index=read('web/index.html');
need(index,'queuePrintSettingsSync','offline print settings queue');
need(index,'window.AbuBassamOps?.pushSettings?.()','print settings sync trigger');

const bootstrap=read('web/security-bootstrap-guard-runtime.js');
need(bootstrap,'__ABU_SECURITY_HARDENING_V2__','bootstrap waits for hardened security');
need(bootstrap,'denyLegacyOffline','legacy offline path blocked');

if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Offline resilience checks passed: local boot/data paths, signed biometric offline trust, deferred cloud sync, and bundled MediaPipe assets.');
