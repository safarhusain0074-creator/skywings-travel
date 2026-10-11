/**
 * server.js — SkyWings Travel & Tours backend.
 * Express + JWT + SQLite (local) / Postgres (DATABASE_URL).
 * Payments are MANUAL ONLY (bank / JazzCash / Easypaisa + proof upload).
 * No payment gateway is integrated by design.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { sign, requireAuth, requireAdmin } = require('./auth');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ---------- Uploads (payment proof screenshots) ----------
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const uploadDir = path.join(__dirname, UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'proof-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Only image files (JPG/PNG/WebP) are allowed'), ok);
  },
});
app.use('/uploads', express.static(uploadDir));

// ---------- Helpers ----------
function makeRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${config.bookingRefPrefix}-${s}`;
}
const parseJSON = (s, fb) => { try { return JSON.parse(s); } catch { return fb; } };
const VALID_STATUSES = ['pending_payment', 'payment_submitted', 'confirmed', 'ticketed', 'completed', 'cancelled'];

async function createBooking({ userId, type, title, offerData, passengers, contact, amountPkr, travelDate, travelers }) {
  const ref = makeRef();
  const t = now2();
  await db.run(
    `INSERT INTO bookings (ref, user_id, type, title, offer_data, passengers, contact, amount_pkr, travel_date, travelers, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending_payment',$11,$12)`,
    [ref, userId, type, title,
     offerData ? JSON.stringify(offerData) : null,
     passengers ? JSON.stringify(passengers) : null,
     contact ? JSON.stringify(contact) : null,
     amountPkr || null, travelDate || null, travelers || null, t, t]
  );
  return db.get('SELECT * FROM bookings WHERE ref = $1', [ref]);
}
const now2 = () => new Date().toISOString();

// ---------- Public: brand config ----------
app.get('/api/config', (req, res) => res.json({ brand: config.brand }));

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await db.get('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    await db.run(
      'INSERT INTO users (email, password_hash, name, phone, is_admin, created_at) VALUES ($1,$2,$3,$4,0,$5)',
      [email.toLowerCase(), hash, name, phone || null, now2()]
    );
    const user = await db.get('SELECT id, email, name, phone, is_admin FROM users WHERE email = $1', [email.toLowerCase()]);
    res.status(201).json({ token: sign(user), user });
  } catch (e) { res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await db.get('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const safe = { id: user.id, email: user.email, name: user.name, phone: user.phone, is_admin: !!user.is_admin };
    res.json({ token: sign(safe), user: safe });
  } catch (e) { res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

// ---------- Flights (Duffel — live inventory only, never faked) ----------
const DUFFEL_VERSION = 'v2';
const CABINS = ['economy', 'premium_economy', 'business', 'first'];

app.post('/api/flights/search', async (req, res) => {
  const key = process.env.DUFFEL_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: 'Flight search is not connected yet. The agency needs to add a Duffel API key (see docs/OPERATIONS.md).',
      code: 'DUFFEL_NOT_CONFIGURED',
    });
  }
  try {
    const { origin, destination, departure_date, return_date, adults = 1, children = 0, cabin = 'economy' } = req.body || {};
    const o = (origin || '').toUpperCase().trim();
    const d = (destination || '').toUpperCase().trim();
    if (!/^[A-Z]{3}$/.test(o) || !/^[A-Z]{3}$/.test(d)) {
      return res.status(400).json({ error: 'Origin and destination must be 3-letter airport codes (e.g. LHE, DXB)' });
    }
    if (!departure_date || !/^\d{4}-\d{2}-\d{2}$/.test(departure_date)) {
      return res.status(400).json({ error: 'departure_date must be YYYY-MM-DD' });
    }
    if (return_date && !/^\d{4}-\d{2}-\d{2}$/.test(return_date)) {
      return res.status(400).json({ error: 'return_date must be YYYY-MM-DD' });
    }
    const nAdults = Math.min(Math.max(parseInt(adults) || 1, 1), 9);
    const nChildren = Math.min(Math.max(parseInt(children) || 0, 0), 6);
    const cabinClass = CABINS.includes(cabin) ? cabin : 'economy';

    const slices = [{ origin: o, destination: d, departure_date }];
    if (return_date) slices.push({ origin: d, destination: o, departure_date: return_date });
    const passengers = [];
    for (let i = 0; i < nAdults; i++) passengers.push({});
    for (let i = 0; i < nChildren; i++) passengers.push({ age: 10 });

    const resp = await fetch('https://api.duffel.com/air/offer_requests', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Duffel-Version': DUFFEL_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { slices, passengers, cabin_class: cabinClass, max_connections: 1 } }),
    });
    const body = await resp.json();
    if (!resp.ok) {
      const msg = body && body.errors && body.errors[0] ? body.errors[0].message : 'Flight search failed';
      return res.status(502).json({ error: msg });
    }
    const offers = (body.data && body.data.offers) || [];
    res.json({ offers: offers.slice(0, 40).map(cleanOffer) });
  } catch (e) {
    res.status(502).json({ error: 'Could not reach the flight inventory service. Please try again.' });
  }
});

function cleanOffer(offer) {
  const slices = (offer.slices || []).map(s => {
    const segs = (s.segments || []).map(sg => ({
      airline: (sg.operating_carrier && sg.operating_carrier.iata_code) || (sg.marketing_carrier && sg.marketing_carrier.iata_code) || '',
      airline_name: (sg.operating_carrier && sg.operating_carrier.name) || '',
      flight_no: ((sg.operating_carrier && sg.operating_carrier.iata_code) || '') + (sg.operating_carrier_flight_number || ''),
      origin: sg.origin && sg.origin.iata_code,
      destination: sg.destination && sg.destination.iata_code,
      departure: sg.departing_at,
      arrival: sg.arriving_at,
      duration: sg.duration,
    }));
    return {
      origin: s.origin && s.origin.iata_code,
      destination: s.destination && s.destination.iata_code,
      departure: segs[0] && segs[0].departure,
      arrival: segs[segs.length - 1] && segs[segs.length - 1].arrival,
      duration: s.duration,
      stops: Math.max(segs.length - 1, 0),
      segments: segs,
    };
  });
  const firstSeg = slices[0] && slices[0].segments[0];
  return {
    id: offer.id,
    airline: firstSeg ? firstSeg.airline : '',
    airline_name: firstSeg ? firstSeg.airline_name : '',
    total_amount: offer.total_amount,
    total_currency: offer.total_currency,
    expires_at: offer.expires_at,
    cabin_class: offer.cabin_class,
    slices,
    stops: slices.reduce((n, s) => n + s.stops, 0),
  };
}

// ---------- Packages (public) ----------
app.get('/api/packages', async (req, res) => {
  try {
    const { type } = req.query;
    let rows;
    if (type && ['tour', 'hotel', 'umrah'].includes(type)) {
      rows = await db.all('SELECT * FROM packages WHERE type = $1 AND active = 1 ORDER BY id', [type]);
    } else {
      rows = await db.all('SELECT * FROM packages WHERE active = 1 ORDER BY type, id');
    }
    res.json({ packages: rows });
  } catch (e) { res.status(500).json({ error: 'Could not load packages' }); }
});

app.get('/api/packages/:id', async (req, res) => {
  try {
    const pkg = await db.get('SELECT * FROM packages WHERE id = $1 AND active = 1', [req.params.id]);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    res.json({ package: pkg });
  } catch (e) { res.status(500).json({ error: 'Could not load package' }); }
});

// ---------- Tickets (public) ----------
app.get('/api/tickets', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM tickets WHERE active = 1 AND seats_left > 0 ORDER BY departure');
    res.json({ tickets: rows });
  } catch (e) { res.status(500).json({ error: 'Could not load tickets' }); }
});

app.get('/api/tickets/:id', async (req, res) => {
  try {
    const t = await db.get('SELECT * FROM tickets WHERE id = $1 AND active = 1', [req.params.id]);
    if (!t) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ticket: t });
  } catch (e) { res.status(500).json({ error: 'Could not load ticket' }); }
});

// ---------- Payment methods (public) ----------
app.get('/api/payment-methods', async (req, res) => {
  try {
    const rows = await db.all('SELECT id, name, method_type, account_title, account_number, iban, instructions FROM payment_methods WHERE active = 1 ORDER BY sort_order, id');
    res.json({ methods: rows });
  } catch (e) { res.status(500).json({ error: 'Could not load payment methods' }); }
});

// ---------- Visa requests (public) ----------
app.post('/api/visa-requests', async (req, res) => {
  try {
    const { name, email, phone, country, travel_date, purpose, notes } = req.body || {};
    if (!name || !email || !phone || !country) {
      return res.status(400).json({ error: 'Name, email, phone and country are required' });
    }
    let userId = null;
    const h = req.headers.authorization || '';
    if (h) {
      try {
        const jwt = require('jsonwebtoken');
        const { SECRET } = require('./auth');
        const payload = jwt.verify(h.replace(/^Bearer\s+/i, ''), SECRET);
        userId = payload.id;
      } catch { /* guest request */ }
    }
    await db.run(
      `INSERT INTO visa_requests (user_id, name, email, phone, country, travel_date, purpose, notes, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new',$9)`,
      [userId, name, email.toLowerCase(), phone, country, travel_date || null, purpose || null, notes || null, now2()]
    );
    res.status(201).json({ message: 'Visa request received. Our team will contact you shortly.' });
  } catch (e) { res.status(500).json({ error: 'Could not submit request' }); }
});

