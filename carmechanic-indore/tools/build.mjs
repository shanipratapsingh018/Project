// Static page generator.  Run:  node tools/build.mjs
// Reads public/assets/js/config.js and writes every HTML page, sitemap.xml and robots.txt into public/.
// Prices, areas, reviews and contact numbers are read at runtime from config.js, so changing
// those does NOT need a rebuild. Re-run this after editing page copy, FAQs, business name or siteUrl.
import { createRequire } from "module";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const C = require(join(ROOT, "assets/js/config.js"));
const PR = require(join(ROOT, "assets/js/pricing.js"));
const PT = require(join(ROOT, "assets/js/price-table.js"));
const RC = require(join(ROOT, "assets/js/rate-card.js"));
const RC_DATE = new Date(RC.version + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const AREAS = require(join(ROOT, "assets/js/service-areas.js"));
const GALLERY = require(join(ROOT, "assets/js/gallery.js"));
const PHOTOS = JSON.parse(readFileSync(join(ROOT, "..", "tools", "photos.json"), "utf8"));
const B = C.business;
const VERSION = "1.6.0";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const svc = Object.fromEntries(C.services.map((s) => [s.id, s]));
const candidateUrl = process.env.SITE_URL || B.siteUrl;
let siteUrl = "";
if (candidateUrl && !/example\.(com|org|net)/i.test(candidateUrl)) {
  const parsed = new URL(candidateUrl);
  if (parsed.protocol !== "https:" || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error("SITE_URL must be a public HTTPS URL without credentials, query or fragment");
  siteUrl = parsed.href.replace(/\/$/, "");
}
const url = (file) => siteUrl ? siteUrl + "/" + (file === "index.html" ? "" : file) : "";

/* ------------------------------ Stock photos (tools/photos.json) ------------------------------ */
// Each <img> tries the local copy (npm run photos), then Unsplash's CDN, then the fallback
// (an illustration) or hides itself. Captions always say it is a stock photo.
const PH_BY = Object.fromEntries(PHOTOS.photos.map((p) => [p.id, p]));
const unsplash = (p, w) => `https://images.unsplash.com/${p.unsplash}?fm=jpg&q=72&w=${w}&fit=max`;
function photo(id, { cls = "", sizes = "(max-width: 900px) 100vw, 50vw", eager = false, fallback = "", credit = true, alt } = {}) {
  const p = PH_BY[id];
  if (!p) throw new Error("Unknown photo " + id);
  const local = (w) => `assets/img/photos/${p.id}-${w}.jpg`;
  if (!existsSync(join(ROOT, local(800))) || !existsSync(join(ROOT, local(1600)))) {
    const samples = {
      "oil-service": "engine-oil-change", "ac-vent": "ac-cleaning-service", "brake-system": "brake-service",
      "engine-inspection": "engine-cleaning-service", "engine-check": "battery-replacement", "under-car": "suspension-repair",
      "panel-sanding": "dent-repair", "polishing": "bumper-scratch-repair", "dashboard-cleaning": "cabin-filter-replacement",
      "foam-wash": "engine-cleaning-service", "accident-damage": "dent-repair"
    };
    const src = samples[id] ? `assets/img/gallery/samples/${samples[id]}-after.jpg` : "assets/img/hero-workshop.svg";
    return `<figure class="photo ${cls}" data-photo-id="${id}"><img src="${src}" alt="Illustrative example: ${esc(p.alt)}" width="1600" height="1067" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><figcaption class="photo-credit">Illustrative example — not our workshop or a customer vehicle.</figcaption></figure>`;
  }
  const img = `<img src="${local(800)}" srcset="${local(800)} 800w, ${local(1600)} 1600w" sizes="${sizes}" alt="${esc(alt || p.alt)}" width="1600" height="1067"` +
    `${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"` +
    
    (fallback ? ` data-fallback="${fallback}"` : "") + ` onerror="cmiImg(this)">`;
  const cap = !credit ? "" : p.own ? "" :
    `<figcaption class="photo-credit">Stock photo · <a href="${p.page}" target="_blank" rel="noopener">${esc(p.photographer)} / Unsplash</a></figcaption>`;
  return `<figure class="photo ${cls}" data-photo-id="${id}">${img}${cap}</figure>`;
}
const IMG_FALLBACK_JS = `<script>function cmiImg(i){var d=i.dataset;if(d.remoteSrc&&!d.r){d.r=1;i.srcset=d.remoteSrcset;i.src=d.remoteSrc;return}if(d.fallback&&!d.f){d.f=1;i.removeAttribute("srcset");i.src=d.fallback;var c=i.closest("figure");if(c){c.classList.add("photo--fallback");var k=c.querySelector(".photo-credit");if(k)k.hidden=true}return}var g=i.closest("figure");if(g)g.hidden=true}</script>`;

/* ------------------------------ Icons ------------------------------ */
const P = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  phone: '<path d="M6.6 3.5 9 3l1.7 4.2-2 1.4a11 11 0 0 0 6.7 6.7l1.4-2L21 15l-.5 2.4A2.4 2.4 0 0 1 18 19.5 15.5 15.5 0 0 1 4.5 6 2.4 2.4 0 0 1 6.6 3.5Z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  service: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3 5.5 5.5"/>',
  oil: '<path d="M12 3s-5 6-5 10a5 5 0 0 0 10 0c0-4-5-10-5-10Z"/><path d="M10 14a2 2 0 0 0 2 2"/>',
  filter: '<path d="M3.5 5h17l-6.5 7.5V19l-4 1.5v-8Z"/>',
  ac: '<path d="M12 2.5v19M4 7l16 10M20 7 4 17"/><path d="m9.5 4 2.5 2 2.5-2M9.5 20l2.5-2 2.5 2"/>',
  brake: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M5.5 6.5A9 9 0 0 1 9 4"/>',
  clutch: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4"/>',
  suspension: '<path d="M8 3h8M8 21h8M12 3v2M12 19v2M8 6l8 2.5L8 11l8 2.5L8 16l8 2.5"/>',
  battery: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 4.5v2.5M17 4.5v2.5M7 13h3M15.5 11.5v3M14 13h3"/>',
  tyre: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5"/>',
  scan: '<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 20h8M12 16v4M7.5 11l2-2.5 2 3 2-4 2.5 3.5"/>',
  bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6Z"/>',
  coolant: '<path d="M12 3.5a2 2 0 0 1 2 2v8.2a4 4 0 1 1-4 0V5.5a2 2 0 0 1 2-2Z"/><path d="M12 9v6"/>',
  gear: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v8M18 8v4H6M12 12v4"/>',
  fuel: '<path d="M4 20.5V5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 14 5v15.5M3 20.5h12M14 10h2.5a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 0 3 0V8.5L18 6M6.5 7.5h5"/>',
  paint: '<rect x="3.5" y="3.5" width="14" height="6" rx="1.5"/><path d="M17.5 6.5h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-8.5v3"/><rect x="9.5" y="14.5" width="3" height="6" rx="1"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/>',
  glass: '<path d="M3.5 17 6 7h12l2.5 10Z"/><path d="m9 10 2.5 3M13 9.5l1.5 2"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"/>',
  check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5l-5.8 5.8a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5-5.4l-2.6 2.6-2.3-.4-.4-2.3Z"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  receipt: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  chat: '<path d="M4 5.5h16v10H9l-5 4Z"/><path d="M8 10h8"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  truck: '<path d="M3 6h11v10H3zM14 9.5h4l3 3.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  home: '<path d="M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>'
};
const WA_PATH = '<path fill="currentColor" stroke="none" d="M12 2.2A9.8 9.8 0 0 0 3.6 17l-1.4 4.8 4.9-1.3A9.8 9.8 0 1 0 12 2.2Zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z"/>';
const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
${Object.entries(P).map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`).join("\n")}
<symbol id="i-wa" viewBox="0 0 24 24">${WA_PATH}</symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8Z"/></symbol></defs></svg>`;
const ic = (n, cls = "") => `<svg viewBox="0 0 24 24" ${cls ? `class="${cls}" ` : ""}aria-hidden="true"><use href="#i-${n}"/></svg>`;

const LOGO = `<img class="brand-logo" src="assets/img/garagewala-logo.png?v=${VERSION}" alt="" width="48" height="48" aria-hidden="true">`;
const WORDMARK = `<span class="brand-copy"><span class="brand-name">Garage<span>wala</span></span><span class="brand-sub">${esc(B.tagline)}</span></span>`;
const FAVICON = `assets/img/garagewala-logo.png?v=${VERSION}`;

/* ------------------------------ Layout ------------------------------ */
const NAV = [
  ["index.html", "Home", "nav.home"],
  ["services.html", "Services & Prices", "nav.services"],
  ["estimate.html", "Cost Calculator", "nav.calc"],
  ["gallery.html", "Before & After", "nav.gallery"],
  ["reviews.html", "Reviews", "nav.reviews"],
  ["about.html", "About Us", "nav.about"],
  ["contact.html", "Contact", "nav.contact"]
];
const BACK_HOME = `<a class="back-home" href="index.html">${'<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"/></svg>'}<span data-i18n="back.home">Back to Home</span></a>`;
function businessLd() {
  const ld = {
    "@context": "https://schema.org", "@type": "AutoRepair", name: B.name, url: url("index.html"),
    telephone: B.phoneE164, areaServed: { "@type": "City", name: B.city },
    address: B.address
      ? { "@type": "PostalAddress", streetAddress: B.address.street, addressLocality: B.city, addressRegion: B.state, postalCode: B.address.pincode, addressCountry: B.country }
      : { "@type": "PostalAddress", addressLocality: B.city, addressRegion: B.state, addressCountry: B.country },
    description: "Multi-brand car servicing, maintenance, diagnostics and repairs in Indore with transparent estimates."
  };
  if (B.geo) ld.geo = { "@type": "GeoCoordinates", latitude: B.geo.lat, longitude: B.geo.lng };
  if (B.hours) ld.openingHours = B.hours.map((h) => `${h.days} ${h.open}-${h.close}`);
  if (B.googleBusinessProfileUrl) ld.sameAs = [B.googleBusinessProfileUrl];
  if (B.email) ld.email = B.email;
  return ld;
}
function faqLd(faqs) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}
function layout({ file, title, desc, body, ld = [], navKey = null }) {
  body = body.replace('<p class="crumbs">', BACK_HOME + '<p class="crumbs">');
  const lds = [businessLd(), ...ld].map((x) => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${siteUrl ? `<link rel="canonical" href="${esc(url(file))}">` : '<meta name="robots" content="noindex,follow">'}
<meta name="theme-color" content="#141619">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${siteUrl ? `<meta property="og:url" content="${esc(url(file))}">` : ""}
<meta property="og:locale" content="en_IN">
<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="assets/css/fonts.css?v=${VERSION}">
<link rel="stylesheet" href="assets/css/style.css?v=${VERSION}">
${file === "404.html" ? `<base href="${siteUrl ? esc(siteUrl) + "/" : "/"}">` : ""}
${IMG_FALLBACK_JS}
${lds}
</head>
<body>
${sprite}
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="${esc(B.name)} home">${LOGO}${WORDMARK}</a>
    <button class="menu-btn" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">${ic("menu")}</button>
    <nav class="nav" id="site-nav" aria-label="Main">${NAV.map(([h, l, k]) => `<a href="${h}" data-i18n="${k}"${navKey === h ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
    <div class="header-actions">
      <button class="lang-toggle" type="button">हिंदी</button>
      <a class="btn btn--sm btn--ghost" href="tel:${B.phoneE164}" data-tel aria-label="Call ${esc(B.phoneDisplay)}">${ic("phone")}</a>
      <a class="btn btn--sm" href="booking.html"${navKey === "booking.html" ? ' aria-current="page"' : ""}>${ic("calendar")}<span data-i18n="nav.book">Book</span></a>
    </div>
  </div>
</header>
${C.pricing.isDemo ? `<div class="demo-ribbon" role="note"><div class="wrap"><strong>PREVIEW</strong><span>Prices and the six reviews on this site are demo placeholders until the workshop confirms them. Before &amp; after images are samples, not customer cars.</span></div></div>` : ""}
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div style="display:grid;gap:14px;align-content:start">
      <a class="brand" href="index.html">${LOGO}${WORDMARK}</a>
      <p>Multi-brand car servicing, diagnostics and repairs in ${esc(B.city)}, ${esc(B.state)}. Estimates are indicative until inspection; extra work only with your approval.</p>
      <p>Call / WhatsApp<br><span class="phone-line" data-phone>${esc(B.phoneDisplay)}</span></p>
      ${B.address ? `<p>${esc(B.address.street)}, ${esc(B.address.locality || "")} ${esc(B.city)} ${esc(B.address.pincode || "")}</p>` : ""}
      ${B.hours ? `<p>${B.hours.map((h) => `${esc(h.days)}: ${esc(h.open)}–${esc(h.close)}`).join("<br>")}</p>` : `<p class="small">Working hours: please call or WhatsApp to confirm.</p>`}
    </div>
    <div><h4>Services</h4><ul>${SERVICE_PAGES.map((p) => `<li><a href="${p.file}">${esc(p.nav)}</a></li>`).join("")}</ul></div>
    <div><h4>Customers</h4><ul><li><a href="index.html">Home</a></li><li><a href="estimate.html">Cost calculator</a></li><li><a href="booking.html">Book a service</a></li><li><a href="gallery.html">Before &amp; after</a></li><li><a href="reviews.html">Reviews</a></li><li><a href="pickup-drop.html">Pickup &amp; drop areas</a></li><li><a href="about.html">About us</a></li><li><a href="contact.html">Contact</a></li><li><a href="index.html#faq">FAQs</a></li></ul></div>
    <div><h4>Policies</h4><ul><li><a href="terms.html">Terms & conditions</a></li><li><a href="privacy.html">Privacy policy</a></li><li><a href="policies.html">Cancellation, pickup & billing</a></li></ul></div>
    <p class="fine">© <span data-year>${new Date().getFullYear()}</span> ${esc(B.name)}. Independent multi-brand garage; not affiliated with any car manufacturer. Brand names are used only to identify vehicles we service.</p>
  </div>
</footer>
<a class="wa-float" data-wa="general" href="https://wa.me/${B.whatsapp}" aria-label="Chat on WhatsApp">${ic("wa")}</a>
<nav class="mbar" aria-label="Quick actions">
  <a href="tel:${B.phoneE164}" data-tel>${ic("phone")}<span data-i18n="cta.call">Call Now</span></a>
  <a class="wa" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}<span>WhatsApp</span></a>
  <a class="book" href="booking.html">${ic("calendar")}<span data-i18n="nav.book">Book Service</span></a>
</nav>
<script src="assets/js/rate-card.js?v=${VERSION}"></script>
<script src="assets/js/config.js?v=${VERSION}"></script>
<script src="assets/js/pricing.js?v=${VERSION}"></script>
<script src="assets/js/price-table.js?v=${VERSION}"></script>
<script src="assets/js/service-areas.js?v=${VERSION}"></script>
<script src="assets/js/area-check.js?v=${VERSION}"></script>
<script src="assets/js/gallery.js?v=${VERSION}"></script>
<script src="assets/js/reviews.js?v=${VERSION}"></script>
<script src="assets/js/forms.js?v=${VERSION}"></script>
<script src="assets/js/app.js?v=${VERSION}"></script>
</body>
</html>
`;
}

/* --------------------------- Shared blocks --------------------------- */
const faqBlock = (faqs, id = "faq") => `<section class="band" id="${id}"><div class="wrap">
  <div class="section-head"><span class="eyebrow">FAQ</span><h2 data-i18n="sec.faq">Frequently asked questions</h2></div>
  <div class="faq">${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>
</div></section>`;
const ctaBand = (title = "Ready to get your car checked?") => `<section class="cta-band"><div class="wrap">
  <h2>${esc(title)}</h2>
  <div class="hero-ctas"><a class="btn" href="booking.html">${ic("calendar")}<span data-i18n="cta.book">Book Your Car Service</span></a><a class="btn btn--wa" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}<span data-i18n="cta.wa">Chat on WhatsApp</span></a></div>
</div></section>`;

/* --------------------------- Service pages --------------------------- */
const SERVICE_PAGES = [
  { file: "car-service-indore.html", stock: "oil-service", photos: ["engine-oil-change", "air-filter-replacement", "engine-cleaning-service"], nav: "Car servicing", ids: ["GS-02", "GS-01", "GS-03", "GS-04", "GS-05", "GS-06", "GS-07", "GS-08", "GS-09", "GS-10", "GS-11"], icon: "service",
    title: "Car Service in Indore — Periodic Servicing for All Brands", h1: "Car servicing in Indore",
    desc: "Periodic car service in Indore for Maruti, Hyundai, Tata, Mahindra, Kia and more. Basic, standard and comprehensive packages with transparent estimates.",
    lead: "Scheduled servicing keeps your car reliable and protects resale value. Pick a basic, standard or comprehensive service, see an estimated price range for your car, and approve the final quote after inspection.",
    body: ["Your manufacturer's service schedule is usually every 10,000 km or 12 months, whichever comes first. City driving in Indore traffic, dusty roads and long AC use can mean your car needs attention sooner.", "Every service starts with a check of fluids, brakes, battery and tyres. If we find anything beyond the package, we tell you the cost before doing it."],
    symptoms: ["Service due on the dashboard or in your service booklet", "Engine sounding rougher than usual", "Lower mileage than normal", "Dark or low engine oil on the dipstick"],
    faqs: [{ q: "Which service level should I choose?", a: "Basic suits a car serviced recently that needs an oil change. Standard is our default periodic service. Comprehensive adds cabin filter, alignment and balancing and suits cars due a major service." }, { q: "Will servicing at an independent garage affect my warranty?", a: "Warranty terms depend on your manufacturer. Check your warranty booklet; we can use genuine parts and record the work on an itemised bill if you need it." }, { q: "How long does a car service take?", a: "Most periodic services take 4 to 6 hours. We confirm the expected time when we book your slot." }] },
  { file: "car-ac-repair-indore.html", stock: "ac-vent", photos: ["ac-cleaning-service", "cabin-filter-replacement"], nav: "Car AC repair", ids: ["AC-03", "AC-01", "AC-02", "AC-04", "AC-05", "AC-06", "AC-07"], icon: "ac",
    title: "Car AC Repair & Service in Indore", h1: "Car AC repair in Indore",
    desc: "Car AC service and repair in Indore: leak test, gas top-up, condenser cleaning and cooling diagnosis for all car brands.",
    lead: "Indore summers are hard on car AC systems. We test for leaks, check pressures, top up refrigerant and clean the condenser so your cabin cools properly again.",
    body: ["A weak AC is often low refrigerant from a small leak, a clogged cabin filter or a dirty condenser. These are usually quick fixes.", "If the compressor, condenser or evaporator needs replacing, we inspect first and send you a quotation before any work."],
    symptoms: ["AC blows warm or takes long to cool", "Musty smell from vents", "Clicking or rattling when the AC is on", "Water dripping inside the cabin"],
    faqs: [{ q: "How often should the car AC be serviced?", a: "Once a year, ideally before summer, is a good habit. Cars driven daily with the AC on may need it sooner." }, { q: "Does a gas top-up fix a leak?", a: "No. A top-up restores cooling for a while, but a leak needs to be found and repaired. We leak-test before topping up." }, { q: "Is compressor replacement included?", a: "No. Compressor and major part replacements are quoted separately after inspection." }] },
  { file: "brake-clutch-repair-indore.html", stock: "brake-system", photos: ["brake-service", "clutch-replacement"], nav: "Brake & clutch", ids: ["BR-02", "BR-01", "BR-03", "BR-04", "BR-05", "BR-06", "CL-01", "CL-02", "CL-03", "CL-04"], icon: "brake",
    title: "Brake & Clutch Repair in Indore", h1: "Brake and clutch repair",
    desc: "Brake pad, brake shoe, brake fluid and clutch replacement in Indore with estimated price ranges and approval before work.",
    lead: "Brakes and clutch wear faster in stop-start city traffic. We inspect, show you the worn parts, and replace them with the parts grade you choose.",
    body: ["Brake pads typically need checking every service. Squealing, grinding or a soft pedal mean they should be checked right away.", "A slipping clutch, hard pedal or burning smell points to clutch wear. Clutch work involves removing the gearbox, so we confirm the full quote first."],
    symptoms: ["Squeal or grinding when braking", "Brake pedal feels soft or goes low", "Car pulls to one side under braking", "Clutch slips, judders or the pedal is hard"],
    faqs: [{ q: "How do I know if my brake pads are worn?", a: "Squealing, grinding, longer stopping distances or a brake warning light. We measure pad thickness during inspection and show you." }, { q: "Do you replace discs too?", a: "Disc skimming or replacement isn't in the brake estimate. If discs are worn we quote them separately." }, { q: "Can you repair automatic transmissions?", a: "Automatic and AMT transmission problems need inspection first. Select transmission repairs in the estimator to request a quote." }] },
  { file: "engine-diagnostics-indore.html", stock: "engine-inspection", photos: ["fuel-injector-cleaning", "engine-cleaning-service"], nav: "Engine diagnostics", ids: ["EN-02", "EN-01", "EN-03", "EN-04", "EN-05", "EN-06", "EN-07", "CL-04"], icon: "scan",
    title: "Engine Diagnostics & Check Engine Light — Indore", h1: "Engine diagnostics in Indore",
    desc: "OBD scanner diagnostics for the check engine light, misfires, overheating and fuel system problems in Indore. Clear fault report before any repair.",
    lead: "A warning light doesn't tell you what's wrong. We scan the ECU, read the fault codes, road-test the car and explain the cause in plain language before quoting a repair.",
    body: ["Diagnosis is priced separately so you know the cause before you spend on parts.", "Common causes include sensor faults, misfires, vacuum leaks, cooling problems and fuel delivery issues. Transmission faults need a hands-on inspection and are quoted afterwards."],
    symptoms: ["Check engine light on or flashing", "Engine misfires, hesitates or stalls", "Temperature gauge rising", "Unusual smoke or fuel smell"],
    faqs: [{ q: "Is it safe to drive with the check engine light on?", a: "If the light is flashing or the temperature is rising, stop and call us. A steady light is less urgent, but get it scanned soon." }, { q: "Does diagnosis include the repair?", a: "No. Diagnosis tells you what's wrong. We then send a quote for the repair, and you decide." }, { q: "Do you diagnose all brands?", a: "We use OBD scanners that read most brands sold in India. Some luxury models may need dealer-level software; we'll tell you upfront." }] },
  { file: "car-battery-electrical-indore.html", stock: "engine-check", photos: ["battery-replacement", "taillight-repair"], nav: "Battery & electrical", ids: ["TB-05", "TB-03", "TB-04", "EL-01", "EL-02", "EL-03", "EL-04"], icon: "battery",
    title: "Car Battery Replacement & Electrical Repair — Indore", h1: "Battery and electrical services",
    desc: "Car battery testing and replacement, wiring, fuse, lights and electrical fault repairs in Indore.",
    lead: "A weak battery or an electrical fault can leave you stranded. We test the battery and charging system, trace wiring faults and fix lights, switches and power windows.",
    body: ["Most car batteries last 3 to 5 years. Slow cranking on winter mornings is often the first sign.", "For electric cars, battery service here means the 12V auxiliary battery. High-voltage traction battery work is not included."],
    symptoms: ["Engine cranks slowly or not at all", "Battery warning light", "Lights flicker or are dim", "Power windows or central locking not working"],
    faqs: [{ q: "Will you test the battery before replacing it?", a: "Yes. We test battery health and the charging system first so you don't replace a good battery." }, { q: "Which battery brands do you fit?", a: "Tell us your preference. The battery brand and warranty from the battery maker are written on your bill." }, { q: "Do you fix EV traction batteries?", a: "No. We handle the 12V auxiliary battery and general electricals on EVs." }] },
  { file: "suspension-steering-repair-indore.html", stock: "under-car", photos: ["suspension-repair", "tyre-replacement"], nav: "Suspension & steering", ids: ["SU-02", "SU-01", "SU-03", "SU-04", "TB-01", "TB-02"], icon: "suspension",
    title: "Suspension, Steering & Wheel Alignment — Indore", h1: "Suspension and steering repair",
    desc: "Shock absorber, suspension link, steering and wheel alignment repairs in Indore with inspection-based quotes.",
    lead: "Potholes and speed breakers take a toll on suspension. We inspect shocks, bushes, links and steering, then align and balance the wheels.",
    body: ["Suspension prices vary widely because it depends on which parts are worn. The estimator shows a range; we confirm after inspection.", "Wheel alignment and balancing after suspension work keeps tyres wearing evenly."],
    symptoms: ["Knocking over bumps", "Car pulls to one side", "Steering wheel vibrates or is off-centre", "Uneven tyre wear"],
    faqs: [{ q: "Why is the suspension range so wide?", a: "It depends on whether a single link, bushes or full shock absorbers need replacing. We show you the worn parts before quoting." }, { q: "Are new tyres included?", a: "No. New tyres are quoted separately by size and brand." }, { q: "How often should I get wheel alignment?", a: "Every 5,000 to 10,000 km, after hitting a deep pothole, or after suspension or steering work." }] },
  { file: "denting-painting-indore.html", stock: "panel-sanding", photos: ["dent-repair", "bumper-scratch-repair", "alloy-wheel-repair"], nav: "Denting & painting", ids: ["BD-01", "BD-02", "BD-03", "BD-04", "BD-05", "BD-06", "BD-07", "BD-08"], icon: "paint",
    title: "Car Denting & Painting in Indore", h1: "Denting and painting",
    desc: "Car dent removal and panel painting in Indore, priced per panel, plus accident repair and windshield replacement quotes.",
    lead: "From parking scrapes to accident damage, we remove dents and colour-match paint panel by panel. Accident repairs are quoted after a damage assessment.",
    body: ["Denting and painting is estimated per panel, such as a door, bumper or fender. Use the estimator to set the number of panels.", "For bigger damage we inspect first and give you a written estimate. If you claim insurance, approval depends on your insurer."],
    symptoms: ["Dents or scratches on panels", "Faded or peeling paint", "Bumper damage after a minor collision", "Cracked windshield"],
    faqs: [{ q: "How long does denting and painting take?", a: "Usually 1 to 2 working days per panel group, depending on drying time and damage. We confirm when you book." }, { q: "Can you help with an insurance claim?", a: "Ask us on WhatsApp before booking. We can share an inspection-based repair estimate; claim approval and payout are decided by your insurer." }, { q: "Is paint colour-matched?", a: "Yes, paint is matched to your car's colour code. Older faded paint may need blending into neighbouring panels." }] },
  { file: "car-detailing-indore.html", stock: "polishing", stockMore: ["foam-wash", "dashboard-cleaning"], photos: ["headlight-restoration", "engine-cleaning-service"], nav: "Car detailing", ids: ["CD-03", "CD-01", "CD-02", "CD-04", "CD-05", "OT-04"], icon: "sparkle",
    title: "Car Wash, Interior Cleaning & Detailing — Indore", h1: "Car detailing and cleaning",
    desc: "Car foam wash, interior deep cleaning and detailing in Indore, plus pre-purchase used car inspection.",
    lead: "A clean cabin makes every drive better. Choose a foam wash, interior deep clean or full detailing. Buying a used car? Book a pre-purchase inspection.",
    body: ["Detailing covers seats, roof lining, dashboard and carpets. Ceramic coating and paint protection film are not included.", "Our pre-purchase inspection checks the engine, body, underbody and electronics, with a road test and a written report."],
    symptoms: ["Stains or odour inside the cabin", "Dull exterior finish", "Preparing a car for sale", "Buying a used car"],
    faqs: [{ q: "How long does interior detailing take?", a: "Between 1 and 5 hours depending on the package and how much cleaning the car needs." }, { q: "Do you do ceramic coating?", a: "Not as part of these packages. Ask on WhatsApp if you need it." }, { q: "What does the pre-purchase inspection cover?", a: "Engine, transmission, body and paint, underbody, electricals, OBD scan and a road test, with a written report." }] }
];
if (C.pages && C.pages.accidentRepair) SERVICE_PAGES.push(
  { file: "accident-repair-indore.html", stock: "accident-damage", photos: ["bumper-scratch-repair", "dent-repair", "taillight-repair"], nav: "Accident repair", ids: ["BD-09", "BD-01", "BD-02", "BD-05", "BD-07", "OT-03"], icon: "shield",
    title: "Car Accident Repair in Indore", h1: "Accident repair in Indore",
    desc: "Car accident damage repair in Indore: inspection, written estimate, bodywork, painting and glass replacement for all car brands.",
    lead: "After an accident, start with an inspection. We assess the damage, give you a written estimate and repair only what you approve.",
    body: ["Accident repairs can't be priced reliably online, so the estimator marks them as inspection required. Denting, painting and glass work can still be estimated per job.", "If you plan to claim insurance, tell us when you book. Claim approval and payout are decided by your insurer."],
    symptoms: ["Crumpled panels or bumper after a collision", "Doors or bonnet not closing properly", "Cracked windscreen or broken lights", "Car pulls to one side after an impact"],
    faqs: [{ q: "Can I drive my car to you after an accident?", a: "Only if it is safe: no fluid leaks, warning lights or steering problems. If unsure, call us before moving the car." }, { q: "How long does accident repair take?", a: "It depends on the damage and parts availability. We give you a time estimate with the quotation after inspection." }, { q: "Do you replace parts or repair them?", a: "Where a panel can be repaired safely we repair it; otherwise we quote a replacement. You approve each item." }] });
// Emergency/breakdown page intentionally not generated: only add it once the workshop confirms it offers emergency repair.

const galItem = (id) => GALLERY.items.find((g) => g.id === id);
function baStatic(it, eager = false) {
  const f = (img, label) => `<figure class="ba-shot"><img src="${img.src}" alt="${esc(img.alt)}" width="${img.width}" height="${img.height}"${eager ? "" : ' loading="lazy"'} decoding="async"><figcaption class="ba-label ba-label--${label.toLowerCase()}">${label}</figcaption></figure>`;
  return `<div class="ba-pair">${f(it.before, "Before")}${f(it.after, "After")}</div>`;
}
function quickBook(svcId, title) {
  return `<div class="side-card" style="position:static">
    <h3>${esc(title)}</h3>
    <p class="small muted">Send your details on WhatsApp. We reply to confirm the slot and quotation — nothing is booked until then.</p>
    <form class="qb" data-quick-book="${svcId}" novalidate>
      <div class="grid-2">
        <div class="field"><label for="qb-name">Name *</label><input id="qb-name" name="name" autocomplete="name" maxlength="60"><p class="err" hidden></p></div>
        <div class="field"><label for="qb-mobile">Mobile *</label><input id="qb-mobile" name="mobile" type="tel" inputmode="tel" autocomplete="tel" placeholder="98765 43210"><p class="err" hidden></p></div>
        <div class="field"><label for="qb-car">Car make, model &amp; year *</label><input id="qb-car" name="car" maxlength="60" placeholder="e.g. Hyundai i20 2019"><p class="err" hidden></p></div>
        <div class="field"><label for="qb-pin">PIN code</label><input id="qb-pin" name="pin" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="452020"><p class="err" hidden></p></div>
        <div class="field"><label for="qb-date">Preferred date</label><input id="qb-date" name="date" type="date"><p class="err" hidden></p></div>
        <div class="field"><label for="qb-time">Preferred time</label><select id="qb-time" name="time"><option value="">Any time</option><option>Morning (9–12)</option><option>Afternoon (12–4)</option><option>Evening (4–7)</option></select></div>
      </div>
      <div class="field"><label for="qb-problem">Problem description</label><textarea id="qb-problem" name="problem" maxlength="400" style="min-height:70px"></textarea></div>
      <div class="check-row"><input type="checkbox" id="qb-pickup" name="pickup" checked><label for="qb-pickup">I need pickup &amp; drop</label></div>
      <button class="btn btn--wa btn--block" type="submit">${ic("wa")}Continue on WhatsApp</button>
      <p class="small muted">Need more options? Use the <a href="booking.html?service=${svcId}">full booking form</a>.</p>
    </form>
    <div data-qb-result style="display:grid;gap:10px"></div>
  </div>`;
}

function servicePage(p) {
  const includes = [...new Set(p.ids.slice(0, 1).flatMap((id) => svc[id].includes || []))];
  const photos = (p.photos || []).map(galItem).filter(Boolean);
  const ld = [
    { "@context": "https://schema.org", "@type": "Service", name: p.h1, serviceType: p.nav, provider: { "@type": "AutoRepair", name: B.name, telephone: B.phoneE164 }, areaServed: { "@type": "City", name: B.city }, description: p.desc },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: url("index.html") }, { "@type": "ListItem", position: 2, name: "Services", item: url("services.html") }, { "@type": "ListItem", position: 3, name: p.nav, item: url(p.file) }] },
    faqLd(p.faqs)
  ];
  const body = `
<section class="page-hero${p.stock ? " page-hero--photo" : ""}"><div class="wrap">
  <div class="page-hero-copy">
  <p class="crumbs"><a href="index.html">Home</a> / <a href="services.html">Services</a> / ${esc(p.nav)}</p>
  <span class="eyebrow">${esc(B.city)} · Multi-brand</span>
  <h1>${esc(p.h1)}</h1>
  <p>${esc(p.lead)}</p>
  <div class="hero-ctas"><a class="btn" href="#estimate">${ic("receipt")}Estimate my cost</a><a class="btn btn--wa" data-wa="${esc(p.nav)}" href="https://wa.me/${B.whatsapp}">${ic("wa")}WhatsApp us</a><a class="btn btn--ghost" href="tel:${B.phoneE164}" data-tel>${ic("phone")}Call ${esc(B.phoneDisplay)}</a></div>
  </div>
  ${p.stock ? photo(p.stock, { cls: "page-hero-photo", eager: true, sizes: "(max-width: 900px) 100vw, 40vw" }) : ""}
</div></section>
<section class="band band--white"><div class="wrap two-col">
  <div class="prose">
    ${p.body.map((t) => `<p>${esc(t)}</p>`).join("")}
    ${p.stockMore ? `<div class="photo-row">${p.stockMore.map((id) => photo(id, { sizes: "(max-width: 900px) 50vw, 30vw" })).join("")}</div>` : ""}
    ${photos.length ? `<figure class="page-photo">${baStatic(photos[0], true)}<figcaption>Before and after: ${esc(photos[0].category.toLowerCase())}. Illustrative example — not an actual customer vehicle. <a href="gallery.html#ba-${photos[0].id}">See the gallery</a>.</figcaption></figure>` : ""}
    <h2>Typical problems &amp; symptoms</h2>
    <ul>${p.symptoms.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    <h2>What's included in ${esc(svc[p.ids[0]].name.toLowerCase())}</h2>
    <ul>${includes.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    <h2>Price list</h2>
    <div data-rate-table="${p.ids.join(",")}">${PT.rateTable(C, PR, p.ids)}${PT.footnote(C)}</div>
    <p><a href="services.html#${svc[p.ids[0]].group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">See the full price list</a></p>
    ${photos.length > 1 ? `<h2>More before &amp; after examples</h2>${photos.slice(1).map((ph) => `<figure class="page-photo">${baStatic(ph)}<figcaption>${esc(ph.category)} — illustrative example, not an actual customer vehicle.</figcaption></figure>`).join("")}` : ""}
    <h2>How it works</h2>
    <ol class="steps" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <li><h3>Get an estimate</h3><p>Choose your car and service to see a price range.</p></li>
      <li><h3>Book a slot</h3><p>Send the details on WhatsApp or the booking form.</p></li>
      <li><h3>Inspection &amp; quote</h3><p>We inspect the car and share a final quotation.</p></li>
      <li><h3>Approve &amp; collect</h3><p>Work starts after your OK. You get an itemised bill.</p></li>
    </ol>
  </div>
  <aside style="display:grid;gap:18px;align-content:start" aria-label="Book ${esc(p.nav.toLowerCase())}">
    ${quickBook(p.ids[0], "Book " + p.nav.toLowerCase())}
  </aside>
</div></section>
<section class="band" id="estimate"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Cost calculator</span><h2>Price your ${esc(p.nav.toLowerCase())}</h2><p>${svc[p.ids[0]].inspectionRequired ? "This job needs an inspection before we can price it — the calculator shows what can be estimated and lets you request a quote." : "Set your car and parts grade to see labour, parts and time."}</p></div>
  <div class="jobcard" data-estimator data-preset="${p.ids[0]}" style="max-width:760px"><noscript><p style="padding:20px">The cost estimator needs JavaScript. Message us on WhatsApp for a quote.</p></noscript></div>
</div></section>
${faqBlock(p.faqs)}
${ctaBand("Book your " + p.nav.toLowerCase() + " in Indore")}`;
  return layout({ file: p.file, title: p.title, desc: p.desc, body, ld, navKey: "services.html" });
}

function areaChecker(id) {
  return `<div class="checker"><h3>Check your PIN code</h3><form data-area-check novalidate><label class="sr-only" for="${id}">PIN code or locality</label><input id="${id}" placeholder="6-digit PIN, e.g. 452020" inputmode="text" autocomplete="postal-code" maxlength="40"><button class="btn" type="submit">Check</button></form><p class="small muted" style="margin:0">You can also type a locality, e.g. Vijay Nagar or Kasturbagram.</p><div data-area-result aria-live="polite"></div></div>`;
}
function reviewsSection(full = false) {
  return `<section class="band band--white" id="reviews"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Reviews</span><h2 data-i18n="sec.reviews">What Our Customers Say</h2></div>
  <p class="notice" data-reviews-notice hidden><strong>Sample content:</strong> the six reviews below are demo testimonials that show how reviews will appear. They are not real customers or Google reviews and will be replaced by verified reviews shared with permission.</p>
  <div class="notice" data-review-summary hidden></div>
  <div class="reviews reviews--six" data-reviews></div>
  <div class="share-box"><div><h3>Serviced your car with us?</h3><p>Tell us how it went. With your permission we'll publish your review here.</p></div>
    <div class="hero-ctas"><a class="btn" data-share-review href="https://wa.me/${B.whatsapp}">${ic("star")}<span data-i18n="cta.share">Share Your Experience</span></a><a class="btn btn--wa" data-feedback-wa href="https://wa.me/${B.whatsapp}">${ic("wa")}Feedback on WhatsApp</a></div></div>
  ${full ? "" : `<p style="margin-top:20px"><a href="reviews.html">More about our reviews →</a></p>`}
</div></section>`;
}

/* ------------------------------ Homepage ------------------------------ */
function homepage() {
  const pk = C.packages.map((k) => {
    const s = svc[k.services[0]];
    return `<article class="card">
      <div class="ico">${ic(s.icon)}</div>
      <h3>${esc(k.title)}</h3>
      <p>${esc(k.blurb)}</p>
      <p class="price" data-pkg="${k.id}"><small>Hatchback · indicative</small>${(() => { const q = PR.quickRange(C, k.services[0], "hatchback"); return q.status === "priced" ? PR.formatRange(q.range) : "Quote after inspection"; })()}</p>
      <div class="actions"><a class="btn btn--sm" href="#estimate" data-pkg-btn="${k.id}">Get estimate</a><a class="btn btn--wa btn--sm" data-wa="${esc(k.title)}" href="https://wa.me/${B.whatsapp}">${ic("wa")}WhatsApp</a></div>
    </article>`;
  }).join("");
  const why = [
    ["receipt", "Transparent estimates", "See a labour and parts breakdown before you book, for your exact car."],
    ["calendar", "Convenient booking", "Book in a minute on WhatsApp or with the online form."],
    ["list", "Multiple repair categories", "Servicing, AC, brakes, clutch, electricals, suspension, body work and detailing."],
    ["truck", "Pickup & drop where available", "Free in listed areas when a slot is available. Check your locality first."],
    ["shield", "Your approval first", "If we find another problem, we tell you the cost and wait for your OK."],
    ["chat", "Clear communication & itemised bills", "Updates on WhatsApp and a bill listing every part and labour charge."]
  ].map(([i, h, t]) => `<div>${ic(i)}<h3>${h}</h3><p>${t}</p></div>`).join("");
  const how = [
    ["Select your car", "Manufacturer, model, year and fuel type."],
    ["Choose your service", "Pick one or more jobs; overlapping work is counted once."],
    ["Get a price range", "See labour, parts, time and what's included."],
    ["Book on WhatsApp or online", "Your details are filled in for you."],
    ["Confirm the final quote", "We inspect the car and share the final quotation."],
    ["Car serviced & returned", "Pay against an itemised bill and drive away."]
  ].map(([h, t]) => `<li><h3>${h}</h3><p>${t}</p></li>`).join("");
  const svcCards = SERVICE_PAGES.map((p) => `<article class="card${p.stock ? " card--photo" : ""}">${p.stock ? photo(p.stock, { cls: "card-photo", credit: false, sizes: "(max-width: 600px) 100vw, (max-width: 960px) 50vw, 380px" }) : ""}<div class="ico">${ic(p.icon)}</div><h3><a href="${p.file}">${esc(p.nav)}</a></h3><p>${esc(p.lead.split(". ")[0])}.</p>${PT.fromPrice(C, PR, p.ids) ? `<p class="price" data-from-price="${p.ids.join(",")}">From ${PT.fromPrice(C, PR, p.ids)}</p>` : ""}<div class="actions"><a class="btn btn--outline btn--sm" href="${p.file}">Details</a><a class="btn btn--wa btn--sm" data-wa="${esc(p.nav)}" href="https://wa.me/${B.whatsapp}">${ic("wa")}WhatsApp</a></div></article>`).join("");

  const body = `
<section class="hero">
  <div class="wrap">
    <div class="hero-copy reveal">
      <span class="eyebrow">Multi-brand garage · ${esc(B.city)}</span>
      <h1 data-i18n="hero.title">Expert Car Service <span>&amp; Repair in Indore</span></h1>
      <p class="hero-sub" data-i18n="hero.sub">Transparent Estimates. Trusted Mechanics. Convenient Pickup &amp; Drop.</p>
      <div class="hero-ctas">
        <a class="btn" href="#estimate">${ic("receipt")}<span data-i18n="cta.calc">Calculate Service Cost</span></a>
        <a class="btn btn--ghost" href="booking.html">${ic("calendar")}<span data-i18n="cta.book">Book Your Car Service</span></a>
      </div>
      <a class="btn btn--wa" style="justify-self:start" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}<span data-i18n="cta.wa">Chat on WhatsApp</span></a>
      <ul class="hero-facts">
        <li>${ic("check")}All major brands</li><li>${ic("receipt")}Itemised bills</li><li>${ic("shield")}Approval before extra work</li>
      </ul>
      <p class="pickup-terms"><strong style="color:#fff">Free pickup &amp; drop</strong> across our ${AREAS.coveredPins.length} confirmed Indore PIN codes, subject to booking confirmation. <a href="pickup-drop.html">Check your PIN</a>.</p>
      ${photo("workshop-hero", { cls: "hero-art", eager: true, sizes: "(max-width: 960px) 0px, 520px", fallback: "assets/img/hero-workshop.svg" })}
    </div>
    <div class="jobcard reveal" id="estimate" data-estimator><noscript><p style="padding:20px">The cost estimator needs JavaScript. Message us on WhatsApp for a quote.</p></noscript></div>
  </div>
</section>

<section class="band" id="packages"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Packages</span><h2 data-i18n="sec.packages">Popular service packages</h2><p>Price ranges below are for a petrol hatchback with standard parts. The calculator adjusts them for your car. <a href="services.html">See the full price list</a>.</p></div>
  <div class="cards">${pk}</div>
</div></section>

<section class="band band--white" id="before-after"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Before &amp; after</span><h2 data-i18n="sec.gallery">${esc(GALLERY.title)}</h2><p>${esc(GALLERY.subtitle)} The examples below are sample images, not photos of our customers' cars.</p></div>
  <div class="ba-grid" data-gallery data-featured data-limit="4"></div>
  <p style="margin-top:24px"><a class="btn btn--outline" href="gallery.html">${ic("image")}See all ${GALLERY.items.filter((g) => g.show !== false).length} transformations</a></p>
</div></section>

<section class="band band--dark"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Why us</span><h2 data-i18n="sec.why">Why choose Garagewala</h2><p>No surprise bills. You see the estimate first, approve the quote, and get every line itemised.</p></div>
  <div class="why">${why}</div>
</div></section>

<section class="band band--white"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Process</span><h2 data-i18n="sec.how">How it works</h2></div>
  <ol class="steps">${how}</ol>
</div></section>

<section class="band" id="services"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Services</span><h2>Everything your car needs</h2><p>See all ${C.services.length} services in the <a href="services.html">services list</a>.</p></div>
  <div class="cards">${svcCards}</div>
</div></section>

${reviewsSection()}

<section class="band band--char" id="areas"><div class="wrap area-wrap">
  <div class="section-head" style="margin:0"><span class="eyebrow">Pickup &amp; drop</span><h2 data-i18n="sec.areas">Service areas</h2><p>Free pickup and drop across these ${AREAS.coveredPins.length} Indore city PIN codes, subject to booking confirmation. Outside them, ask us and we'll check.</p>
    <ul class="area-list" data-area-list></ul>
  </div>
  ${areaChecker("home-area")}
</div></section>

${faqBlock(C.faqs)}

<section class="band band--white" id="contact"><div class="wrap two-col">
  <div class="prose"><span class="eyebrow">Contact</span><h2 style="margin-top:0">Talk to a mechanic</h2>
    <p>Call or WhatsApp <span class="phone-line" style="color:var(--ink)" data-phone>${esc(B.phoneDisplay)}</span></p>
    ${B.address ? `<p>${esc(B.address.street)}, ${esc(B.city)}</p>` : `<p class="muted">Workshop address will be shown here once confirmed. Ask on WhatsApp for directions.</p>`}
    ${B.hours ? "" : `<p class="muted">Working hours: please call or WhatsApp to confirm.</p>`}
  </div>
  <div class="side-card" style="position:static"><a class="btn btn--block" href="tel:${B.phoneE164}" data-tel>${ic("phone")}Call ${esc(B.phoneDisplay)}</a><a class="btn btn--wa btn--block" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}Chat on WhatsApp</a><a class="btn btn--outline btn--block" href="booking.html">${ic("calendar")}Booking form</a></div>
</div></section>
${ctaBand()}`;
  return layout({
    file: "index.html", title: "Car Service & Repair in Indore | Garagewala",
    desc: "Multi-brand car mechanic in Indore. Get an instant car service cost estimate, book on WhatsApp, and pickup & drop in listed areas.",
    body, ld: [faqLd(C.faqs)], navKey: "index.html"
  });
}

/* ------------------------------ Other pages ------------------------------ */
function servicesHub() {
  const groups = [];
  C.services.forEach((x) => { let g = groups.find((y) => y.group === x.group); if (!g) groups.push((g = { group: x.group, cat: x.category, ids: [], icon: x.icon })); g.ids.push(x.id); });
  const offerLd = { "@context": "https://schema.org", "@type": "OfferCatalog", name: `${B.name} price list`,
    itemListElement: C.services.filter((x) => PR.quickRange(C, x.id, "hatchback").status === "priced").map((x) => {
      const q = PR.quickRange(C, x.id, "hatchback");
      return { "@type": "Offer", itemOffered: { "@type": "Service", name: x.name }, priceSpecification: { "@type": "PriceSpecification", priceCurrency: "INR", minPrice: q.range[0], maxPrice: q.range[1] } };
    }) };
  const bundles = C.packages.slice(0, 3).map((p, i) => {
    const id = p.services[0], service = svc[id];
    return `<article class="care-package${i === 1 ? " care-package--featured" : ""}">
      <div class="care-package-top"><span class="package-number">0${i + 1}</span><span class="package-kicker">${i === 1 ? "Recommended" : i === 0 ? "The essentials" : "The full refresh"}</span>${ic(i === 2 ? "shield" : "service")}</div>
      <h3>${esc(p.title.replace("Car ", ""))}</h3><p>${esc(p.blurb)}</p>
      <div class="care-package-price" data-package-range="${id}">${esc(PR.quickRange(C, id, "hatchback").text)}</div>
      <span class="package-car-label" data-package-car>Hatchback · standard parts</span>
      <div class="package-includes">${(service.includes || []).slice(0, 1).map((t) => `<span>${ic("check")}${esc(t)}</span>`).join("")}</div>
      <a class="btn ${i === 1 ? "" : "btn--outline"} btn--block" href="booking.html?service=${id}">Choose this service ${ic("arrow")}</a>
    </article>`;
  }).join("");
  const body = `
<div data-service-explorer>
<section class="services-hero"><div class="wrap services-hero-layout">
  <div class="services-hero-copy"><p class="crumbs"><a href="index.html">Home</a> / Services &amp; prices</p>
    <span class="eyebrow">Garagewala service menu · Indore</span>
    <h1>Good care.<br><span>Clear prices.</span></h1>
    <p>From an oil change to a fresh coat of paint. Find the right care for your car, see the estimate, and approve the quote before we pick up a spanner.</p>
    <div class="hero-ctas"><a class="btn" href="#service-menu">Explore services ${ic("arrow")}</a><a class="services-hero-link" href="estimate.html">Build my estimate ${ic("receipt")}</a></div>
    <div class="service-promises"><span>${ic("check")}Itemised quotes</span><span>${ic("shield")}Your approval first</span><a href="pickup-drop.html">${ic("truck")}Pickup area check</a></div>
  </div>
  <aside class="service-hero-ticket" aria-label="How our pricing works">
    <div class="ticket-top"><span>GOOD TO GO.</span>${ic("wrench")}</div>
    <div class="ticket-art"><img src="assets/img/gallery/samples/engine-oil-change-after.jpg" width="800" height="600" alt="Illustrative example of a clean car engine after an oil service"><span>Illustrative example</span></div>
    <div class="ticket-copy"><span class="eyebrow">A better garage experience</span><h2>Your car.<br>Our kind of work.</h2><div class="ticket-stats"><div><strong>${C.services.length}</strong><span>service options</span></div><div><strong>${C.categories.length}</strong><span>car categories</span></div><div>${ic("receipt")}<span>A quote<br>before repairs</span></div></div></div>
    <div class="ticket-bottom">NICE CAR MECHANIC <span>·</span> GARAGEWALA</div>
  </aside>
</div></section>
<section class="care-section"><div class="wrap"><div class="service-section-heading"><div><span class="eyebrow">Start with the essentials</span><h2>Make maintenance<br>a good habit.</h2></div><p>Three levels of everyday care. Choose your car category below to compare estimates for these packages and every service.</p></div><div class="care-packages">${bundles}</div><p class="package-price-note">Indicative ranges for petrol cars with standard parts. Taxes as per final bill. Final quote after inspection.</p></div></section>
<section class="service-menu-section" id="service-menu"><div class="wrap">
  <div class="service-section-heading"><div><span class="eyebrow">The Garagewala service menu</span><h2>What does your car need?</h2></div><a class="service-inline-link" href="estimate.html">Not sure? Build an estimate ${ic("arrow")}</a></div>
  <div class="service-explorer-tools" data-explorer-tools hidden>
    <div class="service-controls"><div class="service-search-field"><label for="service-search">Find a service</label><div>${ic("scan")}<input id="service-search" type="search" data-services-search placeholder="Try AC, battery, brakes…" maxlength="120" autocomplete="off"></div></div><div class="service-car-field"><label for="service-car">Prices for your car</label><select id="service-car" data-services-car>${C.categories.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join("")}</select></div></div>
    <div class="service-filters" role="group" aria-label="Filter services by category"><button class="on" type="button" data-service-filter="all" aria-pressed="true">All services <span>${C.services.length}</span></button>${groups.map((g) => `<button type="button" data-service-filter="${esc(g.group)}" aria-pressed="false">${ic(g.icon)}${esc(g.group)}</button>`).join("")}</div>
    <p class="service-results" data-service-count role="status" aria-live="polite">Showing all ${C.services.length} services · Hatchback prices</p>
  </div>
  <div class="service-card-grid" data-service-cards>${PT.serviceCards(C, PR)}</div>
  <div class="service-empty" data-services-empty hidden>${ic("wrench")}<h3>No matching service yet.</h3><p>Try another search, clear your filters, or ask us about a custom repair.</p><button class="btn btn--outline btn--sm" type="button" data-clear-services>Show all services</button><a class="service-inline-link" data-wa="Custom car repair" href="https://wa.me/${B.whatsapp}">Ask on WhatsApp ${ic("arrow")}</a></div>
  ${PT.footnote(C)}
  <details class="price-comparison" data-compare-prices><summary><span>${ic("list")}Compare prices across all car categories</span><span class="comparison-plus" aria-hidden="true">+</span></summary><div class="comparison-content"><p class="small muted">Swipe the tables on a small screen. Search and category filters also apply here.</p><div class="price-list" data-price-list>${PT.priceList(C, PR)}</div></div></details>
  <div class="services-quote-band"><div>${ic("chat")}<h3>A strange noise? A warning light?</h3><p>You don’t need to know the repair name. Tell us what’s happening and we’ll help with the next step.</p></div><a class="btn btn--wa" data-wa="Help choosing a car service" href="https://wa.me/${B.whatsapp}">${ic("wa")}Talk to a mechanic</a></div>
</div></section>
</div>${ctaBand()}`;
  return layout({ file: "services.html", title: `Car Services & Prices in Indore | ${B.name}`, desc: "Explore Garagewala car services, compare transparent price ranges, and find the right maintenance or repair for your car in Indore. Nice Car Mechanic.", body, ld: [offerLd], navKey: "services.html" });
}

function bookingPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Book</p><span class="eyebrow">Booking</span><h1>Book your car service</h1><p>Four short steps. Your request is sent to the garage on WhatsApp — the garage receives it when you press Send in WhatsApp. We confirm the slot and final quotation before any work starts.</p></div></section>
<section class="band"><div class="wrap">
  <div class="form-card" data-booking>
    <div class="jobcard-head"><span>Booking request</span><span data-b-count>Step 1 of 4</span></div>
    <div class="steps-bar" aria-hidden="true"><span class="on"></span><span></span><span></span><span></span></div>
    <div class="jobcard-body">
      <div data-b-estimate hidden></div>
      <noscript><p class="notice">This form needs JavaScript. <a href="https://wa.me/${B.whatsapp}">Book on WhatsApp</a> or <a href="tel:${B.phoneE164}">call us</a>.</p></noscript>
      <form novalidate style="display:grid;gap:16px">
        <fieldset data-bstep style="border:0;padding:0;margin:0;display:grid;gap:14px">
          <legend class="step-title"><span class="num">01</span><h3 style="display:inline">Your details</h3></legend>
          <div class="grid-2">
            <div class="field"><label for="b-name">Name *</label><input id="b-name" autocomplete="name" maxlength="60" required><p class="err" hidden></p></div>
            <div class="field"><label for="b-mobile">Mobile number *</label><input id="b-mobile" type="tel" inputmode="tel" autocomplete="tel" placeholder="98765 43210" required><p class="err" hidden></p></div>
          </div>
          <div class="field"><label for="b-contact">Preferred contact method</label><select id="b-contact"><option>WhatsApp</option><option>Phone call</option></select></div>
        </fieldset>
        <fieldset data-bstep hidden style="border:0;padding:0;margin:0;display:grid;gap:14px">
          <legend class="step-title"><span class="num">02</span><h3 style="display:inline">Your car</h3></legend>
          <div class="grid-2">
            <div class="field"><label for="b-brand">Manufacturer *</label><select id="b-brand"></select><p class="err" hidden></p></div>
            <div class="field"><label for="b-model">Model *</label><select id="b-model" disabled></select><input id="b-model-other" hidden aria-label="Car model" maxlength="80" placeholder="Type your model"><p class="err" hidden></p></div>
            <div class="field"><label for="b-year">Year *</label><select id="b-year"></select><p class="err" hidden></p></div>
            <div class="field"><label for="b-fuel">Fuel type *</label><select id="b-fuel"></select><p class="err" hidden></p></div>
          </div>
          <div class="field"><label for="b-reg">Registration number (optional)</label><input id="b-reg" placeholder="MP09 AB 1234" maxlength="14" autocapitalize="characters"><p class="err" hidden></p></div>
        </fieldset>
        <fieldset data-bstep hidden style="border:0;padding:0;margin:0;display:grid;gap:14px">
          <legend class="step-title"><span class="num">03</span><h3 style="display:inline">Services</h3></legend>
          <div class="chips" data-b-services></div><div class="grid-2" data-b-qty hidden></div><p class="err" data-svc-err hidden></p>
          <div class="field"><label for="b-notes">Symptoms or repair notes (optional)</label><textarea id="b-notes" maxlength="600"></textarea></div>
        </fieldset>
        <fieldset data-bstep hidden style="border:0;padding:0;margin:0;display:grid;gap:14px">
          <legend class="step-title"><span class="num">04</span><h3 style="display:inline">Pickup &amp; timing</h3></legend>
          <div class="field"><label for="b-pickup">Pickup &amp; drop</label><select id="b-pickup"><option value="yes">Yes, pick up my car</option><option value="no">No, I'll drop it at the workshop</option></select></div>
          <div class="field" data-addr><label for="b-address">Pickup address *</label><textarea id="b-address" autocomplete="street-address" maxlength="250" style="min-height:70px"></textarea><p class="err" hidden></p></div>
          <div class="grid-3">
            <div class="field" data-addr><label for="b-pin">PIN code *</label><input id="b-pin" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="452020"><p class="err" hidden></p></div>
            <div class="field"><label for="b-date">Preferred date</label><input id="b-date" type="date"><p class="err" hidden></p></div>
            <div class="field"><label for="b-time">Preferred time</label><select id="b-time"><option value="">Any time</option><option>Morning (9–12)</option><option>Afternoon (12–4)</option><option>Evening (4–7)</option></select></div>
          </div>
          <div data-b-pin-result aria-live="polite"></div>
          <p class="small muted">Pickup and drop is free across our confirmed Indore PIN codes, subject to booking confirmation.</p>
        </fieldset>
        <div class="step-nav"><button type="button" class="btn btn--outline btn--sm" data-b-back hidden>Back</button><button type="submit" class="btn" data-b-next style="margin-left:auto"><span>Next</span> ${ic("arrow")}</button></div>
        <p class="small muted">We only ask for what we need to service your car. See our <a href="privacy.html">privacy policy</a>.</p>
      </form>
      <div data-b-result role="status" aria-live="polite"></div>
    </div>
  </div>
</div></section>`;
  return layout({ file: "booking.html", title: "Book a Car Service in Indore | Garagewala", desc: "Book car servicing or repair in Indore online or on WhatsApp. Choose services, pickup and drop, and a preferred time.", body, navKey: "booking.html" });
}

function pickupPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Pickup &amp; drop</p><span class="eyebrow">Doorstep service</span><h1>Car pickup &amp; drop in Indore</h1><p>We collect your car, service it and bring it back. Pickup and drop is free across our confirmed Indore PIN codes, subject to booking confirmation.</p></div></section>
<section class="band band--char"><div class="wrap area-wrap">
  ${areaChecker("pd-area")}
  <div class="section-head" style="margin:0"><h2 style="font-size:2rem">Confirmed PIN codes</h2><ul class="area-list" data-area-list></ul><p class="small" style="color:var(--fog)">Indore city PIN codes from India Post data. Other areas, including the rest of Indore district (Mhow, Sanwer, Depalpur, Hatod), aren't confirmed yet — contact us to check.</p></div>
</div></section>
<section class="band band--white"><div class="wrap prose">
  <h2>How pickup &amp; drop works</h2>
  <ol class="steps" style="grid-template-columns:repeat(2,minmax(0,1fr))">
    <li><h3>Request pickup</h3><p>Book on WhatsApp or the booking form with your address and PIN.</p></li>
    <li><h3>We confirm the slot</h3><p>We tell you the pickup time and whether any charge applies.</p></li>
    <li><h3>Inspection &amp; approval</h3><p>We share the final quotation and wait for your OK.</p></li>
    <li><h3>Car returned</h3><p>We drop the car back with an itemised bill.</p></li>
  </ol>
  <p>Read the full <a href="policies.html">pickup, drop and cancellation policy</a>.</p>
</div></section>${ctaBand("Book a pickup")}`;
  return layout({ file: "pickup-drop.html", title: "Car Pickup & Drop Service in Indore | Garagewala", desc: "Free car pickup and drop for servicing in listed Indore areas. Check your locality or PIN code before you book.", body, navKey: "pickup-drop.html" });
}

function contactPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Contact</p><span class="eyebrow">Contact</span><h1>Contact Garagewala</h1><p>The fastest way to reach us is WhatsApp. Send your car model and the problem, and we'll reply with next steps.</p></div></section>
<section class="band band--white"><div class="wrap two-col">
  <div class="prose">
    <h2 style="margin-top:0">Phone &amp; WhatsApp</h2><p class="phone-line" style="color:var(--ink);font-size:1.4rem" data-phone>${esc(B.phoneDisplay)}</p>
    <h2>Workshop</h2>${B.address ? `<p>${esc(B.address.street)}, ${esc(B.city)} ${esc(B.address.pincode || "")}</p>` : `<p class="placeholder">Please call or WhatsApp for the workshop address and directions before visiting.</p>`}
    <h2>Working hours</h2>${B.hours ? `<p>${B.hours.map((h) => `${esc(h.days)}: ${esc(h.open)}–${esc(h.close)}`).join("<br>")}</p>` : `<p class="placeholder">Please call or WhatsApp to confirm today’s hours and appointment availability.</p>`}
    ${B.email ? `<h2>Email</h2><p>${esc(B.email)}</p>` : ""}
  </div>
  <div class="side-card"><a class="btn btn--block" href="tel:${B.phoneE164}" data-tel>${ic("phone")}Call now</a><a class="btn btn--wa btn--block" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}Chat on WhatsApp</a><a class="btn btn--outline btn--block" href="booking.html">${ic("calendar")}Booking form</a>${B.googleBusinessProfileUrl ? `<a class="btn btn--outline btn--block" href="${esc(B.googleBusinessProfileUrl)}" target="_blank" rel="noopener">${ic("pin")}Google Maps</a>` : ""}</div>
