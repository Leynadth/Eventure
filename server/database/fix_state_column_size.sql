-- ============================================
-- Fix state column size in events table
-- Ensure it's VARCHAR(50) to handle full state names
-- ============================================

USE eventure;

-- Check current column definition
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    COLUMN_TYPE
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'eventure' 
  AND TABLE_NAME = 'events' 
  AND COLUMN_NAME = 'state';

-- Modify the column to ensure it's VARCHAR(50)
ALTER TABLE events 
MODIFY COLUMN state VARCHAR(50) NULL;

-- Verify the change
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    COLUMN_TYPE
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'eventure' 
  AND TABLE_NAME = 'events' 
  AND COLUMN_NAME = 'state';
