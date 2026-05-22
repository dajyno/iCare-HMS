-- ============================================================
-- iCare HIMS - Subscription Tier Enforcement Migration
-- Renames columns, adds allowed_modules, updates seed values
-- Safe to re-run: uses IF NOT EXISTS / alter column if exists
-- ============================================================

-- 1. Rename max_doctor_seats → max_staff_seats on tenants
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tenants' and column_name = 'max_doctor_seats'
  ) then
    alter table public.tenants rename column max_doctor_seats to max_staff_seats;
  end if;
end $$;

-- 2. Rename max_doctor_seats → max_staff_seats on subscription_tiers
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscription_tiers' and column_name = 'max_doctor_seats'
  ) then
    alter table public.subscription_tiers rename column max_doctor_seats to max_staff_seats;
  end if;
end $$;

-- 3. Add allowed_modules to subscription_tiers
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscription_tiers' and column_name = 'allowed_modules'
  ) then
    alter table public.subscription_tiers add column allowed_modules text not null default '[]';
  end if;
end $$;

-- 4. Add allowed_modules_override to tenants
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tenants' and column_name = 'allowed_modules_override'
  ) then
    alter table public.tenants add column allowed_modules_override text;
  end if;
end $$;

-- 5. Update subscription tier seed values to match spec
update public.subscription_tiers
set
  max_staff_seats = 10,
  max_bed_capacity = 0,
  monthly_price = 199.00,
  description = 'Entry-level for small clinics (outpatient only)',
  allowed_modules = '["emr","reception","billing"]'
where name = 'Standard';

update public.subscription_tiers
set
  max_staff_seats = 50,
  max_bed_capacity = 40,
  monthly_price = 499.00,
  description = 'Mid-tier for growing hospitals with inpatient',
  allowed_modules = '["emr","reception","billing","pharmacy","laboratory","hmo_insurance"]'
where name = 'Premium';

update public.subscription_tiers
set
  max_staff_seats = 99999,
  max_bed_capacity = 99999,
  monthly_price = 999.00,
  description = 'Full-scale for large multi-branch networks',
  allowed_modules = '["emr","reception","billing","pharmacy","laboratory","hmo_insurance","multi_branch","human_resources","accounting"]'
where name = 'Enterprise';

-- 6. Sync existing tenants to their tier's new limit values
update public.tenants t
set
  max_staff_seats = s.max_staff_seats,
  max_bed_capacity = s.max_bed_capacity
from public.subscription_tiers s
where t.tier = s.name;

-- 7. Update demo tenant specifically
update public.tenants
set
  max_staff_seats = 50,
  max_bed_capacity = 40
where tenant_id = 'T-DEMO-01';
