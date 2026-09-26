-- Preserve legacy rows for recovery while removing anonymous access.
-- v4.2 uses abu_bassam_sync_secure and no longer depends on this table.

drop policy if exists abu_bassam_sync_select on public.abu_bassam_sync;
drop policy if exists abu_bassam_sync_insert on public.abu_bassam_sync;
drop policy if exists abu_bassam_sync_update on public.abu_bassam_sync;
drop policy if exists abu_bassam_sync_delete on public.abu_bassam_sync;

revoke all on table public.abu_bassam_sync from anon;
