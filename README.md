# Car Repair Wala — Your Car. Our Care. · v2.2.2

Website: https://carrepairwala.co.in/

Responsive fixes and affected pages: [4 November audit](carmechanic-indore/docs/RESPONSIVE_AUDIT.md).

DNS, HTTPS and booking/login setup: [custom-domain guide](carmechanic-indore/docs/CUSTOM_DOMAIN.md).

Services & Prices: https://carrepairwala.co.in/services.html?v=2.2.2

The updated website is in **carmechanic-indore/**.
The original Arduino temp.txt is preserved separately.

## Download

- [Current website and source backup](downloads/car-repair-wala-backup-2026-11-04.zip).

- [Previous v2.2.1 hosting ZIP](downloads/car-repair-wala-v2.2.1-hosting.zip) — the current fixes are in the current backup above.
- [Previous v2.2.1 source ZIP](downloads/car-repair-wala-v2.2.1-source.zip).
- [Six AI-generated garage photos](downloads/garagewala-ai-garage-photos.zip) — original PNGs in one ZIP; illustrative scenes, not photos of the actual workshop.
- Or choose **Code → Download ZIP** to download this whole branch.

## Run locally

Node.js 18+ is required. No npm install is needed.

```sh
cd carmechanic-indore
npm start
```

See [website README](carmechanic-indore/README.md) and [Hindi quick start](carmechanic-indore/docs/QUICKSTART-HINDI.md).
Reviews: https://carrepairwala.co.in/reviews.html#write-review

Opening hours: every day, 7:00 AM–11:30 PM IST.
The About page keeps its workshop image; the homepage uses one full-width twenty-photo service slider.
The website review form prepares WhatsApp feedback; the customer must press Send.
Publication consent is optional, and feedback appears publicly only after the garage checks it.

The main **Book Service** form saves requests directly to **Admin → Bookings** through Supabase.
WhatsApp buttons and service-page quick enquiries still require sending a WhatsApp message.
The production URL is configured; rebuilding preserves the custom-domain URLs.

Owner workspace: https://carrepairwala.co.in/admin/?v=2.2.1

Customer vehicles and manual enquiries have searchable brand/model dropdowns: 70 brands,
847 models, year/fuel selection and manual choices for anything missing. Existing saved
vehicles stay editable. [Vehicle entry guide](carmechanic-indore/docs/VEHICLE_DROPDOWNS.md).

The private admin interface, database migrations and booking endpoint are included for customers,
vehicles, bookings, job cards, invoices and manual payment tracking. The public Supabase URL/key are configured.
Login requires the [admin setup](carmechanic-indore/docs/ADMIN_SETUP.md) and an authorised owner account.
The owner completed initial database setup and demonstrated successful deployed-function tests.
Direct booking storage is enabled for the main Book Service form.
No subscription has been purchased, no secret keys are included, and no real customer records are stored in this repository.

Address: **17, AB Rd, Choithram Mandi, Indore, Madhya Pradesh 452012**.
Google location/profile: https://share.google/xKw37sHP3Pm3QmCXr.
The address and location link are used on Home, About, Contact, every public-page footer and business structured data.
The owner supplied the address text; Google sharing hosts could not be opened in this environment.
Reviews from another garage and their rating remain removed; genuine Car Repair Wala feedback is invited instead.
For future invoice addresses, use **Admin → Settings → Use workshop address**, review and save.
[Location maintenance details](carmechanic-indore/docs/GOOGLE_BUSINESS_SETUP.md).

Validation is recorded in [VALIDATION.json](carmechanic-indore/docs/VALIDATION.json).

Service Gallery: https://carrepairwala.co.in/gallery.html?v=2.2.1

The homepage has a twenty-photo service slider beneath the calculator; Previous/Next and mobile swipe are supported. Gallery cards include Call Now.
