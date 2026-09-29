-- Make device recovery failure-safe: keep the current recovery code valid until the client
-- confirms its new device secret is stored locally, then the client rotates the code using
-- abu_bassam_generate_recovery_code with the newly recovered owner credentials.
create or replace function public.abu_bassam_recover_device(
  p_recovery_code text,p_new_secret text,p_temporary_device_id text default '',p_model text default '',p_platform text default 'Android',p_app_version text default ''
) returns jsonb
language plpgsql security definer set search_path='public','extensions'
as $$
declare
  v_uid uuid:=auth.uid(); v_rec public.abu_bassam_recovery_codes%rowtype; v_target public.abu_bassam_devices%rowtype;
  v_code text; v_hash text; v_attempts integer; v_locked timestamptz;
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
  -- Do not rotate recovery_hash here. The caller still needs to persist p_new_secret safely.
  -- Keeping the current code valid makes an interrupted recovery retryable instead of locking
  -- the owner out. After the local secret is verified, the client calls generate_recovery_code.
  update public.abu_bassam_recovery_codes set failed_attempts=0,locked_until=null,last_used_at=now(),updated_at=now() where user_id=v_uid;
  return jsonb_build_object('ok',true,'device_id',v_target.device_id,'device_name',v_target.device_name,'first_seen',v_target.first_seen,'recovery_rotation_required',true);
end $$;

revoke all on function public.abu_bassam_recover_device(text,text,text,text,text,text) from public,anon;
grant execute on function public.abu_bassam_recover_device(text,text,text,text,text,text) to authenticated;
