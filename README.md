# Garagewala — Your Car. Our Care. · v2.0.1

Live website: https://shanipratapsingh018.github.io/Project/

Services & Prices: https://shanipratapsingh018.github.io/Project/services.html?v=2.0.1

The updated website is in **carmechanic-indore/**.
The original Arduino temp.txt is preserved separately.

## Download

- [Hosting-ready ZIP](downloads/garagewala-v2.0.1-hosting.zip) — on GitHub, click **Download raw**. Extract its contents into your hosting web root.
- [Complete source ZIP](downloads/garagewala-v2.0.1-source.zip) — on GitHub, click **Download raw**.
- [Six AI-generated garage photos](downloads/garagewala-ai-garage-photos.zip) — original PNGs in one ZIP; illustrative scenes, not photos of the actual workshop.
- Or choose **Code → Download ZIP** to download this whole branch.

## Run locally

Node.js 18+ is required. No npm install is needed.

```sh
cd carmechanic-indore
npm start
```

See [website README](carmechanic-indore/README.md) and [Hindi quick start](carmechanic-indore/docs/QUICKSTART-HINDI.md).
Reviews: https://shanipratapsingh018.github.io/Project/reviews.html#write-review

Opening hours: every day, 7:00 AM–11:30 PM IST.
The About page keeps its workshop image; the homepage uses one full-width twenty-photo service slider.
The website review form prepares WhatsApp feedback; the customer must press Send.
Publication consent is optional, and feedback appears publicly only after the garage checks it.

Bookings use WhatsApp by default. The production URL is configured; rebuilding preserves the live GitHub Pages URLs.

Owner workspace: https://shanipratapsingh018.github.io/Project/admin/

The private admin interface, database migrations and booking endpoint are included for customers,
vehicles, bookings, job cards, invoices and manual payment tracking. The public Supabase URL/key are configured.
**Database and owner-account activation are pending**; complete the [admin setup](carmechanic-indore/docs/ADMIN_SETUP.md)
before signing in. A combined SQL Editor setup file is included. Website bookings still use WhatsApp.
No subscription has been purchased, no secret keys are included, and no real customer records are stored in this repository.

Address: Front of Regional Park, Indore. The Google Maps button searches the landmark area;
the owner-supplied Google share link is connected separately for profile access.
Its redirect destination and Google verification could not be checked from this environment. Reviews from another garage and their
rating were removed after the owner's correction. Genuine Garagewala feedback is invited instead.

Validation is recorded in [VALIDATION.json](carmechanic-indore/docs/VALIDATION.json).

Service Gallery: https://shanipratapsingh018.github.io/Project/gallery.html?v=2.0.1

The homepage has a twenty-photo service slider beneath the calculator; Previous/Next and mobile swipe are supported. Gallery cards include Call Now.
