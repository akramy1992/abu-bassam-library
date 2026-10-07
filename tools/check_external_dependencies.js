const fs=require('fs');
function read(p){if(!fs.existsSync(p))throw new Error(`missing ${p}`);return fs.readFileSync(p,'utf8')}
const errors=[];
const need=(s,t,l)=>{if(!s.includes(t))errors.push(`${l}: missing ${t}`)};
const forbid=(s,t,l)=>{if(s.includes(t))errors.push(`${l}: forbidden ${t}`)};
const pin=read('web/mediapipe-pin-runtime.js');
const prep=read('scripts/prepare-android-assets.mjs');
const loader=read('web/device-name-runtime.js');
const index=read('web/index.html');
for(const t of ["VERSION='0.1.1675465747'","const BASE='vendor/mediapipe/selfie_segmentation/';",'window.getSelfie=async function','locateFile:file=>BASE+file'])need(pin,t,'MediaPipe local runtime');
for(const t of ["const mediaPipeVersion = '0.1.1675465747'","MEDIAPIPE_ASSETS",'@mediapipe/selfie_segmentation@${mediaPipeVersion}/','selfie_segmentation.tflite','selfie_segmentation_solution_simd_wasm_bin.wasm'])need(prep,t,'MediaPipe build bundle');
for(const t of ['mediapipe-pin-runtime.js','loadMediaPipePin','loadPasswordPolicy();loadMediaPipePin();'])need(loader,t,'startup dependency loader');
need(index,"vendor/mediapipe/selfie_segmentation/",'background-removal local runtime');
need(index,'تُعالج الصورة محليًا ولا تُرسل إلى خادم التطبيق','local-processing disclosure');
forbid(pin,'https://cdn.jsdelivr.net','runtime CDN dependency');
for(const file of ['web/mediapipe-pin-runtime.js','web/device-name-runtime.js']){try{new Function(read(file))}catch(e){errors.push(`${file}: JavaScript syntax error: ${e.message}`)}}
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('External dependency checks passed: MediaPipe 0.1.1675465747 is pinned at build time, bundled into Android assets, and background removal has no runtime CDN dependency.\n');
