'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'..','web','national-id-runtime.js'),'utf8');
const start=src.indexOf('function setupZoomTouch(){');
const end=src.indexOf('function zoomPaper(){',start);
if(start<0||end<0)throw new Error('National identity preview pointer handler missing');
const handlers={};
let updates=0;
const panel={
  style:{},
  addEventListener:(type,listener)=>{handlers[type]=listener},
  setPointerCapture:()=>{},
  releasePointerCapture:()=>{}
};
const state={scale:1,x:0,y:0,lastD:0};
const zoom=vm.runInNewContext(src.slice(start,end)+'\nsetupZoomTouch',{
  $:id=>id==='natZoom'?panel:null,z:state,Math,Map,
  zoomApply:()=>{updates++}
},{timeout:1000});
zoom();
assert.equal(panel.style.touchAction,'none');
assert.equal(typeof handlers.pointerdown,'function');
assert.equal(typeof handlers.pointermove,'function');
assert.equal(typeof handlers.pointerup,'function');
assert.equal(typeof handlers.pointercancel,'function');
const target={closest:()=>null};
const point=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,target});
handlers.pointerdown(point(1,15,25));
handlers.pointermove(point(1,30,40));
assert.equal(state.x,15);
assert.equal(state.y,15);
handlers.pointerdown(point(2,30,70));
handlers.pointermove(point(2,30,100));
assert.equal(state.scale,2,'Two-pointer zoom should increase image scale');
handlers.pointerup(point(2,30,100));
handlers.pointermove(point(1,40,40));
assert.equal(state.x,25,'One-pointer dragging should continue after a second pointer lifts');
handlers.pointercancel(point(1,40,40));
assert.ok(updates>=3);
console.log('National-ID preview pointer gestures: drag, two-pointer zoom, release and cancel passed.');
