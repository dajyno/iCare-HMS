-- Allow authenticated users to read all active Doctor profiles
-- so the appointment scheduling grid can list consultants via the anon-key client.
drop policy if exists "Users can read doctor profiles" on public.users;
create policy "Users can read doctor profiles"
  on public.users for select
  to authenticated
  using (role = 'Doctor' AND status = 'active');