</div></section>`;
  return layout({ file: "contact.html", title: "Contact | Garagewala — Car Mechanic in Indore", desc: "Call or WhatsApp Garagewala for car service, repair quotes and pickup and drop bookings.", body, navKey: "contact.html" });
}

function legalPage(file, title, h1, sections, desc) {
  const body = `<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / ${esc(h1)}</p><h1>${esc(h1)}</h1><p class="small" style="color:var(--fog)">Please confirm service-specific terms with the garage before approving work.</p></div></section>
<section class="band band--white"><div class="wrap legal">${sections.map(([h, t]) => `<h2>${esc(h)}</h2>${t}`).join("")}</div></section>`;
  return layout({ file, title, desc, body });
}
const PH = (t) => `<p>${t}</p>`;
const terms = legalPage("terms.html", "Terms & Conditions | Garagewala", "Terms & conditions", [
  ["Estimates", `<p>Prices shown on this website are indicative ranges for planning only. The final price is given in a quotation after the vehicle is inspected.</p>`],
  ["Approval before work", `<p>We start work only after you approve the quotation. If additional repairs are found, we contact you with the reason and cost, and proceed only with your approval.</p>`],
  ["Bills and parts", `<p>You receive an itemised bill listing labour and each part separately, including the parts grade used. Replaced parts can be shown to you on request.</p>`],
  ["Pickup and drop", `<p>Free pickup and drop applies only in listed service areas and is subject to slot availability. See the <a href="policies.html">pickup, drop and cancellation policy</a>.</p>`],
  ["Warranty", PH("Any applicable parts or workmanship warranty, exclusions and claim procedure will be stated in your quotation or invoice. Please ask before approving work; this website does not promise a fixed warranty period.")],
  ["Payment", PH("Confirm accepted payment methods and when payment is due with the garage before approving work. This website does not collect payments.")],
  ["Liability", PH("Before handover, remove valuables and record the vehicle condition and belongings with the garage. Agree any road-test, custody and handover arrangements before work. Nothing here limits rights available under applicable law.")]
], "Terms and conditions for car service and repair bookings with Garagewala.");
const privacy = legalPage("privacy.html", "Privacy Policy | Garagewala", "Privacy policy", [
  ["What we collect", `<p>When you request an estimate or booking we may collect your name, mobile number, car details, optional registration number, service needs, and pickup address and PIN code if you request pickup. We do not ask for payment card details, ID documents or other sensitive information on this website.</p>`],
  ["How it's used", `<p>Only to contact you about your enquiry, arrange pickup and service, and send your quotation and bill.</p>`],
  ["WhatsApp", `<p>If you use the WhatsApp buttons, your message is sent through WhatsApp and is subject to WhatsApp's own privacy policy.</p>`],
  ["Images", `<p>Images and fonts are served with this website. Stock photos, where used, are credited. External services such as WhatsApp or Google receive connection information when you follow their links.</p>`],
  ["Storage", `<p>The cost estimator runs in your browser. Booking details you send are kept only as long as needed for your service and records.</p>${PH("The estimator temporarily keeps its booking handoff in session storage in this browser tab; closing the tab clears that session. Language preference is saved locally. In the default WhatsApp mode, no booking API is called. If a booking API is enabled, your submitted details are sent to that service; ask the garage about its storage and retention policy.")}`],
  ["Your choices", `<p>Ask us at any time to see or delete the details we hold about you by contacting <span data-phone>${esc(B.phoneDisplay)}</span>.</p>`]
], "How Garagewala handles customer data from estimates and bookings.");
const policies = legalPage("policies.html", "Cancellation, Pickup & Billing Policy | Garagewala", "Cancellation, pickup & billing", [
  ["Indicative estimates", `<p><strong>All estimates are indicative until the car is inspected.</strong> The quotation after inspection is the price you approve.</p>`],
  ["Additional repairs", `<p>If more work is needed, we send the details and cost first. Nothing extra is done without your confirmation.</p>`],
  ["Itemised final bill", `<p>The final bill lists labour, each part, consumables and any taxes separately.</p>`],
  ["Pickup and drop", `<p>Free pickup and drop is available only in listed areas and when a slot is free. Areas marked as needing confirmation may have a charge, which we tell you before pickup.</p>${PH("Confirm the pickup address, time, vehicle handover and any fuel, toll or transport charges with the garage before pickup.")}`],
  ["Cancellation", PH("To cancel or reschedule, call or WhatsApp the garage as early as possible. Confirm any charges for work, diagnosis or transport already authorised before approving that work.")]
], "Cancellation, pickup and drop, additional repair approval and billing policy.");

