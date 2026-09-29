from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
VERSION = '6.0.0'
VERSION_CODE = 600


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def replace_once(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f'Expected source marker missing: {label}')

# 1) One source-of-truth release identity.
app_path = ROOT / 'app.json'
app = json.loads(app_path.read_text(encoding='utf-8'))
app['expo']['version'] = VERSION
app['expo']['android']['versionCode'] = VERSION_CODE
write_json(app_path, app)

pkg_path = ROOT / 'package.json'
pkg = json.loads(pkg_path.read_text(encoding='utf-8'))
pkg['version'] = VERSION
pkg['scripts']['start'] = 'expo start'
pkg['scripts']['android'] = 'expo run:android'
pkg['scripts']['android:prebuild'] = 'expo prebuild --platform android --clean && npm run assets:android'
checks = [
    'node tools/check_release_identity.js',
    'node tools/check_repository_hygiene.js',
    'node tools/check_security_controls.js',
    'node tools/check_android_workflow.js',
    'node tools/check_advanced_photo_print.js',
    'node tools/check_settings_section.js',
    'node tools/check_operation_log.js',
    'node tools/check_notification_center.js',
    'node tools/check_admin_permissions.js',
    'node tools/check_cards_section_20260924.js',
    'node tools/check_cards_hardening_latest.js',
    'node tools/check_document_vault_advanced.js',
    'node tools/check_branch_private_vault.js',
    'node tools/check_customer_documents.js',
    'node tools/check_input_and_crash_stability.js',
    'node tools/check_project.js',
    'node tools/check_latest_features.js',
    'node tools/check_runtime_regressions.js',
    'node tools/check_html_scripts.js',
    'node tools/check_docs_current_state.js',
    'node tools/check_no_global_flex.js',
]
pkg['scripts']['check:web'] = ' && '.join(checks)
write_json(pkg_path, pkg)

lock_path = ROOT / 'package-lock.json'
lock = json.loads(lock_path.read_text(encoding='utf-8'))
lock['version'] = VERSION
if '' in lock.get('packages', {}):
    lock['packages']['']['version'] = VERSION
write_json(lock_path, lock)

# 2) Make native source authoritative; integrate camera frame behavior that used to be injected at build time.
index_path = ROOT / 'index.js'
s = index_path.read_text(encoding='utf-8')
s = re.sub(r"const APP_VERSION = '[^']+';", f"const APP_VERSION = '{VERSION}';", s, count=1)
s = re.sub(r"const BUILD_NUMBER = '[^']+';", f"const BUILD_NUMBER = '{VERSION_CODE}';", s, count=1)
s = replace_once(s,
    "  const [cameraFacing, setCameraFacing] = useState('back');\n  const [webReady, setWebReady] = useState(false);",
    "  const [cameraFacing, setCameraFacing] = useState('back');\n  const [cameraFrameKind, setCameraFrameKind] = useState('paper');\n  const [webReady, setWebReady] = useState(false);",
    'camera frame state')
s = replace_once(s,
    "    setCameraMode(null); setCameraReady(false); setCameraBusy(false); setBarcodeLocked(false); setTorch(false); setCameraFacing('back');",
    "    setCameraMode(null); setCameraReady(false); setCameraBusy(false); setBarcodeLocked(false); setTorch(false); setCameraFacing('back'); setCameraFrameKind('paper');",
    'camera close reset')
s = replace_once(s,
    '  const openCamera = useCallback(async (mode) => {',
    "  const openCamera = useCallback(async (mode, frameKind = 'paper') => {",
    'openCamera signature')
s = replace_once(s,
    "      setCameraReady(false); setBarcodeLocked(false); setTorch(false); setCameraFacing('back');\n      setCameraMode(['barcode', 'maker', 'cardPhoto', 'ocr'].includes(mode) ? mode : 'scan');",
    "      setCameraReady(false); setBarcodeLocked(false); setTorch(false); setCameraFacing('back');\n      setCameraFrameKind(['card', 'photo', 'paper'].includes(frameKind) ? frameKind : 'paper');\n      setCameraMode(['barcode', 'maker', 'cardPhoto', 'ocr'].includes(mode) ? mode : 'scan');",
    'camera frame assignment')
