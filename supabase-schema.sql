-- ============================================================
-- iCare HIMS - Supabase PostgreSQL Schema
-- Paste this entire file into your Supabase SQL Editor
-- ============================================================

-- 0a. Teardown — drops everything so this script is idempotent
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.decrement_stock(med_id uuid, qty int);

drop table if exists public.discharges cascade;
drop table if exists public.admissions cascade;
drop table if exists public.beds cascade;
drop table if exists public.wards cascade;
drop table if exists public.lab_results cascade;
drop table if exists public.lab_requests cascade;
drop table if exists public.prescription_items cascade;
drop table if exists public.prescriptions cascade;
drop table if exists public.vital_signs cascade;
drop table if exists public.consultations cascade;
drop table if exists public.appointments cascade;
drop table if exists public.invoice_items cascade;
drop table if exists public.payments cascade;
drop table if exists public.invoices cascade;
drop table if exists public.purchase_order_items cascade;
drop table if exists public.purchase_orders cascade;
drop table if exists public.inventory_items cascade;
drop table if exists public.suppliers cascade;
drop table if exists public.staff_profiles cascade;
drop table if exists public.notifications cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.medications cascade;
drop table if exists public.lab_tests cascade;
drop table if exists public.patients cascade;
drop table if exists public.users cascade;
drop table if exists public.departments cascade;

-- 0. Extensions
create extension if not exists "pgcrypto";

-- 1. Users table (linked to auth.users via UUID)
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null unique,
  phone         text,
  role          text not null check (role in ('SuperAdmin','HospitalAdmin','Receptionist','Doctor','Nurse','LabTechnician','Pharmacist','BillingOfficer','InventoryOfficer')),
  department_id uuid,
  status        text not null default 'active' check (status in ('active','inactive','suspended')),
  last_login    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. Departments
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text
);

alter table public.users add constraint fk_users_department
  foreign key (department_id) references public.departments(id);

-- 3. Staff Profiles
create table public.staff_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references public.users(id) on delete cascade,
  staff_id         text not null unique,
  department_id    uuid not null references public.departments(id),
  employment_type  text not null check (employment_type in ('Full-time','Part-time','Contract')),
  date_joined      timestamptz not null default now(),
  specialization   text,
  permissions      text default '{}'
);

-- 4. Patients
create table public.patients (
  id                uuid primary key default gen_random_uuid(),
  patient_id        text not null unique,
  first_name        text not null,
  last_name         text not null,
  gender            text not null,
  date_of_birth     date not null,
  phone             text not null,
  email             text,
  address           text,
  category          text not null default 'Individual' check (category in ('Individual','Family','Corporate','HMO')),
  status            text not null default 'active' check (status in ('active','inactive')),
  emergency_contact text,
  blood_group       text,
  allergies         text,
  medical_history   text,
  insurance_provider text,
  insurance_id      text,
  next_of_kin_name  text,
  next_of_kin_phone text,
  next_of_kin_relation text,
  company_name      text,
  company_phone     text,
  company_address   text,
  department_id     uuid references public.departments(id),
  family_id         uuid references public.patients(id),
  is_primary        boolean not null default false,
  registration_date timestamptz not null default now()
);

-- 5. Appointments
create table public.appointments (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id  uuid not null,
  date       date not null,
  time       text not null,
  reason     text,
  status     text not null default 'Scheduled' check (status in ('Scheduled','CheckedIn','Waiting','InConsultation','Completed','Cancelled','NoShow')),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Consultations
create table public.consultations (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  doctor_id       uuid not null,
  appointment_id  uuid unique references public.appointments(id),
  chief_complaint text not null,
  symptoms        text,
  diagnosis       text,
  clinical_notes  text,
  treatment_plan  text,
  follow_up_date  date,
  status          text not null default 'Completed',
  created_at      timestamptz not null default now()
);

-- 7. Vital Signs
create table public.vital_signs (
  id                uuid primary key default gen_random_uuid(),
  consultation_id   uuid not null unique references public.consultations(id) on delete cascade,
  temperature       double precision,
  blood_pressure    text,
  pulse_rate        integer,
  respiratory_rate  integer,
  weight            double precision,
  height            double precision,
  bmi               double precision,
  oxygen_saturation integer
);

-- 8. Medications
create table public.medications (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  generic_name      text,
  category          text,
  dosage_form       text,
  strength          text,
  batch_number      text,
  expiry_date       date,
  quantity_in_stock integer not null default 0,
  reorder_level     integer not null default 10,
  unit_price        double precision not null default 0,
  supplier          text,
  status            text not null default 'available'
);

-- 9. Prescriptions
create table public.prescriptions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  doctor_id       uuid not null,
  consultation_id uuid references public.consultations(id),
  date            timestamptz not null default now(),
  status          text not null default 'Pending' check (status in ('Pending','Dispensed','PartiallyDispensed','Cancelled'))
);

