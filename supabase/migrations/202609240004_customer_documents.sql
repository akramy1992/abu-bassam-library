-- Customer documents vault with strict branch isolation.
-- Secondary devices can only see/manage customers created by their own device_id.
-- Owner device can see/manage all branches.

create table if not exists public.abu_bassam_customers (
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null default gen_random_uuid(),
  owner_device_id text not null,
  owner_device_name text not null default 'فرع المكتبة',
  sequence_no bigint not null,
  full_name text not null,
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id,customer_id)
);

create index if not exists abu_bassam_customers_branch_idx
  on public.abu_bassam_customers(user_id,owner_device_id,sequence_no);
create index if not exists abu_bassam_customers_name_idx
  on public.abu_bassam_customers(user_id,lower(full_name));

create table if not exists public.abu_bassam_customer_documents (
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null default gen_random_uuid(),
  customer_id uuid not null,
  owner_device_id text not null,
  person_scope text not null default 'customer',
  person_name text not null default '',
  document_type text not null default 'other',
  document_label text not null default '',
  side text not null default 'single',
  file_name text not null default 'document',
  mime text not null default 'application/octet-stream',
  storage_path text not null,
  size_bytes bigint not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id,document_id),
  foreign key (user_id,customer_id) references public.abu_bassam_customers(user_id,customer_id) on delete cascade
);

create index if not exists abu_bassam_customer_docs_customer_idx
  on public.abu_bassam_customer_documents(user_id,customer_id,sort_order,created_at);
create index if not exists abu_bassam_customer_docs_branch_idx
  on public.abu_bassam_customer_documents(user_id,owner_device_id,created_at desc);

alter table public.abu_bassam_customers enable row level security;
alter table public.abu_bassam_customer_documents enable row level security;
revoke all on public.abu_bassam_customers from anon,authenticated;
revoke all on public.abu_bassam_customer_documents from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit)
values('abu-bassam-customers-private','abu-bassam-customers-private',false,26214400)
on conflict(id) do update set public=false,file_size_limit=26214400;

-- No storage.objects policies are added for this bucket. Files are only accessed
-- by the verified customer-documents Edge Function using the service role.

create or replace function public.abu_bassam_customer_create(
  p_device_id text,
  p_device_secret text,
  p_full_name text,
  p_phone text default '',
  p_notes text default ''
) returns table(customer_id uuid,sequence_no bigint,owner_device_id text,owner_device_name text,full_name text,phone text,notes text,created_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_device public.abu_bassam_devices%rowtype;
  v_hash text;
  v_seq bigint;
  v_id uuid:=gen_random_uuid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_full_name),'')='' then raise exception 'CUSTOMER_NAME_REQUIRED'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  perform pg_advisory_xact_lock(hashtext(v_uid::text||':'||p_device_id));
  select coalesce(max(c.sequence_no),0)+1 into v_seq from public.abu_bassam_customers c where c.user_id=v_uid and c.owner_device_id=p_device_id;
  insert into public.abu_bassam_customers(user_id,customer_id,owner_device_id,owner_device_name,sequence_no,full_name,phone,notes)
  values(v_uid,v_id,p_device_id,coalesce(nullif(trim(v_device.device_name),''),'فرع المكتبة'),v_seq,left(trim(p_full_name),180),left(coalesce(trim(p_phone),''),60),left(coalesce(p_notes,''),1200));
  return query select c.customer_id,c.sequence_no,c.owner_device_id,c.owner_device_name,c.full_name,c.phone,c.notes,c.created_at,c.updated_at from public.abu_bassam_customers c where c.user_id=v_uid and c.customer_id=v_id;
end $$;

create or replace function public.abu_bassam_customer_list(
  p_device_id text,
  p_device_secret text,
  p_search text default '',
  p_limit integer default 500
) returns table(customer_id uuid,sequence_no bigint,owner_device_id text,owner_device_name text,full_name text,phone text,notes text,created_at timestamptz,updated_at timestamptz,document_count bigint,profile_document_id uuid)
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
         (select d.document_id from public.abu_bassam_customer_documents d where d.user_id=v_uid and d.customer_id=c.customer_id and d.deleted_at is null and d.document_type='personal_photo' order by d.created_at desc limit 1)
    from public.abu_bassam_customers c
   where c.user_id=v_uid and c.deleted_at is null
     and (v_device.role='owner' or c.owner_device_id=p_device_id)
     and (coalesce(trim(p_search),'')='' or c.full_name ilike '%'||trim(p_search)||'%' or c.phone ilike '%'||trim(p_search)||'%')
   order by case when v_device.role='owner' then c.owner_device_name else '' end,c.sequence_no desc
   limit greatest(1,least(coalesce(p_limit,500),2000));
end $$;

