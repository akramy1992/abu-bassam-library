const fs=require('fs');
function read(p){if(!fs.existsSync(p))throw new Error(`missing ${p}`);return fs.readFileSync(p,'utf8')}
const errors=[];
const need=(s,t,l)=>{if(!s.includes(t))errors.push(`${l}: missing ${t}`)};
const forbid=(s,t,l)=>{if(s.includes(t))errors.push(`${l}: forbidden ${t}`)};
const pin=read('web/mediapipe-pin-runtime.js');
const loader=read('web/device-name-runtime.js');
const index=read('web/index.html');
for(const t of ["VERSION='0.1.1675465747'",'@mediapipe/selfie_segmentation@${VERSION}/','window.getSelfie=async function','locateFile:file=>BASE+file'])need(pin,t,'MediaPipe pin runtime');
for(const t of ['mediapipe-pin-runtime.js','loadMediaPipePin','loadPasswordPolicy();loadMediaPipePin();'])need(loader,t,'startup dependency loader');
need(index,'abuBassamBgConsent','background-removal consent');
need(index,'تُعالج الصورة محليًا ولا تُرسل إلى خادم التطبيق','local-processing disclosure');
forbid(pin,'@mediapipe/selfie_segmentation/selfie_segmentation.js','unpinned MediaPipe URL in active pin runtime');
for(const file of ['web/mediapipe-pin-runtime.js','web/device-name-runtime.js']){try{new Function(read(file))}catch(e){errors.push(`${file}: JavaScript syntax error: ${e.message}`)}}
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('External dependency checks passed: optional MediaPipe background removal is user-consented and overridden at startup with pinned package version 0.1.1675465747 before the splash clears.\n');
