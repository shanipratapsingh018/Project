> v1.5: run `npm run build` after content edits. Stock downloads are optional; missing photos use bundled labelled illustrations at build time. Reviews may use explicit customer consent or an owner-authorized public review screenshot, recorded separately with its source. Never publish another garage’s reviews as your own.

# How to update prices, PIN codes, gallery photos and reviews

## 0. Prices — `rate-card.js`
Two ways:
- **In Excel / Google Sheets:** open `docs/rate-card/proposed_rate_card.csv`, change `labour_low`, `labour_high`,
  `parts_low`, `parts_high`, the three `*_factor` columns or `inspection_required`, save as CSV, then run
  `npm run import-rates -- docs/rate-card/proposed_rate_card.csv`.
  Blank labour → "Price on request"; blank parts → "parts quoted by model"; blank luxury factor → "Quote after inspection".
- **Directly:** edit the numbers in `public/assets/js/rate-card.js` (one line per service, IDs match the workbook).

Then run `npm test` and `npm run build`. The rate-card test compares the site with the CSV, so if you edited
`rate-card.js` directly, export the same numbers into the CSV too (or the test will tell you which figures differ).

PIN codes, photos and reviews live in their own data files in `public/assets/js/`. Edit, save, upload the file.
No rebuild is needed, except the homepage/pickup text that quotes the number of covered PINs
(run `npm run build` to refresh that count).

## 1. Pickup & drop PIN codes — `service-areas.js`
- **Add a covered PIN:** add it to `coveredPins` (6 digits, in quotes). Remove it from `pendingPins` if it is there.
- **Remove a PIN:** delete it from `coveredPins`. Customers entering it then see
  "Your location is not in our confirmed service list yet. Contact us to check availability."
- **Locality names** (what customers can type instead of a PIN): add `["Name", "452xxx"]` to `localities`.
- **Pickup charge:** set `freePickupInCoveredArea: false` if covered areas are no longer free;
  the estimator then shows "Pickup charge to be confirmed".
- **Messages:** all checker texts are in `messages`.
- After editing, run `npm test` — the area tests check every covered PIN is a valid 6-digit code.

Currently covered (16, from India Post data): 452001, 452002, 452003, 452005, 452006, 452007,
452009, 452010, 452011, 452012, 452013, 452014, 452015, 452016, 452018, 452020.

**Still to verify**
- `452004` and `452008` appear in one directory only, not in the India Post post-office list. They sit in `pendingPins` and are shown as "not in confirmed list".
- `452016` and `452020` include outlying villages (e.g. Sanawadia, Kanadia, Palda, Tillor, Datoda, Kelod Kartal). Confirm the garage really picks up from the furthest of these; if not, remove the PIN or tell customers at booking.
- `452017` and `452019` are not listed by any source and are treated as not covered.
- The rest of Indore district (453xxx: Mhow, Sanwer, Depalpur, Hatod) and Pithampur are deliberately not covered.
- Re-check any PIN on the official India Post search: https://www.indiapost.gov.in

## 1b. Stock photos — `tools/photos.json`
- Run `npm run photos` once (on a computer with normal internet) to download them into `public/assets/img/photos/`.
- Replace any with your own: save as `public/assets/img/photos/<id>-800.jpg` and `<id>-1600.jpg`, set `"own": true`, run `npm run build`.
- Credits and licence: `docs/PHOTO_CREDITS.md`.

## 2. Before & After photos — `gallery.js`
1. Take before and after photos of the **same car** from the same angle, with the owner's permission. Blur number plates.
2. Resize to about 1200 × 900 px (4:3) and save as WebP or JPG under 200 KB, e.g.
   `public/assets/img/gallery/real/2026-11-swift-door-before.webp` and `…-after.webp`.
3. In `gallery.js`, copy any entry and change:
   - `id` (unique), `kind: "real"`, `group` (`body`, `clean` or `mech`), `serviceId` (an ID from rate-card.js, e.g. `BD-01`)
   - `before.src`, `after.src`, and descriptive `alt` text for each
   - `vehicle`, `duration`, `price` — only if accurate; leave `null` otherwise
   - `featured: true` to show it on the homepage
4. Real jobs automatically appear first and are labelled "Work done at our workshop" instead of "Illustrative example".
5. To retire an illustration, set its `show: false`.

The current sample pairs are in `public/assets/img/gallery/samples/` (from the owner's zip of 29 Oct 2026).
Square-ish photos work best: gallery tiles are shown 1:1 and cropped to fill.

## 3. Customer reviews — `reviews.js`
1. Ask the customer for a review (WhatsApp or Google) **and** permission to show it on the website.
2. Add an entry: `name` (as the customer wants it shown, e.g. "Rahul S."), `rating` 1–5, `service`,
   optional `vehicle` and `date`, `text` (their words), `source` ("Google", "WhatsApp"…),
   `isSample: false`, `approved: true`, `consent: true`.
3. As soon as one such review exists, all six sample reviews are hidden automatically.
   To hide samples earlier, set `showSamples: false` — the page then shows a "Share your experience" prompt.
4. Paste your Google review link (Google Business Profile → "Ask for reviews") into `googleReviewUrl`
   so the **Share Your Experience** button opens Google instead of WhatsApp.

Never publish a review that a customer didn't write, and never add star ratings or review counts
to the structured data unless they come from real reviews.
