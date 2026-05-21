-- Clear all seed data from appointments table
-- Run this in Supabase SQL Editor to start fresh

DELETE FROM public.appointments;

-- Reset the sequence if using serial IDs (not needed for UUID)
-- SELECT setval('appointments_id_seq', 1, false);

-- Verify deletion
SELECT COUNT(*) as remaining_appointments FROM public.appointments;
