-- ============================================================
-- Make global_settings per-tenant instead of single-row shared
-- ============================================================

-- Drop the single-row constraint (no longer applicable)
alter table public.global_settings drop constraint if exists single_row;

-- Add tenant_id column
alter table public.global_settings add column if not exists tenant_id text references public.tenants(tenant_id);

-- Drop old PK and recreate as composite (tenant_id, id)
alter table public.global_settings drop constraint if exists global_settings_pkey;
alter table public.global_settings add primary key (tenant_id, id);

-- Backfill existing demo row
update public.global_settings set tenant_id = 'T-DEMO-01' where tenant_id is null;

-- Drop old permissive RLS policies
drop policy if exists "authenticated read global_settings" on public.global_settings;
drop policy if exists "authenticated insert global_settings" on public.global_settings;
drop policy if exists "authenticated update global_settings" on public.global_settings;

-- Seed default settings for any existing tenants that don't have one
insert into public.global_settings (id, tenant_id, settings)
select 1, tenant_id, '{}'::jsonb
from public.tenants
where (tenant_id, 1) not in (select tenant_id, id from public.global_settings);
