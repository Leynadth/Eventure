/**
 * One-time backfill: set lat/lng for all events that have an address but no coordinates.
 * Run from project root: node server/scripts/backfill_event_coordinates.js
 * Respects Nominatim 1 req/sec; use --dry-run to only print what would be updated.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { pool } = require("../src/db");

const DRY_RUN = process.argv.includes("--dry-run");

async function geocodeAddress(venue, addressLine1, city, state, zipCode) {
  const parts = [
    venue && String(venue).trim(),
    addressLine1 && String(addressLine1).trim(),
    city && String(city).trim(),
    state && String(state).trim(),
    zipCode && String(zipCode).trim(),
  ].filter(Boolean);
  if (parts.length === 0) return null;
  const query = parts.join(", ");
  if (query.length < 5) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { "User-Agent": "Eventure/1.0 (https://eventure.com/contact)" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lng: lon };
    return null;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(DRY_RUN ? "[DRY RUN] Backfilling event coordinates..." : "Backfilling event coordinates...");

  const [rows] = await pool.execute(
    `SELECT id, title, venue, address_line1, city, state, zip_code
     FROM events
     WHERE (lat IS NULL OR lng IS NULL)
       AND (address_line1 IS NOT NULL AND address_line1 != ''
            OR venue IS NOT NULL AND venue != ''
            OR (city IS NOT NULL AND city != '' AND state IS NOT NULL AND state != '' AND zip_code IS NOT NULL AND zip_code != ''))
     ORDER BY id ASC`
  );

  const events = Array.isArray(rows) ? rows : [];
  console.log(`Found ${events.length} event(s) without coordinates.`);

  if (events.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const venue = e.venue ?? "";
    const address = e.address_line1 ?? "";
    const city = e.city ?? "";
    const state = e.state ?? "";
    const zip = e.zip_code ?? "";

    const coords = await geocodeAddress(venue, address, city, state, zip);

    if (coords) {
      if (!DRY_RUN) {
        await pool.execute("UPDATE events SET lat = ?, lng = ? WHERE id = ?", [
          coords.lat,
          coords.lng,
          e.id,
        ]);
      }
      updated++;
      console.log(`  [${i + 1}/${events.length}] id=${e.id} "${(e.title || "").slice(0, 40)}" -> ${coords.lat}, ${coords.lng}`);
    } else {
      failed++;
      console.log(`  [${i + 1}/${events.length}] id=${e.id} "${(e.title || "").slice(0, 40)}" -> geocode failed`);
    }

    // Nominatim usage policy: max 1 request per second
    await sleep(1100);
  }

  console.log("");
  console.log(`Done. Updated: ${updated}, Failed: ${failed}${DRY_RUN ? " (dry run, no DB changes)" : ""}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
