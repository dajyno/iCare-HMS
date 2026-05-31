-- ============================================================
-- Create accounting tables: bank_accounts, accounting_income, accounting_expenses
-- ============================================================

create table if not exists public.bank_accounts (
  bank_id text primary key,
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  balance numeric(12,2) not null default 0,
  tenant_id text references public.tenants(tenant_id),
  created_at timestamptz not null default now()
);

create table if not exists public.accounting_income (
  id text primary key,
  amount numeric(12,2) not null,
  category text not null,
  bank_id text not null references public.bank_accounts(bank_id),
  status text not null default 'Pending' check (status in ('Pending', 'Verified')),
  date text not null,
  description text,
  patient_id text,
  patient_name text,
  payment_method text not null,
  tenant_id text references public.tenants(tenant_id),
  created_at timestamptz not null default now()
);

create table if not exists public.accounting_expenses (
  id text primary key,
  amount numeric(12,2) not null,
  category text not null,
  bank_id text not null references public.bank_accounts(bank_id),
  status text not null default 'Pending' check (status in ('Pending', 'Verified')),
  date text not null,
  description text,
  payee text,
  payment_method text not null,
  tenant_id text references public.tenants(tenant_id),
  created_at timestamptz not null default now()
);

-- Seed demo data for existing tenant
insert into public.bank_accounts (bank_id, bank_name, account_name, account_number, balance, tenant_id)
values
  ('B-01', 'GTBank', 'Operations', '0123456789', 1500000, 'T-DEMO-01'),
  ('B-02', 'First Bank', 'Payroll', '2012345678', 850000, 'T-DEMO-01'),
  ('B-03', 'Access Bank', 'Reserve', '3012345678', 2100000, 'T-DEMO-01'),
  ('CASH', 'Cash on Hand', 'Petty Cash', '0000000000', 500000, 'T-DEMO-01')
on conflict (bank_id) do nothing;

insert into public.accounting_income (id, amount, category, bank_id, status, date, description, patient_id, patient_name, payment_method, tenant_id)
values
  ('INC-001', 25000, 'Service', 'B-01', 'Verified', '2026-05-20', 'Consultation fee', 'PT-001', 'Jerel Kevin Parocha', 'Cash', 'T-DEMO-01'),
  ('INC-002', 45000, 'Pharmacy', 'B-01', 'Verified', '2026-05-20', 'Medication sales', 'PT-002', 'Charity Enyioko', 'Card', 'T-DEMO-01'),
  ('INC-003', 12000, 'Lab', 'B-02', 'Pending', '2026-05-19', 'Blood test payment', 'PT-003', 'Amara Okafor', 'Transfer', 'T-DEMO-01'),
  ('INC-004', 80000, 'Inpatient', 'B-01', 'Verified', '2026-05-19', 'Admission deposit', 'PT-004', 'Chuka Okafor', 'Cash', 'T-DEMO-01'),
  ('INC-005', 3000, 'Service', 'B-03', 'Pending', '2026-05-18', 'Folder fee', 'PT-005', 'Ibrahim Musa', 'Card', 'T-DEMO-01')
on conflict (id) do nothing;

insert into public.accounting_expenses (id, amount, category, bank_id, status, date, description, payee, payment_method, tenant_id)
values
  ('EXP-001', 10000, 'Utility', 'B-01', 'Pending', '2026-05-20', 'Electricity bill', 'PHCN', 'Transfer', 'T-DEMO-01'),
  ('EXP-002', 50000, 'Salary', 'B-02', 'Verified', '2026-05-19', 'Staff salary advance', 'Nurse Ade', 'Transfer', 'T-DEMO-01'),
  ('EXP-003', 15000, 'Supply', 'B-01', 'Verified', '2026-05-18', 'Medical supplies', 'MedSupply Ltd', 'Transfer', 'T-DEMO-01'),
  ('EXP-004', 7500, 'Maintenance', 'B-03', 'Pending', '2026-05-17', 'Generator maintenance', 'John Electric', 'Cash', 'T-DEMO-01')
on conflict (id) do nothing;
