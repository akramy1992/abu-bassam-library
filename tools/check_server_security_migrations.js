const fs=require('fs');
function read(p){if(!fs.existsSync(p))throw new Error(`missing ${p}`);return fs.readFileSync(p,'utf8')}
function need(src,token,label){if(!src.includes(token))throw new Error(`server security migration check failed: ${label}`)}
const limit=read('supabase/migrations/202609270004_strict_device_limit_owner_secret.sql');
const all=read('supabase/migrations/202609270005_strict_device_secret_checks_all_paths.sql');
need(limit,"coalesce(trim(p_actor_device_id),'') = ''",'device-limit actor id must be required');
need(limit,"coalesce(p_actor_secret,'') = ''",'device-limit owner secret must be required');
need(limit,"coalesce(v_actor.secret_hash,'') = ''",'device-limit stored owner secret must be non-empty');
need(limit,'v_actor.secret_hash <> v_hash','device-limit owner secret must match');
need(limit,'p_device_limit > 50','device-limit server maximum must stay 50');
need(limit,'DEVICE_LIMIT_BELOW_CURRENT_COUNT','device-limit cannot go below registered count');
need(limit,'from public, anon','device-limit RPC must be revoked from public/anon');

const expected=[
  ['abu_bassam_register_device','v_row','p_secret'],
  ['abu_bassam_touch_device','v_row','p_secret'],
  ['abu_bassam_remove_device','v_actor','p_actor_secret'],
  ['abu_bassam_owner_activity_devices','v_actor','p_actor_secret'],
  ['abu_bassam_customer_document_set_edit_meta','v_device','p_device_secret'],
  ['abu_bassam_customer_prepare_document','v_device','p_device_secret'],
];
for(const [name,row,secret] of expected){
  const start=all.indexOf(`function public.${name}(`);
  if(start<0)throw new Error(`server security migration check failed: missing ${name}`);
  const next=all.indexOf('create or replace function public.',start+20);
  const block=all.slice(start,next<0?all.length:next);
  need(block,`coalesce(${row}.secret_hash,'')=''`,`${name} must reject an empty stored secret hash`);
  need(block,`${row}.secret_hash<>v_hash`,`${name} must require a matching secret hash`);
  if(name!=='abu_bassam_register_device')need(block,`coalesce(${secret},'')=''`,`${name} must reject an empty presented secret`);
  else need(block,"coalesce(p_secret,'')=''",`${name} must reject an empty presented secret`);
}
need(all,'revoke all on function public.abu_bassam_customer_document_set_edit_meta','legacy edit-meta RPC privilege boundary');
need(all,'revoke all on function public.abu_bassam_customer_prepare_document','legacy prepare-document RPC privilege boundary');
need(all,'from public,anon,authenticated','service-only legacy document RPCs must stay unavailable to clients');
need(all,'to service_role','service-only legacy document RPCs must remain callable by the server gateway');
console.log('server security migration checks passed: device-limit and every existing-device authentication path reject empty stored secrets, require a matching presented secret, preserve the 1..50 limit, and keep legacy document helpers service-role-only.');
