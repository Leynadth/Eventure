require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const sequelize = require("./db");
const { pool, pgPool } = require("./db");
const authRoutes = require("./routes/authRoutes");
const eventsRoutes = require("./routes/eventsRoutes");
const favoritesRoutes = require("./routes/favoritesRoutes");
const rsvpRoutes = require("./routes/rsvpRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const followRoutes = require("./routes/followRoutes");
const organizerSignupRoutes = require("./routes/organizerSignupRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const devRoutes = require("./routes/devRoutes");
const { verifyTransport, getMode, isSmtpConfigured } = require("./utils/mailer");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error("ERROR: JWT_SECRET environment variable is required");
  process.exit(1);
}

if (!process.env.DATABASE_URL && !process.env.DB_NAME) {
  console.error("ERROR: DATABASE_URL (or DB_NAME for local Postgres) is required");
  process.exit(1);
}

app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];
if (process.env.FRONTEND_URL) {
  const url = process.env.FRONTEND_URL.replace(/\/$/, "");
  if (!allowedOrigins.includes(url)) allowedOrigins.push(url);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith(".pages.dev")) return callback(null, true);
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, try again later." },
});
app.use((req, res, next) => {
  if (/\/api\/auth\/(login|register|forgot-password|reset-password-with-code)/.test(req.originalUrl || req.path)) {
    return authLimiter(req, res, next);
  }
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/uploads/hero", express.static(path.join(__dirname, "../uploads/hero")));
app.use("/uploads/profiles", express.static(path.join(__dirname, "../uploads/profiles")));

app.get("/health", async (req, res) => {
  try {
    await pool.execute("SELECT 1");
    const emailMode = getMode();
    res.status(200).json({
      ok: true,
      email: emailMode,
      smtpConfigured: isSmtpConfigured(),
      emailReady: emailMode === "SMTP",
    });
  } catch (err) {
    res.status(503).json({ ok: false, error: "Database unreachable" });
  }
});

app.use("/api", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/rsvp", rsvpRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/follows", followRoutes);
app.use("/api/organizer-signup", organizerSignupRoutes);
app.use("/api/notifications", notificationRoutes);
if (process.env.NODE_ENV !== "production") {
  app.use("/api", devRoutes);
}

app.use((err, req, res, next) => {
  console.error("Error:", err);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS error: Origin not allowed" });
  }
  res.status(500).json({ message: "Internal server error" });
});

(async () => {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Ensure event_notifications.reason exists (for admin unattend notifications on live)
    try {
      await pgPool.query("ALTER TABLE event_notifications ADD COLUMN IF NOT EXISTS reason TEXT NULL");
      await pgPool.query("ALTER TABLE event_notifications ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP NULL");
      console.log("Database migration check: event_notifications.reason, viewed_at OK");
    } catch (migErr) {
      if (migErr.code === "42P01") {
        console.warn("event_notifications table not found; run server/database/add_notifications.sql first.");
      } else {
        console.warn("Migration check (event_notifications.reason):", migErr.message);
      }
    }

    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS event_announcements (
          id BIGSERIAL PRIMARY KEY,
          event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pgPool.query("CREATE INDEX IF NOT EXISTS idx_event_announcements_event_id ON event_announcements (event_id)");
      await pgPool.query("CREATE INDEX IF NOT EXISTS idx_event_announcements_created_at ON event_announcements (created_at DESC)");
      console.log("Database migration check: event_announcements OK");
    } catch (migErr) {
      if (migErr.code !== "42P01") console.warn("Migration check (event_announcements):", migErr.message);
    }

    await verifyTransport();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      const host = process.env.NODE_ENV === "production" ? "this server" : `http://localhost:${PORT}`;
      console.log(`Health check: ${host}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    console.error("Check DATABASE_URL (or DB_* vars) and network.");
    process.exit(1);
  }
})();

module.exports = app;
