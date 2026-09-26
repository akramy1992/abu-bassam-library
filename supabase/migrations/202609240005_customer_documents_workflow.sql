-- Customer documents workflow upgrades: richer list metadata, original-image preservation,
-- edit metadata and owner-safe document ordering. Branch isolation remains device-id based.

alter table public.abu_bassam_customer_documents
  add column if not exists original_storage_path text,
  add column if not exists original_mime text,
  add column if not exists original_size_bytes bigint not null default 0,
  add column if not exists edit_meta jsonb not null default '{}'::jsonb;

create or replace function public.abu_bassam_customer_list_v2(
  p_device_id text,
  p_device_secret text,
  p_search text default '',
  p_limit integer default 500
) returns table(
  customer_id uuid,
  sequence_no bigint,
  owner_device_id text,
  owner_device_name text,
  full_name text,
  phone text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  document_count bigint,
  total_size_bytes bigint,
  last_activity timestamptz,
  profile_document_id uuid
)
language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_device public.abu_bassam_devices%rowtype;
  v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  return query
  select c.customer_id,c.sequence_no,c.owner_device_id,c.owner_device_name,c.full_name,c.phone,c.notes,c.created_at,c.updated_at,
         (select count(*) from public.abu_bassam_customer_documents d where d.user_id=v_uid and d.customer_id=c.customer_id and d.deleted_at is null),
         (select coalesce(sum(d.size_bytes),0)::bigint from public.abu_bassam_customer_documents d where d.user_id=v_uid and d.customer_id=c.customer_id and d.deleted_at is null),
         greatest(c.updated_at,coalesce((select max(d.updated_at) from public.abu_bassam_customer_documents d where d.user_id=v_uid and d.customer_id=c.customer_id and d.deleted_at is null),c.updated_at)),
         (select d.document_id from public.abu_bassam_customer_documents d where d.user_id=v_uid and d.customer_id=c.customer_id and d.deleted_at is null and d.document_type='personal_photo' order by d.created_at desc limit 1)
    from public.abu_bassam_customers c
   where c.user_id=v_uid and c.deleted_at is null
     and (v_device.role='owner' or c.owner_device_id=p_device_id)
     and (
       coalesce(trim(p_search),'')='' or
       c.full_name ilike '%'||trim(p_search)||'%' or
       c.phone ilike '%'||trim(p_search)||'%' or
       c.notes ilike '%'||trim(p_search)||'%'
     )
   order by case when v_device.role='owner' then c.owner_device_name else '' end,c.sequence_no desc
   limit greatest(1,least(coalesce(p_limit,500),2000));
end $$;

create or replace function public.abu_bassam_customer_document_access_v2(
  p_device_id text,p_device_secret text,p_document_id uuid
) returns table(
  storage_path text,file_name text,mime text,customer_id uuid,owner_device_id text,
  original_storage_path text,original_mime text,original_size_bytes bigint,edit_meta jsonb
)
language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_device public.abu_bassam_devices%rowtype;
  v_doc public.abu_bassam_customer_documents%rowtype;
  v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_doc from public.abu_bassam_customer_documents where user_id=v_uid and document_id=p_document_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_doc.owner_device_id<>p_device_id) then raise exception 'DOCUMENT_NOT_ALLOWED'; end if;
  return query select v_doc.storage_path,v_doc.file_name,v_doc.mime,v_doc.customer_id,v_doc.owner_device_id,
    v_doc.original_storage_path,v_doc.original_mime,v_doc.original_size_bytes,v_doc.edit_meta;
end $$;

create or replace function public.abu_bassam_customer_document_set_edit_meta(
  p_device_id text,p_device_secret text,p_document_id uuid,
  p_original_storage_path text default null,p_original_mime text default null,p_original_size_bytes bigint default 0,
  p_edit_meta jsonb default '{}'::jsonb
) returns boolean
language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_device public.abu_bassam_devices%rowtype;
  v_doc public.abu_bassam_customer_documents%rowtype;
  v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_doc from public.abu_bassam_customer_documents where user_id=v_uid and document_id=p_document_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_doc.owner_device_id<>p_device_id) then raise exception 'DOCUMENT_NOT_ALLOWED'; end if;
  update public.abu_bassam_customer_documents
     set original_storage_path=case when coalesce(original_storage_path,'')='' then nullif(p_original_storage_path,'') else original_storage_path end,
         original_mime=case when coalesce(original_mime,'')='' then nullif(p_original_mime,'') else original_mime end,
         original_size_bytes=case when coalesce(original_storage_path,'')='' then greatest(0,coalesce(p_original_size_bytes,0)) else original_size_bytes end,
         edit_meta=coalesce(p_edit_meta,'{}'::jsonb),updated_at=now()
   where user_id=v_uid and document_id=p_document_id;
  return true;
end $$;

create or replace function public.abu_bassam_customer_documents_reorder(
  p_device_id text,p_device_secret text,p_customer_id uuid,p_document_ids jsonb
) returns boolean
language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_device public.abu_bassam_devices%rowtype;
  v_customer public.abu_bassam_customers%rowtype;
  v_hash text;
  v_total integer;
  v_valid integer;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if jsonb_typeof(coalesce(p_document_ids,'[]'::jsonb))<>'array' then raise exception 'INVALID_ORDER'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_customer from public.abu_bassam_customers where user_id=v_uid and customer_id=p_customer_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_customer.owner_device_id<>p_device_id) then raise exception 'CUSTOMER_NOT_ALLOWED'; end if;
  select count(*) into v_total from jsonb_array_elements_text(p_document_ids);
  select count(*) into v_valid from public.abu_bassam_customer_documents d
    where d.user_id=v_uid and d.customer_id=p_customer_id and d.deleted_at is null
      and d.document_id::text in (select value from jsonb_array_elements_text(p_document_ids));
  if v_total<>v_valid then raise exception 'DOCUMENT_NOT_ALLOWED'; end if;
  with ordered as (
    select value::uuid as document_id,(ord-1)::integer as pos
    from jsonb_array_elements_text(p_document_ids) with ordinality as x(value,ord)
  )
  update public.abu_bassam_customer_documents d set sort_order=o.pos,updated_at=now()
    from ordered o where d.user_id=v_uid and d.customer_id=p_customer_id and d.document_id=o.document_id;
  return true;
end $$;

revoke all on function public.abu_bassam_customer_list_v2(text,text,text,integer) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_document_access_v2(text,text,uuid) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_document_set_edit_meta(text,text,uuid,text,text,bigint,jsonb) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_documents_reorder(text,text,uuid,jsonb) from PUBLIC,anon;
grant execute on function public.abu_bassam_customer_list_v2(text,text,text,integer) to authenticated;
grant execute on function public.abu_bassam_customer_document_access_v2(text,text,uuid) to authenticated;
grant execute on function public.abu_bassam_customer_document_set_edit_meta(text,text,uuid,text,text,bigint,jsonb) to authenticated;
grant execute on function public.abu_bassam_customer_documents_reorder(text,text,uuid,jsonb) to authenticated;
