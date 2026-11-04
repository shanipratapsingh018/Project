# Local SEO update — release 2.4.0

Website: https://carrepairwala.co.in/

This release improves the website's search metadata, crawlable local information
and page structure. It uses the existing business facts. It does not add ratings,
invent customer reviews, claim new branches, guess coordinates or present
illustrative workshop images as verified photographs of the business.

## Changes

| Area | Improvement |
| --- | --- |
| Search titles and descriptions | Rewrote the 18 main commercial/information-page metadata sets around Car Repair Wala, the relevant service and Indore. Titles/descriptions remain unique across all 21 indexable pages. |
| Local relevance | Every service-page main heading names Indore. The existing Home contact section now describes the Choithram Mandi workshop and links to services and directions. |
| Contextual links | Each of the nine service pages links to two relevant, existing service pages. The links point to real pages rather than new duplicate area pages. |
| Pickup coverage | Home and Pickup & Drop include the confirmed PIN/locality list in the initial HTML. Visitors and crawlers can read it without waiting for JavaScript; unconfirmed PINs are excluded. |
| Sharing previews | Added explicit Open Graph and Twitter metadata with the existing brand logo, accurate image dimensions and absolute HTTPS URLs. A square summary card matches the square brand image. Sharing services may cache older previews. |
| Business identity | Connected AutoRepair, WebSite, WebPage and Service data through stable IDs. Added the brand image/logo, the owner-supplied Maps/profile link, seven-day opening specifications and a catalogue of the nine service categories. |
| Breadcrumbs | Added linked breadcrumb data to the 20 indexable pages below Home. Service pages identify Home → Services → the service. |
| Indexing controls | Preserved clean HTTPS canonical URLs and the 21-page sitemap. The custom 404 page explicitly uses noindex and has no canonical; the private admin stays noindex and excluded from the sitemap. Public pages allow large image previews. |
| Heading structure | Corrected page/section/subsection levels in calculators, booking, footer, gallery and pickup components while retaining their visual styling. |
| Accessibility structure | Corrected the carousel slide role markup and put the desktop floating WhatsApp action in a labelled contact navigation region. Existing keyboard/swipe controls remain available. |
| Loading hints | Preloaded the two shared brand/body fonts and deferred public scripts in their original dependency order. These are loading improvements, not a measured live Core Web Vitals score. |

The logo is the existing approved brand asset. Original photography and precise
GPS coordinates were not newly supplied, so they have not been fabricated.
The primary indexed HTML is English. Hindi remains the same-URL display option;
there are no fictional Hindi URLs or unsupported hreflang links.

## Verification

Recorded results: [SEO_2.4_VALIDATION.json](SEO_2.4_VALIDATION.json).

- Seven dedicated SEO tests check metadata, canonical/indexing rules, bundled
  sharing-image dimensions, factual/connected structured data, breadcrumbs,
  sitemap membership, related links and server-rendered pickup coverage.
- The standard unit suite includes all 276 approved rate-card figures.
- Existing public browser, booking/Hindi/large-text, responsive, services and
  gallery regressions are run against the generated release files.
- The all-page browser scan covers 23 entry routes at phone and desktop widths,
  validates rendered IDs/internal links and runs accessibility checks.

Direct access to the custom domain and Google account data is restricted in
this environment. The exact publishing files are tested locally and deployment
is checked in GitHub Pages. Real search positions, Google-selected snippets and
field Core Web Vitals are not inferred from local tests.

## What the owner can do in Google

1. In [Search Console](https://search.google.com/search-console/), inspect
   `https://carrepairwala.co.in/`, test the live URL and request indexing of the
   updated homepage. You can also inspect your main service pages.
2. Keep the existing successful sitemap entry at
   `https://carrepairwala.co.in/sitemap.xml`. It still contains 21 canonical
   public URLs. It does not need repeated daily submissions.
3. Check that Google Business Profile uses the same business name, phone,
   address, website, map pin and actual opening hours. Genuine customer reviews
   and original workshop photographs can strengthen customer trust.
4. Review Search Console impressions, clicks, queries and selected canonical
   after Google recrawls. Reindexing and structured data do not guarantee a
   particular ranking, Maps placement, rich result or indexing date.

No Supabase function or database deployment is needed for this SEO release.
The owner reported completing the separate 2.3 booking-handler deployment.
