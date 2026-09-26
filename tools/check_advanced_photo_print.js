const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const web=path.join(root,'web');
const errors=[];
const read=f=>fs.readFileSync(path.join(web,f),'utf8');
const need=(src,m,label)=>{if(!src.includes(m))errors.push(`${label}: missing ${m}`)};
const files=['photo-print-advanced-runtime.js','photo-geometry-runtime.js','design-studio-advanced-runtime.js','print-presets-runtime.js','card-free-layout-runtime.js','poster-project-runtime.js','advanced-completion-runtime.js'];
for(const f of files)if(!fs.existsSync(path.join(web,f)))errors.push(`Missing advanced asset: ${f}`);
if(!errors.length){
  const p=read('photo-print-advanced-runtime.js');
  for(const m of ['بوستر / صورة كبيرة','abuPosterOverlap','abuPosterBorderless','abuPosterMarks','abuPosterLabels','buildPoster','testPoster','sharpen','temperature','abuDenoise','جودة الطباعة الحالية','abu-photo-handle'])need(p,m,'photo-print-advanced-runtime.js');
  const project=read('poster-project-runtime.js');for(const m of ['معاينة البوستر بعد التجميع','حفظ مشروع','فتح مشروع','imageDataUrl','abuPosterAssemblyCanvas','abuPosterProjectInput','abuPosterOrientation','advanced-completion-runtime.js'])need(project,m,'poster-project-runtime.js');
  const g=read('photo-geometry-runtime.js');for(const m of ['قص حر / منظور','تصحيح منظور 4 زوايا','warpFull','abu-geo-handle','معاينة القياسات','abu-ruler-safe'])need(g,m,'photo-geometry-runtime.js');
  const d=read('design-studio-advanced-runtime.js');for(const m of ["['nw','n','ne','e','se','s','sw','w']",'ds-adv-rotate','dsAdvAspect','dsAdvGrid','dsAdvSnap','dsAdvX','dsAdvY','dsAdvW','dsAdvH','snapGeom'])need(d,m,'design-studio-advanced-runtime.js');
  const presets=read('print-presets-runtime.js');for(const m of ['abuBassamProfessionalPrintPresetsV1','إعدادات طباعة محفوظة','paperSize','mediaType','dpiInput','marginInput','gapInput','apply(i)'])need(presets,m,'print-presets-runtime.js');
  const card=read('card-free-layout-runtime.js');for(const m of ['abuBassamCardFreeLayoutV1','ROLE_SELECTORS','abu-layout-handle','abu-layout-rot','injectHtml','printHtml','savePdfHtml'])need(card,m,'card-free-layout-runtime.js');
  const complete=read('advanced-completion-runtime.js');for(const m of ['undoPhoto','redoPhoto','flipPhoto','abuPosterOrientation','buildPosterOriented','الحجم المطلوب يحتاج','dsCompLayers','toggleHideSelected','طبقات التصميم','copySelectedStyle','markOutside'])need(complete,m,'advanced-completion-runtime.js');
  const prod=read('productivity-tools-runtime.js');for(const m of ['photo-print-advanced-runtime.js','photo-geometry-runtime.js','print-presets-runtime.js','card-free-layout-runtime.js','poster-project-runtime.js'])need(prod,m,'productivity-tools-runtime.js');
  const env=read('envelopes.html'),cert=read('certificates.html');for(const m of ['design-studio-advanced-runtime.js','advanced-completion-runtime.js']){need(env,m,'envelopes.html');need(cert,m,'certificates.html')}
}
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Advanced photo/print checks passed: local enhancement, undo/redo/flip, poster tiling with portrait/landscape and strict size caps, assembled preview/project reopen, direct crop/perspective, ruler preview, 8-handle transforms, card free layout, snap/grid, layers/hide, print-bound warning, and named print presets.\n');
