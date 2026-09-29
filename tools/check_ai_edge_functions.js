const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>{const f=path.join(root,p);if(!fs.existsSync(f))throw new Error(`missing ${p}`);return fs.readFileSync(f,'utf8')};
const failures=[];
const need=(src,marker,label)=>{if(!src.includes(marker))failures.push(`${label}: missing ${marker}`)};
const forbid=(src,marker,label)=>{if(src.includes(marker))failures.push(`${label}: forbidden ${marker}`)};
const photo=read('supabase/functions/abu-bassam-ai-photo/index.ts');
const status=read('supabase/functions/abu-bassam-ai-status/index.ts');
const web=read('web/index.html');
for(const marker of [
  "Deno.env.get('AI_APP_TOKEN')","Deno.env.get('GEMINI_API_KEY')","Deno.env.get('OPENAI_API_KEY')",
  'async function tokenMatches','crypto.subtle.digest','MAX_BODY_BYTES','MAX_IMAGE_DATA_URL','MAX_PROMPT_CHARS','ALLOWED_IMAGE',
  "provider === 'openai'","provider === 'gemini'",'Cache-Control','X-Content-Type-Options',"form.append('model', 'gpt-image-2')"
])need(photo,marker,'AI photo edge');
for(const marker of ["Deno.env.get('AI_APP_TOKEN')",'async function sameToken','crypto.subtle.digest',"req.headers.get('x-pro-token')",'Cache-Control','X-Content-Type-Options'])need(status,marker,'AI status edge');
for(const marker of ['abu-bassam-ai-photo',"localStorage.removeItem('abuBassamAiProToken')",'x-pro-token'])need(web,marker,'AI client');
for(const marker of ['sk-proj-','sk-live-','AIzaSy','AI_APP_TOKEN=','OPENAI_API_KEY=','GEMINI_API_KEY=']){forbid(photo,marker,'AI photo embedded secret');forbid(status,marker,'AI status embedded secret')}
forbid(web,"localStorage.setItem('abuBassamAiProToken'",'AI client must not persist PRO token');
if(failures.length){process.stderr.write(failures.join('\n')+'\n');process.exit(1)}
process.stdout.write('AI PRO checks passed: versioned edge sources, secret-by-environment only, bounded image/prompt requests, digest-based token comparison, protected status endpoint, no persisted PRO token, and no embedded provider keys.\n');
