# Garagewala — Nice Car Mechanic · v1.6

A ready-to-run static garage website branded **Garagewala · Nice Car Mechanic**: 22 responsive pages, 69-service price list,
vehicle-specific estimates, pickup-area checks, before/after gallery, owner-supplied
Google review excerpts and WhatsApp booking. Node.js 18+ is needed for local serving
and rebuilding; a static hosting provider needs only the included `public/` files.

## Live website

https://shanipratapsingh018.github.io/Project/

The Services & Prices page has three service packages, 69 service cards, search, category filters,
vehicle-specific estimates and an expandable comparison table. The generated logo is bundled locally.
Car types change indicative prices; the approved rate card remains unchanged.

## Start locally

```sh
npm start
```

No `npm install`, framework, database, API key or external font/image server is required.
Open the address printed by the command in your browser. `PORT=9090 npm start` changes
the port; use `HOST=0.0.0.0` only when deliberately exposing your development server.

## Deploy

1. In `public/assets/js/config.js`, set `business.siteUrl` to your own HTTPS domain.
   Optional override on macOS/Linux: `SITE_URL=https://your-domain.in npm run build`.
2. Run `npm run build` and `npm test`.
3. Upload the **contents** of `public/` to your static hosting web root (`public_html`
   on cPanel), or deploy that folder to Netlify/Cloudflare Pages/Vercel. Include hidden
   files when uploading to Apache. Enable HTTPS on your host.
4. Check Call and WhatsApp on a real phone and verify that the configured phone number
   belongs to your garage. Enter your actual address, hours, Google Business Profile link
   and any confirmed warranty/payment terms before announcing them to customers.

The included build runs without a domain. Until a real domain is configured, it is
intentionally `noindex`, robots.txt blocks indexing, and no placeholder sitemap or canonical
URL is emitted. This does not prevent local use or WhatsApp bookings.

Netlify/Cloudflare Pages can use `npm run build` with publish directory `public`.
The project also includes Apache `.htaccess` and Netlify/Cloudflare `_headers` defaults.
Host-specific rules are included for convenience; they were not deployed to an external host.

## What booking actually does

By default, the booking form prepares a WhatsApp message. **The customer must press Send
in WhatsApp; the garage then confirms availability and the quote.** The static website does
not receive or store bookings in a database and does not accept payment.

An optional `business.bookingEndpoint` can receive a JSON POST. `bookingTimeoutMs` defaults
to 15000. Stable `serviceItems: [{id, qty}]` are included alongside display names. The endpoint
must validate and reprice everything server-side, enforce rate limits and handle duplicate
requests; a client-side estimate is not an authoritative price. HTTP 2xx means receipt of the
request, not confirmation of a service slot. API failure/timeout offers WhatsApp recovery and
warns that a request may already have arrived. Tests use intercepted API responses, not a live backend.

## Tests

```sh
npm test
npm run test:browser
npm run test:reliability
npm run test:services
```

The service-menu suite adds 35 desktop/mobile checks, including no-JavaScript prices and filters.

The browser suites need Python 3 with Playwright and Pillow, plus Chromium:

```sh
python3 -m pip install -r tests/requirements.txt
python3 -m playwright install chromium
```

If system Chromium is installed, the suites use it automatically; `CHROMIUM_PATH` can
select an executable. Run from the project root. Browser screenshots are saved in
`tests/screenshots/` by default; set `SHOTS` to put them elsewhere. The tests use local HTTP
ports and mocked booking APIs; no messages or bookings are sent to the business.

`npm test` covers 276 rate-card figures plus calculator, area, asset, date, persisted-data,
server and build/SEO regression tests. The browser suite covers all pages at mobile/desktop
sizes plus calculator, navigation, gallery and booking interactions. The reliability suite
adds timeout, duplicate submit, stale estimate, quantity handoff and review-source checks.

## Content and maintenance

- Business contact details, vehicle models, timezone and pricing adjustments: `public/assets/js/config.js`.
- Prices: `public/assets/js/rate-card.js`, with reference CSV in `docs/rate-card/`. Run tests and rebuild after edits.
- Reviews: `public/assets/js/reviews.js`. Two excerpts were transcribed from screenshots supplied by the owner,
  who confirmed that **The Car Junction** is the same garage branded here as CarMechanic Indore.
  The 4.8/34 summary is labelled as an owner-provided screenshot snapshot, not a live Google feed.
  No review date, original Google URL or additional testimonial has been invented.
- Photos: included sample illustrations are explicitly labelled. Add your own workshop photos or optionally run
  `npm run photos`, then rebuild. Stock photo credits and open-font licences remain included.
  The default delivered build makes no third-party asset requests.
- Policy pages describe the current request workflow. Confirm service-specific terms with the owner; they are not legal advice.

See `docs/RELIABILITY_REVIEW.md`, `docs/QUICKSTART-HINDI.md`, `docs/HOW_TO_UPDATE.md`
and `docs/LAUNCH_CHECKLIST.md`. Earlier changelogs describe historical releases and may mention
sample reviews or remote-photo fallbacks that v1.5 replaced.
