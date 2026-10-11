# Deploying SkyWings Travel & Tours on Render

Takes about 15 minutes. You need: a GitHub account and a Render account (free).

## Step 1 — Push the code to GitHub

1. Create a new **public or private** repository on GitHub (e.g. `skywings-travel`).
2. In the project folder:
   ```bash
   git init
   git add .
   git commit -m "SkyWings Travel & Tours"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/skywings-travel.git
   git push -u origin main
   ```

## Step 2 — Create the Render services

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint** → connect your GitHub repo.
2. Render reads `render.yaml` and proposes **two** services:
   - Web service `skywings-travel` (free plan)
   - Postgres database `skywings-db` (free plan)
3. Click **Apply**. Render will:
   - generate a random `JWT_SECRET`,
   - wire `DATABASE_URL` from the new database automatically,
   - run `npm install` and start with `npm start`.

## Step 3 — Add your Duffel API key (for live flight search)

1. In the Render dashboard, open the `skywings-travel` web service → **Environment**.
2. Add variable: `DUFFEL_API_KEY` = your key from [duffel.com](https://duffel.com) (see `docs/OPERATIONS.md` for where to get it).
3. Click **Save Changes** — the service redeploys automatically.

Without this key, the Flights page shows a clear "not connected" message. No fake flight data is ever displayed.

## Step 4 — First-run checklist (do this once)

1. Open your Render URL (e.g. `https://skywings-travel.onrender.com`).
2. Login as admin: `admin@travel.demo` / `Admin@12345` → opens `admin.html`.
3. **Payment Methods tab** — replace the three PLACEHOLDER methods with your real bank account, JazzCash and Easypaisa numbers. Delete any you don't use.
4. **Packages tab** — review seeded tours/hotels/Umrah packages; edit prices, add your own.
5. **Rename the brand** (if needed): edit `public/assets/js/site-config.js` (phone, WhatsApp, email, address) and `config.js`, commit + push — Render redeploys automatically.
6. Create a test customer account, make a test booking, upload a proof screenshot, and walk it through confirm → issue ticket in the admin panel.

## Notes

- Free-plan Postgres sleeps after inactivity on very old free tiers; the site reconnects automatically.
- Payment proof screenshots are stored in `uploads/` on the web service disk. On Render's free plan, disk files **do not persist across deploys** — for production, either upgrade to a plan with a persistent disk or move uploads to object storage later. Booking records themselves live safely in Postgres.
- Free web services spin down after ~15 min idle; the first visit after idle takes ~30–60 seconds to wake.
