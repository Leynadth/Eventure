-- ============================================
-- Add capacity field to events table
-- This allows tracking maximum attendees for events
-- ============================================

USE eventure;

-- Check if capacity column exists, if not add it
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'eventure' 
    AND TABLE_NAME = 'events' 
    AND COLUMN_NAME = 'capacity'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE events ADD COLUMN capacity INT UNSIGNED NULL COMMENT ''Maximum number of attendees (NULL = unlimited)''',
  'SELECT ''Column capacity already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Note: 
-- - capacity = NULL means unlimited attendees
-- - capacity > 0 means there's a limit
-- - Use this with rsvp_count to show "X / Y attending"
-- ============================================
