-- ============================================
-- Fix location column in events table
-- Ensure it allows NULL values
-- ============================================

USE eventure;

-- Check current column definition
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_TYPE
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'eventure' 
  AND TABLE_NAME = 'events' 
  AND COLUMN_NAME = 'location';

-- Modify the column to allow NULL if it doesn't already
ALTER TABLE events 
MODIFY COLUMN location VARCHAR(500) NULL;

-- Verify the change
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_TYPE
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'eventure' 
  AND TABLE_NAME = 'events' 
  AND COLUMN_NAME = 'location';
