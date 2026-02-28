const express = require("express");
const { pool } = require("../db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/admin/settings/hero - Public endpoint (no auth required for reading)
router.get("/settings/hero", async (req, res) => {
  try {
    // Check if settings table exists, if not return defaults
    const [settings] = await pool.execute(`
      SELECT setting_key, setting_value 
      FROM site_settings 
      WHERE setting_key IN ('hero_background_type', 'hero_background_color', 'hero_background_image')
    `).catch(() => [[{ setting_key: null, setting_value: null }]]);

    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    return res.status(200).json({
      type: settingsMap.hero_background_type || "color",
      color: settingsMap.hero_background_color || "#2e6b4e",
      image: settingsMap.hero_background_image || null,
    });
  } catch (error) {
    console.error("Failed to fetch hero settings:", error);
    // Return defaults if table doesn't exist
    return res.status(200).json({
      type: "color",
      color: "#2e6b4e",
      image: null,
    });
  }
});

// GET /api/admin/settings/content - Public (editable text blocks for home etc.)
const CONTENT_KEYS = [
  "content_home_hero_headline",
  "content_home_hero_subheadline",
  "content_home_about_title",
  "content_home_about_body",
  "content_home_most_attended_title",
  "content_home_founders_image",
];
router.get("/settings/content", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (?, ?, ?, ?, ?, ?)",
      CONTENT_KEYS
    ).catch(() => [[]]);
    const out = {
      home_hero_headline: "",
      home_hero_subheadline: "",
      home_about_title: "",
      home_about_body: "",
      home_most_attended_title: "",
      home_founders_image: "",
    };
    (rows || []).forEach((r) => {
      const key = r.setting_key;
      const val = r.setting_value || "";
      if (key === "content_home_hero_headline") out.home_hero_headline = val;
      else if (key === "content_home_hero_subheadline") out.home_hero_subheadline = val;
      else if (key === "content_home_about_title") out.home_about_title = val;
      else if (key === "content_home_about_body") out.home_about_body = val;
      else if (key === "content_home_most_attended_title") out.home_most_attended_title = val;
      else if (key === "content_home_founders_image") out.home_founders_image = val;
    });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(200).json({
      home_hero_headline: "",
      home_hero_subheadline: "",
      home_about_title: "",
      home_about_body: "",
      home_most_attended_title: "",
      home_founders_image: "",
    });
  }
});

// All other admin routes require authentication and admin role
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

    // Users this month (for % vs last month)
    const [usersThisMonthRows] = await pool.execute(`
      SELECT COUNT(*) as count FROM users
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `);
    const usersThisMonth = Number(usersThisMonthRows[0]?.count) || 0;

    // Users last month
    const [usersLastMonthRows] = await pool.execute(`
      SELECT COUNT(*) as count FROM users
      WHERE created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
        AND created_at < date_trunc('month', CURRENT_DATE)
    `);
    const usersLastMonth = Number(usersLastMonthRows[0]?.count) || 0;

    // Events this month
    const [eventsThisMonthRows] = await pool.execute(`
      SELECT COUNT(*) as count FROM events
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `);
    const eventsThisMonth = Number(eventsThisMonthRows[0]?.count) || 0;

    // Events last month
    const [eventsLastMonthRows] = await pool.execute(`
      SELECT COUNT(*) as count FROM events
      WHERE created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
        AND created_at < date_trunc('month', CURRENT_DATE)
    `);
    const eventsLastMonth = Number(eventsLastMonthRows[0]?.count) || 0;

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
      popularCategory,
      usersThisMonth,
      usersLastMonth,
      eventsThisMonth,
      eventsLastMonth,
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
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Unknown') as organizer_name,
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

