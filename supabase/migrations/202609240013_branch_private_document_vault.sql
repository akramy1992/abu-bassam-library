create table if not exists public.abu_bassam_branch_vault (
  user_id uuid not null references auth.users(id) on delete cascade,
  branch_device_id text not null,
  client_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, branch_device_id, client_id)
);

create index if not exists abu_bassam_branch_vault_updated_idx
  on public.abu_bassam_branch_vault(user_id,branch_device_id,updated_at desc);

alter table public.abu_bassam_branch_vault enable row level security;
revoke all on table public.abu_bassam_branch_vault from public, anon, authenticated;

drop policy if exists abu_bassam_branch_vault_direct_deny on public.abu_bassam_branch_vault;
create policy abu_bassam_branch_vault_direct_deny
on public.abu_bassam_branch_vault
as restrictive
for all
to authenticated
using (false)
with check (false);

create or replace function public._abu_bassam_vault_authorized(
  p_device_id text,
  p_device_secret text,
  p_permission text
) returns boolean
language plpgsql
security definer
set search_path to 'public','extensions'
as $function$
declare
  v_uid uuid:=auth.uid();
  v public.abu_bassam_devices%rowtype;
  v_hash text;
  v_allowed boolean;
begin
  if v_uid is null or coalesce(trim(p_device_id),'')='' or coalesce(p_device_secret,'')='' then return false; end if;
  v_hash:=encode(digest(p_device_secret,'sha256'),'hex');
  select * into v from public.abu_bassam_devices where user_id=v_uid and device_id=p_device_id limit 1;
  if not found or v.active=false or coalesce(v.secret_hash,'')='' or v.secret_hash<>v_hash then return false; end if;
  if v.role='owner' then return true; end if;
  begin
    v_allowed:=coalesce((v.permissions->>p_permission)::boolean,true);
  exception when others then
    v_allowed:=false;
  end;
  return v_allowed;
end $function$;
revoke all on function public._abu_bassam_vault_authorized(text,text,text) from public,anon,authenticated;

create or replace function public.abu_bassam_vault_list(
  p_device_id text,
  p_device_secret text,
  p_limit integer default 1000
) returns table(kind text,client_id text,data jsonb,updated_at timestamptz)
language plpgsql security definer set search_path to 'public','extensions'
as $function$
begin
  if not public._abu_bassam_vault_authorized(p_device_id,p_device_secret,'vaultView') then raise exception 'VAULT_VIEW_NOT_ALLOWED'; end if;
  return query
  select 'vault'::text,v.client_id,v.data,v.updated_at
  from public.abu_bassam_branch_vault v
  where v.user_id=auth.uid() and v.branch_device_id=p_device_id
  order by v.updated_at asc
  limit greatest(1,least(coalesce(p_limit,1000),1000));
end $function$;

create or replace function public.abu_bassam_vault_get(
  p_device_id text,
  p_device_secret text,
  p_client_id text
) returns table(kind text,client_id text,data jsonb,updated_at timestamptz)
language plpgsql security definer set search_path to 'public','extensions'
as $function$
begin
  if not public._abu_bassam_vault_authorized(p_device_id,p_device_secret,'vaultView') then raise exception 'VAULT_VIEW_NOT_ALLOWED'; end if;
  return query
  select 'vault'::text,v.client_id,v.data,v.updated_at
  from public.abu_bassam_branch_vault v
  where v.user_id=auth.uid() and v.branch_device_id=p_device_id and v.client_id=p_client_id
  limit 1;
end $function$;

create or replace function public.abu_bassam_vault_upsert(
  p_device_id text,
  p_device_secret text,
  p_client_id text,
  p_data jsonb
) returns table(kind text,client_id text,data jsonb,updated_at timestamptz)
language plpgsql security definer set search_path to 'public','extensions'
as $function$
declare
  v_exists boolean;
  v_deleted boolean:=coalesce((p_data->>'deleted')::boolean,false);
  v_data jsonb;
begin
  if coalesce(trim(p_client_id),'')='' then raise exception 'VAULT_ID_REQUIRED'; end if;
  if not public._abu_bassam_vault_authorized(p_device_id,p_device_secret,'vaultSync') then raise exception 'VAULT_SYNC_NOT_ALLOWED'; end if;
  select exists(select 1 from public.abu_bassam_branch_vault x where x.user_id=auth.uid() and x.branch_device_id=p_device_id and x.client_id=p_client_id) into v_exists;
  if v_deleted then
    if not public._abu_bassam_vault_authorized(p_device_id,p_device_secret,'vaultDelete') then raise exception 'VAULT_DELETE_NOT_ALLOWED'; end if;
  elsif v_exists then
    if not public._abu_bassam_vault_authorized(p_device_id,p_device_secret,'vaultEdit') then raise exception 'VAULT_EDIT_NOT_ALLOWED'; end if;
  else
    if not public._abu_bassam_vault_authorized(p_device_id,p_device_secret,'vaultAdd') then raise exception 'VAULT_ADD_NOT_ALLOWED'; end if;
  end if;
  v_data:=coalesce(p_data,'{}'::jsonb) || jsonb_build_object('branchDeviceId',p_device_id);
  insert into public.abu_bassam_branch_vault(user_id,branch_device_id,client_id,data,created_at,updated_at)
  values(auth.uid(),p_device_id,p_client_id,v_data,now(),now())
  on conflict(user_id,branch_device_id,client_id)
  do update set data=excluded.data,updated_at=now();
  return query
  select 'vault'::text,v.client_id,v.data,v.updated_at
  from public.abu_bassam_branch_vault v
  where v.user_id=auth.uid() and v.branch_device_id=p_device_id and v.client_id=p_client_id;
