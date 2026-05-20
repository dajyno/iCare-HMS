-- ============================================================
-- Phase 2 Migration: Inpatient Clinical Data Persistence
-- Run in your Supabase SQL Editor after supabase-schema.sql
-- ============================================================

-- 1. Inpatient Vitals
create table if not exists public.inpatient_vitals (
  id            uuid primary key default gen_random_uuid(),
  admission_id  uuid not null references public.admissions(id) on delete cascade,
  bp            text not null,
  pulse         integer not null,
  temp          numeric not null,
  spo2          integer not null,
  observations  text,
  recorded_at   timestamptz not null default now()
);

alter table public.inpatient_vitals enable row level security;

drop policy if exists "Users can read all inpatient vitals" on public.inpatient_vitals;
create policy "Users can read all inpatient vitals"
  on public.inpatient_vitals for select
  to authenticated
  using (true);

drop policy if exists "Users can insert inpatient vitals" on public.inpatient_vitals;
create policy "Users can insert inpatient vitals"
  on public.inpatient_vitals for insert
  to authenticated
  with check (true);

drop policy if exists "Users can delete inpatient vitals" on public.inpatient_vitals;
create policy "Users can delete inpatient vitals"
  on public.inpatient_vitals for delete
  to authenticated
  using (true);

-- 2. Inpatient Medication Schedules
create table if not exists public.inpatient_medication_schedules (
  id              uuid primary key default gen_random_uuid(),
  admission_id    uuid not null references public.admissions(id) on delete cascade,
  drug_id         text not null,
  drug_name       text not null,
  quantity        integer not null default 1,
  unit_price      numeric not null default 0,
  frequency       text not null,
  assigned_slots  jsonb not null default '[]'::jsonb,
  admin_log       jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

alter table public.inpatient_medication_schedules enable row level security;

drop policy if exists "Users can read all inpatient med schedules" on public.inpatient_medication_schedules;
create policy "Users can read all inpatient med schedules"
  on public.inpatient_medication_schedules for select
  to authenticated
  using (true);

drop policy if exists "Users can insert inpatient med schedules" on public.inpatient_medication_schedules;
create policy "Users can insert inpatient med schedules"
  on public.inpatient_medication_schedules for insert
  to authenticated
  with check (true);

drop policy if exists "Users can update inpatient med schedules" on public.inpatient_medication_schedules;
create policy "Users can update inpatient med schedules"
  on public.inpatient_medication_schedules for update
  to authenticated
  using (true);

drop policy if exists "Users can delete inpatient med schedules" on public.inpatient_medication_schedules;
create policy "Users can delete inpatient med schedules"
  on public.inpatient_medication_schedules for delete
  to authenticated
  using (true);

-- 3. Inpatient Fluid Entries
create table if not exists public.inpatient_fluid_entries (
  id            uuid primary key default gen_random_uuid(),
  admission_id  uuid not null references public.admissions(id) on delete cascade,
  type          text not null check (type in ('intake','output')),
  source        text not null,
  volume        numeric not null,
  recorded_at   timestamptz not null default now()
);

alter table public.inpatient_fluid_entries enable row level security;

drop policy if exists "Users can read all inpatient fluid entries" on public.inpatient_fluid_entries;
create policy "Users can read all inpatient fluid entries"
  on public.inpatient_fluid_entries for select
  to authenticated
  using (true);

drop policy if exists "Users can insert inpatient fluid entries" on public.inpatient_fluid_entries;
create policy "Users can insert inpatient fluid entries"
  on public.inpatient_fluid_entries for insert
  to authenticated
  with check (true);

drop policy if exists "Users can delete inpatient fluid entries" on public.inpatient_fluid_entries;
create policy "Users can delete inpatient fluid entries"
  on public.inpatient_fluid_entries for delete
  to authenticated
  using (true);

-- 4. Inpatient Clinical Notes (single row per admission — upsert by admission_id)
create table if not exists public.inpatient_clinical_notes (
  id            uuid primary key default gen_random_uuid(),
  admission_id  uuid not null unique references public.admissions(id) on delete cascade,
  content       text not null,
  recorded_at   timestamptz not null default now()
);

alter table public.inpatient_clinical_notes enable row level security;

drop policy if exists "Users can read all inpatient clinical notes" on public.inpatient_clinical_notes;
create policy "Users can read all inpatient clinical notes"
  on public.inpatient_clinical_notes for select
  to authenticated
  using (true);

drop policy if exists "Users can insert inpatient clinical notes" on public.inpatient_clinical_notes;
create policy "Users can insert inpatient clinical notes"
  on public.inpatient_clinical_notes for insert
  to authenticated
  with check (true);

drop policy if exists "Users can update inpatient clinical notes" on public.inpatient_clinical_notes;
create policy "Users can update inpatient clinical notes"
  on public.inpatient_clinical_notes for update
  to authenticated
  using (true);
