# Backend & admin integration plan (phase 2)

v1 has no server, so it does not pretend to store bookings or offer an admin panel.
This is the plan for adding them without redesigning the front end.

## Recommended stack
- **Next.js (App Router) + TypeScript**, deployed on Vercel or a VPS. Port the existing pages as
  React components; `pricing.js` moves to `lib/pricing.ts` unchanged (it is pure and tested).
- **Database:** PostgreSQL (Supabase, Neon or a managed Postgres) via Prisma.
- **Auth for admin:** Auth.js (NextAuth) with email magic link or credentials + bcrypt, owner-only
  role. All admin routes protected **server-side** (middleware + per-route role check), never just hidden in the UI.
- **Notifications:** WhatsApp Business Cloud API or an SMS provider to alert the owner of new
  bookings; email via Resend/SES as backup.

## Data model
```
Service(id, slug, name, group, labourLow, labourHigh, partsLow, partsHigh, hoursLow, hoursHigh,
        fuelSensitive, inspectionRequired, unit, includes[], excludes[], covers[], notFor[], active)
PricingRule(id, kind: category|fuel|partsGrade|age|tax, key, labourFactor, partsFactor, active)
Brand(id, name) · Model(id, brandId, name, defaultCategory)
Package(id, title, serviceIds[], tier, blurb, promoText, validFrom, validTo, active)
ServiceArea(id, name, pins[], status: free|confirm, active)
Booking(id, createdAt, name, mobile, contactMethod, brand, model, year, fuel, registration?,
        services[], notes, pickup, address?, pin?, preferredDate?, preferredTime?, estimateText,
        status: new|contacted|confirmed|in_service|completed|cancelled, internalNotes)
Enquiry(id, createdAt, name?, mobile, message, source)
Review(id, name, car, text, source, approved)
BusinessSettings(singleton: name, phone, whatsapp, address, geo, hours, gaId, gbpUrl)
```

## API
- `POST /api/bookings` — validate with Zod (same rules as the form: Indian mobile, 6-digit PIN),
  rate-limit by IP, honeypot field, store, notify owner. Returns `{ id }`. The front end already
  calls `business.bookingEndpoint` with JSON and shows "Request received" only on HTTP 2xx.
- `GET /api/config` — public, cached: services, rules, brands, packages, areas (replaces config.js).
- `/admin/*` — CRUD for every table above + booking status board. Server actions check the session role.

## Security & privacy
- Secrets only in environment variables (`DATABASE_URL`, `AUTH_SECRET`, `WHATSAPP_TOKEN`); never in client bundles.
- No customer data in URLs; HTTPS only; admin behind auth with session expiry.
- Store only the fields above. Add a retention policy (e.g. delete addresses 12 months after completion) and update privacy.html.

## Quick interim option (no code)
Point `business.bookingEndpoint` at a form backend such as Formspree, Getform or a Google Apps
Script web app that writes to a Google Sheet. Bookings then arrive by email/Sheet while WhatsApp
remains the fallback.
