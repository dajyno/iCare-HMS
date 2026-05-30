-- Disable RLS on global_settings; app-level Proxy already handles tenant isolation
alter table public.global_settings disable row level security;