const notFound = layout({ file: "404.html", title: "Page not found | Garagewala", desc: "Page not found.", body: `<section class="page-hero"><div class="wrap"><h1>Page not found</h1><p>The page you're looking for doesn't exist. Try the cost estimator or message us on WhatsApp.</p><div class="hero-ctas"><a class="btn" href="index.html">Go to homepage</a><a class="btn btn--wa" data-wa="general" href="https://wa.me/${B.whatsapp}">WhatsApp us</a></div></div></section>` });

/* ------------------------------ New pages (v1.1) ------------------------------ */
function estimatePage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Cost calculator</p><span class="eyebrow">Cost calculator</span><h1>Car service cost calculator</h1><p>Choose your car and the work you need to see an estimated price range for labour, parts and time — before you book.</p></div></section>
<section class="band"><div class="wrap two-col">
  <div class="jobcard" id="estimate" data-estimator><noscript><p style="padding:20px">The cost calculator needs JavaScript. Message us on WhatsApp for a quote.</p></noscript></div>
  <aside class="side-card" aria-label="How the estimate works">
    <h3>How the estimate works</h3>
    <ul class="prose" style="padding-left:18px;margin:0;display:grid;gap:8px;font-size:.95rem">
      <li>Prices scale with your car's category, fuel type and the parts grade you choose.</li>
      <li>Overlapping jobs are counted once — for example, an oil change inside a periodic service.</li>
      <li>Accident, gearbox and custom repairs show <strong>Inspection required — request a quote</strong>.</li>
      <li>Pickup and drop is free in our confirmed Indore PIN codes, subject to booking confirmation.</li>
      <li>The final price is the quotation you approve after inspection. You get an itemised bill.</li>
    </ul>
    ${C.pricing.isDemo ? '<p class="notice" style="margin:0"><strong>Demo prices.</strong> The rates in this calculator are sample values until the garage publishes its rate card.</p>' : ""}
    <a class="btn btn--wa btn--block" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}Ask on WhatsApp instead</a>
  </aside>
