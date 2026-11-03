# Car Repair Wala Google Business location · v2.0.2

The owner supplied this shop listing: https://share.google/xKw37sHP3Pm3QmCXr.
It replaces the earlier sharing link. Google blocks this workspace from opening
sharing URLs, so the address below was copied into the chat by the owner.
This code update does not establish Google's ownership-verification status,
fetch ratings or create a new Google listing.

Workshop address:

**17, AB Rd, Choithram Mandi, Indore, Madhya Pradesh 452012**

Phone: +91 89659 57978. Hours: every day, 7:00 AM–11:30 PM IST.
Website: https://shanipratapsingh018.github.io/Project/

## Website locations

- The full address is in Home → Contact, Contact → Workshop and About → Visit our workshop.
- The footer carries the full address and Google location link on all 22 public pages.
- AutoRepair structured data on all 22 pages includes the supplied street/locality,
  city, region and PIN, and links to the owner's profile with `sameAs`.
- Workshop location buttons use the supplied profile link. The optional Maps-search
  fallback searches the complete address rather than the old landmark.
- Home, Reviews and About Google profile buttons use the same central profile URL.
  They work in the generated HTML and with JavaScript.

Edit `public/assets/js/config.js → business.address` and
`business.googleBusinessProfileUrl`, then run `npm run build`.
The build also writes the small public `workshop-details.js` used by admin Settings.
Do not invent an entrance pin, coordinates or Place ID.

## Billing address

Private invoice settings remain in the owner's Supabase database. To apply this
address to future invoices, sign in → Settings → **Use workshop address**,
review the billing details, check the confirmation box and **Save settings**.
Copying the text does not save automatically. Existing issued invoices retain
the supplier address saved when they were issued. Customer and pickup addresses
are separate records and are not workshop-address fields.

## Google reviews

The Google button follows `business.googleBusinessProfileUrl`. An optional
`reviews.js → googleProfileUrl` can override it. `googleReviewUrl` stays empty
until the owner supplies an actual Google Business Profile **Ask for reviews**
link. Do not treat a location/profile link as a direct review composer, and do not
publish another garage's reviews. Website feedback still uses the WhatsApp
handoff and customer publication permission.

## Brand name update

Website branding is now **Car Repair Wala**. This site update changes the website
labels and search-engine business data. The Google listing's own displayed name
is managed through the owner's Google Business account; its verification status
has not been changed or inferred by this code update.
