-- ============================================================
-- Add an optional free-text "referred_by" column to radiology_requests
--
-- Mirrors lab_requests.referred_by. The Radiology "New Exam"
-- request form now has an optional "Referred By" free-text input
-- (doctor name or external clinic) persisted on each request. This
-- powers the shared "Referrals" report which groups both lab and
-- radiology requests by referrer.
-- ============================================================

alter table public.radiology_requests
  add column if not exists referred_by text;
