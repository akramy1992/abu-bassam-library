-- Configurable trusted-device limit for Abu Bassam Library.
-- Default remains 5. Only the authenticated owner device can change it.

create table if not exists public.abu_bassam_account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_limit integer not null default 5 check (device_limit between 1 and 50),
  updated_at timestamptz not null default now()
);

alter table public.abu_bassam_account_settings enable row level security;
revoke all on public.abu_bassam_account_settings from anon,authenticated;
grant select on public.abu_bassam_account_settings to authenticated;

drop policy if exists abu_bassam_account_settings_select_own on public.abu_bassam_account_settings;
create policy abu_bassam_account_settings_select_own
on public.abu_bassam_account_settings
for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.abu_bassam_get_device_limit()
returns integer
language sql
security definer
stable
set search_path=public
as $$
  select case when auth.uid() is null then 5 else coalesce(
    (select s.device_limit from public.abu_bassam_account_settings s where s.user_id=auth.uid()),
    5
  ) end;
$$;

create or replace function public.abu_bassam_set_device_limit(
  p_actor_device_id text,
  p_actor_secret text,
  p_device_limit integer
) returns integer
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_actor public.abu_bassam_devices%rowtype;
  v_hash text;
  v_count integer;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_device_limit is null or p_device_limit < 1 or p_device_limit > 50 then
    raise exception 'DEVICE_LIMIT_INVALID';
  end if;

  v_hash:=encode(digest(coalesce(p_actor_secret,''),'sha256'),'hex');
  select * into v_actor
  from public.abu_bassam_devices
  where user_id=v_uid and device_id=p_actor_device_id
  limit 1;

  if not found or v_actor.role<>'owner' or v_actor.active=false
     or (coalesce(v_actor.secret_hash,'')<>'' and v_actor.secret_hash<>v_hash) then
    raise exception 'OWNER_REQUIRED';
  end if;

  select count(*) into v_count from public.abu_bassam_devices where user_id=v_uid;
  if p_device_limit < v_count then
    raise exception 'DEVICE_LIMIT_BELOW_CURRENT_COUNT';
  end if;

  insert into public.abu_bassam_account_settings(user_id,device_limit,updated_at)
  values(v_uid,p_device_limit,now())
  on conflict(user_id) do update
    set device_limit=excluded.device_limit,updated_at=now();
  return p_device_limit;
end $$;

-- Replace registration so the server, not only the UI, enforces the configurable limit.
create or replace function public.abu_bassam_register_device(
  p_device_id text,p_secret text,p_device_name text,p_model text,p_platform text,p_app_version text
) returns public.abu_bassam_devices
language plpgsql security definer set search_path=public,extensions as $$
declare
  v_uid uuid:=auth.uid();v_hash text;v_row public.abu_bassam_devices%rowtype;v_match public.abu_bassam_devices%rowtype;
  v_role text;v_permissions jsonb:='{}'::jsonb;v_count integer;v_owner_recent boolean;v_limit integer:=5;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED';end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED';end if;
  select coalesce(s.device_limit,5) into v_limit from public.abu_bassam_account_settings s where s.user_id=v_uid;
  v_limit:=coalesce(v_limit,5);
  v_hash:=encode(digest(p_secret,'sha256'),'hex');
  select * into v_row from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if found then
    if coalesce(v_row.secret_hash,'')<>'' and v_row.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED';end if;
    update public.abu_bassam_devices set secret_hash=v_hash,device_name=coalesce(nullif(trim(p_device_name),''),device_name),model=coalesce(p_model,''),platform=coalesce(p_platform,'Android'),app_version=coalesce(p_app_version,''),last_seen=now(),active=true where user_id=v_uid and device_id=p_device_id;
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
    order by (case when role='owner' then 0 else 1 end),last_seen desc nulls last limit 1;
  if found then
    v_role:=v_match.role;v_permissions:=coalesce(v_match.permissions,'{}'::jsonb);
    delete from public.abu_bassam_devices where user_id=v_uid
      and lower(trim(coalesce(device_name,'')))=lower(trim(coalesce(p_device_name,'')))
      and lower(trim(coalesce(model,'')))=lower(trim(coalesce(p_model,'')))
      and lower(trim(coalesce(platform,'')))=lower(trim(coalesce(p_platform,'')));
  else
    select count(*) into v_count from public.abu_bassam_devices where user_id=v_uid;
    if v_count>=v_limit then raise exception 'DEVICE_LIMIT_REACHED';end if;
    if exists(select 1 from public.abu_bassam_devices where user_id=v_uid and role='owner' and active=true and last_seen>=now()-interval '30 days') then v_role:='secondary';
    else update public.abu_bassam_devices set role='secondary' where user_id=v_uid and role='owner';v_role:='owner';end if;
  end if;
  insert into public.abu_bassam_devices(user_id,device_id,secret_hash,device_name,model,platform,role,active,permissions,first_seen,last_seen,app_version)
  values(v_uid,p_device_id,v_hash,coalesce(nullif(trim(p_device_name),''),'جهاز المكتبة'),coalesce(p_model,''),coalesce(p_platform,'Android'),coalesce(v_role,'secondary'),true,v_permissions,now(),now(),coalesce(p_app_version,'')) returning * into v_row;
  return v_row;
end $$;

revoke all on function public.abu_bassam_get_device_limit() from PUBLIC,anon;
revoke all on function public.abu_bassam_set_device_limit(text,text,integer) from PUBLIC,anon;
revoke all on function public.abu_bassam_register_device(text,text,text,text,text,text) from PUBLIC,anon;
grant execute on function public.abu_bassam_get_device_limit() to authenticated;
grant execute on function public.abu_bassam_set_device_limit(text,text,integer) to authenticated;
grant execute on function public.abu_bassam_register_device(text,text,text,text,text,text) to authenticated;
