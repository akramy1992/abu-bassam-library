(()=>{
'use strict';
if(window.__ABU_QUESTION_TEMPLATES_V1__)return;
window.__ABU_QUESTION_TEMPLATES_V1__=true;

const $=id=>document.getElementById(id);
const STORE='abuQuestionTemplateStudioV1';
const PROFILE_KEY='abuQuestionHeaderProfileV1';
const CUSTOM_KEY='abuQuestionCustomTemplatesV1';
const DIGITS='٠١٢٣٤٥٦٧٨٩';
const arNum=v=>String(v).replace(/\d/g,d=>DIGITS[Number(d)]);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||clone(f)}catch(e){return clone(f)}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};

const DEFAULT_PROFILE={
  administration:'إدارة: .........................',school:'مدرسة القادسية الابتدائية',schoolType:'للبنين',teacher:'أكرم حاتم الغزالي',
  year:'٢٠٢٦ - ٢٠٢٧',day:'',date:'',role:'الدور الأول',examTitle:'اختبار',duration:'٤٥ دقيقة'
};
let profile=Object.assign({},DEFAULT_PROFILE,load(PROFILE_KEY,{}));
let customTemplates=load(CUSTOM_KEY,[]);
let currentSubject='math1';
let selectedEditable=null;
let history=[];let redoStack=[];let lastSnapshot='';let historyTimer=null;

const subjectMeta={
  math1:{label:'الرياضيات — الأول الابتدائي',grade:'الأول الابتدائي',subject:'الرياضيات'},
  science3:{label:'العلوم — الثالث الابتدائي',grade:'الثالث الابتدائي',subject:'العلوم'},
  science4:{label:'العلوم — الرابع الابتدائي',grade:'الرابع الابتدائي',subject:'العلوم'},
  islamic:{label:'التربية الإسلامية',grade:'الثاني الابتدائي',subject:'التربية الإسلامية'},
  general:{label:'نماذج عامة',grade:'',subject:''}
};

function headerHtml(meta={},title='اختبار'){
  const grade=meta.grade||'';const subject=meta.subject||'';
  return `<div class="header abu-auto-header">
    <div class="header-box" contenteditable="true">${esc(profile.administration)}<br>${esc(profile.school)}<br>${esc(profile.schoolType)}</div>
    <div class="header-center" contenteditable="true"><span class="title">${esc(title||profile.examTitle)}</span><br>${esc(profile.role)}<br>للعام ${esc(profile.year)}</div>
    <div class="header-box" contenteditable="true">${grade?'الصف / '+esc(grade)+'<br>':''}${subject?'المادة / '+esc(subject)+'<br>':''}معلم المادة / ${esc(profile.teacher)}<br>التاريخ / ${esc(profile.date||'................')}<br>اليوم / ${esc(profile.day||'................')}</div>
  </div>`;
}
function noteHtml(text){return `<div class="note-wrapper"><button class="del-note-btn" onclick="hideElement(this)" title="حذف الملاحظة">✖</button><div class="note-bar" contenteditable="true">${esc(text)}</div></div>`}
function qHtml(i,title,body,cls){let c=cls||`q${((i-1)%15)+1}`;return `<div class="question-container ${c}"><div class="action-btns"><button onclick="moveUp(this)">⬆️</button><button onclick="moveDown(this)">⬇️</button><button onclick="duplicateQ(this)">📋</button><button onclick="deleteQ(this)">🗑️</button></div><div class="q-title" contenteditable="true"><span>✦</span> ${esc(title)}</div><div class="text-area" contenteditable="true">${body}</div></div>`}
function pageHtml(content,meta,title){return `<div class="a4-page" id="page-${Date.now()}-${Math.random().toString(36).slice(2,7)}"><button class="btn-del-page" onclick="deletePage(this)">حذف الصفحة</button>${headerHtml(meta,title)}${content}<div class="programmer-name">المصمم والمبرمج: أكرم حاتم الغزالي</div></div>`}

