-- Add missing columns to lab_results
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS edited_by TEXT;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Add missing columns to lab_requests
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS requested_by_name TEXT;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS completed_by_name TEXT;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid';
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS invoice_id TEXT;

-- Create storage bucket for lab attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-attachments', 'lab-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload lab attachments'
  ) THEN
    CREATE POLICY "Authenticated users can upload lab attachments"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'lab-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can view lab attachments'
  ) THEN
    CREATE POLICY "Authenticated users can view lab attachments"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'lab-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anyone can view lab attachments'
  ) THEN
    CREATE POLICY "Anyone can view lab attachments"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'lab-attachments');
  END IF;
END $$;
