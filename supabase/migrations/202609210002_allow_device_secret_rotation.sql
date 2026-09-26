create or replace function public.abu_bassam_register_device(p_device_id text, p_secret text, p_device_name text, p_model text, p_platform text, p_app_version text)
 returns public.abu_bassam_devices
 language plpgsql
 security definer
 set search_path to 'public','extensions'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_hash text;
  v_row public.abu_bassam_devices%rowtype;
  v_match public.abu_bassam_devices%rowtype;
  v_role text;
  v_permissions jsonb:='{}'::jsonb;
  v_count integer;
  v_owner_recent boolean;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  v_hash:=encode(digest(p_secret,'sha256'),'hex');

  select * into v_row from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if found then
    if coalesce(v_row.secret_hash,'')<>'' and v_row.secret_hash<>v_hash then
      if coalesce(trim(v_row.model),'')<>'' and coalesce(trim(p_model),'')<>'' and lower(trim(v_row.model))<>lower(trim(p_model)) then
        raise exception 'DEVICE_NOT_AUTHORIZED';
      end if;
    end if;
    update public.abu_bassam_devices
       set secret_hash=v_hash,
           device_name=coalesce(nullif(trim(p_device_name),''),device_name),
           model=coalesce(p_model,''),
           platform=coalesce(p_platform,'Android'),
           app_version=coalesce(p_app_version,''),
           last_seen=now(),active=true
     where user_id=v_uid and device_id=p_device_id;
    select exists(select 1 from public.abu_bassam_devices where user_id=v_uid and role='owner' and active=true and device_id<>p_device_id and last_seen>=now()-interval '30 days') into v_owner_recent;
    if v_row.role<>'owner' and not v_owner_recent then
      update public.abu_bassam_devices set role='secondary' where user_id=v_uid and role='owner' and device_id<>p_device_id;
      update public.abu_bassam_devices set role='owner',permissions='{}'::jsonb where user_id=v_uid and device_id=p_device_id;
    end if;
    select * into v_row from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id;
    return v_row;
  end if;

  select * into v_match from public.abu_bassam_devices
   where user_id=v_uid
     and lower(trim(coalesce(device_name,'')))=lower(trim(coalesce(p_device_name,'')))
     and lower(trim(coalesce(model,'')))=lower(trim(coalesce(p_model,'')))
     and lower(trim(coalesce(platform,'')))=lower(trim(coalesce(p_platform,'')))
   order by (case when role='owner' then 0 else 1 end),last_seen desc nulls last
   limit 1;

  if found then
    v_role:=v_match.role;
    v_permissions:=coalesce(v_match.permissions,'{}'::jsonb);
    delete from public.abu_bassam_devices
     where user_id=v_uid
       and lower(trim(coalesce(device_name,'')))=lower(trim(coalesce(p_device_name,'')))
       and lower(trim(coalesce(model,'')))=lower(trim(coalesce(p_model,'')))
       and lower(trim(coalesce(platform,'')))=lower(trim(coalesce(p_platform,'')));
  else
    select count(*) into v_count from public.abu_bassam_devices where user_id=v_uid;
    if v_count>=5 then raise exception 'DEVICE_LIMIT_REACHED'; end if;
    if exists(select 1 from public.abu_bassam_devices where user_id=v_uid and role='owner' and active=true and last_seen>=now()-interval '30 days') then
      v_role:='secondary';
    else
      update public.abu_bassam_devices set role='secondary' where user_id=v_uid and role='owner';
      v_role:='owner';
    end if;
  end if;

  insert into public.abu_bassam_devices(user_id,device_id,secret_hash,device_name,model,platform,role,active,permissions,first_seen,last_seen,app_version)
  values(v_uid,p_device_id,v_hash,coalesce(nullif(trim(p_device_name),''),'جهاز المكتبة'),coalesce(p_model,''),coalesce(p_platform,'Android'),coalesce(v_role,'secondary'),true,v_permissions,now(),now(),coalesce(p_app_version,''))
  returning * into v_row;
  return v_row;
end
$function$;
