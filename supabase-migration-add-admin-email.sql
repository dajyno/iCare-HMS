-- ============================================================
-- Phase 1: Ensure tenants table has admin_email + demo tenant
-- ============================================================
alter table public.tenants add column if not exists admin_email text;
update public.tenants set admin_email = 'admin@demo.icare.ng' where tenant_id = 'T-DEMO-01' and admin_email is null;

-- ============================================================
-- Phase 2: Add tenant_id column (with FK) to all data tables
-- Uses IF NOT EXISTS so safe to re-run
-- ============================================================

alter table public.users add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.departments add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.staff_profiles add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.patients add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.appointments add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.consultations add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.vital_signs add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.prescriptions add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.prescription_items add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.medications add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.lab_tests add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.lab_requests add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.lab_results add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.invoices add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.invoice_items add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.payments add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.inventory_items add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.suppliers add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.purchase_orders add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.purchase_order_items add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.wards add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.beds add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.admissions add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.discharges add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.radiology_categories add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.radiology_exams add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.radiology_requests add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.radiology_results add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.audit_logs add column if not exists tenant_id text references public.tenants(tenant_id);
alter table public.notifications add column if not exists tenant_id text references public.tenants(tenant_id);

-- ============================================================
-- Phase 3: Populate tenant_id on existing demo data
-- WHERE tenant_id IS NULL avoids overwriting manually assigned data
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
