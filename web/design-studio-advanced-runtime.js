(()=>{
'use strict';
if(window.__ABU_DESIGN_ADVANCED_V1__)return;
window.__ABU_DESIGN_ADVANCED_V1__=true;
const $=id=>document.getElementById(id);
const DIRS=['nw','n','ne','e','se','s','sw','w'];
let aspectLocked=true,gridEnabled=true,snapEnabled=true,updating=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const pct=v=>Math.round((Number(v)||0)*100)/100;
function style(){
  if($('dsAdvancedStyle'))return;
  const s=document.createElement('style');s.id='dsAdvancedStyle';s.textContent=`
.ds-resize{display:none!important}.ds-adv-handle{display:none;position:absolute;width:18px;height:18px;border:2px solid #fff;border-radius:50%;background:#2563eb;z-index:450;touch-action:none;box-shadow:0 1px 5px #0006}.ds-el.selected>.ds-adv-handle{display:block}.ds-adv-nw{left:-10px;top:-10px;cursor:nwse-resize}.ds-adv-n{left:50%;top:-10px;transform:translateX(-50%);cursor:ns-resize}.ds-adv-ne{right:-10px;top:-10px;cursor:nesw-resize}.ds-adv-e{right:-10px;top:50%;transform:translateY(-50%);cursor:ew-resize}.ds-adv-se{right:-10px;bottom:-10px;cursor:nwse-resize}.ds-adv-s{left:50%;bottom:-10px;transform:translateX(-50%);cursor:ns-resize}.ds-adv-sw{left:-10px;bottom:-10px;cursor:nesw-resize}.ds-adv-w{left:-10px;top:50%;transform:translateY(-50%);cursor:ew-resize}.ds-adv-rotate{display:none;position:absolute;left:50%;top:-42px;transform:translateX(-50%);width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:#0f766e;color:#fff;z-index:451;align-items:center;justify-content:center;font-size:15px;touch-action:none}.ds-el.selected>.ds-adv-rotate{display:flex}.ds-adv-rotate:after{content:'';position:absolute;width:2px;height:14px;background:#0f766e;left:50%;top:27px}.ds-advanced-bar{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;padding:6px;background:#eaf0f6;border-top:1px solid #cbd5e1}.ds-advanced-bar label{font-size:7px;font-weight:900;color:#334155}.ds-advanced-bar input{width:100%;min-height:32px;border:1px solid #cbd5e1;border-radius:7px;padding:3px;font-size:9px}.ds-advanced-bar button{min-height:34px;border:0;border-radius:7px;background:#475569;color:#fff;font-family:Tajawal,Arial;font-size:8px;font-weight:900}.ds-advanced-bar button.on{background:#0f766e}.ds-grid-on{background-image:linear-gradient(to right,#2563eb16 1px,transparent 1px),linear-gradient(to bottom,#2563eb16 1px,transparent 1px)!important;background-size:2% 2%!important}.ds-center-x:before,.ds-center-y:after{content:'';position:absolute;z-index:1;pointer-events:none;background:#10b98188}.ds-center-x:before{left:50%;top:0;bottom:0;width:1px}.ds-center-y:after{top:50%;left:0;right:0;height:1px}@media(max-width:430px){.ds-advanced-bar{grid-template-columns:repeat(4,minmax(0,1fr))}.ds-adv-handle{width:22px;height:22px}.ds-adv-nw{left:-12px;top:-12px}.ds-adv-ne{right:-12px;top:-12px}.ds-adv-se{right:-12px;bottom:-12px}.ds-adv-sw{left:-12px;bottom:-12px}.ds-adv-n{top:-12px}.ds-adv-s{bottom:-12px}.ds-adv-e{right:-12px}.ds-adv-w{left:-12px}}
`;
  document.head.appendChild(s);
}
function selected(){return document.querySelector('#dsCanvas .ds-el.selected')}
function addHandles(el){
  if(!el||el.dataset.advHandles==='1')return;el.dataset.advHandles='1';
  DIRS.forEach(dir=>{let h=document.createElement('span');h.className='ds-adv-handle ds-adv-'+dir;h.dataset.dir=dir;h.title='تكبير/تصغير '+dir;el.appendChild(h);bindResize(h,el)});
  let r=document.createElement('span');r.className='ds-adv-rotate';r.title='تدوير حر';r.textContent='↻';el.appendChild(r);bindRotate(r,el);
}
function geometry(el){return {x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0,w:parseFloat(el.style.width)||20,h:parseFloat(el.style.height)||10,rot:Number(el.dataset.rotation)||0}}
function setGeometry(el,g){if(!el)return;el.style.left=pct(g.x)+'%';el.style.top=pct(g.y)+'%';el.style.width=pct(g.w)+'%';el.style.height=pct(g.h)+'%';syncFields(el)}
function bindResize(handle,el){
  handle.addEventListener('pointerdown',ev=>{
    ev.preventDefault();ev.stopPropagation();if(el.dataset.locked==='1')return;
    const dir=handle.dataset.dir,canvas=$('dsCanvas'),rect=canvas.getBoundingClientRect(),start=geometry(el),sx=ev.clientX,sy=ev.clientY,ratio=start.w/Math.max(.001,start.h),lock=aspectLocked||el.dataset.kind==='img';
    handle.setPointerCapture?.(ev.pointerId);
    const move=e=>{
      let dx=(e.clientX-sx)/rect.width*100,dy=(e.clientY-sy)/rect.height*100,g={...start};
      if(dir.includes('e'))g.w=start.w+dx;if(dir.includes('s'))g.h=start.h+dy;
      if(dir.includes('w')){g.x=start.x+dx;g.w=start.w-dx}if(dir.includes('n')){g.y=start.y+dy;g.h=start.h-dy}
      g.w=clamp(g.w,2,120);g.h=clamp(g.h,2,120);
      if(lock){
        if(dir==='n'||dir==='s'){g.w=g.h*ratio;if(dir==='n'||dir==='s')g.x=start.x+(start.w-g.w)/2}
        else if(dir==='e'||dir==='w'){let nh=g.w/ratio;g.y=start.y+(start.h-nh)/2;g.h=nh;if(dir==='w')g.x=start.x+start.w-g.w}
        else {let byW=g.w/ratio,byH=g.h*ratio;if(Math.abs(dx)>=Math.abs(dy)){g.h=byW;if(dir.includes('n'))g.y=start.y+start.h-g.h}else{g.w=byH;if(dir.includes('w'))g.x=start.x+start.w-g.w}}
      }
      if(snapEnabled)g=snapGeom(g);
      setGeometry(el,g);
    };
    const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);syncFields(el)};
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);
  });
}
function bindRotate(handle,el){
  handle.addEventListener('pointerdown',ev=>{
    ev.preventDefault();ev.stopPropagation();if(el.dataset.locked==='1')return;let rect=el.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    handle.setPointerCapture?.(ev.pointerId);
    const move=e=>{let deg=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90;if(snapEnabled&&Math.abs(deg/15-Math.round(deg/15))<.12)deg=Math.round(deg/15)*15;el.dataset.rotation=String(Math.round(deg*10)/10);el.style.transform=`rotate(${deg}deg)`;syncFields(el)};
    const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up)};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);
  });
}
function snapGeom(g){
  const step=2,threshold=.8;g.x=Math.round(g.x/step)*step;g.y=Math.round(g.y/step)*step;g.w=Math.max(2,Math.round(g.w/step)*step);g.h=Math.max(2,Math.round(g.h/step)*step);
  if(Math.abs((g.x+g.w/2)-50)<threshold)g.x=50-g.w/2;if(Math.abs((g.y+g.h/2)-50)<threshold)g.y=50-g.h/2;
  if(Math.abs(g.x)<threshold)g.x=0;if(Math.abs(g.y)<threshold)g.y=0;if(Math.abs(g.x+g.w-100)<threshold)g.x=100-g.w;if(Math.abs(g.y+g.h-100)<threshold)g.y=100-g.h;return g;
}
function injectBar(){
  if($('dsAdvancedBar'))return;let tb=$('dsToolbar');if(!tb)return;let bar=document.createElement('div');bar.id='dsAdvancedBar';bar.className='ds-advanced-bar';bar.innerHTML=`<label>X %<input id="dsAdvX" type="number" step="0.1"></label><label>Y %<input id="dsAdvY" type="number" step="0.1"></label><label>W %<input id="dsAdvW" type="number" step="0.1"></label><label>H %<input id="dsAdvH" type="number" step="0.1"></label><label>°<input id="dsAdvR" type="number" step="1"></label><button id="dsAdvAspect" class="on">🔗 النسبة</button><button id="dsAdvGrid" class="on"># الشبكة</button><button id="dsAdvSnap" class="on">🧲 Snap</button><button id="dsAdvCenterX">وسط أفقي</button><button id="dsAdvCenterY">وسط عمودي</button><button id="dsAdvCenter">وسط كامل</button><button id="dsAdvReset">إعادة القياس</button>`;tb.parentNode.insertBefore(bar,tb.nextSibling);
  ['dsAdvX','dsAdvY','dsAdvW','dsAdvH','dsAdvR'].forEach(id=>$(id).addEventListener('change',applyFields));
  $('dsAdvAspect').onclick=()=>{aspectLocked=!aspectLocked;$('dsAdvAspect').classList.toggle('on',aspectLocked)};
  $('dsAdvGrid').onclick=()=>{gridEnabled=!gridEnabled;$('dsAdvGrid').classList.toggle('on',gridEnabled);applyGrid()};
  $('dsAdvSnap').onclick=()=>{snapEnabled=!snapEnabled;$('dsAdvSnap').classList.toggle('on',snapEnabled)};
  $('dsAdvCenterX').onclick=()=>center('x');$('dsAdvCenterY').onclick=()=>center('y');$('dsAdvCenter').onclick=()=>center('both');$('dsAdvReset').onclick=resetSelected;
}
function applyGrid(){let c=$('dsCanvas');if(!c)return;c.classList.toggle('ds-grid-on',gridEnabled);c.classList.toggle('ds-center-x',gridEnabled);c.classList.toggle('ds-center-y',gridEnabled)}
function syncFields(el=selected()){
  if(updating||!el||!$('dsAdvX'))return;updating=true;let g=geometry(el);$('dsAdvX').value=pct(g.x);$('dsAdvY').value=pct(g.y);$('dsAdvW').value=pct(g.w);$('dsAdvH').value=pct(g.h);$('dsAdvR').value=pct(g.rot);updating=false;
}
function applyFields(){let el=selected();if(!el||updating)return;let g={x:clamp($('dsAdvX').value,-20,120),y:clamp($('dsAdvY').value,-20,120),w:clamp($('dsAdvW').value,2,120),h:clamp($('dsAdvH').value,2,120),rot:Number($('dsAdvR').value)||0};setGeometry(el,g);el.dataset.rotation=String(g.rot);el.style.transform=`rotate(${g.rot}deg)`}
function center(which){let el=selected();if(!el)return;let g=geometry(el);if(which==='x'||which==='both')g.x=(100-g.w)/2;if(which==='y'||which==='both')g.y=(100-g.h)/2;setGeometry(el,g)}
function resetSelected(){let el=selected();if(!el)return;let g=geometry(el);g.rot=0;el.dataset.rotation='0';el.style.transform='rotate(0deg)';if(el.dataset.kind==='img'){g.w=30;g.h=30}else{g.w=Math.max(20,g.w);g.h=Math.max(8,g.h)};g.x=(100-g.w)/2;g.y=(100-g.h)/2;setGeometry(el,g)}
function enhance(){style();injectBar();applyGrid();document.querySelectorAll('#dsCanvas .ds-el').forEach(addHandles);syncFields()}
function observe(){let canvas=$('dsCanvas');if(!canvas)return setTimeout(observe,80);enhance();new MutationObserver(()=>{document.querySelectorAll('#dsCanvas .ds-el').forEach(addHandles);syncFields()}).observe(canvas,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','data-rotation']});document.addEventListener('pointerup',()=>{let el=selected();if(!el)return;if(snapEnabled){let g=snapGeom(geometry(el));setGeometry(el,g)}syncFields(el)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
})();
