/**
 * Seed filler users, events, and RSVPs for development/demo.
 * Uses the same DB and bcrypt as the app. All accounts use password: EventureDemo1!
 * Run from project root: node server/scripts/seed-filler-data.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const bcrypt = require("bcrypt");
const { pool } = require("../src/db");

const SEED_PASSWORD = "EventureDemo1!";

const ORGANIZERS = [
  { firstName: "Jordan", lastName: "Smith", email: "jordan.smith@email.com" },
  { firstName: "Alex", lastName: "Chen", email: "alex.chen@example.com" },
  { firstName: "Morgan", lastName: "Taylor", email: "morgan.taylor@gmail.com" },
  { firstName: "Riley", lastName: "Johnson", email: "riley.johnson@outlook.com" },
  { firstName: "Casey", lastName: "Williams", email: "casey.williams@yahoo.com" },
];

const ATTENDEES = [
  { firstName: "Sam", lastName: "Davis", email: "sam.davis@email.com" },
  { firstName: "Jamie", lastName: "Martinez", email: "jamie.martinez@example.com" },
  { firstName: "Quinn", lastName: "Anderson", email: "quinn.anderson@gmail.com" },
  { firstName: "Avery", lastName: "Thomas", email: "avery.thomas@outlook.com" },
  { firstName: "Reese", lastName: "Jackson", email: "reese.jackson@yahoo.com" },
  { firstName: "Dakota", lastName: "White", email: "dakota.white@email.com" },
  { firstName: "Skyler", lastName: "Harris", email: "skyler.harris@example.com" },
  { firstName: "Parker", lastName: "Clark", email: "parker.clark@gmail.com" },
  { firstName: "Blake", lastName: "Lewis", email: "blake.lewis@outlook.com" },
  { firstName: "Cameron", lastName: "Walker", email: "cameron.walker@yahoo.com" },
  { firstName: "Drew", lastName: "Hall", email: "drew.hall@email.com" },
  { firstName: "Emery", lastName: "Young", email: "emery.young@example.com" },
  { firstName: "Finley", lastName: "King", email: "finley.king@gmail.com" },
  { firstName: "Hayden", lastName: "Wright", email: "hayden.wright@outlook.com" },
];

const EVENT_TEMPLATES = [
  { title: "Downtown Live Music Night", category: "Music", city: "Providence", state: "Rhode Island", venue: "The Arcade", zip: "02903" },
  { title: "Tech Meetup: APIs & Microservices", category: "Tech", city: "Boston", state: "Massachusetts", venue: "Cambridge Innovation Center", zip: "02142" },
  { title: "Community 5K Run", category: "Sports", city: "Warwick", state: "Rhode Island", venue: "City Park", zip: "02886" },
  { title: "Food Truck Festival", category: "Food", city: "Newport", state: "Rhode Island", venue: "Waterfront Park", zip: "02840" },
  { title: "Local Art Gallery Opening", category: "Arts", city: "Providence", state: "Rhode Island", venue: "RISD Gallery", zip: "02906" },
  { title: "Startup Networking Happy Hour", category: "Networking", city: "Boston", state: "Massachusetts", venue: "WeWork South Station", zip: "02110" },
  { title: "Intro to Web Development Workshop", category: "Workshop", city: "Providence", state: "Rhode Island", venue: "PVD Innovation Hub", zip: "02903" },
  { title: "Annual Business Leaders Conference", category: "Conference", city: "Boston", state: "Massachusetts", venue: "Hynes Convention Center", zip: "02115" },
  { title: "Summer Jazz Festival", category: "Festival", city: "Newport", state: "Rhode Island", venue: "Fort Adams State Park", zip: "02840" },
  { title: "Campus Career Fair", category: "Campus", city: "Kingston", state: "Rhode Island", venue: "URI Memorial Union", zip: "02881" },
  { title: "Acoustic Night at The Met", category: "Concerts", city: "Pawtucket", state: "Rhode Island", venue: "The Met", zip: "02860" },
  { title: "Small Business Roundtable", category: "Business", city: "Providence", state: "Rhode Island", venue: "Providence Public Library", zip: "02903" },
  { title: "Game Night & Trivia", category: "Other", city: "Cranston", state: "Rhode Island", venue: "Board Game Cafe", zip: "02920" },
];

function addDays(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function toISODateTime(d) {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  console.log("Seeding filler users, events, and RSVPs...\n");

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const allUsers = [...ORGANIZERS.map((u) => ({ ...u, role: "organizer" })), ...ATTENDEES.map((u) => ({ ...u, role: "user" }))];

  for (const u of allUsers) {
    const email = u.email.trim().toLowerCase();
    try {
      await pool.execute(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (email) DO NOTHING`,
        [email, passwordHash, u.firstName, u.lastName, u.role]
      );
    } catch (e) {
      if (e.code !== "23505") throw e;
    }
  }

  const seedEmails = allUsers.map((u) => u.email.trim().toLowerCase());
  const placeholders = seedEmails.map(() => "?").join(", ");
  const [userRows] = await pool.execute(
    `SELECT id, email, role FROM users WHERE email IN (${placeholders}) ORDER BY role DESC, id`,
    seedEmails
  );
  const userByEmail = {};
  (userRows || []).forEach((r) => (userByEmail[r.email] = r));
  const organizerIds = ORGANIZERS.map((u) => userByEmail[u.email.trim().toLowerCase()]?.id).filter(Boolean);
  const attIds = ATTENDEES.map((u) => userByEmail[u.email.trim().toLowerCase()]?.id).filter(Boolean);

  if (organizerIds.length < 1) {
    console.error("No organizers in DB. Create at least one organizer user first.");
    process.exit(1);
  }

  console.log(`Users: ${organizerIds.length} organizers, ${attIds.length} attendees.`);

  const baseDate = new Date();
  const latestEventIds = [];

  for (let i = 0; i < EVENT_TEMPLATES.length; i++) {
    const t = EVENT_TEMPLATES[i];
    const createdBy = organizerIds[i % organizerIds.length];
    const startsAt = addDays(baseDate, 7 + i * 3);
    startsAt.setHours(18, 0, 0, 0);
    const endsAt = addDays(baseDate, 7 + i * 3);
    endsAt.setHours(21, 0, 0, 0);

    const [ins] = await pool.execute(
      `INSERT INTO events (
        title, description, starts_at, ends_at, venue, address_line1, city, state, zip_code,
        category, status, is_public, created_by, created_at, updated_at, capacity, ticket_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', true, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 100, 0) RETURNING id`,
      [
        t.title,
        `Join us for ${t.title}. Details and updates will be shared with attendees.`,
        toISODateTime(startsAt),
        toISODateTime(endsAt),
        t.venue,
        t.venue ? "See venue" : null,
        t.city,
        t.state,
        t.zip,
        t.category,
        createdBy,
      ]
    );

    const eid = ins?.insertId;
    if (eid) latestEventIds.push({ id: eid, createdBy });
  }

  for (const ev of latestEventIds) {
    const possibleAttendees = attIds.filter((id) => id !== ev.createdBy);
    const numAttend = Math.min(possibleAttendees.length, Math.floor(Math.random() * 12) + 2);
    const chosen = shuffle(possibleAttendees).slice(0, numAttend);
    for (const uid of chosen) {
      try {
        await pool.execute(
          `INSERT INTO rsvps (user_id, event_id, status, created_at, updated_at) VALUES (?, ?, 'going', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, event_id) DO NOTHING`,
          [uid, ev.id]
        );
      } catch (e) {
        if (e.code !== "23505") console.warn("RSVP insert warning:", e.message);
      }
    }
  }

  console.log(`Created ${latestEventIds.length} events and randomized RSVPs.`);
  console.log("\nAll seed accounts use password:", SEED_PASSWORD);
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
