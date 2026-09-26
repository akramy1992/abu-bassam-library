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
for(const marker of ['src="about:blank"','data-src="questions-ar.html"','data-src="image-compressor.html"','ensureQuestionFrame','ensureCompressorFrame'])need(productivity,marker,'startup lazy loading');
for(const marker of ['envelopeFrame','abuModeEnvelope','abuPaneEnvelope','src="envelopes.html"'])forbid(productivity,marker,'questions-only section');

const recovery=read('feature-recovery-runtime.js');
for(const marker of ["addCardTool(types,'envelope'",'scheduleRecovery','top:76px','width:52px','height:52px'])need(recovery,marker,'cards/startup UI');

const device=read('device-name-runtime.js');
for(const marker of ['dismissSplash','installSplashWatchdog','setTimeout(dismissSplash,1800)','login-throttle-fix-runtime.js','login-input-direction-runtime.js'])need(device,marker,'startup/login guards');

for(const file of ['envelope-agreement-runtime.js','productivity-tools-runtime.js','feature-recovery-runtime.js','device-name-runtime.js']){
  try{new vm.Script(read(file),{filename:file})}catch(error){errors.push(`${file}: ${error.message}`)}
}

if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Runtime regression checks passed: persistent removable optional envelope fields, lazy startup frames, Cards envelope placement, splash watchdog, and login guards.\n');
