-- ============================================================
-- Grant Data API privileges for the public schema.
--
-- Context: from 2026-10-30, Supabase stops automatically granting
-- Data API access to newly created tables in the public schema.
-- Tables created without explicit grants become unreachable through
-- PostgREST / supabase-js (even when RLS policies exist, because RLS
-- and grants are separate gates).
--
-- This migration:
--   1. Grants the standard privileges on every existing public table.
--   2. Sets default privileges so future tables inherit the same grants.
--
-- Privilege model:
--   anon          -> SELECT only
--   authenticated -> SELECT, INSERT, UPDATE, DELETE
--   service_role  -> SELECT, INSERT, UPDATE, DELETE
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- 1. Existing tables
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('grant select on table public.%I to anon', r.tablename);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', r.tablename);
    execute format('grant select, insert, update, delete on table public.%I to service_role', r.tablename);
  end loop;
end
$$;

-- 2. Future tables created by migrations (executed as the migration role)
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
