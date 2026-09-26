-- Integrated notification/audit center for Abu Bassam Library.
-- Device activity is append-only through verified-device RPCs.
-- Direct table reads/writes are revoked; branch reports are owner-only.

create table if not exists public.abu_bassam_device_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  device_id text not null,
  device_name text not null default 'جهاز المكتبة',
  device_role text not null default 'secondary',
  event_type text not null default 'info',
  category text not null default 'system',
  severity text not null default 'info',
  title text not null default '',
  details text not null default '',
  section text not null default '',
  created_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  primary key (user_id,event_id)
);

create index if not exists abu_bassam_device_activity_user_time_idx
  on public.abu_bassam_device_activity(user_id,created_at desc);
create index if not exists abu_bassam_device_activity_user_device_idx
  on public.abu_bassam_device_activity(user_id,device_id,created_at desc);
create index if not exists abu_bassam_device_activity_user_category_idx
  on public.abu_bassam_device_activity(user_id,category,created_at desc);

alter table public.abu_bassam_device_activity enable row level security;
revoke all on public.abu_bassam_device_activity from anon,authenticated;

create or replace function public.abu_bassam_record_device_activity(
  p_device_id text,
  p_device_secret text,
  p_event_id text,
  p_event_type text,
  p_category text,
  p_severity text,
  p_title text,
  p_details text,
  p_section text,
  p_created_at timestamptz default now()
) returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_device public.abu_bassam_devices%rowtype;
  v_hash text;
  v_event_id text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_device_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  v_hash:=encode(digest(p_device_secret,'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices
    where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then
    raise exception 'DEVICE_NOT_AUTHORIZED';
  end if;
  v_event_id:=left(coalesce(nullif(trim(p_event_id),''),encode(gen_random_bytes(16),'hex')),180);
  insert into public.abu_bassam_device_activity(
    user_id,event_id,device_id,device_name,device_role,event_type,category,severity,title,details,section,created_at,received_at
  ) values (
    v_uid,v_event_id,p_device_id,left(coalesce(v_device.device_name,'جهاز المكتبة'),120),coalesce(v_device.role,'secondary'),
    left(coalesce(p_event_type,'info'),40),left(coalesce(p_category,'system'),40),
    case when lower(coalesce(p_severity,'')) in ('info','success','warning','error','critical') then lower(p_severity) else 'info' end,
    left(coalesce(p_title,''),240),left(coalesce(p_details,''),500),left(coalesce(p_section,''),120),
    coalesce(p_created_at,now()),now()
  ) on conflict(user_id,event_id) do nothing;
  return true;
end $$;

create or replace function public.abu_bassam_owner_activity_report(
  p_actor_device_id text,
  p_actor_secret text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_target_device_id text default null,
  p_category text default null,
  p_limit integer default 500
) returns table(
  event_id text,
  device_id text,
  device_name text,
  device_role text,
  event_type text,
  category text,
  severity text,
  title text,
  details text,
  section text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_actor public.abu_bassam_devices%rowtype;
  v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_actor_secret,''),'sha256'),'hex');
  select * into v_actor from public.abu_bassam_devices
    where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false
     or (coalesce(v_actor.secret_hash,'')<>'' and v_actor.secret_hash<>v_hash) then
    raise exception 'OWNER_REQUIRED';
  end if;
  return query
    select a.event_id,a.device_id,a.device_name,a.device_role,a.event_type,a.category,a.severity,
           a.title,a.details,a.section,a.created_at
      from public.abu_bassam_device_activity a
     where a.user_id=v_uid
       and (p_from is null or a.created_at>=p_from)
       and (p_to is null or a.created_at<=p_to)
       and (coalesce(p_target_device_id,'')='' or a.device_id=p_target_device_id)
       and (coalesce(p_category,'')='' or a.category=p_category)
     order by a.created_at desc
     limit greatest(1,least(coalesce(p_limit,500),2000));
end $$;

create or replace function public.abu_bassam_owner_activity_devices(
  p_actor_device_id text,
  p_actor_secret text
) returns table(device_id text,device_name text,device_role text,active boolean,last_seen timestamptz)
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_actor public.abu_bassam_devices%rowtype;
  v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_actor_secret,''),'sha256'),'hex');
  select * into v_actor from public.abu_bassam_devices where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false
     or (coalesce(v_actor.secret_hash,'')<>'' and v_actor.secret_hash<>v_hash) then
    raise exception 'OWNER_REQUIRED';
  end if;
  return query select d.device_id,d.device_name,d.role,d.active,d.last_seen
    from public.abu_bassam_devices d where d.user_id=v_uid order by (case when d.role='owner' then 0 else 1 end),d.device_name;
end $$;

revoke all on function public.abu_bassam_record_device_activity(text,text,text,text,text,text,text,text,text,timestamptz) from PUBLIC,anon;
revoke all on function public.abu_bassam_owner_activity_report(text,text,timestamptz,timestamptz,text,text,integer) from PUBLIC,anon;
revoke all on function public.abu_bassam_owner_activity_devices(text,text) from PUBLIC,anon;
grant execute on function public.abu_bassam_record_device_activity(text,text,text,text,text,text,text,text,text,timestamptz) to authenticated;
grant execute on function public.abu_bassam_owner_activity_report(text,text,timestamptz,timestamptz,text,text,integer) to authenticated;
grant execute on function public.abu_bassam_owner_activity_devices(text,text) to authenticated;
