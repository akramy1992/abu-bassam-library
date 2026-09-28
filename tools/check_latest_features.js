const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),web=path.join(root,'web'),errors=[];
const read=f=>fs.readFileSync(path.join(web,f),'utf8');
const rootRead=f=>fs.readFileSync(path.join(root,f),'utf8');
const need=(s,m,l)=>{if(!s.includes(m))errors.push(`${l}: missing ${m}`)};
const forbid=(s,m,l)=>{if(s.includes(m))errors.push(`${l}: forbidden ${m}`)};
const files=['device-name-runtime.js','feature-recovery-runtime.js','productivity-tools-runtime.js','card-template-library.js','child-card-templates-runtime.js','card-models-runtime.js','standalone-card-models-runtime.js','strict-workflow-runtime.js','login-throttle-fix-runtime.js','login-input-direction-runtime.js','ration-card.html','mawkib-cards.html','thanks-letter.html','certificates.html','envelopes.html','design-studio-runtime.js','envelope-agreement-runtime.js'];
for(const f of files)if(!fs.existsSync(path.join(web,f)))errors.push(`Missing latest feature asset: ${f}`);
for(const removed of ['questions-ar.html','questions-en.html','questions-paper-runtime.js','questions-final-fixes-runtime.js','questions-gesture-runtime.js','question-type-runtime.js','image-compressor.html'])if(fs.existsSync(path.join(web,removed)))errors.push(`Removed section asset returned: ${removed}`);
const productivity=read('productivity-tools-runtime.js');for(const m of ['a4-card-sheet-editor-v2-runtime.js','photo-print-advanced-runtime.js','document-vault-advanced-runtime.js'])need(productivity,m,'core productivity loader');for(const m of ['questionsCenter','compressorCenter','questions-ar.html','questions-en.html','image-compressor.html','ensureQuestionFrame','ensureCompressorFrame'])forbid(productivity,m,'removed sections');
for(const f of files.filter(x=>x.endsWith('.js'))){try{new vm.Script(read(f),{filename:f})}catch(e){errors.push(`${f}: ${e.message}`)}}
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Latest feature audit passed: questions and image-compressor sections are removed while the remaining core features are still present.\n');
