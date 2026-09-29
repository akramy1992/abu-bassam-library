const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),web=path.join(root,'web'),errors=[];
const files=fs.readdirSync(web).filter(n=>/\.(js|html)$/i.test(n));
for(const f of files){
  const s=fs.readFileSync(path.join(web,f),'utf8');
  for(const token of ['touchstart','touchmove','touchend','stopImmediatePropagation'])if(s.includes(token))errors.push(`${f}: forbidden legacy/global input token ${token}`);
  if(/new\s+(?:window\.|win\.)?MutationObserver\([\s\S]{0,700}?\.observe\(document\.(?:documentElement|body),\{[^}]*subtree\s*:\s*true/i.test(s))errors.push(`${f}: document-wide MutationObserver`);
}
const known=['admin-permissions-runtime.js','cards-hardening-runtime.js','cards-hardening-fixes-runtime.js','document-vault-hardening-runtime.js','permission-guard-runtime.js','permission-section-guards-runtime.js','security-extras-runtime.js','login-throttle-fix-runtime.js','feature-recovery-runtime.js','app-security-runtime.js'];
for(const f of known){const s=fs.readFileSync(path.join(web,f),'utf8');if(/document\.addEventListener\(['"](?:click|pointerdown|touchstart|touchmove)['"][\s\S]{0,800}?,\s*true\)/.test(s))errors.push(`${f}: document-level capture input interceptor`)}
const cards=fs.readFileSync(path.join(web,'cards-studio-runtime.js'),'utf8');
const nat=fs.readFileSync(path.join(web,'national-id-runtime.js'),'utf8');
const productivity=fs.readFileSync(path.join(web,'productivity-tools-runtime.js'),'utf8');
const native=fs.readFileSync(path.join(root,'index.js'),'utf8');
for(const [s,t,l] of [[cards,"addEventListener('pointerdown'",'cards pointerdown'],[cards,"addEventListener('pointermove'",'cards pointermove'],[nat,"addEventListener('pointerdown'",'national pointerdown'],[nat,"addEventListener('pointermove'",'national pointermove']])if(!s.includes(t))errors.push(`missing ${l}`);
for(const t of ['webInstanceKey','recoverWebRenderer','onRenderProcessGone','onContentProcessDidTerminate'])if(!native.includes(t))errors.push(`native crash recovery missing ${t}`);
for(const t of ['tabQuestions','tabCompressor','questionsCenter','compressorCenter','national-id-documents.html'])if(!nat.includes(t))errors.push(`national navigation missing restored ${t}`);
if(nat.includes('residence-card.html'))errors.push('national-id-runtime.js: obsolete residence-card.html route returned');
for(const t of ['ensureQuestionFrame','ensureCompressorFrame','src="about:blank"'])if(!productivity.includes(t))errors.push(`productivity lazy loading missing ${t}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Input/crash stability audit passed: legacy touch handlers and stopImmediatePropagation are absent, document-wide observers/capture interceptors are rejected, card/national gestures use Pointer Events, restored questions/compressor sections remain lazy-loaded, national documents use the integrated route, and WebView renderer recovery is wired.');
