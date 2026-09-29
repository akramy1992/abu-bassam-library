import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [nextVersion,nextCodeRaw]=process.argv.slice(2);
const fail=message=>{console.error(message);process.exit(1)};
if(!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(String(nextVersion||'')))fail('Usage: npm run release:prepare -- <version> <versionCode>  (example: 6.0.1 601)');
const nextCode=Number(nextCodeRaw);
if(!Number.isInteger(nextCode)||nextCode<1)fail('versionCode must be a positive integer.');

const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const writeJson=(file,value)=>fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2)+'\n');
const appFile='app.json',packageFile='package.json',lockFile='package-lock.json',nativeFile='index.js';
const app=readJson(appFile),pkg=readJson(packageFile),lock=readJson(lockFile);
const expo=app.expo||{};
const currentVersion=String(expo.version||pkg.version||'');
const currentCode=Number(expo.android?.versionCode||0);
if(nextVersion===currentVersion)fail(`Version must change from ${currentVersion}.`);
if(nextCode<=currentCode)fail(`versionCode must be greater than current ${currentCode}; received ${nextCode}.`);
if(expo.android?.package!=='com.abubassam.librarycamera3')fail('Refusing release: Android package identity changed.');

expo.version=nextVersion;
expo.android={...(expo.android||{}),versionCode:nextCode};
app.expo=expo;
pkg.version=nextVersion;
lock.version=nextVersion;
lock.packages=lock.packages||{};
lock.packages['']=lock.packages['']||{};
lock.packages[''].version=nextVersion;
let native=fs.readFileSync(path.join(root,nativeFile),'utf8');
if(!/const APP_VERSION = '[^']+';/.test(native)||!/const BUILD_NUMBER = '[^']+';/.test(native))fail('index.js release identity constants were not found.');
native=native.replace(/const APP_VERSION = '[^']+';/,`const APP_VERSION = '${nextVersion}';`).replace(/const BUILD_NUMBER = '[^']+';/,`const BUILD_NUMBER = '${nextCode}';`);

writeJson(appFile,app);
writeJson(packageFile,pkg);
writeJson(lockFile,lock);
fs.writeFileSync(path.join(root,nativeFile),native);
console.log(`Release prepared: ${currentVersion} (${currentCode}) -> ${nextVersion} (${nextCode}).`);
console.log('Next: npm run check:web, review the diff, commit the version bump, then run the production Android workflow with the release signing key.');