-- 10. Prescription Items
create table public.prescription_items (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medication_id   uuid not null references public.medications(id),
  dosage          text not null,
  frequency       text not null,
  duration        text not null,
  instructions    text
);

-- 11. Lab Tests
create table public.lab_tests (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  category        text,
  price           double precision not null default 0,
  sample_type     text,
  reference_range text,
  lead_time       text,
  status          text not null default 'active'
);

-- 12. Lab Requests
create table public.lab_requests (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  test_id         uuid not null references public.lab_tests(id),
  consultation_id uuid references public.consultations(id),
  batch_id        text,
  status          text not null default 'Requested' check (status in ('Requested','SampleCollected','InProgress','AwaitingValidation','Completed','Cancelled')),
  created_at      timestamptz not null default now()
);

-- 13. Lab Results
create table public.lab_results (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null unique references public.lab_requests(id) on delete cascade,
  patient_id       uuid not null references public.patients(id) on delete cascade,
  result_value     text not null,
  unit             text,
  reference_range  text,
  interpretation   text,
  technician_id    uuid references public.users(id),
  validated_by_id  uuid references public.users(id),
  date             timestamptz not null default now()
);

-- 14. Invoices
create table public.invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  patient_id     uuid not null references public.patients(id) on delete cascade,
  total_amount   double precision not null,
  amount_paid    double precision not null default 0,
  balance        double precision not null,
  status         text not null default 'Unpaid' check (status in ('Unpaid','PartiallyPaid','Paid','Refunded','Cancelled')),
  payment_method text,
  created_by     uuid references public.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 15. Invoice Items
create table public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity    integer not null,
  unit_price  double precision not null,
  total       double precision not null
);

-- 16. Payments
create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references public.invoices(id) on delete cascade,
  amount         double precision not null,
  payment_method text not null,
  transaction_id text,
  date           timestamptz not null default now()
);

-- 17. Wards
create table public.wards (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null check (type in ('General','Semi-Private','Private','ICU','Emergency')),
  beds_count    integer not null,
  department_id uuid not null references public.departments(id)
);

-- 18. Beds
create table public.beds (
  id        uuid primary key default gen_random_uuid(),
  bed_number text not null,
  ward_id   uuid not null references public.wards(id) on delete cascade,
  status    text not null default 'Available' check (status in ('Available','Occupied','Reserved','Cleaning','Maintenance'))
);

-- 19. Admissions
create table public.admissions (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.patients(id) on delete cascade,
  admission_date    timestamptz not null default now(),
  ward_id           uuid not null references public.wards(id),
  bed_id            uuid not null references public.beds(id),
  admitting_doctor_id uuid not null,
  diagnosis         text,
  notes             text,
  status            text not null default 'Admitted' check (status in ('Admitted','Discharged','Transferred'))
);

-- 20. Discharges
create table public.discharges (
  id            uuid primary key default gen_random_uuid(),
  admission_id  uuid not null unique references public.admissions(id) on delete cascade,
  discharge_date timestamptz not null default now(),
  summary       text,
  status        text not null default 'Completed'
);

-- 21. Suppliers
create table public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  contact_name text,
  email        text,
  phone        text,
  address      text
);

