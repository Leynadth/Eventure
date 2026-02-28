-- Event messages from organizers to attendees (one row per recipient per message)
CREATE TABLE IF NOT EXISTS event_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_notifications_user_id ON event_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_read_at ON event_notifications (read_at);

-- Dismissed "organizer signup approved" notification (so we don't show it again)
CREATE TABLE IF NOT EXISTS dismissed_signup_notifications (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organizer_signup_id BIGINT NOT NULL REFERENCES organizer_signups(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, organizer_signup_id)
);
