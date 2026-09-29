const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'x-pro-token',
  'Access-Control-Allow-Methods':'GET,OPTIONS'
};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
async function digest(value:string){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
async function sameToken(a:string,b:string){if(!a||!b||a.length>512||b.length>512)return false;const [x,y]=await Promise.all([digest(a),digest(b)]);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i+=1)diff|=x[i%x.length]^y[i%y.length];return diff===0}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='GET')return json({error:'Method not allowed'},405);
  const expected=Deno.env.get('AI_APP_TOKEN')||'';
  if(!expected)return json({error:'AI service is not configured'},503);
  if(!await sameToken(req.headers.get('x-pro-token')||'',expected))return json({error:'Unauthorized'},401);
  return json({openaiKeyConfigured:!!Deno.env.get('OPENAI_API_KEY'),geminiKeyConfigured:!!Deno.env.get('GEMINI_API_KEY'),proTokenConfigured:true});
});
