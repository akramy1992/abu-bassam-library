const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..'),web=path.join(root,'web'),errors=[];
const read=name=>fs.readFileSync(path.join(web,name),'utf8');
const need=(src,m,label)=>{if(!src.includes(m))errors.push(`${label}: missing ${m}`)};
const forbid=(src,m,label)=>{if(src.includes(m))errors.push(`${label}: forbidden ${m}`)};
const required=[
  'index.html','cards-studio-runtime.js','national-id-runtime.js','national-id-documents.html','document-vault-runtime.js','app-settings-runtime.js','typography-runtime.js','secure-sync-runtime.js','device-name-runtime.js','feature-recovery-runtime.js','strict-workflow-runtime.js','standalone-fold-runtime.js','child-card-templates-runtime.js','card-models-runtime.js','standalone-card-models-runtime.js','device-reconcile-runtime.js','app-security-runtime.js','security-extras-runtime.js','security-bootstrap-guard-runtime.js','fail-closed-runtime.js','permission-guard-runtime.js','permission-section-guards-runtime.js','customer-permissions-hardening-runtime.js','login-throttle-fix-runtime.js','login-input-direction-runtime.js','password-policy-runtime.js','productivity-tools-runtime.js','backup-center-runtime.js','account-center-runtime.js','account-recovery-hardening-runtime.js','app-update-runtime.js','notification-excel-runtime.js','mediapipe-pin-runtime.js','design-studio-runtime.js','envelopes.html','envelope-preload-runtime.js','envelope-tools-runtime.js','envelope-agreement-runtime.js','certificates.html','student-thanks-cards.html','card-template-library.js','card-templates-v2.html','ration-card.html','mawkib-cards.html','thanks-letter.html','image-compressor.html','question-type-runtime.js','questions-ar.html','questions-completion-runtime.js','questions-custom-library-runtime.js','questions-en-fixes-runtime.js','questions-en.html','questions-final-fixes-runtime.js','questions-gesture-runtime.js','questions-maintenance-runtime.js','questions-paper-runtime.js','questions-template-tools-runtime.js','questions-templates-runtime.js','supabase-2.58.0.js','qrcode.js','jszip.min.js','fonts/Cairo-Regular.ttf','fonts/Cairo-Bold.ttf','fonts/Tajawal-Regular.ttf','fonts/Tajawal-Bold.ttf'
];
required.forEach(f=>{if(!fs.existsSync(path.join(web,f)))errors.push(`Missing web asset: ${f}`)});
for(const filename of fs.readdirSync(web).filter(n=>n.endsWith('.js'))){try{new vm.Script(read(filename),{filename})}catch(e){errors.push(`${filename}: ${e.message}`)}}
const productivity=read('productivity-tools-runtime.js');
for(const m of ['a4-card-sheet-editor-v2-runtime.js','photo-print-advanced-runtime.js','document-vault-advanced-runtime.js','questionsCenter','compressorCenter','questions-ar.html','questions-en.html','image-compressor.html','ensureQuestionFrame','ensureCompressorFrame','صياغة الأسئلة','ضغط الصور'])need(productivity,m,'productivity-tools-runtime.js');
const national=read('national-id-runtime.js');
for(const m of ['tabQuestions','tabCompressor','questionsCenter','compressorCenter','national-id-documents.html','AbuBassamProductivity'])need(national,m,'national-id-runtime.js');
forbid(national,'residence-card.html','national-id-runtime.js');
const device=read('device-name-runtime.js');
for(const m of ['abuBassamLockedDeviceIdV5','backup-center-runtime.js','account-center-runtime.js','app-update-runtime.js','security-bootstrap-guard-runtime.js','fail-closed-runtime.js'])need(device,m,'device-name-runtime.js');
for(const obsolete of ['residence-card.html','a4-card-sheet-editor-runtime.js'])if(fs.existsSync(path.join(web,obsolete)))errors.push(`Obsolete web asset returned: ${obsolete}`);
const gesture=read('questions-gesture-runtime.js');
for(const bad of ['touchstart','touchmove','stopImmediatePropagation'])forbid(gesture,bad,'questions-gesture-runtime.js');
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write(`Project checks passed (${required.length} required assets): current source contains questions, image compressor, national-document integration, backup/account/update runtimes and no obsolete residence/A4-v1 files.\n`);
