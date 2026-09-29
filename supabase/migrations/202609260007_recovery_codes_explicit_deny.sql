-- Defense in depth: recovery-code hashes are server-gateway-only even if table grants change later.
drop policy if exists abu_bassam_recovery_codes_deny_client on public.abu_bassam_recovery_codes;
create policy abu_bassam_recovery_codes_deny_client
  on public.abu_bassam_recovery_codes
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);
