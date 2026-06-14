-- ============================================================
-- Create reconciliation tables + add reconciled_at to existing tables
-- Also add INSERT RLS policy for audit_logs (needed by auditLogger)
-- ============================================================

-- 1. Add reconciled_at to accounting_income
alter table public.accounting_income
  add column if not exists reconciled_at timestamptz;

-- 2. Add reconciled_at to accounting_expenses
alter table public.accounting_expenses
  add column if not exists reconciled_at timestamptz;

-- 3. Create reconciliation_sessions table
create table if not exists public.reconciliation_sessions (
  id           text primary key,
  bank_id      text not null references public.bank_accounts(bank_id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  opening_balance numeric(12,2) not null default 0,
  closing_balance  numeric(12,2),
  status       text not null default 'Open' check (status in ('Open', 'Completed')),
  notes        text,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 4. Create reconciliation_entries table
create table if not exists public.reconciliation_entries (
  id           text primary key,
  session_id   text not null references public.reconciliation_sessions(id) on delete cascade,
  source_type  text not null check (source_type in ('Income', 'Expense')),
  source_id    text,
  statement_date      date not null,
  statement_description text,
  statement_amount    numeric(12,2) not null,
  statement_type      text not null check (statement_type in ('Credit', 'Debit')),
  match_type   text not null default 'Manual' check (match_type in ('Manual', 'Auto')),
  matched_at   timestamptz
);

-- 5. Add RLS policies for audit_logs (used by auditLogger.ts)
alter table public.audit_logs enable row level security;

create policy "authenticated insert audit_logs"
  on public.audit_logs for insert
  to authenticated
  with check (true);

-- 6. RLS for reconciliation tables (same pattern as accounting tables)
alter table public.reconciliation_sessions enable row level security;
alter table public.reconciliation_entries enable row level security;

create policy "authenticated all reconciliation_sessions"
  on public.reconciliation_sessions for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated all reconciliation_entries"
  on public.reconciliation_entries for all
  to authenticated
  using (true)
  with check (true);

-- 7. Indexes
create index if not exists idx_recon_sessions_bank on public.reconciliation_sessions(bank_id);
create index if not exists idx_recon_entries_session on public.reconciliation_entries(session_id);
create index if not exists idx_recon_entries_source on public.reconciliation_entries(source_type, source_id);
create index if not exists idx_income_reconciled on public.accounting_income(reconciled_at) where reconciled_at is null;
create index if not exists idx_expense_reconciled on public.accounting_expenses(reconciled_at) where reconciled_at is null;
