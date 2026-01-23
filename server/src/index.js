require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const sequelize = require("./db");
const authRoutes = require("./routes/authRoutes");
const eventsRoutes = require("./routes/eventsRoutes");
const devRoutes = require("./routes/devRoutes");
const { verifyTransport } = require("./utils/mailer");

const app = express();
const PORT = process.env.PORT || 5000;

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error("ERROR: JWT_SECRET environment variable is required");
  process.exit(1);
}

if (!process.env.DB_NAME) {
  console.error("ERROR: DB_NAME environment variable is required");
  process.exit(1);
}

// CORS allowlist
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman or curl)
    if (!origin) {
      return callback(null, true);
    }
    // Check if origin is in allowlist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Handle OPTIONS preflight requests - CORS middleware already handles this

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Auth routes
app.use("/api", authRoutes);

// Events routes
app.use("/api/events", eventsRoutes);

// Dev routes (only in development)
if (process.env.NODE_ENV !== "production") {
  app.use("/api", devRoutes);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS error: Origin not allowed" });
  }
  res.status(500).json({ message: "Internal server error" });
});

// Connect to MySQL and start server
(async () => {
  try {
    console.log("Attempting to connect to MySQL database...");
    await sequelize.authenticate();
    console.log("MySQL database connected successfully");
    
    // Verify SMTP transport
    await verifyTransport();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:");
    console.error("Error details:", error.message);
    console.error("MySQL connection failed. Please check:");
    console.error("1. Your MySQL server is running");
    console.error("2. Your database credentials are correct in .env file");
    console.error("3. The database 'eventure' exists");
    console.error("4. Your network connection is working");
    process.exit(1);
  }
})();

module.exports = app;
