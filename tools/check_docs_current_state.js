const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const docs=path.join(root,'docs');
const errors=[];

const obsoleteInput=[/touchstart/i,/touchmove/i,/touchend/i,/stopImmediatePropagation/i,/restoreNativeTouch/i];
const unsupportedCompletion=[
  /تم\s*✅/i,
  /تم\s+التحقق/i,
  /تم\s+تنفيذ/i,
  /تم\s+إنجاز/i,
  /تمت\s+(?:إضافة|معالجة|برمجة|تنفيذ|إصلاح|مراجعة|تجربة|اختبار)/i,
  /\bمكتمل(?:ة)?\b/i,
  /جاهز(?:ة)?\s*100%/i,
  /يعمل\s*100%/i,
  /منفذ\s+بالكامل/i
];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]})}
const markdown=[path.join(root,'README.md'),path.join(root,'AGENTS.md'),...walk(docs).filter(f=>f.endsWith('.md'))].filter(fs.existsSync);
for(const file of markdown){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  const text=fs.readFileSync(file,'utf8');
  for(const re of obsoleteInput)if(re.test(text))errors.push(`${rel}: obsolete input-handler reference ${re}`);
  const policyFile=rel==='AGENTS.md'||rel==='docs/REPOSITORY-SCOPE.md';
  if(!policyFile)for(const re of unsupportedCompletion)if(re.test(text))errors.push(`${rel}: unsupported completion claim ${re}`);
}
for(const retired of ['BUILD-NOTES.md','CHANGELOG.md'])if(fs.existsSync(path.join(root,retired)))errors.push(`${retired}: stale historical completion report must not exist on current branch`);
if(errors.length){console.error('Current-state documentation audit failed:\n'+errors.join('\n'));process.exit(1)}
console.log('Current-state documentation audit passed: questions/image-compressor terminology is allowed because those sections are live again, obsolete input-handler language and stale completion reports remain blocked, and unsupported completion claims are rejected outside policy files.');
