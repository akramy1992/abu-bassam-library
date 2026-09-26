-- Privacy boundary for legacy operation synchronization.
-- Operations are now local per device and branch-wide reporting is owner-only
-- through abu_bassam_device_activity RPCs. Other sync kinds remain unchanged.

drop policy if exists "abu_bassam_secure_select_own" on public.abu_bassam_sync_secure;
create policy "abu_bassam_secure_select_own"
on public.abu_bassam_sync_secure
for select
to authenticated
using ((select auth.uid()) = user_id and kind <> 'operation');

drop policy if exists "abu_bassam_secure_insert_own" on public.abu_bassam_sync_secure;
create policy "abu_bassam_secure_insert_own"
on public.abu_bassam_sync_secure
for insert
to authenticated
with check ((select auth.uid()) = user_id and kind <> 'operation');

drop policy if exists "abu_bassam_secure_update_own" on public.abu_bassam_sync_secure;
create policy "abu_bassam_secure_update_own"
on public.abu_bassam_sync_secure
for update
to authenticated
using ((select auth.uid()) = user_id and kind <> 'operation')
with check ((select auth.uid()) = user_id and kind <> 'operation');

drop policy if exists "abu_bassam_secure_delete_own" on public.abu_bassam_sync_secure;
create policy "abu_bassam_secure_delete_own"
on public.abu_bassam_sync_secure
for delete
to authenticated
using ((select auth.uid()) = user_id and kind <> 'operation');
