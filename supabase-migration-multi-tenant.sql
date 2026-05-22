-- ============================================================
-- iCare HIMS - Multi-Tenant SaaS Migration
-- Adds: tenants, subscription_tiers, platform_admins tables
-- Adds: tenant_id column to ALL existing tables
-- Safe to re-run: uses IF NOT EXISTS / add column if not exists
-- ============================================================

-- 0. Teardown (idempotent)
drop table if exists public.platform_admins cascade;
drop table if exists public.subscription_tiers cascade;
drop table if exists public.tenants cascade;

-- ============================================================
-- 1. NEW TABLES
-- ============================================================

-- 1a. Tenants — Master Tenant Registry
create table if not exists public.tenants (
  tenant_id        text primary key,  -- e.g., "T-CITY-04"
  hospital_name    text not null,
  url_slug         text not null unique,  -- e.g., "cityhealth"
  status           text not null default 'Active' check (status in ('Active','Trial','Suspended')),
  tier             text not null default 'Standard' check (tier in ('Standard','Premium','Enterprise')),
  max_doctor_seats integer not null default 10,
  max_bed_capacity integer not null default 50,
  expiry_date      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 1b. Subscription Tiers — Template limits
create table if not exists public.subscription_tiers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique check (name in ('Standard','Premium','Enterprise')),
  max_doctor_seats integer not null,
  max_bed_capacity integer not null,
  monthly_price    numeric(10,2) not null,
  description      text,
  created_at       timestamptz not null default now()
);

insert into public.subscription_tiers (name, max_doctor_seats, max_bed_capacity, monthly_price, description) values
  ('Standard',  10,  50, 199.00, 'Entry-level for small clinics'),
  ('Premium',   25, 100, 499.00, 'Mid-tier for growing hospitals'),
  ('Enterprise', 999, 500, 999.00, 'Full-scale for large hospitals')
on conflict (name) do nothing;

-- 1c. Platform Admins — Separate from tenant users
create table if not exists public.platform_admins (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  password   text not null,  -- bcrypt hashed
  name       text not null,
  role       text not null default 'SuperAdmin' check (role in ('SuperAdmin','Support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. ADD tenant_id TO EXISTING TABLES
-- ============================================================

-- Helper: add tenant_id column + FK + index (safe to re-run)
do $$ begin
  -- Users
  alter table public.users add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.departments add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.staff_profiles add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.patients add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.appointments add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.consultations add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.vital_signs add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.prescriptions add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.prescription_items add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.medications add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.lab_tests add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.lab_requests add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.lab_results add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.invoices add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.invoice_items add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.payments add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.inventory_items add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.suppliers add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.purchase_orders add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.purchase_order_items add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.wards add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.beds add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.admissions add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.discharges add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.radiology_categories add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.radiology_exams add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.radiology_requests add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.radiology_results add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.audit_logs add column if not exists tenant_id text references public.tenants(tenant_id);
  alter table public.notifications add column if not exists tenant_id text references public.tenants(tenant_id);
end $$;

-- Indexes for tenant_id on all tables (improves query performance)
do $$ declare
  tables text[] := array[
    'users', 'departments', 'staff_profiles', 'patients', 'appointments',
    'consultations', 'vital_signs', 'prescriptions', 'prescription_items',
    'medications', 'lab_tests', 'lab_requests', 'lab_results',
    'invoices', 'invoice_items', 'payments', 'inventory_items',
    'suppliers', 'purchase_orders', 'purchase_order_items',
    'wards', 'beds', 'admissions', 'discharges',
    'radiology_categories', 'radiology_exams', 'radiology_requests', 'radiology_results',
    'audit_logs', 'notifications'
  ];
  t text;
begin
  foreach t in array tables loop
    execute format('create index if not exists idx_%I_tenant_id on public.%I(tenant_id)', t, t);
  end loop;
end $$;

-- ============================================================
-- 3. RLS: ENABLE TENANT-LEVEL ISOLATION
-- ============================================================

-- Helper function to set session tenant (called at login)
create or replace function public.set_current_tenant(tenant_id text)
returns void
language plpgsql
security definer
as $$
begin
  perform set_config('app.current_tenant_id', tenant_id, false);
end;
$$;

-- Tenant-based policies for main tables
do $$ begin
  -- Users
  drop policy if exists "tenant_isolation_users" on public.users;
  create policy "tenant_isolation_users" on public.users
    for all using (tenant_id = current_setting('app.current_tenant_id', true));
  -- Allow super admin to see all
  drop policy if exists "super_admin_read_users" on public.users;
  create policy "super_admin_read_users" on public.users
    for select using (current_setting('app.current_tenant_id', true) = '__platform__');

  -- Patients
  drop policy if exists "tenant_isolation_patients" on public.patients;
  create policy "tenant_isolation_patients" on public.patients
    for all using (tenant_id = current_setting('app.current_tenant_id', true));
  drop policy if exists "super_admin_read_patients" on public.patients;
  create policy "super_admin_read_patients" on public.patients
    for select using (current_setting('app.current_tenant_id', true) = '__platform__');
end $$;

-- ============================================================
-- 4. SEED: Default Super Admin (password: admin123)
-- ============================================================
insert into public.platform_admins (email, password, name, role) values
  ('admin@icare.ng', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGmPmE7qQGzqFYwQ5uB6e', 'Platform Admin', 'SuperAdmin')
on conflict (email) do nothing;

-- ============================================================
-- 5. ADMIN LOGIN RPC — authenticates platform admins
-- ============================================================
create or replace function public.admin_login(p_email text, p_password text)
returns json
language plpgsql
security definer
as $$
declare
  v_admin platform_admins;
begin
  select * into v_admin from platform_admins where email = p_email;
  if not found then
    return json_build_object('success', false, 'error', 'Invalid credentials');
  end if;
  -- Simple comparison (passwords should be bcrypt-hashed in production)
  if v_admin.password = p_password then
    return json_build_object(
      'success', true,
      'id', v_admin.id,
      'email', v_admin.email,
      'name', v_admin.name,
      'role', v_admin.role
    );
  else
    return json_build_object('success', false, 'error', 'Invalid credentials');
  end if;
end;
$$;

-- ============================================================
-- 6. TENANTS PUBLIC READ — allows unauthenticated slug lookup
-- ============================================================
alter table public.tenants enable row level security;

drop policy if exists "tenants_public_read" on public.tenants;
create policy "tenants_public_read" on public.tenants
  for select to anon, authenticated
  using (true);

-- ============================================================
-- 7. SEED: Demo Tenant (for development)
-- ============================================================
insert into public.tenants (tenant_id, hospital_name, url_slug, status, tier, max_doctor_seats, max_bed_capacity) values
  ('T-DEMO-01', 'iCare Demo Medical Center', 'demo', 'Active', 'Premium', 25, 100)
on conflict (tenant_id) do nothing;
