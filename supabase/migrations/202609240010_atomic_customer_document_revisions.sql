-- Stage customer-document uploads without mutating metadata, then commit a new revision atomically.
create or replace function public.abu_bassam_customer_document_upload_plan(
  p_device_id text,
  p_device_secret text,
  p_customer_id uuid,
  p_document_id uuid default null
) returns table(
  document_id uuid,
  base_storage_path text,
  owner_device_id text,
  existing_storage_path text,
  existing_original_storage_path text
)
language plpgsql
security definer
stable
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_device public.abu_bassam_devices%rowtype;
  v_customer public.abu_bassam_customers%rowtype;
  v_existing public.abu_bassam_customer_documents%rowtype;
  v_hash text;
  v_id uuid:=coalesce(p_document_id,gen_random_uuid());
  v_base text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_device_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  v_hash:=encode(digest(p_device_secret,'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or v_device.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_customer from public.abu_bassam_customers where user_id=v_uid and customer_id=p_customer_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_customer.owner_device_id<>p_device_id) then raise exception 'CUSTOMER_NOT_ALLOWED'; end if;
  select * into v_existing from public.abu_bassam_customer_documents where user_id=v_uid and document_id=v_id and deleted_at is null limit 1;
  if found and v_existing.customer_id<>p_customer_id then raise exception 'DOCUMENT_CUSTOMER_MISMATCH'; end if;
  v_base:=v_uid::text||'/'||v_customer.owner_device_id||'/'||p_customer_id::text||'/'||v_id::text;
  return query select v_id,v_base,v_customer.owner_device_id,
    case when v_existing.document_id is null then null else v_existing.storage_path end,
    case when v_existing.document_id is null then null else v_existing.original_storage_path end;
end $$;

create or replace function public.abu_bassam_customer_document_commit_v3(
  p_device_id text,
  p_device_secret text,
  p_customer_id uuid,
  p_document_id uuid,
  p_storage_path text,
  p_original_storage_path text,
  p_person_scope text,
  p_person_name text,
  p_document_type text,
  p_document_label text,
  p_side text,
  p_file_name text,
  p_mime text,
  p_size_bytes bigint,
  p_sort_order integer,
  p_original_mime text,
  p_original_size_bytes bigint,
  p_edit_meta jsonb
) returns table(document_id uuid, owner_device_id text, storage_path text, original_storage_path text)
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_device public.abu_bassam_devices%rowtype;
  v_customer public.abu_bassam_customers%rowtype;
  v_existing public.abu_bassam_customer_documents%rowtype;
  v_hash text;
  v_base text;
  v_original text:=nullif(trim(coalesce(p_original_storage_path,'')),'');
  v_mime text:=lower(trim(coalesce(p_mime,'')));
  v_original_mime text:=lower(trim(coalesce(p_original_mime,'')));
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_device_id),'')='' or coalesce(p_device_secret,'')='' then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  if p_customer_id is null or p_document_id is null then raise exception 'DOCUMENT_REQUIRED'; end if;
  v_hash:=encode(digest(p_device_secret,'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or v_device.secret_hash<>v_hash then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_customer from public.abu_bassam_customers where user_id=v_uid and customer_id=p_customer_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_customer.owner_device_id<>p_device_id) then raise exception 'CUSTOMER_NOT_ALLOWED'; end if;
  select * into v_existing from public.abu_bassam_customer_documents where user_id=v_uid and document_id=p_document_id and deleted_at is null limit 1;
  if found and v_existing.customer_id<>p_customer_id then raise exception 'DOCUMENT_CUSTOMER_MISMATCH'; end if;

  if v_mime not in ('image/jpeg','image/png','image/webp','image/heic','image/heif','image/avif','application/pdf') then raise exception 'MIME_NOT_ALLOWED'; end if;
  if coalesce(p_size_bytes,0)<1 or p_size_bytes>26214400 then raise exception 'FILE_SIZE_INVALID'; end if;
  if v_original is not null then
    if v_original_mime not in ('image/jpeg','image/png','image/webp','image/heic','image/heif','image/avif') then raise exception 'ORIGINAL_MIME_NOT_ALLOWED'; end if;
    if coalesce(p_original_size_bytes,0)<1 or p_original_size_bytes>26214400 then raise exception 'ORIGINAL_SIZE_INVALID'; end if;
  else
    v_original_mime:=null;
  end if;

  v_base:=v_uid::text||'/'||v_customer.owner_device_id||'/'||p_customer_id::text||'/'||p_document_id::text;
  if coalesce(p_storage_path,'') not like v_base||'.edited.%' then raise exception 'STORAGE_PATH_INVALID'; end if;
  if v_original is not null and v_original not like v_base||'.original.%' then raise exception 'ORIGINAL_PATH_INVALID'; end if;

  insert into public.abu_bassam_customer_documents(
    user_id,document_id,customer_id,owner_device_id,person_scope,person_name,document_type,document_label,side,
    file_name,mime,storage_path,size_bytes,sort_order,original_storage_path,original_mime,original_size_bytes,edit_meta,deleted_at,updated_at
  ) values(
    v_uid,p_document_id,p_customer_id,v_customer.owner_device_id,left(coalesce(p_person_scope,'customer'),40),left(coalesce(p_person_name,''),180),
    left(coalesce(p_document_type,'other'),60),left(coalesce(p_document_label,''),180),left(coalesce(p_side,'single'),20),left(coalesce(p_file_name,'document'),220),
    v_mime,p_storage_path,p_size_bytes,coalesce(p_sort_order,0),v_original,v_original_mime,case when v_original is null then 0 else p_original_size_bytes end,
    coalesce(p_edit_meta,'{}'::jsonb),null,now()
  ) on conflict(user_id,document_id) do update set
    customer_id=excluded.customer_id,owner_device_id=excluded.owner_device_id,person_scope=excluded.person_scope,person_name=excluded.person_name,
    document_type=excluded.document_type,document_label=excluded.document_label,side=excluded.side,file_name=excluded.file_name,mime=excluded.mime,
    storage_path=excluded.storage_path,size_bytes=excluded.size_bytes,sort_order=excluded.sort_order,original_storage_path=excluded.original_storage_path,
    original_mime=excluded.original_mime,original_size_bytes=excluded.original_size_bytes,edit_meta=excluded.edit_meta,updated_at=now(),deleted_at=null;

  return query select p_document_id,v_customer.owner_device_id,p_storage_path,v_original;
end $$;

-- The old prepare/edit-meta mutation path must no longer be callable by clients.
revoke all on function public.abu_bassam_customer_prepare_document(text,text,uuid,uuid,text,text,text,text,text,text,text,bigint,integer) from PUBLIC,anon,authenticated;
revoke all on function public.abu_bassam_customer_document_set_edit_meta(text,text,uuid,text,text,bigint,jsonb) from PUBLIC,anon,authenticated;
revoke all on function public.abu_bassam_customer_document_upload_plan(text,text,uuid,uuid) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_document_commit_v3(text,text,uuid,uuid,text,text,text,text,text,text,text,text,text,bigint,integer,text,bigint,jsonb) from PUBLIC,anon;
grant execute on function public.abu_bassam_customer_document_upload_plan(text,text,uuid,uuid) to authenticated;
grant execute on function public.abu_bassam_customer_document_commit_v3(text,text,uuid,uuid,text,text,text,text,text,text,text,text,text,bigint,integer,text,bigint,jsonb) to authenticated;

update storage.buckets
set file_size_limit=26214400,
    allowed_mime_types=array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/avif','application/pdf']::text[]
where id='abu-bassam-customers-private';