s = replace_once(s,
    "    if (message.type === 'openCamera') return openCamera(message.mode);",
    "    if (message.type === 'openCamera') return openCamera(message.mode, message.frameKind);",
    'native bridge frame argument')
s = replace_once(s,
    "            <View style={barcodeMode ? styles.barcodeFrame : styles.documentFrame} />",
    "            <View style={barcodeMode ? styles.barcodeFrame : cameraFrameKind === 'card' ? styles.cardDocumentFrame : cameraFrameKind === 'photo' ? styles.photoDocumentFrame : styles.documentFrame} />",
    'camera frame view')
s = replace_once(s,
    "  documentFrame: { width: '91%', aspectRatio: 0.72, maxHeight: '66%', borderWidth: 3, borderColor: '#fff', borderRadius: 15, backgroundColor: '#00000010' },\n  barcodeFrame:",
    "  documentFrame: { width: '91%', aspectRatio: 0.72, maxHeight: '66%', borderWidth: 3, borderColor: '#fff', borderRadius: 15, backgroundColor: '#00000010' },\n  cardDocumentFrame: { width: '91%', aspectRatio: 1.585, maxHeight: '54%', borderWidth: 3, borderColor: '#fff', borderRadius: 15, backgroundColor: '#00000010' },\n  photoDocumentFrame: { width: '72%', aspectRatio: 0.78, maxHeight: '62%', borderWidth: 3, borderColor: '#fff', borderRadius: 18, backgroundColor: '#00000010' },\n  barcodeFrame:",
    'camera frame styles')
index_path.write_text(s, encoding='utf-8')

# 3) Remove stale deleted-section and old global-flex cleanup residue from the live recovery runtime.
rec_path = ROOT / 'web' / 'feature-recovery-runtime.js'
r = rec_path.read_text(encoding='utf-8')
r, n = re.subn(r"function removeFlex\(\)\{[\s\S]*?\}\nfunction applyRequestedTemplate", "function applyRequestedTemplate", r, count=1)
if n != 1 and 'function removeFlex()' in r:
    raise SystemExit('Could not remove stale removeFlex runtime')
r, n = re.subn(r"function removeOldPlacements\(\)\{[\s\S]*?\}\nfunction safeName", "function removeOldPlacements(){['tabEnvelopes','tabThanks','abuModeEnvelope','abuPaneEnvelope','prodModeThanks','prodPaneThanks','prodModeCertificate','prodPaneCertificate'].forEach(id=>$(id)?.remove())}\nfunction safeName", r, count=1)
if n != 1:
    raise SystemExit('Could not clean removeOldPlacements')
r = r.replace("setTimeout(()=>{removeFlex();installCards();removeOldPlacements()},60)", "setTimeout(()=>{installCards();removeOldPlacements()},60)")
r = r.replace('function init(){addCss();removeFlex();installCards();removeOldPlacements();', 'function init(){addCss();installCards();removeOldPlacements();')
rec_path.write_text(r, encoding='utf-8')

# 4) Local build derives its filename from app.json instead of a frozen release number.
build_path = ROOT / 'scripts' / 'build-android-local.mjs'
b = build_path.read_text(encoding='utf-8')
anchor = "const requireReleaseKey = process.argv.includes('--require-release-key');\n"
addition = anchor + "const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));\nconst appVersion = String(appConfig?.expo?.version || '').trim();\nif (!/^\\d+\\.\\d+\\.\\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(appVersion)) throw new Error('Invalid app version in app.json');\nconst apkFileName = `Abu_Bassam_Library_${appVersion}.apk`;\n"
b = replace_once(b, anchor, addition, 'dynamic local version')
b = b.replace("const out = path.join(dist, 'Abu_Bassam_Library_4.3.2.apk');", "const out = path.join(dist, apkFileName);")
b = b.replace("`${hash}  Abu_Bassam_Library_4.3.2.apk\\n`", "`${hash}  ${apkFileName}\\n`")
build_path.write_text(b, encoding='utf-8')

