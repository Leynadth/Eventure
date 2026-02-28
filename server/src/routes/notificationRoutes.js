const express = require("express");
const { pool } = require("../db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// GET /api/notifications - List notifications for current user (organizer signup status + event messages)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id != null ? parseInt(String(req.user.id), 10) : null;
    if (!userId || !Number.isFinite(userId)) {
      return res.json({ organizerSignup: null, dismissedApprovedSignupId: null, messages: [], unreadCount: 0 });
    }
    const currentRole = req.user?.role;
    const [signupRows] = await pool.execute(
      "SELECT id, status, created_at, reviewed_at FROM organizer_signups WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [userId]
    ).catch(() => [[]]);
    const signup = signupRows && signupRows[0]
      ? {
          id: signupRows[0].id,
          status: signupRows[0].status,
          created_at: signupRows[0].created_at,
          reviewed_at: signupRows[0].reviewed_at,
        }
      : null;

    let showSignupStatus = null;
    let dismissedApprovedSignupId = null;
    if (signup) {
      if (signup.status === "approved" && currentRole === "user") {
        showSignupStatus = null;
      } else {
        const [dismissed] = await pool.execute(
          "SELECT organizer_signup_id FROM dismissed_signup_notifications WHERE user_id = ? AND organizer_signup_id = ?",
          [userId, signup.id]
        ).catch(() => []);
        if (signup.status === "approved" && dismissed && dismissed.length > 0) {
          dismissedApprovedSignupId = signup.id;
        } else if (signup.status === "approved") {
          showSignupStatus = signup;
        } else if (signup.status === "rejected" && signup.reviewed_at) {
          const reviewedAt = new Date(signup.reviewed_at).getTime();
          if (Date.now() - reviewedAt > TWO_WEEKS_MS) {
            showSignupStatus = null;
          } else {
            showSignupStatus = signup;
          }
        } else {
          showSignupStatus = signup;
        }
      }
    }

    const selectFull = `SELECT n.id, n.event_id, n.message, n.read_at, n.viewed_at, n.created_at, n.reason, e.title AS event_title,
              u.first_name AS sender_first_name, u.last_name AS sender_last_name
       FROM event_notifications n
       JOIN events e ON e.id = n.event_id
       JOIN users u ON u.id = n.sender_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`;
    const selectMinimal = `SELECT n.id, n.event_id, n.message, n.read_at, n.created_at, e.title AS event_title,
              u.first_name AS sender_first_name, u.last_name AS sender_last_name
       FROM event_notifications n
       JOIN events e ON e.id = n.event_id
       JOIN users u ON u.id = n.sender_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`;

    let msgRows = [];
    try {
      const [rows] = await pool.execute(selectFull, [userId]);
      msgRows = rows || [];
    } catch (colErr) {
      if (colErr.code === "42703") {
        const [rows] = await pool.execute(selectMinimal, [userId]).catch(() => [[]]);
        msgRows = (rows || []).map((r) => ({ ...r, reason: null, viewed_at: null }));
      } else {
        throw colErr;
      }
    }

    const messages = (msgRows || []).map((r) => ({
      id: r.id,
      eventId: r.event_id,
      eventTitle: r.event_title,
      senderName: `${r.sender_first_name || ""} ${r.sender_last_name || ""}`.trim() || "Organizer",
      message: r.message,
      readAt: r.read_at,
      viewedAt: r.viewed_at != null ? r.viewed_at : null,
      createdAt: r.created_at,
      reason: r.reason != null ? r.reason : null,
    }));

    // Badge count: signup (if unread) + messages not yet viewed (user hasn't opened the bell since they arrived)
    const unreadCount = (showSignupStatus && showSignupStatus.status !== "approved" ? 1 : 0) +
      messages.filter((m) => m.viewedAt == null).length;

    return res.json({
      organizerSignup: showSignupStatus,
      dismissedApprovedSignupId,
      messages,
      unreadCount,
    });
  } catch (err) {
    if (err.code === "42P01") {
      return res.json({ organizerSignup: null, dismissedApprovedSignupId: null, messages: [], unreadCount: 0 });
    }
    console.error("Get notifications error:", err);
    return res.status(500).json({ message: err.message || "Failed to load notifications" });
  }
});

// POST /api/notifications/dismiss-signup/:signupId - Dismiss "approved" organizer signup notification
router.post("/dismiss-signup/:signupId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const signupId = parseInt(req.params.signupId, 10);
    if (!signupId || isNaN(signupId)) {
      return res.status(400).json({ message: "Invalid signup ID" });
    }
    const [rows] = await pool.execute(
      "SELECT id, user_id, status FROM organizer_signups WHERE id = ? LIMIT 1",
      [signupId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Signup not found" });
    }
    if (rows[0].user_id.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not your signup" });
    }
    if (rows[0].status !== "approved") {
      return res.status(400).json({ message: "Can only dismiss approved signup notification" });
    }
    await pool.execute(
      "INSERT INTO dismissed_signup_notifications (user_id, organizer_signup_id) VALUES (?, ?) ON CONFLICT (user_id, organizer_signup_id) DO NOTHING",
      [userId, signupId]
    ).catch(() => {});
    return res.status(200).json({ message: "Dismissed" });
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(200).json({ message: "Dismissed" });
    }
    console.error("Dismiss signup notification error:", err);
    return res.status(500).json({ message: err.message || "Failed to dismiss" });
  }
});

// POST /api/notifications/mark-viewed - Mark all event notifications as viewed (clears badge after user opens the bell)
router.post("/mark-viewed", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id != null ? parseInt(String(req.user.id), 10) : null;
    if (!userId || !Number.isFinite(userId)) {
      return res.status(400).json({ message: "Invalid user" });
    }
    try {
      await pool.execute(
        "UPDATE event_notifications SET viewed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND viewed_at IS NULL",
        [userId]
      );
    } catch (e) {
      if (e.code === "42703") {
        // viewed_at column not yet added
        return res.status(200).json({ message: "OK" });
      }
      throw e;
    }
    return res.status(200).json({ message: "OK" });
  } catch (err) {
    console.error("Mark notifications viewed error:", err);
    return res.status(500).json({ message: err.message || "Failed to update" });
  }
});

// DELETE /api/notifications - Clear all event notifications for current user (optional; list stays until user clears)
router.delete("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id != null ? parseInt(String(req.user.id), 10) : null;
    if (!userId || !Number.isFinite(userId)) {
      return res.status(400).json({ message: "Invalid user" });
    }
    await pool.execute("DELETE FROM event_notifications WHERE user_id = ?", [userId]);
    return res.status(200).json({ message: "Notifications cleared" });
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(200).json({ message: "Notifications cleared" });
    }
    console.error("Clear notifications error:", err);
    return res.status(500).json({ message: err.message || "Failed to clear" });
  }
});

// PATCH /api/notifications/:id/read - Mark event message as read
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id != null ? parseInt(String(req.user.id), 10) : null;
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id) || !userId || !Number.isFinite(userId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    const [result] = await pool.execute(
      "UPDATE event_notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json({ message: "Marked as read" });
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(404).json({ message: "Notification not found" });
    }
    console.error("Mark notification read error:", err);
    return res.status(500).json({ message: err.message || "Failed to update" });
  }
});

module.exports = router;
