/**
 * One-time script: add ZIP 02920 to zip_locations so radius search works for 02920.
 * Run from server dir: node scripts/run-patch-add-zip-02920.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pgPool } = require("../src/db");

const sql = `
INSERT INTO zip_locations (zip_code, lat, lng, city, state) VALUES
('02920', 41.6892, -71.4342, 'Coventry', 'RI')
ON CONFLICT (zip_code) DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  city = EXCLUDED.city,
  state = EXCLUDED.state
`;

async function main() {
  try {
    await pgPool.query(sql);
    console.log("Added/updated zip_locations row for 02920 (Coventry, RI).");
  } catch (err) {
    console.error("Patch failed:", err.message);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

main();
