const fs=require('fs'),path=require('path');
const docs=path.resolve(__dirname,'..','docs');
const bad=[
  /صياغة\s*الأسئلة/i,/ضغط\s*الصور/i,/\bquestions?(?:Center|Section)?\b/i,/\bcompressor(?:Center|Section)?\b/i,
  /touchstart/i,/touchmove/i,/touchend/i,/stopImmediatePropagation/i,/restoreNativeTouch/i,
  /tabQuestions/i,/tabCompressor/i,/questionsCenter/i,/compressorCenter/i,/\bgesture\b/i,/اللمس/i
];
const errors=[];
for(const file of fs.readdirSync(docs).filter(f=>f.endsWith('.md'))){
  const s=fs.readFileSync(path.join(docs,file),'utf8');
  for(const re of bad)if(re.test(s))errors.push(`${file}: ${re}`);
}
if(errors.length){console.error('Legacy documentation references remain:\n'+errors.join('\n'));process.exit(1)}
console.log('Docs current-state check passed: no retired section/input-interception references remain in docs.');
