-- ============================================================
-- iCare Pharmacy Module — Complete Migration
-- Safe to re-run: all statements use IF EXISTS / OR REPLACE
-- ============================================================

-- 1. DECREMENT STOCK RPC (used by Pharmacy dispensing)
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

-- 2. INSERT RLS POLICIES (needed for client-side writes)
-- ============================================================
drop policy if exists "Authenticated users can update consultations" on public.consultations;
create policy "Authenticated users can update consultations"
  on public.consultations for update
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert prescriptions" on public.prescriptions;
create policy "Authenticated users can insert prescriptions"
  on public.prescriptions for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can insert prescription items" on public.prescription_items;
create policy "Authenticated users can insert prescription items"
  on public.prescription_items for insert
  to authenticated
  with check (true);

drop policy if exists "Users can read all prescription items" on public.prescription_items;
create policy "Users can read all prescription items"
  on public.prescription_items for select
  to authenticated
  using (true);

-- Add quantity column if not present
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'prescription_items' and column_name = 'quantity'
  ) then
    alter table public.prescription_items add column quantity integer not null default 1;
  end if;
end
$$;

-- Add source_type column to invoices if not present
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invoices' and column_name = 'source_type'
  ) then
    alter table public.invoices add column source_type text not null default 'General';
  end if;
end
$$;

-- Add Unpaid/Paid to prescriptions status check + prescription_id on invoices
do $$
begin
  alter table public.prescriptions drop constraint if exists prescriptions_status_check;
  alter table public.prescriptions add constraint prescriptions_status_check
    check (status in ('Pending','Unpaid','Paid','Dispensed','PartiallyDispensed','Cancelled'));
exception when others then null;
end
$$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invoices' and column_name = 'prescription_id'
  ) then
    alter table public.invoices add column prescription_id uuid references public.prescriptions(id) on delete set null;
  end if;
end
$$;

-- Add UPDATE policy for lab_results (needed for LabDetailView upsert)
drop policy if exists "Users can update lab results" on public.lab_results;
create policy "Users can update lab results"
  on public.lab_results for update
  to authenticated
  using (true);

-- Wards: drop type check constraint (accept free-text department names)
alter table public.wards drop constraint if exists wards_type_check;
alter table public.wards drop constraint if exists check_type;

-- Wards: make department_id nullable
alter table public.wards alter column department_id drop not null;

-- INSERT/DELETE RLS for wards
drop policy if exists "Users can insert wards" on public.wards;
create policy "Users can insert wards"
  on public.wards for insert
  to authenticated
  with check (true);

drop policy if exists "Users can delete wards" on public.wards;
create policy "Users can delete wards"
  on public.wards for delete
  to authenticated
  using (true);

-- INSERT/DELETE RLS for beds
drop policy if exists "Users can insert beds" on public.beds;
create policy "Users can insert beds"
  on public.beds for insert
  to authenticated
  with check (true);

drop policy if exists "Users can delete beds" on public.beds;
create policy "Users can delete beds"
  on public.beds for delete
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert medications" on public.medications;
create policy "Authenticated users can insert medications"
  on public.medications for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can insert invoices" on public.invoices;
create policy "Authenticated users can insert invoices"
  on public.invoices for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can insert invoice_items" on public.invoice_items;
create policy "Authenticated users can insert invoice_items"
  on public.invoice_items for insert
  to authenticated
  with check (true);

drop policy if exists "Users can read all invoice_items" on public.invoice_items;
create policy "Users can read all invoice_items"
  on public.invoice_items for select
  to authenticated
  using (true);

-- 3. RPC: INSERT MEDICATION (bypasses RLS for pharmacy stock)
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

-- 4. RPC: BULK INSERT MEDICATIONS (bypasses RLS for CSV uploads)
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

-- 5. RPC: CREATE PHARMACY INVOICE (bypasses RLS for auto-invoicing)
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
    invoice_number, patient_id, total_amount, amount_paid, balance, status, source_type
  ) values (
    p_invoice_number, p_patient_id, p_total_amount, 0, p_total_amount, 'Unpaid', 'Pharmacy'
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
