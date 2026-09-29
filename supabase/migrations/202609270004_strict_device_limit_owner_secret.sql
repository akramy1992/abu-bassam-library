-- Fail closed when the owner changes the account device limit.
-- A legacy/invalid owner row with an empty device secret must never be accepted.
create or replace function public.abu_bassam_set_device_limit(
  p_actor_device_id text,
  p_actor_secret text,
  p_device_limit integer
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_actor public.abu_bassam_devices%rowtype;
  v_hash text;
  v_count integer;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_device_limit is null or p_device_limit < 1 or p_device_limit > 50 then
    raise exception 'DEVICE_LIMIT_INVALID';
  end if;
  if coalesce(trim(p_actor_device_id),'') = '' or coalesce(p_actor_secret,'') = '' then
    raise exception 'OWNER_REQUIRED';
  end if;

  v_hash := encode(digest(p_actor_secret,'sha256'),'hex');
  select * into v_actor
    from public.abu_bassam_devices
   where user_id = v_uid and device_id = p_actor_device_id
   limit 1;

  if not found
     or v_actor.role <> 'owner'
     or v_actor.active = false
     or coalesce(v_actor.secret_hash,'') = ''
     or v_actor.secret_hash <> v_hash then
    raise exception 'OWNER_REQUIRED';
  end if;

  select count(*) into v_count
    from public.abu_bassam_devices
   where user_id = v_uid;
  if p_device_limit < v_count then
    raise exception 'DEVICE_LIMIT_BELOW_CURRENT_COUNT';
  end if;

  insert into public.abu_bassam_account_settings(user_id,device_limit,updated_at)
  values(v_uid,p_device_limit,now())
  on conflict(user_id) do update
    set device_limit=excluded.device_limit,updated_at=now();

  return p_device_limit;
end
$$;

revoke all on function public.abu_bassam_set_device_limit(text,text,integer) from public, anon;
grant execute on function public.abu_bassam_set_device_limit(text,text,integer) to authenticated, service_role;
