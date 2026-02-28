const express = require("express");
const { pool } = require("../db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/organizer-signup/me - Get current user's organizer signup if any (authenticated). Role is source of truth: if user is "user", don't return approved signup (they can reapply).
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const currentRole = req.user?.role;
    const [rows] = await pool.execute(
      "SELECT id, status, created_at, reviewed_at FROM organizer_signups WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    let signup = rows && rows[0]
      ? { id: rows[0].id, status: rows[0].status, created_at: rows[0].created_at, reviewed_at: rows[0].reviewed_at }
      : null;
    if (signup && signup.status === "approved" && currentRole === "user") {
      signup = null;
    }
    return res.json({ signup });
  } catch (err) {
    if (err.code === "42P01") {
      return res.json({ signup: null });
    }
    console.error("Get my organizer signup error:", err);
    return res.status(500).json({ message: err.message || "Failed to load signup status" });
  }
});

// POST /api/organizer-signup - Submit organizer signup (authenticated, role must be "user")
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (role !== "user") {
      return res.status(400).json({ message: "Only regular users can apply to become organizers. You are already an organizer or admin." });
    }

    const { organizationName, eventTypes, reason, additionalInfo } = req.body || {};
    const reasonTrimmed = reason != null ? String(reason).trim() : "";
    if (!reasonTrimmed || reasonTrimmed.length < 20) {
      return res.status(400).json({ message: "Please provide a reason (at least 20 characters) for why you want to host events." });
    }

    // Check for existing signup (latest by id). Role is source of truth: if role is "user", treat approved as cleared so they can reapply.
    const [existingRows] = await pool.execute(
      "SELECT id, status, reviewed_at FROM organizer_signups WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [userId]
    );
    const existing = existingRows && existingRows[0];
    if (existing) {
      if (existing.status === "pending") {
        return res.status(409).json({ message: "You have already registered. Please wait for a response." });
      }
      if (existing.status === "approved" && role === "user") {
        await pool.execute("DELETE FROM organizer_signups WHERE user_id = ?", [userId]);
      } else if (existing.status === "approved") {
        return res.status(409).json({ message: "You have already registered. Please wait for a response." });
      } else if (existing.status === "rejected" && existing.reviewed_at) {
        const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
        const reviewedAt = new Date(existing.reviewed_at).getTime();
        if (Date.now() - reviewedAt < twoWeeksMs) {
          return res.status(409).json({ message: "You may reapply in 2 weeks." });
        }
      }
    }

    const orgName = organizationName != null ? String(organizationName).trim().substring(0, 255) : null;
    const types = eventTypes != null ? String(eventTypes).trim().substring(0, 2000) : null;
    const extra = additionalInfo != null ? String(additionalInfo).trim().substring(0, 2000) : null;

    await pool.execute(
      `INSERT INTO organizer_signups (user_id, organization_name, event_types, reason, additional_info, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, orgName || null, types || null, reasonTrimmed.substring(0, 2000), extra]
    );

    return res.status(201).json({ message: "Organizer signup submitted. You will receive a notification if you are accepted within 1–3 days." });
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(500).json({ message: "Organizer signups are not set up. Please run the database migration: server/database/add_organizer_signups.sql" });
    }
    console.error("Organizer signup error:", err);
    return res.status(500).json({ message: err.message || "Failed to submit signup" });
  }
});

module.exports = router;
