-- ============================================
-- Clear all events from the events table
-- This will also cascade delete related records in:
-- - rsvps (via foreign key CASCADE)
-- - favorites (via foreign key CASCADE)
-- ============================================

USE eventure;

-- Disable foreign key checks temporarily to ensure clean deletion
SET FOREIGN_KEY_CHECKS = 0;

-- Disable safe update mode for this session
SET SQL_SAFE_UPDATES = 0;

-- Delete all events (using WHERE clause to satisfy safe update mode)
DELETE FROM events WHERE id > 0;

-- Reset auto-increment counter (optional, but good for clean start)
ALTER TABLE events AUTO_INCREMENT = 1;

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify deletion
SELECT COUNT(*) as remaining_events FROM events;

-- ============================================
-- Note: 
-- - This will delete ALL events from the events table
-- - Related records in rsvps and favorites tables will be automatically deleted
--   due to CASCADE foreign key constraints
-- - The auto-increment counter is reset so new events will start at ID 1
-- ============================================
