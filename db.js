/**
 * db.js — database abstraction.
 * Uses Postgres (pg Pool) when DATABASE_URL is set, otherwise local
 * SQLite via the built-in node:sqlite module (./data/skywings.db).
 * Same logical schema on both. Exposes query/get/all/run with $1-style params.
 */
const path = require('path');
const fs = require('fs');

const USE_PG = !!process.env.DATABASE_URL;
let pool = null;
let sqlite = null;

if (USE_PG) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });
} else {
  const { DatabaseSync } = require('node:sqlite');
  const dir = path.join(__dirname, 'data');
  fs.mkdirSync(dir, { recursive: true });
  sqlite = new DatabaseSync(path.join(dir, 'skywings.db'));
}

// pg uses $1,$2… placeholders; sqlite uses ?. Convert for sqlite.
function toSqlite(sql) {
  return sql.replace(/\$\d+/g, '?');
}

async function query(sql, params = []) {
  if (USE_PG) {
    const res = await pool.query(sql, params);
    return { rows: res.rows, rowCount: res.rowCount };
  }
  const stmt = sqlite.prepare(toSqlite(sql));
  const head = sql.trim().split(/\s+/)[0].toUpperCase();
  if (head === 'SELECT' || head === 'WITH') {
    return { rows: stmt.all(...params) };
  }
  const info = stmt.run(...params);
  return { rows: [], rowCount: Number(info.changes), lastID: Number(info.lastInsertRowid) };
}

async function get(sql, params = []) {
  const r = await query(sql, params);
  return r.rows[0];
}

async function all(sql, params = []) {
  const r = await query(sql, params);
  return r.rows;
}

async function run(sql, params = []) {
  return query(sql, params);
}

const ID_DEF = USE_PG ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
const now = () => new Date().toISOString();
const bcrypt = require('bcryptjs');

