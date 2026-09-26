const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(p){if(!fs.existsSync(p))throw new Error(`missing ${p}`);return fs.readFileSync(p,'utf8')}
const source=read(path.join(root,'.github','workflows','android.yml'));
const pkg=read(path.join(root,'package.json'));
const local=read(path.join(root,'scripts','build-android-local.mjs'));
try{new Function(read(path.join(root,'tools','check_import_workflow.js')))}catch(e){throw new Error(`import workflow checker syntax error: ${e.message}`)}
const required=[
  'permissions:\n  contents: read',
  'npm ci --no-audit --no-fund',
  'Require production signing for distributable builds',
  "github.event_name != 'pull_request'",
  'Production release signing secrets are required',
  "secrets.ANDROID_KEYSTORE_PASSWORD != ''",
  "secrets.ANDROID_KEY_ALIAS != ''",
  "secrets.ANDROID_KEY_PASSWORD != ''",
  'Build standalone APK with embedded JS bundle',
  './gradlew assembleRelease --no-daemon',
  'Verify standalone APK contains React Native bundle',
  'assets/index.android.bundle',
  'apksigner" verify --verbose',
  'apksigner" verify --print-certs',
  'SIGNING_CERTIFICATE.txt',
  'signed-production-release-with-embedded-js',
  'pull-request-test-release-debug-key-with-embedded-js',
  'Prepare distributable APK',
  'dist/Abu_Bassam_Library_4.3.2.apk',
  'sha256sum dist/Abu_Bassam_Library_4.3.2.apk',
  'Upload APK artifacts',
  'retention-days: 14'
];
const missing=required.filter(marker=>!source.includes(marker));
if(missing.length){process.stderr.write('Android workflow missing safeguards:\n'+missing.map(x=>'- '+x).join('\n')+'\n');process.exit(1)}
const forbidden=[
  './gradlew assembleDebug --no-daemon',
  'android/app/build/outputs/apk/debug/',
  'standalone-release-debug-key-with-embedded-js',
  'installable-debug',
  'contents: write',
  'git push',
  'Synchronize package lock',
  'npm install --no-audit --no-fund'
];
const bad=forbidden.filter(marker=>source.includes(marker));
if(bad.length){process.stderr.write('Android workflow contains unsafe/non-reproducible behavior:\n'+bad.map(x=>'- '+x).join('\n')+'\n');process.exit(1)}
const fallbackRequired=[
  ['"build:apk:local": "node scripts/build-android-local.mjs"',pkg,'package local test build command'],
  ['"build:apk:release": "node scripts/build-android-local.mjs --require-release-key"',pkg,'package strict release build command'],
  ["process.argv.includes('--require-release-key')",local,'strict local release switch'],
  ["['ANDROID_KEYSTORE_FILE','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD']",local,'complete signing variable set'],
  ['Production release signing is required.',local,'missing production key rejection'],
  ["['run', 'check:web']",local,'local build web checks'],
  ["['run', 'android:prebuild']",local,'local Android prebuild'],
  ["['assembleRelease', '--no-daemon']",local,'local release build'],
  ['assets/index.android.bundle',local,'embedded JS verification'],
  ["['verify', '--verbose', apk]",local,'APK signature verification'],
  ["['verify', '--print-certs', apk]",local,'APK signing certificate verification'],
  ['ANDROID_HOME || process.env.ANDROID_SDK_ROOT',local,'Android SDK discovery'],
  ["path.join(root, 'android', 'local.properties')",local,'local.properties SDK fallback'],
  ['Abu_Bassam_Library_4.3.2.apk',local,'distribution APK name'],
  ['SHA256.txt',local,'SHA-256 output'],
  ['SIGNING_CERTIFICATE.txt',local,'signing certificate output'],
  ['signed-production-release-with-embedded-js',local,'production build marker'],
  ['local-test-release-default-key-with-embedded-js',local,'test build marker']
];
const fallbackMissing=fallbackRequired.filter(([marker,src])=>!src.includes(marker)).map(([, ,label])=>label);
if(fallbackMissing.length){process.stderr.write('Android local fallback missing safeguards:\n'+fallbackMissing.map(x=>'- '+x).join('\n')+'\n');process.exit(1)}
process.stdout.write('Android build check passed: hosted and local production releases require a complete signing key, PR/local test builds are labeled, the JS bundle and APK signature/certificate are verified, SHA-256 is emitted, and CI stays read-only.\n');
