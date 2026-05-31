-- ============================================================
-- Run this in your Supabase SQL editor if the CASH bank
-- account is missing (needed for Cash payment method on
-- income/expense entries).
-- ============================================================
insert into public.bank_accounts (bank_id, bank_name, account_name, account_number, balance, tenant_id)
select 'CASH', 'Cash on Hand', 'Petty Cash', '0000000000', 500000, tenant_id
from public.tenants
on conflict (bank_id) do nothing;
