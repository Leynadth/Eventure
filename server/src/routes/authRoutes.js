const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { signToken, setAuthCookie } = require("../utils/jwt");

const router = express.Router();

// Helper function to format user response
function formatUserResponse(user) {
  return {
    id: user.id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

// Email format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Normalize email: trim and lowercase
function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

// Allowed roles for registration only (admin is created manually in DB)
const REGISTER_ALLOWED_ROLES = ["user", "organizer"];

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, role: roleInput } = req.body;
    const emailNormalized = normalizeEmail(email);

    // Role: only "user" and "organizer" allowed; else force "user"
    const role = roleInput && REGISTER_ALLOWED_ROLES.includes(roleInput)
      ? roleInput
      : "user";

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate email format
    if (!EMAIL_REGEX.test(emailNormalized)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password length
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      where: { email: emailNormalized },
    });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // Hash password with bcrypt (10 salt rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email: emailNormalized,
      passwordHash,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      role,
    });

    return res.status(201).json({
      message: "Registered",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Email already in use" });
    }
    return res.status(500).json({ message: "Registration failed" });
  }
});

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const emailNormalized = normalizeEmail(email);

    // Find user by email
    const user = await User.findOne({
      where: { email: emailNormalized },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password with bcrypt.compare against passwordHash
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create JWT payload
    const payload = {
      id: user.id.toString(),
      role: user.role,
      email: user.email,
    };

    // Sign token
    const token = signToken(payload);

    // Set cookie "token" using setAuthCookie
    setAuthCookie(res, token);

    // Return success response
    return res.status(200).json({
      message: "Logged in",
      token: token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed" });
  }
});

// POST /auth/logout
router.post("/auth/logout", (req, res) => {
  res.clearCookie("token");
  return res.status(200).json({ message: "Logged out" });
});

module.exports = router;