create or replace function public.abu_bassam_customer_update(
  p_device_id text,p_device_secret text,p_customer_id uuid,p_full_name text,p_phone text default '',p_notes text default ''
) returns boolean
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid(); v_device public.abu_bassam_devices%rowtype; v_customer public.abu_bassam_customers%rowtype; v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_customer from public.abu_bassam_customers where user_id=v_uid and customer_id=p_customer_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_customer.owner_device_id<>p_device_id) then raise exception 'CUSTOMER_NOT_ALLOWED'; end if;
  update public.abu_bassam_customers set full_name=left(trim(p_full_name),180),phone=left(coalesce(trim(p_phone),''),60),notes=left(coalesce(p_notes,''),1200),updated_at=now() where user_id=v_uid and customer_id=p_customer_id;
  return true;
end $$;

create or replace function public.abu_bassam_customer_prepare_document(
  p_device_id text,p_device_secret text,p_customer_id uuid,p_document_id uuid,
  p_person_scope text,p_person_name text,p_document_type text,p_document_label text,p_side text,
  p_file_name text,p_mime text,p_size_bytes bigint default 0,p_sort_order integer default 0
) returns table(document_id uuid,storage_path text,owner_device_id text)
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid(); v_device public.abu_bassam_devices%rowtype; v_customer public.abu_bassam_customers%rowtype; v_hash text; v_id uuid:=coalesce(p_document_id,gen_random_uuid()); v_path text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_customer from public.abu_bassam_customers where user_id=v_uid and customer_id=p_customer_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_customer.owner_device_id<>p_device_id) then raise exception 'CUSTOMER_NOT_ALLOWED'; end if;
  v_path:=v_uid::text||'/'||v_customer.owner_device_id||'/'||p_customer_id::text||'/'||v_id::text;
  insert into public.abu_bassam_customer_documents(user_id,document_id,customer_id,owner_device_id,person_scope,person_name,document_type,document_label,side,file_name,mime,storage_path,size_bytes,sort_order)
  values(v_uid,v_id,p_customer_id,v_customer.owner_device_id,left(coalesce(p_person_scope,'customer'),40),left(coalesce(p_person_name,''),180),left(coalesce(p_document_type,'other'),60),left(coalesce(p_document_label,''),180),left(coalesce(p_side,'single'),20),left(coalesce(p_file_name,'document'),220),left(coalesce(p_mime,'application/octet-stream'),120),v_path,greatest(0,coalesce(p_size_bytes,0)),coalesce(p_sort_order,0))
  on conflict(user_id,document_id) do update set person_scope=excluded.person_scope,person_name=excluded.person_name,document_type=excluded.document_type,document_label=excluded.document_label,side=excluded.side,file_name=excluded.file_name,mime=excluded.mime,size_bytes=excluded.size_bytes,sort_order=excluded.sort_order,updated_at=now(),deleted_at=null;
  return query select v_id,v_path,v_customer.owner_device_id;
end $$;

create or replace function public.abu_bassam_customer_documents_list(
  p_device_id text,p_device_secret text,p_customer_id uuid
) returns table(document_id uuid,customer_id uuid,owner_device_id text,person_scope text,person_name text,document_type text,document_label text,side text,file_name text,mime text,size_bytes bigint,sort_order integer,created_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid(); v_device public.abu_bassam_devices%rowtype; v_customer public.abu_bassam_customers%rowtype; v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_customer from public.abu_bassam_customers where user_id=v_uid and customer_id=p_customer_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_customer.owner_device_id<>p_device_id) then raise exception 'CUSTOMER_NOT_ALLOWED'; end if;
  return query select d.document_id,d.customer_id,d.owner_device_id,d.person_scope,d.person_name,d.document_type,d.document_label,d.side,d.file_name,d.mime,d.size_bytes,d.sort_order,d.created_at,d.updated_at from public.abu_bassam_customer_documents d where d.user_id=v_uid and d.customer_id=p_customer_id and d.deleted_at is null order by d.person_scope,d.person_name,d.sort_order,d.created_at;
end $$;

create or replace function public.abu_bassam_customer_document_access(
  p_device_id text,p_device_secret text,p_document_id uuid
) returns table(storage_path text,file_name text,mime text,customer_id uuid,owner_device_id text)
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid(); v_device public.abu_bassam_devices%rowtype; v_doc public.abu_bassam_customer_documents%rowtype; v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_doc from public.abu_bassam_customer_documents where user_id=v_uid and document_id=p_document_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_doc.owner_device_id<>p_device_id) then raise exception 'DOCUMENT_NOT_ALLOWED'; end if;
  return query select v_doc.storage_path,v_doc.file_name,v_doc.mime,v_doc.customer_id,v_doc.owner_device_id;
end $$;

