(()=>{
'use strict';
if(window.__ABU_OPERATION_LOG_PRIVACY_V1__)return;
window.__ABU_OPERATION_LOG_PRIVACY_V1__=true;
const OPS_KEY='abuBassamOpsV4';
const TABLE='abu_bassam_sync_secure';
const SCOPE_KEY='abuBassamOperationDeviceScopeV1';
let cleaned=false;
function role(){return window.AbuBassamSecurity?.role?.()||''}
function device(){return window.AbuBassamSecurity?.device?.()||window.AbuBassamDevices?.ensure?.()||{}}
function deviceId(){const d=device();return String(d.device_id||d.id||localStorage.getItem('abuBassamLockedDeviceIdV3')||'').trim()}
function readOps(){try{const x=JSON.parse(localStorage.getItem(OPS_KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}}
function writeOps(list){try{localStorage.setItem(OPS_KEY,JSON.stringify((Array.isArray(list)?list:[]).slice(0,500)))}catch(_){}}
function readScope(){try{const value=JSON.parse(localStorage.getItem(SCOPE_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch(_){return{}}}
function writeScope(scope){try{localStorage.setItem(SCOPE_KEY,JSON.stringify(scope&&typeof scope==='object'?scope:{}))}catch(_){}}
function cleanSecondaryLocal(){
  if(cleaned||role()!=='secondary')return false;
  const id=deviceId();
  if(!id)return false;
  const scope=readScope(),before=readOps();
  const own=before.filter(item=>{
    const opId=String(item?.id||'').trim();
    const ownerId=opId?String(scope[opId]||'').trim():'';
    return !!ownerId&&ownerId===id;
  });
  const keptIds=new Set(own.map(item=>String(item?.id||'')).filter(Boolean));
  Object.keys(scope).forEach(key=>{if(!keptIds.has(key)&&scope[key]===id)delete scope[key]});
  if(own.length!==before.length)writeOps(own);
  writeScope(scope);
  cleaned=true;
  return true;
}
function forceClean(){cleaned=false;return cleanSecondaryLocal()}
function delayedClean(){[250,800,1800,3500,7000].forEach(ms=>setTimeout(forceClean,ms))}
function wrapBuilder(target,state={kind:''}){
  if(!target||typeof target!=='object')return target;
  return new Proxy(target,{
    get(obj,prop){
      if(prop==='then'&&state.kind==='operation')return (resolve,reject)=>Promise.resolve({data:[],error:null,count:0}).then(resolve,reject);
      const value=Reflect.get(obj,prop,obj);
      if(typeof value!=='function')return value;
      if(prop==='upsert')return (rows,options)=>{
        const list=Array.isArray(rows)?rows:[rows];
        const keep=list.filter(row=>String(row?.kind||'')!=='operation');
        if(!keep.length)return Promise.resolve({data:null,error:null,count:0});
        return value.call(obj,Array.isArray(rows)?keep:keep[0],options);
      };
      return (...args)=>{
        const next=value.apply(obj,args),nextState={...state};
        if(prop==='eq'&&String(args[0])==='kind')nextState.kind=String(args[1]||'');
        if(next&&typeof next==='object')return wrapBuilder(next,nextState);
        return next;
      };
    }
  })
}
function installClientBoundary(){const cloud=window.AbuBassamCloud,c=cloud?.client;if(!c||typeof c.from!=='function')return false;if(c.from.__abuOperationPrivacy)return true;const original=c.from.bind(c);const wrapped=function(table){const b=original(table);return String(table)===TABLE?wrapBuilder(b,{kind:''}):b};wrapped.__abuOperationPrivacy=true;wrapped.__abuOriginal=original;c.from=wrapped;return true}
function boot(){let attempts=0;const timer=setInterval(()=>{attempts++;const a=installClientBoundary();forceClean();if(a){try{window.AbuBassamOps?.sync?.()}catch(_){}if(role()==='owner'||attempts>80)clearInterval(timer)}else if(attempts>120)clearInterval(timer)},120);delayedClean();window.addEventListener('online',()=>{installClientBoundary();forceClean();delayedClean()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')forceClean()})}
window.AbuBassamOperationPrivacy={install:installClientBoundary,clean:forceClean,deviceId};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