end $function$;

create or replace function public.abu_bassam_vault_remove_all(
  p_device_id text,
  p_device_secret text
) returns integer
language plpgsql security definer set search_path to 'public','extensions'
as $function$
declare n integer;
begin
  if not public._abu_bassam_vault_authorized(p_device_id,p_device_secret,'vaultDelete') then raise exception 'VAULT_DELETE_NOT_ALLOWED'; end if;
  delete from public.abu_bassam_branch_vault where user_id=auth.uid() and branch_device_id=p_device_id;
  get diagnostics n=row_count;
  return n;
end $function$;

revoke all on function public.abu_bassam_vault_list(text,text,integer) from public,anon;
revoke all on function public.abu_bassam_vault_get(text,text,text) from public,anon;
revoke all on function public.abu_bassam_vault_upsert(text,text,text,jsonb) from public,anon;
revoke all on function public.abu_bassam_vault_remove_all(text,text) from public,anon;
grant execute on function public.abu_bassam_vault_list(text,text,integer) to authenticated;
grant execute on function public.abu_bassam_vault_get(text,text,text) to authenticated;
grant execute on function public.abu_bassam_vault_upsert(text,text,text,jsonb) to authenticated;
grant execute on function public.abu_bassam_vault_remove_all(text,text) to authenticated;

-- The legacy secure sync remains for non-vault data, but direct kind='vault' access is denied.
drop policy if exists abu_bassam_sync_no_direct_vault_select on public.abu_bassam_sync_secure;
create policy abu_bassam_sync_no_direct_vault_select on public.abu_bassam_sync_secure as restrictive for select to authenticated using (kind <> 'vault');
drop policy if exists abu_bassam_sync_no_direct_vault_insert on public.abu_bassam_sync_secure;
create policy abu_bassam_sync_no_direct_vault_insert on public.abu_bassam_sync_secure as restrictive for insert to authenticated with check (kind <> 'vault');
drop policy if exists abu_bassam_sync_no_direct_vault_update on public.abu_bassam_sync_secure;
create policy abu_bassam_sync_no_direct_vault_update on public.abu_bassam_sync_secure as restrictive for update to authenticated using (kind <> 'vault') with check (kind <> 'vault');
drop policy if exists abu_bassam_sync_no_direct_vault_delete on public.abu_bassam_sync_secure;
create policy abu_bassam_sync_no_direct_vault_delete on public.abu_bassam_sync_secure as restrictive for delete to authenticated using (kind <> 'vault');

-- Direct JWT access to vault objects is denied. Edge Functions use service-role access only after Device Secret verification.
drop policy if exists abu_bassam_storage_no_direct_vault_select on storage.objects;
create policy abu_bassam_storage_no_direct_vault_select on storage.objects as restrictive for select to authenticated using (bucket_id <> 'abu-bassam-private' or coalesce((storage.foldername(name))[2],'') not in ('vault','branch-vault'));
drop policy if exists abu_bassam_storage_no_direct_vault_insert on storage.objects;
create policy abu_bassam_storage_no_direct_vault_insert on storage.objects as restrictive for insert to authenticated with check (bucket_id <> 'abu-bassam-private' or coalesce((storage.foldername(name))[2],'') not in ('vault','branch-vault'));
drop policy if exists abu_bassam_storage_no_direct_vault_update on storage.objects;
create policy abu_bassam_storage_no_direct_vault_update on storage.objects as restrictive for update to authenticated using (bucket_id <> 'abu-bassam-private' or coalesce((storage.foldername(name))[2],'') not in ('vault','branch-vault')) with check (bucket_id <> 'abu-bassam-private' or coalesce((storage.foldername(name))[2],'') not in ('vault','branch-vault'));
drop policy if exists abu_bassam_storage_no_direct_vault_delete on storage.objects;
create policy abu_bassam_storage_no_direct_vault_delete on storage.objects as restrictive for delete to authenticated using (bucket_id <> 'abu-bassam-private' or coalesce((storage.foldername(name))[2],'') not in ('vault','branch-vault'));
