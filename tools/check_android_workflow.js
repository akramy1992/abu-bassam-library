const fs=require('fs'),path=require('path');
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
