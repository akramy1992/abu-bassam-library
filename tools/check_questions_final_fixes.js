const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..'),web=path.join(root,'web'),errors=[];
const read=f=>fs.readFileSync(path.join(web,f),'utf8');
const need=(s,m,l)=>{if(!s.includes(m))errors.push(`${l}: missing ${m}`)};
const forbid=(s,m,l)=>{if(s.includes(m))errors.push(`${l}: forbidden ${m}`)};
const files=['questions-completion-runtime.js','questions-final-fixes-runtime.js','questions-en-fixes-runtime.js','questions-paper-runtime.js','productivity-tools-runtime.js','questions-template-tools-runtime.js','questions-templates-runtime.js','questions-custom-library-runtime.js'];
for(const f of files){const p=path.join(web,f);if(!fs.existsSync(p)){errors.push(`Missing ${f}`);continue}try{new vm.Script(read(f),{filename:f})}catch(e){errors.push(`${f}: syntax ${e.message}`)}}
const ar=read('questions-paper-runtime.js');for(const m of ['__ABU_QUESTION_PAPER_V3__','__ABU_QUESTION_COMPLETION_LOAD_GUARD_V1__','A4P','A4L','A5P','A5L','value="custom"','A4 وA5 أو مقاس مخصص','80,500','window.fitToScreen','window.checkAutoFlow','loadCompletionGuarded','delete opts.characterData',"listener?.name==='queueDraft'",'EventTarget.prototype.addEventListener=nativeAdd'])need(ar,m,'Arabic paper');forbid(ar,'A4 فقط','Arabic paper');
const en=read('questions-en-fixes-runtime.js');for(const m of ['__ABU_QUESTIONS_EN_FIXES_V2__','A4P','A4L','A5P','A5L','Custom size','Model answer / notes','Day /','durableSave','dbDelete','window.handleAddImage=addImage','2600/max','40*1024*1024','window.checkAutoFlow=flow'])need(en,m,'English fixes');forbid(en,'A4 only','English fixes');
const finalFix=read('questions-final-fixes-runtime.js');for(const m of ['__ABU_QUESTION_SINGLE_AUTOSAVE_V1__','durableSave','durableReset','dbDelete','window.scheduleQuestionDraft=schedule','window.handleAddImage=safeAddImage','40*1024*1024','2600/maxSide','imageSmoothingQuality','refreshOverflowFlags','canvas.width=1;canvas.height=1'])need(finalFix,m,'Arabic final fixes');forbid(finalFix,'new MutationObserver','Arabic final fixes duplicate DOM observer');
const templates=read('questions-templates-runtime.js');for(const m of ["year:'٢٠٢٦ - ٢٠٢٧'",'التاريخ / ${esc(profile.date','اليوم / ${esc(profile.day',"document.querySelectorAll('.header')",'أكرم حاتم الغزالي'])need(templates,m,'question templates');
const custom=read('questions-custom-library-runtime.js');for(const m of ['indexedDB.open','async function migrate()','async function saveCurrent()','api.saveCustom=saveCurrent','AbuQuestionCustomLibrary'])need(custom,m,'custom library');
const host=read('productivity-tools-runtime.js');for(const m of ['questionsFrame','data-src="questions-ar.html"','questions-en-fixes-runtime.js','script.async=false','const proto=win.EventTarget?.prototype',"this?.id==='pages-container'&&type==='input'&&listener?.name==='schedule'",'proto.addEventListener=nativeAdd'])need(host,m,'question host');
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Question checks passed: Arabic/English A4, A5 and custom paper, guarded completion loading, de-duplicated autosave listeners, durable drafts, safe images, answer notes, date/day headers, custom templates, and stable flow.\n');
