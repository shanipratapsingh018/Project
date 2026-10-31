# Launch checklist

## 1. Content from the owner (blocking)
- [x] Approved rate card in use (`rate-card.js`, 27 Oct 2026)
- [ ] Decide whether rate-card prices include GST → update wording or set `pricing.taxes`
- [ ] Add prices for the 20 "Price on request" services when ready (see `docs/DEMO_CONTENT.md`)
- [ ] Review the fuel / parts-grade / older-car adjustments in `config.js → pricing`
- [ ] Confirm the 16 covered pickup PIN codes in `service-areas.js`, especially the outlying villages in 452016 / 452020, and decide on 452004 / 452008
- [x] Complete shop address and PIN supplied: Shop No. 1, Sobhag Bagh, Pipliya Rau, Opp. Regional Park Road, Pawan Putra Nagar, Indore, Madhya Pradesh 452012
- [x] Owner-supplied Google Business link connected; daily hours and PIN confirmed
- [ ] Exact entrance coordinates remain unverified
- [ ] Logo approval (current mark is a concept: hex nut + gauge needle)
- [ ] Workshop photos (owner's own or licensed) in `assets/img/`
- [ ] Warranty, payment, cancellation and liability text → terms.html / policies.html placeholders
- [ ] Confirm whether emergency/breakdown repair is offered (page not created yet)
- [ ] Collect genuine Car Repair Wala customer reviews with permission; borrowed reviews and their rating were removed
- [ ] Google review link → `reviews.js → googleReviewUrl`
- [ ] Before/after photos of real jobs (same car, owner consent, plates blurred) → `gallery.js`
- [ ] Confirm accident repair is offered (page is live) and whether emergency repair is offered (page is off)
- [ ] Fill "Our story" and "Our workshop" on the About page

## 2. Technical
- [x] Self-contained local fonts and labelled illustrations; stock-photo downloads are optional
- [x] GitHub Pages URL configured in `business.siteUrl`; production build uses that URL
- [x] GitHub Pages enabled on `gh-pages` / root with HTTPS
- [ ] Test on a real Android phone: estimator, Book This Service (opens WhatsApp with text), Call, booking form
- [ ] Optional: connect `business.bookingEndpoint` (Formspree/Sheet or the phase-2 API)
- [ ] `npm test` passes after price edits

## 3. Local SEO
- [ ] Create/verify Google Business Profile (category "Auto repair shop"), same name/phone as site; add website link
- [x] Set owner-supplied `googleBusinessProfileUrl` and rebuild
- [ ] Optional: configure `googleAnalyticsId`
- [ ] Google Search Console: verify domain, submit `/sitemap.xml`
- [ ] Check structured data with Google's Rich Results Test
- [ ] List on JustDial / Sulekha with identical name and phone (NAP consistency)

## 4. After launch
- [ ] Ask happy customers for Google reviews; add approved ones to the site
- [ ] Review Analytics monthly: estimator completions vs WhatsApp clicks
- [ ] Update prices in `rate-card.js` and the reference CSV, test and rebuild when the rate card changes
