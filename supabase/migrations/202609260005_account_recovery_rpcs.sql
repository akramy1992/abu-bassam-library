-- Authenticated recovery RPCs. Recovery secrets are never stored in plaintext.
create or replace function public.abu_bassam_recovery_status()
returns jsonb
language plpgsql security definer set search_path='public','extensions'
as $$
declare v_uid uuid:=auth.uid(); v_row public.abu_bassam_recovery_codes%rowtype;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','NOT_AUTHENTICATED'); end if;
  select * into v_row from public.abu_bassam_recovery_codes where user_id=v_uid;
  return jsonb_build_object('ok',true,'configured',found,'recovery_device_id',case when found then v_row.recovery_device_id else '' end,'created_at',case when found then v_row.created_at else null end,'locked_until',case when found then v_row.locked_until else null end,'last_used_at',case when found then v_row.last_used_at else null end);
end $$;

create or replace function public.abu_bassam_generate_recovery_code(p_actor_device_id text,p_actor_secret text)
returns jsonb
language plpgsql security definer set search_path='public','extensions'
as $$
declare v_uid uuid:=auth.uid(); v_device public.abu_bassam_devices%rowtype; v_secret_hash text; v_raw text; v_code text;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','NOT_AUTHENTICATED'); end if;
  if coalesce(trim(p_actor_device_id),'')='' or coalesce(p_actor_secret,'')='' then return jsonb_build_object('ok',false,'error','OWNER_DEVICE_REQUIRED'); end if;
  v_secret_hash:=encode(digest(p_actor_secret,'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_device.role<>'owner' or v_device.active=false or coalesce(v_device.secret_hash,'')='' or v_device.secret_hash<>v_secret_hash then return jsonb_build_object('ok',false,'error','OWNER_DEVICE_REQUIRED'); end if;
  v_raw:=upper(encode(gen_random_bytes(16),'hex'));
  v_code:=substr(v_raw,1,4)||'-'||substr(v_raw,5,4)||'-'||substr(v_raw,9,4)||'-'||substr(v_raw,13,4)||'-'||substr(v_raw,17,4)||'-'||substr(v_raw,21,4)||'-'||substr(v_raw,25,4)||'-'||substr(v_raw,29,4);
  insert into public.abu_bassam_recovery_codes(user_id,recovery_device_id,recovery_hash,failed_attempts,locked_until,created_at,updated_at,last_used_at)
  values(v_uid,v_device.device_id,encode(digest(v_raw,'sha256'),'hex'),0,null,now(),now(),null)
  on conflict(user_id) do update set recovery_device_id=excluded.recovery_device_id,recovery_hash=excluded.recovery_hash,failed_attempts=0,locked_until=null,created_at=now(),updated_at=now(),last_used_at=null;
  return jsonb_build_object('ok',true,'recovery_code',v_code,'device_id',v_device.device_id,'device_name',v_device.device_name,'created_at',now());
end $$;

create or replace function public.abu_bassam_revoke_recovery_code(p_actor_device_id text,p_actor_secret text)
returns jsonb
language plpgsql security definer set search_path='public','extensions'
as $$
declare v_uid uuid:=auth.uid(); v_device public.abu_bassam_devices%rowtype; v_secret_hash text;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','NOT_AUTHENTICATED'); end if;
  v_secret_hash:=encode(digest(coalesce(p_actor_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_device.role<>'owner' or v_device.active=false or coalesce(v_device.secret_hash,'')='' or v_device.secret_hash<>v_secret_hash then return jsonb_build_object('ok',false,'error','OWNER_DEVICE_REQUIRED'); end if;
  delete from public.abu_bassam_recovery_codes where user_id=v_uid;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.abu_bassam_recover_device(
  p_recovery_code text,p_new_secret text,p_temporary_device_id text default '',p_model text default '',p_platform text default 'Android',p_app_version text default ''
) returns jsonb
language plpgsql security definer set search_path='public','extensions'
as $$
declare
  v_uid uuid:=auth.uid(); v_rec public.abu_bassam_recovery_codes%rowtype; v_target public.abu_bassam_devices%rowtype;
  v_code text; v_hash text; v_attempts integer; v_locked timestamptz; v_new_raw text; v_new_code text;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','NOT_AUTHENTICATED'); end if;
  v_code:=upper(regexp_replace(coalesce(p_recovery_code,''),'[^A-F0-9]','','g'));
  if char_length(v_code)<>32 or p_new_secret !~ '^[A-Fa-f0-9]{64}$' then return jsonb_build_object('ok',false,'error','RECOVERY_INPUT_INVALID'); end if;
  select * into v_rec from public.abu_bassam_recovery_codes where user_id=v_uid for update;
  if not found then return jsonb_build_object('ok',false,'error','RECOVERY_NOT_CONFIGURED'); end if;
  if v_rec.locked_until is not null and v_rec.locked_until>now() then return jsonb_build_object('ok',false,'error','RECOVERY_TEMPORARILY_LOCKED','locked_until',v_rec.locked_until); end if;
  v_hash:=encode(digest(v_code,'sha256'),'hex');
  if v_hash<>v_rec.recovery_hash then
    v_attempts:=coalesce(v_rec.failed_attempts,0)+1;
    if v_attempts>=8 then v_locked:=now()+interval '30 minutes'; v_attempts:=0; else v_locked:=null; end if;
    update public.abu_bassam_recovery_codes set failed_attempts=v_attempts,locked_until=v_locked,updated_at=now() where user_id=v_uid;
    return jsonb_build_object('ok',false,'error',case when v_locked is null then 'RECOVERY_CODE_INVALID' else 'RECOVERY_TEMPORARILY_LOCKED' end,'locked_until',v_locked);
  end if;
  select * into v_target from public.abu_bassam_devices where user_id=v_uid and device_id=v_rec.recovery_device_id limit 1;
  if not found then return jsonb_build_object('ok',false,'error','RECOVERY_DEVICE_NOT_FOUND'); end if;
  update public.abu_bassam_devices set role='secondary' where user_id=v_uid and role='owner' and device_id<>v_target.device_id;
  if coalesce(trim(p_temporary_device_id),'')<>'' and p_temporary_device_id<>v_target.device_id then delete from public.abu_bassam_devices where user_id=v_uid and device_id=p_temporary_device_id and role<>'owner'; end if;
  update public.abu_bassam_devices set secret_hash=encode(digest(p_new_secret,'sha256'),'hex'),role='owner',active=true,model=left(coalesce(p_model,''),180),platform=left(coalesce(p_platform,'Android'),60),app_version=left(coalesce(p_app_version,''),40),last_seen=now() where user_id=v_uid and device_id=v_target.device_id returning * into v_target;
  v_new_raw:=upper(encode(gen_random_bytes(16),'hex'));
  v_new_code:=substr(v_new_raw,1,4)||'-'||substr(v_new_raw,5,4)||'-'||substr(v_new_raw,9,4)||'-'||substr(v_new_raw,13,4)||'-'||substr(v_new_raw,17,4)||'-'||substr(v_new_raw,21,4)||'-'||substr(v_new_raw,25,4)||'-'||substr(v_new_raw,29,4);
  update public.abu_bassam_recovery_codes set recovery_device_id=v_target.device_id,recovery_hash=encode(digest(v_new_raw,'sha256'),'hex'),failed_attempts=0,locked_until=null,last_used_at=now(),created_at=now(),updated_at=now() where user_id=v_uid;
  return jsonb_build_object('ok',true,'device_id',v_target.device_id,'device_name',v_target.device_name,'first_seen',v_target.first_seen,'next_recovery_code',v_new_code);
end $$;

revoke all on function public.abu_bassam_recovery_status() from public,anon;
revoke all on function public.abu_bassam_generate_recovery_code(text,text) from public,anon;
revoke all on function public.abu_bassam_revoke_recovery_code(text,text) from public,anon;
revoke all on function public.abu_bassam_recover_device(text,text,text,text,text,text) from public,anon;
grant execute on function public.abu_bassam_recovery_status() to authenticated;
grant execute on function public.abu_bassam_generate_recovery_code(text,text) to authenticated;
grant execute on function public.abu_bassam_revoke_recovery_code(text,text) to authenticated;
grant execute on function public.abu_bassam_recover_device(text,text,text,text,text,text) to authenticated;
