-- When the user opens the notification bell, we set viewed_at so the red badge count goes to zero until new notifications arrive.
ALTER TABLE event_notifications ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP NULL;
