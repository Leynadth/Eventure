const express = require("express");
const { pool } = require("../db");

const router = express.Router();

function parseOptionalLimit(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || Number.isNaN(n) || n <= 0) return undefined;
  // Basic safety cap
  return Math.min(n, 200);
}

function parseRadius(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || Number.isNaN(n) || n <= 0) return undefined;
  // Valid radius values: 5, 10, 15, 20, 25, 30, 40, 50
  const validRadii = [5, 10, 15, 20, 25, 30, 40, 50];
  if (!validRadii.includes(n)) return undefined;
  return n;
}

// GET /api/events - Fetch public approved events
// Query params: limit, zip, radius
router.get("/", async (req, res) => {
  try {
    const { limit, zip, radius } = req.query;

    const whereClauses = ["status = ?", "is_public = ?"];
    const params = ["approved", 1];

    // Radius search with zip
    if (zip && String(zip).trim() !== "") {
      const zipCode = String(zip).trim();
      const radiusValue = parseRadius(radius);

      if (!radiusValue) {
        // If radius is not provided or invalid, return empty results
        return res.status(200).json([]);
      }

      // Look up zip in zip_locations table
      const zipQuery = "SELECT lat, lng FROM zip_locations WHERE zip_code = ? LIMIT 1";
      const [zipRows] = await pool.execute(zipQuery, [zipCode]);

      if (zipRows && zipRows.length > 0) {
        const centerLat = zipRows[0].lat;
        const centerLng = zipRows[0].lng;
        const radiusMeters = radiusValue * 1609.34; // Convert miles to meters

        // For radius search, require lat/lng to be NOT NULL
        whereClauses.push("lat IS NOT NULL", "lng IS NOT NULL");

        // Add radius filter using ST_Distance_Sphere
        whereClauses.push(
          `ST_Distance_Sphere(
            POINT(events.lng, events.lat),
            POINT(?, ?)
          ) <= ?`
        );
        params.push(centerLng, centerLat, radiusMeters);
      } else {
        // Zip not found in zip_locations, return empty results
        return res.status(200).json([]);
      }
    }

    const limitValue = parseOptionalLimit(limit);

    const sql = `
      SELECT 
        id,
        title,
        description,
        starts_at,
        ends_at,
        venue,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        location,
        category,
        created_by,
        created_at
      FROM events
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY starts_at ASC
      ${limitValue ? "LIMIT ?" : ""}
    `;

    const finalParams = limitValue ? [...params, limitValue] : params;
    const [rows] = await pool.execute(sql, finalParams);

    // Return empty array if no events found
    return res.status(200).json(rows || []);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return res.status(500).json({ message: "Failed to fetch events" });
  }
});

// GET /api/events/:id - Fetch single public approved event
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const eventId = Number.parseInt(String(id), 10);
    if (!Number.isFinite(eventId) || Number.isNaN(eventId)) {
      return res.status(404).json({ message: "Event not found" });
    }

    const sql = `
      SELECT 
        id,
        title,
        description,
        starts_at,
        ends_at,
        venue,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        location,
        category,
        created_by,
        created_at
      FROM events
      WHERE id = ?
        AND status = ?
        AND is_public = ?
      LIMIT 1
    `;

    const [rows] = await pool.execute(sql, [eventId, "approved", 1]);
    const event = rows && rows[0] ? rows[0] : null;

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json(event);
  } catch (error) {
    console.error("Failed to fetch event by id:", error);
    return res.status(500).json({ message: "Failed to fetch events" });
  }
});

module.exports = router;
