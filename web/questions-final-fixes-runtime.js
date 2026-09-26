(()=>{
'use strict';
if(window.__ABU_QUESTIONS_FINAL_FIXES_V1__)return;
window.__ABU_QUESTIONS_FINAL_FIXES_V1__=true;
const $=id=>document.getElementById(id);
const DRAFT_KEY='abuBassamQuestionDraftArabicV1';
const META_KEY='abuBassamQuestionDraftArabicV2Meta';
const LOCAL_TS_KEY='abuBassamQuestionDraftArabicV2LocalTs';
const DB_NAME='AbuBassamQuestionDraftV2';
const STORE='drafts';
const ROW_ID='ar';
let saveTimer=0;
function openDb(){return new Promise((resolve,reject)=>{try{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}catch(e){reject(e)}})}
async function dbPut(html,ts){try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({id:ROW_ID,html,updatedAt:ts});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close?.();return true}catch(e){return false}}
async function dbDelete(){try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(ROW_ID);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close?.();return true}catch(e){return false}}
async function durableSave(show=false){const container=$('pages-container');if(!container)return false;const html=container.innerHTML,ts=Date.now();let localOk=false;try{localStorage.setItem(DRAFT_KEY,html);localStorage.setItem(LOCAL_TS_KEY,String(ts));localStorage.setItem(META_KEY,String(ts));localOk=true}catch(e){}const idbOk=await dbPut(html,ts);if(show)alert(localOk||idbOk?'تم حفظ مسودة الأسئلة ✓':'تعذر حفظ المسودة؛ مساحة التخزين غير متاحة.');return localOk||idbOk}
function schedule(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>durableSave(false),650)}
async function durableReset(){if(!confirm('بدء نموذج جديد؟ ستُحذف مسودة الأسئلة الحالية من التخزين المحلي والنسخة الاحتياطية.'))return;clearTimeout(saveTimer);try{localStorage.removeItem(DRAFT_KEY);localStorage.removeItem(META_KEY);localStorage.removeItem(LOCAL_TS_KEY)}catch(e){}await dbDelete();location.reload()}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('تعذر قراءة الصورة'));r.readAsDataURL(file)})}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('تعذر فتح الصورة'));im.src=src})}
async function optimizedImage(file){if(!file||!String(file.type||'').startsWith('image/'))throw new Error('الملف المختار ليس صورة.');if(file.size>40*1024*1024)throw new Error('الصورة أكبر من الحد الآمن 40MB.');const src=await fileToDataUrl(file),im=await loadImage(src),w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,maxSide=Math.max(w,h);if(maxSide<=2600&&file.size<=6*1024*1024)return src;const scale=Math.min(1,2600/maxSide),cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale)),canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;const ctx=canvas.getContext('2d',{alpha:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(im,0,0,cw,ch);const png=String(file.type).toLowerCase()==='image/png';return canvas.toDataURL(png?'image/png':'image/jpeg',png?undefined:.94)}
async function safeAddImage(event){const input=event?.target,file=input?.files?.[0];if(!file)return;try{const data=await optimizedImage(file);if(typeof window.createDraggableElement!=='function')throw new Error('محرر الصور غير جاهز');window.createDraggableElement('image',data);schedule()}catch(e){alert('تعذر إضافة الصورة: '+(e?.message||e))}finally{if(input)input.value=''}}
function refreshOverflowFlags(){document.querySelectorAll('.a4-page').forEach(page=>{if(page.scrollHeight<=page.clientHeight+4)page.classList.remove('abu-question-overflow')})}
function wrapFlow(){const fn=window.checkAutoFlow;if(typeof fn!=='function'||fn.__abuFinalWrapped)return;const wrapped=function(...args){document.querySelectorAll('.a4-page').forEach(p=>p.classList.remove('abu-question-overflow'));const out=fn.apply(this,args);refreshOverflowFlags();return out};wrapped.__abuFinalWrapped=true;window.checkAutoFlow=wrapped}
function wrapPaper(){const api=window.AbuQuestionPaper;if(!api||api.__abuFinalWrapped)return;const apply=api.apply?.bind(api);if(apply)api.apply=function(...args){const out=apply(...args);setTimeout(()=>{wrapFlow();refreshOverflowFlags()},0);return out};api.__abuFinalWrapped=true}
function install(){window.saveQuestionDraft=durableSave;window.scheduleQuestionDraft=schedule;window.resetQuestionDraft=durableReset;window.handleAddImage=safeAddImage;wrapFlow();wrapPaper();refreshOverflowFlags();const container=$('pages-container');if(container){container.addEventListener('input',schedule,true);container.addEventListener('change',schedule,true);new MutationObserver(()=>{refreshOverflowFlags();schedule()}).observe(container,{childList:true,subtree:true})}}
window.AbuQuestionFinalFixes={save:durableSave,reset:durableReset,optimizeImage:optimizedImage,refreshOverflow:refreshOverflowFlags};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