const mathBodies=[
  [
    ['أتعلم — ٢ درجة','١) عُدَّ الصور ثم اكتب العدد المناسب:  🍎 🍎 🍎  = (      )<br>٢) صِل العدد بالمجموعة المناسبة.'],
    ['أتأكد — ٢ درجة','١) أكمل النمط:  ١ ، ٢ ، ٣ ، (   ) ، (   )<br>٢) ضع دائرة حول الشكل المثلث:  ○   △   □'],
    ['أتحدث — ٢ درجة','تحدث عن العدد الأكبر في الزوجين:  ٤ و ٧ ، ثم اشرح كيف عرفت.'],
    ['أحل — ٢ درجة','١) ٣ + ٢ = (   )<br>٢) ٦ - ١ = (   )'],
    ['أفكر — ٢ درجة','لدى علي ٤ أقلام، أعطاه المعلم قلمين آخرين. كم قلمًا أصبح لديه؟ (        )']
  ],
  [
    ['أتعلم — ٢ درجة','أكمل خط الأعداد:  ٠ — ١ — ٢ — (   ) — ٤ — (   )'],
    ['أتأكد — ٢ درجة','اكتب العدد السابق واللاحق:  (   ) ٥ (   )   ،   (   ) ٨ (   )'],
    ['أتحدث — ٢ درجة','أي الشكلين أطول؟ ارسم خطًا تحت الإجابة واذكر السبب.'],
    ['أحل — ٢ درجة','ضع > أو < أو = :  ٧ (   ) ٤     ٣ (   ) ٣     ٢ (   ) ٦'],
    ['أفكر — ٢ درجة','الساعة تشير إلى الثالثة. ارسم عقربي الساعة في الدائرة ثم اكتب الوقت: (      )']
  ],
  [
    ['أتعلم — ٢ درجة','لوّن ٥ مربعات من المجموعة:  □ □ □ □ □ □ □ □'],
    ['أتأكد — ٢ درجة','رتب الأعداد من الأصغر إلى الأكبر:  ٩ ، ٢ ، ٦ ، ١'],
    ['أتحدث — ٢ درجة','اختر عملية الجمع أو الطرح المناسبة للموقف: كان لدي ٥ تفاحات وأكلت ٢.'],
    ['أحل — ٢ درجة','٢ + ٥ = (   )     ٩ - ٣ = (   )     ٤ + ٤ = (   )'],
    ['أفكر — ٢ درجة','لديك ١٠ دنانير ورقية تعليمية، اشتريت شيئًا بـ ٦. كم يتبقى؟ (      )']
  ]
];

function makeMathTemplate(index){let meta=subjectMeta.math1;let blocks=mathBodies[index].map((q,i)=>qHtml(i+1,q[0],q[1])).join('');return {id:`math1-${index+1}`,name:`رياضيات الأول — نموذج ${arNum(index+1)}`,subject:'math1',html:pageHtml(noteHtml('المجموع ١٠ درجات — أجب عن جميع الفقرات')+`<div class="questions-area">${blocks}</div>`,meta,'تقويم الرياضيات')};}

const scienceTypes=[
  ['عرّف المصطلحات الآتية','عرّف ثلاثةً مما يأتي: الخلية، الجذر، الساق، الموطن، التكيف.'],
  ['املأ الفراغات','١) الجزء الذي يمتص الماء من التربة هو ............<br>٢) يحتاج النبات إلى ............ و ............ للنمو.'],
  ['اختر الإجابة الصحيحة','١) عضو التنفس عند الإنسان هو: (الرئة / المعدة / العظم)<br>٢) من حالات المادة: (الصلبة / الضوء / الصوت).'],
  ['صح أم خطأ','١) النباتات كائنات حية. (   )<br>٢) الشمس مصدر للضوء والحرارة. (   )<br>٣) جميع الحيوانات تعيش في الماء. (   )'],
  ['علل / فسر','١) لماذا يحتاج الإنسان إلى الغذاء؟<br>٢) لماذا تختلف أسنان الحيوانات؟'],
  ['أكمل المخطط','أكمل سلسلة غذائية مناسبة: نبات ← ............ ← ............'],
  ['قارن','قارن بين الحيوان والنبات من حيث الحركة والغذاء.'],
  ['سمِّ الأجزاء','أمامك رسم تخطيطي لنبات. اكتب: الجذر، الساق، الورقة، الزهرة في أماكنها.'],
  ['رتب','رتب مراحل نمو النبات: بذرة — بادرة — نبات مكتمل.'],
  ['سؤال تفكير','ماذا تتوقع أن يحدث للنبات إذا لم يحصل على ضوء كافٍ؟ ولماذا؟']
];
function makeScienceTemplate(grade,index){let key=grade===3?'science3':'science4';let meta=subjectMeta[key];let offset=grade===3?index:index+2;let qs=[];for(let i=0;i<3;i++){let t=scienceTypes[(offset+i)%scienceTypes.length];qs.push(qHtml(i+1,`${t[0]} — ${i===0?'٤':'٣'} درجات`,t[1]));}return {id:`science${grade}-${index+1}`,name:`علوم ${arNum(grade)} — نموذج ${arNum(index+1)}`,subject:key,html:pageHtml(noteHtml('الدرجة الكلية ١٠ درجات — اقرأ السؤال جيدًا قبل الإجابة')+`<div class="questions-area">${qs.join('')}</div>`,meta,`اختبار العلوم — الصف ${grade===3?'الثالث':'الرابع'}`)};}

