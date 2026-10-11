# SkyWings Travel & Tours

Full-stack travel agency website — flights (live Duffel inventory), tour packages, hotels, Umrah packages, visa services — with **manual payments** (bank transfer / JazzCash / Easypaisa + receipt upload, admin confirms). No payment gateway integrated by design.

## Quick start (local)

```bash
npm install
cp .env.example .env
# edit .env — set JWT_SECRET (required for production)
npm start
# open http://localhost:3000
```

Local dev uses SQLite (`./data/skywings.db`, created automatically). Set `DATABASE_URL` to switch to Postgres.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | no | Default `3000` |
| `JWT_SECRET` | **yes (prod)** | Long random string for auth tokens |
| `DATABASE_URL` | no | Postgres connection string. Empty = local SQLite |
| `DUFFEL_API_KEY` | for live flights | Duffel API key from [duffel.com](https://duffel.com). Without it, flight search returns HTTP 503 — fake results are never shown |
| `UPLOAD_DIR` | no | Default `uploads` (payment proof screenshots) |

## Admin login (seeded)

- Email: `admin@travel.demo`
- Password: `Admin@12345`

Change these after first login (or seed your own admin via the users table).

## Project layout

```
server.js            Express app + all API routes
db.js                SQLite/Postgres switch + schema + seed data
auth.js              JWT middleware
config.js            Brand strings (backend mirror of site-config.js)
public/              Frontend (no build step)
  index.html         Homepage with search widget
  flights.html       Live flight search
  flight-booking.html  Traveler details
  payment.html       Manual payment + proof upload
  tours.html / tour-detail.html / hotels.html / umrah.html
  visa.html          Visa services + callback request
  my-bookings.html   Customer bookings + e-ticket
  contact.html / login.html / signup.html
  admin.html         Dashboard: bookings, packages, payment methods, visas, users
  assets/js/site-config.js   Brand strings (frontend)
  assets/js/app.js           Shared helpers
  assets/css/styles.css
uploads/             Payment proof screenshots (served at /uploads)
docs/DEPLOY.md       Render deployment, step by step
docs/OPERATIONS.md   Daily agency workflow + where to get a Duffel key
```

## Booking flow

`pending_payment` → customer pays manually & uploads proof → `payment_submitted` → admin verifies & confirms → `confirmed` → admin issues ticket (enters PNR, or auto-issues via Duffel if key present) → `ticketed` → `completed`. Rejected payments return the booking to `pending_payment` with a reason the customer can see.

## Docs

- [docs/DEPLOY.md](docs/DEPLOY.md) — deploy on Render
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — run the agency day-to-day