# 5) Android assets: keep downloaded OCR dependencies out of source tree; cache separately.
prepare = r'''import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = resolve(projectRoot, 'web');
const destination = resolve(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'library');
const cacheRoot = resolve(projectRoot, '.cache', 'ocr-tesseract-v5.1.1');

const OCR_ASSETS = [
  ['tesseract.min.js','https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',20000],
  ['worker.min.js','https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',20000],
  ['core/tesseract-core.wasm.js','https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core.wasm.js',500000],
  ['core/tesseract-core-simd.wasm.js','https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core-simd.wasm.js',500000],
  ['core/tesseract-core-lstm.wasm.js','https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core-lstm.wasm.js',500000],
  ['core/tesseract-core-simd-lstm.wasm.js','https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core-simd-lstm.wasm.js',500000],
  ['lang/ara.traineddata.gz','https://tessdata.projectnaptha.com/4.0.0/ara.traineddata.gz',500000],
  ['lang/eng.traineddata.gz','https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz',500000],
];
async function existsEnough(file,minBytes){try{return (await stat(file)).size>=minBytes}catch{return false}}
async function download(url,file,minBytes){
  if(await existsEnough(file,minBytes)) return;
  await mkdir(dirname(file),{recursive:true});
  let lastError;
  for(let attempt=1;attempt<=3;attempt+=1){
    try{
      const response=await fetch(url,{redirect:'follow'});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=Buffer.from(await response.arrayBuffer());
      if(data.length<minBytes) throw new Error(`asset too small: ${data.length}`);
      await writeFile(file,data); return;
    }catch(error){lastError=error;if(attempt<3)await new Promise(r=>setTimeout(r,1200*attempt))}
  }
  throw new Error(`Failed to prepare pinned OCR asset ${url}: ${lastError?.message||lastError}`);
}
for(const [relative,url,minBytes] of OCR_ASSETS) await download(url,resolve(cacheRoot,relative),minBytes);
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
await cp(source,destination,{recursive:true,force:true});
await mkdir(resolve(destination,'vendor','tesseract'),{recursive:true});
await cp(cacheRoot,resolve(destination,'vendor','tesseract'),{recursive:true,force:true});
process.stdout.write(`Android web assets prepared at ${destination}; OCR cache kept outside source tree.\n`);
'''
(ROOT / 'scripts' / 'prepare-android-assets.mjs').write_text(prepare, encoding='utf-8')

