/* =====================================================================
   CarMechanic Indore — SITE CONFIGURATION (single source of truth)
   ---------------------------------------------------------------------
   Edit this file to change business details, brands/models and FAQs. Service areas, reviews and the gallery have their own
   data files (service-areas.js, reviews.js, gallery.js). No redesign needed.

   Prices live in rate-card.js (approved rate card, 27 Oct 2026).
   ===================================================================== */
(function (root) {
  const RATE_CARD = (typeof module !== "undefined" && module.exports) ? require("./rate-card.js") : root.CMI_RATE_CARD;
  const CONFIG = {
    business: {
      name: "Garagewala",
      shortName: "Garagewala",
      tagline: "Nice Car Mechanic · Indore",
      city: "Indore",
      timeZone: "Asia/Kolkata",
      state: "Madhya Pradesh",
      country: "IN",
      phoneDisplay: "+91 89659 57978",
      phoneE164: "+918965957978",
      whatsapp: "918965957978",
      email: null,             // e.g. "hello@yourdomain.in" — leave null to hide
      address: { street: "Front of Regional Park", locality: null, pincode: null }, // landmark supplied by the owner; exact PIN not supplied
      geo: null,               // { lat, lng } — only real workshop coordinates
      hours: null,             // e.g. [{ days: "Mon–Sat", open: "09:30", close: "19:30" }]
      siteUrl: "https://shanipratapsingh018.github.io/Project", // replace with your domain (used for canonical URLs & sitemap)
      googleBusinessProfileUrl: null, // actual existing Google listing URL only
      googleMapsSearchUrl: "https://www.google.com/maps/search/?api=1&query=Front%20of%20Regional%20Park%2C%20Indore", // landmark search, not a verified business listing
      googleAnalyticsId: null,  // e.g. "G-XXXXXXX"
      bookingTimeoutMs: 15000,  // stop waiting after 15s; WhatsApp fallback remains available
      bookingEndpoint: null     // e.g. "https://api.yourdomain.in/bookings" — null = WhatsApp fallback
    },

    pricing: {
      isDemo: false,           // approved rate card in use (rate-card.js, 27 Oct 2026)
      currency: "INR",
      roundTo: 50,
      // Category factors used when a service in rate-card.js has no factor of its own.
      // luxury: null → luxury cars get "Quote after inspection" unless the service sets a factor.
      defaultFactors: { hatchback: 1.0, sedan: 1.15, suv: 1.35, luxury: null },
      // ASSUMPTIONS (not part of the researched rate card — review):
      // fuel factor on parts for fuel-sensitive jobs (servicing, oil change); petrol = rate card.
      fuelMultiplier: { petrol: 1.0, diesel: 1.12, cng: 1.08, hybrid: 1.15, electric: 1.0, other: 1.05 },
      // parts grade the customer can choose; "standard" = rate card.
      partsGrade: {
        economy:  { label: "Economy (quality aftermarket)", factor: 0.8 },
        standard: { label: "Standard (OES / branded)", factor: 1.0 },
        genuine:  { label: "Genuine OEM", factor: 1.25 }
      },
      // older cars usually need more labour time
      ageRule: { olderThanYears: 10, labourFactor: 1.1 },
      taxes: { enabled: false, label: "GST", rate: 0.18 }, // enable only after the owner confirms GST treatment
      pickup: { freeLabel: "Free pickup & drop", confirmLabel: "Pickup charge to be confirmed", outsideFee: null }
    },

    categories: [
      { id: "hatchback", label: "Hatchback" },
      { id: "sedan", label: "Sedan" },
      { id: "suv", label: "SUV / MUV" },
      { id: "luxury", label: "Luxury" }
    ],

    fuels: [
      { id: "petrol", label: "Petrol" },
      { id: "diesel", label: "Diesel" },
      { id: "cng", label: "CNG" },
      { id: "hybrid", label: "Hybrid" },
      { id: "electric", label: "Electric" },
      { id: "other", label: "Other" }
    ],

    // model: [name, defaultCategory]
    brands: [
      { id: "maruti", name: "Maruti Suzuki", models: [["Alto K10","hatchback"],["S-Presso","hatchback"],["Wagon R","hatchback"],["Celerio","hatchback"],["Swift","hatchback"],["Baleno","hatchback"],["Ignis","hatchback"],["Dzire","sedan"],["Ciaz","sedan"],["Fronx","suv"],["Brezza","suv"],["Ertiga","suv"],["XL6","suv"],["Grand Vitara","suv"],["Jimny","suv"],["Eeco","hatchback"]] },
      { id: "hyundai", name: "Hyundai", models: [["Grand i10 Nios","hatchback"],["i20","hatchback"],["Aura","sedan"],["Verna","sedan"],["Exter","suv"],["Venue","suv"],["Creta","suv"],["Alcazar","suv"],["Tucson","suv"]] },
      { id: "tata", name: "Tata", models: [["Tiago","hatchback"],["Altroz","hatchback"],["Tigor","sedan"],["Punch","suv"],["Nexon","suv"],["Curvv","suv"],["Harrier","suv"],["Safari","suv"]] },
      { id: "mahindra", name: "Mahindra", models: [["XUV 3XO","suv"],["Bolero","suv"],["Bolero Neo","suv"],["Thar","suv"],["Scorpio-N","suv"],["Scorpio Classic","suv"],["XUV700","suv"]] },
      { id: "kia", name: "Kia", models: [["Sonet","suv"],["Seltos","suv"],["Carens","suv"],["Syros","suv"]] },
      { id: "toyota", name: "Toyota", models: [["Glanza","hatchback"],["Urban Cruiser Hyryder","suv"],["Innova Crysta","suv"],["Innova Hycross","suv"],["Fortuner","suv"],["Camry","luxury"]] },
      { id: "honda", name: "Honda", models: [["Amaze","sedan"],["City","sedan"],["Elevate","suv"],["Jazz","hatchback"],["WR-V","suv"]] },
      { id: "renault", name: "Renault", models: [["Kwid","hatchback"],["Triber","suv"],["Kiger","suv"]] },
      { id: "nissan", name: "Nissan", models: [["Magnite","suv"],["Micra","hatchback"],["Sunny","sedan"]] },
      { id: "volkswagen", name: "Volkswagen", models: [["Polo","hatchback"],["Virtus","sedan"],["Vento","sedan"],["Taigun","suv"]] },
      { id: "skoda", name: "Skoda", models: [["Rapid","sedan"],["Slavia","sedan"],["Kushaq","suv"],["Kylaq","suv"],["Octavia","sedan"],["Superb","luxury"],["Kodiaq","luxury"]] },
      { id: "mg", name: "MG", models: [["Comet EV","hatchback"],["Astor","suv"],["ZS EV","suv"],["Windsor EV","suv"],["Hector","suv"],["Gloster","suv"]] },
      { id: "ford", name: "Ford", models: [["Figo","hatchback"],["Aspire","sedan"],["EcoSport","suv"],["Endeavour","suv"]] },
      { id: "bmw", name: "BMW", models: [["3 Series","luxury"],["5 Series","luxury"],["X1","luxury"],["X3","luxury"],["X5","luxury"]] },
      { id: "mercedes", name: "Mercedes-Benz", models: [["A-Class Limousine","luxury"],["C-Class","luxury"],["E-Class","luxury"],["GLA","luxury"],["GLC","luxury"],["GLE","luxury"]] },
      { id: "audi", name: "Audi", models: [["A4","luxury"],["A6","luxury"],["Q3","luxury"],["Q5","luxury"],["Q7","luxury"]] },
      { id: "other", name: "Other brand", models: [] }
    ],

    yearRange: { from: 2005 }, // to = current year (computed)

    /* SERVICES — loaded from rate-card.js (the approved rate card, 27 Oct 2026).
       Edit prices there, not here. */
    services: RATE_CARD.services,

    // Homepage packages (prices computed live from the rate card — hatchback, petrol, standard parts)
    packages: [
      { id: "basic-service", title: "Basic Car Service", services: ["GS-01"], blurb: "Engine oil and filter, fluid top-ups, multi-point check and a wash." },
      { id: "standard-service", title: "Standard Car Service", services: ["GS-02"], blurb: "Adds air filter, brake clean and adjust, battery check, wash and vacuum." },
      { id: "comprehensive-service", title: "Comprehensive Car Service", services: ["GS-03"], blurb: "Adds cabin filter, alignment and balancing, AC vent and interior clean." },
      { id: "ac-service", title: "AC Service", services: ["AC-03"], blurb: "Gas check and top-up, filter, condenser and vent cleaning, cooling test." },
      { id: "brake-service", title: "Brake Service", services: ["BR-02"], blurb: "Front brake pads replaced with caliper clean and lube." },
      { id: "engine-diagnostics", title: "Engine Diagnostics", services: ["EN-02"], blurb: "OBD scan, live data and road test for warning lights." }
    ],

    // Service areas → service-areas.js · Reviews → reviews.js · Before & After → gallery.js

    // Pages for services the owner has confirmed. Set to false to remove the page from the site and sitemap.
    pages: {
      accidentRepair: true,   // listed in the owner's service catalogue
      emergencyRepair: false  // only enable once 24x7 / breakdown help is actually offered
    },

    faqs: [
      { q: "Is the price shown by the calculator final?", a: "No. The calculator gives an estimated range. Your final quotation is shared after a mechanic inspects the car, and no extra work is done without your approval." },
      { q: "Do you service all car brands?", a: "We are a multi-brand garage. Tell us your car's make, model and year on WhatsApp and we will confirm before you book." },
      { q: "Is pickup and drop really free?", a: "Pickup and drop is free within our confirmed Indore service area, subject to booking confirmation. Enter your PIN code on the Pickup & Drop page to check your area." },
      { q: "Can I choose genuine (OEM) parts?", a: "Yes. The estimator lets you compare economy, standard and genuine parts. The parts used are written on your itemised bill." },
      { q: "What if the mechanic finds another problem?", a: "We call or WhatsApp you with the issue and the extra cost first. Work starts only after you approve it." },
      { q: "How do I pay?", a: "Payment terms are shared with your final quotation. You receive an itemised bill listing labour and parts separately." }
    ]
  };

  if (typeof module !== "undefined" && module.exports) module.exports = CONFIG;
  else root.CMI_CONFIG = CONFIG;
})(typeof window !== "undefined" ? window : this);
