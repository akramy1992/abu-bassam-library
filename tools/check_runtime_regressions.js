const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const web=path.join(root,'web');
const read=(name)=>fs.readFileSync(path.join(web,name),'utf8');
const errors=[];
const need=(src,marker,label)=>{if(!src.includes(marker))errors.push(`${label}: missing ${marker}`)};
const forbid=(src,marker,label)=>{if(src.includes(marker))errors.push(`${label}: forbidden ${marker}`)};

const envelope=read('envelope-agreement-runtime.js');
for(const marker of ['__ABU_ENVELOPE_AGREEMENT_V3__','REMOVED_KEY','markRemoved','clearRemoved','patchTemplateApply','DesignStudio.remove=function','DesignStudio.reset=function','اليوم والتاريخ اختياريان ويمكن حذفهما'])need(envelope,marker,'envelope optional fields');
forbid(envelope,'new MutationObserver','envelope optional fields');

const productivity=read('productivity-tools-runtime.js');
for(const marker of ['a4-card-sheet-editor-v2-runtime.js','photo-print-advanced-runtime.js','document-vault-advanced-runtime.js'])need(productivity,marker,'core tools loader');
for(const marker of ['questionsCenter','compressorCenter','questions-ar.html','image-compressor.html','ensureQuestionFrame','ensureCompressorFrame','purgeEnglishQuestionData'])need(productivity,marker,'active Arabic questions/compressor');forbid(productivity,'questions-en.html','English route retired');
for(const active of ['questions-ar.html','questions-paper-runtime.js','questions-final-fixes-runtime.js','questions-gesture-runtime.js','question-type-runtime.js','image-compressor.html'])if(!fs.existsSync(path.join(web,active)))errors.push('Active section missing: '+active);
for(const retired of ['questions-en.html','questions-en-fixes-runtime.js'])if(fs.existsSync(path.join(web,retired)))errors.push('English question file restored: '+retired);

const recovery=read('feature-recovery-runtime.js');
for(const marker of ["addCardTool(types,'envelope'",'scheduleRecovery','top:max(12px','width:52px','height:52px'])need(recovery,marker,'cards/startup UI');
const appSettings=read('app-settings-runtime.js');
forbid(appSettings,"button.textContent='⚙️'",'settings shortcut must not replace search');
const arabic=read('questions-ar.html');
for(const marker of ["addEventListener('pointerdown'","addEventListener('pointercancel'","setPointerCapture(pointerId)"])need(arabic,marker,'scoped gestures');
const device=read('device-name-runtime.js');
for(const marker of ['dismissSplash','installSplashWatchdog','setTimeout(dismissSplash,1800)','login-throttle-fix-runtime.js','login-input-direction-runtime.js'])need(device,marker,'startup/login guards');
for(const file of ['envelope-agreement-runtime.js','productivity-tools-runtime.js','feature-recovery-runtime.js','device-name-runtime.js']){try{new vm.Script(read(file),{filename:file})}catch(error){errors.push(`${file}: ${error.message}`)}}
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Runtime regression checks passed: Arabic questions/image compression retained; English removed; header shortcuts fixed.\n');
