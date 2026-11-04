# Audit fixes — release 2.3.0

Website: https://carrepairwala.co.in/ · Date: 4 November 2026

The 13 issues from the read-only audit are implemented in this release. Public
website fixes are deployed through GitHub Pages. The updated Supabase function
is prepared separately: **the live server-side past-date rule requires the owner
to deploy that function**, because this environment has no Supabase deployment
identity. See [the deployment steps](DEPLOY_BOOKING_FIX.md).

## Fixes and affected pages

| Audit ID | Fix | Affected pages / components |
| --- | --- | --- |
| B01 | The booking shows a parts-preference selector and carries the choice in the request and enquiry notes. Notes remain compatible with the existing deployed handler, so the preference reaches the current admin interface. The updated handler also preserves structured grade/category metadata. | Home, Cost Calculator and all nine service calculators → Book Service; booking handler. |
| B02 | Blank, zero, fractional and out-of-range quantities stop progression with an associated error. Valid quantities are submitted as numbers without silently changing the displayed value. | All 11 calculators and Book Service. |
| B03 | Both browser workflows enforce the handler's 30-service limit and explain it. Existing over-limit drafts are blocked for correction instead of silently truncated. | All calculators and Book Service. |
| B04 | Success requires a parsed JSON acknowledgement with `received: true`. A supplied request ID must match. Invalid JSON, empty/negative acknowledgements and mismatched IDs keep the form available and do not announce receipt. Older positive acknowledgements without an echoed ID remain compatible. | Book Service. |
| B05 | Customers choose actual years from 1950 to the current year. “Before 2005” is removed. An old cached `2004` range sentinel is not reused as an actual year; new exact-year drafts carry an explicit marker. | Public vehicle selectors and calculator-to-booking handoff. |
| B06 | Calculator calendar minimums consistently use Asia/Kolkata, including the India/UTC midnight boundary. | All 11 calculators. |
| B07 | The supplied handler rejects invalid/past preferred dates before storage using the same India date. **Live activation requires the Supabase deployment linked above.** | `submit-booking` function; no database migration. |
| B08 | Branding, grid content, controls and the mobile bar adapt to enlarged text. The bar's measured height determines page-bottom clearance. No global overflow hiding is used to mask the issue. | All 22 public pages; phone, tablet and desktop checks in English and Hindi. |
| B09 | WhatsApp and orange text colors meet contrast requirements; package numbers are darker. The generic caption rule no longer overrides the Before/After label colors. | Shared controls, Services & Prices and service photo comparisons. |
| B10 | Brand links use their visible text as the accessible name. Service links include visible “Book service”/“Request quote” text plus a service-specific description. | All public headers and 69 service-card links. |
| B11 | Next/Back moves focus to the new step heading; the next Tab reaches its controls. Initial loading does not steal focus. | Main booking and all calculators. |
| B12 | Field errors have IDs, live announcements and `aria-describedby` associations. Missing fuel/category choices are marked invalid as well. | Booking, quick enquiries and calculator validation. |
| B13 | Hindi covers booking/calculator steps, fields, choices, service names, navigation, errors and confirmations, including dynamically rendered text. Switching back restores English. Canonical option values, submitted details and the rate card stay unchanged. Remaining English technical/legal passages are explicitly tagged as English. If language files fail, usable English remains correctly tagged. | All public pages, particularly the booking and calculator journeys. |

The calculators appear on `index.html`, `estimate.html`,
`car-service-indore.html`, `car-ac-repair-indore.html`,
`brake-clutch-repair-indore.html`, `engine-diagnostics-indore.html`,
`suspension-steering-repair-indore.html`, `car-battery-electrical-indore.html`,
`denting-painting-indore.html`, `car-detailing-indore.html` and
`accident-repair-indore.html`.

## Additional cases discovered during rechecking

| ID | Finding | Resolution |
| --- | --- | --- |
| E01 | The pickup checker on Home and Pickup & Drop could expand its grid beyond the screen with enlarged text, independently of the header. | Bound the checker grid track and allow its action text to wrap. |
| E02 | Gallery action labels could force a card's implicit grid column wider in enlarged Hindi. | Give cards a bounded column and allow action/dot text to wrap. |
| E03 | The Reviews intro grid could exceed a 320px screen at doubled default text size. | Bound the intro/form columns and keep their actions within the available width. |
| E04 | A new release could interpret an old cached “Before 2005” draft as the actual year 2004. | Require explicit exact-year metadata for that legacy value; otherwise ask the customer to choose. |
| E05 | Cached booking HTML may lack the new parts selector during a deployment. | The runtime supplies the missing control instead of failing during initialization. |

Existing low-priority accessibility recommendations remain recorded separately:
heading hierarchy, carousel role semantics and the desktop floating action's
landmark placement. These are not contrast or label-name failures.

## Verification and limits

Regression coverage includes invalid quantities, service limits, older years,
parts-preference handoff, malformed/negative/mismatched acknowledgements,
midnight date rules, keyboard focus, error associations and Hindi switching.
All 22 public pages are checked at doubled browser default font size in English
and Hindi across 320, 390, 768, 1024 and 1440px. The existing responsive suite
also checks 23 entry routes at 11 widths. Other suites cover public forms,
service filtering, gallery behavior, failure recovery, private admin flows and
isolated database policies and payment races.

All test requests and records are fictional. Production customer data is not
modified. The exact published files are tested locally; direct access to the
custom domain and live Supabase services is restricted in this environment.
Successful local handler tests do not establish live deployment of that handler.

Run the new checks with `npm run test:audit` and the complete unit suite with
`npm test`. Use `npm run prepare:booking-update` to regenerate the single-file
Supabase dashboard update from the tested handler source.

### Release test results

- 243 targeted audit-fix browser checks, including 220 enlarged-text page/language/viewport combinations.
- 294 responsive states across 23 routes and 11 widths.
- 84 public browser, 35 service-menu, 333 gallery/slider and 41 reliability checks.
- 112 mocked admin browser checks, 13 admin unit tests and 49 isolated database checks.
- Standard unit suite plus six new booking-contract tests, including all 276 approved rate-card figures.
- 46 all-page accessibility scans: no remaining contrast or visible-label/name mismatch findings; no broken internal links or duplicate rendered IDs.

The test counts describe local verification. They do not mean the Supabase function has been deployed.
