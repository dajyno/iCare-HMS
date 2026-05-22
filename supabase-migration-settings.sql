-- Global Settings table
-- Stores a single row with the full JSON settings blob for the entire application.

CREATE TABLE IF NOT EXISTS global_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read global_settings"
  ON global_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated insert global_settings"
  ON global_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated update global_settings"
  ON global_settings FOR UPDATE
  TO authenticated
  USING (true);

-- Seed the default row so the first read always succeeds
INSERT INTO global_settings (id, settings, updated_by)
VALUES (
  1,
  '{}'::jsonb,
  NULL
)
ON CONFLICT (id) DO NOTHING;
