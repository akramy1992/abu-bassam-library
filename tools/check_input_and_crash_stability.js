'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),web=path.join(root,'web'),errors=[];
const names=fs.readdirSync(web).filter(n=>/\.(js|html)$/i.test(n));
const knownLegacyObservers=new Set([
  'account-center-runtime.js','admin-permissions-runtime.js','app-security-runtime.js',
  'backup-center-runtime.js','customer-documents-runtime.js','customer-documents-workflow-runtime.js',
  'customer-permissions-hardening-runtime.js','device-reconcile-runtime.js','notification-excel-runtime.js',
  'operation-log-corrections-runtime.js','question-type-runtime.js','security-extras-runtime.js',
  'security-hardening-runtime.js','settings-enhancements-runtime.js'
]);
const legacyDetected=[];
for(const name of names){
  const s=fs.readFileSync(path.join(web,name),'utf8');
  // Never allow a permanent capture-phase touch interceptor on document.
  if(/document\.addEventListener\(\s*['"]touch(?:start|move|end)['"]\s*,[\s\S]{0,200}?,\s*true\s*\)/.test(s))
    errors.push(name+': document-wide capture touch interceptor');
  if(/new\s+(?:window\.|win\.)?MutationObserver\([\s\S]{0,700}?\.observe\(document\.(?:documentElement|body),\{[^}]*subtree\s*:\s*true/i.test(s))
    (knownLegacyObservers.has(name)?legacyDetected:errors).push(name+': document-wide MutationObserver');
}
const get=name=>fs.readFileSync(path.join(web,name),'utf8');
const native=fs.readFileSync(path.join(root,'index.js'),'utf8');
const cards=get('cards-studio-runtime.js'),national=get('national-id-runtime.js'),productivity=get('productivity-tools-runtime.js'),permission=get('permission-section-guards-runtime.js');
for(const [s,marker,label] of [
  [cards,"addEventListener('pointerdown'",'cards pointerdown'],
  [cards,"addEventListener('pointermove'",'cards pointermove'],
  [national,'setupZoomTouch','local national ID zoom handler'],
  [national,"o.addEventListener('touchstart'",'national ID overlay-only touch'],
  [productivity,'ensureQuestionFrame','lazy question iframe'],
  [productivity,'ensureCompressorFrame','lazy compressor iframe'],
  [productivity,'src="about:blank"','deferred iframe source'],
  [native,'webInstanceKey','native renderer instance key'],
  [native,'recoverWebRenderer','native renderer recovery'],
  [native,'onRenderProcessGone','Android renderer crash callback'],
  [native,'onContentProcessDidTerminate','iOS renderer termination callback'],
  [permission,'function guardDisabled','reversible permission guard'],
  [permission,'function guardImageLabel','reversible image input label guard'],
  [permission,'#cardsCenter,.cs-modal,.ds-sheet,#abuRecoveryModal','scoped cards interceptor']
])if(!s.includes(marker))errors.push('missing '+label);
if(permission.includes('new MutationObserver'))errors.push('permissions must not observe the whole DOM');
if(permission.includes('[class*="card" i]'))errors.push('generic settings cards must not be intercepted as card-editing actions');
if(national.includes('residence-card.html'))errors.push('obsolete separate national document route');
for(const file of ['questions-ar.html','questions-en.html']){
  const code=get(file);
  // Question editor temporarily attaches drag listeners but must release them.
  for(const marker of ["document.addEventListener('touchmove', dragMove","document.removeEventListener('touchmove', dragMove)","document.removeEventListener('touchend', dragEnd)"])
    if(!code.includes(marker))errors.push(file+': drag must attach AND clean up listener '+marker);
}
if(legacyDetected.length)console.warn('REQUIRES DEVICE/PERFORMANCE REVIEW: '+legacyDetected.length+' pre-existing document-wide observers remain: '+legacyDetected.join('; '));
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Input/crash stability: scoped native overlays and permission guards, reversible states, drag listener cleanup, lazy iframes, and WebView recovery passed static checks.');
