import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'abu-bassam-customers-private';
const MAX_FILE = 25 * 1024 * 1024;
const SAFE_EDITED = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif','image/avif','application/pdf']);
const SAFE_ORIGINAL = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif','image/avif']);
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-id, x-device-secret',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control':'no-store' } }); }
function userClient(req: Request) { const authorization=req.headers.get('Authorization')||''; return createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}}); }
function adminClient(){ return createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}}); }
function creds(req: Request){ return {deviceId:req.headers.get('x-device-id')||'',secret:req.headers.get('x-device-secret')||''}; }
function safeName(value:string){ return String(value||'document').replace(/[\\/:*?"<>|\r\n]/g,'_').slice(0,180)||'document'; }
function normalizedMime(value:string){ return String(value||'').split(';',1)[0].trim().toLowerCase(); }
function revision(){ return `${Date.now()}-${crypto.randomUUID().replaceAll('-','')}`; }
async function removeQuiet(admin:ReturnType<typeof adminClient>, paths:string[]){ const clean=[...new Set(paths.filter(Boolean))]; if(clean.length)await admin.storage.from(BUCKET).remove(clean).catch(()=>null); }
async function sha256Hex(value:string){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function legacyFallback(key:string){if(/Print$/.test(key))return'print';if(/Export$/.test(key))return'export';return'edit';}
async function allowed(admin:ReturnType<typeof adminClient>,userId:string,deviceId:string,secret:string,key:string,defaultValue=false){
  if(!userId||!deviceId||!secret)return false;
  const hash=await sha256Hex(secret);
  const {data,error}=await admin.from('abu_bassam_devices').select('role,active,permissions,secret_hash').eq('user_id',userId).eq('device_id',deviceId).maybeSingle();
  if(error||!data||data.active===false||!data.secret_hash||data.secret_hash!==hash)return false;
  if(data.role==='owner')return true;
  const p=(data.permissions&&typeof data.permissions==='object')?data.permissions:{};
  if(typeof p[key]==='boolean')return p[key];
  const legacy=legacyFallback(key);if(typeof p[legacy]==='boolean')return p[legacy];
  return defaultValue;
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const url=new URL(req.url);
    const action=url.searchParams.get('action')||(req.method==='DELETE'?'delete':req.method==='GET'?'download':'upload');
    const {deviceId,secret}=creds(req);
    if(!deviceId||!secret)return json({error:'DEVICE_REQUIRED'},403);
    const user=userClient(req),admin=adminClient();
    const {data:authData,error:authError}=await user.auth.getUser();
    const userId=authData?.user?.id||'';
    if(authError||!userId)return json({error:'NOT_AUTHENTICATED'},401);

    if(action==='upload'&&req.method==='POST'){
      const form=await req.formData();
      const file=form.get('file');
      const originalFile=form.get('original_file');
      if(!(file instanceof File))return json({error:'FILE_REQUIRED'},400);
      if(file.size<1||file.size>MAX_FILE)return json({error:'FILE_SIZE_INVALID'},413);
      if(originalFile instanceof File&&(originalFile.size<1||originalFile.size>MAX_FILE))return json({error:'ORIGINAL_SIZE_INVALID'},413);

      const customerId=String(form.get('customer_id')||''),documentId=String(form.get('document_id')||crypto.randomUUID());
      const personScope=String(form.get('person_scope')||'customer'),personName=String(form.get('person_name')||''),documentType=String(form.get('document_type')||'other'),documentLabel=String(form.get('document_label')||''),side=String(form.get('side')||'single');
      const fileName=safeName(String(form.get('file_name')||file.name||'document')),mime=normalizedMime(String(file.type||form.get('mime')||'')),sortOrder=Number(form.get('sort_order')||0)||0;
      if(!SAFE_EDITED.has(mime))return json({error:'MIME_NOT_ALLOWED'},415);
      let editMeta:{}|Record<string,unknown>={}; try{editMeta=JSON.parse(String(form.get('edit_meta')||'{}'))}catch{}

      const {data:existingAccess}=await user.rpc('abu_bassam_customer_document_access_v2',{p_device_id:deviceId,p_device_secret:secret,p_document_id:documentId});
      const existing=Array.isArray(existingAccess)?existingAccess[0]:existingAccess;
      const needed=existing?'customerDocumentsEdit':'customerDocumentsAdd';
      if(!await allowed(admin,userId,deviceId,secret,needed,false))return json({error:needed==='customerDocumentsEdit'?'CUSTOMER_DOCUMENT_EDIT_NOT_ALLOWED':'CUSTOMER_DOCUMENT_ADD_NOT_ALLOWED'},403);
      const {data:planned,error:planError}=await user.rpc('abu_bassam_customer_document_upload_plan',{p_device_id:deviceId,p_device_secret:secret,p_customer_id:customerId,p_document_id:documentId});
      if(planError)return json({error:planError.message},403);
      const plan=Array.isArray(planned)?planned[0]:planned;
      if(!plan?.base_storage_path)return json({error:'UPLOAD_PLAN_FAILED'},500);

      const rev=revision();
      const editedPath=`${plan.base_storage_path}.edited.${rev}`;
      let originalPath:string|null=null,originalMime:string|null=null,originalSize=0;
      const uploaded:string[]=[];

      if(originalFile instanceof File){
        originalMime=normalizedMime(originalFile.type||'');
        if(!SAFE_ORIGINAL.has(originalMime))return json({error:'ORIGINAL_MIME_NOT_ALLOWED'},415);
        originalSize=originalFile.size; originalPath=`${plan.base_storage_path}.original.${rev}`;
        const {error}=await admin.storage.from(BUCKET).upload(originalPath,originalFile,{upsert:false,contentType:originalMime,cacheControl:'3600'});
        if(error)return json({error:error.message},500); uploaded.push(originalPath);
      }else if(existing?.original_storage_path){
        const {data:oldOriginal,error:oldError}=await admin.storage.from(BUCKET).download(String(existing.original_storage_path));
        if(oldError||!oldOriginal)return json({error:oldError?.message||'ORIGINAL_COPY_FAILED'},500);
        originalMime=normalizedMime(String(existing.original_mime||oldOriginal.type||'image/jpeg'));
        if(!SAFE_ORIGINAL.has(originalMime))return json({error:'ORIGINAL_MIME_NOT_ALLOWED'},415);
        originalSize=oldOriginal.size; originalPath=`${plan.base_storage_path}.original.${rev}`;
        const {error}=await admin.storage.from(BUCKET).upload(originalPath,oldOriginal,{upsert:false,contentType:originalMime,cacheControl:'3600'});
        if(error)return json({error:error.message},500); uploaded.push(originalPath);
      }

      const {error:uploadError}=await admin.storage.from(BUCKET).upload(editedPath,file,{upsert:false,contentType:mime,cacheControl:'3600'});
      if(uploadError){await removeQuiet(admin,uploaded);return json({error:uploadError.message},500)}
      uploaded.push(editedPath);

      const commitArgs={
        p_device_id:deviceId,p_device_secret:secret,p_customer_id:customerId,p_document_id:documentId,
        p_storage_path:editedPath,p_original_storage_path:originalPath,
        p_person_scope:personScope,p_person_name:personName,p_document_type:documentType,p_document_label:documentLabel,p_side:side,
        p_file_name:fileName,p_mime:mime,p_size_bytes:file.size,p_sort_order:sortOrder,
        p_original_mime:originalMime,p_original_size_bytes:originalSize,p_edit_meta:editMeta
      };
      const {data:committed,error:commitError}=await user.rpc('abu_bassam_customer_document_commit_v3',commitArgs);
      if(commitError){await removeQuiet(admin,uploaded);return json({error:commitError.message},403)}

      const oldPaths=[String(plan.existing_storage_path||''),String(plan.existing_original_storage_path||'')].filter(p=>p&&!uploaded.includes(p));
      await removeQuiet(admin,oldPaths);
      const row=Array.isArray(committed)?committed[0]:committed;
      return json({ok:true,document_id:row?.document_id||documentId,owner_device_id:row?.owner_device_id||plan.owner_device_id,file_name:fileName,mime,original_saved:!!originalPath});
    }

    if(action==='download'&&req.method==='GET'){
      const documentId=String(url.searchParams.get('document_id')||''),version=String(url.searchParams.get('version')||'edited');
      if(!await allowed(admin,userId,deviceId,secret,'customerDocumentsView',false))return json({error:'CUSTOMER_DOCUMENT_VIEW_NOT_ALLOWED'},403);
      if(version==='original'&&!await allowed(admin,userId,deviceId,secret,'customerOriginalDocumentView',false))return json({error:'CUSTOMER_ORIGINAL_NOT_ALLOWED'},403);
      const {data:access,error:accessError}=await user.rpc('abu_bassam_customer_document_access_v2',{p_device_id:deviceId,p_device_secret:secret,p_document_id:documentId});
      if(accessError)return json({error:accessError.message},403);
      const row=Array.isArray(access)?access[0]:access;
      if(!row?.storage_path)return json({error:'DOCUMENT_NOT_FOUND'},404);
      const useOriginal=version==='original'&&row.original_storage_path;
      const path=String(useOriginal?row.original_storage_path:row.storage_path||'');
      const mime=normalizedMime(String(useOriginal?(row.original_mime||''):row.mime||''));
      const allowedMime=useOriginal?SAFE_ORIGINAL:SAFE_EDITED;
      if(!allowedMime.has(mime))return json({error:'UNSAFE_STORED_MIME'},415);
      const {data:blob,error:downloadError}=await admin.storage.from(BUCKET).download(path);
      if(downloadError||!blob)return json({error:downloadError?.message||'DOWNLOAD_FAILED'},404);
      const headers=new Headers(cors);headers.set('Content-Type',mime);headers.set('X-Content-Type-Options','nosniff');headers.set('Content-Disposition',`inline; filename="${safeName(row.file_name||'document')}"`);headers.set('Cache-Control','private, no-store');
      return new Response(blob,{status:200,headers});
    }

    if(action==='delete-customer'&&req.method==='DELETE'){
      if(!await allowed(admin,userId,deviceId,secret,'customerDelete',false))return json({error:'CUSTOMER_DELETE_NOT_ALLOWED'},403);
      const body=await req.json().catch(()=>({}));
      const customerId=String(body?.customer_id||url.searchParams.get('customer_id')||'');
      if(!customerId)return json({error:'CUSTOMER_REQUIRED'},400);
      const {data:paths,error:deleteError}=await user.rpc('abu_bassam_customer_delete',{p_device_id:deviceId,p_device_secret:secret,p_customer_id:customerId});
      if(deleteError)return json({error:deleteError.message},403);
      await removeQuiet(admin,Array.isArray(paths)?paths.map(String):[]);
      return json({ok:true,removed_files:Array.isArray(paths)?paths.length:0});
    }

    if(action==='delete'&&req.method==='DELETE'){
      if(!await allowed(admin,userId,deviceId,secret,'customerDocumentsDelete',false))return json({error:'CUSTOMER_DOCUMENT_DELETE_NOT_ALLOWED'},403);
      const body=await req.json().catch(()=>({})),documentId=String(body?.document_id||url.searchParams.get('document_id')||'');
      const {data:access,error:accessError}=await user.rpc('abu_bassam_customer_document_access_v2',{p_device_id:deviceId,p_device_secret:secret,p_document_id:documentId});
      if(accessError)return json({error:accessError.message},403);
      const accessRow=Array.isArray(access)?access[0]:access;
      if(!accessRow?.storage_path)return json({error:'DOCUMENT_NOT_FOUND'},404);
      const {data:before}=await admin.from('abu_bassam_customer_documents').select('storage_path,original_storage_path').eq('user_id',userId).eq('document_id',documentId).maybeSingle();
      const {error:deleteError}=await user.rpc('abu_bassam_customer_document_delete',{p_device_id:deviceId,p_device_secret:secret,p_document_id:documentId});
      if(deleteError)return json({error:deleteError.message},403);
      await removeQuiet(admin,[String(before?.storage_path||accessRow.storage_path||''),String(before?.original_storage_path||'')]);
      return json({ok:true});
    }
    return json({error:'UNSUPPORTED_ACTION'},400);
  }catch(error){return json({error:String((error as Error)?.message||error||'SERVER_ERROR')},500)}
});
