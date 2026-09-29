import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET='abu-bassam-private';
const TABLE='abu_bassam_backups';
const MAX_BYTES=512*1024*1024,MAX_ITEMS=1000,MAX_PARTS=120;
const DEFAULT_ALLOWED=new Set(['backupCreate','backupRestore','backupDelete','backupEncrypted']);
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-device-id, x-device-secret','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
function userClient(req:Request){return createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false}})}
function adminClient(){return createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}})}
async function sha256Hex(v:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function permissionEnabled(device:{role?:string;permissions?:Record<string,unknown>},key:string){if(device?.role==='owner')return true;const p=device?.permissions&&typeof device.permissions==='object'?device.permissions:{};if(typeof p[key]==='boolean')return p[key]===true;return DEFAULT_ALLOWED.has(key)}
async function context(req:Request,permission:string){
  const deviceId=req.headers.get('x-device-id')||'',secret=req.headers.get('x-device-secret')||'';
  if(!deviceId||!secret)throw new Error('DEVICE_REQUIRED');
  const uc=userClient(req),{data:{user},error:ue}=await uc.auth.getUser();if(ue||!user)throw new Error('NOT_AUTHENTICATED');
  const admin=adminClient(),{data:device,error}=await admin.from('abu_bassam_devices').select('device_id,device_name,role,active,permissions,secret_hash').eq('user_id',user.id).eq('device_id',deviceId).maybeSingle();
  if(error||!device||device.active===false||!device.secret_hash||device.secret_hash!==await sha256Hex(secret))throw new Error('DEVICE_NOT_AUTHORIZED');
  if(!permissionEnabled(device,permission))throw new Error(permission.toUpperCase()+'_NOT_ALLOWED');
  return{user,admin,deviceId,device};
}
function safeId(v:string){return String(v||'').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,180)}
function scopeAllowed(device:{role?:string},deviceId:string,row:any){return device?.role==='owner'||row?.branch_device_id===deviceId}
async function removeParts(admin:any,parts:string[]){if(parts.length){const {error}=await admin.storage.from(BUCKET).remove(parts);if(error)throw error}}
async function deleteMetadata(admin:any,userId:string,backupId:string){const {error}=await admin.from(TABLE).delete().eq('user_id',userId).eq('backup_id',backupId);if(error)throw error}
async function cleanupPending(base:any){
  const cutoff=new Date(Date.now()-24*60*60*1000).toISOString();
  const {data,error}=await base.admin.from(TABLE).select('backup_id,parts').eq('user_id',base.user.id).eq('branch_device_id',base.deviceId).eq('ready',false).lt('created_at',cutoff).limit(20);
  if(error)throw error;
  let deferred=0;
  for(const row of data||[]){
    try{
      await removeParts(base.admin,Array.isArray(row.parts)?row.parts.map(String):[]);
      await deleteMetadata(base.admin,base.user.id,String(row.backup_id));
    }catch(_){deferred+=1}
  }
  return deferred;
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const url=new URL(req.url),action=url.searchParams.get('action')||'';
    if(action==='plan'&&req.method==='POST'){
      const base=await context(req,'backupCreate');const cleanupDeferred=await cleanupPending(base);
      const body=await req.json().catch(()=>({})),sha=String(body.sha256||'').toLowerCase(),size=Number(body.size_bytes||0),count=Number(body.item_count||0),partCount=Number(body.part_count||0),kind=['manual','automatic','pre_restore'].includes(body.backup_kind)?body.backup_kind:'manual',encrypted=!!body.encrypted;
      if(!/^[0-9a-f]{64}$/.test(sha))return json({error:'INVALID_SHA256'},400);
      if(!Number.isInteger(size)||size<0||size>MAX_BYTES||!Number.isInteger(count)||count<0||count>MAX_ITEMS||!Number.isInteger(partCount)||partCount<1||partCount>MAX_PARTS)return json({error:'BACKUP_LIMIT_INVALID'},400);
      if(encrypted&&!permissionEnabled(base.device,'backupEncrypted'))return json({error:'BACKUP_ENCRYPTED_NOT_ALLOWED'},403);
      const backupId=crypto.randomUUID(),prefix=`${base.user.id}/backup-vault/${safeId(base.deviceId)}/${backupId}`;
      const parts=Array.from({length:partCount},(_,i)=>`${prefix}/part-${String(i+1).padStart(4,'0')}.bin`),uploads=[] as any[];
      for(const path of parts){const {data,error}=await base.admin.storage.from(BUCKET).createSignedUploadUrl(path,{upsert:false});if(error||!data?.token){await removeParts(base.admin,parts).catch(()=>{});return json({error:error?.message||'SIGNED_UPLOAD_FAILED'},500)}uploads.push({path,token:data.token})}
      const {error:insertError}=await base.admin.from(TABLE).insert({user_id:base.user.id,backup_id:backupId,branch_device_id:base.deviceId,branch_name:String(base.device.device_name||'هذا الفرع'),parts,sha256:sha,size_bytes:size,item_count:count,backup_kind:kind,encrypted,app_version:String(body.app_version||''),ready:false});
      if(insertError)return json({error:insertError.message},500);
      return json({ok:true,backup_id:backupId,uploads,cleanup_deferred:cleanupDeferred});
    }
    if(action==='commit'&&req.method==='POST'){
      const base=await context(req,'backupCreate'),body=await req.json().catch(()=>({})),backupId=String(body.backup_id||''),retention=Math.max(1,Math.min(30,Number(body.retention)||7));
      const {data:row,error}=await base.admin.from(TABLE).select('*').eq('user_id',base.user.id).eq('backup_id',backupId).maybeSingle();if(error||!row)return json({error:'BACKUP_NOT_FOUND'},404);if(row.branch_device_id!==base.deviceId)return json({error:'BACKUP_SCOPE_DENIED'},403);if(row.ready)return json({ok:true,already_ready:true});
      const parts=Array.isArray(row.parts)?row.parts.map(String):[],prefix=`${base.user.id}/backup-vault/${safeId(base.deviceId)}/${backupId}`,{data:objects,error:listError}=await base.admin.storage.from(BUCKET).list(prefix,{limit:MAX_PARTS});if(listError)return json({error:listError.message},500);
      const byName=new Map((objects||[]).map((o:any)=>[String(o.name),Number(o.metadata?.size||0)]));let total=0;for(const path of parts){const name=path.split('/').pop()||'',n=byName.get(name);if(n===undefined)return json({error:'BACKUP_PART_MISSING'},409);total+=n}if(total!==Number(row.size_bytes))return json({error:'BACKUP_SIZE_MISMATCH',expected:row.size_bytes,actual:total},409);
      const {error:updateError}=await base.admin.from(TABLE).update({ready:true,committed_at:new Date().toISOString()}).eq('user_id',base.user.id).eq('backup_id',backupId);if(updateError)return json({error:updateError.message},500);
      const {data:old,error:oldError}=await base.admin.from(TABLE).select('backup_id,parts').eq('user_id',base.user.id).eq('branch_device_id',base.deviceId).eq('ready',true).order('created_at',{ascending:false}).range(retention,retention+49);if(oldError)return json({error:oldError.message},500);
      let cleanupDeferred=0;
      for(const stale of old||[]){
        try{
          await removeParts(base.admin,Array.isArray(stale.parts)?stale.parts.map(String):[]);
          await deleteMetadata(base.admin,base.user.id,String(stale.backup_id));
        }catch(_){cleanupDeferred+=1}
      }
      return json({ok:true,backup_id:backupId,retention,cleanup_deferred:cleanupDeferred});
    }
    if(action==='list'&&req.method==='GET'){
      const base=await context(req,'backupRestore'),all=url.searchParams.get('all')==='1'&&base.device.role==='owner';let q=base.admin.from(TABLE).select('backup_id,branch_device_id,branch_name,sha256,size_bytes,item_count,backup_kind,encrypted,app_version,created_at,committed_at').eq('user_id',base.user.id).eq('ready',true).order('created_at',{ascending:false}).limit(100);if(!all)q=q.eq('branch_device_id',base.deviceId);const {data,error}=await q;if(error)return json({error:error.message},500);return json({ok:true,backups:data||[]});
    }
    if(action==='download'&&req.method==='GET'){
      const base=await context(req,'backupRestore'),backupId=String(url.searchParams.get('backup_id')||''),{data:row,error}=await base.admin.from(TABLE).select('*').eq('user_id',base.user.id).eq('backup_id',backupId).eq('ready',true).maybeSingle();if(error||!row)return json({error:'BACKUP_NOT_FOUND'},404);if(!scopeAllowed(base.device,base.deviceId,row))return json({error:'BACKUP_SCOPE_DENIED'},403);const paths=Array.isArray(row.parts)?row.parts.map(String):[],signed=[] as any[];for(const path of paths){const {data,error}=await base.admin.storage.from(BUCKET).createSignedUrl(path,180);if(error||!data?.signedUrl)return json({error:error?.message||'SIGNED_DOWNLOAD_FAILED'},500);signed.push({path,url:data.signedUrl})}return json({ok:true,backup:row,parts:signed});
    }
    if(action==='delete'&&req.method==='DELETE'){
      const base=await context(req,'backupDelete'),body=await req.json().catch(()=>({})),backupId=String(body.backup_id||''),{data:row,error}=await base.admin.from(TABLE).select('*').eq('user_id',base.user.id).eq('backup_id',backupId).maybeSingle();if(error||!row)return json({error:'BACKUP_NOT_FOUND'},404);if(!scopeAllowed(base.device,base.deviceId,row))return json({error:'BACKUP_SCOPE_DENIED'},403);await removeParts(base.admin,Array.isArray(row.parts)?row.parts.map(String):[]);await deleteMetadata(base.admin,base.user.id,backupId);return json({ok:true});
    }
    if(action==='cleanup'&&req.method==='POST'){const base=await context(req,'backupCreate');const cleanupDeferred=await cleanupPending(base);return json({ok:true,cleanup_deferred:cleanupDeferred})}
    return json({error:'UNSUPPORTED_ACTION'},400);
  }catch(error){const message=String((error as Error)?.message||error||'SERVER_ERROR'),status=/NOT_ALLOWED|NOT_AUTHENTICATED|DEVICE|SCOPE/.test(message)?403:500;return json({error:message},status)}
});
