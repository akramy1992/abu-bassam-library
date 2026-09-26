create or replace function public.abu_bassam_owner_activity_report(
  p_actor_device_id text,
  p_actor_secret text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_target_device_id text default null,
  p_category text default null,
  p_limit integer default 500
)
returns table(event_id text, device_id text, device_name text, device_role text, event_type text, category text, severity text, title text, details text, section text, created_at timestamptz)
language plpgsql
security definer
set search_path to 'public','extensions'
as $function$
declare
  v_uid uuid := auth.uid();
  v_actor public.abu_bassam_devices%rowtype;
  v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_actor_device_id),'')='' or coalesce(p_actor_secret,'')='' then raise exception 'OWNER_REQUIRED'; end if;
  v_hash := encode(digest(p_actor_secret,'sha256'),'hex');
  select * into v_actor from public.abu_bassam_devices where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false or coalesce(v_actor.secret_hash,'')='' or v_actor.secret_hash<>v_hash then raise exception 'OWNER_REQUIRED'; end if;

  return query
  select a.event_id,a.device_id,a.device_name,a.device_role,a.event_type,a.category,a.severity,a.title,a.details,a.section,a.created_at
  from public.abu_bassam_device_activity a
  where a.user_id=v_uid
    and (p_from is null or a.created_at>=p_from)
    and (p_to is null or a.created_at<=p_to)
    and (coalesce(p_target_device_id,'')='' or a.device_id=p_target_device_id)
    and (coalesce(p_category,'')='' or a.category=p_category)
  order by a.created_at desc
  limit greatest(1,least(coalesce(p_limit,500),2000));
end
$function$;

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
)
returns boolean
language plpgsql
security definer
set search_path to 'public','extensions'
as $function$
declare
  v_uid uuid := auth.uid();
  v_device public.abu_bassam_devices%rowtype;
  v_hash text;
  v_event_id text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_device_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  v_hash := encode(digest(p_device_secret,'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or coalesce(v_device.secret_hash,'')='' or v_device.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;

  v_event_id := left(coalesce(nullif(trim(p_event_id),''),encode(gen_random_bytes(16),'hex')),180);
  insert into public.abu_bassam_device_activity(
    user_id,event_id,device_id,device_name,device_role,event_type,category,severity,title,details,section,created_at,received_at
  )
  values(
    v_uid,
    v_event_id,
    p_device_id,
    left(coalesce(v_device.device_name,'جهاز المكتبة'),120),
    coalesce(v_device.role,'secondary'),
    left(coalesce(p_event_type,'info'),40),
    left(coalesce(p_category,'system'),40),
    case when lower(coalesce(p_severity,'')) in ('info','success','warning','error','critical') then lower(p_severity) else 'info' end,
    left(coalesce(p_title,''),240),
    left(coalesce(p_details,''),500),
    left(coalesce(p_section,''),120),
    coalesce(p_created_at,now()),
    now()
  )
  on conflict(user_id,event_id) do nothing;
  return true;
end
$function$;

revoke all on function public.abu_bassam_owner_activity_report(text,text,timestamptz,timestamptz,text,text,integer) from public, anon;
grant execute on function public.abu_bassam_owner_activity_report(text,text,timestamptz,timestamptz,text,text,integer) to authenticated;
revoke all on function public.abu_bassam_record_device_activity(text,text,text,text,text,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.abu_bassam_record_device_activity(text,text,text,text,text,text,text,text,text,timestamptz) to authenticated;
