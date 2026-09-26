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
set search_path to 'public','extensions'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_device public.abu_bassam_devices%rowtype;
  v_hash text;
  v_event_id text;
  v_title text:=coalesce(p_title,'');
  v_details text:=coalesce(p_details,'');
  v_section text:=coalesce(p_section,'');
  v_context text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_device_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  v_hash:=encode(digest(p_device_secret,'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or coalesce(v_device.secret_hash,'')='' or v_device.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;

  v_context:=v_section||' '||v_title;
  if v_context ~* '(مستمسك|مستمسكات|هوية|الوطنية|بطاقة السكن|تموين|التموينية|زبون|الزبون|زوجة|اطفال|أطفال|customer|document|national[[:space:]]*id|residence)' then
    if btrim(v_details)<>'' then v_details:='[تفاصيل زبون محجوبة]'; end if;
    v_title:=coalesce(nullif(btrim(regexp_replace(v_title,'[:\-–—].*$','','g')),''),'عملية مستمسكات');
  else
    v_details:=regexp_replace(v_details,'(password|token|secret|authorization)[[:space:]]*[:=]?[[:space:]]*[^[:space:]]+','[محجوب]','gi');
    v_details:=regexp_replace(v_details,'[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}','[بريد محجوب]','gi');
    v_details:=regexp_replace(v_details,'(\+?964|0)?7[0-9]{9}','[هاتف محجوب]','g');
    v_details:=regexp_replace(v_details,'[0-9]{8,}','[رقم محجوب]','g');
  end if;
  v_title:=regexp_replace(v_title,'[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}','[بريد محجوب]','gi');
  v_title:=regexp_replace(v_title,'(\+?964|0)?7[0-9]{9}','[هاتف محجوب]','g');
  v_section:=regexp_replace(v_section,'(\+?964|0)?7[0-9]{9}','[هاتف محجوب]','g');

  v_event_id:=left(coalesce(nullif(trim(p_event_id),''),encode(gen_random_bytes(16),'hex')),180);
  insert into public.abu_bassam_device_activity(user_id,event_id,device_id,device_name,device_role,event_type,category,severity,title,details,section,created_at,received_at)
  values(v_uid,v_event_id,p_device_id,left(coalesce(v_device.device_name,'جهاز المكتبة'),120),coalesce(v_device.role,'secondary'),left(coalesce(p_event_type,'info'),40),left(coalesce(p_category,'system'),40),case when lower(coalesce(p_severity,'')) in ('info','success','warning','error','critical') then lower(p_severity) else 'info' end,left(v_title,240),left(v_details,500),left(v_section,120),coalesce(p_created_at,now()),now())
  on conflict(user_id,event_id) do nothing;
  return true;
end $function$;

revoke all on function public.abu_bassam_record_device_activity(text,text,text,text,text,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.abu_bassam_record_device_activity(text,text,text,text,text,text,text,text,text,timestamptz) to authenticated;
