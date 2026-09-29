import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
const version=String(pkg.version||'').trim();
const versionCode=Number(app.expo?.android?.versionCode||0);
const dist=path.join(root,'dist');
const apkName=`Abu_Bassam_Library_${version}.apk`;
const apkPath=path.join(dist,apkName);
const buildTypePath=path.join(dist,'BUILD_TYPE.txt');
const shaFile=path.join(dist,'SHA256.txt');
const certFile=path.join(dist,'SIGNING_CERTIFICATE.txt');
const expectedCertFile=path.join(root,'config','release-signing-certificate.sha256');
const mandatory=process.argv.includes('--mandatory');
const minArg=process.argv.find(x=>x.startsWith('--min-supported-code='));
const minSupported=minArg?Number(minArg.split('=')[1]):versionCode;
const changelogArg=process.argv.find(x=>x.startsWith('--changelog='));
const changelog=String(changelogArg?changelogArg.slice('--changelog='.length):process.env.RELEASE_CHANGELOG||`تحديث مكتبة أبو بسام ${version}`).trim().slice(0,12000);
const supabaseUrl=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();

function fail(message){throw new Error(message)}
function readRequired(file,label){if(!fs.existsSync(file)||!fs.statSync(file).isFile()||fs.statSync(file).size===0)fail(`${label} missing: ${file}`);return fs.readFileSync(file)}
function sha256Buffer(value){return crypto.createHash('sha256').update(value).digest('hex')}
function sha256(file){return sha256Buffer(fs.readFileSync(file))}
function storagePathFor(v){if(!/^[0-9]+\.[0-9]+\.[0-9]+([.-][A-Za-z0-9]+)*$/.test(v))fail('Invalid app version');return `app-releases/${v}/${apkName}`}
function encodeStoragePath(value){return value.split('/').map(encodeURIComponent).join('/')}
async function jsonResponse(response,label){const text=await response.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text.slice(0,500)}}if(!response.ok)fail(`${label} failed (${response.status}): ${data?.message||data?.error||data?.raw||'unknown error'}`);return data}

async function main(){
  if(!version||!Number.isInteger(versionCode)||versionCode<1)fail('Invalid package/app version metadata');
  if(!Number.isInteger(minSupported)||minSupported<1||minSupported>versionCode)fail('Invalid --min-supported-code');
  if(!supabaseUrl.startsWith('https://'))fail('SUPABASE_URL must be an HTTPS URL');
  if(!serviceKey)fail('SUPABASE_SERVICE_ROLE_KEY is required and must be supplied only through the environment');
  readRequired(apkPath,'Production APK');
  const buildType=readRequired(buildTypePath,'BUILD_TYPE').toString('utf8').trim();
  if(buildType!=='signed-production-release-with-embedded-js')fail(`Refusing update publication from build type: ${buildType||'unknown'}`);
  const actualSha=sha256(apkPath),recordedSha=readRequired(shaFile,'SHA256').toString('utf8').trim().split(/\s+/)[0].toLowerCase();
  if(!/^[0-9a-f]{64}$/.test(recordedSha)||recordedSha!==actualSha)fail('APK SHA-256 does not match dist/SHA256.txt');
  const certText=readRequired(certFile,'SIGNING_CERTIFICATE').toString('utf8'),certMatch=certText.match(/certificate SHA-256 digest:\s*([0-9a-fA-F:]{64,95})/i);
  if(!certMatch)fail('Production signing certificate SHA-256 fingerprint was not found');
  const certSha=certMatch[1].replace(/:/g,'').toLowerCase(),expectedCert=readRequired(expectedCertFile,'Expected production signing certificate').toString('utf8').trim().replace(/:/g,'').toLowerCase();
  if(!/^[0-9a-f]{64}$/.test(expectedCert))fail('Pinned production signing certificate fingerprint is invalid');
  if(certSha!==expectedCert)fail(`Production signing certificate mismatch. Expected ${expectedCert}, got ${certSha}`);
  const storagePath=storagePathFor(version),encodedPath=encodeStoragePath(storagePath),apk=fs.readFileSync(apkPath),authHeaders={Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,'Cache-Control':'no-store'};
  console.log(`Publishing ${version} (${versionCode}) after production signature + SHA-256 verification...`);
  const upload=await fetch(`${supabaseUrl}/storage/v1/object/abu-bassam-private/${encodedPath}`,{method:'POST',headers:{...authHeaders,'Content-Type':'application/vnd.android.package-archive','x-upsert':'true'},body:apk});
  await jsonResponse(upload,'Private APK upload');
  const verifyStored=await fetch(`${supabaseUrl}/storage/v1/object/authenticated/abu-bassam-private/${encodedPath}`,{method:'GET',headers:authHeaders});
  if(!verifyStored.ok){const detail=(await verifyStored.text()).slice(0,500);fail(`Stored APK verification download failed (${verifyStored.status}): ${detail}`)}
  const storedBytes=Buffer.from(await verifyStored.arrayBuffer());
  if(storedBytes.length!==apk.length)fail(`Stored APK size mismatch. Expected ${apk.length}, got ${storedBytes.length}`);
  const storedSha=sha256Buffer(storedBytes);if(storedSha!==actualSha)fail(`Stored APK SHA-256 mismatch. Expected ${actualSha}, got ${storedSha}`);
  const publish=await fetch(`${supabaseUrl}/rest/v1/rpc/abu_bassam_publish_app_release`,{method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:JSON.stringify({p_version:version,p_version_code:versionCode,p_changelog:changelog,p_storage_path:storagePath,p_sha256:actualSha,p_signing_cert_sha256:certSha,p_mandatory:mandatory,p_min_supported_code:minSupported})});
  const result=await jsonResponse(publish,'Release metadata publication');if(result?.ok!==true)fail('Release RPC did not confirm success');
  console.log(`Published stable update ${version} (${versionCode})`);console.log(`Storage: abu-bassam-private/${storagePath}`);console.log(`SHA-256: ${actualSha}`);console.log(`Signing certificate SHA-256: ${certSha}`);
}
main().catch(error=>{console.error(error?.stack||error?.message||String(error));process.exit(1)});
