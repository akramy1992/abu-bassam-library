-- Secure, user-scoped synchronization for Abu Bassam Library.
-- The publishable client key may reach these objects, but RLS limits every row
-- and storage object to the authenticated Supabase user in the current JWT.

create table if not exists public.abu_bassam_sync_secure (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (
    kind in ('operation', 'settings', 'device', 'vault', 'template', 'card', 'backup')
  ),
  client_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint abu_bassam_sync_secure_user_kind_client_key
    unique (user_id, kind, client_id)
);

create index if not exists abu_bassam_sync_secure_user_kind_updated_idx
  on public.abu_bassam_sync_secure (user_id, kind, updated_at desc);

alter table public.abu_bassam_sync_secure enable row level security;

revoke all on table public.abu_bassam_sync_secure from anon, authenticated;
grant select, insert, update, delete on table public.abu_bassam_sync_secure to authenticated;
revoke all on sequence public.abu_bassam_sync_secure_id_seq from anon, authenticated;
grant usage, select on sequence public.abu_bassam_sync_secure_id_seq to authenticated;

drop policy if exists "abu_bassam_secure_select_own" on public.abu_bassam_sync_secure;
create policy "abu_bassam_secure_select_own"
on public.abu_bassam_sync_secure
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "abu_bassam_secure_insert_own" on public.abu_bassam_sync_secure;
create policy "abu_bassam_secure_insert_own"
on public.abu_bassam_sync_secure
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "abu_bassam_secure_update_own" on public.abu_bassam_sync_secure;
create policy "abu_bassam_secure_update_own"
on public.abu_bassam_sync_secure
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "abu_bassam_secure_delete_own" on public.abu_bassam_sync_secure;
create policy "abu_bassam_secure_delete_own"
on public.abu_bassam_sync_secure
for delete
to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('abu-bassam-private', 'abu-bassam-private', false, 104857600)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "abu_bassam_storage_select_own" on storage.objects;
create policy "abu_bassam_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'abu-bassam-private'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "abu_bassam_storage_insert_own" on storage.objects;
create policy "abu_bassam_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'abu-bassam-private'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "abu_bassam_storage_update_own" on storage.objects;
create policy "abu_bassam_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'abu-bassam-private'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'abu-bassam-private'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "abu_bassam_storage_delete_own" on storage.objects;
create policy "abu_bassam_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'abu-bassam-private'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