-- 22. Inventory Items
create table public.inventory_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text,
  sku           text unique,
  quantity      integer not null default 0,
  unit          text,
  reorder_level integer not null default 5,
  supplier_id   uuid references public.suppliers(id),
  cost_price    double precision,
  selling_price double precision,
  expiry_date   date,
  location      text,
  status        text not null default 'active',
  department_id uuid references public.departments(id)
);

-- 23. Purchase Orders
create table public.purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  po_number     text not null unique,
  supplier_id   uuid not null references public.suppliers(id),
  status        text not null default 'Draft' check (status in ('Draft','Submitted','Approved','Received','Cancelled')),
  requested_by  uuid references public.users(id),
  approved_by   uuid references public.users(id),
  total_cost    double precision not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 24. Purchase Order Items
create table public.purchase_order_items (
  id                uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_name         text not null,
  quantity          integer not null,
  unit_cost         double precision not null,
  total_cost        double precision not null
);

-- 25. Audit Logs
create table public.audit_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references public.users(id),
  action    text not null,
  entity    text,
  entity_id text,
  details   jsonb,
  timestamp timestamptz not null default now()
);

-- 26. Notifications
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  title      text not null,
  message    text not null,
  type       text not null check (type in ('Info','Warning','Alert')),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'Doctor')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
alter table public.users enable row level security;
alter table public.departments enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.consultations enable row level security;
alter table public.vital_signs enable row level security;
alter table public.medications enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;
alter table public.lab_tests enable row level security;
alter table public.lab_requests enable row level security;
alter table public.lab_results enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.wards enable row level security;
alter table public.beds enable row level security;
alter table public.admissions enable row level security;
alter table public.discharges enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

-- Users can read/insert/update their own profile
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role can manage all users
create policy "Users can read own profile"
  on public.departments for select
  to authenticated
  using (true);

create policy "Users can read all patients"
  on public.patients for select
  to authenticated
  using (true);

create policy "Users can read all appointments"
  on public.appointments for select
  to authenticated
  using (true);

create policy "Users can read all consultations"
  on public.consultations for select
  to authenticated
  using (true);

create policy "Users can read all medications"
  on public.medications for select
  to authenticated
  using (true);

create policy "Users can read all lab tests"
  on public.lab_tests for select
  to authenticated
  using (true);

create policy "Users can insert lab tests"
  on public.lab_tests for insert
  to authenticated
  with check (true);

create policy "Users can update lab tests"
  on public.lab_tests for update
  to authenticated
  using (true);

create policy "Users can read all lab requests"
  on public.lab_requests for select
  to authenticated
  using (true);

create policy "Users can read all lab results"
  on public.lab_results for select
  to authenticated
  using (true);

create policy "Users can read all inventory"
  on public.inventory_items for select
  to authenticated
  using (true);

create policy "Users can read all invoices"
  on public.invoices for select
  to authenticated
  using (true);

create policy "Users can read all beds"
  on public.beds for select
  to authenticated
  using (true);

create policy "Users can read all wards"
  on public.wards for select
  to authenticated
  using (true);

create policy "Users can read all admissions"
  on public.admissions for select
  to authenticated
  using (true);

create policy "Users can read all prescriptions"
  on public.prescriptions for select
  to authenticated
  using (true);

create policy "Users can read all suppliers"
  on public.suppliers for select
  to authenticated
  using (true);

create policy "Users can read all vital signs"
  on public.vital_signs for select
  to authenticated
  using (true);

-- Insert policies for write operations
create policy "Authenticated users can insert patients"
  on public.patients for insert
  to authenticated
  with check (true);

create policy "Authenticated users can insert appointments"
  on public.appointments for insert
  to authenticated
  with check (true);

create policy "Authenticated users can insert consultations"
  on public.consultations for insert
  to authenticated
  with check (true);

create policy "Authenticated users can insert vital signs"
  on public.vital_signs for insert
  to authenticated
  with check (true);

create policy "Authenticated users can insert prescriptions"
  on public.prescriptions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can insert prescription items"
  on public.prescription_items for insert
  to authenticated
  with check (true);