</div></section>
${ctaBand()}`;
  return layout({ file: "estimate.html", title: "Car Service Cost Calculator Indore | Garagewala", desc: "Estimate your car service or repair cost in Indore. Pick your car and services to see labour, parts and time ranges, then book on WhatsApp.", body, navKey: "estimate.html" });
}

function galleryPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Before &amp; After</p><span class="eyebrow">Gallery</span><h1>${esc(GALLERY.title)}</h1><p>${esc(GALLERY.subtitle)}</p></div></section>
<section class="band"><div class="wrap">
  <p class="notice"><strong>About these images:</strong> every pair below is an illustrative example — not an actual customer vehicle. Photos of real jobs from our workshop will be added here, clearly marked, once available.</p>
  <div class="filters" data-gallery-filters="#ba-all" role="toolbar" aria-label="Filter by category"></div>
  <div class="ba-grid" id="ba-all" data-gallery></div>
</div></section>
${ctaBand("Want a result like this for your car?")}`;
  return layout({ file: "gallery.html", title: "Car Repair Before & After Gallery | Garagewala", desc: "Before and after examples of car dent repair, painting, interior cleaning, headlight restoration, AC service and accident repair in Indore.", body, navKey: "gallery.html" });
}

function reviewsPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Reviews</p><span class="eyebrow">Reviews</span><h1>Customer reviews</h1><p>We publish only genuine reviews from customers who agreed to share them. Until those are in, sample reviews show how this page will look.</p></div></section>
${reviewsSection(true)}
<section class="band"><div class="wrap prose">
  <h2 style="margin-top:0">Our review policy</h2>
  <ul>
    <li>Every published review comes from a real customer and is shown only with their permission.</li>
    <li>We don't edit what customers say, apart from removing phone numbers or other personal details.</li>
    <li>Sample reviews are clearly marked and are removed as soon as genuine reviews are added.</li>
  </ul>
