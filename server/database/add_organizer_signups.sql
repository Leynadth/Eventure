-- Organizer signup applications (regular users apply to become organizers)
CREATE TABLE IF NOT EXISTS organizer_signups (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_name VARCHAR(255) NULL,
  event_types TEXT NULL,
  reason TEXT NOT NULL,
  additional_info TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_organizer_signups_user_id ON organizer_signups (user_id);
CREATE INDEX IF NOT EXISTS idx_organizer_signups_status ON organizer_signups (status);
