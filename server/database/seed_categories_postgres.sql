-- Seed event categories for Create Event dropdown and Browse filters.
-- Run once in your SQL editor (e.g. Neon Console). Safe to run again: existing names are skipped.

-- Ensure categories table exists (from add_categories_table.sql)
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories (skips any that already exist)
INSERT INTO categories (name, sort_order) VALUES
  ('Music', 0),
  ('Comedy', 1),
  ('Sports', 2),
  ('Food & Drink', 3),
  ('Arts & Culture', 4),
  ('Education', 5),
  ('Technology', 6),
  ('Networking', 7),
  ('Health & Wellness', 8),
  ('Community', 9),
  ('Conference', 10),
  ('Festival', 11),
  ('Campus', 12),
  ('Charity', 13),
  ('Film & Media', 14),
  ('Family & Kids', 15),
  ('Outdoor', 16),
  ('Business', 17),
  ('Workshop', 18),
  ('Other', 19),
  ('Family-owned', 20),
  ('Food', 21),
  ('Gaming', 22)
ON CONFLICT (name) DO NOTHING;
