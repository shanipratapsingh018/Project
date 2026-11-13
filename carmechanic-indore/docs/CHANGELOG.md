# v2.7.1 — Booking keeps the calculator price; Enter key stays on the calculator

- **Fixed: the calculator price never reached the garage.** Entering a pickup PIN (or using "Use my current location") or choosing drop-off cancelled the carried estimate, and one of those is required, so every booking from the calculator arrived without the price. Only changing the car or the jobs cancels the estimate now; pickup, drop-off and the PIN don't change the price.
- **Fixed: Enter / the phone's Go key jumped to booking.** In the calculator's service search, panel count or "type your model" box, Enter now just closes the keyboard; booking happens only from the "Book at this price" button.
- Tests: the real calculator → booking flow now checks that the price reaches the garage for both pickup and drop-off, and that Enter stays on the calculator.

# v2.7.0 — One-screen calculator, Back returns to your price

- The cost calculator is now one screen. The dark bar at the bottom shows the running price and a **Book at this price** button; small **See breakdown · WhatsApp · Share** links appear under it once there is a price.
- The old step 2 ("Your price") is gone. Its details (what's included, job-by-job table, not included, notes, disclaimer, Copy estimate, Start over) open with **See breakdown** just above the bar.
- **Parts quality** (Economy / Standard / Genuine) moved up under Fuel, with Standard selected.
- **Petrol** is selected by default. EV and hybrid models still switch the fuel automatically, and switching back to a non-EV model restores the previous fuel.
- **Car age removed.** The calculator no longer adds the 10% older-car labour allowance. (The "Older models" list also holds recently discontinued cars, so applying it automatically would overcharge.) Extra labour on a very old car is part of the inspection quote.
- **Back from booking:** when booking was opened from the calculator, the Back button reads **← My price** and returns to the calculator with the car, fuel, parts quality, jobs and quantities still filled in. The **Edit** button on the booking summary card does the same. Booking opened directly keeps its own two steps.
- Hindi translations for the new text. Footer button fits at 320px with large text.
- Tests updated for the one-screen flow, including the Back-to-price round trip; prices unchanged (2,010 comparisons, 0 mismatches).

# v2.6.0 — Clearer booking details step, optional current location

- Step 2 of the booking form ("Your details & time") is redesigned:
  - a summary card at the top shows the car, the chosen jobs and the carried-over estimate, with an **Edit** button back to step 1;
  - fields are grouped into **Your details**, **Pickup & drop** and **When**, with a fixed **+91** in front of the mobile number;
  - pickup and drop-off are two cards with a short line each; drop-off shows the garage address with a **Directions** link;
  - day buttons show the date (e.g. "Fri 13"); on **Today**, time slots that have already passed are greyed out, and Today itself is disabled after the last slot;
  - three trust points sit above a clear **Send booking request** button;
  - the large WhatsApp button becomes a small "Prefer WhatsApp?" link on this step, and the duplicate estimate box is removed.
- **Use my current location** (optional): one tap asks the phone for its location, fills the address and PIN (via OpenStreetMap Nominatim) and shows a small map with a pin the customer can drag to the exact gate. Typing the address still works on its own; location is never asked for unless the button is tapped. If permission is blocked, the customer is told to type the address.
- When location is used, the booking notes and the WhatsApp message include a Google Maps link to the exact spot ("Pickup location (map): …"). "Don't use my location" removes the pin and the auto-filled values, keeping anything the customer typed.
- Leaflet 1.9.4 is self-hosted under `assets/vendor/leaflet` (BSD-2 licence) and loaded only when the map is needed.
- Privacy page: new "Location (optional)" section.
- Hindi translations for all new text.
- Tests: new checks for location fill, map, map link, blocked permission, clearing, drop-off, passed time slots and dated day buttons.

# v2.5.1 — Car brand and model dropdowns, many more cars

- The calculator and the booking form now ask for the car with two dropdowns: **Car brand**, then **Model**.
- The car list grows from 16 brands / 98 models to **33 brands / 389 models**, built from the admin vehicle catalogue and trimmed to cars sold in India:
  - older and discontinued models, listed under "Older models" (e.g. Maruti 800, Alto 800, Zen, Omni, Hyundai Santro, i10, Tata Indica, Indigo, Mahindra Scorpio, XUV500, Toyota Innova, Etios, Honda Brio, Civic);
  - brands no longer sold but still serviced (Chevrolet, Fiat, Datsun, Mitsubishi, Hindustan Motors, Premier);
  - newer brands and models (Citroën, Jeep, BYD, Force, Isuzu, Tata EVs, Mahindra BE 6 / XEV 9e) and more luxury brands (Jaguar, Land Rover, Lexus, MINI, Porsche, Volvo).
- Every model has a car type (hatchback / sedan / SUV-MUV / luxury), so the price band is set automatically. All 98 earlier models keep their car type, so their prices are unchanged.
- Choosing an EV or hybrid model selects Electric or Hybrid fuel; switching to a non-EV model clears it again.
- "My model isn't listed" (and "Other brand") opens a text box and asks for the car type, so no customer is blocked.
- Hindi translations for the new labels, including the "Current models" / "Older models" groups.

# v2.5.0 — Simpler cost calculator and 16 more services

**Calculator**
- Prices first: the calculator opens with six popular jobs as tiles showing their starting price (car service, AC, brake check, dent & paint, battery, oil change). The full list of all 83 calculator services is one tap away, with search.
- One box for the car with model suggestions ("Maruti Swift"), instead of manufacturer and model dropdowns. Car type is filled in from the model; it is asked only for cars not in the list. Typing an EV model selects electric.
- Six questions become two (car and fuel) plus an optional "Under / Over 10 years" age choice. The exact year is no longer asked; it only mattered for cars over 10 years old, which the age choice covers.
- Two steps instead of four: car & jobs → price. "Problem & pickup" moved out of the calculator; the booking form already asks for those.
- "Step 1 of 2" labels, and a header that says "Get a price in 30 seconds · Prices updated 27 Oct 2026".
- A running price in a footer that stays in view while choosing.
- The price screen leads with the total, then a parts-quality choice (economy / standard / genuine) that updates the price, what each job includes, and the approval promise. Buttons: Book at this price, WhatsApp, Share. The full breakdown, copy and start over are under "See full breakdown".
- "Book at this price" opens the booking form straight at step 2 (your details), with the car, jobs and estimate carried over.
- Prices are unchanged: a check of all 67 earlier services for five cars and three parts grades (2,010 comparisons) matched the old calculator exactly.

**Home page (phones)**
- "Check your price in 30 seconds" tiles replace the four hero buttons on the first screen; Call, WhatsApp and Book stay in the bottom bar. Tapping a tile opens the calculator with that job ticked.

**Services** — 16 jobs added, all "Quote after inspection" until the garage sets prices:
- Suspension: lower arm / link rod / tie-rod; axle / CV joint / drive-shaft boot.
- Engine: decarbonisation; injector & throttle body cleaning; timing belt / chain; fan belt; water pump; oil leak (gasket / seal); silencer / exhaust.
- Gearbox: manual gearbox oil change; automatic transmission oil service (AT / AMT / CVT).
- Electrical: power window & central locking; small electrical jobs (horn, fuse, relay, key battery); accessory fitting.
- Bodywork: scratch removal / touch-up. Cleaning: anti-rust coating & rodent protection.
- Jobs that can't apply to electric cars are switched off for EVs, including inspection-only ones such as clutch overhaul and fuel system repair.
- The rate card CSV (docs/rate-card/proposed_rate_card.csv) has the new rows; the Excel research workbook is unchanged.

**Fixes**
- The calculator footer no longer jumps when typing ends, which could make a tap on "See my price" miss.
- With very large text settings the calculator wraps instead of widening the page.

# v2.4.3 — Simpler booking form

- Two steps instead of four: (1) your car and what it needs, (2) your details and time.
- Short page header so the form starts on the first screen of a phone.
- "Book on WhatsApp instead" button at the top of the form.
- Type the car in one box (suggestions for every listed model); tap problem tiles such as "AC not cooling" or "Not sure — please check". The full service list is still available under "Know the exact job?".
- Pickup, day and time are tap buttons instead of dropdowns. Year, fuel, registration and the separate contact-method question are no longer asked; the estimate's year, fuel and parts preference are still sent when the booking comes from the calculator.
- The bottom Call / WhatsApp / Book bar slides away while a field is being typed in, and focused fields scroll clear of it.
- New confirmation screen: summary of the request, three "what happens next" steps, and Call / WhatsApp buttons.
- Field errors clear as soon as they are fixed. A booking page cached from the old version asks for a refresh instead of breaking.
- Optional `business.bookingReplyTime` in config.js (e.g. "within 30 minutes") adds a reply-time promise to the confirmation; it is off by default.

# v2.4.2 — Footer improvements

- Add Call now and WhatsApp us buttons under the phone number; the number itself is tappable and shown without wide monospace gaps.
- Rename the location link to "Get directions".
- Show hours on one line ("Open daily · 7 AM – 11:30 PM") with a live Open now / Closed now label calculated in India time.
- Balance the columns: FAQs and Pickup & drop areas move to a "Help & policies" column.
- Move the faded logo to the top-right so the floating WhatsApp button no longer covers it.
- Add the हिंदी / English switch to the footer.

# v2.4.1 — High-priority bug fixes (audit 6 Nov 2026)

- Service search matches word starts, and two-letter terms such as "AC" match whole words, so "AC" no longer lists brake, battery or accident jobs (Services page and calculator).
- Calculator step 2 re-prices every service for the chosen car type and fuel, and switches off jobs that do not apply (e.g. oil change, spark plugs and clutch on electric cars).
- Calculator result headline says "Price on request" or "No priced jobs" instead of always "Inspection required" when nothing could be priced.
- Booking failures explain what happened: offline, details not accepted, rate-limited, booking unavailable, or uncertain (with a safe resend, since repeated identical requests are de-duplicated).
- Preferred-time choices now come from config.js and match the 7:00 AM–11:30 PM opening hours; the About page states the hours instead of asking customers to ask for them.

# v2.4.0 — Local SEO and crawlable content

- Add branded/local search titles, descriptions, social preview metadata and linked business/service/page data.
- Add canonical breadcrumbs and contextual related-service links; render confirmed pickup areas without JavaScript.
- Correct heading levels, carousel semantics and desktop contact navigation while preserving the controls.
- Add critical font hints and defer public scripts; protect 404/admin indexing boundaries.
- Record SEO checks and owner Search Console steps in SEO_2.4.md.

# v2.3.0 — Booking accuracy, accessibility and Hindi

- Address all 13 follow-up audit findings; preserve parts preference, validate quantities and choices, verify receipts and use actual years/India dates.
- Improve enlarged-text layouts, contrast, accessible link names, keyboard steps and error descriptions.
- Add Hindi support for customer booking/calculator flows without changing submitted values.
- Record additional checker, gallery, review and cached-markup cases in AUDIT_FIXES_2.3.md.
- Prepare the separately deployed Supabase function update; its server date guard still requires owner activation.

# v1.9.4 — Compact scrolling header

- Reduced masthead text/logo sizes, spacing and menu height; aligned the header within a narrower 1200px container.
- Removed sticky positioning so the entire header scrolls away naturally and content stays unobstructed.
- Reset section-anchor offsets for the non-sticky header, while retaining the mobile menu, repeated logos and watermarks.

# v1.9.3 — Wide brand masthead and repeated logo

- Garagewala is centred in a large, widely spaced masthead above the full menu, with a larger undistorted logo.
- Added large footer branding and an About-page logo card.
- Added faint decorative watermarks to hero backgrounds, service photos and the footer; decorations do not intercept clicks.
- Updated mobile controls, scrollable navigation and sticky-header anchor spacing.
- HTML logos, CSS watermarks and favicon share the unchanged logo URL for cache reuse.

# v1.9.2 — Spacious navigation

- Replaced the compact dark menu tiles with a light full-width navigation rail below the brand row.
- Larger labels, clearer icons, restrained borders, orange Home and selected-page highlights.
- Mobile uses a readable single-column panel with direction arrows and bounded scrolling.
- All navigation, language and keyboard behaviour remains available.

# v1.9.1 — Icon button navigation

- All seven main menu links are rounded icon buttons with charcoal/orange styling, hover and keyboard focus states.
- Selected pages have an accent border and shaded background; Home keeps its permanent orange treatment.
- Mobile and smaller laptop menus display a two-column button grid, and language changes preserve all icons.

# v1.9.0 — One full-width slider and twenty service photos

- Removed the separate homepage workshop image; one carousel spans both columns below the introduction/calculator.
- Added ten new generated repair/service photographs for twenty distinct carousel scenes.
- Home keeps the same orange fill, text and border on every page, including hover; aria-current still identifies the current page correctly.
- Updated slider/layout/colour checks and preserved mobile swipe and no-JavaScript support.

# v1.8.1 — Home navigation and brand tagline

- Home navigation has a house icon, rounded orange treatment, active state, hover and keyboard focus styles.
- The icon stays intact when switching English/Hindi; the mobile menu keeps a touch-sized Home control.
- Garagewala's tagline is now Your Car. Our Care. · Indore in the header/footer and service-page brand copy.

# v1.8.0 — Service Gallery and ten-photo carousel

- Renamed Before & After to Service Gallery across navigation, footer, page title and homepage, removing the unsupported Real Car Transformations heading.
- Added Call Now to the gallery header and each of its nineteen cards; retained booking, WhatsApp and filters.
- Removed visible image example/disclaimer labels across content pages at the owner's request; retained source metadata without relabelling sample jobs as real.
- Added ten responsive, locally bundled service photos beneath the homepage calculator with Previous/Next, keyboard controls, wraparound, mobile swipe and a no-JavaScript fallback.
- Added gallery/slider interaction checks at six screen widths.

# v1.7.1 — Call Now actions

- Added a Call Now action beside WhatsApp in the homepage hero and to each of the six homepage package cards.
- All actions use the configured garage number and work without JavaScript.
- Removed the visible AI caption from the selected homepage/About workshop photo at the owner's request; retained accurate alt text and source documentation.

# v1.7.0 — Workshop photo, review form and daily opening hours

- Owner-selected AI workshop illustration on homepage and About, locally bundled in two responsive sizes; visible on phones.
- Every day, 7:00 AM–11:30 PM IST in contact details, homepage, footer and structured data.
- Website feedback form: display name, 1–5 stars, car/service and experience; optional publication consent.
- Honest WhatsApp handoff with no premature delivery/publication claims, safe rendering, validation and stale-link clearing.
- Separate owner-supplied Google profile link alongside website feedback; no invented direct-review URL or ratings.

# v1.6.1 — Regional Park address

- Owner-supplied address: Front of Regional Park, Indore; no postal code or coordinates invented.
- Added labelled Google Maps landmark-search links to Contact, homepage and footer.
- Kept map search separate from an actual Google Business Profile and Google review editor.
- Removed reviews and rating after the owner clarified they belonged to a different business.
- Removed the screenshot-permission bypass; customer permission is required for publication.

# v1.6 — Garagewala service menu

- Garagewala branding, Nice Car Mechanic tagline and a generated car/garage/wrench logo in the header, footer and favicon.
- Services & Prices rebuilt with a warm editorial hero, three maintenance packages, and 69 individual service cards.
- Search, category filters, car-category estimates and matching comparison tables.
- Static prices and booking links remain available without JavaScript; approved price data is unchanged.
- 35 new service-menu browser checks and refreshed asset versions.
- The configured site URL now matches the live GitHub Pages location.

# v1.5 — reliability and self-contained delivery

Booking validation, quantity handoff, stale-estimate invalidation, API timeout/duplicate protection, local fonts/images, zero-dependency serving, SEO configuration, source-labelled owner reviews and regression tests. See RELIABILITY_REVIEW.md.

# Changelog

## v1.4.0 — 29 Oct 2026 — owner's before & after images

- The Before & After gallery now uses the owner's file `garage_before_after_20_high_resolution_1.zip`:
  19 of the 20 pairs, each split into a separate before and after image (baked-in labels, caption bar and
  neighbouring-tile slivers cropped off). Files: `public/assets/img/gallery/samples/`.
- Pair 09 "wheel alignment" was left out: it showed a worn vs new tyre, the same as pair 08, which doesn't depict an alignment.
- The images look AI-generated and are not jobs done at the garage, so every card keeps the label
  "Illustrative example — not an actual customer vehicle." Switch an entry to `kind: "real"` only for genuine jobs.
- Gallery filters are now Bodywork & lights (5), Servicing & filters (7), Mechanical repairs (7).
- Service pages show the matching pairs (e.g. brake page: brake service + clutch replacement).
- Alloy wheel repair, exhaust repair and wiper blades aren't in the rate card, so "Book Similar Service" uses
  OT-07 (general labour, price on request) for them.
- Gallery tiles are square; the drawn SVG illustrations were removed (the hero fallback illustration stays).


## v1.3.0 — 29 Oct 2026 — real photos

- **13 real photos** from Unsplash, each confirmed free under the Unsplash License (commercial use allowed;
  none are paid Unsplash+). Used in the homepage hero, the 9 homepage service cards, every service page hero,
  3 photos on the detailing page and the About page. List and credits: `tools/photos.json`, `docs/PHOTO_CREDITS.md`.
- Every caption says **"Stock photo · Photographer / Unsplash"**, so no photo is presented as the garage's own work.
  The Before & After gallery stays as labelled illustrations (no genuine same-car pairs exist in free stock libraries).
- `npm run photos` downloads all photos (800 px + 1600 px) into `public/assets/img/photos/`. Until then, pages load
  them from Unsplash's CDN; if that fails, the hero shows the illustration and other photos hide (no broken images).
- To use your own photo instead: same file name, `"own": true` in `tools/photos.json`, `npm run build`.
- Privacy page mentions that images may load from Unsplash's servers.
- Fixed: mobile menu button was squeezed to 14 px wide on phones; service cards no longer say "From ₹0".
- Tests: new `tests/photos.test.js`; browser tests cover photos loading, photos blocked, and the menu button.

**Files:** new `tools/photos.json`, `tools/fetch-photos.mjs`, `tests/photos.test.js`, `docs/PHOTO_CREDITS.md`;
changed `tools/build.mjs`, `public/assets/css/style.css`, `public/assets/js/price-table.js`, `tests/browser_test.py`,
`package.json`, generated pages, docs.


## v1.2.0 — 27 Oct 2026 — approved rate card

### Prices
- The approved rate card (69 services, 11 categories) replaces the demo prices. It lives in the new
  `public/assets/js/rate-card.js`, with IDs matching the research workbook (GS-01 … OT-07).
- Each service has hatchback labour + parts and its own sedan / SUV / luxury factor. Luxury defaults to
  "Quote after inspection" unless a factor is set (oil change, dent & paint, deep cleaning, polishing have one).
- New states: **Price on request** (20 services with no published price yet) and **+ parts quoted by model**
  (labour-only jobs: brake shoes, clutch set, shock absorbers, tyre fitting).
- "Demo prices" tags, the PREVIEW ribbon and "demo estimate" in WhatsApp messages are removed.
- `npm run import-rates -- file.csv` updates prices from an edited CSV.
- `tests/ratecard.test.js` checks all 276 figures (69 × 4 categories) against the approved CSV.

### Calculator
- Every rate-card service is a separate option, grouped by category, with the hatchback price shown beside it
  and a search box. Quantity inputs appear for per-panel / per-tyre jobs.
- Basic / standard / comprehensive service are now separate options (only one can be picked).
- Fixed: a job priced as "quote" (e.g. standard service on a luxury car) no longer marks the jobs it would include
  (e.g. oil change) as "Included" — they are priced on their own.

### Pages
- **Services & Prices** page (`services.html`) is now the full price list, with prices in the static HTML for
  search engines and OfferCatalog structured data.
- Each service page shows its own price list; homepage packages and service cards show rate-card prices.
- Booking form groups services by category.
- Header spacing adjusted so the 7-item menu fits at 1181–1440 px.

### Files
New: `public/assets/js/rate-card.js`, `public/assets/js/price-table.js`, `tools/import-rates.mjs`,
`tests/ratecard.test.js`, `docs/rate-card/*`.
Changed: `pricing.js` (rewritten), `config.js`, `app.js`, `gallery.js` (service IDs), `style.css`, `tools/build.mjs`,
`tests/estimate.test.js`, `tests/browser_test.py`, all generated pages, README and docs.


## v1.1.0 — 23 Oct 2026

### Navigation
- Main menu on every page: Home · Services · Cost Calculator · Before & After · Reviews · About Us · Contact, with the current page highlighted (orange underline) and a hamburger menu below 1180px.
- Logo links home on every page; "Back to Home" button at the top of every inner page.
- Header Book button and call icon; floating WhatsApp button and mobile bottom bar kept.
- Automated check: no link on any page points to a missing file.

### Before & After gallery (new)
- `gallery.html` + a 4-card preview on the homepage, titled "Before & After — Real Car Transformations".
- 10 categories, each with a before and an after image, category, description, optional vehicle/time/price, "Book Similar Service" (opens the booking form with that service ticked) and a WhatsApp enquiry button.
- Side-by-side on desktop; swipeable slider with dots on mobile; category filters.
- No licensed stock photos could be downloaded in this build environment, so the 20 images are drawn illustrations generated by `tools/make_illustrations.py`, each watermarked "ILLUSTRATION · NOT A PHOTO" and captioned "Illustrative example — not an actual customer vehicle." Real photos slot in via `gallery.js`.

### PIN code checker (rewritten)
- 452020 and 15 other verified Indore city PINs are now covered. Messages match the requested wording; incomplete and invalid PINs get specific errors; locality names (e.g. Kasturbagram) also work.
- WhatsApp button visible in every state, prefilled with the PIN and a pickup/drop confirmation request.
- Same checker used in the homepage, Pickup & Drop page, calculator, booking form and service-page forms.
- Messages no longer render on blur, which previously shifted the "Next" button under the user's tap.

### Reviews
- "What Our Customers Say" with six SAMPLE cards (star ratings, service, vehicle, source, approval and consent fields), each visibly labelled as demo content. A notice explains they aren't real customers or Google reviews.
- "Share Your Experience" (Google review link when configured, WhatsApp otherwise) and "Feedback on WhatsApp".
- New `reviews.html`.

### Calculator
- New dedicated `estimate.html`.
- Result now has "Book This Service" (booking form, details carried over), "Book on WhatsApp", "Copy estimate" and "Start over".
- Fixed: the Back button showed on step 1 because `.btn` overrode the `hidden` attribute. A global `[hidden]` rule now fixes this everywhere.

### Service pages
- Before/after images, "Typical problems & symptoms", Call button in the hero, and a booking form on every service page that sends to WhatsApp.
- New accident repair page (switchable in `config.js → pages`). Insurance-claim support claims removed.

### Booking
- Reads `?service=` from gallery links; live PIN status; states clearly that bookings go through WhatsApp and aren't stored in a database.

### New pages
`estimate.html`, `gallery.html`, `reviews.html`, `about.html`, `accident-repair-indore.html` (all in the sitemap).

### Files changed
| File | Change |
|---|---|
| `public/assets/js/service-areas.js` | **new** — verified PIN list, localities, messages |
| `public/assets/js/area-check.js` | **new** — pure PIN checker |
| `public/assets/js/gallery.js` | **new** — gallery data |
| `public/assets/js/reviews.js` | **new** — review data |
| `public/assets/img/hero-workshop.svg`, `public/assets/img/gallery/illustrative/*.svg` (20) | **new** |
| `public/assets/img/gallery/real/` | **new** empty folder for genuine photos |
| `tools/make_illustrations.py` | **new** |
| `tests/area.test.js` | **new** — 11 PIN tests |
| `docs/HOW_TO_UPDATE.md`, `docs/CHANGELOG.md` | **new** |
| `public/assets/js/app.js` | checker UI, gallery, reviews, quick booking, calculator tools, Hindi strings |
| `public/assets/js/config.js` | areas/reviews moved out, `pages` flags, accident service wording, pickup FAQ |
| `public/assets/css/style.css` | nav, back-home, gallery, reviews, status, `[hidden]` fix |
| `tools/build.mjs` | new nav/pages/sections, service-page photos + booking form |
| `tests/browser_test.py` | now 61 checks |
| All generated `public/*.html`, `sitemap.xml` | rebuilt |
| `README.md`, `docs/DEMO_CONTENT.md`, `docs/LAUNCH_CHECKLIST.md`, `package.json` | updated |
