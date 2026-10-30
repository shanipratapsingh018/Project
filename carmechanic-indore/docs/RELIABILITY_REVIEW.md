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

The owner supplied screenshots of reviews by Harshita Sharma and Taher M. Alot, and explicitly confirmed
that The Car Junction is their garage. Those excerpts are published with that source name preserved.
The owner-authorized public screenshot basis is recorded separately from explicit customer consent;
no customer-consent claim is invented. The screenshot's 4.8 rating / 34 reviews is labelled as a snapshot.
No live Google API, original review URL or independently verified capture date was supplied.
Sample testimonials and competitor reviews were not added as customers of this garage.

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
