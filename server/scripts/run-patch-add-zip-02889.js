/**
 * One-time script: add ZIP 02889 to zip_locations so radius search from 02910 includes 02889.
 * Run from server dir: node scripts/run-patch-add-zip-02889.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pgPool } = require("../src/db");

const sql = `
INSERT INTO zip_locations (zip_code, lat, lng, city, state) VALUES
('02889', 41.6962, -71.4912, 'Warwick', 'RI')
ON CONFLICT (zip_code) DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  city = EXCLUDED.city,
  state = EXCLUDED.state
`;

async function main() {
  try {
    await pgPool.query(sql);
    console.log("Added/updated zip_locations row for 02889 (Warwick, RI).");
  } catch (err) {
    console.error("Patch failed:", err.message);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

main();
