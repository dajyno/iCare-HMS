-- Add RLS policies for the notifications table
-- Run this in your Supabase SQL Editor

-- Users can read their own notifications
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can mark their own notifications as read
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can insert for any user (used by Edge Functions and admin operations)
drop policy if exists "Service role can insert notifications" on public.notifications;
create policy "Service role can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (true);
