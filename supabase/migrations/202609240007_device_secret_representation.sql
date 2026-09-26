-- Normalize legacy bytea device secret hashes to the text/hex format used by current RPCs.
do $$
declare v_type text;
begin
  select data_type into v_type
    from information_schema.columns
   where table_schema='public' and table_name='abu_bassam_devices' and column_name='secret_hash';
  if v_type='bytea' then
    alter table public.abu_bassam_devices
      alter column secret_hash type text
      using case
        when octet_length(secret_hash)=32 then encode(secret_hash,'hex')
        when octet_length(secret_hash)=64 and encode(secret_hash,'escape') ~ '^[0-9A-Fa-f]{64}$' then lower(encode(secret_hash,'escape'))
        else encode(secret_hash,'hex')
      end;
  end if;
end $$;

alter table public.abu_bassam_devices alter column secret_hash set not null;
alter table public.abu_bassam_devices drop constraint if exists abu_bassam_devices_secret_hash_valid;
alter table public.abu_bassam_devices add constraint abu_bassam_devices_secret_hash_valid
  check (secret_hash ~ '^[0-9a-f]{64}$');

create or replace function public.abu_bassam_remove_device(
  p_actor_device_id text,
  p_actor_secret text,
  p_target_device_id text
) returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_actor public.abu_bassam_devices%rowtype;
  v_target public.abu_bassam_devices%rowtype;
  v_hash text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_actor_device_id),'')='' or coalesce(p_actor_secret,'')='' then raise exception 'OWNER_REQUIRED'; end if;
  v_hash:=encode(digest(p_actor_secret,'sha256'),'hex');
  select * into v_actor from public.abu_bassam_devices
   where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false or v_actor.secret_hash<>v_hash then raise exception 'OWNER_REQUIRED'; end if;
  if p_target_device_id=p_actor_device_id then raise exception 'OWNER_CANNOT_BE_REMOVED'; end if;
  select * into v_target from public.abu_bassam_devices
   where user_id=v_uid and device_id=p_target_device_id limit 1;
  if not found then return true; end if;
  if v_target.role='owner' then raise exception 'OWNER_CANNOT_BE_REMOVED'; end if;
  delete from public.abu_bassam_devices where user_id=v_uid and device_id=p_target_device_id;
  return true;
end $$;

revoke all on function public.abu_bassam_remove_device(text,text,text) from PUBLIC,anon;
grant execute on function public.abu_bassam_remove_device(text,text,text) to authenticated;
