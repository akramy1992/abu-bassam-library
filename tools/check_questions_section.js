const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const web=path.join(root,'web');
const read=f=>fs.readFileSync(path.join(web,f),'utf8');
const errors=[];
const need=(s,m,l)=>{if(!s.includes(m))errors.push(`${l}: missing ${m}`)};
const forbid=(s,m,l)=>{if(s.includes(m))errors.push(`${l}: forbidden ${m}`)};
for(const f of ['questions-paper-runtime.js','questions-completion-runtime.js','questions-maintenance-runtime.js','questions-ar.html','questions-templates-runtime.js','question-type-runtime.js']){
  if(!fs.existsSync(path.join(web,f)))errors.push(`Missing ${f}`);
}
for(const f of ['questions-paper-runtime.js','questions-completion-runtime.js','questions-maintenance-runtime.js']){
  if(!fs.existsSync(path.join(web,f)))continue;
  try{new vm.Script(read(f),{filename:f})}catch(e){errors.push(`${f}: syntax ${e.message}`)}
}
const paper=read('questions-paper-runtime.js');
for(const m of ['__ABU_QUESTION_PAPER_V3__','A4P','A4L','A5P','A5L','CUSTOM','210,297','297,210','148,210','210,148','مخصص','window.fitToScreen','window.checkAutoFlow','questions-completion-runtime.js','questions-maintenance-runtime.js','window.deletePage=deletePage','s.async=false'])need(paper,m,'paper');
forbid(paper,'A4 فقط','paper current UI');
const completion=read('questions-completion-runtime.js');
for(const m of ['__ABU_QUESTIONS_COMPLETION_V2__','اليوم /','التاريخ /','اسم\\s*التلميذ','abuAnswerToggle','abu-answer-box','indexedDB','AbuBassamQuestionDraftV2','pointerdown','setPointerCapture','stableRebind','removeQuestionLibraryBranding','math1:[','science3:[','general:[','رياضيات الأول — نموذج ١٠','علوم الثالث — نموذج ١٠','نموذج عام ١٠','after!==before','button.on'])need(completion,m,'completion');
for(const m of ['touchstart','touchmove','attributes:true'])forbid(completion,m,'completion pointer stability');
const mathExtras=(completion.match(/رياضيات الأول — نموذج [٤٥٦٧٨٩١٠]+/g)||[]).length;
const scienceExtras=(completion.match(/علوم الثالث — نموذج [٧٨٩١٠]+/g)||[]).length;
const generalExtras=(completion.match(/نموذج عام [٧٨٩١٠]+/g)||[]).length;
if(mathExtras<7)errors.push(`math extras expected >=7 got ${mathExtras}`);
if(scienceExtras<4)errors.push(`science3 extras expected >=4 got ${scienceExtras}`);
if(generalExtras<4)errors.push(`general extras expected >=4 got ${generalExtras}`);
const maintenance=read('questions-maintenance-runtime.js');
for(const m of ['__ABU_QUESTION_MAINTENANCE_V1__','صيانة الأسئلة','إصلاح تلقائي','إدارة نماذجي','missingDay','missingDate','studentName','answerless','checkAutoFlow','AbuQuestionCompletion','ensureAnswers()'])need(maintenance,m,'maintenance');
const ar=read('questions-ar.html');
need(ar,'saveQuestionDraft','questions-ar autosave');need(ar,'printableQuestionHtml','questions-ar print');
if(/اسم\s*التلميذ/.test(ar))errors.push('questions-ar still contains student-name field');
const templates=read('questions-templates-runtime.js');
for(const m of ['Array.from({length:10},(_,i)=>makeScienceTemplate(4,i))','Array.from({length:10},(_,i)=>makeIslamicTemplate(i))'])need(templates,m,'base 10-template subjects');
const types=read('question-type-runtime.js');for(const m of ['blanks','brackets','definitions','enumeration','multiple','truefalse','short'])need(types,m,'question types');
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Question section checks passed: A4/A5/custom paper, deterministic loading, stable touch, durable draft, maintenance, day/date header, answers toggle, no library logo, and 10-model coverage.\n');
