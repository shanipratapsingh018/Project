# v1.5 reliability review

Scope: preserve the existing design and approved price card while fixing booking reliability,
self-contained delivery, honest customer content and basic deployment behavior.

## Fixed

- Optional preferred dates were unchecked under `novalidate`, and UTC min dates could disagree with
  the garage's local date. All three forms now validate dates using Asia/Kolkata, including midnight rollover.
- Booking accepted PINs beginning with zero. It now uses the same Indian PIN rule as the area checker.
- Estimator handoff lost quantity, parts-grade context, preferred time and warning-light-only notes.
  Quantities now remain editable in booking and are included in the WhatsApp text and API service items.
- Editing a car, service, quantity or pickup selection could leave a stale carried estimate attached.
  Relevant edits now invalidate it; a customer can recalculate or request a new quote.
- Valid JSON of the wrong shape or invalid service IDs in session storage could crash initialization.
  Handoff fields are normalized, bounded and filtered against known services before rendering.
- Duplicate IDs could double-charge the pure pricing engine. Estimates now deduplicate known service IDs.
- Optional API requests could wait forever and be submitted repeatedly. Added abort timeout, pending-request
  guard, busy/inert form state, retained input on failure and clear recovery without claiming a confirmed booking.
- Editing after a quick-book or failed API request clears the old generated message link.
- Mobile menu now closes on Escape, outside taps and navigation, and restores keyboard focus on Escape.
- Missing stock image files caused avoidable 404s and remote fallbacks. The default build uses bundled,
  honestly labelled illustrations. Fonts and their open licences are bundled locally.
- Replaced `npx http-server` startup with a zero-dependency public-only server, HEAD support, MIME types,
  traversal/dotfile protection, useful nested 404 pages, and clear startup errors.
- Removed developer instructions from visitor-facing contact/about/policy copy; unknown facts are not invented.
- Preview builds no longer emit example.com canonicals/sitemaps. Configuring a real HTTPS domain enables them.
  Rebuilding also removes generated service pages when their feature flag is disabled.

## Reviews and source limits

The owner clarified that the earlier Google review screenshots belonged to another garage.
Both excerpts, the aggregate rating and the screenshot-permission bypass have been removed.
The website invites genuine Garagewala feedback. The owner supplied the current Google
Business sharing link, https://share.google/WnVvAG5hBsKbOV8j9, and copied the complete
shop address into the chat: Shop No. 1, Sobhag Bagh, Pipliya Rau, Opp. Regional Park Road,
Pawan Putra Nagar, Indore, Madhya Pradesh 452012. Both are connected across the public site.
Google blocks this workspace from opening sharing links, so its ownership-verification
status, coordinates and Google ratings have not been independently established.

## Validation

- `npm test`: approved price figures, calculator/area tests, local assets/fonts, form validation,
  corrupt session data, duplicate service IDs, local server behavior and production/preview builds.
- `npm run test:browser`: all 22 pages in mobile and desktop viewports; navigation, price tables,
  estimates, WhatsApp payloads, booking validation, reviews, gallery and images.
- `npm run test:reliability`: 22 focused browser checks, including intercepted HTTP 201/500 responses,
  stalled requests, duplicate submit, quantity handoff, stale quotes and source-labelled reviews.

These checks validate the local implementation, not every possible device, network or future content edit.
No live booking API, real WhatsApp delivery, external deployment or payment processing was tested.

## Before public launch

Set the real domain and rebuild. Confirm the phone number, actual service coverage, GST treatment,
price-adjustment assumptions, workshop details and policy terms. Add the real Google Business Profile
link to enable a direct review destination. Use genuine workshop images when available.

The website is runnable without these optional content additions; bookings currently use WhatsApp.
A backend/admin/payment system is a separate capability and has not been claimed or fabricated.
