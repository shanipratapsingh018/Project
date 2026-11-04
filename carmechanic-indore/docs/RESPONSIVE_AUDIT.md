# Website layout audit — 4 November 2026

Release: **2.2.2** · Website: **https://carrepairwala.co.in/**

The seven screenshots in the owner's WhatsApp ZIP were reproduced against the
previous website release. The same shared templates were then checked across
all 22 public pages, the owner login, and the seven authenticated admin sections.

## Issues found and fixed

| ID | Observed problem | Where found | Fix |
| --- | --- | --- | --- |
| R1 | The page stretched sideways, leaving a large empty strip and shrinking the apparent header, text and footer. At a 390px phone viewport, the service document became 636px wide. | All nine service pages below; reproduced at 320px and 390px. | Constrain the article's grid tracks and children to their column. Allow wide tables to scroll inside their own containers. Do not hide document overflow. |
| R2 | Price columns were crowded and later categories, including Luxury, appeared outside the phone screen. At intermediate desktop widths a table could also escape its article column. | All nine service pages; also checked the Services & Prices comparison when expanded. | Add a bounded, labelled, keyboard-focusable horizontal scroll region, a visible scroll hint and more column spacing. Verify that the last category can be reached without moving the page sideways. |
| R3 | Before/after photos enlarged beyond their original resolution; inline comparisons could spill outside the article. | All nine service pages. The gallery uses the same photo components. | Bound comparison widths using the actual image metadata, preserve the whole image, and show both inline panels within the article. Gallery phone swiping remains available. The wider audit also caught and fixed a 640px breakpoint that removed the pair's gap and enlarged each panel slightly. |
| R4 | The fixed bottom actions stretched beyond the visible screen, cropping Call Now and the other buttons. | All nine overflowing service pages on phones. | Fix the underlying page overflow; verify all three actions stay within the real viewport and retain at least 44px touch targets. |
| R5 | A floating WhatsApp button duplicated the WhatsApp action directly underneath it. | All 22 public pages at widths up to 760px. | Use the existing WhatsApp action in the mobile bottom bar. Keep the floating button at larger widths. |
| R6 | The rate-card date split across two lines. | Home, Cost Calculator and all nine service pages: 11 calculator pages, reproduced at 390px. | Render the date as a semantic `time` element and keep the date together. |
| R7 | Service instructions remained in two cramped columns on small phones because an inline style overrode the responsive layout. | All nine service pages. | Use a shared responsive class: one instruction column through 520px, two when there is room. |
| R8 | Previous automated overflow checks compared against `window.innerWidth`, which grows with overflowing content under mobile emulation and could falsely pass the broken page. | Public browser, service, gallery and admin test suites. | Compare against `document.documentElement.clientWidth`; add dedicated checks for article boundaries, open sections, photos and fixed controls. |

## Affected service pages

Every page below had R1, R2, R3, R4 and R7. Each also contains the calculator and
shared mobile controls covered by R5 and R6.

| Page | Path |
| --- | --- |
| General car service | `/car-service-indore.html` |
| Car AC repair | `/car-ac-repair-indore.html` |
| Brake and clutch repair | `/brake-clutch-repair-indore.html` |
| Engine diagnostics | `/engine-diagnostics-indore.html` |
| Suspension and steering | `/suspension-steering-repair-indore.html` |
| Battery and electrical | `/car-battery-electrical-indore.html` |
| Denting and painting | `/denting-painting-indore.html` |
| Car detailing | `/car-detailing-indore.html` |
| Accident repair | `/accident-repair-indore.html` |

Other public pages checked: `/` (`index.html`), `/services.html`, `/estimate.html`,
`/gallery.html`, `/booking.html`, `/reviews.html`, `/pickup-drop.html`, `/about.html`,
`/contact.html`, `/terms.html`, `/privacy.html`, `/policies.html` and the custom 404
page. These receive the shared control and asset updates. They did not reproduce
the service-article overflow in the initial five-width audit.

## Verification

The responsive regression visits all 23 entry routes at **320, 360, 390, 430,
640, 760, 768, 900, 1024, 1280 and 1440px**. It also opens the price comparison,
opens mobile navigation, switches Hindi labels, scrolls tables to the final
category, decodes comparison images and checks the footer above the bottom bar.
Phones use mobile emulation and the real layout viewport width. A local server
serves the custom 404 page so its assets remain local.

Authenticated admin checks cover **Overview, Customers, Bookings, Job cards,
Invoices, Payments and Settings** at **320, 390, 768 and 1366px**, including the
customer, enquiry, job-card and invoice entry dialogs. No additional admin
layout defect was reproduced. All records and API responses are fictional;
production customer data and live bookings are not touched by these checks.

Run from `carmechanic-indore/`:

```sh
npm test
npm run test:admin
npm run test:responsive
npm run test:browser
npm run test:services
npm run test:gallery
npm run test:reliability
python3 tests/admin_test.py
```

Release verification passed: **294 responsive states**, **84 public browser
checks**, **35 service-menu checks**, **333 gallery/slider checks**, **41 recovery
and reliability checks**, **112 mocked admin browser checks** and **13 admin
unit tests**. The standard `npm test` suite also passed, including all 276
approved rate-card figures and estimator, area, form, local-asset, server and
build checks. [Page-by-page responsive results](RESPONSIVE_RESULTS.json) record
each route, viewport and tested state with no reported layout failures.

`test:responsive` writes page-by-page, viewport-by-viewport results to
`/tmp/carrepair-responsive-shots/responsive-results.json` by default. Set `SHOTS`
to choose another output folder. Representative mobile screenshots are saved in
the same folder. Review forms and contact links are inspected without sending
messages; booking tests intercept requests before they can reach production.

## Photo limitation

The existing before/after source JPEGs are only about **269–302 pixels wide**.
CSS now avoids enlarging them beyond their source dimensions. This removes
avoidable stretching but cannot add missing photographic detail. Larger,
original workshop photos would still improve sharpness, especially on high-DPI
phones. No fabricated replacement photos were added.
