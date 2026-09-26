const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..'),web=path.join(root,'web'),errors=[];
const read=name=>fs.readFileSync(path.join(web,name),'utf8');
const rootRead=name=>fs.readFileSync(path.join(root,name),'utf8');
const need=(src,m,label)=>{if(!src.includes(m))errors.push(`${label}: missing ${m}`)};
const forbid=(src,m,label)=>{if(src.includes(m))errors.push(`${label}: forbidden ${m}`)};
const required=[
'index.html','cards-studio-runtime.js','national-id-runtime.js','document-vault-runtime.js','app-settings-runtime.js','typography-runtime.js','secure-sync-runtime.js','device-name-runtime.js','feature-recovery-runtime.js','strict-workflow-runtime.js','standalone-fold-runtime.js','child-card-templates-runtime.js','card-models-runtime.js','standalone-card-models-runtime.js','device-reconcile-runtime.js','app-security-runtime.js','security-extras-runtime.js','permission-guard-runtime.js','login-throttle-fix-runtime.js','login-input-direction-runtime.js','productivity-tools-runtime.js','questions-templates-runtime.js','question-type-runtime.js','questions-template-tools-runtime.js','questions-paper-runtime.js','questions-gesture-runtime.js','questions-completion-runtime.js','questions-maintenance-runtime.js','questions-final-fixes-runtime.js','questions-en-fixes-runtime.js','design-studio-runtime.js','envelopes.html','envelope-preload-runtime.js','envelope-tools-runtime.js','envelope-agreement-runtime.js','certificates.html','student-thanks-cards.html','questions-ar.html','questions-en.html','image-compressor.html','card-template-library.js','card-templates-v2.html','ration-card.html','mawkib-cards.html','thanks-letter.html','supabase-2.58.0.js','qrcode.js','jszip.min.js','fonts/Cairo-Regular.ttf','fonts/Cairo-Bold.ttf','fonts/Tajawal-Regular.ttf','fonts/Tajawal-Bold.ttf'
];
required.forEach(f=>{if(!fs.existsSync(path.join(web,f)))errors.push(`Missing web asset: ${f}`)});

for(const filename of fs.readdirSync(web).filter(n=>n.endsWith('.js'))){try{new vm.Script(read(filename),{filename})}catch(e){errors.push(`${filename}: ${e.message}`)}}
for(const filename of ['index.html','questions-ar.html','questions-en.html','image-compressor.html','envelopes.html','certificates.html','student-thanks-cards.html','card-templates-v2.html','card-templates.html','ration-card.html','mawkib-cards.html','thanks-letter.html']){
 if(!fs.existsSync(path.join(web,filename)))continue;const source=read(filename),scripts=/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;let match,index=0;while((match=scripts.exec(source))){index++;if(!match[1].trim())continue;try{new vm.Script(match[1],{filename:`${filename}#${index}`})}catch(e){errors.push(`${filename} script ${index}: ${e.message}`)}}
}

const index=read('index.html');for(const ref of ['supabase-2.58.0.js','secure-sync-runtime.js','device-name-runtime.js','productivity-tools-runtime.js'])need(index,`src="${ref}"`,'index.html');
const device=read('device-name-runtime.js');for(const m of ['feature-recovery-runtime.js','child-card-templates-runtime.js','card-models-runtime.js','standalone-card-models-runtime.js','strict-workflow-runtime.js','standalone-fold-runtime.js','device-reconcile-runtime.js','app-security-runtime.js','security-extras-runtime.js','login-throttle-fix-runtime.js','login-input-direction-runtime.js','dismissSplash','installSplashWatchdog','1800'])need(device,m,'device-name-runtime.js');
for(const m of ['global-flex-runtime.js','loadGlobalFlex','abuGlobalFlexRuntime'])forbid(device,m,'device-name-runtime.js');

const productivity=read('productivity-tools-runtime.js');for(const m of ['صياغة الأسئلة','questionsFrame','src="about:blank"','data-src="questions-ar.html"','compressorFrame','data-src="image-compressor.html"','ensureQuestionFrame','ensureCompressorFrame','question-type-runtime.js','A4/A5/مخصص','questions-en-fixes-runtime.js'])need(productivity,m,'productivity-tools-runtime.js');
for(const m of ['abuModeEnvelope','abuPaneEnvelope','envelopeFrame','src="envelopes.html"','الأسئلة والظروف','studioMode','A4 فقط'])forbid(productivity,m,'productivity-tools-runtime.js');

