'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','web','permission-section-guards-runtime.js'),'utf8');
const denied=new Set(['logsViewOwn','imageExport','settingsPrinting','cardsEdit']);
const events={};
const el=(extra={})=>({disabled:false,title:'',textContent:'',dataset:{},style:{opacity:'',pointerEvents:''},...extra});
const logs=el({textContent:'سجل العمليات',title:'السجل'});
const normal=el({textContent:'زر عادي'});
const file=el(),paper=el({disabled:true}),photo=el();
const label=el({style:{pointerEvents:'auto',opacity:'0.8'}});
let messages=0;
const document={
  readyState:'complete',
  getElementById:id=>({imageInput:file,paperSize:paper,photoSize:photo}[id]||null),
  querySelectorAll:selector=>selector==='button'?[logs,normal]:selector==='label[for="imageInput"]'?[label]:[],
  addEventListener:(name,fn)=>{events[name]=fn},
  visibilityState:'visible'
};
const window={AbuBassamPermissions:{can:key=>!denied.has(key),items:[]}};
vm.runInNewContext(source,{window,document,alert:()=>{messages++},requestAnimationFrame:fn=>fn(),setTimeout:()=>0},{filename:'permission-section-guards-runtime.js',timeout:1000});
assert.equal(logs.disabled,true);
assert.equal(file.disabled,true);
assert.equal(label.style.pointerEvents,'none');
assert.equal(paper.disabled,true);
denied.clear();
window.AbuPermissionSectionGuards.tick();
assert.equal(logs.disabled,false);
assert.equal(logs.title,'السجل');
assert.equal(file.disabled,false);
assert.equal(paper.disabled,true,'Do not enable controls disabled for other reasons');
assert.equal(label.style.pointerEvents,'auto');
assert.equal(label.style.opacity,'0.8');
denied.add('cardsEdit');
let blocked=false;
const settings={textContent:'الإعدادات',closest:s=>s.startsWith('button,')?settings:null};
events.click({target:settings,preventDefault(){blocked=true},stopImmediatePropagation(){blocked=true}});
assert.equal(blocked,false,'Settings must not be blocked as a cards editor');
const card={textContent:'حذف',closest:s=>s.startsWith('button,')?card:{}};
denied.add('cardsDelete');
events.click({target:card,preventDefault(){blocked=true},stopImmediatePropagation(){blocked=true}});
assert.equal(blocked,true,'Denied cards delete remains blocked');
assert.equal(messages,1);
console.log('Touch permission behavioral checks passed: restore disabled controls, preserve originals, scope cards, keep denial.');
