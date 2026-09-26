const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const web=path.join(root,'web');
const errors=[];
const read=f=>fs.readFileSync(path.join(web,f),'utf8');
const need=(s,m,l)=>{if(!s.includes(m))errors.push(`${l}: missing ${m}`)};
const forbid=(s,m,l)=>{if(s.includes(m))errors.push(`${l}: forbidden ${m}`)};
for(const f of ['questions-completion-runtime.js','questions-final-fixes-runtime.js','questions-en-fixes-runtime.js','questions-paper-runtime.js','productivity-tools-runtime.js','questions-template-tools-runtime.js','questions-templates-runtime.js','questions-custom-library-runtime.js']){
  const p=path.join(web,f);if(!fs.existsSync(p)){errors.push(`Missing ${f}`);continue}
  try{new vm.Script(read(f),{filename:f})}catch(e){errors.push(`${f}: syntax ${e.message}`)}
}
if(fs.existsSync(path.join(web,'questions-completion-runtime.js'))){
  const s=read('questions-completion-runtime.js');
  for(const m of ['LOCAL_TS_KEY','idbPut(html,updatedAt=Date.now())','localStorage.setItem(LOCAL_TS_KEY','localTs>0&&Number(row.updatedAt)>localTs+1000','&quot;','ensureAnswers:enhanceAnswers'])need(s,m,'Arabic completion');
}
if(fs.existsSync(path.join(web,'questions-final-fixes-runtime.js'))){
  const s=read('questions-final-fixes-runtime.js');
  for(const m of ['__ABU_QUESTIONS_FINAL_FIXES_V1__','durableSave','durableReset','dbDelete','LOCAL_TS_KEY','window.saveQuestionDraft=durableSave','window.resetQuestionDraft=durableReset','window.handleAddImage=safeAddImage','40*1024*1024','2600/maxSide','imageSmoothingQuality','refreshOverflowFlags','abu-question-overflow'])need(s,m,'Arabic final fixes');
}
if(fs.existsSync(path.join(web,'questions-en-fixes-runtime.js'))){
  const s=read('questions-en-fixes-runtime.js');
  for(const m of ['__ABU_QUESTIONS_EN_FIXES_V2__','A4P','A4L','A5P','A5L','CUSTOM','A4, A5, or custom size','durableSave','dbDelete','window.saveQuestionDraft=durableSave','window.resetQuestionDraft=reset','window.handleAddImage=addImage','pointerdown','2600/max','40*1024*1024','window.checkAutoFlow=flow','abuEnAnswerBtn','Model answer / notes','Day /','img.style.objectFit','window.saveState?.()','choosePaper'])need(s,m,'English fixes');
}
if(fs.existsSync(path.join(web,'questions-paper-runtime.js'))){
  const p=read('questions-paper-runtime.js');
  for(const m of ['__ABU_QUESTION_PAPER_V3__','A4P','A4L','A5P','A5L','CUSTOM','questions-final-fixes-runtime.js','questions-custom-library-runtime.js','s.async=false'])need(p,m,'Arabic paper loader');
  forbid(p,'A4 فقط','Arabic paper loader');
}
if(fs.existsSync(path.join(web,'productivity-tools-runtime.js'))){
  const p=read('productivity-tools-runtime.js');
  for(const m of ['A4/A5/مخصص','injectEnglishRuntime','questions-en-fixes-runtime.js','injectCurrentQuestionRuntime','script.async=false'])need(p,m,'question host');
  forbid(p,'A4 فقط','question host');
}
if(fs.existsSync(path.join(web,'questions-template-tools-runtime.js'))){
  const s=read('questions-template-tools-runtime.js');
  for(const m of ['async function reload()','await AbuQuestionCompletion.save(false)','const changed=ordered.some','if(changed)ordered.forEach','if(write(a))reload()'])need(s,m,'template tools');
  forbid(s,'setTimeout(()=>location.reload(),120)','template tools');
}
if(fs.existsSync(path.join(web,'questions-templates-runtime.js'))){
  const s=read('questions-templates-runtime.js');
  for(const m of ["year:'٢٠٢٦ - ٢٠٢٧'",'اليوم / ${esc(profile.day',"document.querySelectorAll('.header')","new CustomEvent('abuQuestionSubjectChanged'",'AbuQuestionFinalFixes?.optimizeImage','isPng?\'image/png\':\'image/jpeg\'','return save(PROFILE_KEY,profile)','if(!save(CUSTOM_KEY,next))'])need(s,m,'question templates');
  forbid(s,'attributes:true','question templates observer');
}
if(fs.existsSync(path.join(web,'questions-custom-library-runtime.js'))){
  const s=read('questions-custom-library-runtime.js');
  for(const m of ['__ABU_QUESTION_CUSTOM_LIBRARY_V1__','AbuBassamQuestionTemplatesV2','indexedDB.open','async function migrate()','localStorage.removeItem(LEGACY)','async function saveCurrent()','async function openManage()','bindManagerButton','await clearAll()','location.reload()','api.saveCustom=saveCurrent','api.clearCustom=clearCustom','AbuQuestionCustomLibrary'])need(s,m,'custom template library');
  forbid(s,'CSS.escape','custom template compatibility');
}
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Question final-fix checks passed: Arabic/English A4/A5/custom paper, deterministic drafts, IndexedDB custom templates, safe images, stable touch/undo, safe template management/profile storage and overflow cleanup.\n');
