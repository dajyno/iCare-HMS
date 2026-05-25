-- Run this in Supabase Dashboard -> SQL Editor
-- Maps existing staff records to the new department category system

UPDATE staff SET department = 'Clinical / Medical', updated_at = now()
WHERE position IN ('Medical Doctors', 'Nursing');

UPDATE staff SET department = 'Clinical Support Services', updated_at = now()
WHERE position IN ('Pharmacy', 'Laboratory');

UPDATE staff SET department = 'Administrative', position = 'Hospital Administration', updated_at = now()
WHERE position = 'Administration';

UPDATE staff SET department = 'Operations & Facilities', updated_at = now()
WHERE position = 'Others';
