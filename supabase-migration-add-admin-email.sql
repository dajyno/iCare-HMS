-- Adds admin_email column to tenants table for tenant admin management
alter table public.tenants add column if not exists admin_email text;

-- Seed admin email for demo tenant
update public.tenants set admin_email = 'admin@demo.icare.ng' where tenant_id = 'T-DEMO-01' and admin_email is null;

-- ============================================================
-- Populate tenant_id on existing demo data
-- Safe to re-run: WHERE tenant_id IS NULL avoids overwriting
-- ============================================================

update public.users set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.departments set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.staff_profiles set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.patients set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.appointments set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.consultations set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.vital_signs set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.prescriptions set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.prescription_items set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.medications set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.lab_tests set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.lab_requests set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.lab_results set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.invoices set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.invoice_items set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.payments set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.inventory_items set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.suppliers set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.purchase_orders set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.purchase_order_items set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.wards set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.beds set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.admissions set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.discharges set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.radiology_categories set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.radiology_exams set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.radiology_requests set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.radiology_results set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.audit_logs set tenant_id = 'T-DEMO-01' where tenant_id is null;
update public.notifications set tenant_id = 'T-DEMO-01' where tenant_id is null;