const islamicSections=[
 ['الحفظ — ٢ درجة','أكمل الآيات الكريمة المطلوبة من الحفظ: ........................................................'],
 ['الحديث الشريف — ٢ درجة','أكمل الحديث الشريف ثم اذكر ما يرشدنا إليه: ....................................................'],
 ['التلاوة — ٢ درجة','اقرأ الكلمات أو الآيات المحددة قراءة صحيحة مع مراعاة أحكام التلاوة.'],
 ['العقائد والعبادات — ١ درجة','اختر الإجابة الصحيحة: من أركان الإسلام (الصلاة / النوم / اللعب).'],
 ['المعاني — ١ درجة','اكتب معنى الكلمة القرآنية الآتية: ................ = ................'],
 ['السيرة — ١ درجة','أجب: اذكر موقفًا من سيرة النبي ﷺ يدل على الرحمة.'],
 ['الآداب الإسلامية — ١ درجة','ضع صح أو خطأ: أحترم الكبير وأعطف على الصغير. (    )']
];
function makeIslamicTemplate(index){let meta=subjectMeta.islamic;let rotated=islamicSections.slice(index%3).concat(islamicSections.slice(0,index%3));let blocks=rotated.map((q,i)=>qHtml(i+1,q[0],q[1])).join('');return {id:`islamic-${index+1}`,name:`التربية الإسلامية — نموذج ${arNum(index+1)}`,subject:'islamic',html:pageHtml(noteHtml('التوزيع: الحفظ ٢ • الحديث ٢ • التلاوة ٢ • العقائد والعبادات ١ • المعاني ١ • السيرة ١ • الآداب ١ = ١٠ درجات')+`<div class="questions-area">${blocks}</div>`,meta,'اختبار التربية الإسلامية')};}

const GENERAL_TEMPLATES=Array.from({length:6},(_,index)=>{let meta={grade:'................',subject:'................'};let blocks=[qHtml(1,'السؤال الأول — ٤ درجات','........................................................................................................'),qHtml(2,'السؤال الثاني — ٣ درجات','........................................................................................................'),qHtml(3,'السؤال الثالث — ٣ درجات','........................................................................................................')].join('');return {id:`general-${index+1}`,name:`نموذج عام ${arNum(index+1)}`,subject:'general',html:pageHtml(noteHtml(index%2?'أجب عن جميع الأسئلة':'اقرأ الأسئلة بعناية ثم أجب')+`<div class="questions-area">${blocks}</div>`,meta,'اختبار')};});
const SYSTEM_TEMPLATES=[...Array.from({length:3},(_,i)=>makeMathTemplate(i)),...Array.from({length:6},(_,i)=>makeScienceTemplate(3,i)),...Array.from({length:10},(_,i)=>makeScienceTemplate(4,i)),...Array.from({length:10},(_,i)=>makeIslamicTemplate(i)),...GENERAL_TEMPLATES];

