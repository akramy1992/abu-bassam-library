do $$
declare
  v_expected constant text := '9ed30ea3d1b0faaabdb8d51b8e82c675ccdaec77c1565ffba2aefb811a528112';
  v_existing text;
begin
  select signing_cert_sha256 into v_existing
    from public.abu_bassam_app_releases
   where channel='stable' and version_code=500
   limit 1;

  if not found then
    raise exception 'RELEASE_BASELINE_NOT_FOUND';
  end if;

  if nullif(replace(lower(coalesce(v_existing,'')),':',''),'') is not null
     and replace(lower(v_existing),':','') <> v_expected then
    raise exception 'RELEASE_BASELINE_CERTIFICATE_CONFLICT';
  end if;

  update public.abu_bassam_app_releases
     set signing_cert_sha256=v_expected
   where channel='stable' and version_code=500;
end;
$$;
