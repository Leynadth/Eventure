-- Store admin reason when user is unattended from an event (shown in "Click to see reason" popup)
ALTER TABLE event_notifications ADD COLUMN IF NOT EXISTS reason TEXT NULL;
