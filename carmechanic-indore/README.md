# Car Repair Wala — Your Car. Our Care. · v2.2.2

A ready-to-run static garage website branded **Car Repair Wala · Your Car. Our Care.**: 22 responsive pages, 69-service price list,
vehicle-specific estimates, pickup-area checks, service gallery, customer feedback form, online booking and WhatsApp contact. Node.js 18+ is needed for local serving
and rebuilding; a static hosting provider needs only the included `public/` files.

## Website address

https://carrepairwala.co.in/

Release 2.2.2 fixes service-page overflow, price comparison scrolling, photo sizing,
mobile actions, calculator dates and small-screen service instructions. The
[responsive audit](docs/RESPONSIVE_AUDIT.md) lists the issues and every affected page.

For DNS, HTTPS, booking origins and owner-login redirects, follow the [custom-domain guide](docs/CUSTOM_DOMAIN.md).

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

This describes the public website. The private owner workspace uses the configured Supabase project and requires an authorised owner account.

## Private owner workspace

Open https://carrepairwala.co.in/admin/ or the **Owner login** link in the footer.
It includes customers and vehicles, manual and website enquiries, job cards and customer approval,
private job attachments, itemised invoices, printing/Save as PDF, payment records and billing settings.
Owner membership is checked by database policies. Invoice amounts and payment balances are checked by SQL functions.

Vehicle forms now have searchable dropdowns for 70 brands and 847 models, dependent model selection,
year and fuel choices, saved-value preservation and manual entries for missing vehicles. The same
picker is used for customer vehicles and manual enquiries. See [vehicle dropdowns](docs/VEHICLE_DROPDOWNS.md).

Public connection settings point to project `oraooxeefxcwmwgycrei`. Login requires the database migrations,
an Auth user and owner membership; the owner has reported completing initial database setup.
The main Book Service form now saves requests through the deployed Supabase function.
Service-page quick-enquiry forms and WhatsApp chat buttons still use WhatsApp.
No fake password or customer database is supplied.
Follow [the admin setup guide](docs/ADMIN_SETUP.md) for migrations, owner creation and optional booking intake.
Only the project URL and public publishable/anon key belong in `backend-config.js`; never include a secret key.

To rebuild admin assets, use Node.js 22+ and run `npm ci --ignore-scripts` then `npm run build`
inside `admin-app/`. The root static server needs no npm install. Tests include fictional mocked browser data
and isolated PostgreSQL checks. The owner verified the deployed intake with controlled requests;
the complete live form and private booking list still need an owner check after publishing.

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

The main `booking.html` form now submits directly to the deployed `submit-booking` Edge Function.
`public/assets/js/backend-config.js` has `bookingEnabled: true`. The owner demonstrated HTTP 200
with `received: true` using both the Supabase dashboard origin and the website origin.
Successful submissions are saved privately as new enquiries and can be read in **Admin → Bookings**.
The garage still confirms the date, availability and quotation; receipt is not a confirmed appointment.

The browser supplies the public key and a UUID request ID. Identical retries in the same tab reuse
that ID to avoid duplicate records. API failures or timeouts preserve entered details and offer
WhatsApp/phone recovery. Check uncertain receipt with the garage before starting a fresh request.

The service-page quick-enquiry forms and WhatsApp chat buttons still prepare WhatsApp messages;
the customer must press Send in WhatsApp. They do not import messages or calls into admin.
Feedback/review forms also keep their existing WhatsApp handoff. No payment is collected online.
To disable online intake, set `bookingEnabled: false`, rebuild and redeploy; the main booking
form then returns to the WhatsApp handoff. Browser tests intercept API calls and do not send
fictional records to production.

## Service gallery and homepage photos

The navigation, footer and gallery page are called **Service Gallery**. Gallery cards retain
service categories and image comparisons, with Call Now, booking and WhatsApp actions.
Visible image example/disclaimer labels are removed at the owner's request. Source metadata
remains accurate in the data files and documentation; sample jobs are not relabelled as real jobs.

A single twenty-photo service carousel spans the full content width beneath both homepage columns. It includes washing, engine work, suspension, denting, painting, AC service, servicing,
workshop bays, engine inspection, parts inventory, brakes, wheel balancing, battery testing,
oil/filter service, gearbox repair, cooling-system service, injector cleaning, diagnostics,
interior cleaning and foam washing. Previous/Next, keyboard navigation,
wraparound and native touch scrolling work without autoplay. Without JavaScript it stays a
swipeable photo strip. Images use locally bundled 800/1600px WebP assets with lazy loading.
Edit `tools/workshop-photos.json` and rebuild to update the carousel; image files are in
`public/assets/img/workshop/`.

## Customer reviews and workshop hours

The About page uses the owner-selected, locally bundled AI workshop illustration,
with responsive images (about 99 KB / 271 KB). It also displays on phones.
Visible image captions identifying examples were removed at the owner’s request; source information remains in alt text and documentation.
Opening hours are **every day, 7:00 AM–11:30 PM IST**, confirmed by the owner.

The homepage and About page link to `reviews.html#write-review`. Customers enter a display
name, 1–5 star rating and feedback, then open WhatsApp and press Send. Preparing a message
is not delivery. Publication consent is optional and unchecked; private feedback must not be
published. No review is automatically stored or displayed publicly. The garage checks feedback
and adds permitted customer reviews to `public/assets/js/reviews.js`; see `docs/HOW_TO_UPDATE.md`.
All ratings follow the same workflow. Editing clears stale prepared messages.

The owner supplied `https://share.google/xKw37sHP3Pm3QmCXr` as the shop's Google Business
location. Location and Google profile buttons use it across the site, including without JavaScript.
The complete owner-supplied workshop address is **17, AB Rd, Choithram Mandi, Indore, Madhya Pradesh 452012**.
It appears on Home, About, Contact, every page footer and in business structured data.
Google sharing hosts are blocked in this workspace; the address was supplied directly by the owner.
Set `googleReviewUrl` only when an actual Ask for reviews URL is available.

## Tests

```sh
npm test
npm run test:browser
npm run test:reliability
npm run test:services
npm run test:gallery
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
- Address: 17, AB Rd, Choithram Mandi, Indore, Madhya Pradesh 452012, as supplied by the owner. Coordinates have not been supplied.
- Maps: `googleBusinessProfileUrl` is the current owner-supplied location link. `googleMapsSearchUrl` is a full-address search fallback. No review editor, coordinates or Google verification status is inferred.
- Reviews: `public/assets/js/reviews.js` is empty. Earlier screenshots were confirmed to belong to another garage and were removed, including their rating. Add only genuine Car Repair Wala customer feedback with approval and publication consent.
- Photos: included sample illustrations are explicitly labelled. Add your own workshop photos or optionally run
  `npm run photos`, then rebuild. Stock photo credits and open-font licences remain included.
  The default delivered build makes no third-party asset requests.
- Policy pages describe the current request workflow. Confirm service-specific terms with the owner; they are not legal advice.

See `docs/RELIABILITY_REVIEW.md`, `docs/QUICKSTART-HINDI.md`, `docs/HOW_TO_UPDATE.md`
and `docs/LAUNCH_CHECKLIST.md`. Earlier changelogs describe historical releases and may mention
sample reviews or remote-photo fallbacks that v1.5 replaced.
