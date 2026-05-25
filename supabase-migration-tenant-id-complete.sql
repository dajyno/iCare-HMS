-- ============================================================
-- Phase 1: Add tenant_id columns to 8 remaining tables
-- Uses DO blocks so nonexistent tables are skipped gracefully
-- ============================================================

do $$
begin
  -- accounting tables (may or may not exist)
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'accounting_expenses') then
    alter table public.accounting_expenses add column if not exists tenant_id text references public.tenants(tenant_id);
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'accounting_income') then
    alter table public.accounting_income add column if not exists tenant_id text references public.tenants(tenant_id);
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'bank_accounts') then
    alter table public.bank_accounts add column if not exists tenant_id text references public.tenants(tenant_id);
  end if;

  -- inpatient tables
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'inpatient_vitals') then
    alter table public.inpatient_vitals add column if not exists tenant_id text references public.tenants(tenant_id);
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'inpatient_medication_schedules') then
    alter table public.inpatient_medication_schedules add column if not exists tenant_id text references public.tenants(tenant_id);
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'inpatient_fluid_entries') then
    alter table public.inpatient_fluid_entries add column if not exists tenant_id text references public.tenants(tenant_id);
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'inpatient_clinical_notes') then
    alter table public.inpatient_clinical_notes add column if not exists tenant_id text references public.tenants(tenant_id);
  end if;

  -- staff table
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'staff') then
    alter table public.staff add column if not exists tenant_id text references public.tenants(tenant_id);
  end if;
end $$;

-- ============================================================
-- Phase 2: Backfill tenant_id for existing demo rows
-- ============================================================

do $$
begin
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'accounting_expenses') then
    update public.accounting_expenses set tenant_id = 'T-DEMO-01' where tenant_id is null;
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'accounting_income') then
    update public.accounting_income set tenant_id = 'T-DEMO-01' where tenant_id is null;
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'bank_accounts') then
    update public.bank_accounts set tenant_id = 'T-DEMO-01' where tenant_id is null;
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'inpatient_vitals') then
    update public.inpatient_vitals set tenant_id = 'T-DEMO-01' where tenant_id is null;
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'inpatient_medication_schedules') then
    update public.inpatient_medication_schedules set tenant_id = 'T-DEMO-01' where tenant_id is null;
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'inpatient_fluid_entries') then
    update public.inpatient_fluid_entries set tenant_id = 'T-DEMO-01' where tenant_id is null;
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'inpatient_clinical_notes') then
    update public.inpatient_clinical_notes set tenant_id = 'T-DEMO-01' where tenant_id is null;
  end if;
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'staff') then
    update public.staff set tenant_id = 'T-DEMO-01' where tenant_id is null;
  end if;
end $$;
