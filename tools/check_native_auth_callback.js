'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const entry=fs.readFileSync(path.join(__dirname,'..','index-auth.js'),'utf8');
assert.match(entry,/import\s+\{\s*Linking\s*\}\s+from\s+['"]react-native['"]/);
assert.match(entry,/import\s+\*\s+as\s+SecureStore\s+from\s+['"]expo-secure-store['"]/);
const source=entry.replace(/^import .+;\r?\n/gm,'');
new vm.Script(source,{filename:'index-auth.js (imports removed for VM)'});

async function scenario(){
  let receive=null,mainLoaded=0,fail=false;
  const writes=[];
  const linking={
    getInitialURL:()=>Promise.resolve('abu-bassam-library://auth/callback?code=initial'),
    addEventListener:(event,handler)=>{assert.equal(event,'url');receive=handler}
  };
  const secure={
    setItemAsync:async(key,value)=>{if(fail)throw Error('temporary secure storage error');writes.push([key,value])}
  };
  vm.runInNewContext(source,{Linking:linking,SecureStore:secure,URL,require:(file)=>{
    assert.equal(file,'./index.js');
    mainLoaded++;
  }},{filename:'index-auth.js',timeout:1000});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(mainLoaded,1,'normal application entrypoint must still be loaded');
  assert.equal(writes.length,1,'valid initial OS callback must be captured');
  assert.equal(writes[0][0],'abu_bassam_auth_callback_v1');
  await receive({url:'abu-bassam-library://auth/callback?code=initial'});
  assert.equal(writes.length,1,'repeated callback must be ignored after successful SecureStore write');
  await receive({url:'abu-bassam-library://auth/callback-extra?code=evil'});
  await receive({url:'https://evil.example/auth/callback?code=evil'});
  await receive({url:'abu-bassam-library://auth/callback'});
  assert.equal(writes.length,1,'untrusted or malformed callback must not be stored');
  fail=true;
  await receive({url:'abu-bassam-library://auth/callback?code=retry'});
  assert.equal(writes.length,1,'failed secure write must not be treated as completed');
  fail=false;
  await receive({url:'abu-bassam-library://auth/callback?code=retry'});
  assert.equal(writes.length,2,'same callback must be retryable after secure write failure');
  assert.equal(writes[1][1],'abu-bassam-library://auth/callback?code=retry');
  console.log('Auth callback entry: exact URL, dedupe, safe secure-storage retry and application boot checks passed.');
}
scenario().catch(error=>{console.error(error);process.exitCode=1;});