# 6) Replace the build workflow with one clean, read-only, test-or-production path.
android_yml = r'''name: Android checks and build
on:
  workflow_dispatch:
    inputs:
      release_mode:
        description: Build mode
        required: true
        type: choice
        default: test
        options:
          - test
          - production
  pull_request:
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 45
    env:
      REQUEST_PRODUCTION: ${{ github.event_name == 'workflow_dispatch' && inputs.release_mode == 'production' }}
      HAS_ANDROID_RELEASE_KEY: ${{ secrets.ANDROID_KEYSTORE_BASE64 != '' && secrets.ANDROID_KEYSTORE_PASSWORD != '' && secrets.ANDROID_KEY_ALIAS != '' && secrets.ANDROID_KEY_PASSWORD != '' }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Remove generated build/install artifacts
        run: rm -rf android dist .expo
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - name: Cache pinned OCR assets
        uses: actions/cache@v4
        with:
          path: .cache/ocr-tesseract-v5.1.1
          key: abu-bassam-ocr-tesseract-5.1.1-ara-eng-v4
      - name: Require production signing only for production mode
        if: ${{ env.REQUEST_PRODUCTION == 'true' && env.HAS_ANDROID_RELEASE_KEY != 'true' }}
        run: |
          echo 'Production mode requires Android release signing secrets.' >&2
          exit 1
      - name: Install locked dependencies
        run: npm ci --no-audit --no-fund
      - name: Check source
        run: npm run check:web
      - name: Verify Expo configuration
        run: npx expo config --type public >/tmp/expo-config.json
      - name: Generate Android from clean source
        env:
          CI: '1'
        run: npm run android:prebuild
      - name: Configure production release key
        if: ${{ env.REQUEST_PRODUCTION == 'true' && env.HAS_ANDROID_RELEASE_KEY == 'true' }}
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode > android/app/release-key.p12
          test -s android/app/release-key.p12
          printf '\napply from: file("../../scripts/android-release-signing.gradle")\n' >> android/app/build.gradle
      - name: Build release APK
        working-directory: android
        env:
          ANDROID_KEYSTORE_FILE: ${{ env.REQUEST_PRODUCTION == 'true' && format('{0}/android/app/release-key.p12', github.workspace) || '' }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          ANDROID_KEYSTORE_TYPE: PKCS12
        run: ./gradlew assembleRelease --no-daemon
      - name: Verify and prepare APK
        shell: bash
        run: |
          set -euo pipefail
          APK="$(ls android/app/build/outputs/apk/release/*.apk | head -n1)"
          test -s "$APK"
          unzip -l "$APK" | grep -q 'assets/index.android.bundle'
          VERSION="$(node -p "require('./app.json').expo.version")"
          mkdir -p dist
          OUT="dist/Abu_Bassam_Library_${VERSION}.apk"
          cp "$APK" "$OUT"
          BUILD_TOOLS="$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n1)"
          "$BUILD_TOOLS/apksigner" verify --verbose "$OUT"
          "$BUILD_TOOLS/apksigner" verify --print-certs "$OUT" > dist/SIGNING_CERTIFICATE.txt
          sha256sum "$OUT" > dist/SHA256.txt
          if [ "$REQUEST_PRODUCTION" = 'true' ]; then
            printf 'signed-production-release-with-embedded-js\n' > dist/BUILD_TYPE.txt
          else
            printf 'test-release-default-key-with-embedded-js-NOT-FOR-PRODUCTION-UPDATES\n' > dist/BUILD_TYPE.txt
          fi
      - name: Upload APK artifacts
        uses: actions/upload-artifact@v4
        with:
          name: abu-bassam-android-${{ github.sha }}
          path: |
            dist/*.apk
            dist/BUILD_TYPE.txt
            dist/SHA256.txt
            dist/SIGNING_CERTIFICATE.txt
          if-no-files-found: error
          retention-days: 14
'''
(ROOT / '.github' / 'workflows' / 'android.yml').write_text(android_yml, encoding='utf-8')

# 7) Permanent repo health check: read-only, never repairs source.
health_yml = r'''name: Repository health
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  source-health:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci --no-audit --no-fund
      - run: npm run check:web
      - run: npx expo config --type public >/tmp/expo-config.json
'''
(ROOT / '.github' / 'workflows' / 'repository-health.yml').write_text(health_yml, encoding='utf-8')

# 8) Build checker is dynamic and refuses source-mutating build paths.
checker = r'''const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const workflow=read('.github/workflows/android.yml'),local=read('scripts/build-android-local.mjs');
const errors=[];
for(const marker of ['permissions:\n  contents: read','release_mode:','default: test','production','npm ci --no-audit --no-fund','npm run check:web','npm run android:prebuild','./gradlew assembleRelease --no-daemon','assets/index.android.bundle','apksigner','dist/*.apk','test-release-default-key-with-embedded-js-NOT-FOR-PRODUCTION-UPDATES'])if(!workflow.includes(marker))errors.push(`android.yml missing ${marker}`);
for(const bad of ['contents: write','git push','patch-startup-stability','patch-customer-camera','Abu_Bassam_Library_4.3.2.apk'])if(workflow.includes(bad))errors.push(`android.yml forbidden ${bad}`);
for(const marker of ['appConfig','appVersion','apkFileName','npm',"['run', 'check:web']","['run', 'android:prebuild']","['assembleRelease', '--no-daemon']",'assets/index.android.bundle','SIGNING_CERTIFICATE.txt','SHA256.txt'])if(!local.includes(marker))errors.push(`local build missing ${marker}`);
if(/Abu_Bassam_Library_\d+\.\d+\.\d+\.apk/.test(local))errors.push('local build contains frozen APK version');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Android build paths are read-only, clean-source, dynamically versioned, and distinguish test from production signing.');
'''
(ROOT / 'tools' / 'check_android_workflow.js').write_text(checker, encoding='utf-8')

