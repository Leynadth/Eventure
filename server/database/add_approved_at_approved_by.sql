-- Add approval metadata to events (Postgres). Run once; safe to re-run (columns added IF NOT EXISTS).
ALTER TABLE events ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS approved_by BIGINT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'events' AND constraint_name = 'events_approved_by_fkey'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
