const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),errors=[];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const security=read('web/app-security-runtime.js'),recovery=read('web/feature-recovery-runtime.js'),index=read('web/index.html'),native=read('index.js');
for(const [src,token,label] of [[security,'stopImmediatePropagation','security global click interception'],[security,'MutationObserver(','security global DOM observer'],[recovery,'restoreNativeTouch','runtime touch repair'],[recovery,'cleanQuestions','obsolete touch/question repair'],[recovery,'MutationObserver(','recovery global DOM observer'],[recovery,'style.touchAction','runtime touchAction rewrite'],[recovery,'style.pointerEvents','runtime pointer-events rewrite'],[index,"addEventListener('touchstart'",'legacy touchstart'],[index,"addEventListener('touchmove'",'legacy touchmove'],[index,"addEventListener('touchend'",'legacy touchend']])if(src.includes(token))errors.push(`${label}: ${token}`);
for(const token of ['webInstanceKey','recoverWebRenderer','onRenderProcessGone','onContentProcessDidTerminate'])if(!native.includes(token))errors.push(`native crash recovery missing: ${token}`);
for(const token of ["addEventListener('pointerdown'","addEventListener('pointermove'","addEventListener('pointerup'"])if(!index.includes(token))errors.push(`local paper zoom pointer event missing: ${token}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Input/crash stability checks passed: no global touch-repair/capture interceptor in security or recovery, legacy touch listeners removed from main zoom, local Pointer Events present, and WebView renderer reconstruction is wired.');