async function init() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id ${ID_DEF},
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS packages (
    id ${ID_DEF},
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price_pkr REAL NOT NULL,
    duration TEXT,
    location TEXT,
    itinerary TEXT,
    image TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS payment_methods (
    id ${ID_DEF},
    name TEXT NOT NULL,
    method_type TEXT NOT NULL DEFAULT 'other',
    account_title TEXT,
    account_number TEXT,
    iban TEXT,
    instructions TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`);

  await run(`CREATE TABLE IF NOT EXISTS bookings (
    id ${ID_DEF},
    ref TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    offer_data TEXT,
    passengers TEXT,
    contact TEXT,
    amount_pkr REAL,
    travel_date TEXT,
    travelers INTEGER,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    payment_method TEXT,
    payment_reference TEXT,
    proof_path TEXT,
    rejection_reason TEXT,
    pnr TEXT,
    ticket_details TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS visa_requests (
    id ${ID_DEF},
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    travel_date TEXT,
    purpose TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL
  )`);

  await seed();
}

async function ensureUser(email, name, password, phone, isAdmin) {
  const existing = await get('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) return;
  const hash = await bcrypt.hash(password, 10);
  await run(
    'INSERT INTO users (email, password_hash, name, phone, is_admin, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
    [email, hash, name, phone || null, isAdmin ? 1 : 0, now()]
  );
}

async function ensurePackage(p) {
  const existing = await get('SELECT id FROM packages WHERE title = $1 AND type = $2', [p.title, p.type]);
  if (existing) return;
  await run(
    `INSERT INTO packages (type, title, description, price_pkr, duration, location, itinerary, active, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8)`,
    [p.type, p.title, p.description, p.price_pkr, p.duration, p.location, p.itinerary || null, now()]
  );
}

async function ensurePaymentMethod(m) {
  const existing = await get('SELECT id FROM payment_methods WHERE name = $1', [m.name]);
  if (existing) return;
  await run(
    `INSERT INTO payment_methods (name, method_type, account_title, account_number, iban, instructions, active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,1,$7)`,
    [m.name, m.method_type, m.account_title, m.account_number, m.iban, m.instructions, m.sort_order]
  );
}

async function seed() {
  await ensureUser('admin@travel.demo', 'Admin', 'Admin@12345', null, true);

  const pkgs = [
    { type: 'tour', title: 'Canada Explorer', location: 'Toronto, Niagara & Vancouver', duration: '7 Days / 6 Nights', price_pkr: 485000,
      description: 'Return airfare, 4-star hotels with breakfast, Niagara Falls day trip, Toronto city tour, Vancouver highlights. Visa assistance included.',
      itinerary: 'Day 1-2: Toronto arrival & city tour\nDay 3: Niagara Falls day trip\nDay 4-5: Fly to Vancouver, city highlights\nDay 6: Capilano & Grouse Mountain\nDay 7: Departure' },
    { type: 'tour', title: 'Malaysia Discovery', location: 'Kuala Lumpur, Langkawi & Genting', duration: '6 Days / 5 Nights', price_pkr: 195000,
      description: 'Return airfare, 4-star hotels, KL city tour with Batu Caves, Genting Highlands, Langkawi island day trip. Visa assistance included.',
      itinerary: 'Day 1-2: Kuala Lumpur & Batu Caves\nDay 3: Genting Highlands\nDay 4-5: Langkawi island & cable car\nDay 6: Departure' },
    { type: 'tour', title: 'Azerbaijan Highlights', location: 'Baku, Gabala & Shahdag', duration: '5 Days / 4 Nights', price_pkr: 165000,
      description: 'Return airfare, 4-star hotel in Baku, old city & Flame Towers tour, Gabala day trip, Shahdag mountain resort. Visa assistance included.',
      itinerary: 'Day 1-2: Baku old city, Flame Towers & Caspian promenade\nDay 3: Gabala day trip\nDay 4: Shahdag mountain resort\nDay 5: Departure' },
    { type: 'tour', title: 'Dubai City Break', location: 'Dubai, UAE', duration: '4 Days / 3 Nights', price_pkr: 125000,
      description: 'Return airfare, 4-star hotel with breakfast, city tour, desert safari with dinner, dhow cruise. Visa assistance included.',
      itinerary: 'Day 1: Arrival & marina walk\nDay 2: City tour & Burj Khalifa\nDay 3: Desert safari\nDay 4: Departure' },
    { type: 'tour', title: 'Istanbul & Cappadocia', location: 'Turkey', duration: '7 Days / 6 Nights', price_pkr: 285000,
      description: 'Return airfare, 4-star hotels, Bosphorus cruise, hot-air balloon option, guided old-city tours. Visa assistance included.',
      itinerary: 'Day 1-3: Istanbul old city & Bosphorus\nDay 4-5: Cappadocia valleys & balloon\nDay 6: Grand Bazaar\nDay 7: Departure' },
    { type: 'umrah', title: 'Umrah Package — 14 Days', location: 'Makkah & Madinah', duration: '14 Days', price_pkr: 195000,
      description: 'Direct flights, 4-star hotels near Haram (shuttle), guided ziyarat in Makkah & Madinah, visa + transport included.',
      itinerary: 'Week 1: Makkah — Umrah & ziyarat\nWeek 2: Madinah — Rawdah & ziyarat' },
  ];
  for (const p of pkgs) await ensurePackage(p);

  const hotels = [
    { type: 'hotel', title: 'Hotel Margalla Hills — Islamabad', location: 'Islamabad', duration: 'Per Night', price_pkr: 12000,
      description: 'Deluxe rooms with Margalla view, breakfast included, free WiFi & parking. 10 min from airport.' },
    { type: 'hotel', title: 'Hotel Ravi View — Lahore', location: 'Lahore', duration: 'Per Night', price_pkr: 9500,
      description: 'Executive rooms near Mall Road, breakfast included, family suites available.' },
    { type: 'hotel', title: 'Hotel Sea Breeze — Karachi', location: 'Karachi', duration: 'Per Night', price_pkr: 11000,
      description: 'Sea-view rooms at Clifton, breakfast included, 15 min from Jinnah International.' },
  ];
  for (const h of hotels) await ensurePackage(h);

  const methods = [
    { name: 'Bank Transfer (PLACEHOLDER)', method_type: 'bank',
      account_title: 'PLACEHOLDER — replace in admin panel', account_number: '00000000000000',
      iban: 'PK00PLACEHOLDER00000000000000',
      instructions: 'Transfer the exact booking amount and keep the transaction receipt. Upload the receipt screenshot below.',
      sort_order: 1 },
    { name: 'JazzCash (PLACEHOLDER)', method_type: 'jazzcash',
      account_title: 'PLACEHOLDER — replace in admin panel', account_number: '0300-0000000',
      iban: null,
      instructions: 'Send money to the JazzCash number above, then enter the TID (transaction ID) from your SMS.',
      sort_order: 2 },
    { name: 'Easypaisa (PLACEHOLDER)', method_type: 'easypaisa',
      account_title: 'PLACEHOLDER — replace in admin panel', account_number: '0300-0000000',
      iban: null,
      instructions: 'Send money to the Easypaisa number above, then enter the TRX ID from your confirmation SMS.',
      sort_order: 3 },
  ];
  for (const m of methods) await ensurePaymentMethod(m);
}

module.exports = { query, get, all, run, init, USE_PG, now };