// ---------- Bookings (customer) ----------
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { type, title, offer_data, package_id, ticket_id, passengers, contact, amount_pkr, travel_date, travelers } = req.body || {};
    if (!['flight', 'tour', 'hotel', 'umrah', 'ticket'].includes(type)) {
      return res.status(400).json({ error: 'Invalid booking type' });
    }
    if (!title && !ticket_id) return res.status(400).json({ error: 'Booking title is required' });
    let finalTitle = title;
    let finalAmount = amount_pkr;
    if (package_id) {
      const pkg = await db.get('SELECT * FROM packages WHERE id = $1 AND active = 1', [package_id]);
      if (!pkg) return res.status(400).json({ error: 'Package not available' });
      finalTitle = pkg.title;
      finalAmount = pkg.price_pkr * (travelers > 1 ? travelers : 1);
    }
    if (ticket_id) {
      const t = await db.get('SELECT * FROM tickets WHERE id = $1 AND active = 1', [ticket_id]);
      if (!t) return res.status(400).json({ error: 'Ticket not available' });
      const n = travelers && travelers > 0 ? travelers : 1;
      if (t.seats_left < n) return res.status(400).json({ error: 'Not enough seats left on this ticket' });
      finalTitle = t.airline + (t.flight_no ? ' ' + t.flight_no : '') + ': ' + t.origin + ' → ' + t.destination;
      finalAmount = t.price_pkr * n;
      await db.run('UPDATE tickets SET seats_left = seats_left - $1 WHERE id = $2', [n, t.id]);
    }
    if (!finalTitle) return res.status(400).json({ error: 'Booking title is required' });
    const booking = await createBooking({
      userId: req.user.id, type, title: finalTitle,
      offerData: offer_data || null,
      passengers: passengers || null,
      contact: contact || { email: req.user.email, phone: req.user.phone },
      amountPkr: finalAmount || null,
      travelDate: travel_date || null,
      travelers: travelers || (passengers ? passengers.length : 1),
    });
    res.status(201).json({ booking: sanitizeBooking(booking) });
  } catch (e) { res.status(500).json({ error: 'Could not create booking' }); }
});

