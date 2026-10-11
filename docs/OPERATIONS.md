# SkyWings Travel & Tours — Daily Operations Guide

How the agency runs the website day to day. No technical knowledge needed beyond the admin panel.

## The booking lifecycle

| Status | What it means | Your action |
|---|---|---|
| `Payment Pending` | Customer created a booking but hasn't paid yet | Wait, or nudge them on WhatsApp |
| `Payment Submitted` | Customer paid manually and uploaded proof | **Verify now** (see below) |
| `Confirmed` | You confirmed the money arrived | Issue the ticket |
| `Ticket Issued` | PNR entered, customer can view/print e-ticket | Nothing — or mark Completed after travel |
| `Completed` / `Cancelled` | Closed | Nothing |

## Verifying a payment (do this for every booking)

1. Admin panel → **Bookings** → filter **Payment Submitted**.
2. Click **View**: check the uploaded receipt screenshot and the transaction reference (TID/TRX ID).
3. Match the amount + reference against your **bank app / JazzCash / Easypaisa statement**.
4. Money arrived → **Confirm Payment**. Wrong/fake proof → **Reject** with a short reason (the customer sees it and can pay again).

## Issuing a ticket

1. On a **Confirmed** booking, click **View → Issue Ticket**.
2. Enter the **PNR** (from your airline/GDS console) and optional ticket details, then save. The customer instantly sees it under **My Bookings → View Ticket** and can print it.
3. If you have a Duffel API key configured, you can alternatively create the order through Duffel — otherwise manual PNR entry is the normal flow.

## Adding / editing a package

Admin → **Packages** → **+ Add Package / Hotel**. Fill title, PKR price, duration, location, description and itinerary. Set **Active = No** to hide it without deleting.

## Changing payment accounts

Admin → **Payment Methods**. Edit the bank IBAN, JazzCash or Easypaisa numbers any time — the payment page updates immediately for all customers. **Do this before going live**: the seeded methods are clearly marked PLACEHOLDER.

## Visa requests

Admin → **Visa Requests**. New requests appear with status `new`. Call the customer, then move the status through `contacted → processing → approved/rejected`.

## Where to get a Duffel API key (live flight search)

1. Go to [duffel.com](https://duffel.com) and create an agency account.
2. In the Duffel dashboard, go to **Developers / API keys** and create a **live** key (there is also a free **test** key for trying things out — test keys return realistic sandbox data and cannot issue real tickets).
3. Put the key in the `DUFFEL_API_KEY` environment variable (locally in `.env`, on Render in the dashboard → Environment).
4. Real ticket issuance through Duffel draws from your **Duffel balance** — top it up in the Duffel dashboard before issuing live tickets. Most agencies instead search live fares on the site and issue tickets through their existing airline/GDS workflow, entering the PNR manually.

## Changing the business name, phone or WhatsApp

Two files, two minutes:

- `public/assets/js/site-config.js` — website name, tagline, phone, WhatsApp, email, address (used by every page, header, footer and WhatsApp buttons).
- `config.js` — same values for the backend.

No other file contains the brand name.
