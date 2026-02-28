/**
 * 1) Add approved_at, approved_by to events (if not present) and optional FK.
 * 2) Backfill fake approval data for existing approved events: random past approved_at, approved_by = first admin user.
 * Run from project root: node server/scripts/migrate-approved-metadata.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { pool, pgPool } = require("../src/db");

async function main() {
  console.log("Running approval metadata migration...\n");

  const client = await pgPool.connect();
  try {
    await client.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL");
    await client.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS approved_by BIGINT NULL");
    const { rows } = await client.query(
      `SELECT 1 FROM information_schema.table_constraints
       WHERE table_name = 'events' AND constraint_name = 'events_approved_by_fkey'`
    );
    if (!rows || rows.length === 0) {
      await client.query(
        "ALTER TABLE events ADD CONSTRAINT events_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL"
      );
    }
    console.log("Schema updated: approved_at, approved_by on events.\n");
  } finally {
    client.release();
  }

  const [adminRows] = await pool.execute(
    "SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
  );
  const adminId = adminRows?.[0]?.id ?? null;
  if (!adminId) {
    console.log("No admin user found; skipping backfill of approved_by. approved_at will still be set.\n");
  }

  const [events] = await pool.execute(
    "SELECT id, created_at FROM events WHERE status = 'approved' AND approved_at IS NULL"
  );
  if (!events || events.length === 0) {
    console.log("No approved events to backfill.");
    process.exit(0);
    return;
  }

  const now = Date.now();
  for (const ev of events) {
    const created = new Date(ev.created_at).getTime();
    const daysAfterCreate = Math.min(14, Math.floor((now - created) / (24 * 60 * 60 * 1000)));
    const offsetDays = daysAfterCreate > 0 ? Math.floor(Math.random() * daysAfterCreate) + 1 : 1;
    const approvedAt = new Date(created + offsetDays * 24 * 60 * 60 * 1000);
    const approvedAtStr = approvedAt.toISOString().slice(0, 19).replace("T", " ");
    if (adminId) {
      await pool.execute(
        "UPDATE events SET approved_at = ?, approved_by = ? WHERE id = ?",
        [approvedAtStr, adminId, ev.id]
      );
    } else {
      await pool.execute("UPDATE events SET approved_at = ? WHERE id = ?", [approvedAtStr, ev.id]);
    }
  }

  console.log(`Backfilled approval metadata for ${events.length} approved event(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
