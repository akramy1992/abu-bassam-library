-- Backup metadata is gateway-only. Even authenticated users must use backup-center,
-- which validates user JWT + device id + device secret + branch permission.
drop policy if exists abu_bassam_backups_direct_deny on public.abu_bassam_backups;
create policy abu_bassam_backups_direct_deny
on public.abu_bassam_backups
as restrictive
for all
to anon,authenticated
using (false)
with check (false);
