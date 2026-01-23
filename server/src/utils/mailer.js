require("dotenv").config();
const nodemailer = require("nodemailer");

let transporter = null;
let mailerMode = "DEV_FALLBACK"; // "SMTP" or "DEV_FALLBACK"

// Log SMTP config status (safe - no secrets)
function logSmtpConfig() {
  const hasHost = !!process.env.SMTP_HOST;
  const hasPort = !!process.env.SMTP_PORT;
  const hasUser = !!process.env.SMTP_USER;
  const hasPass = !!process.env.SMTP_PASS;
  const hasFrom = !!process.env.SMTP_FROM;

  console.log("\n📧 SMTP Configuration:");
  console.log(`   SMTP_HOST present: ${hasHost}`);
  console.log(`   SMTP_PORT present: ${hasPort}`);
  console.log(`   SMTP_USER present: ${hasUser}`);
  console.log(`   SMTP_PASS present: ${hasPass}`);
  console.log(`   SMTP_FROM present: ${hasFrom}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);
  console.log(`   PORT: ${process.env.PORT || 5000}`);
  console.log("");
}

// Initialize transporter
function initTransporter() {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_FROM = process.env.SMTP_FROM || "Eventure <no-reply@eventure.com>";

  // Check if SMTP env vars are present
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("⚠️  SMTP configuration missing. Email sending disabled. OTP codes will be logged to console.");
    mailerMode = "DEV_FALLBACK";
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // Use STARTTLS for port 587
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    return transporter;
  } catch (error) {
    console.error("❌ Failed to create SMTP transporter:", error.message);
    mailerMode = "DEV_FALLBACK";
    return null;
  }
}

// Verify SMTP transport (run once at startup)
async function verifyTransport() {
  logSmtpConfig();

  if (!transporter) {
    initTransporter();
  }

  if (!transporter) {
    console.warn("⚠️  SMTP not configured. Email sending disabled. OTP codes will be logged to console in DEV mode.");
    mailerMode = "DEV_FALLBACK";
    return false;
  }

  try {
    await transporter.verify();
    console.log("✅ SMTP verified");
    mailerMode = "SMTP";
    return true;
  } catch (error) {
    console.error(`❌ SMTP verify failed: ${error.message}`);
    console.warn("⚠️  Email sending disabled. OTP codes will be logged to console in DEV mode.");
    mailerMode = "DEV_FALLBACK";
    return false;
  }
}

// Send email
async function sendMail({ to, subject, text, html }) {
  const SMTP_FROM = process.env.SMTP_FROM || "Eventure <no-reply@eventure.com>";

  if (mailerMode === "DEV_FALLBACK" || !transporter) {
    // DEV fallback: log to console
    console.log("\n📧 [DEV FALLBACK] Email would be sent:");
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Text: ${text}`);
    if (html) console.log(`   HTML: ${html}`);
    console.log("");
    return { ok: true, mode: "fallback" };
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text,
      html: html || text,
    });
    console.log(`✅ Email sent to ${to} (Message ID: ${info.messageId})`);
    return { ok: true, mode: "smtp", messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    // Log full error details for debugging
    if (error.response) {
      console.error("   SMTP Response:", error.response);
    }
    if (error.responseCode) {
      console.error("   Response Code:", error.responseCode);
    }
    // Still log to console as fallback
    console.log("\n📧 [FALLBACK] Email content:");
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Text: ${text}`);
    console.log("");
    return { ok: false, mode: "fallback", error: error.message };
  }
}

// Get current mailer mode
function getMode() {
  return mailerMode;
}

// Initialize on module load
initTransporter();

module.exports = {
  sendMail,
  verifyTransport,
  getMode,
};
