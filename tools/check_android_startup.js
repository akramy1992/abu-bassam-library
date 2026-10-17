'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const native=read('index.js'),security=read('web/app-security-runtime.js'),device=read('web/device-name-runtime.js'),html=read('web/index.html');
// Parse real JSX/JavaScript before Gradle starts; string checks alone cannot detect broken JSX closures.
const parser=require('@babel/parser');
parser.parse(native,{sourceType:'module',plugins:['jsx']});
parser.parse(security,{sourceType:'script'});
for(const file of ['web/index.html','web/app-security-runtime.js','web/security-bootstrap-guard-runtime.js','web/device-name-runtime.js']){
  assert.ok(fs.statSync(path.join(root,file)).size>100,file+' missing or empty');
}
assert.ok(html.includes('<script src="device-name-runtime.js"></script>'),'device bootstrap not loaded');
assert.ok(native.includes("message.type === 'webBootReady' && message.component === 'login-gate'"),'early boot message could bypass login');
assert.ok(native.includes("message.type === 'webBootFailure'"),'missing web boot failure handling');
assert.ok(native.includes('window.__ABU_BASSAM_SECURITY_READY__'),'load-end probe missing security check');
assert.ok(!native.includes('onLoadEnd={() => setWebReady(true)}'),'onLoadEnd does not mean UI ready');
assert.ok(!native.includes('startupAttempts'),'blind load retry remains');
assert.ok(!native.includes('webRef.current?.reload()'),'blind WebView reload remains');
assert.ok(native.includes('RENDERER_TERMINATED')&&native.includes('retryStartupManually'),'renderer retry not bounded');
assert.ok(native.includes('SECURITY_GATE_TIMEOUT')&&native.includes('WEBVIEW_LOAD_'),'startup needs explicit error diagnostics');
assert.ok(security.includes("document.getElementById('abuSecurityGate')")&&security.includes("document.getElementById('abuLoginBtn')"),'login gate must be present');
assert.ok(security.includes('confirmNativeLoginGate();guardClicks();'),'ready must happen only after UI is mounted');
assert.ok(security.includes('startSecurityBoot')&&security.includes('reportNativeBootFailure'),'security initialization failure not reported');
assert.ok(device.includes("type:'webBootReady'"),'legacy early event must be excluded by scoped native handler');
// Non-intercepting native control separates broken WebView touch from Android touch.
assert.ok(native.includes('pointerEvents="box-none"'),'diagnostic layer must not consume WebView touches outside controls');
assert.ok(native.includes("androidLayerType={useSoftwareWebView ? 'software' : 'hardware'}"),'alternative renderer A/B test required');
assert.ok(native.includes("message.type === 'touchProbeEvent'"),'DOM pointer/touch response missing');
assert.ok(native.includes("message.type === 'touchProbeResult'"),'WebView DOM hit test missing');
assert.ok(native.includes("window.__ABU_BASSAM_TOUCH_PROBE__"),'missing opt-in probe');
assert.ok(native.includes('retryStartupManually();'),'renderer fallback must reinitialize WebView');
assert.ok(!native.includes("event.preventDefault();")&&!native.includes("event.stopPropagation();"),'touch diagnostics must not block input');
console.log('Android startup and native/WebView touch diagnostics: static checks passed; real phone taps still require field verification.');
