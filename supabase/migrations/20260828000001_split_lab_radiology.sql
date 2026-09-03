-- ============================================================
-- Split combined "Lab & Radiology" into separate "Lab" / "Radiology"
--
-- This migration ONLY remaps the legacy "Laboratory" source value
-- to the canonical "Lab". Existing "Lab & Radiology" rows are left
-- untouched (they still route payments to both lab and radiology),
-- so the manual-billing mixed case keeps working.
--
-- New invoices now use "Lab" or "Radiology" directly.
-- ============================================================

-- Invoices created from the Consultation workspace used the legacy
-- "Laboratory" value. Normalise those to "Lab".
update public.invoices
set source_type = 'Lab'
where source_type = 'Laboratory';

-- Accounting income entries (if any) that recorded the legacy
-- "Laboratory" category. "Lab & Radiology" is intentionally kept.
update public.accounting_income
set category = 'Lab'
where category = 'Laboratory';