identity = r'''const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo;
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
const native=fs.readFileSync(path.join(root,'index.js'),'utf8');
const errors=[];
const version=String(app.version||'');
if(pkg.version!==version)errors.push(`package.json version ${pkg.version} != app.json ${version}`);
if(lock.version!==version||lock.packages?.['']?.version!==version)errors.push('package-lock root version is not synchronized');
const vm=native.match(/const APP_VERSION = '([^']+)';/), bm=native.match(/const BUILD_NUMBER = '([^']+)';/);
if(!vm||vm[1]!==version)errors.push('index.js APP_VERSION does not match app.json');
if(!bm||Number(bm[1])!==Number(app.android?.versionCode))errors.push('index.js BUILD_NUMBER does not match android.versionCode');
if(Number(app.android?.versionCode)<=432)errors.push('android.versionCode must stay above retired build 432');
if(!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version))errors.push('invalid semantic app version');
if(!app.android?.package)errors.push('Android package is missing');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Release identity synchronized: ${version} (${app.android.versionCode}) ${app.android.package}`);
'''
(ROOT / 'tools' / 'check_release_identity.js').write_text(identity, encoding='utf-8')

hygiene = r'''const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),errors=[];
const obsolete=['scripts/patch-startup-stability.mjs','scripts/patch-customer-camera.mjs','.github/workflows/migrate-verify-build.yml','.github/workflows/import-source-zip.yml','tools/repair_migrated_source.py','tools/rebuild_apk.py','tools/verify_release.py','tools/apk_v2.py','tools/check_import_workflow.js','tools/validate_imported_source.js'];
for(const rel of obsolete)if(fs.existsSync(path.join(root,rel)))errors.push(`obsolete file remains: ${rel}`);
const targets=['package.json','index.js','scripts/build-android-local.mjs','scripts/prepare-android-assets.mjs'];
for(const dir of ['web','.github/workflows'])if(fs.existsSync(path.join(root,dir)))for(const n of fs.readdirSync(path.join(root,dir)))if(/\.(?:js|html|yml|yaml)$/.test(n))targets.push(`${dir}/${n}`);
const forbidden=['questions-ar.html','questions-en.html','image-compressor.html','questionsCenter','compressorCenter','صياغة الأسئلة','ضغط الصور','com.akramghazali.phonerepair'];
for(const rel of targets){const p=path.join(root,rel);if(!fs.existsSync(p))continue;const s=fs.readFileSync(p,'utf8');for(const token of forbidden)if(s.includes(token))errors.push(`${rel}: retired token ${token}`)}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for(const [name,cmd] of Object.entries(pkg.scripts||{}))if(/patch-startup-stability|patch-customer-camera|repair_migrated_source|rebuild_apk/.test(String(cmd)))errors.push(`package script ${name} mutates/rebuilds from obsolete source`);
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Repository hygiene passed: no retired sections, source-mutating build patches, old APK repackers, or migration repair workflows remain in active source.');
'''
(ROOT / 'tools' / 'check_repository_hygiene.js').write_text(hygiene, encoding='utf-8')

# 9) Delete obsolete/historical source-mutation and APK-repacking paths.
for rel in [
    'scripts/patch-startup-stability.mjs','scripts/patch-customer-camera.mjs',
    '.github/workflows/migrate-verify-build.yml','.github/workflows/import-source-zip.yml',
    'tools/repair_migrated_source.py','tools/rebuild_apk.py','tools/verify_release.py','tools/apk_v2.py',
    'tools/check_import_workflow.js','tools/validate_imported_source.js',
]:
    p=ROOT/rel
    if p.exists(): p.unlink()

# Ensure cache/build outputs never enter source.
gitignore=ROOT/'.gitignore'
gi=gitignore.read_text(encoding='utf-8') if gitignore.exists() else ''
for entry in ['.cache/','android/','dist/','.expo/']:
    if entry not in gi.splitlines(): gi += ('\n' if gi and not gi.endswith('\n') else '') + entry + '\n'
gitignore.write_text(gi,encoding='utf-8')

print('Repository repair prepared: source is authoritative; obsolete build mutation/repack paths removed.')
