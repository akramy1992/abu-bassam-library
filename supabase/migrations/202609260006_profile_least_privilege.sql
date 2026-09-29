-- Restrict personal profile table to the exact Data API privileges required by the app.
revoke all on table public.abu_bassam_profiles from public,anon,authenticated;
grant select,insert,update on table public.abu_bassam_profiles to authenticated;