function addCss(){if($('abuQTemplatesStyle'))return;let s=document.createElement('style');s.id='abuQTemplatesStyle';s.textContent=`
.abu-qbtn{background:#00695c!important}.abu-format-btn{background:#5e35b1!important}.abu-qmodal{position:fixed;inset:0;z-index:12000;background:#000b;display:none;align-items:flex-end;justify-content:center}.abu-qmodal.show{display:flex}.abu-qsheet{width:min(900px,100%);max-height:88vh;overflow:auto;background:#f8fafc;border-radius:22px 22px 0 0;padding:13px;color:#1f2937;box-shadow:0 -10px 30px #0006}.abu-qhead{display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:0;background:#f8fafc;z-index:2;padding-bottom:8px}.abu-qhead button{border:0;border-radius:50%;width:36px;height:36px;font-size:22px}.abu-subjects{display:flex;gap:7px;overflow:auto;padding:5px 0 10px}.abu-subjects button{white-space:nowrap;border:1px solid #0f766e55;border-radius:12px;background:#fff;padding:9px;font-family:Tajawal;font-weight:800}.abu-subjects button.on{background:#0f766e;color:white}.abu-template-title{font-weight:900;margin:8px 0 6px;color:#0f4c44}.abu-template-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.abu-tcard{border:1px solid #cbd5e1;border-radius:14px;background:white;padding:9px;text-align:right;min-height:94px;display:flex;flex-direction:column;justify-content:space-between}.abu-tpreview{height:52px;border:2px solid #0f766e33;border-radius:8px;background:linear-gradient(135deg,#fff,#eef7f4);display:grid;place-items:center;font-size:9px;text-align:center;padding:4px}.abu-tcard b{font-size:10px}.abu-tcard button{border:0;border-radius:9px;background:#0f766e;color:#fff;padding:7px;font-family:Tajawal;font-weight:800;font-size:9px}.abu-profile-grid,.abu-format-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.abu-profile-grid label,.abu-format-grid label{font-size:9px;font-weight:800;color:#475569}.abu-profile-grid input,.abu-profile-grid select,.abu-format-grid input,.abu-format-grid select{width:100%;min-height:38px;border:1px solid #cbd5e1;border-radius:9px;padding:6px;font-family:Tajawal;background:white}.abu-actions-row{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.abu-actions-row button{min-height:40px;border:0;border-radius:10px;font-family:Tajawal;font-weight:900;background:#0f766e;color:#fff}.abu-actions-row button.alt{background:#475569}.abu-actions-row button.danger{background:#b91c1c}.abu-format-pop{position:fixed;z-index:12500;left:10px;right:10px;top:72px;max-height:78vh;overflow:auto;background:#fff;border-radius:16px;padding:10px;box-shadow:0 10px 35px #0007;display:none}.abu-format-pop.show{display:block}.abu-format-tools{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.abu-format-tools button{border:0;border-radius:8px;background:#334155;color:white;padding:8px 10px;font-family:Tajawal}.abu-img-extra{background:#6d28d9!important;color:#fff!important}.abu-crop-preview{max-width:100%;max-height:48vh;display:block;margin:auto;background:#111}.abu-crop-ranges{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.abu-crop-ranges label{font-size:9px}.abu-crop-ranges input{width:100%}@media(max-width:430px){.abu-template-grid{grid-template-columns:1fr}.abu-profile-grid,.abu-format-grid{grid-template-columns:1fr 1fr}.abu-actions-row{grid-template-columns:1fr 1fr}}
@media print{.abu-qmodal,.abu-format-pop{display:none!important}}
`;document.head.appendChild(s)}

