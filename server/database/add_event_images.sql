-- ============================================
-- Add image columns to events table
-- Supports 4 images: main_image (for cards) and image_2, image_3, image_4 (for slideshow)
-- ============================================

USE eventure;

-- Check and add main_image column
SET @col_exists_main = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'eventure' 
    AND TABLE_NAME = 'events' 
    AND COLUMN_NAME = 'main_image'
);

SET @sql_main = IF(@col_exists_main = 0,
  'ALTER TABLE events ADD COLUMN main_image VARCHAR(500) NULL COMMENT ''Main event image URL (shown on cards)''',
  'SELECT ''Column main_image already exists'' AS message'
);

PREPARE stmt_main FROM @sql_main;
EXECUTE stmt_main;
DEALLOCATE PREPARE stmt_main;

-- Check and add image_2 column
SET @col_exists_img2 = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'eventure' 
    AND TABLE_NAME = 'events' 
    AND COLUMN_NAME = 'image_2'
);

SET @sql_img2 = IF(@col_exists_img2 = 0,
  'ALTER TABLE events ADD COLUMN image_2 VARCHAR(500) NULL COMMENT ''Second event image URL (for slideshow)''',
  'SELECT ''Column image_2 already exists'' AS message'
);

PREPARE stmt_img2 FROM @sql_img2;
EXECUTE stmt_img2;
DEALLOCATE PREPARE stmt_img2;

-- Check and add image_3 column
SET @col_exists_img3 = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'eventure' 
    AND TABLE_NAME = 'events' 
    AND COLUMN_NAME = 'image_3'
);

SET @sql_img3 = IF(@col_exists_img3 = 0,
  'ALTER TABLE events ADD COLUMN image_3 VARCHAR(500) NULL COMMENT ''Third event image URL (for slideshow)''',
  'SELECT ''Column image_3 already exists'' AS message'
);

PREPARE stmt_img3 FROM @sql_img3;
EXECUTE stmt_img3;
DEALLOCATE PREPARE stmt_img3;

-- Check and add image_4 column
SET @col_exists_img4 = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'eventure' 
    AND TABLE_NAME = 'events' 
    AND COLUMN_NAME = 'image_4'
);

SET @sql_img4 = IF(@col_exists_img4 = 0,
  'ALTER TABLE events ADD COLUMN image_4 VARCHAR(500) NULL COMMENT ''Fourth event image URL (for slideshow)''',
  'SELECT ''Column image_4 already exists'' AS message'
);

PREPARE stmt_img4 FROM @sql_img4;
EXECUTE stmt_img4;
DEALLOCATE PREPARE stmt_img4;

-- ============================================
-- Note: 
-- - main_image: URL of the main image (shown on event cards)
-- - image_2, image_3, image_4: URLs of additional images (shown in slideshow on event details page)
-- - All columns are VARCHAR(500) to store image URLs/paths
-- ============================================
