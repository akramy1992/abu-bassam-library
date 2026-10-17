'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const original=fs.readFileSync(path.join(__dirname,'..','index-auth.js'),'utf8');
const source=original
  .replace(/^import \{ Linking \} from 'react-native';\s*/m,'')
  .replace(/^import \* as SecureStore from 'expo-secure-store';\s*/m,'');
if(source.includes('import '))throw new Error('Auth test mocks need updating');
const initial='abu-bassam-library://auth/callback?flow=google&code=initial';
const next='abu-bassam-library://auth/callback?flow=recovery&code=next';
const stored=[],listeners={};
let failOnce=false,required=false;
const SecureStore={async setItemAsync(key,value){
  if(failOnce){failOnce=false;throw Error('temporary secure store failure')}
  stored.push([key,value]);
}};
const Linking={addEventListener(name,fn){listeners[name]=fn;return{remove(){}}},async getInitialURL(){return initial}};
const context={Linking,SecureStore,URL,console:{warn(){}},require(name){assert.equal(name,'./index.js');required=true}};
vm.runInNewContext(source,context,{filename:'index-auth.js',timeout:1500});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  assert.equal(required,true);
  await tick();await tick();
  assert.deepEqual(stored,[['abu_bassam_auth_callback_v1',initial]]);
  listeners.url({url:initial});await tick();
  assert.equal(stored.length,1);
  for(const url of ['https://evil.example/callback?code=bad','abu-bassam-library://auth/callback.evil?code=bad','abu-bassam-library://other/callback?code=bad','abu-bassam-library://auth/callback?flow=google','abu-bassam-library://auth/callback?code='+('x'.repeat(9000))])listeners.url({url});
  await tick();await tick();
  assert.equal(stored.length,1,'unexpected callback accepted');
  failOnce=true;listeners.url({url:next});await tick();
  assert.equal(stored.length,1,'failed secure write must not advance callback');
  listeners.url({url:next});await tick();
  assert.deepEqual(stored[1],['abu_bassam_auth_callback_v1',next]);
  console.log('Native authentication routing: initial URL, exact callback, invalid URLs, deduplication, secure write retry PASSED.');
})().catch(error=>{console.error(error);process.exitCode=1});