app.post('/api/bookings/:id/payment-proof', requireAuth, (req, res) => {
  upload.single('proof')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const booking = await db.get('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
      if (!booking || booking.user_id !== req.user.id) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'Booking not found' });
      }
      if (!['pending_payment'].includes(booking.status)) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Payment proof can only be submitted for bookings awaiting payment' });
      }
      const { method, reference } = req.body || {};
      if (!method || !reference || !req.file) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Payment method, transaction reference and proof screenshot are all required' });
      }
      const proofPath = '/' + UPLOAD_DIR + '/' + path.basename(req.file.path);
      await db.run(
        `UPDATE bookings SET payment_method = $1, payment_reference = $2, proof_path = $3, status = 'payment_submitted', updated_at = $4 WHERE id = $5`,
        [method, reference, proofPath, now2(), booking.id]
      );
      const updated = await db.get('SELECT * FROM bookings WHERE id = $1', [booking.id]);
      res.json({ booking: sanitizeBooking(updated) });
    } catch (e) { res.status(500).json({ error: 'Could not submit payment proof' }); }
  });
});

app.get('/api/bookings/mine', requireAuth, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM bookings WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
    res.json({ bookings: rows.map(sanitizeBooking) });
  } catch (e) { res.status(500).json({ error: 'Could not load bookings' }); }
});

