import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'abu-bassam-private';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-id, x-device-secret',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};
function json(body: unknown, status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
function userClient(req:Request){const authorization=req.headers.get('Authorization')||'';return createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}})}
function adminClient(){return createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}})}
function safePart(v:string){return String(v||'').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,180)}
async function sha256Hex(value:string){const bytes=new TextEncoder().encode(value),hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function context(req:Request,permission:string){
  const deviceId=req.headers.get('x-device-id')||'',secret=req.headers.get('x-device-secret')||'';
  if(!deviceId||!secret)throw new Error('DEVICE_REQUIRED');
  const userApi=userClient(req),{data:{user},error:userError}=await userApi.auth.getUser();
  if(userError||!user)throw new Error('NOT_AUTHENTICATED');
  const admin=adminClient(),{data:device,error}=await admin.from('abu_bassam_devices').select('device_id,role,active,permissions,secret_hash').eq('user_id',user.id).eq('device_id',deviceId).maybeSingle();
  if(error||!device||device.active===false||!device.secret_hash||device.secret_hash!==await sha256Hex(secret))throw new Error('DEVICE_NOT_AUTHORIZED');
  const allowed=device.role==='owner'||device.permissions?.[permission]!==false;
  if(!allowed)throw new Error(permission.toUpperCase()+'_NOT_ALLOWED');
  return{user,userApi,admin,deviceId,device};
}
function scopedPath(userId:string,deviceId:string,itemId:string){return `${userId}/branch-vault/${safePart(deviceId)}/${safePart(itemId)}`}
function isScoped(path:string,userId:string,deviceId:string){return String(path||'').startsWith(`${userId}/branch-vault/${safePart(deviceId)}/`)}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const url=new URL(req.url),action=url.searchParams.get('action')||'';
    if(action==='upload-url'&&req.method==='POST'){
      const body=await req.json().catch(()=>({})),itemId=String(body?.item_id||''),mime=String(body?.mime||'application/octet-stream').split(';',1)[0].trim().toLowerCase();
      if(!itemId)return json({error:'ITEM_ID_REQUIRED'},400);
      const base=await context(req,'vaultSync');
      const {data:existing}=await base.admin.from('abu_bassam_branch_vault').select('client_id').eq('user_id',base.user.id).eq('branch_device_id',base.deviceId).eq('client_id',itemId).maybeSingle();
      const permission=existing?'vaultEdit':'vaultAdd';
      if(base.device.role!=='owner'&&base.device.permissions?.[permission]===false)return json({error:permission.toUpperCase()+'_NOT_ALLOWED'},403);
      const path=scopedPath(base.user.id,base.deviceId,itemId),{data,error}=await base.admin.storage.from(BUCKET).createSignedUploadUrl(path,{upsert:true});
      if(error||!data)return json({error:error?.message||'SIGNED_UPLOAD_FAILED'},500);
      return json({ok:true,path,token:data.token,mime:mime||'application/octet-stream'});
    }
    if(action==='download-url'&&req.method==='GET'){
      const itemId=String(url.searchParams.get('item_id')||'');if(!itemId)return json({error:'ITEM_ID_REQUIRED'},400);
      const base=await context(req,'vaultView');
      if(base.device.role!=='owner'&&base.device.permissions?.vaultSync===false)return json({error:'VAULT_SYNC_NOT_ALLOWED'},403);
      const {data:row,error:rowError}=await base.admin.from('abu_bassam_branch_vault').select('data').eq('user_id',base.user.id).eq('branch_device_id',base.deviceId).eq('client_id',itemId).maybeSingle();
      if(rowError||!row)return json({error:'VAULT_ITEM_NOT_FOUND'},404);
      const path=String(row.data?.storagePath||'');if(!path||!isScoped(path,base.user.id,base.deviceId))return json({error:'VAULT_PATH_INVALID'},403);
      const {data,error}=await base.admin.storage.from(BUCKET).createSignedUrl(path,120,{download:false});if(error||!data?.signedUrl)return json({error:error?.message||'SIGNED_DOWNLOAD_FAILED'},500);
      return json({ok:true,path,url:data.signedUrl,expiresIn:120});
    }
    if(action==='delete'&&req.method==='DELETE'){
      const body=await req.json().catch(()=>({})),itemId=String(body?.item_id||''),requested=String(body?.path||'');
      const base=await context(req,'vaultDelete');
      if(base.device.role!=='owner'&&base.device.permissions?.vaultSync===false)return json({error:'VAULT_SYNC_NOT_ALLOWED'},403);
      let path=requested;
      if(itemId){const {data:row}=await base.admin.from('abu_bassam_branch_vault').select('data').eq('user_id',base.user.id).eq('branch_device_id',base.deviceId).eq('client_id',itemId).maybeSingle();path=path||String(row?.data?.storagePath||'')}
      if(path&&!isScoped(path,base.user.id,base.deviceId))return json({error:'VAULT_PATH_INVALID'},403);
      if(path){const {error}=await base.admin.storage.from(BUCKET).remove([path]);if(error)return json({error:error.message},500)}
      return json({ok:true});
    }
    return json({error:'UNSUPPORTED_ACTION'},400);
  }catch(error){const message=String((error as Error)?.message||error||'SERVER_ERROR'),status=/NOT_ALLOWED|NOT_AUTHENTICATED|DEVICE/.test(message)?403:500;return json({error:message},status)}
});
