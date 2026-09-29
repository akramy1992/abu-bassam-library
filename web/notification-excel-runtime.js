(()=>{
'use strict';
if(window.__ABU_NOTIFICATION_EXCEL_V2__)return;
window.__ABU_NOTIFICATION_EXCEL_V1__=true;
window.__ABU_NOTIFICATION_EXCEL_V2__=true;
const $=id=>document.getElementById(id);
const xml=v=>String(v??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function owner(){return window.AbuBassamSecurity?.role?.()==='owner'}
function cells(){return [...document.querySelectorAll('#abuReportRows .abu-report-row:not(.head)')].map(row=>{const parts=[...row.children].map(x=>String(x.innerText||x.textContent||'').trim().replace(/\s*\n\s*/g,' | '));return [parts[0]||'',parts[1]||'',parts[2]||'']})}
function col(n){let s='';for(n++;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s}
function cell(ref,value,style=0){return `<c r="${ref}" t="inlineStr"${style?` s="${style}"`:''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`}
function row(index,values,style=0){return `<row r="${index}">${values.map((v,i)=>cell(`${col(i)}${index}`,v,style)).join('')}</row>`}
function loadZip(){if(window.JSZip)return Promise.resolve(window.JSZip);return new Promise((resolve,reject)=>{const found=document.querySelector('script[data-abu-jszip]');if(found){found.addEventListener('load',()=>window.JSZip?resolve(window.JSZip):reject(new Error('JSZip unavailable')),{once:true});found.addEventListener('error',()=>reject(new Error('JSZip load failed')),{once:true});return}const s=document.createElement('script');s.src='jszip.min.js';s.async=false;s.dataset.abuJszip='1';s.onload=()=>window.JSZip?resolve(window.JSZip):reject(new Error('JSZip unavailable'));s.onerror=()=>reject(new Error('JSZip load failed'));document.head.appendChild(s)})}
async function makeWorkbook(reportRows,from,to){
  const JSZip=await loadZip(),zip=new JSZip();
  const rows=[['تقرير عمليات الأجهزة الفرعية — مكتبة أبو بسام','',''],[`الفترة: ${from||'—'} إلى ${to||'—'}`,`عدد العمليات: ${reportRows.length}`,''],['التاريخ / الجهاز','العملية / التفاصيل','النوع / المستوى'],...reportRows];
  const sheetRows=rows.map((r,i)=>row(i+1,r,i===0?2:i===2?1:0)).join('');
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews><cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="70" customWidth="1"/><col min="3" max="3" width="24" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><mergeCells count="1"><mergeCell ref="A1:C1"/></mergeCells></worksheet>`;
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
  zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.folder('xl').file('workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="تقرير الأجهزة" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.folder('xl').folder('_rels').file('workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.folder('xl').file('styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  zip.folder('xl').folder('worksheets').file('sheet1.xml',sheet);
  return zip.generateAsync({type:'base64',compression:'DEFLATE',compressionOptions:{level:6}})
}
async function exportExcel(){
  if(!owner())return alert('تصدير Excel لتقارير الأجهزة الفرعية متاح للحساب الرئيسي فقط.');
  const reportRows=cells();if(!reportRows.length)return alert('اعرض التقرير أولًا ثم صدّره إلى Excel.');
  const from=$('abuReportFrom')?.value||'',to=$('abuReportTo')?.value||'';
  try{const base64=await makeWorkbook(reportRows,from,to),mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',name=`Abu_Bassam_Branch_Report_${Date.now()}.xlsx`,data=`data:${mime};base64,${base64}`;if(window.Android?.saveBase64){Android.saveBase64(name,mime,data);return}const a=document.createElement('a');a.download=name;a.href=data;a.click()}catch(e){alert('تعذر إنشاء ملف Excel: '+String(e?.message||e))}
}
function install(){const actions=document.querySelector('#abuAdminContent .abu-report-actions');if(!actions||$('abuReportExcel'))return false;const b=document.createElement('button');b.id='abuReportExcel';b.type='button';b.textContent='Excel (.xlsx)';b.onclick=exportExcel;actions.appendChild(b);return true}
function boot(){if(install())return;let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},250);new MutationObserver(()=>install()).observe(document.documentElement,{childList:true,subtree:true})}
window.AbuBassamExcelReport={export:exportExcel,install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
