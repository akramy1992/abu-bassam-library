const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..'),web=path.join(root,'web'),errors=[];
const read=f=>fs.readFileSync(path.join(web,f),'utf8');
const need=(s,m,l)=>{if(!s.includes(m))errors.push(`${l}: missing ${m}`)};
const forbid=(s,m,l)=>{if(s.includes(m))errors.push(`${l}: forbidden ${m}`)};
const required=['questions-paper-runtime.js','questions-completion-runtime.js','questions-maintenance-runtime.js','questions-final-fixes-runtime.js','questions-ar.html','questions-templates-runtime.js','question-type-runtime.js'];
for(const f of required)if(!fs.existsSync(path.join(web,f)))errors.push(`Missing ${f}`);
for(const f of ['questions-paper-runtime.js','questions-completion-runtime.js','questions-maintenance-runtime.js','questions-final-fixes-runtime.js']){if(!fs.existsSync(path.join(web,f)))continue;try{new vm.Script(read(f),{filename:f})}catch(e){errors.push(`${f}: syntax ${e.message}`)}}
const paper=read('questions-paper-runtime.js');
for(const m of ['__ABU_QUESTION_PAPER_V3__','__ABU_QUESTION_COMPLETION_LOAD_GUARD_V1__','A4P','A4L','A5P','A5L','value="custom"','210,297','148,210','80,500','window.fitToScreen','window.checkAutoFlow','questions-completion-runtime.js','questions-maintenance-runtime.js','questions-final-fixes-runtime.js','window.deletePage=deletePage','s.async=false','loadCompletionGuarded','delete opts.characterData',"listener?.name==='queueDraft'",'EventTarget.prototype.addEventListener=nativeAdd'])need(paper,m,'paper');
forbid(paper,'A4 فقط','paper');
const completion=read('questions-completion-runtime.js');
for(const m of ['__ABU_QUESTIONS_COMPLETION_V2__','اليوم /','التاريخ /','اسم\\s*التلميذ','abuAnswerToggle','abu-answer-box','indexedDB','AbuBassamQuestionDraftV2','pointerdown','setPointerCapture','stableRebind','removeQuestionLibraryBranding','math1:[','science3:[','general:[','رياضيات الأول — نموذج ١٠','علوم الثالث — نموذج ١٠','نموذج عام ١٠','after!==before','button.on'])need(completion,m,'completion');
for(const m of ['touchstart','touchmove','attributes:true'])forbid(completion,m,'completion pointer stability');
const finalFix=read('questions-final-fixes-runtime.js');
for(const m of ['__ABU_QUESTIONS_FINAL_FIXES_V1__','__ABU_QUESTION_SINGLE_AUTOSAVE_V1__','durableSave','window.scheduleQuestionDraft=schedule','window.handleAddImage=safeAddImage','canvas.width=1;canvas.height=1'])need(finalFix,m,'final question fixes');
forbid(finalFix,'new MutationObserver','final question fixes autosave must not add another DOM observer');
const maintenance=read('questions-maintenance-runtime.js');for(const m of ['__ABU_QUESTION_MAINTENANCE_V1__','صيانة الأسئلة','إصلاح تلقائي','إدارة نماذجي','missingDay','missingDate','studentName','answerless','checkAutoFlow','AbuQuestionCompletion','ensureAnswers()'])need(maintenance,m,'maintenance');
const ar=read('questions-ar.html');need(ar,'saveQuestionDraft','questions-ar autosave');need(ar,'printableQuestionHtml','questions-ar print');if(/اسم\s*التلميذ/.test(ar))errors.push('questions-ar still contains student-name field');
const templates=read('questions-templates-runtime.js');for(const m of ['Array.from({length:10},(_,i)=>makeScienceTemplate(4,i))','Array.from({length:10},(_,i)=>makeIslamicTemplate(i))','التاريخ / ${esc(profile.date','اليوم / ${esc(profile.day'])need(templates,m,'base templates');
const types=read('question-type-runtime.js');for(const m of ['blanks','brackets','definitions','enumeration','multiple','truefalse','short'])need(types,m,'question types');
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Question section checks passed: A4/A5/custom paper, deterministic guarded completion loading, native pointer drag, single durable autosave path, maintenance, day/date header, answers toggle, no student-name field, and template coverage.\n');
