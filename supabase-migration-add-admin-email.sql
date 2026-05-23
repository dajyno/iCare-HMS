-- Adds admin_email column to tenants table for tenant admin management
alter table public.tenants add column if not exists admin_email text;

-- Seed admin email for demo tenant
update public.tenants set admin_email = 'admin@demo.icare.ng' where tenant_id = 'T-DEMO-01' and admin_email is null;
