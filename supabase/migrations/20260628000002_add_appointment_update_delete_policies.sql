-- Allow authenticated users to update and delete appointments
-- so the appointment module works via the anon-key client.

drop policy if exists "Authenticated users can update appointments" on public.appointments;
create policy "Authenticated users can update appointments"
  on public.appointments for update
  to authenticated
  using (true);

drop policy if exists "Authenticated users can delete appointments" on public.appointments;
create policy "Authenticated users can delete appointments"
  on public.appointments for delete
  to authenticated
  using (true);
