create table if not exists public.abu_bassam_app_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  version_code integer not null check (version_code > 0),
  channel text not null default 'stable' check (channel in ('stable','beta')),
  mandatory boolean not null default false,
  min_supported_code integer not null default 1 check (min_supported_code > 0),
  changelog text not null default '',
  storage_bucket text not null default 'abu-bassam-private',
  storage_path text,
  sha256 text,
  signing_cert_sha256 text,
  published_at timestamptz not null default now(),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(version, channel),
  unique(version_code, channel),
  check (sha256 is null or sha256 ~ '^[0-9a-fA-F]{64}$'),
  check (signing_cert_sha256 is null or signing_cert_sha256 ~ '^[0-9a-fA-F:]{64,95}$')
);

create unique index if not exists abu_bassam_app_releases_one_active_channel
  on public.abu_bassam_app_releases(channel) where active;

alter table public.abu_bassam_app_releases enable row level security;

drop policy if exists abu_bassam_app_releases_deny_all on public.abu_bassam_app_releases;
create policy abu_bassam_app_releases_deny_all
  on public.abu_bassam_app_releases
  as restrictive
  for all
  to public
  using (false)
  with check (false);

revoke all on table public.abu_bassam_app_releases from public, anon, authenticated;
grant select on table public.abu_bassam_app_releases to service_role;

insert into public.abu_bassam_app_releases (
  version, version_code, channel, mandatory, min_supported_code, changelog,
  storage_bucket, storage_path, sha256, signing_cert_sha256, active
) values (
  '5.0.0', 500, 'stable', false, 500,
  'خط أساس الإصدار 5.0.0 المبني بهوية Android مستقلة ونظيفة.',
  'abu-bassam-private', null, null, null, true
)
on conflict (version, channel) do update set
  version_code=excluded.version_code,
  mandatory=excluded.mandatory,
  min_supported_code=excluded.min_supported_code,
  changelog=excluded.changelog,
  active=true;
