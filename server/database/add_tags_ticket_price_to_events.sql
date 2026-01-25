-- ============================================
-- Add tags and ticket_price fields to events table
-- ============================================

USE eventure;

-- Check if tags column exists, if not add it
SET @col_exists_tags = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'eventure' 
    AND TABLE_NAME = 'events' 
    AND COLUMN_NAME = 'tags'
);

SET @sql_tags = IF(@col_exists_tags = 0,
  'ALTER TABLE events ADD COLUMN tags VARCHAR(500) NULL COMMENT ''Comma-separated tags for event searchability''',
  'SELECT ''Column tags already exists'' AS message'
);

PREPARE stmt_tags FROM @sql_tags;
EXECUTE stmt_tags;
DEALLOCATE PREPARE stmt_tags;

-- Check if ticket_price column exists, if not add it
SET @col_exists_price = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'eventure' 
    AND TABLE_NAME = 'events' 
    AND COLUMN_NAME = 'ticket_price'
);

SET @sql_price = IF(@col_exists_price = 0,
  'ALTER TABLE events ADD COLUMN ticket_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT ''Ticket price in dollars (0.00 = free event)''',
  'SELECT ''Column ticket_price already exists'' AS message'
);

PREPARE stmt_price FROM @sql_price;
EXECUTE stmt_price;
DEALLOCATE PREPARE stmt_price;

-- ============================================
-- Note: 
-- - tags: NULL or comma-separated string (e.g., "music, free, outdoor")
-- - ticket_price: DECIMAL(10, 2), default 0.00 (free events)
-- ============================================
