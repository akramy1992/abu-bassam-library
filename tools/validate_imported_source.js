const fs=require('fs');
const path=require('path');
const cp=require('child_process');

const root=path.resolve(process.argv[2]||'.');
function fail(message){console.error('Source import rejected: '+message);process.exit(1)}
function readJson(rel){const file=path.join(root,rel);if(!fs.existsSync(file))fail(`missing ${rel}`);try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){fail(`invalid JSON in ${rel}: ${e.message}`)}}
function walk(dir,out=[]){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isSymbolicLink())fail(`symbolic link is not allowed: ${path.relative(root,p)}`);if(entry.isDirectory()){if(!['node_modules','.git','dist','android','ios'].includes(entry.name))walk(p,out)}else out.push(p)}return out}

for(const rel of ['package.json','package-lock.json','app.json','index.js','web/index.html','scripts/build-android-local.mjs'])if(!fs.existsSync(path.join(root,rel)))fail(`missing ${rel}`);
const pkg=readJson('package.json');
const lock=readJson('package-lock.json');
const app=readJson('app.json').expo||{};
if(pkg.name!=='abu-bassam-library-native')fail('unexpected package name');
if(pkg.version!=='4.3.2'||app.version!=='4.3.2')fail('version must remain 4.3.2 for this import workflow');
if(app.slug!=='abu-bassam-library')fail('unexpected Expo slug');
if(app.android?.package!=='com.abubassam.librarycamera3')fail('unexpected Android package');
if(Number(app.android?.versionCode)!==432)fail('unexpected Android versionCode');
if(lock.name!==pkg.name||lock.version!==pkg.version)fail('package-lock identity/version does not match package.json');
if(pkg.engines?.node!=='>=20 <25')fail('Node engine must remain >=20 <25');
if(pkg.scripts?.['build:apk:local']!=='node scripts/build-android-local.mjs')fail('local APK test build command is missing or changed');
if(pkg.scripts?.['build:apk:release']!=='node scripts/build-android-local.mjs --require-release-key')fail('strict production APK build command is missing or changed');
const buildScript=fs.readFileSync(path.join(root,'scripts','build-android-local.mjs'),'utf8');
for(const marker of ["process.argv.includes('--require-release-key')","ANDROID_KEYSTORE_FILE','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD'",'Production release signing is required.','SIGNING_CERTIFICATE.txt'])if(!buildScript.includes(marker))fail(`local APK signing safeguard missing: ${marker}`);
for(const name of ['preinstall','install','postinstall','prepare','prepublish','prepublishOnly'])if(pkg.scripts?.[name])fail(`npm lifecycle script is not allowed in imported source: ${name}`);

const forbiddenNames=new Set(['.env','.env.local','.env.production','.npmrc','local.properties','google-services.json']);
const forbiddenExt=new Set(['.jks','.keystore','.p12','.pfx','.pem','.key']);
const files=walk(root);
if(files.length>5000)fail('too many files');
let total=0;
for(const file of files){const rel=path.relative(root,file).replaceAll('\\','/');const st=fs.statSync(file);total+=st.size;if(st.size>100*1024*1024)fail(`file too large: ${rel}`);const base=path.basename(file).toLowerCase(),ext=path.extname(file).toLowerCase();if(forbiddenNames.has(base)||forbiddenExt.has(ext))fail(`secret/signing file is forbidden: ${rel}`);if(/(^|\/)\.git(\/|$)/.test(rel))fail(`embedded git metadata is forbidden: ${rel}`);}
if(total>500*1024*1024)fail('uncompressed source is larger than 500 MB');

for(const file of files){if(!/\.(?:js|mjs)$/i.test(file))continue;const result=cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)fail(`JavaScript syntax error in ${path.relative(root,file)}: ${(result.stderr||result.stdout||'').trim()}`)}

const scanExt=/\.(?:js|mjs|ts|json|yml|yaml|gradle|properties|html|sql)$/i;
for(const file of files){if(!scanExt.test(file))continue;let text;try{text=fs.readFileSync(file,'utf8')}catch(_){continue}if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))fail(`private key material found in ${path.relative(root,file)}`);if(/(?:SUPABASE_SERVICE_ROLE_KEY|ANDROID_KEYSTORE_PASSWORD|ANDROID_KEY_PASSWORD)\s*[=:]\s*['\"]?[A-Za-z0-9_\-\.]{8,}/i.test(text)&&!/process\.env|Deno\.env|getenv|secrets\./i.test(text))fail(`possible embedded secret in ${path.relative(root,file)}`)}

console.log(`Trusted source validation passed: ${files.length} files, ${(total/1024/1024).toFixed(1)} MB.`);
