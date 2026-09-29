(()=>{
'use strict';
if(window.__ABU_QUESTIONS_COMPLETION_V2__)return;
window.__ABU_QUESTIONS_COMPLETION_V2__=true;
const $=id=>document.getElementById(id);
const PROFILE_KEY='abuQuestionHeaderProfileV1';
const IDB_NAME='AbuBassamQuestionDraftV2';
const IDB_STORE='drafts';
const IDB_KEY='ar';
const META_KEY='abuBassamQuestionDraftArabicV2Meta';
const LOCAL_TS_KEY='abuBassamQuestionDraftArabicV2LocalTs';
let answersVisible=localStorage.getItem('abuQuestionAnswersVisibleV1')==='1';
let saveTimer=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function profile(){try{return Object.assign({day:'',date:'',school:'مدرسة القادسية الابتدائية',schoolType:'للبنين',teacher:'أكرم حاتم الغزالي',year:'٢٠٢٦ - ٢٠٢٧',role:'الدور الأول'},JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}'))}catch(e){return{day:'',date:'',school:'مدرسة القادسية الابتدائية',schoolType:'للبنين',teacher:'أكرم حاتم الغزالي',year:'٢٠٢٦ - ٢٠٢٧',role:'الدور الأول'}}}
function addCss(){if($('abuQuestionsCompletionStyle'))return;const s=document.createElement('style');s.id='abuQuestionsCompletionStyle';s.textContent=`
.abu-answer-box{display:none;margin-top:9px;padding:9px;border:1px dashed #0f766e;border-radius:10px;background:#ecfdf5;color:#134e4a;font-size:12px}.abu-answer-box b{display:block;margin-bottom:5px}.abu-show-answers .abu-answer-box{display:block}.abu-answer-toggle{background:#7c3aed!important}.abu-question-overflow:after{content:'⚠ محتوى الصفحة أكبر من مساحة A4';position:absolute;left:14px;bottom:8px;background:#fee2e2;color:#991b1b;border-radius:9px;padding:5px 8px;font:800 9px Tajawal;z-index:500}.abu-extra-template{border-color:#7c3aed55!important}.abu-extra-template .abu-tpreview{border-color:#7c3aed55!important;background:linear-gradient(135deg,#faf5ff,#f0fdf4)!important}.abu-extra-template button{background:#6d28d9!important}@media print{.abu-question-overflow:after{display:none!important}.abu-answer-box{display:none!important}.abu-show-answers .abu-answer-box{display:block!important}}
`;document.head.appendChild(s)}
function removeQuestionLibraryBranding(){
  document.querySelectorAll('.a4-page img').forEach(img=>{const text=(img.alt+' '+img.title+' '+img.src).toLowerCase();if(/abu[_-]?bassam|مكتبة أبو بسام|library[_-]?logo/.test(text))img.remove()});
  document.querySelectorAll('.a4-page .library-logo,.a4-page .question-library-logo,.a4-page [data-library-logo]').forEach(el=>el.remove());
}
function normalizeHeaders(){
  const p=profile();document.querySelectorAll('.a4-page .header').forEach(header=>{
    const before=header.innerHTML;const after=before.replace(/اسم\s*التلميذ\s*[:：\/]?/g,'التاريخ /');if(after!==before)header.innerHTML=after;
    const boxes=header.querySelectorAll('.header-box');const left=boxes[0],right=boxes[boxes.length-1];
    if(left&&/مدرسة الجود الابتدائية/.test(left.textContent||''))left.innerHTML=left.innerHTML.replace('مدرسة الجود الابتدائية',esc(p.school));
    if(!right)return;
    if(!/التاريخ/.test(right.textContent||''))right.insertAdjacentHTML('beforeend',`<br><span class="abu-header-date">التاريخ / ${esc(p.date||'................')}</span>`);
    if(!/اليوم/.test(right.textContent||''))right.insertAdjacentHTML('beforeend',`<br><span class="abu-header-day">اليوم / ${esc(p.day||'................')}</span>`);
  });
}
function enhanceAnswers(){
  document.querySelectorAll('.question-container').forEach(q=>{
    if(q.querySelector(':scope > .abu-answer-box'))return;
    const box=document.createElement('div');box.className='abu-answer-box';box.innerHTML='<b>الإجابة النموذجية / الملاحظات</b><div contenteditable="true">اكتب الإجابة أو الملاحظة هنا...</div>';q.appendChild(box)
  });
  document.body.classList.toggle('abu-show-answers',answersVisible);syncAnswerButton();
}
function syncAnswerButton(){const b=$('abuAnswerToggle');if(b)b.textContent=answersVisible?'📝 الملاحظات/الإجابات: ظاهرة':'📝 الملاحظات/الإجابات: مخفية'}
function toggleAnswers(){answersVisible=!answersVisible;localStorage.setItem('abuQuestionAnswersVisibleV1',answersVisible?'1':'0');document.body.classList.toggle('abu-show-answers',answersVisible);syncAnswerButton();queueDraft()}
function installAnswerButton(){const bar=$('controls');if(!bar||$('abuAnswerToggle'))return;const b=document.createElement('button');b.id='abuAnswerToggle';b.className='btn abu-answer-toggle';b.type='button';b.onclick=toggleAnswers;bar.appendChild(b);syncAnswerButton()}
function scaleFor(el){const page=el.closest('.a4-page');if(!page)return 1;const rect=page.getBoundingClientRect();return rect.width&&page.offsetWidth?rect.width/page.offsetWidth:1}
const boundMove=new WeakSet(),boundResize=new WeakSet();
function stableSetup(wrapper,moveHandle,resizeHandle){
  if(moveHandle&&!boundMove.has(moveHandle)){
    boundMove.add(moveHandle);moveHandle.style.touchAction='none';
    moveHandle.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();e.stopPropagation();const s=scaleFor(wrapper),x=e.clientX,y=e.clientY,l=wrapper.offsetLeft,t=wrapper.offsetTop;try{moveHandle.setPointerCapture(e.pointerId)}catch(_){}
      const mv=ev=>{ev.preventDefault();wrapper.style.left=(l+(ev.clientX-x)/s)+'px';wrapper.style.top=(t+(ev.clientY-y)/s)+'px'};
      const up=()=>{moveHandle.removeEventListener('pointermove',mv);moveHandle.removeEventListener('pointerup',up);moveHandle.removeEventListener('pointercancel',up);queueDraft()};
      moveHandle.addEventListener('pointermove',mv);moveHandle.addEventListener('pointerup',up);moveHandle.addEventListener('pointercancel',up)
    })
  }
  if(resizeHandle&&!boundResize.has(resizeHandle)){
    boundResize.add(resizeHandle);resizeHandle.style.touchAction='none';
    resizeHandle.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();e.stopPropagation();const s=scaleFor(wrapper),x=e.clientX,y=e.clientY,w=wrapper.offsetWidth,h=wrapper.offsetHeight;try{resizeHandle.setPointerCapture(e.pointerId)}catch(_){}
      const mv=ev=>{ev.preventDefault();wrapper.style.width=Math.max(50,w-(ev.clientX-x)/s)+'px';wrapper.style.height=Math.max(50,h+(ev.clientY-y)/s)+'px'};
      const up=()=>{resizeHandle.removeEventListener('pointermove',mv);resizeHandle.removeEventListener('pointerup',up);resizeHandle.removeEventListener('pointercancel',up);queueDraft()};
      resizeHandle.addEventListener('pointermove',mv);resizeHandle.addEventListener('pointerup',up);resizeHandle.addEventListener('pointercancel',up)
    })
  }
}
function stableRebind(){
  document.querySelectorAll('.draggable-item').forEach(wrapper=>{
    let move=wrapper.querySelector('.drag-move-handle'),resize=wrapper.querySelector('.img-resize-handle');
    if(move&&!boundMove.has(move)){const n=move.cloneNode(true);move.replaceWith(n);move=n}
    if(resize&&!boundResize.has(resize)){const n=resize.cloneNode(true);resize.replaceWith(n);resize=n}
    stableSetup(wrapper,move,resize);
    const buttons=[...wrapper.querySelectorAll('.img-btn')],img=wrapper.querySelector('img');
    buttons.forEach(btn=>{if((btn.textContent||'').includes('❌'))btn.onclick=()=>{try{window.saveState?.()}catch(_){}wrapper.remove();queueDraft()};if(img&&(btn.textContent||'').includes('✂'))btn.onclick=()=>{try{window.saveState?.()}catch(_){}img.style.objectFit=img.style.objectFit==='cover'?'contain':'cover';btn.style.backgroundColor=img.style.objectFit==='cover'?'#4CAF50':'white';queueDraft()}})
  });
  document.querySelectorAll('.btn-del-page').forEach(button=>{button.onclick=()=>window.deletePage?.(button)})
}
function installStableDrag(){window.setupDragAndResize=stableSetup;window.rebindAllDraggables=stableRebind;stableRebind()}
function dbOpen(){return new Promise((resolve,reject)=>{const r=indexedDB.open(IDB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(IDB_STORE))r.result.createObjectStore(IDB_STORE,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function idbPut(html,updatedAt=Date.now()){try{const db=await dbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put({id:IDB_KEY,html,updatedAt});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close?.();return true}catch(e){return false}}
async function idbGet(){try{const db=await dbOpen();const row=await new Promise((resolve,reject)=>{const r=db.transaction(IDB_STORE,'readonly').objectStore(IDB_STORE).get(IDB_KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)});db.close?.();return row}catch(e){return null}}
async function saveDurableDraft(show=false){const c=$('pages-container');if(!c)return false;const html=c.innerHTML,ts=Date.now();let local=false;try{localStorage.setItem('abuBassamQuestionDraftArabicV1',html);localStorage.setItem(LOCAL_TS_KEY,String(ts));localStorage.setItem(META_KEY,String(ts));local=true}catch(e){}const cloudless=await idbPut(html,ts);if(show)alert(local||cloudless?'تم حفظ مسودة الأسئلة ✓':'تعذر حفظ المسودة');return local||cloudless}
function queueDraft(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveDurableDraft(false),650)}
async function restoreDurableIfNeeded(){const row=await idbGet();if(!row?.html)return;let local='',localTs=0;try{local=localStorage.getItem('abuBassamQuestionDraftArabicV1')||'';localTs=Number(localStorage.getItem(LOCAL_TS_KEY)||0)}catch(e){}const shouldRestore=!local||(localTs>0&&Number(row.updatedAt)>localTs+1000);if(shouldRestore){const c=$('pages-container');if(c){c.innerHTML=row.html;stableRebind();normalizeHeaders();enhanceAnswers();window.fitToScreen?.()}}}
function q(index,title,body,type='short'){return `<div class="question-container q${((index-1)%15)+1}" data-question-type="${type}"><div class="action-btns"><button onclick="moveUp(this)">⬆️</button><button onclick="moveDown(this)">⬇️</button><button onclick="duplicateQ(this)">📋</button><button onclick="deleteQ(this)">🗑️</button></div><div class="q-title" contenteditable="true"><span>✦</span> ${esc(title)}</div><div class="text-area" contenteditable="true">${body}</div></div>`}
function header(meta,title){const p=profile();return `<div class="header"><div class="header-box" contenteditable="true">إدارة: .........................<br>${esc(p.school)}<br>${esc(p.schoolType)}</div><div class="header-center" contenteditable="true"><span class="title">${esc(title)}</span><br>${esc(p.role)}<br>للعام ${esc(p.year)}</div><div class="header-box" contenteditable="true">${meta.grade?'الصف / '+esc(meta.grade)+'<br>':''}${meta.subject?'المادة / '+esc(meta.subject)+'<br>':''}معلم المادة / ${esc(p.teacher)}<br>التاريخ / ${esc(p.date||'................')}<br>اليوم / ${esc(p.day||'................')}</div></div>`}
function page(meta,title,note,questions){return `<div class="a4-page" id="main-page"><button class="btn-del-page" onclick="deletePage(this)">حذف الصفحة</button>${header(meta,title)}<div class="note-wrapper"><button class="del-note-btn" onclick="hideElement(this)">✖</button><div class="note-bar" contenteditable="true">${esc(note)}</div></div><div class="questions-area">${questions.join('')}</div></div>`}
const EXTRA={
 math1:[
  ['رياضيات الأول — نموذج ٤',[['الأعداد والترتيب — ٢ درجة','رتب: ٨، ٢، ٥، ١ من الأصغر إلى الأكبر.'],['المقارنة — ٢ درجة','ضع > أو < أو = : ٧ ( ) ٣ ، ٤ ( ) ٤ ، ٢ ( ) ٦.'],['الجمع — ٢ درجة','٣ + ٤ = ( ) ، ٢ + ٦ = ( ).'],['الطرح — ٢ درجة','٩ - ٣ = ( ) ، ٧ - ٢ = ( ).'],['مسألة — ٢ درجة','مع سارة ٥ أقلام، اشترت ٣ أخرى. كم أصبح لديها؟']]],
  ['رياضيات الأول — نموذج ٥',[['خط الأعداد — ٢ درجة','أكمل: ٠ — ١ — ٢ — ( ) — ٤ — ( ).'],['السابق واللاحق — ٢ درجة','( ) ٥ ( ) ، ( ) ٨ ( ).'],['الأشكال — ٢ درجة','سمِّ الأشكال: ○  △  □  ▭.'],['الأنماط — ٢ درجة','أكمل: ○ △ ○ △ ( ) ( ).'],['تفكير — ٢ درجة','أي العددين أقرب إلى ١٠: ٨ أم ٤؟ وضح.']]],
  ['رياضيات الأول — نموذج ٦',[['العد — ٢ درجة','🍎 🍎 🍎 🍎 🍎 = ( )'],['العدد المفقود — ٢ درجة','١، ٢، ( )، ٤، ( )، ٦.'],['الجمع بالصور — ٢ درجة','🍏🍏 + 🍏🍏🍏 = ( ).'],['الطرح بالصور — ٢ درجة','⭐⭐⭐⭐⭐ احذف نجمتين، الباقي ( ).'],['قصة عددية — ٢ درجة','في الصف ٦ تلاميذ، خرج تلميذان. كم بقي؟']]],
  ['رياضيات الأول — نموذج ٧',[['الطول — ٢ درجة','ضع خطًا تحت الشيء الأطول في كل زوج.'],['الكتلة — ٢ درجة','أيّهما أثقل: كتاب أم قلم؟'],['الوقت — ٢ درجة','اكتب الوقت عندما يشير العقرب الصغير إلى ٣ والكبير إلى ١٢.'],['النقود — ٢ درجة','معك ١٠، دفعت ٦. المتبقي ( ).'],['تفكير — ٢ درجة','اذكر شيئًا في الصف يمكن قياس طوله.']]],
  ['رياضيات الأول — نموذج ٨',[['أكمل إلى ١٠ — ٢ درجة','٧ + ( ) = ١٠ ، ٤ + ( ) = ١٠.'],['عائلات الحقائق — ٢ درجة','اكتب عمليتي جمع باستعمال ٢، ٣، ٥.'],['المقارنة — ٢ درجة','الأكبر: ٦ أم ٩؟ الأصغر: ٣ أم ٨؟'],['ترتيب — ٢ درجة','٩، ٤، ٧، ٢ من الأكبر إلى الأصغر.'],['تفكير — ٢ درجة','لديك عدد أكبر من ٥ وأصغر من ٨. ما الاحتمالات؟']]],
  ['رياضيات الأول — نموذج ٩',[['المكان — ٢ درجة','اكتب: فوق / تحت / يمين / يسار حسب الشكل الذي يرسمه المعلم.'],['الأشكال — ٢ درجة','ارسم دائرة ومربعًا ومثلثًا.'],['الأنماط — ٢ درجة','□ ○ ○ □ ○ ○ ( ) ( ) ( ).'],['الجمع — ٢ درجة','٥ + ١ = ( ) ، ٥ + ٢ = ( ).'],['مسألة — ٢ درجة','على الغصن ٧ عصافير طار ٣. كم بقي؟']]],
  ['رياضيات الأول — نموذج ١٠',[['أتعلم — ٢ درجة','اكتب الأعداد من ٠ إلى ٩ بالترتيب.'],['أتأكد — ٢ درجة','ضع دائرة حول العدد الأكبر: ٣، ٨، ٥.'],['أتحدث — ٢ درجة','اشرح كيف تعرف أن ٦ أكبر من ٤.'],['أحل — ٢ درجة','٤ + ٣ = ( ) ، ٨ - ٥ = ( ).'],['أفكر — ٢ درجة','كوّن مسألة من حياتك إجابتها ٧.']]]
 ],
 science3:[
  ['علوم الثالث — نموذج ٧',[['تغذية الكائنات — ٣ درجات','كيف تحصل النباتات والحيوانات على غذائها؟'],['الفطريات — ٣ درجات','اذكر مثالين للفطريات وفائدة أو ضررًا لكل مثال.'],['السلسلة الغذائية — ٤ درجات','كوّن سلسلة غذائية من ثلاثة كائنات.']]],
  ['علوم الثالث — نموذج ٨',[['مواد البيئة — ٣ درجات','اذكر ثلاث مواد من البيئة وفائدة كل منها.'],['الثروة الحيوانية — ٣ درجات','صنّف الحيوانات إلى آكلات أعشاب ولحوم وقوارت.'],['تفكير — ٤ درجات','ماذا يحدث إذا اختفى أحد أفراد السلسلة الغذائية؟']]],
  ['علوم الثالث — نموذج ٩',[['صنع الغذاء — ٣ درجات','ما الذي يحتاجه النبات لصنع غذائه؟'],['تخزين الغذاء — ٣ درجات','اذكر أجزاء نباتية تخزن الغذاء مع مثال.'],['المكافحة الحياتية — ٤ درجات','اشرح بمثال كيف تساعد كائنات حية في مكافحة الآفات.']]],
  ['علوم الثالث — نموذج ١٠',[['أدوية من الطبيعة — ٣ درجات','اذكر مثالًا لمادة دوائية مصدرها نبات أو حيوان.'],['الماء والهواء — ٣ درجات','لماذا يعد الماء والهواء مهمين للكائنات الحية؟'],['المعادن والصخور والتربة — ٤ درجات','قارن بين معدن وصخر وتربة من حيث الاستخدام.']]]
 ],
 general:[
  ['نموذج عام ٧',[['السؤال الأول — ٢ درجة','اختر الإجابة الصحيحة من الخيارات المعطاة.'],['السؤال الثاني — ٢ درجة','ضع صح أو خطأ أمام العبارات.'],['السؤال الثالث — ٣ درجات','أكمل الفراغات بما يناسب.'],['السؤال الرابع — ٣ درجات','أجب بإجابة قصيرة.']]],
  ['نموذج عام ٨',[['تعريفات — ٣ درجات','عرّف ثلاثة مصطلحات من المادة.'],['مقارنة — ٣ درجات','قارن بين مفهومين وفق نقطتين.'],['تطبيق — ٤ درجات','طبّق ما تعلمته على موقف جديد.']]],
  ['نموذج عام ٩',[['اختيار — ٣ درجات','اختر الإجابة الأدق واذكر السبب.'],['ترتيب — ٣ درجات','رتب الخطوات أو الأحداث ترتيبًا صحيحًا.'],['تفكير — ٤ درجات','فسّر النتيجة المتوقعة للموقف المعطى.']]],
  ['نموذج عام ١٠',[['أساسيات — ٢ درجة','أجب عن سؤالين مباشرين.'],['فهم — ٣ درجات','اشرح الفكرة الرئيسة بأسلوبك.'],['تطبيق — ٢ درجة','اذكر مثالًا من الحياة اليومية.'],['تفكير — ٣ درجات','اقترح حلًا أو استنتاجًا مناسبًا.']]]
 ]
};
function subjectKey(){
  const text=String($('abuSubjects')?.querySelector('button.on')?.textContent||'');if(text.includes('الثالث'))return'science3';if(text.includes('الرابع'))return'science4';if(text.includes('الإسلامية'))return'islamic';if(text.includes('الرياضيات'))return'math1';
  try{return window.AbuQuestionTypes?.subject?.()||'math1'}catch(e){return'math1'}
}
function metaFor(key){return key==='math1'?{grade:'الأول الابتدائي',subject:'الرياضيات'}:key==='science3'?{grade:'الثالث الابتدائي',subject:'العلوم'}:{grade:'................',subject:'................'}}
function extraCard(key,index,item){const id=`abu-extra-${key}-${index}`;return `<div class="abu-tcard abu-extra-template" data-extra-template="${id}"><div class="abu-tpreview"><b>${esc(item[0])}</b><span>تخطيط وأسئلة مستقلة</span></div><b>${esc(item[0])}</b><button type="button" onclick="AbuQuestionCompletion.applyExtra('${key}',${index})">استخدام النموذج</button></div>`}
function injectExtraTemplates(){
  const spec=$('abuSubjectTemplates'),gen=$('abuGeneralTemplates');if(!spec||!gen)return;
  const key=subjectKey(),extras=EXTRA[key]||[];extras.forEach((item,i)=>{const id=`abu-extra-${key}-${i}`;if(!spec.querySelector(`[data-extra-template="${id}"]`))spec.insertAdjacentHTML('beforeend',extraCard(key,i,item))});
  EXTRA.general.forEach((item,i)=>{const id=`abu-extra-general-${i}`;if(!gen.querySelector(`[data-extra-template="${id}"]`))gen.insertAdjacentHTML('beforeend',extraCard('general',i,item))})
}
function applyExtra(key,index){const item=EXTRA[key]?.[index];if(!item)return;const meta=metaFor(key);const questions=item[1].map((row,i)=>q(i+1,row[0],row[1])).join('');const html=page(meta,item[0],'أجب عن جميع الأسئلة مع مراعاة وضوح الخط.',[questions]);const c=$('pages-container');if(!c)return;try{window.saveState?.()}catch(_){}c.innerHTML=html;normalizeHeaders();enhanceAnswers();stableRebind();window.AbuQuestionTypes?.enhance?.();window.fitToScreen?.();window.checkAutoFlow?.();queueDraft();$('abuQTemplateModal')?.classList.remove('show')}
function wrapTemplates(){if(!window.AbuQuestionTemplates||AbuQuestionTemplates.__abuCompletionWrapped)return false;const origOpen=AbuQuestionTemplates.openTemplates?.bind(AbuQuestionTemplates),origApply=AbuQuestionTemplates.applyTemplate?.bind(AbuQuestionTemplates);if(origOpen)AbuQuestionTemplates.openTemplates=function(...args){const r=origOpen(...args);setTimeout(injectExtraTemplates,20);return r};if(origApply)AbuQuestionTemplates.applyTemplate=function(...args){const r=origApply(...args);setTimeout(()=>{normalizeHeaders();enhanceAnswers();stableRebind();window.fitToScreen?.();window.checkAutoFlow?.();queueDraft()},30);return r};AbuQuestionTemplates.__abuCompletionWrapped=true;return true}
function watch(){
  const c=$('pages-container');if(c){c.addEventListener('input',queueDraft,true);c.addEventListener('change',queueDraft,true);new MutationObserver(()=>{normalizeHeaders();removeQuestionLibraryBranding();enhanceAnswers();setTimeout(stableRebind,0);queueDraft()}).observe(c,{childList:true,subtree:true,characterData:true})}
  const modal=$('abuQTemplateModal');if(modal)new MutationObserver(()=>setTimeout(injectExtraTemplates,0)).observe(modal,{childList:true,subtree:true})
}
async function init(){addCss();installAnswerButton();normalizeHeaders();removeQuestionLibraryBranding();enhanceAnswers();installStableDrag();watch();await restoreDurableIfNeeded();let tries=0,t=setInterval(()=>{tries++;if(wrapTemplates()||tries>40)clearInterval(t)},100);setTimeout(injectExtraTemplates,500)}
window.AbuQuestionCompletion={toggleAnswers,applyExtra,save:saveDurableDraft,injectExtraTemplates,normalizeHeaders,rebind:stableRebind,ensureAnswers:enhanceAnswers};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();