app.get('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    const booking = await db.get('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.user_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Not allowed' });
    res.json({ booking: sanitizeBooking(booking) });
  } catch (e) { res.status(500).json({ error: 'Could not load booking' }); }
});

function sanitizeBooking(b) {
  return {
    ...b,
    offer_data: parseJSON(b.offer_data, null),
    passengers: parseJSON(b.passengers, []),
    contact: parseJSON(b.contact, {}),
  };
}

// ---------- Admin ----------
const admin = express.Router();
admin.use(requireAuth, requireAdmin);

admin.get('/stats', async (req, res) => {
  try {
    const counts = {};
    for (const s of VALID_STATUSES) {
      const r = await db.get('SELECT COUNT(*) AS c FROM bookings WHERE status = $1', [s]);
      counts[s] = Number(r.c);
    }
    const users = await db.get('SELECT COUNT(*) AS c FROM users');
    const visas = await db.get("SELECT COUNT(*) AS c FROM visa_requests WHERE status = 'new'");
    res.json({ bookings: counts, users: Number(users.c), new_visa_requests: Number(visas.c) });
  } catch (e) { res.status(500).json({ error: 'Could not load stats' }); }
});

admin.get('/bookings', async (req, res) => {
  try {
    const { status } = req.query;
    let rows;
    if (status && VALID_STATUSES.includes(status)) {
      rows = await db.all(
        `SELECT b.*, u.name AS user_name, u.email AS user_email FROM bookings b
         JOIN users u ON u.id = b.user_id WHERE b.status = $1 ORDER BY b.id DESC`, [status]);
    } else {
      rows = await db.all(
        `SELECT b.*, u.name AS user_name, u.email AS user_email FROM bookings b
         JOIN users u ON u.id = b.user_id ORDER BY b.id DESC`);
    }
    res.json({ bookings: rows.map(sanitizeBooking) });
  } catch (e) { res.status(500).json({ error: 'Could not load bookings' }); }
});

