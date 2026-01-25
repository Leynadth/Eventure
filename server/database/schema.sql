-- ============================================
-- Eventure Database Schema
-- Complete MySQL schema for Eventure application
-- This script creates tables if they don't exist AND updates existing tables
-- ============================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS eventure CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE eventure;

-- ============================================
-- Helper Procedure: Add column if it doesn't exist
-- ============================================
DELIMITER $$

DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(255),
    IN columnName VARCHAR(255),
    IN columnDefinition TEXT
)
BEGIN
    DECLARE columnExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO columnExists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;
    
    IF columnExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- Helper Procedure: Add index if it doesn't exist
DROP PROCEDURE IF EXISTS AddIndexIfNotExists$$
CREATE PROCEDURE AddIndexIfNotExists(
    IN tableName VARCHAR(255),
    IN indexName VARCHAR(255),
    IN indexDefinition TEXT
)
BEGIN
    DECLARE indexExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO indexExists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND INDEX_NAME = indexName;
    
    IF indexExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD INDEX ', indexName, ' ', indexDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- Helper Procedure: Add foreign key if it doesn't exist
DROP PROCEDURE IF EXISTS AddForeignKeyIfNotExists$$
CREATE PROCEDURE AddForeignKeyIfNotExists(
    IN tableName VARCHAR(255),
    IN constraintName VARCHAR(255),
    IN foreignKeyDefinition TEXT
)
BEGIN
    DECLARE fkExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO fkExists
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND CONSTRAINT_NAME = constraintName;
    
    IF fkExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD CONSTRAINT ', constraintName, ' ', foreignKeyDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- Helper Procedure: Add unique constraint if it doesn't exist
DROP PROCEDURE IF EXISTS AddUniqueKeyIfNotExists$$
CREATE PROCEDURE AddUniqueKeyIfNotExists(
    IN tableName VARCHAR(255),
    IN constraintName VARCHAR(255),
    IN columnList TEXT
)
BEGIN
    DECLARE ukExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO ukExists
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND CONSTRAINT_NAME = constraintName
      AND CONSTRAINT_TYPE = 'UNIQUE';
    
    IF ukExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD UNIQUE KEY ', constraintName, ' ', columnList);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- ============================================
