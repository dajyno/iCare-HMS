-- Run this in your Supabase SQL Editor (safe to re-run)

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
