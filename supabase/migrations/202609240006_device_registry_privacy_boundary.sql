-- Device registry privacy boundary.
-- Secondary devices share the same authenticated user, so auth.uid() alone is
-- not sufficient authorization for direct access to the registry.

revoke all on table public.abu_bassam_devices from PUBLIC, anon, authenticated;

drop policy if exists abu_bassam_devices_select_own on public.abu_bassam_devices;
drop policy if exists abu_bassam_devices_insert_own on public.abu_bassam_devices;
drop policy if exists abu_bassam_devices_update_own on public.abu_bassam_devices;
drop policy if exists abu_bassam_devices_delete_own on public.abu_bassam_devices;

create or replace function public.abu_bassam_owner_device_count(
  p_actor_device_id text,
  p_actor_secret text
) returns integer
language plpgsql
security definer
stable
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_actor public.abu_bassam_devices%rowtype;
  v_hash text;
  v_count integer;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_actor_device_id),'')='' or coalesce(p_actor_secret,'')='' then
    raise exception 'OWNER_REQUIRED';
  end if;
  v_hash:=encode(digest(p_actor_secret,'sha256'),'hex');
  select * into v_actor
    from public.abu_bassam_devices
   where user_id=v_uid and device_id=p_actor_device_id
   limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false
     or coalesce(v_actor.secret_hash,'')='' or v_actor.secret_hash<>v_hash then
    raise exception 'OWNER_REQUIRED';
  end if;
  select count(*) into v_count from public.abu_bassam_devices where user_id=v_uid;
  return v_count;
end $$;

create or replace function public.abu_bassam_owner_devices(
  p_actor_device_id text,
  p_actor_secret text
) returns table(
  device_id text,
  device_name text,
  model text,
  platform text,
  role text,
  active boolean,
  permissions jsonb,
  first_seen timestamptz,
  last_seen timestamptz,
  app_version text
)
language plpgsql
security definer
stable
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_actor public.abu_bassam_devices%rowtype;
  v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_actor_device_id),'')='' or coalesce(p_actor_secret,'')='' then
    raise exception 'OWNER_REQUIRED';
  end if;
  v_hash:=encode(digest(p_actor_secret,'sha256'),'hex');
  select * into v_actor
    from public.abu_bassam_devices
   where user_id=v_uid and device_id=p_actor_device_id
   limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false
     or coalesce(v_actor.secret_hash,'')='' or v_actor.secret_hash<>v_hash then
    raise exception 'OWNER_REQUIRED';
  end if;
  return query
  select d.device_id,d.device_name,d.model,d.platform,d.role,d.active,
         d.permissions,d.first_seen,d.last_seen,d.app_version
    from public.abu_bassam_devices d
   where d.user_id=v_uid
   order by (case when d.role='owner' then 0 else 1 end),d.last_seen desc nulls last;
end $$;

revoke all on function public.abu_bassam_owner_device_count(text,text) from PUBLIC,anon;
revoke all on function public.abu_bassam_owner_devices(text,text) from PUBLIC,anon;
grant execute on function public.abu_bassam_owner_device_count(text,text) to authenticated;
grant execute on function public.abu_bassam_owner_devices(text,text) to authenticated;