create policy "Authenticated users can insert lab requests"
  on public.lab_requests for insert
  to authenticated
  with check (true);

create policy "Authenticated users can insert lab results"
  on public.lab_results for insert
  to authenticated
  with check (true);

create policy "Authenticated users can insert lab tests"
  on public.lab_tests for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update prescriptions"
  on public.prescriptions for update
  to authenticated
  using (true);

create policy "Authenticated users can insert medications"
  on public.medications for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update medications"
  on public.medications for update
  to authenticated
  using (true);

create policy "Authenticated users can insert invoices"
  on public.invoices for insert
  to authenticated
  with check (true);

create policy "Authenticated users can insert invoice_items"
  on public.invoice_items for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update lab requests"
  on public.lab_requests for update
  to authenticated
  using (true);

create policy "Authenticated users can update beds"
  on public.beds for update
  to authenticated
  using (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Departments
insert into public.departments (name, description) values
  ('General Medicine', 'OPD and General ward'),
  ('Radiology', 'X-ray, MRI, CT scans'),
  ('Laboratory', 'Pathology and Blood tests'),
  ('Pharmacy', 'Main hospital pharmacy'),
  ('Emergency', '24/7 ER services'),
  ('Pediatrics', 'Children ward')
on conflict (name) do nothing;

-- Medications
insert into public.medications (name, dosage_form, strength, unit_price, quantity_in_stock) values
  ('Paracetamol', 'Tablet', '500mg', 0.5, 1000),
  ('Amoxicillin', 'Capsule', '250mg', 1.2, 500),
  ('Ibuprofen', 'Tablet', '400mg', 0.8, 800),
  ('Insulin', 'Injection', '100IU/ml', 45.0, 50)
on conflict do nothing;

-- Lab Tests
insert into public.lab_tests (name, category, price, sample_type) values
  ('Complete Blood Count', 'Hematology', 25.0, 'Blood'),
  ('Lipid Profile', 'Biochemistry', 40.0, 'Blood'),
  ('Urinalysis', 'Urology', 15.0, 'Urine'),
  ('Chest X-Ray', 'Radiology', 60.0, 'Imaging')
on conflict do nothing;

-- Patients (2 per category for testing)
insert into public.patients (patient_id, first_name, last_name, gender, date_of_birth, phone, email, address, category, status, blood_group, allergies, next_of_kin_name, next_of_kin_phone, next_of_kin_relation) values
  ('PAT001', 'John', 'Doe', 'Male', '1990-01-01', '1234567890', 'john@example.com', '123 Main St', 'Individual', 'active', 'O+', 'Penicillin', 'Jane Doe', '1234567891', 'Spouse'),
  ('PAT002', 'Sarah', 'Connor', 'Female', '1985-05-15', '0987654321', 'sarah@example.com', '456 Oak Rd', 'Individual', 'active', 'A-', null, null, null, null),
  ('ADEBAYO-001', 'Tunde', 'Adebayo', 'Male', '1980-03-10', '+2348043333333', 'tunde.adebayo@email.com', '7 Peace Close, Ibadan', 'Family', 'active', 'O-', null, 'Funke Adebayo', '+2348054444444', 'Spouse'),
  ('ADEBAYO-002', 'Funke', 'Adebayo', 'Female', '1985-08-17', '+2348054444444', 'funke.adebayo@email.com', '7 Peace Close, Ibadan', 'Family', 'active', 'B+', null, 'Tunde Adebayo', '+2348043333333', 'Spouse'),
  ('OKAFOR-001', 'Chuka', 'Okafor', 'Male', '1978-01-05', '+2348101111111', 'chuka.okafor@email.com', '23 Unity Rd, Enugu', 'Family', 'active', 'AB+', null, 'Ngozi Okafor', '+2348112222222', 'Spouse'),
  ('OKAFOR-002', 'Ngozi', 'Okafor', 'Female', '1982-06-30', '+2348112222222', 'ngozi.okafor@email.com', '23 Unity Rd, Enugu', 'Family', 'active', 'A-', null, 'Chuka Okafor', '+2348101111111', 'Spouse'),
  ('PAT004', 'Emeka', 'Nwosu', 'Male', '1992-01-30', '+2348065555555', 'emeka.nwosu@email.com', '10 Marina, Lagos', 'Corporate', 'active', 'B-', null, null, null, null),
  ('PAT005', 'Amara', 'Okafor', 'Female', '1990-07-14', '+2348076666666', 'amara.okafor@email.com', '22 Broad St, Lagos', 'Corporate', 'active', 'AB-', null, null, null, null),
  ('PAT006', 'Ibrahim', 'Musa', 'Male', '1975-12-05', '+2348087777777', 'ibrahim.musa@email.com', '5 Kano Rd, Kaduna', 'HMO', 'active', 'O+', null, null, null, null),
  ('PAT007', 'Ngozi', 'Eze', 'Female', '1988-04-20', '+2348098888888', 'ngozi.eze@email.com', '12 Enugu Rd, Port Harcourt', 'HMO', 'active', 'A-', null, null, null, null)
on conflict (patient_id) do nothing;

-- Corporate company info
update public.patients set company_name = 'ZenithCare Ltd', company_phone = '+2348120000001', company_address = 'Zenith Heights, Victoria Island, Lagos' where patient_id = 'PAT004';
update public.patients set company_name = 'FirstBank Plc', company_phone = '+2348120000002', company_address = 'Samuel Asabia House, Marina, Lagos' where patient_id = 'PAT005';

-- HMO insurance info
update public.patients set insurance_provider = 'Hygeia HMO', insurance_id = 'HGY-2024-001' where patient_id = 'PAT006';
update public.patients set insurance_provider = 'Reliance HMO', insurance_id = 'RLN-2024-002' where patient_id = 'PAT007';

-- Wards and Beds
do $$
declare
  gen_med_id uuid;
  ward_id uuid;
begin
  select id into gen_med_id from public.departments where name = 'General Medicine' limit 1;
  if gen_med_id is not null then
    insert into public.wards (name, type, beds_count, department_id)
    values ('Male Medical Ward', 'General', 10, gen_med_id)
    on conflict do nothing
    returning id into ward_id;
    if ward_id is not null then
      for i in 1..5 loop
        insert into public.beds (bed_number, ward_id, status)
        values ('M-BED-' || i, ward_id, 'Available')
        on conflict do nothing;
      end loop;
    end if;
  end if;
end $$;

-- ============================================================
-- ENSURE UNIQUE LAB TEST NAMES (safe to re-run)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lab_tests_name_key'
  ) then
    alter table public.lab_tests add constraint lab_tests_name_key unique (name);
  end if;
