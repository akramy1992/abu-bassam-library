-- Automatic branch-scoped backup snapshots with private Storage metadata.
create table if not exists public.abu_bassam_backups(
  user_id uuid not null references auth.users(id) on delete cascade,
  backup_id uuid not null,
  branch_device_id text not null,
  branch_name text not null default '',
  parts jsonb not null default '[]'::jsonb,
  sha256 text not null,
  size_bytes bigint not null default 0,
  item_count integer not null default 0,
  backup_kind text not null default 'manual',
  encrypted boolean not null default false,
  app_version text not null default '',
  created_at timestamptz not null default now(),
  primary key(user_id,backup_id),
  constraint abu_bassam_backups_sha256_check check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint abu_bassam_backups_size_check check (size_bytes between 0 and 536870912),
  constraint abu_bassam_backups_item_count_check check (item_count between 0 and 1000),
  constraint abu_bassam_backups_kind_check check (backup_kind in ('manual','automatic','pre_restore')),
  constraint abu_bassam_backups_parts_check check (jsonb_typeof(parts)='array')
);

alter table public.abu_bassam_backups enable row level security;
revoke all on table public.abu_bassam_backups from public,anon,authenticated;
create index if not exists abu_bassam_backups_branch_created_idx on public.abu_bassam_backups(user_id,branch_device_id,created_at desc);

alter policy abu_bassam_storage_no_direct_vault_select on storage.objects
  using (
    bucket_id <> 'abu-bassam-private'
    or coalesce((storage.foldername(name))[2],'') <> all(array['vault','branch-vault','backup-vault'])
  );
alter policy abu_bassam_storage_no_direct_vault_insert on storage.objects
  with check (
    bucket_id <> 'abu-bassam-private'
    or coalesce((storage.foldername(name))[2],'') <> all(array['vault','branch-vault','backup-vault'])
  );
alter policy abu_bassam_storage_no_direct_vault_update on storage.objects
  using (
    bucket_id <> 'abu-bassam-private'
    or coalesce((storage.foldername(name))[2],'') <> all(array['vault','branch-vault','backup-vault'])
  )
  with check (
    bucket_id <> 'abu-bassam-private'
    or coalesce((storage.foldername(name))[2],'') <> all(array['vault','branch-vault','backup-vault'])
  );
alter policy abu_bassam_storage_no_direct_vault_delete on storage.objects
  using (
    bucket_id <> 'abu-bassam-private'
    or coalesce((storage.foldername(name))[2],'') <> all(array['vault','branch-vault','backup-vault'])
  );
