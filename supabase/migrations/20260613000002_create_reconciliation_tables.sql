-- ============================================================
-- Create reconciliation tables + add reconciled_at to existing tables
-- Create audit_logs table + RLS for multi-tenant support
-- ============================================================

-- 1. Create audit_logs table (if not already present from supabase-schema.sql)
create table if not exists public.audit_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid,
  action    text not null,
  entity    text,
  entity_id text,
  details   jsonb,
  tenant_id text,
  timestamp timestamptz not null default now()
);

-- Add tenant_id if table already existed without it
alter table public.audit_logs add column if not exists tenant_id text;

-- 2. Add reconciled_at to accounting_income / accounting_expenses
alter table public.accounting_income
  add column if not exists reconciled_at timestamptz;
alter table public.accounting_expenses
  add column if not exists reconciled_at timestamptz;

-- 3. Create reconciliation_sessions table (with tenant_id for multi-tenant filtering)
create table if not exists public.reconciliation_sessions (
  id             text primary key,
  bank_id        text not null references public.bank_accounts(bank_id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  opening_balance numeric(12,2) not null default 0,
  closing_balance numeric(12,2),
  status         text not null default 'Open' check (status in ('Open', 'Completed')),
  notes          text,
  created_by     text,
  tenant_id      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Add tenant_id if table already existed without it
alter table public.reconciliation_sessions add column if not exists tenant_id text;

-- 4. Create reconciliation_entries table (with tenant_id for multi-tenant filtering)
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
  matched_at   timestamptz,
  tenant_id    text
);

-- Add tenant_id if table already existed without it
alter table public.reconciliation_entries add column if not exists tenant_id text;

-- 5. RLS for audit_logs
alter table public.audit_logs enable row level security;

drop policy if exists "authenticated select audit_logs" on public.audit_logs;
create policy "authenticated select audit_logs"
  on public.audit_logs for select
  to authenticated
  using (true);

drop policy if exists "authenticated insert audit_logs" on public.audit_logs;
create policy "authenticated insert audit_logs"
  on public.audit_logs for insert
  to authenticated
  with check (true);

-- 6. RLS for reconciliation tables
alter table public.reconciliation_sessions enable row level security;
alter table public.reconciliation_entries enable row level security;

drop policy if exists "authenticated all reconciliation_sessions" on public.reconciliation_sessions;
create policy "authenticated all reconciliation_sessions"
  on public.reconciliation_sessions for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated all reconciliation_entries" on public.reconciliation_entries;
create policy "authenticated all reconciliation_entries"
  on public.reconciliation_entries for all
  to authenticated
  using (true)
  with check (true);

-- 7. Indexes
create index if not exists idx_audit_logs_tenant on public.audit_logs(tenant_id);
create index if not exists idx_audit_logs_user on public.audit_logs(user_id);
create index if not exists idx_recon_sessions_bank on public.reconciliation_sessions(bank_id);
create index if not exists idx_recon_sessions_tenant on public.reconciliation_sessions(tenant_id);
create index if not exists idx_recon_entries_session on public.reconciliation_entries(session_id);
create index if not exists idx_recon_entries_tenant on public.reconciliation_entries(tenant_id);
create index if not exists idx_recon_entries_source on public.reconciliation_entries(source_type, source_id);
create index if not exists idx_income_reconciled on public.accounting_income(reconciled_at) where reconciled_at is null;
create index if not exists idx_expense_reconciled on public.accounting_expenses(reconciled_at) where reconciled_at is null;
