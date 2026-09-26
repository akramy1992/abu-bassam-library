-- Explicit deny-all RLS policies for RPC-only tables, plus duplicate index cleanup.
-- SECURITY DEFINER RPCs continue to perform device-secret authorization.

drop index if exists public.abu_bassam_devices_user_device_uidx;

-- Devices
drop policy if exists abu_bassam_devices_deny_select on public.abu_bassam_devices;
drop policy if exists abu_bassam_devices_deny_insert on public.abu_bassam_devices;
drop policy if exists abu_bassam_devices_deny_update on public.abu_bassam_devices;
drop policy if exists abu_bassam_devices_deny_delete on public.abu_bassam_devices;
create policy abu_bassam_devices_deny_select on public.abu_bassam_devices for select to authenticated using (false);
create policy abu_bassam_devices_deny_insert on public.abu_bassam_devices for insert to authenticated with check (false);
create policy abu_bassam_devices_deny_update on public.abu_bassam_devices for update to authenticated using (false) with check (false);
create policy abu_bassam_devices_deny_delete on public.abu_bassam_devices for delete to authenticated using (false);

-- Customer records
create policy abu_bassam_customers_deny_select on public.abu_bassam_customers for select to authenticated using (false);
create policy abu_bassam_customers_deny_insert on public.abu_bassam_customers for insert to authenticated with check (false);
create policy abu_bassam_customers_deny_update on public.abu_bassam_customers for update to authenticated using (false) with check (false);
create policy abu_bassam_customers_deny_delete on public.abu_bassam_customers for delete to authenticated using (false);

-- Customer document metadata
create policy abu_bassam_customer_documents_deny_select on public.abu_bassam_customer_documents for select to authenticated using (false);
create policy abu_bassam_customer_documents_deny_insert on public.abu_bassam_customer_documents for insert to authenticated with check (false);
create policy abu_bassam_customer_documents_deny_update on public.abu_bassam_customer_documents for update to authenticated using (false) with check (false);
create policy abu_bassam_customer_documents_deny_delete on public.abu_bassam_customer_documents for delete to authenticated using (false);

-- Device activity/audit rows
create policy abu_bassam_device_activity_deny_select on public.abu_bassam_device_activity for select to authenticated using (false);
create policy abu_bassam_device_activity_deny_insert on public.abu_bassam_device_activity for insert to authenticated with check (false);
create policy abu_bassam_device_activity_deny_update on public.abu_bassam_device_activity for update to authenticated using (false) with check (false);
create policy abu_bassam_device_activity_deny_delete on public.abu_bassam_device_activity for delete to authenticated using (false);

-- Legacy sync table remains RPC/private-only if present.
do $$
begin
  if to_regclass('public.abu_bassam_sync') is not null then
    execute 'drop policy if exists abu_bassam_sync_deny_select on public.abu_bassam_sync';
    execute 'drop policy if exists abu_bassam_sync_deny_insert on public.abu_bassam_sync';
    execute 'drop policy if exists abu_bassam_sync_deny_update on public.abu_bassam_sync';
    execute 'drop policy if exists abu_bassam_sync_deny_delete on public.abu_bassam_sync';
    execute 'create policy abu_bassam_sync_deny_select on public.abu_bassam_sync for select to authenticated using (false)';
    execute 'create policy abu_bassam_sync_deny_insert on public.abu_bassam_sync for insert to authenticated with check (false)';
    execute 'create policy abu_bassam_sync_deny_update on public.abu_bassam_sync for update to authenticated using (false) with check (false)';
    execute 'create policy abu_bassam_sync_deny_delete on public.abu_bassam_sync for delete to authenticated using (false)';
  end if;
end $$;
