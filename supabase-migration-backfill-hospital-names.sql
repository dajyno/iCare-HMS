-- Backfill hospital_name from tenants table into global_settings for existing tenants
update public.global_settings gs
set settings = jsonb_set(gs.settings, '{hospitalName}', to_jsonb(t.hospital_name))
from public.tenants t
where t.tenant_id = gs.tenant_id
  and (gs.settings->>'hospitalName' is distinct from t.hospital_name);
