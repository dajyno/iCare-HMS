-- ============================================================
-- Add an optional free-text "referred_by" column to lab_requests
--
-- The lab request grid previously used a doctor dropdown (and an
-- urgency selector) that were removed. The "Referred By" field is
-- now an optional free-text input (e.g. a doctor name or external
-- clinic) persisted directly on each lab request. This powers the
-- new "Referrals" report which groups requests by referrer.
-- ============================================================

alter table public.lab_requests
  add column if not exists referred_by text;
