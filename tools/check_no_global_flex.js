const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const web=path.join(root,'web');
const legacy=path.join(web,'global-flex-runtime.js');
const errors=[];
if(fs.existsSync(legacy))errors.push('Legacy web/global-flex-runtime.js must remain removed because it conflicts with local touch/gesture tools.');
for(const name of fs.readdirSync(web).filter(n=>/\.(?:js|html)$/i.test(n))){
  const full=path.join(web,name);const src=fs.readFileSync(full,'utf8');
  if(src.includes('global-flex-runtime.js')||src.includes('loadGlobalFlex(')||src.includes('__ABU_GLOBAL_FLEX_V1__'))errors.push(`${name}: forbidden legacy global-flex reference`);
}
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1)}
process.stdout.write('Legacy global flex is absent and no live web asset references it. Local tool-specific touch/resize remains authoritative.\n');
