-- ============================================================
-- Creates the `staff` table if missing and seeds demo records
-- for the demo tenant (T-DEMO-01).
-- Idempotent: safe to re-run.
-- ============================================================

-- 1. Create `staff` table if it does not already exist
create table if not exists public.staff (
  staff_id          text primary key,
  name              text not null,
  position          text not null,
  department        text not null default '',
  availability_status text not null default 'Active',
  is_clinician      boolean not null default false,
  gender            text not null default '',
  address           text not null default '',
  email             text not null default '',
  phone             text not null default '',
  can_login         boolean not null default false,
  password          text not null default '',
  profile_picture   text not null default '',
  auth_user_id      uuid,
  tenant_id         text references public.tenants(tenant_id),
  created_at        timestamptz not null default now()
);

-- 2. Seed demo staff records (idempotent via ON CONFLICT)
insert into public.staff (staff_id, name, position, department, availability_status, is_clinician, gender, email, phone, can_login, tenant_id) values
  ('STF001', 'Super Admin',        'Hospital Administration', 'Administrative',        'Active', false, 'Male',   'admin@icare.com',  '', true, 'T-DEMO-01'),
  ('STF002', 'Dr. Alice Smith',    'Medical Doctors',         'Clinical / Medical',     'Active', true,  'Female', 'alice@icare.com',  '', true, 'T-DEMO-01'),
  ('STF003', 'Dr. Bob Wilson',     'Medical Doctors',         'Clinical / Medical',     'Active', true,  'Male',   'bob@icare.com',    '', true, 'T-DEMO-01'),
  ('STF004', 'Nurse Jane',         'Nursing',                 'Clinical / Medical',     'Active', true,  'Female', 'jane@icare.com',   '', true, 'T-DEMO-01'),
  ('STF005', 'Sam Lab',            'Laboratory',              'Clinical Support Services', 'Active', false, 'Male',   'sam@icare.com',    '', true, 'T-DEMO-01'),
  ('STF006', 'Phil Pharmacist',    'Pharmacy',                'Clinical Support Services', 'Active', false, 'Male',   'phil@icare.com',   '', true, 'T-DEMO-01'),
  ('STF007', 'Demo User',          'Hospital Administration', 'Administrative',        'Active', false, 'Male',   'demo@icare.com',   '', true, 'T-DEMO-01')
on conflict (staff_id) do nothing;

-- 3. Row Level Security — allows anon/authenticated clients to read staff
alter table public.staff enable row level security;

drop policy if exists "staff_select_authenticated" on public.staff;
create policy "staff_select_authenticated"
  on public.staff for select
  to authenticated
  using (true);

drop policy if exists "staff_insert_authenticated" on public.staff;
create policy "staff_insert_authenticated"
  on public.staff for insert
  to authenticated
  with check (true);

drop policy if exists "staff_update_authenticated" on public.staff;
create policy "staff_update_authenticated"
  on public.staff for update
  to authenticated
  using (true)
  with check (true);
