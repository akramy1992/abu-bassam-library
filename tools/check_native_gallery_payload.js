'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const src=fs.readFileSync(path.join(__dirname,'..','index.js'),'utf8');
function between(start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  if(a<0||b<0)throw new Error('Missing native image gallery implementation: '+start);
  return src.slice(a,b);
}
const helpers=between('function safeName(value) {','function printDimensions(paper) {');
const gallery=between('  const savePagesToGallery = useCallback(','  const printPages = useCallback(');
const actions=[],messages=[];
let allowed=true;
const filesystem={
  EncodingType:{Base64:'base64'},
  StorageAccessFramework:{
    getUriForDirectoryInRoot:(name)=>{assert.equal(name,'Pictures');return 'content://pictures';},
    requestDirectoryPermissionsAsync:async()=>({granted:allowed,directoryUri:'content://output'}),
    createFileAsync:async(dir,name,mime)=>{
      assert.equal(dir,'content://output');
      actions.push({operation:'create',name,mime});
      return 'content://output/'+name;
    },
    writeAsStringAsync:async(uri,data,opts)=>{
      assert.equal(opts.encoding,'base64');
      actions.push({operation:'write',uri,data});
    }
  }
};
const Alert={alert:(title,description)=>messages.push({title,description})};
const fn=vm.runInNewContext(helpers+gallery+'\nsavePagesToGallery',{useCallback:(x)=>x,FileSystem:filesystem,Alert,decodeURIComponent,Date,Set},{timeout:1000});
async function test(){
  await fn({prefix:'batch',mime:'image/jpeg',pages:[
    'data:image/png;name=Scan%20One.png;base64,QUJDRA==',
    'data:image/webp;name=Scan%20Two.webp;base64,QUJDRA=='
  ]});
  assert.deepEqual(actions.filter(x=>x.operation==='create').map(x=>[x.name,x.mime]),[
    ['Scan One','image/png'],['Scan Two','image/webp']
  ],'Each saved image must preserve its MIME and safe file name');
  assert.equal(actions.filter(x=>x.operation==='write').length,2);
  assert.equal(messages.at(-1).title,'تم الحفظ في المعرض');

  actions.length=0;
  await fn({prefix:'batch',pages:Array.from({length:21},()=> 'data:image/png;base64,QUJD')});
  assert.equal(actions.length,0,'Oversized image batch must not write a partial set');
  assert.match(messages.at(-1).description,/20 صورة/);

  actions.length=0;
  await fn({prefix:'batch',pages:['data:image/png;base64,QUJD','data:image/svg+xml;base64,QUJD']});
  assert.equal(actions.length,0,'Unsupported MIME in any image must reject the complete batch');
  assert.match(messages.at(-1).description,/صيغة الصور غير مدعومة/);

  actions.length=0;
  await fn({prefix:'batch',pages:['data:image/png;name=..%2Ffolder%2Fphoto.png;base64,QUJD']});
  assert.deepEqual(actions.filter(x=>x.operation==='create').map(x=>x.name),['.._folder_photo'],'Unsafe filename characters must be sanitized');

  actions.length=0;
  allowed=false;
  await fn({prefix:'batch',pages:['data:image/png;base64,QUJD']});
  assert.equal(actions.length,0,'Denied directory permission must not write anything');
  console.log('Native image gallery: mixed PNG/WebP, safe names, 20-file cap, fail-before-write, and denied-permission checks passed.');
}
test().catch(error=>{console.error(error);process.exitCode=1;});
