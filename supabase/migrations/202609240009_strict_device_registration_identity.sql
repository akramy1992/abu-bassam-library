-- Device identity is exact: device_id + secret. Never inherit role/permissions by name/model,
-- never auto-promote a secondary, and never let a disabled device reactivate itself.
create unique index if not exists abu_bassam_devices_one_owner_per_user
  on public.abu_bassam_devices(user_id)
  where role='owner';

create or replace function public.abu_bassam_register_device(
  p_device_id text,
  p_secret text,
  p_device_name text,
  p_model text,
  p_platform text,
  p_app_version text
) returns public.abu_bassam_devices
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_hash text;
  v_row public.abu_bassam_devices%rowtype;
  v_count integer;
  v_limit integer:=5;
  v_role text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
  v_hash:=encode(digest(p_secret,'sha256'),'hex');

  select * into v_row
    from public.abu_bassam_devices
   where user_id=v_uid and device_id=p_device_id
   limit 1;

  if found then
    if v_row.active=false then raise exception 'DEVICE_DISABLED'; end if;
    if v_row.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
    update public.abu_bassam_devices
       set device_name=coalesce(nullif(trim(p_device_name),''),device_name),
           model=coalesce(p_model,''),
           platform=coalesce(p_platform,'Android'),
           app_version=coalesce(p_app_version,''),
           last_seen=now()
     where user_id=v_uid and device_id=p_device_id
     returning * into v_row;
    return v_row;
  end if;

  select coalesce(s.device_limit,5) into v_limit
    from public.abu_bassam_account_settings s where s.user_id=v_uid;
  v_limit:=coalesce(v_limit,5);
  select count(*) into v_count from public.abu_bassam_devices where user_id=v_uid;
  if v_count>=v_limit then raise exception 'DEVICE_LIMIT_REACHED'; end if;
  v_role:=case when v_count=0 then 'owner' else 'secondary' end;

  insert into public.abu_bassam_devices(
    user_id,device_id,secret_hash,device_name,model,platform,role,active,permissions,first_seen,last_seen,app_version
  ) values(
    v_uid,p_device_id,v_hash,coalesce(nullif(trim(p_device_name),''),'جهاز المكتبة'),
    coalesce(p_model,''),coalesce(p_platform,'Android'),v_role,true,'{}'::jsonb,now(),now(),coalesce(p_app_version,'')
  ) returning * into v_row;
  return v_row;
end $$;

create or replace function public.abu_bassam_touch_device(
  p_device_id text,
  p_secret text,
  p_device_name text,
  p_model text,
  p_platform text,
  p_app_version text
) returns public.abu_bassam_devices
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_hash text;
  v_row public.abu_bassam_devices%rowtype;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  v_hash:=encode(digest(p_secret,'sha256'),'hex');
  select * into v_row from public.abu_bassam_devices
   where user_id=v_uid and device_id=p_device_id limit 1;
  if not found then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  if v_row.active=false then raise exception 'DEVICE_DISABLED'; end if;
  if v_row.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  update public.abu_bassam_devices
     set device_name=coalesce(nullif(trim(p_device_name),''),device_name),
         model=coalesce(p_model,''),platform=coalesce(p_platform,'Android'),
         app_version=coalesce(p_app_version,''),last_seen=now()
   where user_id=v_uid and device_id=p_device_id
   returning * into v_row;
  return v_row;
end $$;

revoke all on function public.abu_bassam_register_device(text,text,text,text,text,text) from PUBLIC,anon;
revoke all on function public.abu_bassam_touch_device(text,text,text,text,text,text) from PUBLIC,anon;
grant execute on function public.abu_bassam_register_device(text,text,text,text,text,text) to authenticated;
grant execute on function public.abu_bassam_touch_device(text,text,text,text,text,text) to authenticated;
