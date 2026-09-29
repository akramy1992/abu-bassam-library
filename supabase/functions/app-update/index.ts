import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TABLE='abu_bassam_app_releases';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'GET,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const auth=req.headers.get('Authorization')||'';
    const userClient=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user)return json({error:'NOT_AUTHENTICATED'},401);

    const url=new URL(req.url);
    const currentCode=Number(url.searchParams.get('current_code')||0);
    const currentVersion=String(url.searchParams.get('current_version')||'').slice(0,32);
    if(!Number.isInteger(currentCode)||currentCode<1)return json({error:'INVALID_CURRENT_VERSION'},400);

    const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}});
    const {data:release,error}=await admin.from(TABLE)
      .select('version,version_code,channel,mandatory,min_supported_code,changelog,storage_bucket,storage_path,sha256,signing_cert_sha256,published_at')
      .eq('channel','stable').eq('active',true).maybeSingle();
    if(error)return json({error:'UPDATE_LOOKUP_FAILED'},500);
    if(!release)return json({ok:true,available:false,current_version:currentVersion,current_code:currentCode,reason:'NO_ACTIVE_RELEASE'});

    const available=Number(release.version_code)>currentCode;
    const mandatory=available&&(release.mandatory===true||currentCode<Number(release.min_supported_code||1));
    let download_url:string|null=null;
    let download_ready=false;
    if(available&&release.storage_path&&release.sha256&&release.signing_cert_sha256){
      const {data:signed,error:signedError}=await admin.storage.from(String(release.storage_bucket||'abu-bassam-private')).createSignedUrl(String(release.storage_path),600);
      if(!signedError&&signed?.signedUrl){download_url=signed.signedUrl;download_ready=true;}
    }

    return json({
      ok:true,available,mandatory,download_ready,
      current_version:currentVersion,current_code:currentCode,
      latest_version:String(release.version),latest_code:Number(release.version_code),
      min_supported_code:Number(release.min_supported_code||1),
      changelog:String(release.changelog||'').slice(0,12000),
      sha256:release.sha256||null,signing_cert_sha256:release.signing_cert_sha256||null,
      published_at:release.published_at,download_url
    });
  }catch(_){return json({error:'UPDATE_SERVER_ERROR'},500)}
});