// GET /api/admin/events/:id - Get full event details for admin (any status) + attendees
router.get("/events/:id", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const [eventRows] = await pool.execute(
      `SELECT e.id, e.title, e.description, e.starts_at, e.ends_at, e.venue,
              e.address_line1, e.address_line2, e.city, e.state, e.zip_code, e.location,
              e.category, e.status, e.capacity, e.ticket_price, e.created_at, e.created_by,
              e.approved_at, e.approved_by,
              CONCAT(u.first_name, ' ', u.last_name) as organizer_name,
              u.email as organizer_email,
              CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name,
              approver.email as approved_by_email
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN users approver ON e.approved_by = approver.id
       WHERE e.id = ?`,
      [eventId]
    );

    if (!eventRows || eventRows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const [attendeesRows] = await pool.execute(
      `SELECT r.id as rsvp_id, r.created_at as signed_up_at, r.status as rsvp_status,
              u.id as user_id, u.first_name, u.last_name, u.email
       FROM rsvps r
       INNER JOIN users u ON r.user_id = u.id
       WHERE r.event_id = ? AND r.status = 'going'
       ORDER BY r.created_at ASC`,
      [eventId]
    );

    const event = eventRows[0];
    const attendees = (attendeesRows || []).map((row) => ({
      rsvp_id: row.rsvp_id,
      user_id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      signed_up_at: row.signed_up_at,
      rsvp_status: row.rsvp_status,
    }));

    return res.status(200).json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        venue: event.venue,
        address_line1: event.address_line1,
        address_line2: event.address_line2,
        city: event.city,
        state: event.state,
        zip_code: event.zip_code,
        location: event.location,
        category: event.category,
        status: event.status,
        capacity: event.capacity,
        ticket_price: event.ticket_price,
        created_at: event.created_at,
        created_by: event.created_by,
        approved_at: event.approved_at,
        approved_by: event.approved_by,
        approved_by_name: event.approved_by_name,
        approved_by_email: event.approved_by_email,
        organizer_name: event.organizer_name,
        organizer_email: event.organizer_email,
      },
      attendees,
    });
  } catch (error) {
    console.error("Failed to fetch admin event details:", error);
    return res.status(500).json({ message: "Failed to fetch event details" });
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

// GET /api/admin/users - Get all users
router.get("/users", async (req, res) => {
  try {
    const sql = `
      SELECT 
        id,
        first_name,
        last_name,
        email,
        role,
        created_at
      FROM users
      ORDER BY created_at DESC
    `;

    const [rows] = await pool.execute(sql);
    return res.status(200).json(rows || []);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return res.status(500).json({ 
      message: "Failed to fetch users",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

// GET /api/admin/users/:id - Get user details with events
router.get("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Get user info
    const [userRows] = await pool.execute(
      "SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];

    // Get events created by user (active listings - approved events)
    const [createdEvents] = await pool.execute(`
      SELECT 
        e.id,
        e.title,
        e.category,
        e.status,
        e.starts_at,
        e.created_at,
        COALESCE(rsvp_counts.rsvp_count, 0) as rsvp_count
      FROM events e
      LEFT JOIN (
        SELECT event_id, COUNT(*) as rsvp_count
        FROM rsvps
        WHERE status = 'going'
        GROUP BY event_id
      ) rsvp_counts ON e.id = rsvp_counts.event_id
      WHERE e.created_by = ? AND e.status = 'approved'
      ORDER BY e.created_at DESC
    `, [userId]);

    // Get pending events created by user
    const [pendingEvents] = await pool.execute(`
      SELECT 
        e.id,
        e.title,
        e.category,
        e.status,
        e.starts_at,
        e.created_at,
        COALESCE(rsvp_counts.rsvp_count, 0) as rsvp_count
      FROM events e
      LEFT JOIN (
        SELECT event_id, COUNT(*) as rsvp_count
        FROM rsvps
        WHERE status = 'going'
        GROUP BY event_id
      ) rsvp_counts ON e.id = rsvp_counts.event_id
      WHERE e.created_by = ? AND e.status = 'pending'
      ORDER BY e.created_at DESC
    `, [userId]);

    // Get events user is attending
    const [attendingEvents] = await pool.execute(`
      SELECT 
        e.id,
        e.title,
        e.category,
        e.status,
        e.starts_at,
        r.created_at as rsvp_date
      FROM rsvps r
      INNER JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ? AND r.status = 'going'
      ORDER BY r.created_at DESC
    `, [userId]);

    return res.status(200).json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
      createdEvents: createdEvents || [],
      pendingEvents: pendingEvents || [],
      attendingEvents: attendingEvents || [],
    });
  } catch (error) {
    console.error("Failed to fetch user details:", error);
    return res.status(500).json({ 
      message: "Failed to fetch user details",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

// PATCH /api/admin/users/:id - Update a user's role (only user/organizer; cannot change admins)
router.patch("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { role: newRole } = req.body || {};

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (newRole !== "user" && newRole !== "organizer") {
      return res.status(400).json({ message: "Role must be 'user' or 'organizer'" });
    }

    const [userRows] = await pool.execute(
      "SELECT id, role FROM users WHERE id = ?",
      [userId]
    );
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = userRows[0];
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot change an admin user's role" });
    }

    await pool.execute("UPDATE users SET role = ? WHERE id = ?", [newRole, userId]);

    // When role is touched: clear organizer_signups so the user can reapply or doesn't have a stale queue entry.
    // - Promoted to organizer: remove signup so it doesn't stay in the queue.
    // - Demoted to user: remove signup so they can sign up as organizer again.
    await pool.execute("DELETE FROM organizer_signups WHERE user_id = ?", [userId]).catch(() => {});

    return res.status(200).json({ message: "Role updated", role: newRole });
  } catch (error) {
    console.error("Failed to update user role:", error);
    return res.status(500).json({
      message: "Failed to update user role",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
});

// DELETE /api/admin/users/:id - Delete a user (only organizers/users, not admins)
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Check if user exists and get their role
    const [userRows] = await pool.execute(
      "SELECT id, role FROM users WHERE id = ?",
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];

    // Prevent deletion of admin users
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin users" });
    }

    // Delete user (cascade will handle related records like events, rsvps, favorites)
    await pool.execute("DELETE FROM users WHERE id = ?", [userId]);

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return res.status(500).json({ 
      message: "Failed to delete user",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

// DELETE /api/admin/users/:userId/unattend/:eventId - Unattend a user from an event (body: { reason } required)
router.delete("/users/:userId/unattend/:eventId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const eventId = parseInt(req.params.eventId, 10);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (!userId || isNaN(userId) || !eventId || isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid user ID or event ID" });
    }
    if (!reason) {
      return res.status(400).json({ message: "Reason for unattending is required" });
    }

    // Delete RSVP
    const [result] = await pool.execute(
      "DELETE FROM rsvps WHERE user_id = ? AND event_id = ?",
      [userId, eventId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "RSVP not found" });
    }

    // Notify the unattended user (they see it in the bell dropdown). Use integer IDs for Postgres.
    const adminId = req.user?.id != null ? parseInt(String(req.user.id), 10) : null;
    if (!adminId || !Number.isFinite(adminId)) {
      console.error("Unattend: missing or invalid admin id, notification skipped. req.user:", req.user?.id);
    } else {
      const [eventRows] = await pool.execute("SELECT title FROM events WHERE id = ?", [eventId]);
      const eventTitle = eventRows?.[0]?.title || "an event";
      const message = `You have been unattended from ${eventTitle}, by an admin. Click to see reason.`;
      const insertWithReason = "INSERT INTO event_notifications (user_id, event_id, sender_id, message, reason) VALUES (?, ?, ?, ?, ?)";
      const insertWithoutReason = "INSERT INTO event_notifications (user_id, event_id, sender_id, message) VALUES (?, ?, ?, ?)";
      const paramsWithReason = [userId, eventId, adminId, message, reason];
      const paramsWithoutReason = [userId, eventId, adminId, message];
      try {
        await pool.execute(insertWithReason, paramsWithReason);
      } catch (notifErr) {
        try {
          await pool.execute(insertWithoutReason, paramsWithoutReason);
        } catch (fallbackErr) {
          console.error("Failed to create unattend notification (tried with and without reason):", notifErr.message, fallbackErr.message);
        }
      }
    }

    return res.status(200).json({ message: "User unattended from event successfully" });
  } catch (error) {
    console.error("Failed to unattend user from event:", error);
    return res.status(500).json({
      message: "Failed to unattend user from event",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

// GET /api/admin/analytics - Get analytics data (this-month focus; 12-month trend includes current month)
router.get("/analytics", async (req, res) => {
  try {
    // Current month window (resets each month)
    const [thisMonthUsers] = await pool.execute(`
      SELECT COUNT(*)::int as count FROM users
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `);
    const [thisMonthEvents] = await pool.execute(`
      SELECT COUNT(*)::int as count FROM events
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `);
    const [thisMonthRsvps] = await pool.execute(`
      SELECT COUNT(*)::int as count FROM rsvps
      WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status = 'going'
    `);
    const currentMonthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

    // Last 12 months including current month (so chart always ends on current month)
    const [eventsOverTimeRaw] = await pool.execute(`
      SELECT 
        to_char(created_at, 'YYYY-MM') as month,
        COUNT(*)::int as count
      FROM events
      WHERE created_at >= (date_trunc('month', CURRENT_DATE) - INTERVAL '11 months')
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `);
    const [usersOverTimeRaw] = await pool.execute(`
      SELECT 
        to_char(created_at, 'YYYY-MM') as month,
        COUNT(*)::int as count
      FROM users
      WHERE created_at >= (date_trunc('month', CURRENT_DATE) - INTERVAL '11 months')
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `);
    const [rsvpsOverTimeRaw] = await pool.execute(`
      SELECT 
        to_char(created_at, 'YYYY-MM') as month,
        COUNT(*)::int as count
      FROM rsvps
      WHERE created_at >= (date_trunc('month', CURRENT_DATE) - INTERVAL '11 months') AND status = 'going'
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `);

    // Build last 12 months ending with current month (fill missing months with 0)
    const monthKeys = [];
    const d = new Date();
    for (let i = 11; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      monthKeys.push(m.getFullYear() + "-" + String(m.getMonth() + 1).padStart(2, "0"));
    }
    const fillSeries = (rows) => {
      const map = (rows || []).reduce((acc, r) => { acc[r.month] = Number(r.count) || 0; return acc; }, {});
      return monthKeys.map((month) => ({ month, count: map[month] ?? 0 }));
    };
    const eventsOverTime = fillSeries(eventsOverTimeRaw);
    const usersOverTime = fillSeries(usersOverTimeRaw);
    const rsvpsOverTime = fillSeries(rsvpsOverTimeRaw);

    // Get events by category
    const [eventsByCategory] = await pool.execute(`
      SELECT 
        category,
        COUNT(*) as count
      FROM events
      WHERE status = 'approved'
      GROUP BY category
      ORDER BY count DESC
    `);

    // Get events by status
    const [eventsByStatus] = await pool.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM events
      GROUP BY status
      ORDER BY count DESC
    `);

    // Get total counts (quoted aliases for Postgres camelCase)
    const [totalCounts] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users) as "totalUsers",
        (SELECT COUNT(*) FROM events) as "totalEvents",
        (SELECT COUNT(*) FROM events WHERE status = 'approved') as "approvedEvents",
        (SELECT COUNT(*) FROM rsvps WHERE status = 'going') as "totalRsvps"
    `);

    return res.status(200).json({
      currentMonthLabel,
      thisMonth: {
        users: Number(thisMonthUsers[0]?.count) || 0,
        events: Number(thisMonthEvents[0]?.count) || 0,
        rsvps: Number(thisMonthRsvps[0]?.count) || 0,
      },
      eventsOverTime: eventsOverTime || [],
      usersOverTime: usersOverTime || [],
      rsvpsOverTime: rsvpsOverTime || [],
      eventsByCategory: eventsByCategory || [],
      eventsByStatus: eventsByStatus || [],
      totals: totalCounts[0] || {
        totalUsers: 0,
        totalEvents: 0,
        approvedEvents: 0,
        totalRsvps: 0,
      },
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return res.status(500).json({ 
      message: "Failed to fetch analytics",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});


// PUT /api/admin/settings/content - Update editable text blocks (hero + most attended only; about/founders moved to About page)
router.put("/settings/content", async (req, res) => {
  try {
    const { home_hero_headline, home_hero_subheadline, home_most_attended_title } = req.body;
    const updates = [
      ["content_home_hero_headline", home_hero_headline],
      ["content_home_hero_subheadline", home_hero_subheadline],
      ["content_home_most_attended_title", home_most_attended_title],
    ];
    for (const [key, value] of updates) {
      const val = value != null ? String(value).substring(0, 10000) : "";
      await pool.execute(
        `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
        [key, val]
      );
    }
    return res.status(200).json({ message: "Content updated" });
  } catch (e) {
    console.error("Update content error:", e);
    return res.status(500).json({ message: "Failed to update content" });
  }
});

// GET /api/admin/categories - List categories (admin)
router.get("/categories", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, name ASC").catch(() => [[]]);
    return res.status(200).json(rows || []);
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// POST /api/admin/categories - Add category
router.post("/categories", async (req, res) => {
  try {
    const name = req.body.name != null ? String(req.body.name).trim().substring(0, 100) : "";
    if (!name) return res.status(400).json({ message: "Category name is required" });
    await pool.execute("INSERT INTO categories (name, sort_order) VALUES (?, 0)", [name]);
    const [rows] = await pool.execute("SELECT id, name, sort_order FROM categories WHERE name = ? ORDER BY id DESC LIMIT 1", [name]);
    const row = rows && rows[0] ? rows[0] : null;
    if (!row) return res.status(500).json({ message: "Failed to create category" });
    return res.status(201).json({ id: row.id, name: row.name, sort_order: row.sort_order || 0 });
  } catch (e) {
    if (e.code === "23505") return res.status(400).json({ message: "Category already exists" });
    return res.status(500).json({ message: "Failed to add category" });
  }
});

// PUT /api/admin/categories/:id - Update category
router.put("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const name = req.body.name != null ? String(req.body.name).trim().substring(0, 100) : "";
    if (!name) return res.status(400).json({ message: "Category name is required" });
    const [r] = await pool.execute("UPDATE categories SET name = ? WHERE id = ?", [name, id]);
    if (!r || r.affectedRows === 0) return res.status(404).json({ message: "Category not found" });
    return res.status(200).json({ message: "Updated", id, name });
  } catch (e) {
    if (e.code === "23505") return res.status(400).json({ message: "Category already exists" });
    return res.status(500).json({ message: "Failed to update category" });
  }
});

// DELETE /api/admin/categories/:id - Delete category
router.delete("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    await pool.execute("DELETE FROM categories WHERE id = ?", [id]);
    return res.status(200).json({ message: "Deleted" });
  } catch (e) {
    return res.status(500).json({ message: "Failed to delete category" });
  }
});

// POST /api/admin/events/backfill-coordinates - Backfill lat/lng for events missing coordinates (admin only)
router.post("/events/backfill-coordinates", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
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
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          { headers: { "User-Agent": "Eventure/1.0 (https://eventure.com/contact)" } }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) return null;
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lng: lon };
        return null;
      } catch {
        return null;
      }
    }

    const [rows] = await pool.execute(
      `SELECT id, venue, address_line1, city, state, zip_code
       FROM events
       WHERE (lat IS NULL OR lng IS NULL)
         AND (address_line1 IS NOT NULL AND address_line1 != ''
              OR venue IS NOT NULL AND venue != ''
              OR (city IS NOT NULL AND city != '' AND state IS NOT NULL AND state != '' AND zip_code IS NOT NULL AND zip_code != ''))
       ORDER BY id ASC`
    );
    const events = Array.isArray(rows) ? rows : [];
    let updated = 0;
    let failed = 0;
    for (const e of events) {
      const coords = await geocodeAddress(
        e.venue ?? "",
        e.address_line1 ?? "",
        e.city ?? "",
        e.state ?? "",
        e.zip_code ?? ""
      );
      if (coords) {
        await pool.execute("UPDATE events SET lat = ?, lng = ? WHERE id = ?", [coords.lat, coords.lng, e.id]);
        updated++;
      } else {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 1100));
    }
    return res.status(200).json({
      message: "Backfill complete",
      total: events.length,
      updated,
      failed,
    });
  } catch (e) {
    console.error("Backfill coordinates error:", e);
    return res.status(500).json({ message: "Failed to backfill coordinates" });
  }
});

// GET /api/admin/organizer-signups - List only pending organizer signup applications (admin). Approved/rejected are not shown.
router.get("/organizer-signups", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        s.id,
        s.user_id,
        s.organization_name,
        s.event_types,
        s.reason,
        s.additional_info,
        s.status,
        s.created_at,
        s.reviewed_at,
        u.first_name,
        u.last_name,
        u.email,
        u.created_at as user_created_at
      FROM organizer_signups s
      JOIN users u ON u.id = s.user_id
      WHERE s.status = 'pending'
      ORDER BY s.created_at DESC
    `).catch(() => [[]]);
    const list = (rows || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      organizationName: r.organization_name || null,
      eventTypes: r.event_types || null,
      reason: r.reason || null,
      additionalInfo: r.additional_info || null,
      status: r.status,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at || null,
      user: {
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        createdAt: r.user_created_at,
      },
    }));
    return res.status(200).json(list);
  } catch (e) {
    if (e.code === "42P01") return res.status(200).json([]);
    console.error("Failed to fetch organizer signups:", e);
    return res.status(500).json({ message: "Failed to fetch organizer signups" });
  }
});

// PATCH /api/admin/organizer-signups/:id - Approve or reject signup (admin)
router.patch("/organizer-signups/:id", async (req, res) => {
  try {
    const signupId = parseInt(req.params.id, 10);
    const adminId = req.user?.id;
    const { action } = req.body || {};
    if (!signupId || isNaN(signupId)) return res.status(400).json({ message: "Invalid signup ID" });
    if (action !== "approve" && action !== "reject") return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });

    const [signupRows] = await pool.execute(
      "SELECT id, user_id, status FROM organizer_signups WHERE id = ?",
      [signupId]
    );
    if (!signupRows || signupRows.length === 0) return res.status(404).json({ message: "Signup not found" });
    const signup = signupRows[0];
    if (signup.status !== "pending") return res.status(400).json({ message: "This signup has already been reviewed" });

    const now = new Date().toISOString();
    if (action === "approve") {
      await pool.execute("UPDATE users SET role = ? WHERE id = ?", ["organizer", signup.user_id]);
      await pool.execute(
        "UPDATE organizer_signups SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?",
        ["approved", now, adminId, signupId]
      );
      return res.status(200).json({ message: "Applicant approved as organizer" });
    }
    await pool.execute(
      "UPDATE organizer_signups SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?",
      ["rejected", now, adminId, signupId]
    );
    return res.status(200).json({ message: "Signup rejected" });
  } catch (e) {
    console.error("Failed to update organizer signup:", e);
    return res.status(500).json({ message: "Failed to update signup" });
  }
});

// PUT /api/admin/settings/hero - Update hero background settings (admin only)
router.put("/settings/hero", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const { type, color, image } = req.body || {};

    if (!type || (type !== "color" && type !== "image")) {
      return res.status(400).json({ message: "Invalid background type. Must be 'color' or 'image'" });
    }

    if (type === "color" && !color) {
      return res.status(400).json({ message: "Color is required when type is 'color'" });
    }

    const imageVal = image != null && String(image).trim() !== "" ? String(image).trim() : null;
    if (type === "image" && !imageVal) {
      return res.status(400).json({ message: "Image is required when type is 'image'. Upload an image first, then click Save Hero." });
    }

    // Ensure settings table exists (Postgres)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    // Update or insert settings (Postgres ON CONFLICT)
    await pool.execute(`
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES ('hero_background_type', ?)
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
    `, [type]);

    if (type === "color") {
      await pool.execute(`
        INSERT INTO site_settings (setting_key, setting_value)
        VALUES ('hero_background_color', ?)
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
      `, [color]);
      await pool.execute(`
        INSERT INTO site_settings (setting_key, setting_value)
        VALUES ('hero_background_image', ?)
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
      `, [null]);
    } else {
      await pool.execute(`
        INSERT INTO site_settings (setting_key, setting_value)
        VALUES ('hero_background_image', ?)
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
      `, [imageVal]);
    }

    return res.status(200).json({ 
      message: "Hero background updated successfully",
      settings: {
        type,
        color: type === "color" ? color : null,
        image: type === "image" ? image : null,
      }
    });
  } catch (error) {
    console.error("Failed to update hero settings:", error);
    return res.status(500).json({ 
      message: "Failed to update hero background",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

module.exports = router;