-- Table: users
-- Stores user accounts with authentication and role information
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'organizer', 'user') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update existing users table (skip id as it's the primary key)
CALL AddColumnIfNotExists('users', 'email', 'VARCHAR(255) NOT NULL UNIQUE');
CALL AddColumnIfNotExists('users', 'password_hash', 'VARCHAR(255) NOT NULL');
CALL AddColumnIfNotExists('users', 'first_name', 'VARCHAR(255) NOT NULL');
CALL AddColumnIfNotExists('users', 'last_name', 'VARCHAR(255) NOT NULL');
CALL AddColumnIfNotExists('users', 'role', "ENUM('admin', 'organizer', 'user') NOT NULL DEFAULT 'user'");
CALL AddColumnIfNotExists('users', 'created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('users', 'updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- Add indexes
CALL AddIndexIfNotExists('users', 'idx_users_email', '(email)');
CALL AddIndexIfNotExists('users', 'idx_users_role', '(role)');

-- ============================================
-- Table: password_reset_codes
-- Stores OTP codes for password reset functionality
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update existing password_reset_codes table (skip id as it's the primary key)
CALL AddColumnIfNotExists('password_reset_codes', 'user_id', 'BIGINT UNSIGNED NOT NULL');
CALL AddColumnIfNotExists('password_reset_codes', 'code_hash', 'VARCHAR(255) NOT NULL');
CALL AddColumnIfNotExists('password_reset_codes', 'expires_at', 'DATETIME NOT NULL');
CALL AddColumnIfNotExists('password_reset_codes', 'used_at', 'DATETIME NULL');
CALL AddColumnIfNotExists('password_reset_codes', 'created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

-- Add indexes and foreign keys
CALL AddIndexIfNotExists('password_reset_codes', 'idx_prc_user_id', '(user_id)');
CALL AddIndexIfNotExists('password_reset_codes', 'idx_prc_expires_at', '(expires_at)');
CALL AddForeignKeyIfNotExists('password_reset_codes', 'fk_prc_user_id', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');

-- ============================================
-- Table: events
-- Stores event information created by organizers
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME,
  venue VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),
  location VARCHAR(500),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  category VARCHAR(100) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update existing events table (skip id as it's the primary key)
CALL AddColumnIfNotExists('events', 'title', 'VARCHAR(255) NOT NULL');
CALL AddColumnIfNotExists('events', 'description', 'TEXT');
CALL AddColumnIfNotExists('events', 'starts_at', 'DATETIME NOT NULL');
CALL AddColumnIfNotExists('events', 'ends_at', 'DATETIME');
CALL AddColumnIfNotExists('events', 'venue', 'VARCHAR(255)');
CALL AddColumnIfNotExists('events', 'address_line1', 'VARCHAR(255)');
CALL AddColumnIfNotExists('events', 'address_line2', 'VARCHAR(255)');
CALL AddColumnIfNotExists('events', 'city', 'VARCHAR(100)');
CALL AddColumnIfNotExists('events', 'state', 'VARCHAR(50)');
CALL AddColumnIfNotExists('events', 'zip_code', 'VARCHAR(10)');
CALL AddColumnIfNotExists('events', 'location', 'VARCHAR(500)');
CALL AddColumnIfNotExists('events', 'lat', 'DECIMAL(10, 8)');
CALL AddColumnIfNotExists('events', 'lng', 'DECIMAL(11, 8)');
CALL AddColumnIfNotExists('events', 'category', 'VARCHAR(100) NOT NULL');
CALL AddColumnIfNotExists('events', 'status', "ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'");
CALL AddColumnIfNotExists('events', 'is_public', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('events', 'created_by', 'BIGINT UNSIGNED NOT NULL');
CALL AddColumnIfNotExists('events', 'created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('events', 'updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- Add indexes and foreign keys
CALL AddIndexIfNotExists('events', 'idx_events_status', '(status)');
CALL AddIndexIfNotExists('events', 'idx_events_is_public', '(is_public)');
CALL AddIndexIfNotExists('events', 'idx_events_created_by', '(created_by)');
CALL AddIndexIfNotExists('events', 'idx_events_starts_at', '(starts_at)');
CALL AddIndexIfNotExists('events', 'idx_events_category', '(category)');
CALL AddIndexIfNotExists('events', 'idx_events_zip_code', '(zip_code)');
CALL AddForeignKeyIfNotExists('events', 'fk_events_created_by', 'FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT');

-- Note: Spatial index requires special handling - add manually if needed
-- CREATE SPATIAL INDEX idx_events_location ON events (lng, lat);

-- ============================================
-- Table: zip_locations
-- Stores ZIP code to latitude/longitude mappings for geocoding
-- Used for radius-based event searches
-- ============================================
CREATE TABLE IF NOT EXISTS zip_locations (
  zip_code VARCHAR(10) PRIMARY KEY,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update existing zip_locations table (skip zip_code as it's the primary key)
CALL AddColumnIfNotExists('zip_locations', 'lat', 'DECIMAL(10, 8) NOT NULL');
CALL AddColumnIfNotExists('zip_locations', 'lng', 'DECIMAL(11, 8) NOT NULL');
CALL AddColumnIfNotExists('zip_locations', 'city', 'VARCHAR(100)');
CALL AddColumnIfNotExists('zip_locations', 'state', 'VARCHAR(50)');
CALL AddColumnIfNotExists('zip_locations', 'created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

-- Add indexes
CALL AddIndexIfNotExists('zip_locations', 'idx_zip_locations_lat_lng', '(lat, lng)');

-- ============================================
-- Table: favorites
-- Stores user favorites/bookmarks for events
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update existing favorites table (skip id as it's the primary key)
CALL AddColumnIfNotExists('favorites', 'user_id', 'BIGINT UNSIGNED NOT NULL');
CALL AddColumnIfNotExists('favorites', 'event_id', 'BIGINT UNSIGNED NOT NULL');
CALL AddColumnIfNotExists('favorites', 'created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

-- Add indexes, unique constraint, and foreign keys
CALL AddIndexIfNotExists('favorites', 'idx_favorites_user_id', '(user_id)');
CALL AddIndexIfNotExists('favorites', 'idx_favorites_event_id', '(event_id)');
CALL AddUniqueKeyIfNotExists('favorites', 'unique_user_event', '(user_id, event_id)');
CALL AddForeignKeyIfNotExists('favorites', 'fk_favorites_user_id', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
CALL AddForeignKeyIfNotExists('favorites', 'fk_favorites_event_id', 'FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE');

-- ============================================
-- Table: rsvps
-- Stores RSVP/attendance information for events
-- ============================================
CREATE TABLE IF NOT EXISTS rsvps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  status ENUM('going', 'maybe', 'not_going') NOT NULL DEFAULT 'going',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update existing rsvps table (skip id as it's the primary key)
CALL AddColumnIfNotExists('rsvps', 'user_id', 'BIGINT UNSIGNED NOT NULL');
CALL AddColumnIfNotExists('rsvps', 'event_id', 'BIGINT UNSIGNED NOT NULL');
CALL AddColumnIfNotExists('rsvps', 'status', "ENUM('going', 'maybe', 'not_going') NOT NULL DEFAULT 'going'");
CALL AddColumnIfNotExists('rsvps', 'created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL AddColumnIfNotExists('rsvps', 'updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- Add indexes, unique constraint, and foreign keys
CALL AddIndexIfNotExists('rsvps', 'idx_rsvps_user_id', '(user_id)');
CALL AddIndexIfNotExists('rsvps', 'idx_rsvps_event_id', '(event_id)');
CALL AddIndexIfNotExists('rsvps', 'idx_rsvps_status', '(status)');
CALL AddUniqueKeyIfNotExists('rsvps', 'unique_user_event_rsvp', '(user_id, event_id)');
CALL AddForeignKeyIfNotExists('rsvps', 'fk_rsvps_user_id', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
CALL AddForeignKeyIfNotExists('rsvps', 'fk_rsvps_event_id', 'FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE');

-- ============================================
-- Clean up helper procedures
-- ============================================
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
DROP PROCEDURE IF EXISTS AddForeignKeyIfNotExists;
DROP PROCEDURE IF EXISTS AddUniqueKeyIfNotExists;

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Insert a sample admin user (password: Admin123!)
-- Password hash generated with bcrypt (10 rounds) for "Admin123!"
-- You should change this password after first login
INSERT IGNORE INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@eventure.com', '$2b$10$rQZ8XK9YvJ3LmNpQrS5T.uJ8XK9YvJ3LmNpQrS5T.uJ8XK9YvJ3LmN', 'Admin', 'User', 'admin');

-- Note: The password hash above is a placeholder. 
-- Generate a real hash using: bcrypt.hash('YourPassword', 10)
-- Or register through the application and manually update the role to 'admin'

-- ============================================
-- Schema Complete
-- ============================================
