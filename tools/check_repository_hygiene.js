const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),errors=[];
const obsolete=[
  'scripts/patch-startup-stability.mjs',
  'scripts/patch-customer-camera.mjs',
  '.github/workflows/audit-current-main.yml',
  '.github/workflows/migrate-verify-build.yml',
  '.github/workflows/import-source-zip.yml',
  '.github/workflows/one-time-repository-repair.yml',
  'tools/repair_migrated_source.py',
  'tools/rebuild_apk.py',
  'tools/verify_release.py',
  'tools/apk_v2.py',
  'tools/check_import_workflow.js',
  'tools/validate_imported_source.js',
  'web/residence-card.html',
  'web/a4-card-sheet-editor-runtime.js'
];
for(const rel of obsolete)if(fs.existsSync(path.join(root,rel)))errors.push(`obsolete file remains: ${rel}`);
for(const rel of ['android','dist','.expo'])if(fs.existsSync(path.join(root,rel)))errors.push(`generated build/install artifact is tracked/present in source checkout: ${rel}`);
const targets=['package.json','index.js','scripts/build-android-local.mjs','scripts/prepare-android-assets.mjs'];
for(const dir of ['web','.github/workflows'])if(fs.existsSync(path.join(root,dir)))for(const n of fs.readdirSync(path.join(root,dir)))if(/\.(?:js|html|yml|yaml)$/.test(n))targets.push(`${dir}/${n}`);
const forbidden=[
  'questions-ar.html','questions-en.html','image-compressor.html','questionsCenter','compressorCenter',
  'صياغة الأسئلة','ضغط الصور','com.akramghazali.phonerepair','Abu_Bassam_Library_4.3.2.apk',
  'patch-startup-stability.mjs','patch-customer-camera.mjs','repair_migrated_source.py','rebuild_apk.py'
];
for(const rel of targets){const p=path.join(root,rel);if(!fs.existsSync(p))continue;const s=fs.readFileSync(p,'utf8');for(const token of forbidden)if(s.includes(token))errors.push(`${rel}: retired token ${token}`)}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for(const [name,cmd] of Object.entries(pkg.scripts||{}))if(/patch-startup-stability|patch-customer-camera|repair_migrated_source|rebuild_apk|verify_release\.py|apk_v2\.py/.test(String(cmd)))errors.push(`package script ${name} mutates/rebuilds from obsolete source`);
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Repository hygiene passed: obsolete workflows/modules, retired sections, source-mutating patches, generated install/build trees, old APK repackers, and stale release references are absent.');
