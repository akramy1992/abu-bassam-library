-- Require a non-empty, matching stored device secret on every existing-device path.
-- New-device registration is unaffected because it has no existing row to authenticate.
create or replace function public.abu_bassam_register_device(p_device_id text,p_secret text,p_device_name text,p_model text,p_platform text,p_app_version text)
returns public.abu_bassam_devices
language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid(); v_hash text; v_row public.abu_bassam_devices%rowtype; v_count integer; v_limit integer:=5; v_role text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
  v_hash:=encode(digest(p_secret,'sha256'),'hex');
  select * into v_row from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if found then
    if v_row.active=false then raise exception 'DEVICE_DISABLED'; end if;
    if coalesce(v_row.secret_hash,'')='' or v_row.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
    update public.abu_bassam_devices set device_name=coalesce(nullif(trim(p_device_name),''),device_name),model=coalesce(p_model,''),platform=coalesce(p_platform,'Android'),app_version=coalesce(p_app_version,''),last_seen=now() where user_id=v_uid and device_id=p_device_id returning * into v_row;
    return v_row;
  end if;
  select coalesce(s.device_limit,5) into v_limit from public.abu_bassam_account_settings s where s.user_id=v_uid;
  v_limit:=coalesce(v_limit,5);
  select count(*) into v_count from public.abu_bassam_devices where user_id=v_uid;
  if v_count>=v_limit then raise exception 'DEVICE_LIMIT_REACHED'; end if;
  v_role:=case when v_count=0 then 'owner' else 'secondary' end;
  insert into public.abu_bassam_devices(user_id,device_id,secret_hash,device_name,model,platform,role,active,permissions,first_seen,last_seen,app_version)
  values(v_uid,p_device_id,v_hash,coalesce(nullif(trim(p_device_name),''),'جهاز المكتبة'),coalesce(p_model,''),coalesce(p_platform,'Android'),v_role,true,'{}'::jsonb,now(),now(),coalesce(p_app_version,'')) returning * into v_row;
  return v_row;
end $$;

create or replace function public.abu_bassam_touch_device(p_device_id text,p_secret text,p_device_name text,p_model text,p_platform text,p_app_version text)
returns public.abu_bassam_devices
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid();v_hash text;v_row public.abu_bassam_devices%rowtype;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  v_hash:=encode(digest(p_secret,'sha256'),'hex');
  select * into v_row from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or coalesce(v_row.secret_hash,'')='' or v_row.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  if v_row.active=false then raise exception 'DEVICE_DISABLED'; end if;
  update public.abu_bassam_devices set device_name=coalesce(nullif(trim(p_device_name),''),device_name),model=coalesce(p_model,''),platform=coalesce(p_platform,'Android'),app_version=coalesce(p_app_version,''),last_seen=now() where user_id=v_uid and device_id=p_device_id returning * into v_row;
  return v_row;
end $$;

create or replace function public.abu_bassam_remove_device(p_actor_device_id text,p_actor_secret text,p_target_device_id text)
returns boolean
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid();v_actor public.abu_bassam_devices%rowtype;v_target public.abu_bassam_devices%rowtype;v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_actor_device_id),'')='' or coalesce(p_actor_secret,'')='' then raise exception 'OWNER_REQUIRED'; end if;
  v_hash:=encode(digest(p_actor_secret,'sha256'),'hex');
  select * into v_actor from public.abu_bassam_devices where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false or coalesce(v_actor.secret_hash,'')='' or v_actor.secret_hash<>v_hash then raise exception 'OWNER_REQUIRED'; end if;
  if p_target_device_id=p_actor_device_id then raise exception 'OWNER_CANNOT_BE_REMOVED'; end if;
  select * into v_target from public.abu_bassam_devices where user_id=v_uid and device_id=p_target_device_id limit 1;
  if not found then return true; end if;
  if v_target.role='owner' then raise exception 'OWNER_CANNOT_BE_REMOVED'; end if;
  delete from public.abu_bassam_devices where user_id=v_uid and device_id=p_target_device_id;
  return true;
end $$;

create or replace function public.abu_bassam_owner_activity_devices(p_actor_device_id text,p_actor_secret text)
returns table(device_id text,device_name text,device_role text,active boolean,last_seen timestamptz)
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid();v_actor public.abu_bassam_devices%rowtype;v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_actor_device_id),'')='' or coalesce(p_actor_secret,'')='' then raise exception 'OWNER_REQUIRED'; end if;
  v_hash:=encode(digest(p_actor_secret,'sha256'),'hex');
  select * into v_actor from public.abu_bassam_devices where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false or coalesce(v_actor.secret_hash,'')='' or v_actor.secret_hash<>v_hash then raise exception 'OWNER_REQUIRED'; end if;
  return query select d.device_id,d.device_name,d.role,d.active,d.last_seen from public.abu_bassam_devices d where d.user_id=v_uid order by (case when d.role='owner' then 0 else 1 end),d.device_name;
