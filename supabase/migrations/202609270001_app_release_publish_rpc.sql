create or replace function public.abu_bassam_publish_app_release(
  p_version text,
  p_version_code integer,
  p_changelog text,
  p_storage_path text,
  p_sha256 text,
  p_signing_cert_sha256 text,
  p_mandatory boolean default false,
  p_min_supported_code integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_version text := trim(coalesce(p_version,''));
  v_path text := trim(coalesce(p_storage_path,''));
  v_sha text := lower(trim(coalesce(p_sha256,'')));
  v_cert text := lower(trim(coalesce(p_signing_cert_sha256,'')));
  v_min integer := coalesce(p_min_supported_code,p_version_code);
  v_row public.abu_bassam_app_releases%rowtype;
begin
  if v_version !~ '^[0-9]+\.[0-9]+\.[0-9]+([.-][A-Za-z0-9]+)*$' then raise exception 'INVALID_RELEASE_VERSION'; end if;
  if p_version_code is null or p_version_code < 1 then raise exception 'INVALID_RELEASE_CODE'; end if;
  if v_min < 1 or v_min > p_version_code then raise exception 'INVALID_MIN_SUPPORTED_CODE'; end if;
  if length(v_path) < 10 or length(v_path) > 400 or v_path not like 'app-releases/%' or position('..' in v_path) > 0 or position('\\' in v_path) > 0 or right(lower(v_path),4) <> '.apk' then raise exception 'INVALID_RELEASE_STORAGE_PATH'; end if;
  if v_sha !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_RELEASE_SHA256'; end if;
  if v_cert !~ '^[0-9a-f:]{64,95}$' then raise exception 'INVALID_RELEASE_CERTIFICATE'; end if;
  update public.abu_bassam_app_releases set active=false where channel='stable' and active=true;
  insert into public.abu_bassam_app_releases(version,version_code,channel,mandatory,min_supported_code,changelog,storage_bucket,storage_path,sha256,signing_cert_sha256,published_at,active)
  values(v_version,p_version_code,'stable',coalesce(p_mandatory,false),v_min,left(coalesce(p_changelog,''),12000),'abu-bassam-private',v_path,v_sha,v_cert,now(),true)
  on conflict(version,channel) do update set version_code=excluded.version_code,mandatory=excluded.mandatory,min_supported_code=excluded.min_supported_code,changelog=excluded.changelog,storage_bucket=excluded.storage_bucket,storage_path=excluded.storage_path,sha256=excluded.sha256,signing_cert_sha256=excluded.signing_cert_sha256,published_at=excluded.published_at,active=true
  returning * into v_row;
  return jsonb_build_object('ok',true,'version',v_row.version,'version_code',v_row.version_code,'storage_path',v_row.storage_path,'sha256',v_row.sha256,'signing_cert_sha256',v_row.signing_cert_sha256,'published_at',v_row.published_at);
end;
$$;

revoke all on function public.abu_bassam_publish_app_release(text,integer,text,text,text,text,boolean,integer) from public, anon, authenticated;
grant execute on function public.abu_bassam_publish_app_release(text,integer,text,text,text,text,boolean,integer) to service_role;