function modalHtml(){return `<div id="abuQTemplateModal" class="abu-qmodal"><div class="abu-qsheet"><div class="abu-qhead"><div><b style="font-size:15px">قوالب الأسئلة</b><div style="font-size:9px;color:#64748b">اختر المادة ثم القالب الخاص أو نموذجًا عامًا</div></div><button onclick="AbuQuestionTemplates.closeTemplates()">×</button></div><div id="abuSubjects" class="abu-subjects"></div><div class="abu-template-title">نماذج خاصة بالمادة</div><div id="abuSubjectTemplates" class="abu-template-grid"></div><div class="abu-template-title">نماذج عامة</div><div id="abuGeneralTemplates" class="abu-template-grid"></div><div class="abu-actions-row"><button class="alt" onclick="AbuQuestionTemplates.openProfile()">⚙️ بيانات الترويسة</button><button class="alt" onclick="AbuQuestionTemplates.saveCustom()">💾 حفظ كنموذج</button><button class="danger" onclick="AbuQuestionTemplates.clearCustom()">🗑 حذف نماذجي</button></div></div></div>
<div id="abuQProfileModal" class="abu-qmodal"><div class="abu-qsheet"><div class="abu-qhead"><b>بيانات الترويسة شبه التلقائية</b><button onclick="AbuQuestionTemplates.closeProfile()">×</button></div><div class="abu-profile-grid">
<label>الإدارة<input id="qpfAdministration"></label><label>اسم المدرسة<input id="qpfSchool"></label><label>نوع المدرسة<input id="qpfSchoolType"></label><label>معلم المادة<input id="qpfTeacher"></label><label>العام الدراسي<input id="qpfYear"></label><label>الدور<input id="qpfRole"></label><label>اليوم<input id="qpfDay"></label><label>التاريخ<input id="qpfDate"></label><label>عنوان الامتحان<input id="qpfTitle"></label><label>الزمن<input id="qpfDuration"></label></div><div class="abu-actions-row"><button onclick="AbuQuestionTemplates.saveProfile()">حفظ تلقائي</button><button class="alt" onclick="AbuQuestionTemplates.applyProfile()">تطبيق على الصفحة الحالية</button></div></div></div>
<div id="abuQFormatPop" class="abu-format-pop"><div class="abu-qhead"><b>تنسيق العنصر المحدد</b><button onclick="AbuQuestionTemplates.closeFormat()">×</button></div><div class="abu-format-grid"><label>الخط<select id="qFmtFont"><option>Tajawal</option><option>Cairo</option><option>Arial</option><option>serif</option></select></label><label>الحجم<input id="qFmtSize" type="number" min="8" max="80" value="16"></label><label>اللون<input id="qFmtColor" type="color" value="#111111"></label><label>تباعد الأحرف<input id="qFmtLetter" type="number" step="0.1" value="0"></label><label>تباعد الأسطر<input id="qFmtLine" type="number" step="0.1" min="0.8" max="3" value="1.6"></label></div><div class="abu-format-tools"><button onclick="AbuQuestionTemplates.cmd('bold')"><b>B</b></button><button onclick="AbuQuestionTemplates.cmd('italic')"><i>I</i></button><button onclick="AbuQuestionTemplates.cmd('underline')"><u>U</u></button><button onclick="AbuQuestionTemplates.align('right')">يمين</button><button onclick="AbuQuestionTemplates.align('center')">وسط</button><button onclick="AbuQuestionTemplates.align('left')">يسار</button><button onclick="AbuQuestionTemplates.applyFormat()">تطبيق</button></div></div>
<div id="abuQCropModal" class="abu-qmodal"><div class="abu-qsheet"><div class="abu-qhead"><b>قص الصورة</b><button onclick="AbuQuestionTemplates.closeCrop()">×</button></div><canvas id="abuQCropCanvas" class="abu-crop-preview"></canvas><div class="abu-crop-ranges"><label>يسار<input id="qCropL" type="range" min="0" max="70" value="0"></label><label>يمين<input id="qCropR" type="range" min="30" max="100" value="100"></label><label>أعلى<input id="qCropT" type="range" min="0" max="70" value="0"></label><label>أسفل<input id="qCropB" type="range" min="30" max="100" value="100"></label></div><div class="abu-actions-row"><button onclick="AbuQuestionTemplates.applyCrop()">اعتماد القص</button><button class="alt" onclick="AbuQuestionTemplates.closeCrop()">إلغاء</button></div></div></div>`}

function addControls(){let bar=$('controls');if(!bar)return;if(!$('abuTemplatesBtn')){let b=document.createElement('button');b.id='abuTemplatesBtn';b.className='btn abu-qbtn';b.textContent='📚 القوالب';b.onclick=openTemplates;bar.appendChild(b)}if(!$('abuFormatBtn')){let b=document.createElement('button');b.id='abuFormatBtn';b.className='btn abu-format-btn';b.textContent='✍️ تنسيق';b.onclick=openFormat;bar.appendChild(b)}if(!$('abuUndo2')){let u=document.createElement('button');u.id='abuUndo2';u.className='btn btn-undo';u.textContent='↶ تراجع';u.onclick=undo2;bar.appendChild(u);let r=document.createElement('button');r.id='abuRedo2';r.className='btn btn-undo';r.textContent='↷ إعادة';r.onclick=redo2;bar.appendChild(r)}}

