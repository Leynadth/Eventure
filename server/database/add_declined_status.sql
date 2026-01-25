-- ============================================
-- Add 'declined' status to events table
-- Updates the status ENUM to include 'declined' option
-- Migrates existing 'rejected' statuses to 'declined'
-- ============================================

USE eventure;

-- First, migrate any existing 'rejected' statuses to 'declined'
UPDATE events SET status = 'declined' WHERE status = 'rejected';

-- Update the status ENUM to include 'declined' and remove 'rejected'
-- This will modify the existing ENUM to: 'pending', 'approved', 'declined'
ALTER TABLE events 
MODIFY COLUMN status ENUM('pending', 'approved', 'declined') NOT NULL DEFAULT 'pending';

-- Verify the change
SELECT COLUMN_TYPE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'eventure' 
  AND TABLE_NAME = 'events' 
  AND COLUMN_NAME = 'status';
