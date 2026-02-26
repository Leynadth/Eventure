-- Eventure: Verify database tables (run in your SQL editor and paste the output back)
-- Use this to confirm event_discussion exists for Comments, and to see all tables.

-- 1) List all tables in the public schema
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2) Columns of event_discussion (used for Comments on event details page)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'event_discussion'
ORDER BY ordinal_position;

-- 3) Row count for event_discussion (optional)
SELECT COUNT(*) AS event_discussion_row_count FROM event_discussion;