create or replace function public.abu_bassam_customer_document_rename(
  p_device_id text,p_device_secret text,p_document_id uuid,p_label text,p_person_name text default null
) returns boolean
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid(); v_device public.abu_bassam_devices%rowtype; v_doc public.abu_bassam_customer_documents%rowtype; v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_doc from public.abu_bassam_customer_documents where user_id=v_uid and document_id=p_document_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_doc.owner_device_id<>p_device_id) then raise exception 'DOCUMENT_NOT_ALLOWED'; end if;
  update public.abu_bassam_customer_documents set document_label=left(coalesce(p_label,''),180),person_name=case when p_person_name is null then person_name else left(p_person_name,180) end,updated_at=now() where user_id=v_uid and document_id=p_document_id;
  return true;
end $$;

create or replace function public.abu_bassam_customer_document_delete(
  p_device_id text,p_device_secret text,p_document_id uuid
) returns text
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid(); v_device public.abu_bassam_devices%rowtype; v_doc public.abu_bassam_customer_documents%rowtype; v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_device_secret,''),'sha256'),'hex');
  select * into v_device from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v_device.active=false or (coalesce(v_device.secret_hash,'')<>'' and v_device.secret_hash<>v_hash) then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  select * into v_doc from public.abu_bassam_customer_documents where user_id=v_uid and document_id=p_document_id and deleted_at is null;
  if not found or (v_device.role<>'owner' and v_doc.owner_device_id<>p_device_id) then raise exception 'DOCUMENT_NOT_ALLOWED'; end if;
  update public.abu_bassam_customer_documents set deleted_at=now(),updated_at=now() where user_id=v_uid and document_id=p_document_id;
  return v_doc.storage_path;
end $$;

create or replace function public.abu_bassam_customer_transfer(
  p_actor_device_id text,p_actor_secret text,p_customer_id uuid,p_target_device_id text
) returns boolean
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid(); v_actor public.abu_bassam_devices%rowtype; v_target public.abu_bassam_devices%rowtype; v_hash text; v_seq bigint;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_hash:=encode(digest(coalesce(p_actor_secret,''),'sha256'),'hex');
  select * into v_actor from public.abu_bassam_devices where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false or (coalesce(v_actor.secret_hash,'')<>'' and v_actor.secret_hash<>v_hash) then raise exception 'OWNER_REQUIRED'; end if;
  select * into v_target from public.abu_bassam_devices where user_id=v_uid and device_id=p_target_device_id and active=true limit 1;
  if not found then raise exception 'TARGET_DEVICE_NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtext(v_uid::text||':'||p_target_device_id));
  select coalesce(max(sequence_no),0)+1 into v_seq from public.abu_bassam_customers where user_id=v_uid and owner_device_id=p_target_device_id;
  update public.abu_bassam_customers set owner_device_id=p_target_device_id,owner_device_name=coalesce(nullif(trim(v_target.device_name),''),'فرع المكتبة'),sequence_no=v_seq,updated_at=now() where user_id=v_uid and customer_id=p_customer_id and deleted_at is null;
  if not found then raise exception 'CUSTOMER_NOT_FOUND'; end if;
  update public.abu_bassam_customer_documents set owner_device_id=p_target_device_id,updated_at=now() where user_id=v_uid and customer_id=p_customer_id and deleted_at is null;
  return true;
end $$;

revoke all on function public.abu_bassam_customer_create(text,text,text,text,text) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_list(text,text,text,integer) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_update(text,text,uuid,text,text,text) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_prepare_document(text,text,uuid,uuid,text,text,text,text,text,text,text,bigint,integer) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_documents_list(text,text,uuid) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_document_access(text,text,uuid) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_document_rename(text,text,uuid,text,text) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_document_delete(text,text,uuid) from PUBLIC,anon;
revoke all on function public.abu_bassam_customer_transfer(text,text,uuid,text) from PUBLIC,anon;

grant execute on function public.abu_bassam_customer_create(text,text,text,text,text) to authenticated;
grant execute on function public.abu_bassam_customer_list(text,text,text,integer) to authenticated;
grant execute on function public.abu_bassam_customer_update(text,text,uuid,text,text,text) to authenticated;
grant execute on function public.abu_bassam_customer_prepare_document(text,text,uuid,uuid,text,text,text,text,text,text,text,bigint,integer) to authenticated;
grant execute on function public.abu_bassam_customer_documents_list(text,text,uuid) to authenticated;
grant execute on function public.abu_bassam_customer_document_access(text,text,uuid) to authenticated;
grant execute on function public.abu_bassam_customer_document_rename(text,text,uuid,text,text) to authenticated;
grant execute on function public.abu_bassam_customer_document_delete(text,text,uuid) to authenticated;
grant execute on function public.abu_bassam_customer_transfer(text,text,uuid,text) to authenticated;
