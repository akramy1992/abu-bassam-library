create or replace function public.abu_bassam_manage_device(
  p_actor_device_id text,
  p_actor_secret text,
  p_target_device_id text,
  p_device_name text default null,
  p_active boolean default null,
  p_permissions jsonb default null
) returns public.abu_bassam_devices
language plpgsql
security definer
set search_path to 'public','extensions'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_actor public.abu_bassam_devices%rowtype;
  v_target public.abu_bassam_devices%rowtype;
  v_hash text;
  v_key text;
  v_value jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_actor_device_id),'')='' or coalesce(p_actor_secret,'')='' then raise exception 'OWNER_REQUIRED'; end if;
  v_hash:=encode(digest(p_actor_secret,'sha256'),'hex');
  select * into v_actor from public.abu_bassam_devices where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false or coalesce(v_actor.secret_hash,'')='' or v_actor.secret_hash<>v_hash then raise exception 'OWNER_REQUIRED'; end if;
  select * into v_target from public.abu_bassam_devices where user_id=v_uid and device_id=p_target_device_id limit 1;
  if not found then raise exception 'DEVICE_NOT_FOUND'; end if;
  if p_target_device_id=p_actor_device_id and p_active=false then raise exception 'OWNER_CANNOT_BE_DISABLED'; end if;
  if p_permissions is not null then
    if v_target.role='owner' then raise exception 'OWNER_PERMISSIONS_IMMUTABLE'; end if;
    if jsonb_typeof(p_permissions)<>'object' then raise exception 'PERMISSIONS_INVALID'; end if;
    if jsonb_object_length(p_permissions)>260 then raise exception 'PERMISSIONS_TOO_LARGE'; end if;
    for v_key,v_value in select key,value from jsonb_each(p_permissions) loop
      if not public._abu_bassam_permission_key_allowed(v_key) then raise exception 'PERMISSION_KEY_NOT_ALLOWED:%',v_key; end if;
      if jsonb_typeof(v_value)<>'boolean' then raise exception 'PERMISSION_VALUE_INVALID:%',v_key; end if;
      if public._abu_bassam_permission_admin_only(v_key) and (v_value#>>'{}')::boolean then raise exception 'ADMIN_ONLY_PERMISSION:%',v_key; end if;
    end loop;
  end if;
  update public.abu_bassam_devices
     set device_name=coalesce(nullif(trim(p_device_name),''),device_name),
         active=coalesce(p_active,active),
         permissions=coalesce(p_permissions,permissions)
   where user_id=v_uid and device_id=p_target_device_id
   returning * into v_target;
  return v_target;
end $function$;

revoke all on function public.abu_bassam_manage_device(text,text,text,text,boolean,jsonb) from public,anon;
grant execute on function public.abu_bassam_manage_device(text,text,text,text,boolean,jsonb) to authenticated;
