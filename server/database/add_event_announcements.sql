-- Event announcements: organizer posts show on event details "wall" and are sent to attendees' notifications
CREATE TABLE IF NOT EXISTS event_announcements (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_announcements_event_id ON event_announcements (event_id);
CREATE INDEX IF NOT EXISTS idx_event_announcements_created_at ON event_announcements (created_at DESC);