const recovery=read('feature-recovery-runtime.js');for(const m of ['abuCardsTemplatesBtn','abuSectionTemplatesBtn','openSectionTemplates','card-templates-v2.html#',"addCardTool(types,'ration'","addCardTool(types,'mawkib'","addCardTool(types,'envelope'","addCardTool(types,'certificate'","addCardTool(types,'thanks'",'envelopes.html','certificates.html','thanks-letter.html','top:76px','width:52px','height:52px','scheduleRecovery'])need(recovery,m,'feature-recovery-runtime.js');
for(const section of ['personal','child','login','wifi','qr','ration','mawkib','envelope','certificate','thanks'])need(recovery,`${section}:{title:`,`feature-recovery-runtime.js section ${section}`);
forbid(recovery,"types.querySelector('[data-type=\"envelope\"]')?.remove()",'feature-recovery-runtime.js');

const library=read('card-template-library.js');
const count=id=>{const m=library.match(new RegExp(`id:'${id}'[\\s\\S]*?models:\\[([\\s\\S]*?)\\]`));return m?(m[1].match(/\{id:/g)||[]).length:0};
for(const [id,n] of [['personal',5],['child',10],['login',10],['wifi',3],['qr',4],['ration',10],['mawkib',4],['student-thanks',10],['envelope',9],['certificate',10],['thanks',6]])if(count(id)!==n)errors.push(`${id}: expected ${n} templates, got ${count(id)}`);
for(const m of ['AbuBassamCardTemplateLibrary','باج الروضة والمدرسة','البطاقة التموينية','كروت المواكب الحسينية','الشكر والتقدير للتلاميذ','صناعة الظرف','شهادات التقدير','كتاب الشكر والتقدير','personal-5','child-future','login-10','wifi-3','qr-4','env-9','cert-10'])need(library,m,'card-template-library.js');

const child=read('child-card-templates-runtime.js');for(const m of ['child-clouds','child-hearts','child-nature','child-space','child-rainbow','child-garden','child-shapes','child-balloons','child-board','child-future','templateCss'])need(child,m,'child-card-templates-runtime.js');
const cardModels=read('card-models-runtime.js');for(const m of ['personal-5','login-10','wifi-3','qr-4','cssPersonal','cssLogin','cssWifi','cssQr','printCss'])need(cardModels,m,'card-models-runtime.js');
const standalone=read('standalone-card-models-runtime.js');for(const m of ['__ABU_STANDALONE_CARD_MODELS_V2__','RATION_IDS','MAWKIB_IDS','__ABU_RATION_EXPORT_FIX_V1__','installRationExports'])need(standalone,m,'standalone-card-models-runtime.js');for(const m of ["o.value!=='t1'",'t5#front','MAWKIB_EXTRA_CSS'])forbid(standalone,m,'standalone-card-models-runtime.js');
const strict=read('strict-workflow-runtime.js');for(const m of ['RATION_CSS','.t10#front','MAWKIB_CSS','.t4#front'])need(strict,m,'strict-workflow-runtime.js');
const thanks=read('thanks-letter.html');for(const m of ['1 — الإطار الملكي','2 — الشريط الجانبي','3 — الوسام المركزي','4 — الترويسة الأكاديمية','5 — اللوحة الهندسية','6 — الرسمي المبسط'])need(thanks,m,'thanks-letter.html');
const studio=read('design-studio-runtime.js');for(const m of ['Array.from({length:9','ENVELOPE_PRESETS','225x115','DL —','C6 —','#10 —','saveAsTemplate','applyCrop','replaceImage','abuDesignPrint','abuDesignPdf','abuDesignSaveImage'])need(studio,m,'design-studio-runtime.js');
const envAgreement=read('envelope-agreement-runtime.js');for(const m of ['REMOVED_KEY','markRemoved(marker)','clearRemoved()','DesignStudio.remove=function','dataset.agreedField'])need(envAgreement,m,'envelope-agreement-runtime.js');

const gestures=read('questions-gesture-runtime.js');need(gestures,'__ABU_QUESTION_GESTURES_DISABLED__','questions-gesture-runtime.js');for(const m of ['touchstart','touchmove','pointerdown','pointermove','abuScale','abuMoveX','abuMoveY'])forbid(gestures,m,'questions-gesture-runtime.js');
const paper=read('questions-paper-runtime.js');for(const m of ['__ABU_QUESTION_PAPER_V3__','A4P','A4L','A5P','A5L','CUSTOM','210,297','297,210','148,210','210,148','مخصص','window.fitToScreen','window.checkAutoFlow'])need(paper,m,'questions-paper-runtime.js');for(const m of ['A4 فقط','questions-gesture-runtime.js'])forbid(paper,m,'questions-paper-runtime.js');
const qtypes=read('question-type-runtime.js');for(const m of ['blanks','brackets','definitions','enumeration','points','multiple','truefalse','short','المستوى السهل','المستوى المتوسط','المستوى الصعب','التسلسل','الحفظ','الحديث الشريف','التلاوة','العقائد والعبادات','المعاني','السيرة','الآداب الإسلامية'])need(qtypes,m,'question-type-runtime.js');

const loginFix=read('login-throttle-fix-runtime.js');for(const m of ['credentialFailure(message)','deviceOrPostAuthFailure(message)','recordCredentialFailure','legacyInstalled','loginBusy','attributeFilter'])need(loginFix,m,'login-throttle-fix-runtime.js');
const loginDir=read('login-input-direction-runtime.js');for(const m of ["setAttribute('dir','ltr')","setAttribute('lang','en')","setAttribute('autocapitalize','off')","setAttribute('spellcheck','false')",'unicodeBidi'])need(loginDir,m,'login-input-direction-runtime.js');
const security=read('app-security-runtime.js');for(const m of ['MAIN_USERNAME','MAX_DEVICES=5','secureGet','secureSet','biometricStatus','biometricAuth','OFFLINE_GRACE_MS'])need(security,m,'app-security-runtime.js');
const reconcile=read('device-reconcile-runtime.js');for(const m of ['dedupe(rows)','CURRENT_ID','displayName(row)','هذا الجهاز','تسمية الجهاز','abu_bassam_devices','onSessionChanged'])need(reconcile,m,'device-reconcile-runtime.js');
const migration1=rootRead('supabase/migrations/202609210001_device_reconciliation.sql');for(const m of ['abu_bassam_register_device','abu_bassam_touch_device','abu_bassam_manage_device','DEVICE_LIMIT_REACHED'])need(migration1,m,'device reconciliation migration');
const migration2=rootRead('supabase/migrations/202609210002_allow_device_secret_rotation.sql');for(const m of ['abu_bassam_register_device','secret_hash=v_hash','active=true','DEVICE_NOT_AUTHORIZED'])need(migration2,m,'device secret rotation migration');

const native=rootRead('index.js');for(const m of ['expo-local-authentication','expo-secure-store','ANDROID_BRIDGE','BackHandler.exitApp','deviceInfo','STARTUP_WATCHDOG_MS',"originWhitelist={['file://*','about:*']}",'mixedContentMode="never"','onShouldStartLoadWithRequest','onLoadProgress'])need(native,m,'index.js');for(const m of ["originWhitelist={['*']}",'mixedContentMode="always"'])forbid(native,m,'index.js');
const patch=rootRead('scripts/patch-startup-stability.mjs');for(const m of ['STARTUP_WATCHDOG_MS','onLoadProgress','setWebReady(true)','onShouldStartLoadWithRequest','scheduleRecovery'])need(patch,m,'startup patch');
const workflow=rootRead('.github/workflows/android.yml');for(const m of ['contents: read','npm ci --no-audit --no-fund','assembleRelease','assets/index.android.bundle','apksigner','sha256sum','Build standalone APK with embedded JS bundle','Verify standalone APK contains React Native bundle'])need(workflow,m,'android workflow');for(const m of ['assembleDebug --no-daemon','contents: write','git push','Synchronize package lock'])forbid(workflow,m,'android workflow');

const projectText=fs.readdirSync(web).filter(n=>/\.(?:html|js)$/i.test(n)&&n!=='supabase-2.58.0.js').map(n=>read(n)).join('\n');
for(const forbidden of ['api.telegram.org/bot','service_role','sb_secret_','BEGIN PRIVATE KEY'])if(projectText.includes(forbidden))errors.push(`Forbidden secret marker found: ${forbidden}`);
if(/Ahmed Hassan|أحمد حسن|facebook\.com/i.test(projectText))errors.push('Project contains previous author/social link');
if(!projectText.includes('أكرم حاتم الغزالي')&&!projectText.includes('Akram Hatem Al-Ghazali'))errors.push('Approved programmer identity is missing');

if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write(`Project checks passed (${required.length} required assets): startup safety, local-only navigation, approved card model counts, A4/A5/custom questions, login/device fixes, no legacy flex/gestures, deterministic read-only Android CI, and syntax/security checks.\n`);