</div></section>`;
  return layout({ file: "reviews.html", title: "Customer Reviews | Garagewala", desc: "Reviews from Garagewala customers and how to share your own feedback on car servicing and repairs.", body, navKey: "reviews.html" });
}

function aboutPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / About us</p><span class="eyebrow">About us</span><h1>About Garagewala</h1><p>A local multi-brand garage in ${esc(B.city)} for servicing, maintenance and repairs, built around clear estimates and your approval at every step.</p></div></section>
<section class="band band--white"><div class="wrap two-col">
  <div class="prose">
    <h2 style="margin-top:0">How we work</h2>
    <p>Car repairs are stressful when you don't know what you're paying for. We show you an estimated range before you book, inspect the car, and send a quotation you approve before any work starts.</p>
    <p>If we find something else during the job, we call or WhatsApp you with the reason and cost first. Your final bill lists labour and every part separately.</p>
    <h2>What we work on</h2>
    <p>Periodic servicing, AC, brakes and clutch, suspension and steering, battery and electrical faults, diagnostics, denting and painting, detailing and pre-purchase inspections — for most car brands sold in India.</p>
    <h2>Talk to us</h2>
    <p>Tell us about your car and the problem you’re facing. We’ll confirm whether we can help, explain the next steps and share a quotation before work starts.</p>
    <h2>Our workshop</h2>
    ${photo("workshop-cars", { sizes: "(max-width: 900px) 100vw, 60vw" })}
    <p>Images on this page are labelled examples. For our workshop location, current opening hours and appointment availability, <a href="contact.html">contact us before visiting</a>.</p>
  </div>
  <div style="display:grid;gap:18px;align-content:start">
    <div class="why" style="grid-template-columns:minmax(0,1fr)">
      <div>${ic("receipt")}<h3>Estimate first</h3><p>See the likely cost before you book.</p></div>
      <div>${ic("shield")}<h3>Your approval</h3><p>No extra work without your OK.</p></div>
      <div>${ic("truck")}<h3>Pickup &amp; drop</h3><p>Free across our confirmed Indore PIN codes, subject to booking confirmation.</p></div>
    </div>
    <a class="btn btn--block" href="booking.html">${ic("calendar")}Book a service</a>
    <a class="btn btn--wa btn--block" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}Chat on WhatsApp</a>
  </div>
</div></section>`;
  return layout({ file: "about.html", title: "About Us | Garagewala — Multi-brand Car Garage", desc: "About Garagewala, a multi-brand car service and repair garage in Indore focused on transparent estimates and customer approval.", body, navKey: "about.html" });
}