end;
$$;

-- ============================================================
-- DECREMENT STOCK RPC (used by Pharmacy dispensing)
-- ============================================================
create or replace function public.decrement_stock(med_id uuid, qty int)
returns void
language plpgsql
security definer
as $$
begin
  update public.medications
  set quantity_in_stock = greatest(quantity_in_stock - qty, 0)
  where id = med_id;
end;
$$;

-- ============================================================
-- INSERT MEDICATION (bypasses RLS for pharmacy stock)
-- ============================================================
create or replace function public.insert_medication(
  p_name text,
  p_dosage_form text default 'Tablet',
  p_unit_price double precision default 0,
  p_quantity_in_stock integer default 0,
  p_reorder_level integer default 10
) returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  insert into public.medications (
    name, dosage_form, unit_price, quantity_in_stock, reorder_level, status
  ) values (
    p_name, p_dosage_form, p_unit_price, p_quantity_in_stock, p_reorder_level, 'available'
  )
  returning id into new_id;
  return new_id;
end;
$$;

-- ============================================================
-- BULK INSERT MEDICATIONS (bypasses RLS for CSV uploads)
-- ============================================================
create or replace function public.bulk_insert_medications(p_items jsonb)
returns integer
language plpgsql
security definer
as $$
declare
  item jsonb;
  count integer := 0;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.medications (
      name, dosage_form, unit_price, quantity_in_stock, reorder_level, status
    ) values (
      item->>'name',
      coalesce(item->>'dosage_form', 'Tablet'),
      (item->>'unit_price')::double precision,
      (item->>'quantity_in_stock')::integer,
      coalesce((item->>'reorder_level')::integer, 10),
      'available'
    );
    count := count + 1;
  end loop;
  return count;
