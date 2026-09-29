-- Personal account profile and one-time emergency device recovery for Abu Bassam Library.
create table if not exists public.abu_bassam_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null,
  username_key text generated always as (lower(btrim(username))) stored,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint abu_bassam_profiles_full_name_len check (char_length(btrim(full_name)) between 2 and 120),
  constraint abu_bassam_profiles_username_len check (char_length(btrim(username)) between 3 and 32),
  constraint abu_bassam_profiles_username_no_space check (username !~ '[[:space:]]')
);
create unique index if not exists abu_bassam_profiles_username_uidx on public.abu_bassam_profiles(username_key);
alter table public.abu_bassam_profiles enable row level security;
revoke all on table public.abu_bassam_profiles from public,anon;
grant select,insert,update on table public.abu_bassam_profiles to authenticated;
drop policy if exists abu_bassam_profiles_select_own on public.abu_bassam_profiles;
create policy abu_bassam_profiles_select_own on public.abu_bassam_profiles for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists abu_bassam_profiles_insert_own on public.abu_bassam_profiles;
create policy abu_bassam_profiles_insert_own on public.abu_bassam_profiles for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists abu_bassam_profiles_update_own on public.abu_bassam_profiles;
create policy abu_bassam_profiles_update_own on public.abu_bassam_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create table if not exists public.abu_bassam_recovery_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recovery_device_id text not null,
  recovery_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  constraint abu_bassam_recovery_hash_len check (char_length(recovery_hash)=64),
  constraint abu_bassam_recovery_attempts_range check (failed_attempts between 0 and 100)
);
alter table public.abu_bassam_recovery_codes enable row level security;
revoke all on table public.abu_bassam_recovery_codes from public,anon,authenticated;
create index if not exists abu_bassam_recovery_device_idx on public.abu_bassam_recovery_codes(user_id,recovery_device_id);
