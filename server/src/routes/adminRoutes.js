const express = require("express");
const { pool } = require("../db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorize(["admin"]));

// GET /api/admin/stats - Get admin dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    // Get total users count
    const [userRows] = await pool.execute("SELECT COUNT(*) as count FROM users");
    const totalUsers = Number(userRows[0]?.count) || 0;

    // Get total events count
    const [eventRows] = await pool.execute("SELECT COUNT(*) as count FROM events");
    const totalEvents = Number(eventRows[0]?.count) || 0;

    // Get pending approvals count
    const [pendingRows] = await pool.execute(
      "SELECT COUNT(*) as count FROM events WHERE status = 'pending'"
    );
    const pendingApprovals = Number(pendingRows[0]?.count) || 0;

    // Get popular category
    const [categoryRows] = await pool.execute(`
      SELECT category, COUNT(*) as count
      FROM events
      WHERE status = 'approved'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 1
    `);
    const popularCategory = categoryRows[0]
      ? { name: categoryRows[0].category, count: Number(categoryRows[0].count) || 0 }
      : { name: "N/A", count: 0 };

    return res.status(200).json({
      totalUsers,
      totalEvents,
      pendingApprovals,
      popularCategory,
    });
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    console.error("Error details:", error.message, error.sqlMessage);
    return res.status(500).json({ 
      message: "Failed to fetch admin statistics",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

// GET /api/admin/events - Get all events (admin only, includes all statuses)
router.get("/events", async (req, res) => {
  try {
    console.log("Admin fetching all events - User:", req.user);
    
    // Use subquery to avoid GROUP BY issues
    const sql = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.starts_at,
        e.ends_at,
        e.venue,
        e.address_line1,
        e.city,
        e.state,
        e.zip_code,
        e.category,
        e.status,
        e.created_at,
        COALESCE(CONCAT(u.firstName, ' ', u.lastName), 'Unknown') as organizer_name,
        COALESCE(rsvp_counts.rsvp_count, 0) as rsvp_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN (
        SELECT event_id, COUNT(*) as rsvp_count
        FROM rsvps
        WHERE status = 'going'
        GROUP BY event_id
      ) rsvp_counts ON e.id = rsvp_counts.event_id
      ORDER BY e.created_at DESC
    `;

    console.log("Executing SQL query for admin events");
    const [rows] = await pool.execute(sql);
    
    console.log(`Fetched ${rows.length} events for admin`);

    return res.status(200).json(rows || []);
  } catch (error) {
    console.error("Failed to fetch all events:", error);
    console.error("Error details:", {
      message: error.message,
      sqlMessage: error.sqlMessage,
      code: error.code,
      sql: error.sql,
      stack: error.stack,
    });
    return res.status(500).json({ 
      message: "Failed to fetch events",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
      sqlError: process.env.NODE_ENV !== "production" ? error.sqlMessage : undefined
    });
  }
});

// PUT /api/admin/events/:id/approve - Approve an event
router.put("/events/:id/approve", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    // Check if event exists
    const [eventRows] = await pool.execute("SELECT id, status FROM events WHERE id = ?", [eventId]);

    if (!eventRows || eventRows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Update event status to approved
    await pool.execute("UPDATE events SET status = 'approved' WHERE id = ?", [eventId]);

    return res.status(200).json({ message: "Event approved successfully" });
  } catch (error) {
    console.error("Failed to approve event:", error);
    return res.status(500).json({ message: "Failed to approve event" });
  }
});

// PUT /api/admin/events/:id/decline - Decline an event
router.put("/events/:id/decline", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    // Check if event exists
    const [eventRows] = await pool.execute("SELECT id, status FROM events WHERE id = ?", [eventId]);

    if (!eventRows || eventRows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Update event status to declined
    await pool.execute("UPDATE events SET status = 'declined' WHERE id = ?", [eventId]);

    return res.status(200).json({ message: "Event declined successfully" });
  } catch (error) {
    console.error("Failed to decline event:", error);
    return res.status(500).json({ message: "Failed to decline event" });
  }
});

// DELETE /api/admin/events/:id - Delete an event (admin can delete any event)
router.delete("/events/:id", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    // Check if event exists
    const [eventRows] = await pool.execute("SELECT id FROM events WHERE id = ?", [eventId]);

    if (!eventRows || eventRows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Delete the event (cascade will handle related records)
    await pool.execute("DELETE FROM events WHERE id = ?", [eventId]);

    return res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return res.status(500).json({ message: "Failed to delete event" });
  }
});

module.exports = router;
