> v1.6.1: reviews belonging to another garage and their rating have been removed. There are no published Garagewala reviews yet. The Regional Park address is owner-supplied; the Maps search is not a verified Google listing. Older notes below describe historical placeholder assumptions.

# Placeholder content & pricing assumptions

## Prices — approved rate card (no longer demo)
Since v1.2 the site uses the rate card approved on 27 Oct 2026 (`public/assets/js/rate-card.js`, source files in
`docs/rate-card/`). `pricing.isDemo` is `false`, so the "Demo prices" tags and PREVIEW ribbon are gone.

What is still an assumption, not part of the researched rate card:
- **Fuel factor on parts** for servicing and oil change (diesel ×1.12, CNG ×1.08, hybrid ×1.15) — `config.js → pricing.fuelMultiplier`.
- **Parts grade** the customer can choose (economy ×0.8, genuine ×1.25; standard = rate card) — `pricing.partsGrade`.
- **Older cars** (over 10 years) +10% labour — `pricing.ageRule`.
- **Typical times** shown with each estimate — `hours` in `rate-card.js`.
- **GST**: prices are shown with "Taxes as per final bill". Decide whether the rate card is GST-inclusive, then update the wording or enable `pricing.taxes`.
- **20 services have no price yet** ("Price on request"): air, cabin and fuel filters, spark plugs, coolant, brake fluid, brake disc skimming, clutch adjustment, engine tune-up, suspension inspection, wheel alignment, wiring diagnosis, headlights, windshield chip repair, door glass, ceramic coating, breakdown diagnosis, towing, pickup outside the service area, and hourly labour. Add prices in `rate-card.js` when ready.
- **Labour-only prices** (parts quoted by model): rear brake shoes, clutch set, shock absorbers, tyre fitting.

## Other placeholders
- **Pickup PIN codes** — 16 Indore city PINs from India Post data are marked covered (`service-areas.js`). They are real PIN codes, but the owner still needs to confirm the garage serves all of them; see the "Still to verify" list in `docs/HOW_TO_UPDATE.md`.
- **Reviews** — six SAMPLE testimonials (Rahul Sharma, Amit Verma, Rohit Patel, Ankit Jain, Vikas Gupta, Saurabh Singh) in `reviews.js`. Each card is tagged "Sample review" and "Demo content — not a real customer", and a notice above the section says so. They never appear in structured data. They hide automatically once a genuine approved review is added.
- **Before & After images** — 19 sample pairs supplied by the owner (`public/assets/img/gallery/samples/`). They appear AI-generated and are not jobs done at the garage, so each card says "Illustrative example — not an actual customer vehicle." No vehicle, duration or price is shown for them. Replace with real jobs over time (`gallery.js`, `kind: "real"`).
- **Stock photos** — 13 free Unsplash photos (hero, service cards, service pages, About). Captioned "Stock photo"; not the garage's workshop or customers' cars. See `docs/PHOTO_CREDITS.md`.
- **Hero fallback** — `hero-workshop.svg` illustration shows only if the hero photo can't load.
- **About Us** — "Our story" and "Our workshop" are yellow placeholders for the owner to fill in.
- **Address, geo coordinates, working hours, email** — `null`; the site says "to be confirmed" and the structured data omits them.
- **Warranty, payment methods, liability, cancellation rules** — highlighted yellow placeholder blocks on terms.html and policies.html.
- **Workshop photos** — none supplied. Replace stock photos with your own (`tools/photos.json`, `"own": true`); real before/after photos go in `public/assets/img/gallery/real/` (see `docs/HOW_TO_UPDATE.md`).
- **siteUrl** — `https://www.example.com`; affects canonical URLs, sitemap and robots.txt.
- **Emergency/breakdown repair page** — not created (`config.js → pages.emergencyRepair: false`) because it hasn't been confirmed as offered.
- **Accident repair page** — created because accident repair is in the owner's service list; switch off with `pages.accidentRepair: false` if not offered.
- **Typical service times** in the estimator are demo values too (`services[].hours`).
