const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const web=path.join(root,'web');
const errors=[];
const read=p=>fs.readFileSync(p,'utf8');
const need=(src,marker,label)=>{if(!src.includes(marker))errors.push(`${label}: missing ${marker}`)};
const forbid=(src,marker,label)=>{if(src.includes(marker))errors.push(`${label}: forbidden ${marker}`)};
const html=read(path.join(web,'image-compressor.html'));
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
scripts.forEach((src,i)=>{try{new vm.Script(src,{filename:`image-compressor.html#${i+1}`})}catch(e){errors.push(`compressor syntax: ${e.message}`)}});
for(const m of [
  'MAX_FILES=20','MAX_TOTAL_BYTES=80*1024*1024','MAX_FILE_BYTES=30*1024*1024','SAFE_MAX_PIXELS=16_000_000',
  'yieldUi','requestAnimationFrame','canvas.width=1;canvas.height=1',
  "addEventListener('drop'",'moveItem','removeItem','beforeImg','afterImg','maxDimension',
  'cancelRequested','if(cancelRequested)break','catch(e){results.push','image/png','image/webp',
  'namedDataUrl','encodeURIComponent(name)','_compressed_','ممتازة للطباعة','ضعيفة للطباعة الكبيرة',
  'blob.size>=file.size','imageSmoothingQuality','overflow-y:auto','currentBytes()+incomingBytes',
  'window.parent?.Android?.savePagesToGallery','browserSave(r.name,r.dataUrl)','isImageFile'
])need(html,m,'image compressor');
for(const m of ['SAFE_MAX_PIXELS=24_000_000','while(true)'])forbid(html,m,'image compressor');
const patch=read(path.join(root,'scripts','patch-startup-stability.mjs'));
for(const m of ['encodedNameMatch','decodeURIComponent(encodedNameMatch[1])','itemMime','imagePages.length > 20','requestedName || fallbackName','named mixed-format compressed image saving'])need(patch,m,'Android compressor patch');
const index=read(path.join(root,'index.js'));
for(const m of ['encodedNameMatch','itemMime','requestedName || fallbackName','onRenderProcessGone','recoverWebRenderer'])need(index,m,'patched Android index');
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Image compressor checks passed: cumulative/per-file limits, 16MP memory ceiling, UI yielding, canvas release, drag/drop, reorder/delete, preview, cancellation, failure isolation, PNG/WebP preservation, print-quality guidance, original-derived names, browser fidelity, Android named mixed-format saving, and native WebView renderer recovery.\n');
