const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const required={
  'supabase/functions/abu-bassam-ai-photo/index.ts':['AI_APP_TOKEN','OPENAI_API_KEY','GEMINI_API_KEY','IDENTITY_GUARD'],
  'supabase/functions/abu-bassam-ai-status/index.ts':['AI_APP_TOKEN','openaiKeyConfigured','geminiKeyConfigured'],
  'supabase/functions/backup-center/index.ts':['abu_bassam_backups','backupCreate','backupRestore','backupDelete'],
  'supabase/functions/app-update/index.ts':['abu_bassam_app_releases','current_code','signing_cert_sha256'],
  'supabase/functions/bootstrap-owner/index.ts':['bootstrap disabled'],
  'supabase/functions/branch-vault/index.ts':['Deno.serve'],
  'supabase/functions/customer-documents/index.ts':['Deno.serve']
};
const errors=[];
for(const [file,markers] of Object.entries(required)){
  const full=path.join(root,file);
  if(!fs.existsSync(full)){errors.push(`missing backend source: ${file}`);continue}
  const src=read(file);
  for(const marker of markers)if(!src.includes(marker))errors.push(`${file}: missing required marker ${marker}`);
}
const config='supabase/config.toml';
if(!fs.existsSync(path.join(root,config)))errors.push('missing supabase/config.toml');
else{
  const src=read(config);
  for(const name of ['abu-bassam-ai-photo','abu-bassam-ai-status','bootstrap-owner','branch-vault','customer-documents','backup-center','app-update'])if(!src.includes(`[functions.${name}]`))errors.push(`config.toml: missing ${name}`);
  for(const name of ['abu-bassam-ai-photo','abu-bassam-ai-status']){
    const block=src.split(`[functions.${name}]`)[1]?.split('[functions.')[0]||'';
    if(!/verify_jwt\s*=\s*false/.test(block))errors.push(`config.toml: ${name} must preserve custom-token auth with verify_jwt=false`);
  }
}
const forbiddenSecretPatterns=[/OPENAI_API_KEY\s*=\s*['"][^'"]+['"]/,/GEMINI_API_KEY\s*=\s*['"][^'"]+['"]/,/AI_APP_TOKEN\s*=\s*['"][^'"]+['"]/,/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/];
for(const file of Object.keys(required)){
  if(!fs.existsSync(path.join(root,file)))continue;
  const src=read(file);
  for(const re of forbiddenSecretPatterns)if(re.test(src))errors.push(`${file}: a secret value appears hard-coded`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Backend source coverage verified: Abu Bassam Edge Functions are tracked without embedded secrets.');
