import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const indexPath = resolve(root, 'index.js');
const recoveryPath = resolve(root, 'web', 'feature-recovery-runtime.js');

function requireMarker(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`Startup stability patch failed: ${label}`);
}

let index = await readFile(indexPath, 'utf8');
let indexChanged = false;

// Keep this script safe to run repeatedly. The authoritative source must already
// be hardened; this preparation step must never weaken WebView security.
if (!index.includes('STARTUP_WATCHDOG_MS')) {
  const from = "const BUILD_NUMBER = '432';";
  if (!index.includes(from)) throw new Error('Startup stability patch failed: build number anchor');
  index = index.replace(from, `${from}\nconst STARTUP_WATCHDOG_MS = 9000;`);
  indexChanged = true;
}

for (const forbidden of ["originWhitelist={['*']}", 'mixedContentMode="always"']) {
  if (index.includes(forbidden)) throw new Error(`Startup stability patch refused insecure WebView state: ${forbidden}`);
}
for (const [marker, label] of [
  ['file:///android_asset/library/', 'local app asset scope'],
  ["originWhitelist={['file://*','about:*']}", 'local-only origin whitelist'],
  ['mixedContentMode="never"', 'mixed-content protection'],
  ['onShouldStartLoadWithRequest', 'navigation guard'],
  ['webRef.current?.reload()', 'native startup retry'],
  ['setWebReady(true)', 'startup watchdog completion'],
]) requireMarker(index, marker, label);

// Keep a progress-based escape hatch in addition to onLoadEnd and the native
// watchdog. This is useful on WebView versions that delay the final load event.
if (!index.includes('onLoadProgress=')) {
  const anchor = 'injectedJavaScriptBeforeContentLoaded={ANDROID_BRIDGE} onMessage={onWebMessage} onShouldStartLoadWithRequest={onShouldStartLoadWithRequest} onLoadEnd={() => setWebReady(true)}';
  if (!index.includes(anchor)) throw new Error('Startup stability patch failed: WebView load callback anchor');
  index = index.replace(anchor, 'injectedJavaScriptBeforeContentLoaded={ANDROID_BRIDGE} onMessage={onWebMessage} onShouldStartLoadWithRequest={onShouldStartLoadWithRequest} onLoadProgress={(event) => { if ((event.nativeEvent?.progress || 0) >= 0.35) setWebReady(true); }} onLoadEnd={() => setWebReady(true)}');
  indexChanged = true;
}
requireMarker(index, 'onLoadProgress', 'WebView progress fallback');

// Preserve original file names and per-image MIME when exporting a batch of
// compressed pictures. This patch is intentionally additive and idempotent.
if (!index.includes('const encodedNameMatch = raw.match(/;name=([^;]+);base64,/i);')) {
  const savePagesPattern = /  const savePagesToGallery = useCallback\(async \(\{ prefix, pages, mime \}\) => \{[\s\S]*?\n  \}, \[\]\);\n\n  const printPages/;
  if (!savePagesPattern.test(index)) throw new Error('Startup stability patch failed: named compressed image saving');
  index = index.replace(savePagesPattern, `  const savePagesToGallery = useCallback(async ({ prefix, pages, mime }) => {
    try {
      const imagePages = typeof pages === 'string' ? JSON.parse(pages) : pages;
      if (!Array.isArray(imagePages) || !imagePages.length) throw new Error('لا توجد صور للحفظ');
      if (imagePages.length > 20) throw new Error('عدد الصور أكبر من الحد المسموح');
      const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Pictures');
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
      if (!permission.granted) return;
      let saved = 0, failed = 0;
      for (let index = 0; index < imagePages.length; index += 1) {
        try {
          const raw = String(imagePages[index] || '');
          if (!raw.startsWith('data:image/')) throw new Error('صيغة الصورة غير مدعومة');
          const parsed = splitDataUrl(raw);
          const itemMime = String(parsed.mime || mime || 'image/jpeg');
          if (!itemMime.startsWith('image/')) throw new Error('صيغة الصورة غير مدعومة');
          const encodedNameMatch = raw.match(/;name=([^;]+);base64,/i);
          let requestedName = '';
          if (encodedNameMatch) {
            try { requestedName = decodeURIComponent(encodedNameMatch[1]); } catch (_) { requestedName = encodedNameMatch[1]; }
          }
          const fallbackName = safeName(prefix || 'Abu_Bassam_Page') + '_' + (index + 1) + '_' + Date.now();
          const finalName = safeName(requestedName || fallbackName);
          const dot = finalName.lastIndexOf('.');
          const displayName = dot > 0 ? finalName.slice(0, dot) : finalName;
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, displayName, itemMime);
          await FileSystem.StorageAccessFramework.writeAsStringAsync(uri, parsed.base64, { encoding: FileSystem.EncodingType.Base64 });
          saved += 1;
        } catch (_) { failed += 1; }
      }
      if (!saved) throw new Error('تعذر حفظ الصور المحددة');
      Alert.alert('تم الحفظ في المعرض', failed ? 'تم حفظ ' + saved + ' صورة وتعذر حفظ ' + failed + '.' : 'تم حفظ ' + saved + ' صورة داخل المجلد الذي اخترته.');
    } catch (error) { Alert.alert('تعذر حفظ الصفحات', String(error?.message || error)); }
  }, []);

  const printPages`);
  indexChanged = true;
}

if (indexChanged) await writeFile(indexPath, index, 'utf8');

let recovery = await readFile(recoveryPath, 'utf8');
let recoveryChanged = false;
const oldObserver = "function init(){addCss();removeFlex();cleanQuestions();installCards();removeOldPlacements();window.addEventListener('message',recoveryMessage);new MutationObserver(()=>{removeFlex();cleanQuestions();installCards();removeOldPlacements()}).observe(document.documentElement,{childList:true,subtree:true})}";
const newObserver = "let recoveryTimer=0;function scheduleRecovery(){clearTimeout(recoveryTimer);recoveryTimer=setTimeout(()=>{removeFlex();cleanQuestions();installCards();removeOldPlacements()},60)}\nfunction init(){addCss();removeFlex();cleanQuestions();installCards();removeOldPlacements();window.addEventListener('message',recoveryMessage);new MutationObserver(scheduleRecovery).observe(document.documentElement,{childList:true,subtree:true})}";
if (recovery.includes(oldObserver)) {
  recovery = recovery.replace(oldObserver, newObserver);
  recoveryChanged = true;
} else if (!recovery.includes('new MutationObserver(scheduleRecovery).observe(document.documentElement,{childList:true,subtree:true})')) {
  throw new Error('Startup stability patch failed: debounced recovery observer');
}
if (recoveryChanged) await writeFile(recoveryPath, recovery, 'utf8');

process.stdout.write('Startup stability preparation passed: hardened local WebView, progress fallback, native retry watchdog, named mixed-format compressed image saving, and debounced recovery observer.\n');