end;
$$;

-- ============================================================
-- CREATE PHARMACY INVOICE (bypasses RLS for auto-invoicing)
-- ============================================================
create or replace function public.create_pharmacy_invoice(
  p_invoice_number text,
  p_patient_id uuid,
  p_total_amount double precision,
  p_items jsonb
) returns uuid
language plpgsql
security definer
as $$
declare
  new_invoice_id uuid;
  item jsonb;
begin
  insert into public.invoices (
    invoice_number, patient_id, total_amount, amount_paid, balance, status
  ) values (
    p_invoice_number, p_patient_id, p_total_amount, 0, p_total_amount, 'Unpaid'
  )
  returning id into new_invoice_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.invoice_items (
      invoice_id, description, quantity, unit_price, total
    ) values (
      new_invoice_id,
      item->>'description',
      (item->>'quantity')::integer,
      (item->>'unit_price')::double precision,
      (item->>'total')::double precision
    );
  end loop;

  return new_invoice_id;
end;
$$;

-- ============================================================
-- MIGRATION: Add family_id / is_primary (safe to re-run)
-- ============================================================
alter table public.patients add column if not exists family_id uuid references public.patients(id);
alter table public.patients add column if not exists is_primary boolean not null default false;

-- Backfill: set first-registered member of each family lastName group as primary
update public.patients set is_primary = true
where id in (
  select distinct on (last_name) id from public.patients
  where category = 'Family' and is_primary = false
  order by last_name, registration_date
);

-- Backfill: link all family members to their primary by lastName
update public.patients p set family_id = (
  select pp.id from public.patients pp
  where pp.category = 'Family' and pp.is_primary = true and pp.last_name = p.last_name
  limit 1
)
where p.category = 'Family' and p.family_id is null and p.is_primary = false;

-- ============================================================
-- DROP FK CONSTRAINTS that reference public.users(id)
-- These were removed from CREATE TABLE above but may still exist
-- in databases that ran an earlier version of the schema.
-- Safe to re-run: IF EXISTS prevents errors.
-- ============================================================
alter table public.appointments   drop constraint if exists appointments_doctor_id_fkey;
alter table public.consultations  drop constraint if exists consultations_doctor_id_fkey;
alter table public.prescriptions  drop constraint if exists prescriptions_doctor_id_fkey;
alter table public.admissions     drop constraint if exists admissions_admitting_doctor_id_fkey;

