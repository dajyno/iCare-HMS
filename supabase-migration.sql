-- Safe migration — only adds missing RLS policies and drops FK constraints
-- Paste this into your Supabase SQL Editor and click "Run"

-- ============================================================
-- 1. RLS policies for public.users (INSERT / UPDATE)
-- ============================================================
drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- 2. Drop FK constraints on doctor_id columns
--    (the CREATE TABLE statements no longer include them)
-- ============================================================
alter table public.appointments   drop constraint if exists appointments_doctor_id_fkey;
alter table public.consultations  drop constraint if exists consultations_doctor_id_fkey;
alter table public.prescriptions  drop constraint if exists prescriptions_doctor_id_fkey;
alter table public.admissions     drop constraint if exists admissions_admitting_doctor_id_fkey;

-- ============================================================
-- 3. Add created_at to vital_signs (column does not exist yet)
--    Existing rows get now() as the default value.
-- ============================================================
alter table public.vital_signs add column if not exists created_at timestamptz not null default now();