/* ------------------------------ Write ------------------------------ */
const pages = {
  "index.html": homepage(), "services.html": servicesHub(), "booking.html": bookingPage(), "pickup-drop.html": pickupPage(),
  "contact.html": contactPage(), "terms.html": terms, "privacy.html": privacy, "policies.html": policies, "404.html": notFound,
  "estimate.html": estimatePage(), "gallery.html": galleryPage(), "reviews.html": reviewsPage(), "about.html": aboutPage()
};
SERVICE_PAGES.forEach((p) => { pages[p.file] = servicePage(p); });
for (const file of ["accident-repair-indore.html", "emergency-car-repair-indore.html"]) {
  if (!pages[file] && existsSync(join(ROOT, file))) unlinkSync(join(ROOT, file));
}
for (const [f, html] of Object.entries(pages)) writeFileSync(join(ROOT, f), html);

const today = new Date().toISOString().slice(0, 10);
const indexable = Object.keys(pages).filter((f) => f !== "404.html");
if (siteUrl) writeFileSync(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((f) => `  <url><loc>${esc(url(f))}</loc><lastmod>${today}</lastmod><priority>${f === "index.html" ? "1.0" : SERVICE_PAGES.some((p) => p.file === f) ? "0.8" : "0.5"}</priority></url>`).join("\n")}
</urlset>
`);
if (!siteUrl && existsSync(join(ROOT, "sitemap.xml"))) unlinkSync(join(ROOT, "sitemap.xml"));
writeFileSync(join(ROOT, "robots.txt"), siteUrl ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n` : "User-agent: *\nDisallow: /\n");
if (!siteUrl) console.log("Preview build: indexing disabled until SITE_URL or business.siteUrl is set to your HTTPS domain.");
console.log("Built " + Object.keys(pages).length + " pages + " + (siteUrl ? "sitemap.xml + " : "") + "robots.txt into public/");
