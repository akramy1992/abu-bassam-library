(()=>{
'use strict';

const DB_NAME='AbuBassamDocumentVaultV4';
const STORE='items';
const MAX_ITEMS=1000;
const LAST_SYNC_KEY='abuBassamVaultLastSyncV4';
const AUTO_SYNC_KEY='abuBassamVaultAutoSyncV4';
const SORT_KEY='abuBassamVaultSortV4';
const SYNC_POLICY_KEY='abuBassamSyncPolicyV5';
const $=id=>document.getElementById(id);
const VIEW_KEY='abuBassamVaultViewV5';
const SYSTEM_FOLDERS=['المستمسكات','المعاملات','الباجات'];
const state={items:[],filter:'all',sort:localStorage.getItem(SORT_KEY)||'date-desc',view:localStorage.getItem(VIEW_KEY)||'grid',query:'',urls:[],editor:null,ocrTarget:'clipboard',ocrImage:'',syncing:false,busy:false,uploadFolder:''};

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function uuid(){return globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():'vault-'+Date.now()+'-'+Math.random().toString(36).slice(2)}
function niceName(value){return String(value||'ملف').replace(/[\\/:*?"<>|]/g,'_').trim()||'ملف'}
function ext(name){let m=String(name||'').toLowerCase().match(/\.([a-z0-9\u0600-\u06ff]+)$/);return m?m[1]:''}
function isImage(item){return item.category==='image'||String(item.mime||'').startsWith('image/')}
function formatBytes(size){let n=Number(size)||0;if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(1)+' KB';return(n/1048576).toFixed(1)+' MB'}
function formatTime(value){try{return new Date(value).toLocaleString('ar-IQ')}catch(e){return value||''}}
function sessionOk(){return !!(window.AbuBassamCloud&&AbuBassamCloud.isConnected())}
function autoSync(){return localStorage.getItem(AUTO_SYNC_KEY)!=='0'}
function syncPolicy(){try{return Object.assign({mode:'daily',wifiOnly:false},JSON.parse(localStorage.getItem(SYNC_POLICY_KEY)||'{}'))}catch(e){return{mode:'daily',wifiOnly:false}}}
function knownNonWifi(){let connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection,type=String(connection&&connection.type||'').toLowerCase();return !!type&&!['wifi','ethernet','unknown'].includes(type)}
function automaticDue(){if(!autoSync()||!navigator.onLine)return false;let policy=syncPolicy();if(policy.mode==='manual')return false;if(policy.wifiOnly&&knownNonWifi())return false;let elapsed=Date.now()-Number(localStorage.getItem(LAST_SYNC_KEY)||0);if(policy.mode==='weekly')return elapsed>=604800000;if(policy.mode==='daily')return elapsed>=86400000;return hasPending()||elapsed>=900000}

let dbPromise;
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    let request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{let db=request.result,store=db.createObjectStore(STORE,{keyPath:'id'});store.createIndex('category','category');store.createIndex('updatedAt','updatedAt')};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('تعذر فتح قاعدة الحفظ'));
  });
  return dbPromise
}
async function dbAll(){let db=await openDb();return new Promise((resolve,reject)=>{let request=db.transaction(STORE,'readonly').objectStore(STORE).getAll();request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>reject(request.error)})}
async function dbPut(item){let db=await openDb();return new Promise((resolve,reject)=>{let tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(item);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function dbDelete(id){let db=await openDb();return new Promise((resolve,reject)=>{let tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}

function addCss(){
  let style=document.createElement('style');style.id='vaultStyle';style.textContent=`
#vaultCenter{display:none;padding:12px;background:var(--bg,#f5efe8);min-height:82vh}.vault-show{display:block!important}.v-shell{max-width:920px;margin:auto;color:var(--text,#2b211d);font-family:Tahoma,Arial,sans-serif}.v-hero{border-radius:21px;padding:15px;color:#fff;background:radial-gradient(circle at 8% 12%,#55d6b655,transparent 28%),linear-gradient(135deg,#102d47,#075f65 58%,#a77932);box-shadow:0 12px 30px #102d4730}.v-hero h2{margin:0;font-size:18px}.v-hero p{font-size:9px;opacity:.88;margin:5px 0 10px}.v-search{display:flex;align-items:center;gap:7px;background:#fff;border-radius:13px;padding:3px 9px;color:#18303b}.v-search input{width:100%;border:0;outline:0;background:transparent;padding:10px 4px;font:700 12px Tahoma;color:#222}.v-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.v-actions button{border:1px solid #ffffff3b;border-radius:10px;background:#ffffff18;color:#fff;min-height:42px;font-size:8px;font-weight:900;padding:4px}.v-syncline{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;font-size:8px}.v-auto{display:flex;align-items:center;gap:5px}
.v-tabs{display:flex;gap:7px;margin:11px 0;overflow:auto;padding-bottom:3px}.v-tab{border:1px solid #b8957655;border-radius:12px;background:var(--surface2,#fff);color:var(--text,#222);padding:10px 9px;font-size:9px;font-weight:900;white-space:nowrap}.v-tab.active{background:#087f72;color:#fff;border-color:#087f72}.v-upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v-upload{border:1px dashed #087f7288;border-radius:15px;background:linear-gradient(145deg,#fff,#eef8f5);padding:14px 7px;text-align:center;color:#075b51;font-size:9px;font-weight:900}.v-upload span{display:block;font-size:28px;margin-bottom:5px}.v-counter{padding:9px 2px 5px;font-size:9px;color:#786b62;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap}.v-sort{display:flex;align-items:center;gap:5px;font-size:8px;font-weight:900}.v-sort select{max-width:150px;border:1px solid #b8957655;border-radius:9px;background:var(--surface2,#fff);color:var(--text,#222);padding:7px 5px;font-size:8px;font-weight:900}.v-view-switch{display:flex;gap:4px}.v-view-switch button{border:1px solid #b8957655;border-radius:8px;background:#fff;padding:7px}.v-view-switch button.active{background:#087f72;color:#fff}.v-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.v-grid.list{grid-template-columns:1fr}.v-grid.list .v-item{display:grid;grid-template-columns:86px 1fr;gap:8px}.v-grid.list .v-thumb{grid-row:1/5;height:92px}.v-grid.list .v-item-actions{grid-column:2}.v-item{background:#fff;border:1px solid #00000012;border-radius:14px;padding:7px;box-shadow:0 5px 14px #0000000c;min-width:0;color:#241f1b}.v-thumb{height:116px;border:0;width:100%;border-radius:10px;background:linear-gradient(145deg,#edf1f4,#dce6ea);display:grid;place-items:center;overflow:hidden;position:relative}.v-thumb img{width:100%;height:100%;object-fit:cover}.v-file-icon{font-size:42px}.v-pending{position:absolute;top:5px;left:5px;background:#d88418;color:#fff;border-radius:10px;padding:3px 6px;font-size:7px}.v-favorite{position:absolute;top:5px;right:5px;background:#fff;color:#bd841f;border-radius:50%;width:25px;height:25px;display:grid;place-items:center;font-size:14px}.v-name{font-size:10px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:7px 2px 3px}.v-folder{font-size:7px;color:#087f72}.v-meta{font-size:7px;color:#7a7069;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v-item-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px}.v-item-actions button{border:0;border-radius:7px;min-height:30px;background:#e8f2ef;color:#075e53;font-size:7px;font-weight:900;padding:2px}.v-item-actions .favorite-on{background:#fff2ca;color:#8a5c00}.v-item-actions .danger{background:#ffe8e8;color:#a42d39}.v-empty{grid-column:1/-1;padding:40px 12px;text-align:center;color:#84776f;background:#fff;border-radius:15px;font-size:11px}
.v-modal{position:fixed;z-index:23000;inset:0;background:#000c;display:none;align-items:center;justify-content:center;padding:9px}.v-modal.show{display:flex}.v-dialog{width:min(760px,100%);max-height:94vh;overflow:auto;background:#f7f4ed;border-radius:18px;color:#211c18}.v-head{position:sticky;top:0;z-index:4;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#075e53;color:#fff}.v-head b{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.v-close{width:34px;height:34px;border:0;border-radius:50%;background:#fff2;color:#fff;font-size:20px}.v-body{padding:10px}.v-view{min-height:300px;display:grid;place-items:center;background:#202326;border-radius:12px;overflow:hidden;color:#fff}.v-view img{max-width:100%;max-height:70vh}.v-view iframe{width:100%;height:70vh;border:0;background:#fff}.v-view pre{white-space:pre-wrap;direction:auto;padding:12px;align-self:start;width:100%}.v-modal-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:9px}.v-modal-actions button{border:0;border-radius:10px;min-height:41px;background:#087f72;color:#fff;font-size:8px;font-weight:900}.v-modal-actions .alt{background:#6a5548}.v-modal-actions .danger{background:#a62d3a}
.v-edit-canvas{width:100%;max-height:54vh;object-fit:contain;background:#151515;border-radius:12px}.v-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.v-controls label{font-size:8px;font-weight:900;color:#685c54}.v-controls input{width:100%}.v-ocr-source{max-width:100%;max-height:240px;display:block;margin:0 auto 9px;border-radius:10px}.v-ocr-text{width:100%;min-height:190px;border:1px solid #b9a99d;border-radius:12px;padding:10px;direction:auto;font:700 12px/1.8 Tahoma;background:#fff}.v-progress{font-size:9px;color:#087f72;padding:8px;text-align:center;font-weight:900}.v-busy{position:fixed;z-index:25000;inset:0;background:#000b;display:none;align-items:center;justify-content:center}.v-busy.show{display:flex}.v-busy-card{background:#fff;border-radius:16px;padding:20px;min-width:240px;text-align:center;color:#222;font-size:11px;font-weight:900}.v-spinner{width:36px;height:36px;border:4px solid #ddd;border-top-color:#087f72;border-radius:50%;margin:0 auto 10px;animation:vspin .9s linear infinite}@keyframes vspin{to{transform:rotate(360deg)}}@media(min-width:700px){.v-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:390px){.v-actions{grid-template-columns:1fr 1fr}.v-grid{grid-template-columns:1fr 1fr}.v-item-actions{grid-template-columns:1fr 1fr}}
`;document.head.appendChild(style)
}

function mainHtml(){return `<div class="v-shell">
  <div class="v-hero">
    <h2>🗄️ الحفظ والمستندات</h2><p>أرشيف محلي منظم • بحث سريع • OCR • نسخ احتياطي • مزامنة بين الأجهزة</p>
    <label class="v-search">🔎<input id="vSearch" placeholder="ابحث باسم أي كتاب أو صورة أو ملف..." autocomplete="off"></label>
    <div class="v-actions"><button onclick="DocumentVault.openOcr()">📷 تحويل صورة إلى نص</button><button onclick="DocumentVault.backup('save')">⬇ نسخة على الجهاز</button><button onclick="DocumentVault.backup('share')">✉ Google / Gmail</button><button onclick="DocumentVault.syncNow()">↻ مزامنة الآن</button></div>
    <div class="v-syncline"><span id="vSyncStatus">المزامنة: جاهزة</span><label class="v-auto"><input id="vAutoSync" type="checkbox" onchange="DocumentVault.setAutoSync(this.checked)"> تلقائي يومياً وعند توفر الإنترنت</label></div>
  </div>
  <div class="v-tabs"><button class="v-tab active" data-filter="all" onclick="DocumentVault.setFilter('all')">الكل</button><button class="v-tab" data-filter="image" onclick="DocumentVault.setFilter('image')">الصور</button><button class="v-tab" data-filter="pdf" onclick="DocumentVault.setFilter('pdf')">PDF</button><button class="v-tab" data-filter="text" onclick="DocumentVault.setFilter('text')">النصوص</button><button class="v-tab" data-filter="file" onclick="DocumentVault.setFilter('file')">الملفات</button><button class="v-tab" data-filter="folder:المستمسكات" onclick="DocumentVault.setFilter('folder:المستمسكات')">المستمسكات</button><button class="v-tab" data-filter="folder:المعاملات" onclick="DocumentVault.setFilter('folder:المعاملات')">المعاملات</button><button class="v-tab" data-filter="folder:الباجات" onclick="DocumentVault.setFilter('folder:الباجات')">الباجات</button><button class="v-tab" data-filter="favorite" onclick="DocumentVault.setFilter('favorite')">★ المفضلة</button><button class="v-tab" data-filter="recent" onclick="DocumentVault.setFilter('recent')">🕘 الأخيرة</button></div>
  <div class="v-upload-grid"><button class="v-upload" onclick="DocumentVault.pickImages()"><span>🖼️</span>رفع صور أو كتب صورية<br>مع القص والتدوير والتحسين</button><button class="v-upload" onclick="DocumentVault.pickFiles()"><span>📚</span>رفع Word / Excel / PDF<br>وجميع أنواع الملفات</button></div>
  <div class="v-tabs"><button class="v-tab" onclick="DocumentVault.pickCollection('المستمسكات')">＋ رفع مستمسك</button><button class="v-tab" onclick="DocumentVault.pickCollection('المعاملات')">＋ رفع معاملة</button><button class="v-tab" onclick="DocumentVault.pickCollection('الباجات')">＋ رفع باج</button></div>
  <div class="v-counter"><span id="vCount">0 من 1000</span><label class="v-sort">ترتيب حسب <select id="vSort" onchange="DocumentVault.setSort(this.value)"><option value="date-desc">التاريخ — الأحدث</option><option value="date-asc">التاريخ — الأقدم</option><option value="alpha-asc">الأبجدية — أ إلى ي</option><option value="alpha-desc">الأبجدية — ي إلى أ</option><option value="size-desc">الحجم — الأكبر</option><option value="size-asc">الحجم — الأصغر</option><option value="type-asc">النوع</option></select></label><div class="v-view-switch"><button id="vGridBtn" onclick="DocumentVault.setView('grid')">▦</button><button id="vListBtn" onclick="DocumentVault.setView('list')">☷</button></div><button class="v-tab" style="padding:5px 9px" onclick="DocumentVault.createFolder()">＋ مجلد</button><button class="v-tab" style="padding:5px 9px" onclick="DocumentVault.pickBackup()">استعادة نسخة</button></div>
  <div id="vGrid" class="v-grid"></div>
  <input id="vImageInput" type="file" accept="image/*" multiple hidden>
  <input id="vFileInput" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,.zip,.rar,.7z,.odt,.ods,.epub,.mobi,.html,.xml,.json,*/*" multiple hidden>
  <input id="vBackupInput" type="file" accept=".zip,.abuvault,application/zip" hidden>
  <input id="vOcrInput" type="file" accept="image/*" hidden>
</div>`}

function modalHtml(){return `
<div id="vViewModal" class="v-modal"><div class="v-dialog"><div class="v-head"><b id="vViewTitle">المستند</b><button class="v-close" onclick="DocumentVault.closeModal('vViewModal')">×</button></div><div class="v-body"><div id="vView" class="v-view"></div><div class="v-modal-actions"><button id="vGalleryButton" onclick="DocumentVault.saveGalleryActive()">حفظ في المعرض</button><button onclick="DocumentVault.savePdfActive()">حفظ PDF</button><button onclick="DocumentVault.printActive()">🖨 طباعة</button><button onclick="DocumentVault.saveActive()">حفظ الأصل</button><button onclick="DocumentVault.shareActive()">مشاركة / Google</button><button class="alt" onclick="DocumentVault.closeModal('vViewModal')">عودة</button></div></div></div></div>
<div id="vEditModal" class="v-modal"><div class="v-dialog"><div class="v-head"><b>تحرير وتوضيح الصورة</b><button class="v-close" onclick="DocumentVault.closeModal('vEditModal')">×</button></div><div class="v-body"><canvas id="vEditCanvas" class="v-edit-canvas"></canvas><div class="v-controls"><label>قص من اليسار<input id="vCropL" type="range" min="0" max="45" value="0" oninput="DocumentVault.editorChanged()"></label><label>قص من اليمين<input id="vCropR" type="range" min="55" max="100" value="100" oninput="DocumentVault.editorChanged()"></label><label>قص من الأعلى<input id="vCropT" type="range" min="0" max="45" value="0" oninput="DocumentVault.editorChanged()"></label><label>قص من الأسفل<input id="vCropB" type="range" min="55" max="100" value="100" oninput="DocumentVault.editorChanged()"></label><label>الدوران<input id="vRotate" type="range" min="-180" max="180" step="90" value="0" oninput="DocumentVault.editorChanged()"></label><label>الإضاءة<input id="vBrightness" type="range" min="60" max="160" value="100" oninput="DocumentVault.editorChanged()"></label><label>التباين / التوضيح<input id="vContrast" type="range" min="60" max="180" value="100" oninput="DocumentVault.editorChanged()"></label></div><div class="v-modal-actions"><button onclick="DocumentVault.saveEditor()">اعتماد وحفظ</button><button onclick="DocumentVault.clarify()">✨ توضيح تلقائي</button><button class="alt" onclick="DocumentVault.resetEditor()">إعادة الأصل</button><button onclick="DocumentVault.saveEditorGallery()">حفظ في المعرض</button><button onclick="DocumentVault.saveEditorPdf()">حفظ PDF</button><button onclick="DocumentVault.printEditor()">🖨 طباعة</button></div></div></div></div>
<div id="vOcrModal" class="v-modal"><div class="v-dialog"><div class="v-head"><b>تحويل الصورة إلى نص قابل للنسخ</b><button class="v-close" onclick="DocumentVault.closeModal('vOcrModal')">×</button></div><div class="v-body"><div class="v-modal-actions"><button onclick="DocumentVault.ocrCamera()">📷 فتح الكاميرا</button><button onclick="DocumentVault.ocrGallery()">🖼 اختيار من الاستديو</button><button onclick="DocumentVault.ocrFilePicker()">📂 ملف صورة</button><button class="alt" onclick="DocumentVault.clearOcr()">مسح النص</button></div><img id="vOcrImage" class="v-ocr-source" style="display:none"><div id="vOcrProgress" class="v-progress">اختر صورة واضحة لبدء قراءة النص العربي أو الإنجليزي.</div><textarea id="vOcrText" class="v-ocr-text" placeholder="سيظهر النص هنا ويمكن تعديله ونسخه..."></textarea><div class="v-modal-actions"><button onclick="DocumentVault.copyOcr()">نسخ النص</button><button onclick="DocumentVault.selectOcr()">تحديد الكل</button><button onclick="DocumentVault.shareOcr()">مشاركة النص</button><button onclick="DocumentVault.saveOcrText()">حفظ TXT</button><button onclick="DocumentVault.saveOcrPdf()">حفظ PDF</button><button onclick="DocumentVault.saveOcrWithImage()">PDF مع الصورة</button><button onclick="DocumentVault.reOcr()">إعادة OCR</button><button onclick="DocumentVault.printOcr()">🖨 طباعة النص</button><button id="vOcrLoginBtn" onclick="DocumentVault.useOcrLogin()">إرسال إلى كارت الدخول</button></div></div></div></div>
<div id="vBusy" class="v-busy"><div class="v-busy-card"><div class="v-spinner"></div><div id="vBusyText">جاري العمل...</div></div></div>
`}

async function build(){
  if($('vaultCenter'))return;
  addCss();let app=document.querySelector('.app'),preview=document.querySelector('.app .preview');if(!app)return;
  let section=document.createElement('section');section.id='vaultCenter';section.innerHTML=mainHtml();app.insertBefore(section,preview||null);document.body.insertAdjacentHTML('beforeend',modalHtml());
  $('vSearch').oninput=event=>{state.query=event.target.value;render()};
  $('vSort').value=state.sort;
  $('vAutoSync').checked=autoSync();
  $('vImageInput').onchange=event=>addFiles(event.target.files,'image',event.target);
  $('vFileInput').onchange=event=>addFiles(event.target.files,'file',event.target);
  $('vBackupInput').onchange=event=>restoreBackup(event.target.files&&event.target.files[0]);
  $('vOcrInput').onchange=event=>ocrFile(event.target.files&&event.target.files[0]);
  await refresh();
  window.addEventListener('online',()=>{setSyncStatus('عاد الإنترنت • فحص جدول المزامنة');if(automaticDue())syncNow(false)});
  window.addEventListener('offline',()=>setSyncStatus('لا يوجد إنترنت • الحفظ المحلي يعمل'));
  setTimeout(()=>{if(automaticDue())syncNow(false)},5000);
  setInterval(()=>{if(automaticDue())syncNow(false)},900000)
}

function setBusy(on,text='جاري العمل...'){state.busy=!!on;if($('vBusy'))$('vBusy').classList.toggle('show',!!on);if($('vBusyText'))$('vBusyText').textContent=text}
function showModal(id){$(id).classList.add('show')}
function closeModal(id){$(id).classList.remove('show')}
function setSyncStatus(text){if($('vSyncStatus'))$('vSyncStatus').textContent='المزامنة: '+text}
function setAutoSync(value){localStorage.setItem(AUTO_SYNC_KEY,value?'1':'0');setSyncStatus(value?'تلقائية مفعّلة':'تلقائية متوقفة')}
function hasPending(){return state.items.some(item=>item.syncState==='pending')}
function logOperation(type,title,details='',fileName=''){if(window.AbuBassamOps&&AbuBassamOps.add)AbuBassamOps.add({type,title,details,fileName,section:'الحفظ والمستندات'})}

async function refresh(){
  state.items=(await dbAll()).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  render()
}
function cleanupUrls(){state.urls.forEach(url=>{try{URL.revokeObjectURL(url)}catch(e){}});state.urls=[]}
function objectUrl(blob){let url=URL.createObjectURL(blob);state.urls.push(url);return url}
function fileIcon(item){let e=ext(item.name);if(e==='pdf')return'📕';if(['doc','docx','odt','rtf'].includes(e))return'🟦';if(['xls','xlsx','ods','csv'].includes(e))return'🟩';if(['ppt','pptx'].includes(e))return'🟧';if(['zip','rar','7z'].includes(e))return'🗜️';if(['epub','mobi'].includes(e))return'📚';return'📄'}
function typeOf(item){let e=ext(item.name);if(isImage(item))return'image';if(e==='pdf')return'pdf';if(['txt','rtf','csv','json','xml','html'].includes(e))return'text';return'file'}
function visibleItems(){let q=state.query.trim().toLocaleLowerCase('ar'),active=state.items.filter(item=>!item.deleted),match=item=>state.filter==='all'||state.filter==='favorite'&&item.favorite||state.filter==='recent'&&item.lastOpenedAt||state.filter.startsWith('folder:')&&item.folder===state.filter.slice(7)||typeOf(item)===state.filter,items=active.filter(item=>match(item)&&(!q||[item.name,item.mime,ext(item.name),item.folder].join(' ').toLocaleLowerCase('ar').includes(q))),sort=state.sort||'date-desc';if(state.filter==='recent')sort='opened-desc';items.sort((a,b)=>{if(sort==='alpha-asc'||sort==='alpha-desc'){let n=String(a.name||'').localeCompare(String(b.name||''),'ar',{numeric:true,sensitivity:'base'});return sort==='alpha-desc'?-n:n}if(sort==='size-asc'||sort==='size-desc'){let n=(Number(a.size)||0)-(Number(b.size)||0);return sort==='size-desc'?-n:n}if(sort==='type-asc')return typeOf(a).localeCompare(typeOf(b),'ar')||String(a.name).localeCompare(String(b.name),'ar');if(sort==='opened-desc')return Date.parse(b.lastOpenedAt||0)-Date.parse(a.lastOpenedAt||0);let n=Date.parse(a.createdAt||a.updatedAt||0)-Date.parse(b.createdAt||b.updatedAt||0);return sort==='date-asc'?n:-n});return items}
function render(){
  let grid=$('vGrid');if(!grid)return;cleanupUrls();let active=state.items.filter(item=>!item.deleted),items=visibleItems();
  $('vCount').textContent=`${active.length} من ${MAX_ITEMS} • الظاهر ${items.length}`;
  document.querySelectorAll('.v-tab[data-filter]').forEach(button=>button.classList.toggle('active',button.dataset.filter===state.filter));grid.classList.toggle('list',state.view==='list');$('vGridBtn')?.classList.toggle('active',state.view==='grid');$('vListBtn')?.classList.toggle('active',state.view==='list');
  grid.innerHTML=items.length?items.map(item=>{let thumb=isImage(item)?`<img src="${objectUrl(item.blob)}" alt="">`:`<div class="v-file-icon">${fileIcon(item)}</div>`;return `<article class="v-item"><button class="v-thumb" onclick="DocumentVault.openItem('${item.id}')">${thumb}${item.syncState==='pending'?'<span class="v-pending">بانتظار المزامنة</span>':''}${item.favorite?'<span class="v-favorite">★</span>':''}</button><div class="v-name" title="${esc(item.name)}">${esc(item.name)}</div>${item.folder?`<div class="v-folder">📁 ${esc(item.folder)}</div>`:''}<div class="v-meta">${typeOf(item)==='image'?'صورة':typeOf(item)==='pdf'?'PDF':typeOf(item)==='text'?'نص':'ملف'} • ${formatBytes(item.size)} • ${formatTime(item.updatedAt)}</div><div class="v-item-actions"><button onclick="DocumentVault.${isImage(item)?'editItem':'openItem'}('${item.id}')">${isImage(item)?'تحرير':'فتح'}</button><button onclick="DocumentVault.printItem('${item.id}')">طباعة</button><button onclick="DocumentVault.saveItem('${item.id}')">حفظ</button><button class="${item.favorite?'favorite-on':''}" onclick="DocumentVault.toggleFavorite('${item.id}')">${item.favorite?'★':'☆'}</button><button onclick="DocumentVault.moveItem('${item.id}')">نقل</button><button onclick="DocumentVault.renameItem('${item.id}')">تسمية</button><button onclick="DocumentVault.shareItem('${item.id}')">مشاركة</button><button class="danger" onclick="DocumentVault.deleteItem('${item.id}')">حذف</button></div></article>`}).join(''):'<div class="v-empty">لا توجد نتائج. ارفع صوراً أو كتباً أو ملفات من الأيقونات في الأعلى.</div>'
}
function setFilter(filter){state.filter=filter;render()}
function setSort(sort){state.sort=sort;localStorage.setItem(SORT_KEY,sort);render()}
function setView(view){state.view=view==='list'?'list':'grid';localStorage.setItem(VIEW_KEY,state.view);render()}
function createFolder(){let name=prompt('اسم المجلد الجديد:');if(!name||!name.trim())return;let folders=readFolders();name=niceName(name);if(!folders.includes(name))folders.push(name);localStorage.setItem('abuBassamVaultFoldersV5',JSON.stringify(folders));alert('تم إنشاء المجلد «'+name+'» ✓')}
function readFolders(){try{return [...new Set([...SYSTEM_FOLDERS,...JSON.parse(localStorage.getItem('abuBassamVaultFoldersV5')||'[]')])]}catch(e){return SYSTEM_FOLDERS.slice()}}
async function moveItem(id){let item=findItem(id);if(!item)return;let folders=readFolders(),answer=prompt('اكتب اسم المجلد الذي تريد نقل الملف إليه:\n'+(folders.length?'المجلدات: '+folders.join('، '):'يمكنك كتابة اسم مجلد جديد.'),item.folder||'');if(answer===null)return;answer=niceName(answer);if(answer&&!folders.includes(answer)){folders.push(answer);localStorage.setItem('abuBassamVaultFoldersV5',JSON.stringify(folders))}item.folder=answer;item.updatedAt=new Date().toISOString();item.syncState='pending';await dbPut(item);await refresh();logOperation('move','نقل ملف إلى مجلد',answer,item.name)}
async function toggleFavorite(id){let item=findItem(id);if(!item)return;item.favorite=!item.favorite;item.updatedAt=new Date().toISOString();item.syncState='pending';await dbPut(item);await refresh()}
function pickImages(){state.uploadFolder='';$('vImageInput').value='';$('vImageInput').click()}
function pickFiles(){state.uploadFolder='';$('vFileInput').value='';$('vFileInput').click()}
function pickCollection(folder){state.uploadFolder=SYSTEM_FOLDERS.includes(folder)?folder:'';$('vFileInput').value='';$('vFileInput').click()}
function pickBackup(){$('vBackupInput').value='';$('vBackupInput').click()}

async function addBlob(name,blob,category,id,folder=''){
  let now=new Date().toISOString(),item={id:id||uuid(),name:niceName(name),category,mime:blob.type||'application/octet-stream',size:blob.size,createdAt:now,updatedAt:now,folder:folder||'',favorite:false,lastOpenedAt:'',blob,syncState:'pending',deleted:false};
  await dbPut(item);return item
}
async function addFiles(fileList,category,input){
  let files=[...(fileList||[])];if(!files.length)return;
  let count=state.items.filter(item=>!item.deleted).length,room=MAX_ITEMS-count;if(room<=0){alert('وصل الأرشيف إلى الحد الأقصى: 1000 عنصر');return}
  if(files.length>room)alert(`سيتم حفظ أول ${room} ملف فقط لأن الحد الأقصى 1000.`);
  setBusy(true,'جاري حفظ الملفات بأسمائها الأصلية...');
  try{let folder=state.uploadFolder;for(let file of files.slice(0,room))await addBlob(file.name,file,category,undefined,folder);state.filter=folder?'folder:'+folder:category;await refresh();logOperation('upload',folder?'رفع إلى '+folder:category==='image'?'رفع صور إلى الأرشيف':'رفع ملفات إلى الأرشيف',files.slice(0,room).length+' عنصر');setSyncStatus('تم الحفظ محلياً • بانتظار المزامنة');if(autoSync()&&navigator.onLine)setTimeout(()=>syncNow(false),700)}
  catch(e){alert('تعذر حفظ أحد الملفات: '+(e.message||e))}
  finally{setBusy(false);state.uploadFolder='';if(input)input.value=''}
}
function findItem(id){return state.items.find(item=>item.id===id)}
async function blobDataUrl(blob){return new Promise((resolve,reject)=>{let reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})}
function saveData(name,mime,data){if(window.Android&&Android.saveBase64)return Android.saveBase64(name,mime,data);let a=document.createElement('a');a.href=data;a.download=name;a.click()}
function shareData(name,mime,data){if(window.Android&&Android.shareBase64)return Android.shareBase64(name,mime,data);saveData(name,mime,data)}
async function saveItem(id){let item=findItem(id);if(!item||!item.blob)return;setBusy(true,'تجهيز الملف للحفظ...');try{saveData(item.name,item.mime,await blobDataUrl(item.blob));logOperation('save','حفظ الأصل: '+item.name,formatBytes(item.size))}finally{setBusy(false)}}
async function shareItem(id){let item=findItem(id);if(!item||!item.blob)return;setBusy(true,'تجهيز الملف للمشاركة...');try{shareData(item.name,item.mime,await blobDataUrl(item.blob));logOperation('share','مشاركة ملف','',item.name)}finally{setBusy(false)}}
let activeId='';
async function openItem(id){
  let item=findItem(id);if(!item)return;activeId=id;item.lastOpenedAt=new Date().toISOString();await dbPut(item);$('vViewTitle').textContent=item.name;let view=$('vView');view.innerHTML='';$('vGalleryButton').textContent=isImage(item)?'حفظ في المعرض':'حفظ في الجهاز';
  let url=objectUrl(item.blob),e=ext(item.name);
  if(isImage(item))view.innerHTML=`<img src="${url}" alt="${esc(item.name)}">`;
  else if(e==='pdf')view.innerHTML=`<iframe src="${url}"></iframe>`;
  else if(['txt','csv','json','xml','html'].includes(e)){let pre=document.createElement('pre');pre.textContent=await item.blob.text();view.appendChild(pre)}
  else view.innerHTML=`<div style="text-align:center;padding:25px"><div style="font-size:64px">${fileIcon(item)}</div><b>${esc(item.name)}</b><p style="font-size:10px;color:#ccc">الملف محفوظ بأمان. استخدم «حفظ نسخة» لفتحه بتطبيق Word أو Excel أو التطبيق المناسب.</p></div>`;
  showModal('vViewModal');logOperation('open','فتح: '+item.name,isImage(item)?'صورة':'ملف')
}
function saveActive(){if(activeId)saveItem(activeId)}
function shareActive(){if(activeId)shareItem(activeId)}
async function imagePdfData(item,data){if(!window.jspdf)throw new Error('محرك PDF غير جاهز');let image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=data});let doc=new jspdf.jsPDF({unit:'mm',format:'a4'}),iw=190,ih=iw*image.naturalHeight/image.naturalWidth;if(ih>277){ih=277;iw=ih*image.naturalWidth/image.naturalHeight}doc.addImage(data,item.mime==='image/png'?'PNG':'JPEG',(210-iw)/2,(297-ih)/2,iw,ih);return doc.output('datauristring')}
async function saveGalleryItem(id){let item=findItem(id);if(!item||!item.blob)return;if(!isImage(item))return saveItem(id);setBusy(true,'تجهيز الصورة للمعرض...');try{let data=await blobDataUrl(item.blob);if(window.Android&&Android.saveToGallery)Android.saveToGallery(item.name,item.mime,data);else saveData(item.name,item.mime,data);logOperation('gallery','حفظ في المعرض: '+item.name,formatBytes(item.size))}finally{setBusy(false)}}
async function savePdfItem(id){let item=findItem(id);if(!item||!item.blob)return;setBusy(true,'تجهيز PDF...');try{let data=await blobDataUrl(item.blob),e=ext(item.name),name=item.name.replace(/\.[^.]+$/,'')+'.pdf';if(e==='pdf')saveData(name,'application/pdf',data);else if(isImage(item))saveData(name,'application/pdf',await imagePdfData(item,data));else if(['txt','csv','json','xml','html'].includes(e)){let text=await item.blob.text(),html=`<!doctype html><html dir="auto"><head><meta charset="utf-8"><style>@page{size:A4;margin:15mm}body{font-family:Tahoma,Arial;white-space:pre-wrap;line-height:1.8}</style></head><body>${esc(text)}</body></html>`;if(window.Android&&Android.savePdfHtml)Android.savePdfHtml(name,html);else throw new Error('تحويل النص إلى PDF متاح داخل Android')}else{alert('هذا النوع يُحفظ بصيغته الأصلية. افتحه في Word أو Excel ثم اختر طباعة إلى PDF.');return}logOperation('pdf','حفظ PDF: '+item.name,formatBytes(item.size))}catch(e){alert(e.message||'تعذر إنشاء PDF')}finally{setBusy(false)}}
async function printItem(id){let item=findItem(id);if(!item||!item.blob)return;setBusy(true,'تجهيز الطباعة...');try{let data=await blobDataUrl(item.blob),e=ext(item.name);if(isImage(item)){if(window.Android&&Android.printPages)Android.printPages(JSON.stringify([data]),'A4',0);else throw new Error('الطباعة متاحة داخل Android')}else if(e==='pdf'){if(window.Android&&Android.printBase64)Android.printBase64(item.name,item.mime,data);else throw new Error('الطباعة متاحة داخل Android')}else if(['txt','csv','json','xml','html'].includes(e)){let text=await item.blob.text(),html=`<!doctype html><html dir="auto"><head><meta charset="utf-8"><style>@page{size:A4;margin:15mm}body{font-family:Tahoma,Arial;white-space:pre-wrap;line-height:1.8}</style></head><body>${esc(text)}</body></html>`;if(window.Android&&Android.printHtml)Android.printHtml(html);else throw new Error('الطباعة متاحة داخل Android')}else{alert('سيُفتح خيار مشاركة الملف؛ افتحه في التطبيق المناسب ثم اختر «طباعة».');await shareItem(id);return}logOperation('print','طباعة: '+item.name,formatBytes(item.size))}catch(e){alert(e.message||'تعذرت الطباعة')}finally{setBusy(false)}}
function saveGalleryActive(){if(activeId)saveGalleryItem(activeId)}
function savePdfActive(){if(activeId)savePdfItem(activeId)}
function printActive(){if(activeId)printItem(activeId)}
async function renameItem(id){
  let item=findItem(id);if(!item)return;let old=item.name,name=prompt('اكتب الاسم الجديد مع الامتداد:',item.name);if(!name||!name.trim())return;item.name=niceName(name);item.updatedAt=new Date().toISOString();item.syncState='pending';await dbPut(item);await refresh();logOperation('rename','إعادة تسمية ملف',old+' ← '+item.name);if(autoSync()&&navigator.onLine)setTimeout(()=>syncNow(false),500)
}
async function deleteItem(id){
  let item=findItem(id);if(!item||!confirm('حذف «'+item.name+'» من الأرشيف ومن الأجهزة المتزامنة؟'))return;
  await dbPut({id:item.id,name:item.name,category:item.category,mime:item.mime,size:0,createdAt:item.createdAt,updatedAt:new Date().toISOString(),blob:null,syncState:'pending',deleted:true});await refresh();logOperation('delete','حذف: '+item.name);if(autoSync()&&navigator.onLine)setTimeout(()=>syncNow(false),500)
}

async function editItem(id){
  let item=findItem(id);if(!item||!isImage(item))return;
  let src=objectUrl(item.blob),image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=src});
  state.editor={id,image,l:0,r:100,t:0,b:100,rotate:0,brightness:100,contrast:100};
  resetEditor(false);showModal('vEditModal');drawEditor(false)
}
function readEditorControls(){let e=state.editor;if(!e)return;e.l=+$('vCropL').value;e.r=+$('vCropR').value;e.t=+$('vCropT').value;e.b=+$('vCropB').value;e.rotate=+$('vRotate').value;e.brightness=+$('vBrightness').value;e.contrast=+$('vContrast').value}
function drawEditor(full){
  let e=state.editor;if(!e)return null;readEditorControls();let im=e.image,nw=im.naturalWidth,nh=im.naturalHeight,sx=nw*e.l/100,sy=nh*e.t/100,sw=nw*(e.r-e.l)/100,sh=nh*(e.b-e.t)/100;if(sw<10||sh<10)return null;
  let angle=e.rotate*Math.PI/180,ow=Math.abs(sw*Math.cos(angle))+Math.abs(sh*Math.sin(angle)),oh=Math.abs(sw*Math.sin(angle))+Math.abs(sh*Math.cos(angle)),scale=full?Math.min(1,6000/Math.max(ow,oh)):Math.min(1,1000/Math.max(ow,oh)),canvas=full?document.createElement('canvas'):$('vEditCanvas');
  canvas.width=Math.max(1,Math.round(ow*scale));canvas.height=Math.max(1,Math.round(oh*scale));let ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter=`brightness(${e.brightness}%) contrast(${e.contrast}%)`;ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(angle);ctx.drawImage(im,sx,sy,sw,sh,-sw*scale/2,-sh*scale/2,sw*scale,sh*scale);return canvas
}
function editorChanged(){drawEditor(false)}
function resetEditor(draw=true){if(!state.editor)return;Object.assign(state.editor,{l:0,r:100,t:0,b:100,rotate:0,brightness:100,contrast:100});[['vCropL',0],['vCropR',100],['vCropT',0],['vCropB',100],['vRotate',0],['vBrightness',100],['vContrast',100]].forEach(([id,value])=>$(id).value=value);if(draw)drawEditor(false)}
function clarify(){if(!state.editor)return;$('vBrightness').value=106;$('vContrast').value=128;editorChanged()}
async function saveEditor(){
  let canvas=drawEditor(true);if(!canvas)return alert('حدود القص صغيرة جداً');setBusy(true,'حفظ الصورة المعدّلة بدون ضغط ضياعي...');
  try{let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png')),item=findItem(state.editor.id);if(!blob||!item)throw new Error('تعذر إنشاء الصورة');item.blob=blob;item.mime='image/png';item.size=blob.size;item.name=item.name.replace(/\.[^.]+$/, '')+'.png';item.updatedAt=new Date().toISOString();item.syncState='pending';await dbPut(item);closeModal('vEditModal');await refresh();if(autoSync()&&navigator.onLine)setTimeout(()=>syncNow(false),500)}
  catch(e){alert(e.message||'تعذر حفظ التعديل')}
  finally{setBusy(false)}
}
function editorCanvas(){let canvas=drawEditor(true);if(!canvas)alert('حدود القص صغيرة جداً');return canvas}
function saveEditorGallery(){let canvas=editorCanvas();if(!canvas)return;let data=canvas.toDataURL('image/png'),name='Abu_Bassam_Edited_'+Date.now()+'.png';if(window.Android&&Android.saveToGallery)Android.saveToGallery(name,'image/png',data);else saveData(name,'image/png',data);logOperation('gallery','حفظ الصورة المعدّلة في المعرض')}
async function saveEditorPdf(){let canvas=editorCanvas();if(!canvas)return;try{let item={mime:'image/png'},data=canvas.toDataURL('image/png');saveData('Abu_Bassam_Edited_'+Date.now()+'.pdf','application/pdf',await imagePdfData(item,data));logOperation('pdf','حفظ الصورة المعدّلة PDF')}catch(e){alert(e.message||'تعذر إنشاء PDF')}}
function printEditor(){let canvas=editorCanvas();if(!canvas)return;let data=canvas.toDataURL('image/png');if(window.Android&&Android.printPages)Android.printPages(JSON.stringify([data]),'A4',0);else alert('الطباعة متاحة داخل تطبيق Android');logOperation('print','طباعة الصورة المعدّلة')}

function requestNative(mode){try{if(window.ReactNativeWebView&&typeof window.ReactNativeWebView.postMessage==='function'){window.ReactNativeWebView.postMessage(JSON.stringify({type:'openCamera',mode}));return true}}catch(e){}return false}
function openOcr(target='clipboard'){state.ocrTarget=target;$('vOcrLoginBtn').style.display=target==='login'?'block':'none';showModal('vOcrModal')}
function ocrCamera(){if(!requestNative('ocr')){$('vOcrInput').value='';$('vOcrInput').setAttribute('capture','environment');$('vOcrInput').click()}}
function ocrGallery(){$('vOcrInput').removeAttribute('capture');$('vOcrInput').value='';$('vOcrInput').click()}
function ocrFilePicker(){$('vOcrInput').removeAttribute('capture');$('vOcrInput').value='';$('vOcrInput').click()}
async function ocrFile(file){if(!file)return;try{await recognizeText(await blobDataUrl(file))}finally{$('vOcrInput').value=''}}
function loadScript(src,test){return new Promise((resolve,reject)=>{if(test())return resolve();let script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('تعذر تنزيل محرك قراءة النص'));document.head.appendChild(script)})}
async function ensureOcr(){await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',()=>!!window.Tesseract);if(!window.Tesseract)throw new Error('محرك قراءة النص غير متاح')}
async function recognizeText(dataUrl){
  state.ocrImage=dataUrl;$('vOcrImage').src=dataUrl;$('vOcrImage').style.display='block';$('vOcrProgress').textContent='جاري تجهيز محرك OCR...';showModal('vOcrModal');
  try{if(!window.Tesseract&&!sessionStorage.getItem('abuBassamOcrConsent')){if(!confirm('محرك OCR غير مضمّن بعد داخل هذه النسخة وسيحتاج تنزيله من الإنترنت لهذه الجلسة. لن تُرسل الصورة لخادم التطبيق. هل توافق على تنزيل المحرك؟'))throw new Error('أُلغي تنزيل محرك OCR');sessionStorage.setItem('abuBassamOcrConsent','1')}await ensureOcr();let result=await Tesseract.recognize(dataUrl,'ara+eng',{logger:event=>{if(event.status==='recognizing text')$('vOcrProgress').textContent='جاري قراءة النص محليًا... '+Math.round((event.progress||0)*100)+'%';else if(event.status)$('vOcrProgress').textContent='OCR: '+event.status}}),text=String(result&&result.data&&result.data.text||'').replace(/\n{3,}/g,'\n\n').trim();$('vOcrText').value=text;$('vOcrProgress').textContent=text?'تم استخراج النص ويمكنك تعديله أو نسخه ✓':'لم يظهر نص واضح؛ جرّب صورة أقرب وإضاءة أفضل.'}
  catch(e){$('vOcrProgress').textContent='تعذر OCR: يحتاج اتصالاً بالإنترنت في أول تشغيل. '+(e.message||e)}
}
function onOcrPhoto(dataUrl){if(dataUrl)recognizeText(dataUrl)}
function clearOcr(){$('vOcrText').value='';$('vOcrImage').removeAttribute('src');$('vOcrImage').style.display='none';$('vOcrProgress').textContent='اختر صورة واضحة لبدء قراءة النص.'}
function copyOcr(){let text=$('vOcrText').value;if(!text)return alert('لا يوجد نص للنسخ');if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>alert('تم نسخ النص ✓')).catch(()=>fallbackCopy());else fallbackCopy()}
function selectOcr(){let area=$('vOcrText');area.focus();area.select()}
function fallbackCopy(){let area=$('vOcrText');area.focus();area.select();document.execCommand('copy');alert('تم نسخ النص ✓')}
function textData(text){return'data:text/plain;charset=utf-8;base64,'+btoa(unescape(encodeURIComponent(text)))}
function shareOcr(){let text=$('vOcrText').value.trim();if(!text)return alert('لا يوجد نص للمشاركة');shareData('Abu_Bassam_OCR_'+Date.now()+'.txt','text/plain;charset=utf-8',textData(text));logOperation('share','مشاركة نص OCR')}
async function saveOcrText(){let text=$('vOcrText').value.trim();if(!text)return alert('لا يوجد نص للحفظ');await addBlob('نص مستخرج '+new Date().toLocaleDateString('ar-IQ')+'.txt',new Blob([text],{type:'text/plain;charset=utf-8'}),'file');await refresh();logOperation('save','حفظ نص OCR داخل الأرشيف');alert('تم حفظ النص داخل قسم الملفات')}
function useOcrLogin(){let text=$('vOcrText').value;if(window.CardsStudio&&CardsStudio.importOcrText){CardsStudio.importOcrText(text);closeModal('vOcrModal');$('tabCards')&&$('tabCards').click()}else alert('تعذر إرسال النص إلى الكارت')}
function ocrPrintHtml(){let text=$('vOcrText').value.trim();if(!text){alert('لا يوجد نص للطباعة');return''}return `<!doctype html><html dir="auto"><head><meta charset="utf-8"><style>@page{size:A4;margin:15mm}body{font-family:Tahoma,Arial;white-space:pre-wrap;line-height:1.9;font-size:13pt}</style></head><body>${esc(text)}</body></html>`}
function saveOcrPdf(){let html=ocrPrintHtml();if(!html)return;let name='Abu_Bassam_OCR_'+Date.now()+'.pdf';if(window.Android&&Android.savePdfHtml)Android.savePdfHtml(name,html);else alert('حفظ PDF متاح داخل تطبيق Android');logOperation('pdf','حفظ نص OCR بصيغة PDF')}
function saveOcrWithImage(){let text=$('vOcrText').value.trim();if(!text||!state.ocrImage)return alert('أضف صورة واستخرج النص أولاً');let html=`<!doctype html><html dir="auto"><head><meta charset="utf-8"><style>@page{size:A4;margin:12mm}body{font-family:Cairo,Tahoma,Arial;line-height:1.8}img{display:block;max-width:100%;max-height:125mm;object-fit:contain;margin:0 auto 8mm}pre{white-space:pre-wrap;direction:auto;border-top:1px solid #bbb;padding-top:5mm}</style></head><body><img src="${state.ocrImage}"><pre>${esc(text)}</pre></body></html>`;if(window.Android&&Android.savePdfHtml)Android.savePdfHtml('Abu_Bassam_OCR_Image_Text_'+Date.now()+'.pdf',html);else alert('الحفظ متاح داخل تطبيق Android');logOperation('pdf','حفظ نص OCR مع الصورة')}
function reOcr(){if(!state.ocrImage)return alert('اختر صورة أولاً');recognizeText(state.ocrImage)}
function printOcr(){let html=ocrPrintHtml();if(!html)return;if(window.Android&&Android.printHtml)Android.printHtml(html);else alert('الطباعة متاحة داخل تطبيق Android');logOperation('print','طباعة النص المستخرج OCR')}

function scrubSensitive(value,key=''){if(/pass|password|token|secret|session|credential|auth/i.test(key))return undefined;if(Array.isArray(value))return value.map(item=>scrubSensitive(item)).filter(item=>item!==undefined);if(value&&typeof value==='object'){let out={};Object.entries(value).forEach(([name,item])=>{let clean=scrubSensitive(item,name);if(clean!==undefined)out[name]=clean});return out}return value}
function settingsSnapshot(){let settings={};try{for(let index=0;index<localStorage.length;index++){let key=localStorage.key(index);if(/pass|password|token|secret|session|credential|auth/i.test(key))continue;let raw=localStorage.getItem(key);try{settings[key]=JSON.stringify(scrubSensitive(JSON.parse(raw)))}catch(e){settings[key]=raw}}}catch(e){}return{format:'AbuBassamSettings',version:5,createdAt:new Date().toISOString(),settings}}
function manifestFor(items){return {format:'AbuBassamVault',version:5,createdAt:new Date().toISOString(),count:items.length,includes:['المستندات','إعدادات التطبيق','القوالب','الخطوط','الألوان','الثيمات','سجل العمليات'],excludes:['كلمات المرور','رموز الدخول','الملفات المؤقتة'],items:items.map(item=>({id:item.id,name:item.name,category:item.category,mime:item.mime,size:item.size,createdAt:item.createdAt,updatedAt:item.updatedAt,folder:item.folder||'',favorite:!!item.favorite,lastOpenedAt:item.lastOpenedAt||'',path:'files/'+item.id+'/'+niceName(item.name)}))}}
async function buildBackup(){
  if(!window.JSZip)throw new Error('أداة النسخ الاحتياطي غير جاهزة');let items=state.items.filter(item=>!item.deleted&&item.blob);
  let zip=new JSZip(),manifest=manifestFor(items);zip.file('manifest.json',JSON.stringify(manifest,null,2));zip.file('app-settings.json',JSON.stringify(settingsSnapshot(),null,2));items.forEach((item,index)=>zip.file(manifest.items[index].path,item.blob));
  let base64=await zip.generateAsync({type:'base64',compression:'DEFLATE',compressionOptions:{level:6}},meta=>{$('vBusyText').textContent='إنشاء النسخة الاحتياطية... '+Math.round(meta.percent)+'%'});return'data:application/zip;base64,'+base64
}
async function backup(mode){
  setBusy(true,'إنشاء النسخة الاحتياطية...');
  try{let data=await buildBackup(),name='Abu_Bassam_Documents_'+new Date().toISOString().slice(0,10)+'.zip';if(mode==='share')shareData(name,'application/zip',data);else saveData(name,'application/zip',data);logOperation('backup',mode==='share'?'مشاركة نسخة احتياطية':'حفظ نسخة احتياطية',state.items.filter(item=>!item.deleted).length+' عنصر')}
  catch(e){alert(e.message||'تعذر إنشاء النسخة الاحتياطية')}
  finally{setBusy(false)}
}
async function restoreBackup(file){
  if(!file)return;if(!confirm('سيتم دمج النسخة مع البيانات الحالية والاحتفاظ بالنسختين عند التعارض. هل تريد المتابعة؟')){$('vBackupInput').value='';return}setBusy(true,'إنشاء نسخة أمان قبل الاستعادة...');
  try{if(!window.JSZip)throw new Error('أداة الاستعادة غير جاهزة');let safety=await buildBackup();saveData('Abu_Bassam_Before_Restore_'+Date.now()+'.zip','application/zip',safety);setBusy(true,'فحص سلامة النسخة واستعادتها...');let zip=await JSZip.loadAsync(file),entry=zip.file('manifest.json');if(!entry)throw new Error('هذه ليست نسخة احتياطية صالحة');let manifest=JSON.parse(await entry.async('string'));if(manifest.format!=='AbuBassamVault'||!Array.isArray(manifest.items))throw new Error('تنسيق النسخة غير معروف');let room=MAX_ITEMS-state.items.filter(item=>!item.deleted).length,added=0,keptBoth=0;for(let meta of manifest.items.slice(0,Math.max(0,room))){let packed=zip.file(meta.path);if(!packed)continue;let blob=await packed.async('blob'),existing=findItem(meta.id),same=existing&&existing.name===meta.name&&existing.size===blob.size,id=same?meta.id:(existing?(keptBoth++,uuid()):(meta.id||uuid())),name=existing&&!same?niceName(meta.name.replace(/(\.[^.]+)?$/,' (نسخة مستعادة)$1')):niceName(meta.name),item={id,name,category:meta.category==='image'?'image':'file',mime:meta.mime||blob.type||'application/octet-stream',size:blob.size,createdAt:meta.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),folder:meta.folder||'',favorite:!!meta.favorite,lastOpenedAt:meta.lastOpenedAt||'',blob,syncState:'pending',deleted:false};await dbPut(item);added++}let settingsEntry=zip.file('app-settings.json');if(settingsEntry){let snapshot=JSON.parse(await settingsEntry.async('string'));if(snapshot&&snapshot.format==='AbuBassamSettings'&&snapshot.settings)Object.entries(snapshot.settings).forEach(([key,value])=>{if(!/pass|password|token|secret|session|credential|auth/i.test(key))localStorage.setItem(key,String(value))})}$('vBackupInput').value='';await refresh();logOperation('restore','استعادة نسخة احتياطية',added+' عنصر'+(keptBoth?' • '+keptBoth+' تعارض احتُفظ بالنسختين':''));alert('تمت استعادة '+added+' عنصر بنجاح.'+(keptBoth?' احتُفظ بالنسختين في '+keptBoth+' تعارض.':'')+'\nأغلق التطبيق وافتحه لتطبيق كل إعدادات النسخة.');if(autoSync()&&navigator.onLine)setTimeout(()=>syncNow(false),700)}
  catch(e){alert('تعذرت الاستعادة: '+(e.message||e))}
  finally{setBusy(false)}
}

function cloud(){return window.AbuBassamCloud}
function remoteItem(data,blob){return{id:data.id,name:niceName(data.name),category:data.category==='image'?'image':'file',mime:data.mime||blob.type||'application/octet-stream',size:blob.size,createdAt:data.createdAt||data.updatedAt,updatedAt:data.updatedAt,folder:data.folder||'',favorite:!!data.favorite,lastOpenedAt:data.lastOpenedAt||'',blob,syncState:'synced',deleted:false}}
async function syncNow(manual=true){
  if(state.syncing)return false;
  if(!manual&&!automaticDue())return false;
  let policy=syncPolicy();
  if(policy.wifiOnly&&knownNonWifi()){
    setSyncStatus('بانتظار شبكة Wi‑Fi حسب الإعداد');
    if(manual)alert('المزامنة مضبوطة على Wi‑Fi فقط. اتصل بشبكة Wi‑Fi أو غيّر الإعداد.');
    return false
  }
  if(!navigator.onLine){
    setSyncStatus('لا يوجد إنترنت • التغييرات محفوظة محلياً');
    if(manual)alert('لا يوجد اتصال بالإنترنت الآن');
    return false
  }
  if(!sessionOk()){
    setSyncStatus('اربط حسابك لتفعيل المزامنة الآمنة');
    if(manual&&cloud())cloud().openLogin();
    return false
  }
  state.syncing=true;
  setSyncStatus('جاري رفع التغييرات إلى الحاوية الخاصة...');
  try{
    let service=cloud(),pending=state.items.filter(item=>item.syncState==='pending');
    for(let item of pending){
      let row=await service.get('vault',item.id),remote=row&&row.data;
      if(remote&&remote.updatedAt&&remote.updatedAt!==item.updatedAt&&!remote.deleted&&!item.deleted){
        let remoteTime=Date.parse(remote.updatedAt||0),localTime=Date.parse(item.updatedAt||0);
        if(remoteTime>localTime){
          let copy=Object.assign({},item,{id:uuid(),name:niceName(item.name.replace(/(\.[^.]+)?$/,' (نسخة محلية)$1')),updatedAt:new Date().toISOString(),syncState:'pending'});
          await dbPut(copy);
          item.syncState='synced';
          await dbPut(item);
          continue
        }
        if(remote.storagePath){
          let remoteBlob=await service.downloadVault(remote.storagePath);
          await dbPut(remoteItem(Object.assign({},remote,{id:uuid(),name:String(remote.name||item.name).replace(/(\.[^.]+)?$/,' (نسخة جهاز آخر)$1'),updatedAt:new Date().toISOString()}),remoteBlob))
        }
      }
      let data={id:item.id,name:item.name,category:item.category,mime:item.mime,size:item.size,createdAt:item.createdAt,updatedAt:item.updatedAt,folder:item.folder||'',favorite:!!item.favorite,lastOpenedAt:item.lastOpenedAt||'',deleted:!!item.deleted,storagePath:remote&&remote.storagePath||''};
      if(item.deleted){
        if(data.storagePath)await service.removeVault(data.storagePath).catch(()=>{});
        data.storagePath=''
      }else if(item.blob){
        data.storagePath=await service.uploadVault(item.id,item.blob,item.mime)
      }
      await service.upsert('vault',item.id,data);
      item.syncState='synced';
      await dbPut(item)
    }
    setSyncStatus('جاري استقبال تغييرات الأجهزة...');
    let rows=await service.list('vault',1000),local=new Map((await dbAll()).map(item=>[item.id,item]));
    for(let row of rows){
      let data=row.data;
      if(!data||!data.id)continue;
      let here=local.get(data.id),remoteTime=Date.parse(data.updatedAt||0),localTime=Date.parse(here&&here.updatedAt||0);
      if(here&&localTime>remoteTime)continue;
      if(data.deleted){await dbDelete(data.id);continue}
      if(here&&localTime===remoteTime&&here.syncState==='synced')continue;
      if(!data.storagePath)continue;
      let blob=await service.downloadVault(data.storagePath);
      await dbPut(remoteItem(data,blob))
    }
    localStorage.setItem(LAST_SYNC_KEY,String(Date.now()));
    await refresh();
    setSyncStatus('المزامنة الآمنة مكتملة بين الأجهزة ✓');
    if(manual)logOperation('sync','مزامنة الأرشيف الآمنة بين الأجهزة',state.items.filter(item=>!item.deleted).length+' عنصر');
    return true
  }catch(e){
    setSyncStatus('تعذرت الآن • التغييرات المحلية محفوظة');
    if(manual)alert('تعذرت المزامنة: '+(e.message||e));
    return false
  }finally{state.syncing=false}
}
function onShow(){refresh();let last=Number(localStorage.getItem(LAST_SYNC_KEY)||0);if(last)setSyncStatus('آخر مرة '+formatTime(last))}
async function stats(){let items=state.items.length?state.items:await dbAll(),active=items.filter(item=>!item.deleted);return{count:active.length,bytes:active.reduce((sum,item)=>sum+(Number(item.size)||0),0),images:active.filter(isImage).length,pdf:active.filter(item=>ext(item.name)==='pdf').length}}

const previousNativeResult=window.AbuBassamNativeCameraResult;
window.AbuBassamNativeCameraResult=function(result){if(result&&result.mode==='ocr')return onOcrPhoto(result.dataUrl);if(typeof previousNativeResult==='function')return previousNativeResult(result)};
window.DocumentVault={setFilter,setSort,setView,createFolder,moveItem,toggleFavorite,pickImages,pickFiles,pickCollection,pickBackup,openItem,editItem,renameItem,deleteItem,saveItem,shareItem,printItem,saveGalleryItem,savePdfItem,saveActive,shareActive,saveGalleryActive,savePdfActive,printActive,closeModal,editorChanged,resetEditor,clarify,saveEditor,saveEditorGallery,saveEditorPdf,printEditor,openOcr,ocrCamera,ocrGallery,ocrFilePicker,clearOcr,copyOcr,selectOcr,shareOcr,saveOcrText,saveOcrPdf,saveOcrWithImage,reOcr,printOcr,useOcrLogin,backup,syncNow,setAutoSync,onShow,stats};
window.addEventListener('DOMContentLoaded',build);
})();
