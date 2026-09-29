-- Mark cloud snapshots ready only after every part has uploaded and been verified.
alter table public.abu_bassam_backups
  add column if not exists ready boolean not null default false,
  add column if not exists committed_at timestamptz;

create index if not exists abu_bassam_backups_pending_idx
  on public.abu_bassam_backups(user_id,branch_device_id,ready,created_at);