-- ============================================================
-- ENSURE LAB TEST (bypasses RLS for test creation)
-- ============================================================
create or replace function public.ensure_lab_test(test_name text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.lab_tests where name = test_name;
  if v_id is null then
    insert into public.lab_tests (name, status) values (test_name, 'active')
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- ============================================================
-- RADIOLOGY TABLES
-- ============================================================

create table if not exists public.radiology_categories (
  id uuid not null default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  icon text
);

create table if not exists public.radiology_exams (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  category_id uuid not null references public.radiology_categories(id) on delete cascade,
  price numeric(10,2) not null default 0,
  description text,
  preparation_notes text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.radiology_requests (
  id uuid not null default gen_random_uuid() primary key,
  patient_id uuid not null references public.patients(id) on delete cascade,
  exam_id uuid not null references public.radiology_exams(id) on delete cascade,
  folder_no text,
  batch_id text,
  status text not null default 'Requested' check (status in ('Requested','InProgress','Completed','Cancelled')),
  requested_by_id uuid,
  radiologist_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.radiology_results (
  id uuid not null default gen_random_uuid() primary key,
  request_id uuid not null unique references public.radiology_requests(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  findings text not null default '',
  conclusion text not null default '',
  technician_id uuid,
  radiologist_id uuid,
  report_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.radiology_categories enable row level security;
alter table public.radiology_exams enable row level security;
alter table public.radiology_requests enable row level security;
alter table public.radiology_results enable row level security;

create policy "Authenticated users can read radiology_categories"
  on public.radiology_categories for select to authenticated using (true);
create policy "Authenticated users can insert radiology_categories"
  on public.radiology_categories for insert to authenticated with check (true);
create policy "Authenticated users can update radiology_categories"
  on public.radiology_categories for update to authenticated using (true);
create policy "Authenticated users can read radiology_exams"
  on public.radiology_exams for select to authenticated using (true);
create policy "Authenticated users can insert radiology_exams"
  on public.radiology_exams for insert to authenticated with check (true);
create policy "Authenticated users can update radiology_exams"
  on public.radiology_exams for update to authenticated using (true);
create policy "Authenticated users can insert radiology_requests"
  on public.radiology_requests for insert to authenticated with check (true);
create policy "Authenticated users can read radiology_requests"
  on public.radiology_requests for select to authenticated using (true);
create policy "Authenticated users can update radiology_requests"
  on public.radiology_requests for update to authenticated using (true);
create policy "Authenticated users can insert radiology_results"
  on public.radiology_results for insert to authenticated with check (true);
create policy "Authenticated users can read radiology_results"
  on public.radiology_results for select to authenticated using (true);
create policy "Authenticated users can update radiology_results"
  on public.radiology_results for update to authenticated using (true);

-- Radiology seed data
insert into public.radiology_categories (name, description, icon) values
  ('X-Ray', 'Radiography examinations', 'Scan'),
  ('Ultrasound', 'Ultrasonography examinations', 'Radio'),
  ('CT-Scan', 'Computed Tomography scans', 'Scan'),
  ('MRI', 'Magnetic Resonance Imaging', 'Scan')
on conflict (name) do nothing;

insert into public.radiology_exams (name, category_id, price, description, preparation_notes) values
  ('Chest X-Ray', (select id from public.radiology_categories where name = 'X-Ray'), 60.0, 'Standard chest radiograph', 'Remove metal objects from chest area'),
  ('Spine X-Ray', (select id from public.radiology_categories where name = 'X-Ray'), 80.0, 'Spine radiograph series', 'Wear comfortable clothing without metal'),
  ('Limb X-Ray', (select id from public.radiology_categories where name = 'X-Ray'), 50.0, 'Extremity radiograph', 'Remove jewelry from the area being imaged'),
  ('Abdominal Ultrasound', (select id from public.radiology_categories where name = 'Ultrasound'), 100.0, 'Abdominal sonography', 'Fast for 6-8 hours before exam'),
  ('Pelvic Ultrasound', (select id from public.radiology_categories where name = 'Ultrasound'), 90.0, 'Pelvic sonography', 'Drink 1L water 1 hour before exam'),
  ('Obstetric Ultrasound', (select id from public.radiology_categories where name = 'Ultrasound'), 120.0, 'Obstetric sonography', 'Drink 1L water 1 hour before exam'),
  ('Head CT-Scan', (select id from public.radiology_categories where name = 'CT-Scan'), 250.0, 'Cranial CT with contrast', 'Remove all metal objects, inform if pregnant'),
  ('Chest CT-Scan', (select id from public.radiology_categories where name = 'CT-Scan'), 300.0, 'Thoracic CT scan', 'No food 4 hours prior if contrast needed'),
  ('Abdomen CT-Scan', (select id from public.radiology_categories where name = 'CT-Scan'), 350.0, 'Abdominal CT with contrast', 'Fast 6 hours before, drink oral contrast as directed'),
  ('Brain MRI', (select id from public.radiology_categories where name = 'MRI'), 400.0, 'Brain MRI with and without contrast', 'Remove all metal, inform if claustrophobic or have pacemaker'),
  ('Spine MRI', (select id from public.radiology_categories where name = 'MRI'), 450.0, 'Spine MRI series', 'Remove all metal, inform if claustrophobic'),
  ('Knee MRI', (select id from public.radiology_categories where name = 'MRI'), 380.0, 'Knee MRI', 'Remove all metal, wear loose clothing')
on conflict do nothing;