end $$;

create or replace function public.abu_bassam_customer_document_set_edit_meta(p_device_id text,p_device_secret text,p_document_id uuid,p_original_storage_path text default null,p_original_mime text default null,p_original_size_bytes bigint default 0,p_edit_meta jsonb default '{}'::jsonb)
returns boolean
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid();v_device public.abu_bassam_devices%rowtype;v_doc public.abu_bassam_customer_documents%rowtype;v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_device_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  v_hash:=encode(digest(p_device_secret,'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or coalesce(v_device.secret_hash,'')='' or v_device.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_doc from public.abu_bassam_customer_documents where user_id=v_uid and document_id=p_document_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_doc.owner_device_id<>p_device_id) then raise exception 'DOCUMENT_NOT_ALLOWED'; end if;
  update public.abu_bassam_customer_documents set original_storage_path=case when coalesce(original_storage_path,'')='' then nullif(p_original_storage_path,'') else original_storage_path end,original_mime=case when coalesce(original_mime,'')='' then nullif(p_original_mime,'') else original_mime end,original_size_bytes=case when coalesce(original_storage_path,'')='' then greatest(0,coalesce(p_original_size_bytes,0)) else original_size_bytes end,edit_meta=coalesce(p_edit_meta,'{}'::jsonb),updated_at=now() where user_id=v_uid and document_id=p_document_id;
  return true;
end $$;

create or replace function public.abu_bassam_customer_prepare_document(p_device_id text,p_device_secret text,p_customer_id uuid,p_document_id uuid,p_person_scope text,p_person_name text,p_document_type text,p_document_label text,p_side text,p_file_name text,p_mime text,p_size_bytes bigint default 0,p_sort_order integer default 0)
returns table(document_id uuid,storage_path text,owner_device_id text)
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid();v_device public.abu_bassam_devices%rowtype;v_customer public.abu_bassam_customers%rowtype;v_hash text;v_id uuid:=coalesce(p_document_id,gen_random_uuid());v_path text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_device_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  v_hash:=encode(digest(p_device_secret,'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or coalesce(v_device.secret_hash,'')='' or v_device.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_customer from public.abu_bassam_customers where user_id=v_uid and customer_id=p_customer_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_customer.owner_device_id<>p_device_id) then raise exception 'CUSTOMER_NOT_ALLOWED'; end if;
  v_path:=v_uid::text||'/'||v_customer.owner_device_id||'/'||p_customer_id::text||'/'||v_id::text;
  insert into public.abu_bassam_customer_documents(user_id,document_id,customer_id,owner_device_id,person_scope,person_name,document_type,document_label,side,file_name,mime,storage_path,size_bytes,sort_order)
  values(v_uid,v_id,p_customer_id,v_customer.owner_device_id,left(coalesce(p_person_scope,'customer'),40),left(coalesce(p_person_name,''),180),left(coalesce(p_document_type,'other'),60),left(coalesce(p_document_label,''),180),left(coalesce(p_side,'single'),20),left(coalesce(p_file_name,'document'),220),left(coalesce(p_mime,'application/octet-stream'),120),v_path,greatest(0,coalesce(p_size_bytes,0)),coalesce(p_sort_order,0))
  on conflict(user_id,document_id) do update set person_scope=excluded.person_scope,person_name=excluded.person_name,document_type=excluded.document_type,document_label=excluded.document_label,side=excluded.side,file_name=excluded.file_name,mime=excluded.mime,size_bytes=excluded.size_bytes,sort_order=excluded.sort_order,updated_at=now(),deleted_at=null;
  return query select v_id,v_path,v_customer.owner_device_id;
end $$;

revoke all on function public.abu_bassam_register_device(text,text,text,text,text,text) from public,anon;
revoke all on function public.abu_bassam_touch_device(text,text,text,text,text,text) from public,anon;
revoke all on function public.abu_bassam_remove_device(text,text,text) from public,anon;
revoke all on function public.abu_bassam_owner_activity_devices(text,text) from public,anon;
grant execute on function public.abu_bassam_register_device(text,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.abu_bassam_touch_device(text,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.abu_bassam_remove_device(text,text,text) to authenticated,service_role;
grant execute on function public.abu_bassam_owner_activity_devices(text,text) to authenticated,service_role;

revoke all on function public.abu_bassam_customer_document_set_edit_meta(text,text,uuid,text,text,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.abu_bassam_customer_prepare_document(text,text,uuid,uuid,text,text,text,text,text,text,text,bigint,integer) from public,anon,authenticated;
grant execute on function public.abu_bassam_customer_document_set_edit_meta(text,text,uuid,text,text,bigint,jsonb) to service_role;
grant execute on function public.abu_bassam_customer_prepare_document(text,text,uuid,uuid,text,text,text,text,text,text,text,bigint,integer) to service_role;
