(()=>{
'use strict';
if(window.__ABU_CHILD_TEMPLATES_V1__)return;
window.__ABU_CHILD_TEMPLATES_V1__=true;

const STORAGE_KEY='abuBassamChildTemplateV1';
const DEFAULT_ID='child-clouds';
const TEMPLATES=[
  {id:'child-clouds',name:'النموذج 1 — الغيوم والمرح'},
  {id:'child-hearts',name:'النموذج 2 — القلوب اللطيفة'},
  {id:'child-nature',name:'النموذج 3 — الطبيعة والكتاب'},
  {id:'child-space',name:'النموذج 4 — الفضاء والنجوم'},
  {id:'child-rainbow',name:'النموذج 5 — قوس قزح'},
  {id:'child-garden',name:'النموذج 6 — المدرسة والحديقة'},
  {id:'child-shapes',name:'النموذج 7 — الأشكال التعليمية'},
  {id:'child-balloons',name:'النموذج 8 — البالونات والاحتفال'},
  {id:'child-board',name:'النموذج 9 — السبورة والطباشير'},
  {id:'child-future',name:'النموذج 10 — المستقبل المشرق'}
];
const VALID=new Set(TEMPLATES.map(t=>t.id));
let active=VALID.has(localStorage.getItem(STORAGE_KEY))?localStorage.getItem(STORAGE_KEY):DEFAULT_ID;
let typographyPatched=false;

function current(){return active}
function templateClass(id=active){return `abu-${id}`}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

function templateCss(id,preview){
  const scope=preview?`.${templateClass(id)}`:'.cs-child';
  const front=`${scope}.cs-child-front`;
  const back=`${scope}.cs-child-back`;
  const both=`${scope}.cs-child-front,${scope}.cs-child-back`;
  const photo=`${front} .cs-photo-frame`;
  const brand=`${front} .cs-child-brand`;
  const school=`${front} .cs-child-school`;
  const ribbon=`${front} .cs-child-ribbon`;
  const sun=`${front} .cs-child-sun`;
  const qr=`${back} .cs-qr-box`;
  const info=`${back} .cs-info`;
  const call=`${back} .cs-call-qr`;
  const label=`${back} .cs-call-label`;
  const footer=`${back} .cs-card-footer`;

  if(id==='child-clouds')return `
${both}{background:linear-gradient(145deg,#f9fdff,#e8f7ff 58%,#fff9e8);color:#083b70}
${front}:before,${back}:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 13% 16%,#67c9f222 0 7%,transparent 7.5%),radial-gradient(circle at 55% 24%,#67c9f222 0 6%,transparent 6.5%),radial-gradient(circle at 88% 16%,#67c9f222 0 8%,transparent 8.5%)}
${front}:after{content:'☁️  ☀️  ☁️';position:absolute;right:4%;left:4%;top:1%;text-align:center;font-size:20px;letter-spacing:.8em;z-index:2;opacity:.9}
${photo}{left:4%;top:9%;width:36%;height:68%;border-radius:18%;border-color:#d7ad55}
${brand}{right:5%;left:42%;top:7%;height:34%}
${school}{right:5%;left:42%;top:45%;font-weight:900}
${ribbon}{right:-2%;left:31%;bottom:4%;height:27%;clip-path:polygon(0 0,89% 0,100% 50%,89% 100%,0 100%,8% 50%)}
${sun}{display:none}
${back}:after{content:'';position:absolute;right:-8%;left:-8%;bottom:-24%;height:52%;background:linear-gradient(180deg,#28b8e2,#0068b5 70%);border-radius:50% 50% 0 0;z-index:2}
${qr}{left:4%;top:12%;width:27%}${info}{right:4%;left:34%;top:10%;bottom:25%}${call}{left:10%;bottom:19%;width:15%}${label}{left:6%;bottom:8%;width:24%}${footer}{z-index:7}`;

  if(id==='child-hearts')return `
${both}{background:linear-gradient(145deg,#fff8fb,#fff 55%,#fff2f7);color:#7b2850}
${front}:before,${back}:before{content:'♥';position:absolute;inset:0;font-size:42px;line-height:1.9;color:#d95f9630;letter-spacing:1.6em;padding:3% 6%;z-index:1;overflow:hidden}
${front}:after{content:'♥ ♥ ♥';position:absolute;left:3%;bottom:4%;font-size:18px;color:#cb3f7c;z-index:4;transform:rotate(-8deg)}
${photo}{left:7%;top:16%;width:31%;height:58%;border-radius:50%;border-color:#d95f96;box-shadow:0 0 0 4px #fff}
${brand}{right:38%;left:6%;top:4%;height:20%;flex-direction:row;gap:4%}
${brand} img{width:18%;height:90%}${brand} strong{font-size:85%!important}
${school}{right:41%;left:4%;top:35%;font-size:115%!important}
${ribbon}{right:40%;left:4%;bottom:13%;height:23%;border-radius:22px;clip-path:none;background:linear-gradient(135deg,#c83f78,#e66aa0);box-shadow:0 6px 18px #a6295e33}
${sun}{display:none}
${back}:after{content:'♡';position:absolute;right:-2%;bottom:-18%;font-size:150px;color:#d95f9625;z-index:1}
${qr}{left:6%;top:21%;width:25%;border-color:#c83f78}${info}{right:35%;left:5%;top:19%;bottom:23%}${back} .cs-row{background:#fff7fbcc;border-radius:8px;padding:2.6% 3%}${call}{left:8%;bottom:8%;width:14%;border-color:#c83f78}${label}{left:22%;bottom:11%;width:18%;color:#8b2c58}${footer}{background:#9d285f;border-top-color:#e9a5c4}`;

  if(id==='child-nature')return `
${both}{background:linear-gradient(145deg,#fbfff7,#eef8e8 58%,#fffdf3);color:#2b5e35}
${front}:before,${back}:before{content:'🍃';position:absolute;right:1%;top:1%;font-size:30px;transform:rotate(14deg);z-index:2;opacity:.7}
${front}:after{content:'📚';position:absolute;left:4%;bottom:5%;font-size:34px;z-index:5}
${photo}{right:5%;left:auto;top:18%;width:34%;height:60%;border-radius:16%;border-color:#85a95c}
${brand}{right:4%;left:4%;top:3%;height:19%;flex-direction:row;gap:3%}
${brand} img{width:12%;height:85%}
${school}{right:42%;left:5%;top:34%;font-size:116%!important;color:#2b5e35!important}
${ribbon}{right:41%;left:7%;bottom:14%;height:24%;clip-path:none;border-radius:10px 30px 10px 30px;background:linear-gradient(135deg,#477b44,#6a9d56)}
${sun}{display:none}
${back}:after{content:'🌿';position:absolute;left:1%;bottom:-2%;font-size:64px;z-index:2;opacity:.35}
${qr}{right:5%;left:auto;top:18%;width:25%;border-color:#5c8d4c}${info}{right:34%;left:5%;top:16%;bottom:18%}${back} .cs-row{background:#f7fff0aa;border-color:#4a7b4338;border-radius:6px;padding:2.2% 3%}${call}{right:8%;left:auto;bottom:8%;width:13%;border-color:#5c8d4c}${label}{right:22%;left:auto;bottom:11%;width:20%;color:#37673c}${footer}{background:#376d45;border-top-color:#b8c77e}`;

  if(id==='child-space')return `
${both}{background:radial-gradient(circle at 75% 18%,#21488b 0 5%,transparent 5.4%),linear-gradient(150deg,#081a43,#12346f 60%,#0a214f);color:#fff}
${front}:before,${back}:before{content:'✦  ✧   ✦  ✧  ✦';position:absolute;inset:4% 4% auto;color:#ffe17a;font-size:16px;letter-spacing:.9em;z-index:2;white-space:nowrap}
${front}:after{content:'🚀';position:absolute;right:3%;bottom:4%;font-size:42px;z-index:4;transform:rotate(-18deg)}
${photo}{left:5%;top:20%;width:33%;height:57%;border-radius:24%;border-color:#ffd44f;box-shadow:0 0 16px #ffd44f66}
${brand}{right:5%;left:43%;top:9%;height:26%}${brand} strong{color:#fff!important}
${school}{right:5%;left:42%;top:40%;color:#f4f7ff!important;font-size:110%!important}
${ribbon}{right:40%;left:5%;bottom:10%;height:24%;clip-path:polygon(0 0,92% 0,100% 50%,92% 100%,0 100%,8% 50%);background:linear-gradient(135deg,#2b60b4,#7146b8);border:2px solid #ffd44f}
${sun}{display:none}
${back}:after{content:'🪐';position:absolute;right:4%;bottom:2%;font-size:54px;z-index:2;opacity:.7}
${qr}{left:5%;top:21%;width:26%;border-color:#ffd44f;box-shadow:0 0 12px #ffd44f55}${info}{right:35%;left:5%;top:18%;bottom:22%}${back} .cs-row{background:#ffffff12;border:1px solid #ffffff22;border-radius:7px;padding:2.4% 3%}${back} .cs-row b{color:#ffe17a}${back} .cs-row span{color:#fff}${call}{left:9%;bottom:8%;width:13%;border-color:#ffd44f}${label}{left:22%;bottom:11%;width:18%;color:#ffe17a}${footer}{background:#061431;border-top-color:#ffd44f}`;

  if(id==='child-rainbow')return `
${both}{background:linear-gradient(155deg,#fffdf5,#f7fcff 55%,#fff5ee);color:#5b3a50}
${front}:before{content:'';position:absolute;width:48%;height:60%;right:-16%;top:-28%;border:9px solid #ef8f83;border-left-color:#f4c36a;border-bottom-color:#66b6a1;border-radius:50%;z-index:1;opacity:.75}
${front}:after{content:'☁️';position:absolute;right:2%;top:23%;font-size:38px;z-index:2}
${photo}{left:6%;top:18%;width:32%;height:58%;border-radius:20px;border-color:#f0b65f;transform:rotate(-2deg)}
${brand}{right:40%;left:5%;top:5%;height:22%;flex-direction:row;gap:3%}${brand} img{width:17%;height:92%}
${school}{right:42%;left:5%;top:34%;font-size:112%!important;color:#785174!important}
${ribbon}{right:40%;left:5%;bottom:11%;height:24%;clip-path:none;border-radius:26px;background:linear-gradient(90deg,#e9828b,#ecb45e,#67b89e,#6c93d6);box-shadow:0 5px 18px #0002}
${sun}{display:none}
${back}:before{content:'';position:absolute;width:40%;height:48%;left:-13%;top:-20%;border:8px solid #ef8f83;border-right-color:#f4c36a;border-bottom-color:#66b6a1;border-radius:50%;z-index:1;opacity:.65}
${back}:after{content:'☁️';position:absolute;left:6%;top:2%;font-size:38px;z-index:2}
${qr}{left:6%;top:22%;width:25%;border-color:#8e6b9a}${info}{right:35%;left:5%;top:18%;bottom:22%}${back} .cs-row{background:#ffffffb8;border-radius:8px;padding:2.5% 3%}${call}{left:9%;bottom:8%;width:13%;border-color:#8e6b9a}${label}{left:22%;bottom:11%;width:18%;color:#785174}${footer}{background:linear-gradient(90deg,#8f5b79,#5a7faa);border-top-color:#f0b65f}`;

  if(id==='child-garden')return `
${both}{background:linear-gradient(180deg,#f8fcff 0 58%,#eaf5df 58% 100%);color:#325243}
${front}:before,${back}:before{content:'';position:absolute;right:0;left:0;bottom:0;height:24%;background:repeating-linear-gradient(165deg,#78ad5f 0 4%,#8dbc72 4% 8%,#76a65f 8% 12%);opacity:.42;z-index:1}
${front}:after{content:'🏫  🌳';position:absolute;left:4%;bottom:2%;font-size:34px;z-index:4;letter-spacing:.25em}
${photo}{right:5%;left:auto;top:17%;width:31%;height:59%;border-radius:14%;border-color:#d2a34c}
${brand}{right:4%;left:4%;top:3%;height:18%;flex-direction:row;justify-content:flex-start;gap:3%}${brand} img{width:11%;height:85%}
${school}{right:40%;left:5%;top:31%;font-size:118%!important;color:#315b49!important}
${ribbon}{right:39%;left:5%;bottom:17%;height:22%;clip-path:none;border-radius:8px;background:linear-gradient(135deg,#4f8158,#739e62)}
${sun}{display:none}
${back}:after{content:'🌼 🌼 🌼';position:absolute;right:4%;bottom:3%;font-size:18px;z-index:4;letter-spacing:.4em}
${qr}{right:5%;left:auto;top:18%;width:25%;border-color:#5d8e62}${info}{right:34%;left:5%;top:17%;bottom:24%}${back} .cs-row{background:#f8fff4cc;border-radius:6px;padding:2.3% 3%}${call}{right:8%;left:auto;bottom:7%;width:13%;border-color:#5d8e62}${label}{right:22%;left:auto;bottom:10%;width:20%;color:#315b49}${footer}{background:#376d50;border-top-color:#d3a84f}`;

  if(id==='child-shapes')return `
${both}{background:linear-gradient(145deg,#ffffff,#f5f8fb);color:#25435e}
${front}:before,${back}:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#f08f7c33 0 12%,transparent 12% 88%,#6aaecb33 88% 100%),linear-gradient(0deg,#f2c55d22 0 13%,transparent 13% 87%,#71b57e22 87% 100%);z-index:1}
${front}:after{content:'▲  ●  ■';position:absolute;right:4%;top:4%;font-size:22px;z-index:3;letter-spacing:.65em;color:#49677e}
${photo}{left:34%;top:22%;width:32%;height:54%;border-radius:12%;border-color:#577d97;box-shadow:8px 8px 0 #efc75d55,-8px -8px 0 #79b88955}
${brand}{right:3%;left:67%;top:18%;height:42%}${brand} img{width:55%;height:45%}${brand} strong{font-size:80%!important}
${school}{right:67%;left:3%;top:26%;font-size:105%!important;color:#365f79!important}
${ribbon}{right:67%;left:3%;bottom:18%;height:23%;clip-path:none;border-radius:0;background:#416c88}
${sun}{display:none}
${back}:after{content:'■  ●  ▲';position:absolute;left:4%;bottom:3%;font-size:20px;z-index:3;letter-spacing:.6em;color:#49677e}
${qr}{left:6%;top:23%;width:24%;border-color:#577d97}${info}{right:34%;left:5%;top:18%;bottom:22%}${back} .cs-row{background:#fff;border:1px solid #6c8ca733;border-radius:4px;padding:2.2% 3%}${call}{left:9%;bottom:8%;width:13%;border-color:#577d97}${label}{left:22%;bottom:11%;width:18%;color:#365f79}${footer}{background:#365f79;border-top-color:#efc75d}`;

  if(id==='child-balloons')return `
${both}{background:linear-gradient(145deg,#fffaf4,#fff 52%,#f8f6ff);color:#6a3d5d}
${front}:before{content:'🎈';position:absolute;left:2%;top:2%;font-size:52px;z-index:2;transform:rotate(-12deg)}
${front}:after{content:'🎈';position:absolute;right:3%;bottom:1%;font-size:48px;z-index:2;transform:rotate(10deg)}
${photo}{left:7%;top:18%;width:31%;height:59%;border-radius:40% 40% 18% 18%;border-color:#c684a6}
${brand}{right:40%;left:5%;top:4%;height:21%;flex-direction:row;gap:3%}${brand} img{width:17%;height:90%}
${school}{right:42%;left:5%;top:33%;font-size:115%!important;color:#7c4666!important}
${ribbon}{right:40%;left:5%;bottom:12%;height:25%;clip-path:polygon(5% 0,95% 0,100% 50%,95% 100%,5% 100%,0 50%);background:linear-gradient(135deg,#a95b85,#d87e9f);border:2px dashed #fff}
${sun}{display:none}
${back}:before{content:'🎉';position:absolute;right:2%;top:2%;font-size:40px;z-index:2}${back}:after{content:'🎈';position:absolute;left:2%;bottom:2%;font-size:44px;z-index:2;opacity:.7}
${qr}{left:6%;top:21%;width:25%;border-color:#a95b85}${info}{right:35%;left:5%;top:18%;bottom:23%}${back} .cs-row{background:#fff8fbcc;border-radius:9px;padding:2.5% 3%}${call}{left:9%;bottom:8%;width:13%;border-color:#a95b85}${label}{left:22%;bottom:11%;width:18%;color:#7c4666}${footer}{background:#7d4667;border-top-color:#e1a8bd}`;

  if(id==='child-board')return `
${both}{background:linear-gradient(145deg,#214a3d,#173a31);color:#fff;border:4px solid #b68a54;box-shadow:inset 0 0 0 3px #e5c89b}
${front}:before,${back}:before{content:'';position:absolute;inset:3%;border:2px dashed #ffffff55;border-radius:10px;z-index:1}
${front}:after{content:'A + B = ✦';position:absolute;left:4%;top:4%;font:900 18px/1.2 monospace;color:#fff7d7;z-index:3;transform:rotate(-4deg)}
${photo}{right:6%;left:auto;top:18%;width:31%;height:58%;border-radius:8px;border-color:#e5c89b;box-shadow:0 0 0 3px #fff}
${brand}{right:4%;left:4%;top:4%;height:18%;flex-direction:row;justify-content:flex-start;gap:3%}${brand} img{width:12%;height:88%}${brand} strong{color:#fff7d7!important}
${school}{right:41%;left:5%;top:33%;font-size:116%!important;color:#fff!important;text-shadow:0 1px 0 #000}
${ribbon}{right:40%;left:5%;bottom:14%;height:24%;clip-path:none;border-radius:8px;background:#f5efd3;color:#23483d!important;box-shadow:0 4px 0 #b68a54}
${sun}{display:none}
${back}:after{content:'1 2 3  •  أ ب ت';position:absolute;right:6%;left:6%;bottom:3%;font-size:14px;text-align:center;color:#fff7d7;z-index:3;letter-spacing:.2em}
${qr}{right:6%;left:auto;top:22%;width:24%;border-color:#e5c89b}${info}{right:34%;left:5%;top:18%;bottom:22%}${back} .cs-row{background:#ffffff0d;border:1px dashed #ffffff44;border-radius:4px;padding:2.4% 3%}${back} .cs-row b{color:#fff7d7}${back} .cs-row span{color:#fff}${call}{right:9%;left:auto;bottom:8%;width:13%;border-color:#e5c89b}${label}{right:22%;left:auto;bottom:11%;width:18%;color:#fff7d7}${footer}{background:#112d26;border-top-color:#e5c89b}`;

  if(id==='child-future')return `
${both}{background:linear-gradient(135deg,#ffffff 0 48%,#eef7fb 48% 100%);color:#24485b}
${front}:before{content:'';position:absolute;right:-8%;top:-15%;width:48%;height:62%;border-radius:50%;background:linear-gradient(135deg,#6eabc4,#416b8f);z-index:1;opacity:.95}
${front}:after{content:'★';position:absolute;right:6%;top:6%;font-size:36px;color:#fff;z-index:3}
${photo}{right:7%;left:auto;top:20%;width:30%;height:57%;border-radius:16px 50% 16px 50%;border-color:#4f839d;box-shadow:0 8px 22px #325d7333}
${brand}{right:4%;left:40%;top:4%;height:20%;flex-direction:row;justify-content:flex-start;gap:3%}${brand} img{width:13%;height:88%}
${school}{right:41%;left:5%;top:32%;font-size:118%!important;color:#315d74!important;text-align:right!important}
${ribbon}{right:40%;left:5%;bottom:14%;height:24%;clip-path:none;border-radius:24px 6px 24px 6px;background:linear-gradient(135deg,#315d74,#5f9bb5);box-shadow:0 7px 18px #315d7433}
${sun}{display:none}
${back}:before{content:'';position:absolute;left:-10%;bottom:-18%;width:48%;height:62%;border-radius:50%;background:linear-gradient(135deg,#6eabc4,#416b8f);z-index:1;opacity:.9}
${back}:after{content:'★';position:absolute;left:7%;bottom:5%;font-size:34px;color:#fff;z-index:3}
${qr}{left:6%;top:21%;width:24%;border-color:#4f839d}${info}{right:34%;left:5%;top:17%;bottom:22%}${back} .cs-row{background:#ffffffb8;border-radius:7px;padding:2.4% 3%}${call}{left:8%;bottom:8%;width:13%;border-color:#4f839d}${label}{left:21%;bottom:11%;width:19%;color:#315d74}${footer}{background:#315d74;border-top-color:#89b6c8}`;

  return templateCss(DEFAULT_ID,preview);
}

function allPreviewCss(){return TEMPLATES.map(t=>templateCss(t.id,true)).join('\n')+`
.abu-child-template-picker{grid-column:1/-1;border:1px solid #b9bff0;border-radius:13px;background:#fff;padding:10px;display:grid;gap:8px}.abu-child-template-picker b{font-size:11px;color:#07584b}.abu-child-template-picker select{width:100%;min-height:44px;border:1px solid #c8c8d8;border-radius:10px;background:#fff;padding:7px 9px;font-size:11px;font-weight:800}.abu-child-template-picker small{font-size:9px;line-height:1.6;color:#746c67}.abu-child-template-strip{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.abu-child-template-chip{min-height:38px;border:1px solid #cfd4dd;border-radius:9px;background:#f9fbfd;color:#334b5b;padding:6px;font-size:9px;font-weight:900;line-height:1.35}.abu-child-template-chip.active{outline:2px solid #087f72;border-color:#087f72;background:#ecfbf8;color:#07584b}@media(max-width:360px){.abu-child-template-strip{grid-template-columns:1fr}}`}

function installStyle(){
  if(document.getElementById('abuChildTemplatesStyle'))return;
  const style=document.createElement('style');
  style.id='abuChildTemplatesStyle';
  style.textContent=allPreviewCss();
  (document.head||document.documentElement).appendChild(style);
}

function markCards(){
  document.querySelectorAll('#csCardPair .cs-child').forEach(card=>{
    TEMPLATES.forEach(t=>card.classList.remove(templateClass(t.id)));
    card.classList.add(templateClass(active));
    card.dataset.childTemplate=active;
  });
}

function pickerHtml(){
  const options=TEMPLATES.map(t=>`<option value="${t.id}" ${t.id===active?'selected':''}>${escapeHtml(t.name)}</option>`).join('');
  const chips=TEMPLATES.map(t=>`<button type="button" class="abu-child-template-chip ${t.id===active?'active':''}" data-template-id="${t.id}">${escapeHtml(t.name.replace(/^النموذج\s+\d+\s+—\s+/,''))}</button>`).join('');
  return `<div id="abuChildTemplatePicker" class="abu-child-template-picker"><b>🧩 نموذج باج الروضة / المدرسة</b><select id="abuChildTemplateSelect">${options}</select><div class="abu-child-template-strip">${chips}</div><small>كل اختيار يغيّر توزيع عناصر الوجه والظهر فعلياً، ويظل النص والصورة وبيانات ولي الأمر قابلة للتعديل من نفس المحرر.</small></div>`;
}

function installPicker(){
  const form=document.getElementById('csForm');
  if(!form||!window.CardsStudio||CardsStudio.currentType?.()!=='child')return;
  let old=document.getElementById('abuChildTemplatePicker');
  if(old)old.remove();
  form.insertAdjacentHTML('afterbegin',pickerHtml());
  const select=document.getElementById('abuChildTemplateSelect');
  if(select)select.onchange=()=>selectTemplate(select.value,false);
  form.querySelectorAll('.abu-child-template-chip').forEach(button=>button.onclick=()=>selectTemplate(button.dataset.templateId,false));
}

function patchTypography(){
  if(typographyPatched||!window.AbuBassamTypography?.printCss)return;
  const original=AbuBassamTypography.printCss.bind(AbuBassamTypography);
  AbuBassamTypography.printCss=function(){return original()+templateCss(active,false)};
  typographyPatched=true;
}

function refresh(){
  installStyle();
  patchTypography();
  markCards();
  installPicker();
}

function selectTemplate(id,openChild=true){
  if(!VALID.has(id))id=DEFAULT_ID;
  active=id;
  try{localStorage.setItem(STORAGE_KEY,active)}catch(e){}
  if(openChild&&window.CardsStudio?.selectType)CardsStudio.selectType('child');
  setTimeout(refresh,0);
  setTimeout(refresh,80);
  return active;
}

function patchCardsStudio(){
  if(!window.CardsStudio||CardsStudio.__abuChildTemplatesPatched)return false;
  const original=CardsStudio.selectType.bind(CardsStudio);
  CardsStudio.selectType=function(type){const result=original(type);if(type==='child'){setTimeout(refresh,0);setTimeout(refresh,80)}return result};
  CardsStudio.__abuChildTemplatesPatched=true;
  return true;
}

function init(){
  installStyle();
  const tryPatch=()=>{patchCardsStudio();patchTypography();refresh()};
  tryPatch();
  let attempts=0;
  const timer=setInterval(()=>{attempts+=1;tryPatch();if((window.CardsStudio&&window.AbuBassamTypography)||attempts>80)clearInterval(timer)},50);
  const observer=new MutationObserver(()=>{if(window.CardsStudio?.currentType?.()==='child'){markCards();if(!document.getElementById('abuChildTemplatePicker'))installPicker()}});
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

window.AbuBassamChildTemplates={select:selectTemplate,current,list:()=>TEMPLATES.map(t=>({...t})),refresh,version:1};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
