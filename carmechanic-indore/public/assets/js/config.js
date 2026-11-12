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
      name: "Car Repair Wala",
      shortName: "Car Repair Wala",
      tagline: "Your Car. Our Care. · Indore",
      city: "Indore",
      timeZone: "Asia/Kolkata",
      state: "Madhya Pradesh",
      country: "IN",
      phoneDisplay: "+91 89659 57978",
      phoneE164: "+918965957978",
      whatsapp: "918965957978",
      email: null,             // e.g. "hello@yourdomain.in" — leave null to hide
      address: { street: "17, AB Rd", locality: "Choithram Mandi", pincode: "452012" }, // full workshop address and PIN supplied by the owner
      geo: null,               // { lat, lng } — only real workshop coordinates
      hours: [{ days: "Mo-Su", label: "Every day (Monday–Sunday)", open: "07:00", close: "23:30" }], // owner-confirmed, India time
      // Preferred-time choices on every form; keep them inside the opening hours above.
      timeSlots: ["Morning (7–12)", "Afternoon (12–4)", "Evening (4–8)", "Night (8–11:30)"],
      siteUrl: "https://carrepairwala.co.in", // primary domain (used for canonical URLs & sitemap)
      googleBusinessProfileUrl: "https://share.google/xKw37sHP3Pm3QmCXr", // owner-supplied shop listing; redirect could not be read from this workspace
      googleMapsSearchUrl: "https://www.google.com/maps/search/?api=1&query=17%2C%20AB%20Rd%2C%20Choithram%20Mandi%2C%20Indore%2C%20Madhya%20Pradesh%20452012", // full-address fallback; listing URL above is preferred
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

    // Car list for the calculator and booking form: [model, car type, flags].
    // Car type sets the price band. Flags: "o" = older / discontinued (listed under "Older models"),
    // "e" = electric (selects Electric fuel), "y" = hybrid (selects Hybrid fuel).
    brands: [
      { id: "maruti", name: "Maruti Suzuki", models: [["Alto K10","hatchback"],["S-Presso","hatchback"],["Wagon R","hatchback"],["Celerio","hatchback"],["Swift","hatchback"],["Baleno","hatchback"],["Ignis","hatchback"],["Dzire","sedan"],["Ciaz","sedan"],["Fronx","suv"],["Brezza","suv"],["Ertiga","suv"],["XL6","suv"],["Grand Vitara","suv"],["Jimny","suv"],["Eeco","hatchback"],["Invicto","suv"],["800","hatchback","o"],["Alto","hatchback","o"],["Alto 800","hatchback","o"],["A-Star","hatchback","o"],["Zen","hatchback","o"],["Zen Estilo","hatchback","o"],["Ritz","hatchback","o"],["Omni","hatchback","o"],["Versa","hatchback","o"],["Wagon R Stingray","hatchback","o"],["Celerio X","hatchback","o"],["Esteem","sedan","o"],["1000","sedan","o"],["Swift Dzire","sedan","o"],["SX4","sedan","o"],["Kizashi","sedan","o"],["Gypsy","suv","o"],["Vitara Brezza","suv","o"],["S-Cross","suv","o"]] },
      { id: "hyundai", name: "Hyundai", models: [["Grand i10 Nios","hatchback"],["i20","hatchback"],["i20 N Line","hatchback"],["Aura","sedan"],["Verna","sedan"],["Exter","suv"],["Venue","suv"],["Venue N Line","suv"],["Creta","suv"],["Creta Electric","suv","e"],["Alcazar","suv"],["Tucson","suv"],["Ioniq 5","suv","e"],["Santro","hatchback","o"],["Santro Xing","hatchback","o"],["Eon","hatchback","o"],["i10","hatchback","o"],["Grand i10","hatchback","o"],["Getz","hatchback","o"],["Elite i20","hatchback","o"],["i20 Active","hatchback","o"],["Xcent","sedan","o"],["Accent","sedan","o"],["Elantra","sedan","o"],["Sonata","sedan","o"],["Santa Fe","suv","o"],["Terracan","suv","o"],["Kona Electric","suv","oe"]] },
      { id: "tata", name: "Tata", models: [["Tiago","hatchback"],["Tiago EV","hatchback","e"],["Altroz","hatchback"],["Tigor","sedan"],["Tigor EV","sedan","e"],["Punch","suv"],["Punch EV","suv","e"],["Nexon","suv"],["Nexon EV","suv","e"],["Curvv","suv"],["Curvv EV","suv","e"],["Harrier","suv"],["Harrier EV","suv","e"],["Safari","suv"],["Sierra","suv"],["Nano","hatchback","o"],["Indica","hatchback","o"],["Indica Vista","hatchback","o"],["Bolt","hatchback","o"],["Indigo","sedan","o"],["Indigo CS","sedan","o"],["Indigo eCS","sedan","o"],["Indigo Marina","sedan","o"],["Manza","sedan","o"],["Zest","sedan","o"],["Sumo","suv","o"],["Sumo Gold","suv","o"],["Sumo Grande","suv","o"],["Safari Dicor","suv","o"],["Safari Storme","suv","o"],["Hexa","suv","o"],["Aria","suv","o"],["Xenon XT","suv","o"]] },
      { id: "mahindra", name: "Mahindra", models: [["XUV 3XO","suv"],["Bolero","suv"],["Bolero Neo","suv"],["Bolero Neo Plus","suv"],["Thar","suv"],["Thar Roxx","suv"],["Scorpio-N","suv"],["Scorpio Classic","suv"],["XUV700","suv"],["XUV400 EV","suv","e"],["BE 6","suv","e"],["XEV 9e","suv","e"],["Scorpio","suv","o"],["XUV500","suv","o"],["XUV300","suv","o"],["TUV300","suv","o"],["TUV300 Plus","suv","o"],["KUV100","hatchback","o"],["NuvoSport","suv","o"],["Marazzo","suv","o"],["Xylo","suv","o"],["Quanto","suv","o"],["Alturas G4","suv","o"],["Logan","sedan","o"],["Verito","sedan","o"],["Verito Vibe","hatchback","o"],["e2o","hatchback","oe"],["eVerito","sedan","oe"]] },
      { id: "toyota", name: "Toyota", models: [["Glanza","hatchback"],["Urban Cruiser Taisor","suv"],["Urban Cruiser Hyryder","suv"],["Rumion","suv"],["Innova Crysta","suv"],["Innova Hycross","suv"],["Fortuner","suv"],["Hilux","suv"],["Camry","luxury"],["Vellfire","luxury"],["Land Cruiser","luxury"],["Etios Liva","hatchback","o"],["Etios Cross","hatchback","o"],["Etios","sedan","o"],["Corolla","sedan","o"],["Corolla Altis","sedan","o"],["Yaris","sedan","o"],["Qualis","suv","o"],["Innova","suv","o"],["Urban Cruiser","suv","o"],["Land Cruiser Prado","luxury","o"],["Prius","luxury","oy"]] },
      { id: "honda", name: "Honda", models: [["Amaze","sedan"],["City","sedan"],["City e:HEV","sedan","y"],["Elevate","suv"],["Brio","hatchback","o"],["Jazz","hatchback","o"],["Civic","sedan","o"],["Accord","luxury","o"],["WR-V","suv","o"],["BR-V","suv","o"],["Mobilio","suv","o"],["CR-V","suv","o"]] },
      { id: "kia", name: "Kia", models: [["Sonet","suv"],["Syros","suv"],["Seltos","suv"],["Carens","suv"],["Carens Clavis","suv"],["Carnival","suv"],["EV6","luxury","e"],["EV9","luxury","e"]] },
      { id: "renault", name: "Renault", models: [["Kwid","hatchback"],["Triber","suv"],["Kiger","suv"],["Pulse","hatchback","o"],["Scala","sedan","o"],["Fluence","sedan","o"],["Logan","sedan","o"],["Duster","suv","o"],["Lodgy","suv","o"],["Captur","suv","o"],["Koleos","suv","o"]] },
      { id: "mg", name: "MG", models: [["Comet EV","hatchback","e"],["Astor","suv"],["ZS EV","suv","e"],["Windsor EV","suv","e"],["Hector","suv"],["Hector Plus","suv"],["Gloster","suv"]] },
      { id: "skoda", name: "Skoda", models: [["Kylaq","suv"],["Slavia","sedan"],["Kushaq","suv"],["Octavia","sedan"],["Superb","luxury"],["Kodiaq","luxury"],["Fabia","hatchback","o"],["Rapid","sedan","o"],["Laura","sedan","o"],["Octavia RS","sedan","o"],["Yeti","suv","o"],["Karoq","suv","o"]] },
      { id: "volkswagen", name: "Volkswagen", models: [["Virtus","sedan"],["Taigun","suv"],["Tiguan","luxury"],["Polo","hatchback","o"],["Cross Polo","hatchback","o"],["Ameo","sedan","o"],["Vento","sedan","o"],["Jetta","sedan","o"],["Passat","luxury","o"],["Tiguan Allspace","luxury","o"],["Beetle","luxury","o"]] },
      { id: "nissan", name: "Nissan", models: [["Magnite","suv"],["X-Trail","suv"],["Micra","hatchback","o"],["Micra Active","hatchback","o"],["Sunny","sedan","o"],["Teana","sedan","o"],["Kicks","suv","o"],["Terrano","suv","o"],["Evalia","suv","o"]] },
      { id: "ford", name: "Ford", models: [["Figo","hatchback","o"],["Freestyle","hatchback","o"],["Fusion","hatchback","o"],["Aspire","sedan","o"],["Figo Aspire","sedan","o"],["Fiesta","sedan","o"],["Fiesta Classic","sedan","o"],["Ikon","sedan","o"],["Classic","sedan","o"],["Escort","sedan","o"],["Mondeo","sedan","o"],["EcoSport","suv","o"],["Endeavour","suv","o"],["Mustang","luxury","o"]] },
      { id: "chevrolet", name: "Chevrolet", models: [["Spark","hatchback","o"],["Beat","hatchback","o"],["Aveo U-VA","hatchback","o"],["Sail U-VA","hatchback","o"],["Aveo","sedan","o"],["Optra","sedan","o"],["Optra Magnum","sedan","o"],["Sail","sedan","o"],["Cruze","sedan","o"],["Enjoy","suv","o"],["Tavera","suv","o"],["Captiva","suv","o"],["Trailblazer","suv","o"],["Forester","suv","o"]] },
      { id: "citroen", name: "Citroën", models: [["C3","hatchback"],["eC3","hatchback","e"],["C3 Aircross","suv"],["Basalt","suv"],["C5 Aircross","suv"]] },
      { id: "jeep", name: "Jeep", models: [["Compass","suv"],["Meridian","suv"],["Wrangler","luxury"],["Grand Cherokee","luxury"]] },
      { id: "byd", name: "BYD", models: [["Atto 3","suv","e"],["Seal","sedan","e"],["Sealion 7","suv","e"],["eMAX 7","suv","e"],["e6","suv","oe"]] },
      { id: "datsun", name: "Datsun", models: [["redi-GO","hatchback","o"],["GO","hatchback","o"],["GO Plus","hatchback","o"]] },
      { id: "fiat", name: "Fiat", models: [["Uno","hatchback","o"],["Palio","hatchback","o"],["Punto","hatchback","o"],["Grande Punto","hatchback","o"],["Punto Evo","hatchback","o"],["Avventura","hatchback","o"],["Urban Cross","hatchback","o"],["500","hatchback","o"],["Siena","sedan","o"],["Petra","sedan","o"],["Linea","sedan","o"]] },
      { id: "force", name: "Force Motors", models: [["Gurkha","suv"],["Gurkha 5 Door","suv"],["Force One","suv","o"],["Trax Cruiser","suv","o"]] },
      { id: "isuzu", name: "Isuzu", models: [["D-Max V-Cross","suv"],["Hi-Lander","suv"],["mu-X","suv"],["MU-7","suv","o"]] },
      { id: "mitsubishi", name: "Mitsubishi", models: [["Lancer","sedan","o"],["Cedia","sedan","o"],["Pajero","suv","o"],["Pajero Sport","suv","o"],["Outlander","suv","o"],["Montero","luxury","o"]] },
      { id: "hindustan", name: "Hindustan Motors", models: [["Ambassador","sedan","o"],["Contessa","sedan","o"]] },
      { id: "premier", name: "Premier", models: [["Padmini","sedan","o"],["Rio","suv","o"]] },
      { id: "audi", name: "Audi", models: [["A4","luxury"],["A6","luxury"],["A8","luxury"],["Q3","luxury"],["Q3 Sportback","luxury"],["Q5","luxury"],["Q7","luxury"],["Q8","luxury"],["e-tron","luxury","e"],["e-tron GT","luxury","e"],["A3","luxury","o"],["Q2","luxury","o"],["TT","luxury","o"]] },
      { id: "bmw", name: "BMW", models: [["2 Series Gran Coupe","luxury"],["3 Series","luxury"],["5 Series","luxury"],["7 Series","luxury"],["X1","luxury"],["X3","luxury"],["X5","luxury"],["X7","luxury"],["Z4","luxury"],["M340i","luxury"],["i4","luxury","e"],["i5","luxury","e"],["i7","luxury","e"],["iX","luxury","e"],["iX1","luxury","e"],["1 Series","luxury","o"],["3 Series Gran Turismo","luxury","o"],["5 Series Gran Turismo","luxury","o"],["6 Series Gran Turismo","luxury","o"],["X2","luxury","o"],["X4","luxury","o"],["X6","luxury","o"]] },
      { id: "jaguar", name: "Jaguar", models: [["F-Pace","luxury"],["I-Pace","luxury","e"],["XE","luxury","o"],["XF","luxury","o"],["XJ","luxury","o"],["E-Pace","luxury","o"],["F-Type","luxury","o"]] },
      { id: "landrover", name: "Land Rover", models: [["Defender","luxury"],["Discovery","luxury"],["Discovery Sport","luxury"],["Range Rover","luxury"],["Range Rover Evoque","luxury"],["Range Rover Sport","luxury"],["Range Rover Velar","luxury"],["Freelander 2","luxury","o"]] },
      { id: "lexus", name: "Lexus", models: [["ES","luxury"],["NX","luxury"],["RX","luxury"],["LX","luxury"],["LM","luxury"]] },
      { id: "mercedes", name: "Mercedes-Benz", models: [["A-Class Limousine","luxury"],["C-Class","luxury"],["E-Class","luxury"],["S-Class","luxury"],["GLA","luxury"],["GLC","luxury"],["GLC Coupe","luxury"],["GLE","luxury"],["GLS","luxury"],["G-Class","luxury"],["EQA","luxury","e"],["EQB","luxury","e"],["EQS","luxury","e"],["Maybach S-Class","luxury"],["A-Class","luxury","o"],["B-Class","luxury","o"],["CLA","luxury","o"],["GLE Coupe","luxury","o"],["ML-Class","luxury","o"],["GL","luxury","o"]] },
      { id: "mini", name: "MINI", models: [["Cooper","luxury"],["Cooper S","luxury"],["Countryman","luxury"],["Cooper SE","luxury","oe"],["Clubman","luxury","o"],["Convertible","luxury","o"]] },
      { id: "porsche", name: "Porsche", models: [["Macan","luxury"],["Cayenne","luxury"],["Cayenne Coupe","luxury"],["Panamera","luxury"],["Taycan","luxury","e"],["911","luxury"]] },
      { id: "volvo", name: "Volvo", models: [["XC40","luxury"],["XC60","luxury"],["XC90","luxury"],["S90","luxury"],["EX30","luxury","e"],["EX40","luxury","e"],["S60","luxury","o"],["S80","luxury","o"],["V40","luxury","o"],["XC40 Recharge","luxury","oe"],["C40 Recharge","luxury","oe"]] },
      { id: "other", name: "Other brand", models: [] }
    ],

    yearRange: { from: 1950 }, // actual manufacture years; to = current year

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