function currentHtml(){return $('pages-container')?.innerHTML||''}
function pushHistory(force=false){let now=currentHtml();if(!now||(!force&&now===lastSnapshot))return;if(lastSnapshot)history.push(lastSnapshot);if(history.length>40)history.shift();lastSnapshot=now;redoStack=[]}
function scheduleHistory(){clearTimeout(historyTimer);historyTimer=setTimeout(()=>pushHistory(false),700)}
function undo2(){if(!history.length)return;let now=currentHtml();let prev=history.pop();redoStack.push(now);$('pages-container').innerHTML=prev;lastSnapshot=prev;afterDomRestore()}
function redo2(){if(!redoStack.length)return;let now=currentHtml();history.push(now);let next=redoStack.pop();$('pages-container').innerHTML=next;lastSnapshot=next;afterDomRestore()}
function afterDomRestore(){try{if(typeof rebindAllDraggables==='function')rebindAllDraggables();if(typeof scheduleQuestionDraft==='function')scheduleQuestionDraft()}catch(e){}enhanceImages()}

function renderSubjects(){let box=$('abuSubjects');if(!box)return;box.innerHTML='';['math1','science3','science4','islamic'].forEach(k=>{let b=document.createElement('button');b.textContent=subjectMeta[k].label;b.classList.toggle('on',currentSubject===k);b.onclick=()=>{currentSubject=k;document.dispatchEvent(new CustomEvent('abuQuestionSubjectChanged',{detail:{subject:k}}));renderSubjects();renderTemplates()};box.appendChild(b)})}
function cardHtml(t,isCustom=false){return `<div class="abu-tcard"><div class="abu-tpreview"><b>${esc(t.name)}</b><span>${t.subject==='general'?'قالب عام':'قالب خاص بالمادة'}</span></div><b>${esc(t.name)}</b><button onclick="AbuQuestionTemplates.applyTemplate('${esc(t.id)}',${isCustom?'true':'false'})">استخدام النموذج</button></div>`}
function renderTemplates(){let spec=$('abuSubjectTemplates'),gen=$('abuGeneralTemplates');if(!spec||!gen)return;let list=SYSTEM_TEMPLATES.filter(t=>t.subject===currentSubject);let custom=customTemplates.filter(t=>t.subject===currentSubject);spec.innerHTML=list.map(t=>cardHtml(t)).join('')+custom.map(t=>cardHtml(t,true)).join('');gen.innerHTML=GENERAL_TEMPLATES.map(t=>cardHtml(t)).join('')+customTemplates.filter(t=>t.subject==='general').map(t=>cardHtml(t,true)).join('')}
function openTemplates(){renderSubjects();renderTemplates();$('abuQTemplateModal')?.classList.add('show')}
function closeTemplates(){$('abuQTemplateModal')?.classList.remove('show')}
function findTemplate(id,isCustom){return (isCustom?customTemplates:SYSTEM_TEMPLATES).find(t=>t.id===id)}
function applyTemplate(id,isCustom=false){let t=findTemplate(id,isCustom);if(!t)return;pushHistory(true);$('pages-container').innerHTML=t.html;lastSnapshot=currentHtml();afterDomRestore();closeTemplates();try{localStorage.setItem('abuLastQuestionTemplateV1',id)}catch(e){}}

function openProfile(){closeTemplates();for(let [id,key] of [['qpfAdministration','administration'],['qpfSchool','school'],['qpfSchoolType','schoolType'],['qpfTeacher','teacher'],['qpfYear','year'],['qpfRole','role'],['qpfDay','day'],['qpfDate','date'],['qpfTitle','examTitle'],['qpfDuration','duration']])if($(id))$(id).value=profile[key]||'';$('abuQProfileModal')?.classList.add('show')}
function closeProfile(){$('abuQProfileModal')?.classList.remove('show')}
function readProfile(){for(let [id,key] of [['qpfAdministration','administration'],['qpfSchool','school'],['qpfSchoolType','schoolType'],['qpfTeacher','teacher'],['qpfYear','year'],['qpfRole','role'],['qpfDay','day'],['qpfDate','date'],['qpfTitle','examTitle'],['qpfDuration','duration']])if($(id))profile[key]=$(id).value.trim();return save(PROFILE_KEY,profile)}
function saveProfile(){if(!readProfile())return alert('تعذر حفظ بيانات الترويسة بسبب امتلاء مساحة التخزين.');closeProfile()}
function applyProfile(){const stored=readProfile();pushHistory(true);document.querySelectorAll('.header').forEach(h=>{let meta=subjectMeta[currentSubject]||{};let holder=document.createElement('div');holder.innerHTML=headerHtml(meta,profile.examTitle);h.replaceWith(holder.firstElementChild)});lastSnapshot=currentHtml();afterDomRestore();if(!stored)alert('تم تطبيق البيانات على الورقة، لكن تعذر حفظها كإعداد دائم بسبب امتلاء مساحة التخزين.');closeProfile()}
function saveCustom(){let name=prompt('اسم النموذج الجديد:','نموذجي الجديد');if(!name)return;let subject=confirm('هل تحفظه كنموذج عام يظهر مع كل المواد؟')?'general':currentSubject;let id='custom-'+Date.now(),next=[...customTemplates,{id,name:name.trim()||'نموذجي الجديد',subject,html:currentHtml()}].slice(-30);if(!save(CUSTOM_KEY,next))return alert('تعذر حفظ النموذج؛ غالبًا يحتوي القالب على صور كبيرة. صغّر الصور أو احفظها كمسودة فقط.');customTemplates=next;renderTemplates()}
function clearCustom(){if(!customTemplates.length)return alert('لا توجد نماذج مخصصة.');if(!confirm('حذف جميع النماذج التي أنشأتها؟ القوالب الأصلية لن تُحذف.'))return;if(!save(CUSTOM_KEY,[]))return alert('تعذر تحديث التخزين المحلي.');customTemplates=[];renderTemplates()}

