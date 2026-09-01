-- ============================================================
-- Add a structured "category" column to invoice_items
--
-- invoice_items previously stored only a free-text "description"
-- (the test/exam name) with no way to bucket by lab test type or
-- radiology exam type. This adds a nullable "category" column and
-- backfills existing rows from the request/exam links where possible.
--
-- New rows are populated at creation time by the app code.
-- ============================================================

alter table public.invoice_items
  add column if not exists category text;

-- Backfill lab items from lab_requests -> lab_tests.category
update public.invoice_items i
  set category = t.category
  from public.lab_requests lr
  join public.lab_tests t on t.id = lr.test_id
  where i.invoice_id = lr.invoice_id
    and i.category is null
    and t.category is not null;

-- Backfill radiology items from radiology_requests ->
-- radiology_exams -> radiology_categories.name
update public.invoice_items i
  set category = rc.name
  from public.radiology_requests rr
  join public.radiology_exams re on re.id = rr.exam_id
  join public.radiology_categories rc on rc.id = re.category_id
  where i.invoice_id = rr.invoice_id
    and i.category is null
    and rc.name is not null;
