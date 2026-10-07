const fs=require('fs');
const src=fs.readFileSync('index.js','utf8');
const need=(s,m,l)=>{if(!s.includes(m))throw new Error(`native link security check failed: ${l}`)};
const forbid=(s,m,l)=>{if(s.includes(m))throw new Error(`native link security check failed: forbidden ${l}`)};

need(src,"if (/^(https:|tel:|mailto:|tg:|whatsapp:)/i.test(url))",'external navigation must allow HTTPS and approved app schemes only');
forbid(src,"https?:|tel:",'external navigation must not accept plaintext HTTP');
need(src,"if (!/^(https:|tel:|mailto:|tg:|whatsapp:)/i.test(value))",'openExternal must allow HTTPS and approved app schemes only');
need(src,"originWhitelist={['file://*','about:*']}",'WebView must stay local-only');
need(src,'mixedContentMode="never"','mixed content must stay disabled');
need(src,'STARTUP_WATCHDOG_MS','startup watchdog must remain in canonical native source');
need(src,'onLoadEnd={() => setWebReady(true)}','native shell must mark WebView ready after local page load');
need(src,'recoverWebRenderer','native shell must recover a crashed WebView renderer');
forbid(src,"originWhitelist={['*']}",'wildcard WebView origin whitelist');
forbid(src,'mixedContentMode="always"','unsafe mixed content');

if(fs.existsSync('scripts/patch-startup-stability.mjs'))throw new Error('native link security check failed: obsolete source-mutating startup patch must remain removed');
console.log('native link security checks passed: canonical native source keeps WebView local-only, external web navigation HTTPS-only, startup watchdog/recovery intact, and obsolete source-mutating repair scripts absent.');