function trackEditable(){document.addEventListener('focusin',e=>{let t=e.target;if(t&&t.getAttribute&&t.getAttribute('contenteditable')==='true')selectedEditable=t},true)}
function openFormat(){if(!selectedEditable)selectedEditable=document.querySelector('[contenteditable="true"]');if(!selectedEditable)return alert('حدد نصًا أو اضغط داخل مربع نص أولاً.');let st=getComputedStyle(selectedEditable);$('qFmtFont').value=[...$('qFmtFont').options].some(o=>st.fontFamily.includes(o.value))?[...$('qFmtFont').options].find(o=>st.fontFamily.includes(o.value)).value:'Tajawal';$('qFmtSize').value=parseInt(st.fontSize)||16;$('qFmtColor').value=rgbToHex(st.color)||'#111111';$('qFmtLetter').value=parseFloat(st.letterSpacing)||0;$('qFmtLine').value=parseFloat(st.lineHeight)/(parseFloat(st.fontSize)||16)||1.6;$('abuQFormatPop')?.classList.add('show')}
function closeFormat(){$('abuQFormatPop')?.classList.remove('show')}
function rgbToHex(rgb){let m=String(rgb).match(/\d+/g);if(!m||m.length<3)return '#111111';return '#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('')}
function cmd(c){pushHistory(true);try{document.execCommand(c,false,null)}catch(e){}scheduleHistory()}
function align(v){if(!selectedEditable)return;pushHistory(true);selectedEditable.style.textAlign=v;selectedEditable.style.direction='rtl';scheduleHistory()}
function applyFormat(){if(!selectedEditable)return;pushHistory(true);selectedEditable.style.fontFamily=$('qFmtFont').value;selectedEditable.style.fontSize=`${Math.max(8,Number($('qFmtSize').value)||16)}px`;selectedEditable.style.color=$('qFmtColor').value;selectedEditable.style.letterSpacing=`${Number($('qFmtLetter').value)||0}px`;selectedEditable.style.lineHeight=String(Number($('qFmtLine').value)||1.6);selectedEditable.style.direction='rtl';scheduleHistory();closeFormat()}

let cropTarget=null;let cropImage=null;
function enhanceImages(){document.querySelectorAll('.draggable-item.img-wrapper').forEach(w=>{let controls=w.querySelector('.img-controls');let img=w.querySelector('img');if(!controls||!img||w.dataset.abuEnhanced)return;w.dataset.abuEnhanced='1';let mk=(txt,title,fn)=>{let b=document.createElement('button');b.className='img-btn abu-img-extra';b.innerHTML=txt;b.title=title;b.onclick=e=>{e.stopPropagation();fn()};controls.appendChild(b)};mk('↻','تدوير',()=>{pushHistory(true);let r=((Number(w.dataset.rotation)||0)+90)%360;w.dataset.rotation=r;w.style.transform=`rotate(${r}deg)`;scheduleHistory()});mk('🔒','قفل/فتح',()=>{let locked=w.dataset.locked==='1';w.dataset.locked=locked?'0':'1';let mh=w.querySelector('.drag-move-handle'),rh=w.querySelector('.img-resize-handle');if(mh)mh.style.display=locked?'':'none';if(rh)rh.style.display=locked?'':'none';w.style.outline=locked?'':'2px solid #ef4444';scheduleHistory()});mk('⬆','للأمام',()=>{pushHistory(true);w.style.zIndex=String((Number(w.style.zIndex)||100)+10);scheduleHistory()});mk('⬇','للخلف',()=>{pushHistory(true);w.style.zIndex=String(Math.max(1,(Number(w.style.zIndex)||100)-10));scheduleHistory()});mk('♻','استبدال',()=>replaceImage(img));mk('✂','قص حر',()=>openCrop(img));})}
function replaceImage(img){let input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=async()=>{let f=input.files&&input.files[0];if(!f)return;try{let src;if(window.AbuQuestionFinalFixes?.optimizeImage)src=await AbuQuestionFinalFixes.optimizeImage(f);else{src=await new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(f)})}pushHistory(true);img.src=src;scheduleHistory();window.scheduleQuestionDraft?.()}catch(e){alert('تعذر استبدال الصورة: '+(e?.message||e))}};input.click()}
function openCrop(img){cropTarget=img;cropImage=new Image();cropImage.onload=()=>{['qCropL','qCropR','qCropT','qCropB'].forEach((id,i)=>$(id).value=[0,100,0,100][i]);drawCrop();$('abuQCropModal')?.classList.add('show')};cropImage.src=img.src}
function closeCrop(){$('abuQCropModal')?.classList.remove('show');cropTarget=null;cropImage=null}
function drawCrop(){if(!cropImage)return;let c=$('abuQCropCanvas'),max=700,s=Math.min(1,max/Math.max(cropImage.width,cropImage.height));c.width=Math.round(cropImage.width*s);c.height=Math.round(cropImage.height*s);let x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.drawImage(cropImage,0,0,c.width,c.height);let l=+$('qCropL').value/100,r=+$('qCropR').value/100,t=+$('qCropT').value/100,b=+$('qCropB').value/100;x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,0,c.width,c.height);if(r>l&&b>t){x.clearRect(l*c.width,t*c.height,(r-l)*c.width,(b-t)*c.height);x.drawImage(cropImage,l*cropImage.width,t*cropImage.height,(r-l)*cropImage.width,(b-t)*cropImage.height,l*c.width,t*c.height,(r-l)*c.width,(b-t)*c.height);x.strokeStyle='#22c55e';x.lineWidth=3;x.strokeRect(l*c.width,t*c.height,(r-l)*c.width,(b-t)*c.height)}}
function applyCrop(){if(!cropTarget||!cropImage)return;let l=+$('qCropL').value/100,r=+$('qCropR').value/100,t=+$('qCropT').value/100,b=+$('qCropB').value/100;if(r-l<.05||b-t<.05)return alert('منطقة القص صغيرة جدًا.');let c=document.createElement('canvas');c.width=Math.max(1,Math.round((r-l)*cropImage.width));c.height=Math.max(1,Math.round((b-t)*cropImage.height));c.getContext('2d').drawImage(cropImage,l*cropImage.width,t*cropImage.height,c.width,c.height,0,0,c.width,c.height);pushHistory(true);const isPng=String(cropTarget.src||'').startsWith('data:image/png');cropTarget.src=c.toDataURL(isPng?'image/png':'image/jpeg',isPng?undefined:.95);scheduleHistory();window.scheduleQuestionDraft?.();closeCrop()}

function bindCropRanges(){['qCropL','qCropR','qCropT','qCropB'].forEach(id=>$(id)?.addEventListener('input',drawCrop))}
function init(){addCss();document.body.insertAdjacentHTML('beforeend',modalHtml());addControls();trackEditable();bindCropRanges();enhanceImages();lastSnapshot=currentHtml();let container=$('pages-container');if(container){new MutationObserver(()=>{enhanceImages();scheduleHistory()}).observe(container,{childList:true,subtree:true,characterData:true});container.addEventListener('input',scheduleHistory,true)}let saved=load(STORE,{});if(saved.subject&&subjectMeta[saved.subject])currentSubject=saved.subject;window.addEventListener('beforeunload',()=>save(STORE,{subject:currentSubject}));}

window.AbuQuestionTemplates={openTemplates,closeTemplates,applyTemplate,openProfile,closeProfile,saveProfile,applyProfile,saveCustom,clearCustom,openFormat,closeFormat,cmd,align,applyFormat,closeCrop,applyCrop,undo:undo2,redo:redo2};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();