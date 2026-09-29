const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo;
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
const native=fs.readFileSync(path.join(root,'index.js'),'utf8');
const errors=[];
const version=String(app.version||'');
const expectedPackage='com.abubassam.librarycamera3';
const pinnedFile=path.join(root,'config','release-signing-certificate.sha256');
const signingMigration=path.join(root,'supabase','migrations','202609270003_release_signing_baseline.sql');
if(pkg.version!==version)errors.push(`package.json version ${pkg.version} != app.json ${version}`);
if(lock.version!==version||lock.packages?.['']?.version!==version)errors.push('package-lock root version is not synchronized');
const vm=native.match(/const APP_VERSION = '([^']+)';/),bm=native.match(/const BUILD_NUMBER = '([^']+)';/);
if(!vm||vm[1]!==version)errors.push('index.js APP_VERSION does not match app.json');
if(!bm||Number(bm[1])!==Number(app.android?.versionCode))errors.push('index.js BUILD_NUMBER does not match android.versionCode');
if(Number(app.android?.versionCode)<=432)errors.push('android.versionCode must stay above retired build 432');
if(!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version))errors.push('invalid semantic app version');
if(app.android?.package!==expectedPackage)errors.push(`Android package must remain ${expectedPackage} for update continuity`);
if(!fs.existsSync(pinnedFile))errors.push('production signing certificate pin is missing');
else{
  const pin=fs.readFileSync(pinnedFile,'utf8').trim().toLowerCase().replace(/:/g,'');
  if(!/^[0-9a-f]{64}$/.test(pin))errors.push('production signing certificate pin must be exactly 64 hex characters');
  if(fs.existsSync(signingMigration)){
    const migration=fs.readFileSync(signingMigration,'utf8').toLowerCase().replace(/:/g,'');
    if(!migration.includes(pin))errors.push('production signing certificate pin does not match release-signing baseline migration');
  }else errors.push('release-signing baseline migration is missing');
}
const releaseScript=path.join(root,'scripts','prepare-release.mjs');
if(!fs.existsSync(releaseScript))errors.push('safe synchronized release preparation script is missing');
else{
  const src=fs.readFileSync(releaseScript,'utf8');
  for(const marker of ['versionCode must be greater than current','com.abubassam.librarycamera3','APP_VERSION','BUILD_NUMBER'])if(!src.includes(marker))errors.push(`prepare-release.mjs missing ${marker}`);
}
for(const name of fs.readdirSync(path.join(root,'web')).filter(n=>/\.(?:js|html)$/i.test(n))){const src=fs.readFileSync(path.join(root,'web',name),'utf8');if(src.includes('4.3.2'))errors.push(`${name}: retired release 4.3.2 remains in live source`)}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Release identity synchronized: ${version} (${app.android.versionCode}) ${app.android.package}; signing certificate baseline and safe version-bump path are pinned.`);