admin.get('/bookings/:id', async (req, res) => {
  const b = await db.get('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking: sanitizeBooking(b) });
});

admin.patch('/bookings/:id/confirm-payment', async (req, res) => {
  try {
    const b = await db.get('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    if (b.status !== 'payment_submitted') return res.status(400).json({ error: 'Only bookings with submitted payment can be confirmed' });
    await db.run(`UPDATE bookings SET status = 'confirmed', rejection_reason = NULL, updated_at = $1 WHERE id = $2`, [now2(), b.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not confirm payment' }); }
});

admin.patch('/bookings/:id/reject-payment', async (req, res) => {
  try {
    const { reason } = req.body || {};
    if (!reason) return res.status(400).json({ error: 'A rejection reason is required' });
    const b = await db.get('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    if (b.status !== 'payment_submitted') return res.status(400).json({ error: 'Only bookings with submitted payment can be rejected' });
    await db.run(`UPDATE bookings SET status = 'pending_payment', rejection_reason = $1, updated_at = $2 WHERE id = $3`, [reason, now2(), b.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not reject payment' }); }
});

admin.post('/bookings/:id/issue-ticket', async (req, res) => {
  try {
    const { pnr, ticket_details, use_duffel } = req.body || {};
    const b = await db.get('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    if (!['confirmed'].includes(b.status)) return res.status(400).json({ error: 'Payment must be confirmed before issuing a ticket' });

    let finalPnr = pnr;
    let finalDetails = ticket_details;
    // Best-effort: create a real Duffel order when the agency key is present.
    if (use_duffel && process.env.DUFFEL_API_KEY && b.type === 'flight') {
      try {
        const offer = parseJSON(b.offer_data, null);
        const passengers = parseJSON(b.passengers, []);
        if (!offer || !offer.id || !passengers.length) throw new Error('Booking is missing offer or passenger data');
        const order = await createDuffelOrder(offer.id, passengers, offer.total_amount, offer.total_currency);
        finalPnr = (order.data && order.data.booking_reference) || finalPnr;
        finalDetails = 'Issued via Duffel. Order ID: ' + (order.data && order.data.id);
      } catch (de) {
        return res.status(502).json({ error: 'Duffel order failed: ' + de.message + '. Enter the PNR manually instead.' });
      }
    }
    if (!finalPnr) return res.status(400).json({ error: 'PNR / ticket reference is required' });
    await db.run(`UPDATE bookings SET pnr = $1, ticket_details = $2, status = 'ticketed', updated_at = $3 WHERE id = $4`,
      [finalPnr, finalDetails || null, now2(), b.id]);
    res.json({ ok: true, pnr: finalPnr });
  } catch (e) { res.status(500).json({ error: 'Could not issue ticket' }); }
});

async function createDuffelOrder(offerId, passengers, amount, currency) {
  const key = process.env.DUFFEL_API_KEY;
  const bookingJson = {
    data: {
      type: 'instant',
      services: [],
      passengers: passengers.map(p => ({
        title: p.title || 'mr',
        gender: p.gender || 'm',
        given_name: p.given_name,
        family_name: p.family_name,
        born_on: p.born_on,
        email: p.email,
        phone_number: p.phone_number,
        ...(p.passport_number ? {
          identity_documents: [{
            type: 'passport',
            unique_identifier: p.passport_number,
            issuing_country_code: (p.passport_country || '').toUpperCase(),
            expires_on: p.passport_expiry,
          }],
        } : {}),
      })),
      payments: [{ type: 'balance', amount: String(amount), currency }],
      selected_offers: [offerId],
    },
  };
  const resp = await fetch('https://api.duffel.com/air/orders', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Duffel-Version': DUFFEL_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingJson),
  });
  const body = await resp.json();
  if (!resp.ok) {
    const msg = body && body.errors && body.errors[0] ? (body.errors[0].title + ': ' + body.errors[0].message) : 'Duffel order failed';
    throw new Error(msg);
  }
  return body;
}

admin.patch('/bookings/:id/complete', async (req, res) => {
  const b = await db.get('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (b.status !== 'ticketed') return res.status(400).json({ error: 'Only ticketed bookings can be completed' });
  await db.run(`UPDATE bookings SET status = 'completed', updated_at = $1 WHERE id = $2`, [now2(), b.id]);
  res.json({ ok: true });
});

admin.patch('/bookings/:id/cancel', async (req, res) => {
  const b = await db.get('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (['cancelled', 'completed'].includes(b.status)) return res.status(400).json({ error: 'Booking is already closed' });
  await db.run(`UPDATE bookings SET status = 'cancelled', updated_at = $1 WHERE id = $2`, [now2(), b.id]);
  res.json({ ok: true });
});

// Packages CRUD
admin.get('/packages', async (req, res) => {
  const rows = await db.all('SELECT * FROM packages ORDER BY type, id');
  res.json({ packages: rows });
});
admin.post('/packages', async (req, res) => {
  try {
    const { type, title, description, price_pkr, duration, location, itinerary, active } = req.body || {};
    if (!['tour', 'hotel', 'umrah'].includes(type) || !title || !description || price_pkr == null) {
      return res.status(400).json({ error: 'Type, title, description and price are required' });
    }
    await db.run(
      `INSERT INTO packages (type, title, description, price_pkr, duration, location, itinerary, active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [type, title, description, price_pkr, duration || null, location || null, itinerary || null, active === false ? 0 : 1, now2()]
    );
    res.status(201).json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not create package' }); }
});
admin.put('/packages/:id', async (req, res) => {
  try {
    const { type, title, description, price_pkr, duration, location, itinerary, active } = req.body || {};
    await db.run(
      `UPDATE packages SET type=$1, title=$2, description=$3, price_pkr=$4, duration=$5, location=$6, itinerary=$7, active=$8 WHERE id=$9`,
      [type, title, description, price_pkr, duration || null, location || null, itinerary || null, active ? 1 : 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not update package' }); }
});
admin.delete('/packages/:id', async (req, res) => {
  await db.run('DELETE FROM packages WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// Tickets CRUD
admin.get('/tickets', async (req, res) => {
  const rows = await db.all('SELECT * FROM tickets ORDER BY departure');
  res.json({ tickets: rows });
});
admin.post('/tickets', async (req, res) => {
  try {
    const { airline, flight_no, origin, destination, departure, arrival, price_pkr, seats_total, cabin, notes, active } = req.body || {};
    if (!airline || !origin || !destination || price_pkr == null) {
      return res.status(400).json({ error: 'Airline, origin, destination and price are required' });
    }
    const st = parseInt(seats_total) || 0;
    await db.run(
      `INSERT INTO tickets (airline, flight_no, origin, destination, departure, arrival, price_pkr, seats_total, seats_left, cabin, notes, active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [airline, flight_no || null, origin, destination, departure || null, arrival || null, price_pkr, st, st, cabin || null, notes || null, active === false ? 0 : 1, now2()]
    );
    res.status(201).json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not create ticket' }); }
});
admin.put('/tickets/:id', async (req, res) => {
  try {
    const { airline, flight_no, origin, destination, departure, arrival, price_pkr, seats_total, seats_left, cabin, notes, active } = req.body || {};
    await db.run(
      `UPDATE tickets SET airline=$1, flight_no=$2, origin=$3, destination=$4, departure=$5, arrival=$6, price_pkr=$7, seats_total=$8, seats_left=$9, cabin=$10, notes=$11, active=$12 WHERE id=$13`,
      [airline, flight_no || null, origin, destination, departure || null, arrival || null, price_pkr, parseInt(seats_total) || 0, parseInt(seats_left) || 0, cabin || null, notes || null, active ? 1 : 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not update ticket' }); }
});
admin.delete('/tickets/:id', async (req, res) => {
  await db.run('DELETE FROM tickets WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// Payment methods CRUD
admin.get('/payment-methods', async (req, res) => {
  const rows = await db.all('SELECT * FROM payment_methods ORDER BY sort_order, id');
  res.json({ methods: rows });
});
admin.post('/payment-methods', async (req, res) => {
  try {
    const { name, method_type, account_title, account_number, iban, instructions, active, sort_order } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Name is required' });
    await db.run(
      `INSERT INTO payment_methods (name, method_type, account_title, account_number, iban, instructions, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [name, method_type || 'other', account_title || null, account_number || null, iban || null,
       instructions || null, active === false ? 0 : 1, sort_order || 0]
    );
    res.status(201).json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not create payment method' }); }
});
admin.put('/payment-methods/:id', async (req, res) => {
  try {
    const { name, method_type, account_title, account_number, iban, instructions, active, sort_order } = req.body || {};
    await db.run(
      `UPDATE payment_methods SET name=$1, method_type=$2, account_title=$3, account_number=$4, iban=$5, instructions=$6, active=$7, sort_order=$8 WHERE id=$9`,
      [name, method_type || 'other', account_title || null, account_number || null, iban || null,
       instructions || null, active ? 1 : 0, sort_order || 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not update payment method' }); }
});
admin.delete('/payment-methods/:id', async (req, res) => {
  await db.run('DELETE FROM payment_methods WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// Visa requests (admin)
admin.get('/visa-requests', async (req, res) => {
  const rows = await db.all('SELECT * FROM visa_requests ORDER BY id DESC');
  res.json({ requests: rows });
});
admin.patch('/visa-requests/:id', async (req, res) => {
  const { status } = req.body || {};
  if (!['new', 'contacted', 'processing', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await db.run('UPDATE visa_requests SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ ok: true });
});

// Users
admin.get('/users', async (req, res) => {
  const rows = await db.all('SELECT id, email, name, phone, is_admin, created_at FROM users ORDER BY id DESC');
  res.json({ users: rows });
});

app.use('/api/admin', admin);

// ---------- Static frontend ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Boot ----------
db.init().then(() => {
  app.listen(PORT, () => console.log(`SkyWings Travel & Tours running on port ${PORT}`));
}).catch((e) => {
  console.error('DB init failed:', e);
  process.exit(1);
});
