// Static page generator.  Run:  node tools/build.mjs
// Reads public/assets/js/config.js and writes every HTML page, sitemap.xml and robots.txt into public/.
// Prices, areas, reviews and contact numbers are read at runtime from config.js, so changing
// those does NOT need a rebuild. Re-run this after editing page copy, FAQs, business name or siteUrl.
import { createRequire } from "module";
import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { runInNewContext } from "node:vm";
import { createSeo, jsonLd } from "./seo.mjs";

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
const WORKSHOP_PHOTOS = JSON.parse(readFileSync(join(ROOT, "..", "tools", "workshop-photos.json"), "utf8"));
const B = C.business;
const backendContext = { window: {} };
runInNewContext(readFileSync(join(ROOT, "assets/js/backend-config.js"), "utf8"), backendContext, { timeout: 1000 });
const ONLINE_BOOKING = Boolean(B.bookingEndpoint || backendContext.window.GW_BACKEND?.bookingEnabled);
const VERSION = "2.8.2";
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
// One build date (India time) for sitemap lastmod, page dateModified, the visible "Page updated" line and the RSS feed.
const BUILD_DATE = process.env.BUILD_DATE || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(BUILD_DATE)) throw new Error("BUILD_DATE must be YYYY-MM-DD");
const BUILD_LABEL = new Date(BUILD_DATE + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
// Share previews lead with the brand: "Car Repair Wala | Car AC Service, Repair & Gas Filling Indore".
const shareTitle = (t) => { const tag = " | " + B.name, rest = t.replace(tag, ""); return rest.includes(B.name) ? t : B.name + " | " + rest; };

/* ------------------------------ Stock photos (tools/photos.json) ------------------------------ */
// Each <img> tries the local copy (npm run photos), then Unsplash's CDN, then the fallback
// (an illustration) or hides itself. Captions always say it is a stock photo.
const PH_BY = Object.fromEntries(PHOTOS.photos.map((p) => [p.id, p]));
const unsplash = (p, w) => `https://images.unsplash.com/${p.unsplash}?fm=jpg&q=72&w=${w}&fit=max`;
function photo(id, { cls = "", sizes = "(max-width: 900px) 100vw, 50vw", eager = false, fallback = "", credit = true, alt } = {}) {
  const p = PH_BY[id];
  if (!p) throw new Error("Unknown photo " + id);
  if (p.generated) {
    return `<figure class="photo ${cls}" data-photo-id="${id}"><img src="assets/img/photos/car-repair-wala-workshop-800.webp" srcset="assets/img/photos/car-repair-wala-workshop-800.webp 800w, assets/img/photos/car-repair-wala-workshop-1600.webp 1600w" sizes="${sizes}" alt="${esc(p.alt)}" width="1672" height="941" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></figure>`;
  }
  const local = (w) => `assets/img/photos/${p.id}-${w}.jpg`;
  if (!existsSync(join(ROOT, local(800))) || !existsSync(join(ROOT, local(1600)))) {
    const samples = {
      "oil-service": "engine-oil-change", "ac-vent": "ac-cleaning-service", "brake-system": "brake-service",
      "engine-inspection": "engine-cleaning-service", "engine-check": "battery-replacement", "under-car": "suspension-repair",
      "panel-sanding": "dent-repair", "polishing": "bumper-scratch-repair", "dashboard-cleaning": "cabin-filter-replacement",
      "foam-wash": "engine-cleaning-service", "accident-damage": "dent-repair"
    };
    const src = samples[id] ? `assets/img/gallery/samples/${samples[id]}-after.jpg` : "assets/img/hero-workshop.svg";
    return `<figure class="photo ${cls}" data-photo-id="${id}"><img src="${src}" alt="Illustrative example: ${esc(p.alt)}" width="1600" height="1067" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></figure>`;
  }
  const img = `<img src="${local(800)}" srcset="${local(800)} 800w, ${local(1600)} 1600w" sizes="${sizes}" alt="${esc(alt || p.alt)}" width="1600" height="1067"` +
    `${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"` +
    
    (fallback ? ` data-fallback="${fallback}"` : "") + ` onerror="cmiImg(this)">`;
  return `<figure class="photo ${cls}" data-photo-id="${id}">${img}</figure>`;
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
<symbol id="i-insta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.8h.01"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8Z"/></symbol></defs></svg>`;
const ic = (n, cls = "") => `<svg viewBox="0 0 24 24" ${cls ? `class="${cls}" ` : ""}aria-hidden="true"><use href="#i-${n}"/></svg>`;

const LOGO = `<img class="brand-logo" src="assets/img/car-repair-wala-logo.png" alt="" width="48" height="48" aria-hidden="true">`;
const WORDMARK = `<span class="brand-copy"><span class="brand-name">Car Repair <span>Wala</span></span><span class="brand-sub">${esc(B.tagline).replace("Our Care.", '<span class="brand-care">Our Care.</span>')}</span></span>`;
const FAVICON = "assets/img/car-repair-wala-logo.png";

/* ------------------------------ Layout ------------------------------ */
const NAV = [
  ["index.html", "Home", "nav.home", "home"],
  ["services.html", "Services & Prices", "nav.services", "wrench"],
  ["estimate.html", "Cost Calculator", "nav.calc", "receipt"],
  ["gallery.html", "Gallery", "nav.gallery", "image"],
  ["reviews.html", "Reviews", "nav.reviews", "star"],
  ["about.html", "About Us", "nav.about", "info"],
  ["contact.html", "Contact", "nav.contact", "phone"]
];
// Use the owner's exact address everywhere; a Maps search remains a fallback.
const addressText = () => B.address ? [B.address.street, B.address.locality, B.city, [B.state, B.address.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
function mapLink(compact = false) {
  const href = B.googleBusinessProfileUrl || B.googleMapsSearchUrl;
  if (!href) return "";
  const label = B.googleBusinessProfileUrl ? "View workshop on Google" : "Search address on Google Maps";
  return `<a class="${compact ? "" : "btn btn--outline btn--block"}" data-map-link href="${esc(href)}" target="_blank" rel="noopener noreferrer">${compact ? "" : ic("pin")}${label}</a>`;
}
const BACK_HOME = `<a class="back-home" href="index.html">${'<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"/></svg>'}<span data-i18n="back.home">Back to Home</span></a>`;
function faqLd(faqs) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}
function layout({ file, title, desc, body, ld = [], navKey = null }) {
  body = body.replace('<p class="crumbs">', BACK_HOME + '<p class="crumbs">');
  const seo = createSeo({file,title,description:desc,business:B,siteUrl,services:[...SERVICE_PAGES, ...LANDING_PAGES],ld,serviceCount:C.services.length,updated:siteUrl && file !== "404.html" ? BUILD_DATE : ""});
  title = seo.title; desc = seo.description;
  const lds = seo.schemas.map((x) => `<script type="application/ld+json">${jsonLd(x)}</script>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${seo.canonical ? `<link rel="canonical" href="${esc(seo.canonical)}">` : ""}
<meta name="robots" content="${seo.robots}">
<meta name="theme-color" content="#141619">
${B.ownerName ? `<meta name="author" content="${esc(B.ownerName)}">` : ""}
${siteUrl ? `<link rel="alternate" type="application/rss+xml" title="${esc(B.name)} updates" href="${esc(siteUrl)}/feed.xml">` : ""}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(shareTitle(title))}">
<meta property="og:description" content="${esc(desc)}">
${seo.canonical ? `<meta property="og:url" content="${esc(seo.canonical)}">` : ""}
<meta property="og:site_name" content="${esc(B.name)}">
<meta property="og:locale" content="en_IN">
${seo.image ? `<meta property="og:image" content="${esc(seo.image.url)}">
<meta property="og:image:secure_url" content="${esc(seo.image.url)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="${seo.image.width}">
<meta property="og:image:height" content="${seo.image.height}">
<meta property="og:image:alt" content="${esc(seo.image.caption)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(shareTitle(title))}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(seo.image.url)}">
<meta name="twitter:image:alt" content="${esc(seo.image.caption)}">` : ""}
<link rel="icon" href="${FAVICON}">
<link rel="preload" href="assets/fonts/barlow-condensed-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/barlow-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/fonts.css?v=${VERSION}">
<link rel="stylesheet" href="assets/css/style.css?v=${VERSION}">
<link rel="stylesheet" href="assets/css/header.css?v=${VERSION}">
${file === "404.html" ? `<base href="${siteUrl ? esc(siteUrl) + "/" : "/"}">` : ""}
${IMG_FALLBACK_JS}
${lds}
</head>
<body>
${sprite}
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html">${LOGO}${WORDMARK}</a>
    <button class="menu-btn" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">${ic("menu")}<span>Menu</span></button>
    <nav class="nav" id="site-nav" aria-label="Main">${NAV.map(([h, l, k, icon]) => `<a href="${h}" class="nav-button${h === "index.html" ? " nav-home" : ""}"${navKey === h ? ' aria-current="page"' : ""}>${ic(icon)}<span data-i18n="${k}">${l}</span></a>`).join("")}</nav>
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
      <div class="footer-contact">
        <p>Call / WhatsApp<br><a class="phone-line footer-phone" href="tel:${B.phoneE164}" data-tel data-phone>${esc(B.phoneDisplay)}</a></p>
        <div class="footer-cta"><a class="btn btn--sm" href="tel:${B.phoneE164}" data-tel>${ic("phone")}<span>Call now</span></a><a class="btn btn--sm btn--wa" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}<span>WhatsApp us</span></a></div>
      </div>
      ${B.address ? `<p data-workshop-address>${esc(addressText())}</p>${footerDirections()}` : ""}
      ${instaLink("footer-directions")}
      ${B.hours ? `<p class="footer-hours">${footerHours()} <span class="open-status" data-open-status hidden></span></p>` : `<p class="small">Working hours: please call or WhatsApp to confirm.</p>`}
      <p class="footer-lang"><span>Language</span> <button class="lang-toggle" type="button">हिंदी</button></p>
    </div>
    <div><h2 class="footer-title">Services</h2><ul>${[...SERVICE_PAGES, ...LANDING_PAGES].map((p) => `<li><a href="${p.file}">${esc(p.nav)}</a></li>`).join("")}</ul></div>
    <div><h2 class="footer-title">Customers</h2><ul><li><a href="index.html">Home</a></li><li><a href="estimate.html">Cost calculator</a></li><li><a href="booking.html">Book online</a></li><li><a href="gallery.html">Gallery</a></li><li><a href="reviews.html">Reviews</a></li><li><a href="./about.html">About us</a></li><li><a href="contact.html">Contact</a></li></ul></div>
    <div><h2 class="footer-title">Help &amp; policies</h2><ul><li><a href="index.html#faq">FAQs</a></li><li><a href="pickup-drop.html">Pickup &amp; drop areas</a></li><li><a href="terms.html">Terms & conditions</a></li><li><a href="privacy.html">Privacy policy</a></li><li><a href="policies.html">Cancellation, pickup & billing</a></li><li><a href="admin/index.html">Owner login</a></li></ul></div>
    ${B.ownerName || siteUrl ? `<p class="fine footer-owner">${B.ownerName ? `<span>Owner: ${esc(B.ownerName)}</span>` : ""}${B.ownerName && siteUrl ? " · " : ""}${siteUrl ? `<span>Page updated</span> <time datetime="${BUILD_DATE}">${BUILD_LABEL}</time>` : ""}</p>` : ""}
    <p class="fine">© <span data-year>${new Date().getFullYear()}</span> ${esc(B.name)}. Independent multi-brand garage; not affiliated with any car manufacturer. Brand names are used only to identify vehicles we service.</p>
  </div>
</footer>
<nav class="desktop-contact" aria-label="Contact options"><a class="wa-float" data-wa="general" href="https://wa.me/${B.whatsapp}" aria-label="Chat on WhatsApp">${ic("wa")}</a></nav>
<nav class="mbar" aria-label="Quick actions">
  <a href="tel:${B.phoneE164}" data-tel>${ic("phone")}<span data-i18n="cta.call">Call Now</span></a>
  <a class="wa" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}<span>WhatsApp</span></a>
  <a class="book" href="booking.html">${ic("calendar")}<span data-i18n="nav.book">Book now</span></a>
</nav>
<script defer src="assets/js/rate-card.js?v=${VERSION}"></script>
<script defer src="assets/js/config.js?v=${VERSION}"></script>
<script defer src="assets/js/backend-config.js?v=${VERSION}"></script>
<script defer src="assets/js/booking-backend.js?v=${VERSION}"></script>
<script defer src="assets/js/pricing.js?v=${VERSION}"></script>
<script defer src="assets/js/price-table.js?v=${VERSION}"></script>
<script defer src="assets/js/service-areas.js?v=${VERSION}"></script>
<script defer src="assets/js/area-check.js?v=${VERSION}"></script>
<script defer src="assets/js/gallery.js?v=${VERSION}"></script>
<script defer src="assets/js/reviews.js?v=${VERSION}"></script>
<script defer src="assets/js/forms.js?v=${VERSION}"></script>
<script defer src="assets/js/hi.js?v=${VERSION}"></script>
<script defer src="assets/js/i18n.js?v=${VERSION}"></script>
<script defer src="assets/js/app.js?v=${VERSION}"></script>
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
  <div class="hero-ctas"><a class="btn" href="booking.html">${ic("calendar")}<span data-i18n="cta.book">Book now</span></a><a class="btn btn--wa" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}<span data-i18n="cta.wa">Chat on WhatsApp</span></a></div>
</div></section>`;

/* --------------------------- Service pages --------------------------- */
const SERVICE_PAGES = [
  { file: "car-service-indore.html", stock: "oil-service", photos: ["engine-oil-change", "air-filter-replacement", "engine-cleaning-service"], nav: "Car servicing", ids: ["GS-02", "GS-01", "GS-03", "GS-04", "GS-05", "GS-06", "GS-07", "GS-08", "GS-09", "GS-10", "GS-11"], icon: "service",
    title: "Car Service in Indore — Periodic Servicing for All Brands", h1: "Periodic car service in Indore",
    desc: "Periodic car service in Indore for Maruti, Hyundai, Tata, Mahindra, Kia and more. Basic, standard and comprehensive packages with transparent estimates.",
    lead: "Scheduled servicing keeps your car reliable and protects resale value. Pick a basic, standard or comprehensive service, see an estimated price range for your car, and approve the final quote after inspection.",
    body: ["Your manufacturer's service schedule is usually every 10,000 km or 12 months, whichever comes first. City driving in Indore traffic, dusty roads and long AC use can mean your car needs attention sooner.", "Every service starts with a check of fluids, brakes, battery and tyres. If we find anything beyond the package, we tell you the cost before doing it."],
    symptoms: ["Service due on the dashboard or in your service booklet", "Engine sounding rougher than usual", "Lower mileage than normal", "Dark or low engine oil on the dipstick"],
    faqs: [{ q: "Which service level should I choose?", a: "Basic suits a car serviced recently that needs an oil change. Standard is our default periodic service. Comprehensive adds cabin filter, alignment and balancing and suits cars due a major service." }, { q: "Will servicing at an independent garage affect my warranty?", a: "Warranty terms depend on your manufacturer. Check your warranty booklet; we can use genuine parts and record the work on an itemised bill if you need it." }, { q: "How long does a car service take?", a: "Most periodic services take 4 to 6 hours. We confirm the expected time when we book your slot." }] },
  { file: "car-ac-repair-indore.html", stock: "ac-vent", photos: ["ac-cleaning-service", "cabin-filter-replacement"], nav: "Car AC repair", ids: ["AC-03", "AC-01", "AC-02", "AC-04", "AC-05", "AC-06", "AC-07"], icon: "ac",
    title: "Car AC Repair & Service in Indore", h1: "Car AC service, repair and gas filling in Indore",
    desc: "Car AC service, repair and gas filling in Indore: leak test, gas refill, condenser cleaning and cooling diagnosis for all car brands.",
    lead: "Indore summers are hard on car AC systems. We test for leaks, check pressures, top up refrigerant and clean the condenser so your cabin cools properly again.",
    body: ["A weak AC is often low refrigerant from a small leak, a clogged cabin filter or a dirty condenser. These are usually quick fixes.", "If the compressor, condenser or evaporator needs replacing, we inspect first and send you a quotation before any work."],
    symptoms: ["AC blows warm or takes long to cool", "Musty smell from vents", "Clicking or rattling when the AC is on", "Water dripping inside the cabin"],
    faqs: [{ q: "How often should the car AC be serviced?", a: "Once a year, ideally before summer, is a good habit. Cars driven daily with the AC on may need it sooner." }, { q: "Does a gas top-up fix a leak?", a: "No. A top-up restores cooling for a while, but a leak needs to be found and repaired. We leak-test before topping up." }, { q: "Is compressor replacement included?", a: "No. Compressor and major part replacements are quoted separately after inspection." }] },
  { file: "brake-clutch-repair-indore.html", stock: "brake-system", photos: ["brake-service", "clutch-replacement"], nav: "Brake & clutch", ids: ["BR-02", "BR-01", "BR-03", "BR-04", "BR-05", "BR-06", "CL-01", "CL-02", "CL-03", "CL-04"], icon: "brake",
    title: "Brake & Clutch Repair in Indore", h1: "Car brake repair and clutch plate replacement",
    desc: "Car brake pad, brake shoe, brake fluid and clutch plate replacement in Indore with estimated price ranges and approval before work.",
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
    title: "Car Battery Replacement & Electrical Repair — Indore", h1: "Car battery replacement and electrical repair",
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
    title: "Car Denting & Painting in Indore", h1: "Car denting, painting and scratch removal",
    desc: "Car dent repair, scratch removal and panel painting in Indore, priced per panel, plus accident repair and windshield replacement quotes.",
    lead: "From parking scrapes to accident damage, we remove dents and colour-match paint panel by panel. Accident repairs are quoted after a damage assessment.",
    body: ["Denting and painting is estimated per panel, such as a door, bumper or fender. Use the estimator to set the number of panels.", "For bigger damage we inspect first and give you a written estimate. If you claim insurance, approval depends on your insurer."],
    symptoms: ["Dents or scratches on panels", "Faded or peeling paint", "Bumper damage after a minor collision", "Cracked windshield"],
    faqs: [{ q: "How long does denting and painting take?", a: "Usually 1 to 2 working days per panel group, depending on drying time and damage. We confirm when you book." }, { q: "Can you help with an insurance claim?", a: "Ask us on WhatsApp before booking. We can share an inspection-based repair estimate; claim approval and payout are decided by your insurer." }, { q: "Is paint colour-matched?", a: "Yes, paint is matched to your car's colour code. Older faded paint may need blending into neighbouring panels." }] },
  { file: "car-detailing-indore.html", stock: "polishing", stockMore: ["foam-wash", "dashboard-cleaning"], photos: ["headlight-restoration", "engine-cleaning-service"], nav: "Car detailing", ids: ["CD-03", "CD-01", "CD-02", "CD-04", "CD-05", "OT-04"], icon: "sparkle",
    title: "Car Detailing & Interior Cleaning — Indore", h1: "Car detailing and interior cleaning",
    desc: "Car interior deep cleaning, rubbing and polishing in Indore, plus pre-purchase used car inspection.",
    lead: "A clean cabin makes every drive better. Choose an interior deep clean, rubbing and polishing or full detailing. Need only a quick foam wash? See our car wash page. Buying a used car? Book a pre-purchase inspection.",
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
  const photoWidth = Math.min(it.before.width || 600, it.after.width || 600);
  const f = (img, label) => `<figure class="ba-shot"><img src="${img.src}" alt="${esc(img.alt)}" width="${img.width}" height="${img.height}"${eager ? "" : ' loading="lazy"'} decoding="async"><figcaption class="ba-label ba-label--${label.toLowerCase()}">${label}</figcaption></figure>`;
  return `<div class="ba-pair" style="--photo-width:${photoWidth}px;--comparison-width:${photoWidth * 2 + 8}px">${f(it.before, "Before")}${f(it.after, "After")}</div>`;
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
        <div class="field"><label for="qb-time">Preferred time</label><select id="qb-time" name="time"><option value="">Any time</option>${timeOptions()}</select></div>
      </div>
      <div class="field"><label for="qb-problem">Problem description</label><textarea id="qb-problem" name="problem" maxlength="400" style="min-height:70px"></textarea></div>
      <div class="check-row"><input type="checkbox" id="qb-pickup" name="pickup" checked><label for="qb-pickup">I need pickup &amp; drop</label></div>
      <button class="btn btn--wa btn--block" type="submit">${ic("wa")}Continue on WhatsApp</button>
      <p class="small muted">Need more options? Use the <a href="booking.html?service=${svcId}">full booking form</a>.</p>
    </form>
    <div data-qb-result style="display:grid;gap:10px"></div>
  </div>`;
}

const RELATED_SERVICES = {
  'car-service-indore.html':['car-ac-repair-indore.html','engine-diagnostics-indore.html'],
  'car-ac-repair-indore.html':['car-service-indore.html','car-battery-electrical-indore.html'],
  'brake-clutch-repair-indore.html':['suspension-steering-repair-indore.html','car-service-indore.html'],
  'engine-diagnostics-indore.html':['car-battery-electrical-indore.html','car-service-indore.html'],
  'car-battery-electrical-indore.html':['engine-diagnostics-indore.html','car-ac-repair-indore.html'],
  'suspension-steering-repair-indore.html':['brake-clutch-repair-indore.html','car-service-indore.html'],
  'denting-painting-indore.html':['accident-repair-indore.html','car-detailing-indore.html'],
  'car-detailing-indore.html':['car-wash-indore.html','denting-painting-indore.html','car-service-indore.html'],
  'accident-repair-indore.html':['denting-painting-indore.html','suspension-steering-repair-indore.html']
};
const lc = (t) => t.toLowerCase().replace(/\bac\b/g, "AC");
const findPage = (file) => SERVICE_PAGES.find((page) => page.file === file) || LANDING_PAGES.find((page) => page.file === file);
function servicePage(p) {
  const includes = [...new Set(p.ids.slice(0, 1).flatMap((id) => svc[id].includes || []))];
  const photos = (p.photos || []).map(galItem).filter(Boolean);
  const heading = p.h1.includes(B.city) ? p.h1 : p.h1 + " in " + B.city;
  const related = (RELATED_SERVICES[p.file] || []).map(findPage).filter(Boolean);
  const ld = [
    { "@context": "https://schema.org", "@type": "Service", name: heading, serviceType: p.nav, provider: { "@type": "AutoRepair", name: B.name, telephone: B.phoneE164 }, areaServed: { "@type": "City", name: B.city }, description: p.desc },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: url("index.html") }, { "@type": "ListItem", position: 2, name: "Services", item: url("services.html") }, { "@type": "ListItem", position: 3, name: p.nav, item: url(p.file) }] },
    faqLd(p.faqs)
  ];
  const body = `
<section class="page-hero${p.stock ? " page-hero--photo" : ""}"><div class="wrap">
  <div class="page-hero-copy">
  <p class="crumbs"><a href="index.html">Home</a> / <a href="services.html">Services</a> / ${esc(p.nav)}</p>
  <span class="eyebrow">${esc(B.city)} · Multi-brand</span>
  <h1>${esc(heading)}</h1>
  <p>${esc(p.lead)}</p>
  <div class="hero-ctas"><a class="btn" href="#estimate">${ic("receipt")}Estimate my cost</a><a class="btn btn--wa" data-wa="${esc(p.nav)}" href="https://wa.me/${B.whatsapp}">${ic("wa")}WhatsApp us</a><a class="btn btn--ghost" href="tel:${B.phoneE164}" data-tel>${ic("phone")}Call ${esc(B.phoneDisplay)}</a></div>
  </div>
  ${p.stock ? photo(p.stock, { cls: "page-hero-photo", eager: true, sizes: "(max-width: 900px) 100vw, 40vw" }) : ""}
</div></section>
<section class="band band--white"><div class="wrap two-col">
  <div class="prose">
    ${p.body.map((t) => `<p>${esc(t)}</p>`).join("")}
    ${p.stockMore ? `<div class="photo-row">${p.stockMore.map((id) => photo(id, { sizes: "(max-width: 900px) 50vw, 30vw" })).join("")}</div>` : ""}
    ${photos.length ? `<figure class="page-photo">${baStatic(photos[0], true)}<figcaption>${esc(photos[0].category)}. <a href="gallery.html#ba-${photos[0].id}">See the gallery</a>.</figcaption></figure>` : ""}
    <h2>Typical problems &amp; symptoms</h2>
    <ul>${p.symptoms.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    <h2>What's included in ${esc(lc(svc[p.ids[0]].name))}</h2>
    <ul>${includes.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    <h2>Price list</h2>
    <div data-rate-table="${p.ids.join(",")}">${PT.rateTable(C, PR, p.ids)}${PT.footnote(C)}</div>
    <p><a href="services.html#${svc[p.ids[0]].group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">See the full price list</a></p>
    ${photos.length > 1 ? `<h2>More service photos</h2>${photos.slice(1).map((ph) => `<figure class="page-photo">${baStatic(ph)}<figcaption>${esc(ph.category)}</figcaption></figure>`).join("")}` : ""}
    <h2>How it works</h2>
    <ol class="steps steps--service">
      <li><h3>Get an estimate</h3><p>Choose your car and service to see a price range.</p></li>
      <li><h3>Book a slot</h3><p>Send the details on WhatsApp or the booking form.</p></li>
      <li><h3>Inspection &amp; quote</h3><p>We inspect the car and share a final quotation.</p></li>
      <li><h3>Approve &amp; collect</h3><p>Work starts after your OK. You get an itemised bill.</p></li>
    </ol>
    ${related.length ? `<h2>Related services in ${esc(B.city)}</h2><ul data-related-services>${related.map(page=>`<li><a href="${page.file}">${esc(page.nav)} in ${esc(B.city)}</a></li>`).join('')}</ul>` : ''}
  </div>
  <aside style="display:grid;gap:18px;align-content:start" aria-label="Book ${esc(lc(p.nav))}">
    ${quickBook(p.ids[0], "Book " + lc(p.nav))}
  </aside>
</div></section>
<section class="band" id="estimate"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Cost calculator</span><h2>Price your ${esc(lc(p.nav))}</h2><p>${svc[p.ids[0]].inspectionRequired ? "This job needs an inspection before we can price it — the calculator shows what can be estimated and lets you request a quote." : "Set your car and parts grade to see labour, parts and time."}</p></div>
  <div class="jobcard" data-estimator data-preset="${p.ids[0]}" style="max-width:760px"><noscript><p style="padding:20px">The cost estimator needs JavaScript. Message us on WhatsApp for a quote.</p></noscript></div>
</div></section>
${faqBlock(p.faqs)}
${ctaBand("Book your " + lc(p.nav) + " in Indore")}`;
  return layout({ file: p.file, title: p.title, desc: p.desc, body, ld, navKey: "services.html" });
}

/* --------------------------- Landing pages: car wash, area and brand --------------------------- */
// Model pages for the owner: copy one, then rewrite every part marked in docs/SEO plan (lead, sections, FAQs).
// Prices are read from rate-card.js at build time, so they stay in step with the price tables.
const qr = (id, cat) => PR.quickRange(C, id, cat, "petrol").text;
const MARUTI = C.brands.find((b) => b.id === "maruti");
const marutiNow = MARUTI.models.filter((m) => !(m[2] || "").includes("o")).map((m) => m[0]);
const marutiOld = MARUTI.models.filter((m) => (m[2] || "").includes("o")).map((m) => m[0]);
const marutiSuv = MARUTI.models.filter((m) => !(m[2] || "").includes("o") && m[1] === "suv").map((m) => m[0]);
const pinPlaces = (pin, max = 4) => [...new Set(AREAS.localities.filter(([, p]) => p === pin).map(([n]) => n))].filter((n) => n !== "Nipaniya" && n !== "Kanadia").slice(0, max);
const pinItem = (pin, max) => AREAS.coveredPins.includes(pin) ? `<li><b>${pin}</b> ${esc(pinPlaces(pin, max).join(", "))}</li>` : "";
const priceBlock = (ids) => `<div data-rate-table="${ids.join(",")}">${PT.rateTable(C, PR, ids)}${PT.footnote(C)}</div>`;
const slotText = (B.timeSlots || []).map((t) => t.toLowerCase().replace(/\s*\((.*)\)/, " $1")).join(", ");

const brandModels = (id) => {
  const ms = C.brands.find((b) => b.id === id).models;
  const now = ms.filter((m) => !(m[2] || "").includes("o"));
  return { now: now.map((m) => m[0]), old: ms.filter((m) => (m[2] || "").includes("o")).map((m) => m[0]),
    byCat: Object.fromEntries(["hatchback", "sedan", "suv"].map((c) => [c, now.filter((m) => m[1] === c).map((m) => m[0])])) };
};
const LANDING_PAGES = [
  { file: "car-wash-indore.html", nav: "Car wash", short: "car wash", icon: "sparkle", stock: "foam-wash", ids: ["CD-01", "CD-02", "CD-03", "CD-04"], serviceType: "Car wash",
    h1: "Car wash and foam wash in Indore", eyebrow: "Indore · All cars",
    desc: "Car foam wash in Indore with interior vacuum, deep cleaning and polishing options. Open every day from 7 AM to 11:30 PM at AB Road, Choithram Mandi.",
    lead: `A proper foam wash lifts Indore's dust off the paint instead of rubbing it in. Bring your car to our AB Road workshop any day between 7 AM and 11:30 PM, or add a wash to your next service.`,
    sections: [
      { h: "Car wash prices", html: `<p>An exterior foam wash costs ${qr("CD-01", "hatchback")} for a hatchback, ${qr("CD-01", "sedan")} for a sedan and ${qr("CD-01", "suv")} for an SUV. Bigger cars cost more because there is more car to clean. Interior cleaning and polishing are priced separately, so you pay only for what your car needs.</p>${priceBlock(["CD-01", "CD-02", "CD-03", "CD-04"])}` },
      { h: "What happens in a foam wash", html: `<ol><li><b>Rinse.</b> Loose dust and mud are rinsed off first, so they are not dragged across the paint.</li><li><b>Foam.</b> Snow-foam shampoo covers the car and softens the dirt that is left.</li><li><b>Wash.</b> Body panels, wheels and door edges are washed by hand.</li><li><b>Rinse and dry.</b> The car is rinsed again and dried with microfibre cloths to avoid water spots.</li><li><b>Tyre shine.</b> Tyres get a dressing so they look clean and dark.</li></ol><p>An exterior foam wash takes about 30 minutes to an hour.</p>` },
      { h: "Which wash does your car need?", html: `<ul><li><b>Exterior foam wash</b> for regular cleaning, every one or two weeks for a car parked outdoors.</li><li><b>Interior cleaning</b> when the cabin is dusty: vacuuming, mats and a dashboard wipe and dressing. About 1 to 1.5 hours.</li><li><b>Deep interior cleaning</b> for stains, spills or a musty smell after the monsoon: seat, roof and carpet shampoo with odour treatment. About 3 to 5 hours.</li><li><b>Rubbing and polishing</b> for dull paint and light swirl marks: a machine polish in one or two stages. About 3 to 6 hours. Dents and deep scratches need <a href="denting-painting-indore.html">denting and painting</a> instead.</li></ul>` },
      { h: "Car care tips for Indore roads", html: `<ul><li>Never wipe a dusty car with a dry cloth. Dust is abrasive and leaves fine scratches, so rinse it off first.</li><li>Clean bird droppings and tree sap off quickly. Left in the sun, they can mark the clear coat.</li><li>After rain or a waterlogged road, rinse the wheel arches and lower doors before the mud dries there.</li><li>Park in shade when you can. Strong sun fades paint and dashboard plastics over time.</li></ul>` },
      { h: "Wash with a service, or on its own", html: `<p>Our basic and standard <a href="car-service-indore.html">car services</a> already include an exterior wash, and the standard service adds an interior vacuum. If your service is due, you don't need a separate wash.</p><p>Wash-only visits are welcome during opening hours. Call or WhatsApp before you come and we'll tell you the waiting time. Free <a href="pickup-drop.html">pickup and drop</a> covers our ${AREAS.coveredPins.length} confirmed Indore PIN codes, subject to booking confirmation; for a wash-only booking, please confirm pickup when you book.</p>` }
    ],
    faqs: [
      { q: "How much does a car wash cost at Car Repair Wala?", a: `An exterior foam wash is ${qr("CD-01", "hatchback")} for a hatchback, ${qr("CD-01", "sedan")} for a sedan and ${qr("CD-01", "suv")} for an SUV. Interior cleaning starts at ${qr("CD-02", "hatchback").split(" – ")[0]} for a hatchback.` },
      { q: "How long does a foam wash take?", a: "About 30 minutes to an hour. Deep interior cleaning takes 3 to 5 hours, so leave the car with us or book pickup." },
      { q: "Do I need an appointment for a car wash?", a: "No appointment is needed, but call or WhatsApp before you come so we can tell you the waiting time." },
      { q: "Is foam wash safe for my car's paint?", a: "Yes. The foam loosens dirt before anyone touches the paint, which is gentler than wiping a dusty car." }
    ],
    related: [["car-detailing-indore.html", "Car detailing and interior cleaning in Indore"], ["denting-painting-indore.html", "Car denting, painting and scratch removal"], ["car-service-indore.html", "Periodic car service in Indore"]],
    cta: "Book a car wash in Indore" },

  { file: "car-service-vijay-nagar-indore.html", nav: "Car service in Vijay Nagar", short: "car service", icon: "truck", stock: "oil-service", ids: ["GS-02", "GS-01", "GS-03", "AC-03", "BR-02", "BD-01"], serviceType: "Car servicing and repair",
    h1: "Car service in Vijay Nagar, Indore", eyebrow: "Vijay Nagar · PIN 452010", area: "Vijay Nagar",
    desc: "Car service and repair for Vijay Nagar, Nipania and DDU Nagar with free pickup and drop to our AB Road workshop in Indore.",
    lead: "Live or work in Vijay Nagar, Nipania or near Sanwer Link Road? We collect your car, service it at our AB Road workshop and bring it back. Pickup and drop is free for PIN 452010, subject to booking confirmation.",
    sections: [
      { h: "How pickup from Vijay Nagar works", html: `<ol><li>Book on WhatsApp, by phone or with the <a href="booking.html">booking form</a>. Tell us your car, the problem and your address with PIN 452010.</li><li>Choose a time slot: ${esc(slotText)}.</li><li>We collect the car at the confirmed time.</li><li>We inspect it and send the quotation on WhatsApp. Work starts only after you approve it.</li><li>We drop the car back with an itemised bill that lists every part and labour charge.</li></ol>` },
      { h: "How far is the workshop from Vijay Nagar?", html: `<p>Our workshop is at ${esc(addressText())}, about 10.4 km from Vijay Nagar Square by AB Road. Google Maps showed about 25 minutes by car on a Sunday late morning; weekday office hours on AB Road take longer. With pickup, that drive is ours, not yours.</p><p>Prefer to drive in? We are open every day from 7 AM to 11:30 PM. ${mapLink(true)}</p>` },
      { h: "Areas we cover around Vijay Nagar", html: `<p>Pickup and drop is free in these PIN codes near Vijay Nagar, subject to booking confirmation:</p><ul>${pinItem("452010")}${pinItem("452016", 4)}${pinItem("452011")}${pinItem("452003")}</ul><p>Not sure about your street? <a href="pickup-drop.html">Check your PIN code</a> or ask us on WhatsApp.</p>` },
      { h: "Common jobs and prices", html: `<p>A standard service for a hatchback is ${qr("GS-02", "hatchback")}; for an SUV it is ${qr("GS-02", "suv")}. These ranges are for petrol cars with standard parts. Your final quote comes after inspection.</p>${priceBlock(["GS-02", "GS-01", "GS-03", "AC-03", "BR-02", "BD-01"])}<p><a href="services.html">See all services and prices</a>.</p>` },
      { h: "Why Vijay Nagar customers book with us", html: `<ul><li>Price ranges are on the website before you book.</li><li>No extra work without your OK on WhatsApp.</li><li>You choose economy, standard or genuine parts, and the parts used are written on the bill.</li><li>We are open until 11:30 PM every day, so an evening or night slot can fit around office hours.</li></ul>` }
    ],
    faqs: [
      { q: "Is pickup free from Vijay Nagar?", a: "Yes. PIN 452010 (Vijay Nagar, Nipania, DDU Nagar and Sanwer Link Road) is on our confirmed list, so pickup and drop is free, subject to booking confirmation." },
      { q: "Can you collect the car from my office in Vijay Nagar?", a: "Yes. Give the office address when you book and we will confirm the pickup time with you." },
      { q: "How long will my car be away?", a: "A standard service takes about 3 to 4 hours of work, plus travel. We tell you the expected return time when we confirm the booking." },
      { q: "Do you cover areas near Vijay Nagar outside PIN 452010?", a: "Khajrana, Bicholi Mardana and Kanadia Road (452016) and Nanda Nagar and RSS Nagar (452011) are also on our free pickup list. For other areas, check your PIN on the pickup page or ask us." }
    ],
    related: [["pickup-drop.html", "Pickup and drop areas in Indore"], ["car-service-indore.html", "Periodic car service in Indore"], ["car-ac-repair-indore.html", "Car AC service and gas filling in Indore"]],
    cta: "Book a pickup from Vijay Nagar" },

  { file: "maruti-car-service-indore.html", nav: "Maruti car service", short: "Maruti service", icon: "service", stock: "engine-inspection", ids: ["GS-02", "GS-01", "GS-03", "AC-03", "BR-02", "CL-02", "TB-05"], serviceType: "Car servicing", brand: "Maruti Suzuki",
    h1: "Maruti Suzuki car service in Indore", eyebrow: "Maruti Suzuki · Independent garage",
    desc: "Maruti Suzuki car service and repair in Indore at an independent multi-brand garage: Swift, Baleno, Dzire, Wagon R, Ertiga, Brezza and more.",
    lead: "Service your Swift, Baleno, Dzire, Wagon R, Ertiga or Brezza at an independent multi-brand garage in Indore. See the price range for your model, choose your parts grade, and approve the quote before work starts.",
    notice: "Car Repair Wala is an independent garage. We are not an authorised Maruti Suzuki dealer or service centre. Maruti Suzuki is a trademark of its owner and is used here only to describe the cars we service.",
    sections: [
      { h: "Maruti models we service", html: `<p>${esc(marutiNow.join(", "))}.</p><p>We also service older Maruti models, including ${esc(marutiOld.filter((m) => ["Alto 800", "Zen", "Ritz", "Swift Dzire", "SX4", "Gypsy", "Omni", "Esteem"].includes(m)).join(", "))}.</p>` },
      { h: "Maruti service prices", html: `<p>Most Maruti cars are hatchbacks, so they fall in our lowest price band. A basic service for a Swift or Wagon R is ${qr("GS-01", "hatchback")} and a standard service is ${qr("GS-02", "hatchback")}. The Dzire and Ciaz are priced as sedans, and the ${esc(marutiSuv.slice(0, 5).join(", "))} are priced as SUV/MUV.</p>${priceBlock(["GS-02", "GS-01", "GS-03", "AC-03", "BR-02", "CL-02", "TB-05"])}<p>For your exact model, fuel and parts grade, use the <a href="#estimate">cost calculator</a> below.</p>` },
      { h: "How often should a Maruti be serviced?", html: `<p>Maruti Suzuki generally recommends a periodic service every 10,000 km or 12 months, whichever comes first, after the early free services. Your owner's manual has the exact schedule for your model and fuel type.</p><p>Stop-start traffic, dusty roads and long AC use can mean your car needs attention sooner.</p>` },
      { h: "What we often check on Maruti cars", html: `<ul><li><b>AMT (AGS) models:</b> jerky gear changes or a warning light can point to the clutch or the gear-shift actuator. We scan the system before replacing anything.</li><li><b>CNG models</b> such as the S-CNG Wagon R, Celerio, Dzire and Ertiga: spark plugs and air filters usually need attention more often than on petrol-only cars.</li><li><b>Clutch wear in city driving:</b> a high biting point or slipping in higher gears are early signs. See <a href="brake-clutch-repair-indore.html">brake and clutch repair</a>.</li><li><b>Brakes and suspension on MPVs:</b> an Ertiga or XL6 that often carries a full family puts more load on brake pads and suspension.</li></ul>` },
      { h: "Warranty and parts", html: `<p>If your Maruti is still under warranty, check your warranty booklet before servicing outside the dealer network. Tell us which parts grade you prefer when you book; every part used is listed on your itemised bill.</p>` }
    ],
    faqs: [
      { q: "Are you an authorised Maruti Suzuki service centre?", a: "No. We are an independent multi-brand garage. For free services under the manufacturer's scheme or for warranty repairs, visit an authorised Maruti Suzuki workshop." },
      { q: "How much does a Maruti car service cost?", a: `A basic service for a Maruti hatchback such as a Swift or Wagon R is ${qr("GS-01", "hatchback")} with standard parts, and a standard service is ${qr("GS-02", "hatchback")}. The calculator gives the range for your exact model.` },
      { q: "Do you service Maruti CNG cars?", a: "Yes. Select CNG as the fuel in the calculator to see the estimate for your car." },
      { q: "Can you collect my Maruti from home?", a: `Yes. Pickup and drop is free in our ${AREAS.coveredPins.length} confirmed Indore PIN codes, subject to booking confirmation.` }
    ],
    related: [["car-service-indore.html", "Periodic car service in Indore"], ["brake-clutch-repair-indore.html", "Car brake and clutch plate repair"], ["car-ac-repair-indore.html", "Car AC service and gas filling in Indore"]],
    cta: "Book your Maruti service" },

  { file: "car-service-rajendra-nagar-indore.html", nav: "Car service in Rajendra Nagar", short: "car service", icon: "truck", stock: "under-car", ids: ["AC-02", "CD-01", "TB-05", "BR-02", "GS-04", "GS-01"], serviceType: "Car servicing and repair",
    h1: "Car service in Rajendra Nagar, Indore", eyebrow: "Rajendra Nagar · PIN 452012", area: "Rajendra Nagar",
    desc: "Car service and repair about 5 km from Rajendra Nagar, Indore, at 17, AB Road, Choithram Mandi. Free pickup and drop for PIN 452012. Open daily till 11:30 PM.",
    lead: "Rajendra Nagar is one of the closest areas to our workshop, about 5 km away. Drop your car off yourself, or we collect it, service it at 17, AB Road, Choithram Mandi and bring it back. Pickup and drop is free for PIN 452012, subject to booking confirmation.",
    sections: [
      { h: "How close is the workshop?", html: `<p>Google Maps showed <b>4.9 km and about 11 minutes</b> by car via NH 47 on a Sunday around noon, or 4.3 km via Annapurna Road. Weekday traffic adds time, but it stays a short trip.</p><p>That makes it easy to drop the car on your way to work and collect it in the evening. We are open every day from 7 AM to 11:30 PM. ${mapLink(true)}</p>` },
      { h: "Quick jobs that suit a short trip", html: `<p>These jobs usually take an hour or two, so the car can often go back the same day. We confirm the timing when you book.</p><ul><li><b>AC gas filling:</b> ${qr("AC-02", "hatchback")} for a hatchback, about 1 to 2 hours, with a leak check first.</li><li><b>Foam wash:</b> ${qr("CD-01", "hatchback")}, about 30 to 60 minutes.</li><li><b>Battery replacement:</b> ${qr("TB-05", "hatchback")} including fitting, about 30 to 60 minutes.</li><li><b>Front brake pads:</b> ${qr("BR-02", "hatchback")}, about 1 to 2 hours.</li><li><b>Engine oil and filter change:</b> ${qr("GS-04", "hatchback")}, about 1 to 1.5 hours.</li></ul>${priceBlock(["AC-02", "CD-01", "TB-05", "BR-02", "GS-04", "GS-01"])}` },
      { h: "Areas we cover near Rajendra Nagar", html: `<p>Free pickup and drop also covers these nearby PIN codes, subject to booking confirmation:</p><ul>${pinItem("452012")}${pinItem("452009")}${pinItem("452005")}${pinItem("452020", 3)}${pinItem("452006")}</ul><p><a href="pickup-drop.html">Check your PIN code</a> if your street is not listed.</p>` },
      { h: "Booking from Rajendra Nagar", html: `<p>Send your car, the problem and your address with PIN 452012 on WhatsApp, by phone or with the <a href="booking.html">booking form</a>, and pick a morning, afternoon, evening or night slot. We send the quotation on WhatsApp after inspecting the car and start only after you say yes. The car comes back with a bill that lists each part and labour charge.</p>` },
      { h: "Why Rajendra Nagar drivers choose us", html: `<ul><li>A workshop about 10 to 15 minutes away that stays open until 11:30 PM.</li><li>Price ranges on the website, so you know the likely cost before you come.</li><li>Choice of economy, standard or genuine parts, written on the bill.</li><li>No extra work without your approval.</li></ul>` }
    ],
    faqs: [
      { q: "How far is Car Repair Wala from Rajendra Nagar?", a: "About 4.3 to 4.9 km depending on the route, or around 11 to 13 minutes by car at quiet times, as checked on Google Maps." },
      { q: "Is pickup free in Rajendra Nagar?", a: "Yes. PIN 452012 is on our confirmed list, so pickup and drop is free, subject to booking confirmation." },
      { q: "Which jobs can be done in a couple of hours?", a: "A foam wash, battery replacement, oil change, brake pad change and AC gas filling are usually quick. We confirm the timing when you book." },
      { q: "Do you also cover Sudama Nagar and Bijasan Road?", a: "Yes. Sudama Nagar and Lokmanya Nagar (452009) and Bijasan Road (452005) are on our free pickup list too." }
    ],
    related: [["car-wash-indore.html", "Car wash and foam wash in Indore"], ["car-ac-repair-indore.html", "Car AC service and gas filling in Indore"], ["pickup-drop.html", "Pickup and drop areas in Indore"]],
    cta: "Book a car service from Rajendra Nagar" },

  { file: "hyundai-car-service-indore.html", nav: "Hyundai car service", short: "Hyundai service", icon: "service", stock: "engine-check", ids: ["GS-02", "GS-01", "GS-03", "AC-03", "BR-02", "SU-02", "TB-05"], serviceType: "Car servicing", brand: "Hyundai",
    h1: "Hyundai car service in Indore", eyebrow: "Hyundai · Independent garage",
    desc: "Hyundai car service and repair in Indore at an independent multi-brand garage: Creta, Venue, i20, Grand i10 Nios, Verna, Exter, Aura and more.",
    lead: "Service your Creta, Venue, i20, Grand i10 Nios, Verna or Exter at an independent multi-brand garage in Indore. Petrol, diesel, turbo and automatic models are welcome. See the price range first and approve the quote before work starts.",
    notice: "Car Repair Wala is an independent garage. We are not an authorised Hyundai dealer or service centre. Hyundai is a trademark of its owner and is used here only to describe the cars we service.",
    sections: [
      { h: "Hyundai models we service", html: `<p>${esc(brandModels("hyundai").now.join(", "))}.</p><p>Older models too, including ${esc(brandModels("hyundai").old.filter((m) => ["Santro", "Eon", "i10", "Grand i10", "Elite i20", "Xcent", "Accent", "Elantra"].includes(m)).join(", "))}.</p>` },
      { h: "Hyundai service prices", html: `<p>The ${esc(brandModels("hyundai").byCat.hatchback.slice(0, 3).join(", "))} are priced as hatchbacks: a standard service is ${qr("GS-02", "hatchback")}. The ${esc(brandModels("hyundai").byCat.sedan.join(" and "))} are sedans (${qr("GS-02", "sedan")}), and the ${esc(brandModels("hyundai").byCat.suv.filter((m) => !/Electric|Ioniq|N Line/.test(m)).join(", "))} are SUVs (${qr("GS-02", "suv")}).</p>${priceBlock(["GS-02", "GS-01", "GS-03", "AC-03", "BR-02", "SU-02", "TB-05"])}<p>For your exact model, fuel and parts grade, use the <a href="#estimate">cost calculator</a> below.</p>` },
      { h: "Petrol, diesel, turbo or automatic: what changes", html: `<ul><li><b>Diesel (CRDi):</b> needs the engine oil grade your manual specifies and a fuel filter change on schedule. Diesel cars used mostly for short city trips can build up soot in the exhaust filter on newer models; a longer highway run now and then helps.</li><li><b>Turbo petrol:</b> use the oil grade in your manual, and let the engine idle briefly after a hard drive before switching off.</li><li><b>Automatics:</b> Hyundai uses different gearbox types across its models (torque-converter, IVT, DCT and AMT), and each needs its own fluid. Jerks or a gearbox warning need a scan before any part is replaced.</li><li><b>Electric (Creta Electric, Ioniq 5, Kona Electric):</b> we handle the 12V battery, brakes, suspension, tyres and AC. High-voltage battery work is not something we do.</li></ul>` },
      { h: "How often should a Hyundai be serviced?", html: `<p>Hyundai generally recommends periodic maintenance every 10,000 km or 12 months, whichever comes first. Check your owner's manual for your model, fuel and gearbox. Heavy traffic and dusty roads can bring the next service forward.</p>` },
      { h: "Warranty and parts", html: `<p>If your Hyundai is under warranty, read the warranty terms before servicing outside the dealer network. Tell us your preferred parts grade when you book; every part used is written on your itemised bill.</p>` }
    ],
    faqs: [
      { q: "Are you an authorised Hyundai service centre?", a: "No. We are an independent multi-brand garage. For warranty repairs or manufacturer free services, visit an authorised Hyundai workshop." },
      { q: "How much does a Hyundai car service cost?", a: `A standard service is ${qr("GS-02", "hatchback")} for a hatchback such as the i20 or Grand i10 Nios, and ${qr("GS-02", "suv")} for an SUV such as the Creta or Venue, with standard parts. The calculator shows the range for your exact model.` },
      { q: "Do you service Hyundai diesel and automatic cars?", a: "Yes. Choose your fuel in the calculator; automatic gearbox faults are inspected first and then quoted." },
      { q: "Can you collect my Hyundai from home?", a: `Yes. Pickup and drop is free in our ${AREAS.coveredPins.length} confirmed Indore PIN codes, subject to booking confirmation.` }
    ],
    related: [["car-service-indore.html", "Periodic car service in Indore"], ["suspension-steering-repair-indore.html", "Suspension and steering repair in Indore"], ["car-ac-repair-indore.html", "Car AC service and gas filling in Indore"]],
    cta: "Book your Hyundai service" }
];
LANDING_PAGES.forEach((p) => { p.lead = p.lead.trim(); });

function landingPage(p) {
  const crumbs = [{ "@type": "ListItem", position: 1, name: "Home", item: url("index.html") }, { "@type": "ListItem", position: 2, name: "Services", item: url("services.html") }, { "@type": "ListItem", position: 3, name: p.nav, item: url(p.file) }];
  const ld = [
    { "@context": "https://schema.org", "@type": "Service", name: p.h1, serviceType: p.serviceType, provider: { "@type": "AutoRepair", name: B.name, telephone: B.phoneE164 },
      areaServed: p.area ? { "@type": "Place", name: p.area + ", " + B.city } : { "@type": "City", name: B.city }, description: p.desc, ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs },
    faqLd(p.faqs)
  ];
  const body = `
<section class="page-hero page-hero--photo"><div class="wrap">
  <div class="page-hero-copy">
  <p class="crumbs"><a href="index.html">Home</a> / <a href="services.html">Services</a> / ${esc(p.nav)}</p>
  <span class="eyebrow">${esc(p.eyebrow)}</span>
  <h1>${esc(p.h1)}</h1>
  <p>${esc(p.lead)}</p>
  <div class="hero-ctas"><a class="btn" href="#estimate">${ic("receipt")}Estimate my cost</a><a class="btn btn--wa" data-wa="${esc(p.nav)}" href="https://wa.me/${B.whatsapp}">${ic("wa")}WhatsApp us</a><a class="btn btn--ghost" href="tel:${B.phoneE164}" data-tel>${ic("phone")}Call ${esc(B.phoneDisplay)}</a></div>
  </div>
  ${photo(p.stock, { cls: "page-hero-photo", eager: true, sizes: "(max-width: 900px) 100vw, 40vw" })}
</div></section>
<section class="band band--white"><div class="wrap two-col">
  <div class="prose">
    ${p.notice ? `<p class="notice">${esc(p.notice)}</p>` : ""}
    ${p.sections.map((x, i) => `<h2${i === 0 && !p.notice ? ' style="margin-top:0"' : ""}>${esc(x.h)}</h2>${x.html}`).join("\n    ")}
    <h2>Related pages</h2><ul data-related-services>${p.related.map(([f, label]) => `<li><a href="${f}">${esc(label)}</a></li>`).join("")}</ul>
  </div>
  <aside style="display:grid;gap:18px;align-content:start" aria-label="Book ${esc(p.short)}">
    ${quickBook(p.ids[0], "Book " + p.short)}
  </aside>
</div></section>
<section class="band" id="estimate"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Cost calculator</span><h2>Price your ${esc(p.short)}</h2><p>Set your car and parts grade to see labour, parts and time.</p></div>
  <div class="jobcard" data-estimator data-preset="${p.ids[0]}" style="max-width:760px"><noscript><p style="padding:20px">The cost estimator needs JavaScript. Message us on WhatsApp for a quote.</p></noscript></div>
</div></section>
${faqBlock(p.faqs)}
${ctaBand(p.cta)}`;
  return layout({ file: p.file, title: p.h1 + " | " + B.name, desc: p.desc, body, ld, navKey: "services.html" });
}

function areaChecker(id) {
  return `<div class="checker"><h2 class="checker-title">Check your PIN code</h2><form data-area-check novalidate><label class="sr-only" for="${id}">PIN code or locality</label><input id="${id}" placeholder="6-digit PIN, e.g. 452020" inputmode="text" autocomplete="postal-code" maxlength="40"><button class="btn" type="submit">Check</button></form><p class="small muted" style="margin:0">You can also type a locality, e.g. Vijay Nagar or Kasturbagram.</p><div data-area-result aria-live="polite"></div></div>`;
}
function areaList() {
  const byPin = {};
  AREAS.localities.forEach(([name,pin]) => { (byPin[pin] ||= []).push(name); });
  return AREAS.coveredPins.map(pin=>`<li><b>${esc(pin)}</b>${byPin[pin]?' '+esc(byPin[pin].slice(0,2).join(', ')):''}</li>`).join('');
}
// Footer: one-line hours ("Open daily · 7 AM – 11:30 PM") and a plain "Get directions" link.
function shortClock(value) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}${minute ? ":" + String(minute).padStart(2, "0") : ""} ${hour >= 12 ? "PM" : "AM"}`;
}
function footerHours() {
  return `<span class="hours-line">${B.hours.map((h) => `<span>${/^Mo-Su$/i.test(h.days) ? "Open daily" : esc(h.label || h.days)}</span> · ${shortClock(h.open)} – ${shortClock(h.close)}`).join("<br>")}</span>`;
}
function instaLink(cls) {
  return B.instagramUrl ? `<a class="${cls}" data-instagram href="${esc(B.instagramUrl)}" target="_blank" rel="noopener noreferrer">${ic("insta")}<span>Follow us on Instagram</span></a>` : "";
}
function footerDirections() {
  const href = B.googleBusinessProfileUrl || B.googleMapsSearchUrl;
  return href ? `<a class="footer-directions" data-map-link href="${esc(href)}" target="_blank" rel="noopener noreferrer">${ic("pin")}<span>Get directions</span></a>` : "";
}
function timeOptions() {
  return (B.timeSlots || []).map((t) => `<option>${esc(t)}</option>`).join("");
}
function hoursText() {
  const clock = (value) => {
    const [hour, minute] = value.split(":").map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
  };
  return B.hours.map((h) => `${esc(h.label || h.days)}: ${clock(h.open)}–${clock(h.close)} (IST)`).join("<br>");
}

function reviewForm() {
  return `<section class="band" id="write-review"><div class="wrap review-layout">
  <div class="review-intro"><span class="eyebrow">Your experience matters</span><h2>Write your review</h2><p>Tell us what went well and what we can improve. All star ratings are welcome.</p><p>Fill in your feedback here, then send it to Car Repair Wala on WhatsApp. Reviews appear on this website after the garage checks them and you allow publication.</p><p class="small muted">Please leave out phone numbers, vehicle registration numbers and other private details. <a href="privacy.html">Privacy policy</a></p><a class="btn btn--wa btn--sm" data-feedback-wa href="https://wa.me/${B.whatsapp}">Feedback on WhatsApp</a></div>
  <div class="review-form-card" data-review-enhanced hidden>
  <form data-review-form>
    <div class="field"><label for="r-name">Display name *</label><input id="r-name" name="name" autocomplete="name" maxlength="60" required placeholder="The name you want shown with your review"></div>
    <fieldset class="review-rating"><legend>Your rating *</legend><div class="review-rating-options">${[1,2,3,4,5].map(n => `<label class="chip"><input type="radio" name="rating" value="${n}" required aria-label="${n} ${n === 1 ? "star" : "stars"}"><span>${n} ★</span></label>`).join("")}</div></fieldset>
    <div class="grid-2"><div class="field"><label for="r-car">Car model (optional)</label><input id="r-car" name="car" maxlength="80" placeholder="e.g. Swift"></div><div class="field"><label for="r-service">Service (optional)</label><select id="r-service" name="service"><option value="">Choose a service</option>${["Car servicing","Engine repair","Suspension & steering","Brakes & clutch","Car AC service","Denting & painting","Car washing & detailing","Other"].map(s => `<option>${esc(s)}</option>`).join("")}</select></div></div>
    <div class="field"><label for="r-text">Your experience *</label><textarea id="r-text" name="experience" minlength="20" maxlength="1500" rows="5" required aria-describedby="r-hint" placeholder="Tell us about the service you received and anything we could improve."></textarea><span class="hint" id="r-hint">20–1,500 characters. Honest feedback of any rating is welcome.</span></div>
    <label class="review-consent"><input type="checkbox" name="consent"><span>You may publish my display name, rating, car model, service and feedback on the Car Repair Wala website. Leave unchecked to send private feedback only.</span></label>
    <p class="small muted">Your review reaches the garage only after you press Send in WhatsApp. It is not posted to Google or published automatically.</p>
    <div class="hero-ctas"><button class="btn" type="submit">Prepare my review ${ic("arrow")}</button><button class="btn btn--outline" type="reset">Clear</button></div>
    <div data-review-result role="status" aria-live="polite" hidden></div>
  </form></div><noscript><p>To send feedback without JavaScript, use the WhatsApp button above.</p></noscript>
  </div></section>`;
}

function reviewsSection(full = false) {
  return `<section class="band band--white" id="reviews"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Reviews</span><h2 data-i18n="sec.reviews">What Our Customers Say</h2></div>
  <p class="notice" data-reviews-notice hidden><strong>Sample content:</strong> the six reviews below are demo testimonials that show how reviews will appear. They are not real customers or Google reviews and will be replaced by verified reviews shared with permission.</p>
  <div class="notice" data-review-summary hidden></div>
  <div class="reviews reviews--six" data-reviews></div>
  <div class="share-box"><div><h3>Serviced your car with us?</h3><p>Tell us how it went. With your permission we'll publish your review here.</p></div>
    <div class="hero-ctas"><a class="btn" data-share-review href="reviews.html#write-review">${ic("star")}Write a website review</a><a class="btn btn--outline" data-google-review ${B.googleBusinessProfileUrl ? `href="${esc(B.googleBusinessProfileUrl)}" target="_blank" rel="noopener noreferrer"` : "hidden"}>${B.googleBusinessProfileUrl ? "Car Repair Wala on Google" : "Review on Google"}</a><a class="btn btn--wa" data-feedback-wa href="https://wa.me/${B.whatsapp}">${ic("wa")}Feedback on WhatsApp</a></div></div>
  ${full ? "" : `<p style="margin-top:20px"><a href="reviews.html">More about our reviews →</a></p>`}
</div></section>`;
}

/* ------------------------------ Homepage ------------------------------ */
function workshopSlider() {
  return `<section class="service-carousel" data-workshop-slider role="region" aria-roledescription="carousel" aria-label="Car service photos">
    <div class="service-carousel-heading"><span class="eyebrow">Spotlight</span><p>Explore our car care services</p></div>
    <div class="service-slides" id="workshop-slides" data-slide-track tabindex="0" aria-label="Service photos; swipe or use arrow keys">${WORKSHOP_PHOTOS.map((p, i) => `<figure class="service-slide" data-slide aria-roledescription="slide" aria-label="${i+1} of ${WORKSHOP_PHOTOS.length}: ${esc(p.title)}"><img src="assets/img/workshop/${p.id}-800.webp" srcset="assets/img/workshop/${p.id}-800.webp 800w, assets/img/workshop/${p.id}-1600.webp 1600w" sizes="(max-width: 1200px) calc(100vw - 32px), 1140px" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" loading="lazy" decoding="async"><figcaption>${esc(p.title)}</figcaption></figure>`).join("")}</div>
    <div class="service-slider-controls" data-slider-controls hidden><button type="button" data-slide-prev aria-label="Previous service photo" aria-controls="workshop-slides">${ic("arrow")} Previous</button><span data-slide-count aria-live="polite" aria-atomic="true">1 / ${WORKSHOP_PHOTOS.length}</span><button type="button" data-slide-next aria-label="Next service photo" aria-controls="workshop-slides">Next ${ic("arrow")}</button></div>
    <noscript><p class="service-swipe-hint">Swipe across the photos to explore services.</p></noscript>
  </section>`;
}

function homepage() {
  const pk = C.packages.map((k) => {
    const s = svc[k.services[0]];
    return `<article class="card">
      <div class="ico">${ic(s.icon)}</div>
      <h3>${esc(k.title)}</h3>
      <p>${esc(k.blurb)}</p>
      <p class="price" data-pkg="${k.id}"><small>Hatchback · indicative</small>${(() => { const q = PR.quickRange(C, k.services[0], "hatchback"); return q.status === "priced" ? PR.formatRange(q.range) : "Quote after inspection"; })()}</p>
      <div class="actions package-actions"><a class="btn btn--sm" href="#estimate" data-pkg-btn="${k.id}">Get estimate</a><a class="btn btn--wa btn--sm" data-wa="${esc(k.title)}" href="https://wa.me/${B.whatsapp}" aria-label="Enquire about ${esc(k.title)} on WhatsApp">${ic("wa")}Enquire</a><a class="btn btn--outline btn--sm" href="tel:${B.phoneE164}" data-tel data-call-now>${ic("phone")}Call Now</a></div>
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
    ["Choose your jobs", "Pick one or more jobs; overlapping work is counted once."],
    ["Get a price range", "See labour, parts, time and what's included."],
    ["Book on WhatsApp or online", "Your details are filled in for you."],
    ["Confirm the final quote", "We inspect the car and share the final quotation."],
    ["Car serviced & returned", "Pay against an itemised bill and drive away."]
  ].map(([h, t]) => `<li><h3>${h}</h3><p>${t}</p></li>`).join("");
  const svcCards = [...SERVICE_PAGES, LANDING_PAGES[0]].map((p) => `<article class="card${p.stock ? " card--photo" : ""}">${p.stock ? photo(p.stock, { cls: "card-photo", credit: false, sizes: "(max-width: 600px) 100vw, (max-width: 960px) 50vw, 380px" }) : ""}<div class="ico">${ic(p.icon)}</div><h3><a href="${p.file}">${esc(p.nav)}</a></h3><p>${esc(p.lead.split(". ")[0])}.</p>${PT.fromPrice(C, PR, p.ids) ? `<p class="price" data-from-price="${p.ids.join(",")}">From ${PT.fromPrice(C, PR, p.ids)}</p>` : ""}<div class="actions"><a class="btn btn--outline btn--sm" href="${p.file}">Details</a><a class="btn btn--wa btn--sm" data-wa="${esc(p.nav)}" href="https://wa.me/${B.whatsapp}" aria-label="Enquire about ${esc(p.nav)} on WhatsApp">${ic("wa")}Enquire</a></div></article>`).join("");

  const body = `
<section class="hero">
  <div class="wrap">
    <div class="hero-copy reveal">
      <span class="eyebrow">Multi-brand garage · ${esc(B.city)}</span>
      <h1 data-i18n="hero.title">Car Service &amp; Repair <span>Garage in Indore</span></h1>
      <p class="hero-sub" data-i18n="hero.sub">Transparent Estimates. Trusted Mechanics. Convenient Pickup &amp; Drop.</p>
      ${heroPriceTiles()}
      <div class="hero-ctas hero-ctas--desk">
        <a class="btn" href="#estimate">${ic("receipt")}<span data-i18n="cta.calc">Calculate Your Cost</span></a>
        <a class="btn btn--ghost" href="booking.html">${ic("calendar")}<span data-i18n="cta.book">Book now</span></a>
      </div>
      <div class="hero-ctas hero-ctas--desk"><a class="btn btn--wa" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}<span data-i18n="cta.wa">Chat on WhatsApp</span></a><a class="btn btn--ghost" href="tel:${B.phoneE164}" data-tel data-call-now>${ic("phone")}Call Now</a></div>
      <ul class="hero-facts">
        <li>${ic("check")}All major brands</li><li>${ic("receipt")}Itemised bills</li><li>${ic("shield")}Approval before extra work</li>
      </ul>
      <p class="pickup-terms">We work on Maruti Suzuki, Hyundai, Tata, Mahindra, Honda, Kia, Toyota and other brands. See <a href="maruti-car-service-indore.html">Maruti</a> and <a href="hyundai-car-service-indore.html">Hyundai</a> car service.</p>
      <p class="pickup-terms"><strong style="color:#fff">Free pickup &amp; drop</strong> across our ${AREAS.coveredPins.length} confirmed Indore PIN codes, subject to booking confirmation. <a href="pickup-drop.html">Check your PIN</a>.</p>
    </div>
    <div class="jobcard reveal" id="estimate" data-estimator data-heading-level="2"><noscript><p style="padding:20px">The cost estimator needs JavaScript. Message us on WhatsApp for a quote.</p></noscript></div>
    ${workshopSlider()}
  </div>
</section>

<section class="band" id="packages"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Packages</span><h2 data-i18n="sec.packages">Popular packages</h2><p>Price ranges below are for a petrol hatchback with standard parts. The calculator adjusts them for your car. <a href="services.html">See the full price list</a>.</p></div>
  <div class="cards">${pk}</div>
</div></section>

<section class="band band--white" id="before-after"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Our work</span><h2 data-i18n="sec.gallery">${esc(GALLERY.title)}</h2><p>${esc(GALLERY.subtitle)}</p></div>
  <div class="ba-grid" data-gallery data-featured data-limit="4"></div>
  <p style="margin-top:24px"><a class="btn btn--outline" href="gallery.html">${ic("image")}Explore the gallery</a></p>
</div></section>

<section class="band band--dark"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Why us</span><h2 data-i18n="sec.why">Why choose Car Repair Wala</h2><p>No surprise bills. You see the estimate first, approve the quote, and get every line itemised.</p></div>
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
  <div class="section-head" style="margin:0"><span class="eyebrow">Pickup &amp; drop</span><h2 data-i18n="sec.areas">Areas we cover</h2><p>Free pickup and drop across these ${AREAS.coveredPins.length} Indore city PIN codes, subject to booking confirmation. Outside them, ask us and we'll check.</p>
    <ul class="area-list" data-area-list>${areaList()}</ul>
    <p class="small" style="color:var(--fog)">Area guides: <a style="color:#fff" href="car-service-vijay-nagar-indore.html">car service in Vijay Nagar</a> and <a style="color:#fff" href="car-service-rajendra-nagar-indore.html">car service in Rajendra Nagar</a>, with distance, covered localities and prices.</p>
  </div>
  ${areaChecker("home-area")}
</div></section>

${faqBlock(C.faqs)}

<section class="band band--white" id="contact"><div class="wrap two-col">
  <div class="prose"><span class="eyebrow">Contact</span><h2 style="margin-top:0">Car repair workshop in ${esc(B.address?.locality || B.city)}, ${esc(B.city)}</h2>
    <p>Visit ${esc(B.name)} for car servicing, AC checks, brake repairs and engine diagnostics. <a href="services.html">Compare our services and indicative prices</a> or <a href="contact.html">find workshop contact details and directions</a>. We confirm the final quotation after inspection.</p>
    <p>Call or WhatsApp <span class="phone-line" style="color:var(--ink)" data-phone>${esc(B.phoneDisplay)}</span></p>
    ${B.address ? `<p data-workshop-address>${esc(addressText())}</p>${mapLink()}` : `<p class="muted">Workshop address will be shown here once confirmed. Ask on WhatsApp for directions.</p>`}
    ${B.hours ? `<p data-working-hours>${hoursText()}</p>` : `<p class="muted">Working hours: please call or WhatsApp to confirm.</p>`}
  </div>
  <div class="side-card" style="position:static"><a class="btn btn--block" href="tel:${B.phoneE164}" data-tel>${ic("phone")}Call ${esc(B.phoneDisplay)}</a><a class="btn btn--wa btn--block" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}Chat on WhatsApp</a><a class="btn btn--outline btn--block" href="booking.html">${ic("calendar")}Booking form</a></div>
</div></section>
${ctaBand()}`;
  return layout({
    file: "index.html", title: "Car Service & Repair in Indore | Car Repair Wala",
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
    <span class="eyebrow">Car Repair Wala service menu · Indore</span>
    <h1>Good care.<br><span>Clear prices.</span></h1>
    <p>From an oil change to a fresh coat of paint. Find the right care for your car, see the estimate, and approve the quote before we pick up a spanner.</p>
    <div class="hero-ctas"><a class="btn" href="#service-menu">Explore services ${ic("arrow")}</a><a class="services-hero-link" href="estimate.html">Build my estimate ${ic("receipt")}</a></div>
    <div class="service-promises"><span>${ic("check")}Itemised quotes</span><span>${ic("shield")}Your approval first</span><a href="pickup-drop.html">${ic("truck")}Pickup area check</a></div>
  </div>
  <aside class="service-hero-ticket" aria-label="How our pricing works">
    <div class="ticket-top"><span>GOOD TO GO.</span>${ic("wrench")}</div>
    <div class="ticket-art"><img src="assets/img/gallery/samples/engine-oil-change-after.jpg" width="800" height="600" alt="Illustrative example of a clean car engine after an oil service"></div>
    <div class="ticket-copy"><span class="eyebrow">A better garage experience</span><h2>Your car.<br>Our kind of work.</h2><div class="ticket-stats"><div><strong>${C.services.length}</strong><span>service options</span></div><div><strong>${C.categories.length}</strong><span>car categories</span></div><div>${ic("receipt")}<span>A quote<br>before repairs</span></div></div></div>
    <div class="ticket-bottom">YOUR CAR. OUR CARE. <span>·</span> CAR REPAIR WALA</div>
  </aside>
</div></section>
<section class="care-section"><div class="wrap"><div class="service-section-heading"><div><span class="eyebrow">Start with the essentials</span><h2>Make maintenance<br>a good habit.</h2></div><p>Three levels of everyday care. Choose your car category below to compare estimates for these packages and every service.</p></div><div class="care-packages">${bundles}</div><p class="package-price-note">Indicative ranges for petrol cars with standard parts. Taxes as per final bill. Final quote after inspection.</p></div></section>
<section class="service-menu-section" id="service-menu"><div class="wrap">
  <div class="service-section-heading"><div><span class="eyebrow">The Car Repair Wala service menu</span><h2>What does your car need?</h2></div><a class="service-inline-link" href="estimate.html">Not sure? Build an estimate ${ic("arrow")}</a></div>
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
  return layout({ file: "services.html", title: `Car Services & Prices in Indore | ${B.name}`, desc: "Explore Car Repair Wala car services, compare transparent price ranges, and find the right maintenance or repair for your car in Indore. Your Car. Our Care.", body, ld: [offerLd], navKey: "services.html" });
}

// Phone-only price tiles in the home hero: each one opens the calculator with that job ticked.
const HERO_TILES = [["GS-01", "Car service", "service"], ["AC-03", "AC service", "ac"], ["BR-01", "Brake check", "brake"], ["BD-01", "Dent & paint", "paint"]];
function heroPriceTiles() {
  const from = (id) => { const q = PR.quickRange(C, id, "hatchback", "petrol"); return q.status === "priced" ? "from " + PR.formatINR(q.range[0]) : "Quote after inspection"; };
  return `<div class="hero-price"><h2>Check your price in 30 seconds</h2><div class="est-tiles">${HERO_TILES.map(([id, label, icon]) => `<a class="est-tile" href="#estimate" data-hero-svc="${id}"><span>${ic(icon)}<b>${esc(label)}</b><small>${esc(from(id))}</small></span></a>`).join("")}</div><a class="hero-price-all" href="services.html">All services &amp; prices →</a></div>`;
}
// Problem tiles: plain-language needs a customer can tap without knowing repair names.
// The label is sent to the garage as the service line, so keep it readable in English.
const BOOKING_NEEDS = [
  ["General service", "service"], ["AC not cooling", "ac"], ["Brakes / noise", "brake"], ["Dent & paint", "paint"],
  ["Battery / won't start", "battery"], ["Warning light / engine", "scan"], ["Accident repair", "shield"], ["Not sure — please check", "chat"]
];
function bookingPage() {
  const waText = `Hello ${B.name}, I want to book a car service.\nCar: \nProblem: \nArea / PIN: `;
  const radio = (name, value, label, checked = false) => `<label class="seg-opt"><input type="radio" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}><span>${label}</span></label>`;
  const body = `
<section class="page-hero page-hero--compact"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Book</p><h1>Book a car service</h1><p>Takes about a minute. We confirm the slot and price with you before any work starts.</p></div></section>
<section class="band band--booking"><div class="wrap">
  <div class="form-card" data-booking>
    <div class="b-quick">
      <a class="btn btn--wa btn--block" data-b-quick-wa target="_blank" rel="noopener" href="https://wa.me/${B.whatsapp}?text=${encodeURIComponent(waText)}">${ic("wa")}Book on WhatsApp instead</a>
      <p class="b-or"><span>or fill this short form</span></p>
    </div>
    <div class="jobcard-head"><span>Booking request</span><span data-b-count>Step 1 of 2</span></div>
    <div class="steps-bar" aria-hidden="true"><span class="on"></span><span></span></div>
    <div class="jobcard-body">
      <div data-b-estimate hidden></div>
      <noscript><p class="notice">This form needs JavaScript. <a href="https://wa.me/${B.whatsapp}">Book on WhatsApp</a> or <a href="tel:${B.phoneE164}">call us</a>.</p></noscript>
      <form novalidate class="b-form">
        <fieldset data-bstep class="b-step">
          <legend class="step-title"><span class="num">01</span><h2>Your car &amp; the problem</h2></legend>
          <div class="grid-2">
            <div class="field"><label for="b-brand">Car brand *</label><select id="b-brand"></select><p class="err" hidden></p></div>
            <div class="field"><label for="b-model">Model *</label><select id="b-model" disabled></select><input id="b-model-other" hidden maxlength="80" autocapitalize="words" placeholder="Type your car model" aria-label="Car model"><p class="err" hidden></p></div>
          </div>
          <div class="field" role="group" aria-labelledby="b-need-label">
            <p class="label" id="b-need-label">What does it need? * <span class="hint">Tap all that apply</span></p>
            <div class="tiles" data-b-needs>${BOOKING_NEEDS.map(([label, icon]) => `<label class="tile"><input type="checkbox" name="b-need" value="${esc(label)}"><span>${ic(icon)}${esc(label)}</span></label>`).join("")}</div>
            <p class="err" id="booking-services-error" data-svc-err role="alert" hidden></p>
          </div>
          <details class="b-more" data-b-more><summary>Know the exact job? Choose from all services <span class="small muted" data-b-more-count></span></summary><div data-b-services></div><div class="grid-2" data-b-qty hidden></div></details>
          <div class="field"><label for="b-notes">Anything else? (optional)</label><textarea id="b-notes" maxlength="600" rows="2" placeholder="e.g. squeaking noise when I brake"></textarea></div>
        </fieldset>
        <fieldset data-bstep hidden class="b-step">
          <legend class="sr-only"><h2>Your details &amp; time</h2></legend>
          <div class="b-summary" data-b-summary></div>
          <section class="b-sec" aria-labelledby="b-sec-you">
            <h3 class="b-sec-title" id="b-sec-you">${ic("phone")}Your details</h3>
            <div class="grid-2">
              <div class="field"><label for="b-name">Your name *</label><input id="b-name" autocomplete="name" maxlength="60" placeholder="e.g. Ravi Kumar"><p class="err" hidden></p></div>
              <div class="field"><label for="b-mobile">Mobile / WhatsApp number *</label><div class="inp-pre"><span aria-hidden="true">+91</span><input id="b-mobile" type="tel" inputmode="tel" autocomplete="tel" placeholder="98765 43210"></div><p class="err" hidden></p></div>
            </div>
            <p class="hint b-hint">We'll confirm your slot on this number.</p>
          </section>
          <section class="b-sec" aria-labelledby="b-sec-pickup">
            <h3 class="b-sec-title" id="b-sec-pickup">${ic("truck")}Pickup &amp; drop</h3>
            <div class="pk-cards" role="radiogroup" aria-label="Pickup and drop">
              <label class="pk-card"><input type="radio" name="b-pickup" value="yes" checked><span>${ic("truck")}<b>Pick up my car</b><small>Free in our confirmed Indore areas</small></span></label>
              <label class="pk-card"><input type="radio" name="b-pickup" value="no"><span>${ic("home")}<b>I’ll drop it at the garage</b><small>${esc([B.address?.street, B.address?.locality].filter(Boolean).join(", "))}</small></span></label>
            </div>
            <p class="b-garage" data-b-garage hidden>${ic("pin")}<span>${esc(addressText())}</span> · <a href="${esc(B.googleBusinessProfileUrl || B.googleMapsSearchUrl)}" target="_blank" rel="noopener noreferrer">Directions</a></p>
            <div class="b-loc" data-addr>
              <p class="label">Pickup address *</p>
              <button type="button" class="b-locbtn" data-b-locate>${ic("pin")}<span>Use my current location</span></button>
              <p class="b-loc-or"><span>or type it below</span></p>
              <p class="b-loc-msg" data-b-loc-msg role="status" hidden></p>
            </div>
            <div class="grid-addr" data-addr>
              <div class="field"><label for="b-address" class="sr-only">Pickup address</label><input id="b-address" autocomplete="street-address" maxlength="250" placeholder="House no., street, colony"><p class="err" hidden></p></div>
              <div class="field"><label for="b-pin" class="sr-only">PIN code</label><input id="b-pin" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="PIN code"><p class="err" hidden></p></div>
            </div>
            <div data-b-pin-result aria-live="polite"></div>
            <div class="b-map" data-b-map hidden><div class="b-map-canvas" data-b-map-canvas></div><p class="b-map-foot"><span>Drag the pin to your gate if needed.</span><button type="button" class="linkish" data-b-loc-clear>✕ Don’t use my location</button></p></div>
          </section>
          <section class="b-sec" aria-labelledby="b-sec-when">
            <h3 class="b-sec-title" id="b-sec-when">${ic("calendar")}When</h3>
            <div class="field" role="group" aria-labelledby="b-day-label"><p class="label" id="b-day-label">Which day? <span class="hint">Optional</span></p><div class="seg seg--wrap seg--sub">
              <label class="seg-opt"><input type="radio" name="b-day" value="today"><span><b>Today</b><small data-b-day-sub="0"></small></span></label>
              <label class="seg-opt"><input type="radio" name="b-day" value="tomorrow"><span><b>Tomorrow</b><small data-b-day-sub="1"></small></span></label>
              <label class="seg-opt"><input type="radio" name="b-day" value="pick"><span><b>Pick a date</b><small>${ic("calendar")}</small></span></label>
            </div></div>
            <div class="field" data-b-date-field hidden><label for="b-date">Preferred date</label><input id="b-date" type="date"><p class="err" hidden></p></div>
            <div class="field" role="group" aria-labelledby="b-time-label"><p class="label" id="b-time-label">What time suits you?</p><div class="seg seg--wrap seg--sub">${radio("b-time", "", "<b>Any time</b>", true)}${B.timeSlots.map((t) => { const m = /^(.+?) \((.+)\)$/.exec(t); return radio("b-time", t, m ? `<b>${esc(m[1])}</b><small>${esc(m[2])}</small>` : `<b>${esc(t)}</b>`); }).join("")}</div>
            <p class="hint" data-b-passed hidden>Times that have already passed today are greyed out.</p></div>
          </section>
          <ul class="b-trust"><li>No advance payment</li><li>Final price after inspection</li><li>No extra work without your OK</li><li>Free pickup &amp; drop in our confirmed Indore areas</li></ul>
        </fieldset>
        <div class="step-nav"><button type="button" class="btn btn--outline btn--sm" data-b-back hidden>Back</button><button type="submit" class="btn" data-b-next><span>Next</span> ${ic("arrow")}</button></div>
        <p class="b-wa-small" data-b-wa-small hidden>Prefer WhatsApp? <a data-b-quick-wa2 target="_blank" rel="noopener" href="https://wa.me/${B.whatsapp}">Chat with us →</a></p>
        <p class="small muted">We only ask for what we need to service your car. See our <a href="privacy.html">privacy policy</a>.</p>
      </form>
      <div data-b-result role="status" aria-live="polite"></div>
    </div>
  </div>
</div></section>`;
  return layout({ file: "booking.html", title: "Book a Car Service in Indore | Car Repair Wala", desc: "Book car servicing or repair in Indore in about a minute — online or on WhatsApp. Tell us your car and the problem; we confirm the slot and price.", body, navKey: "booking.html" });
}

function pickupPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Pickup &amp; drop</p><span class="eyebrow">Doorstep service</span><h1>Car pickup &amp; drop in Indore</h1><p>We collect your car, service it and bring it back. Pickup and drop is free across our confirmed Indore PIN codes, subject to booking confirmation.</p></div></section>
<section class="band band--char"><div class="wrap area-wrap">
  ${areaChecker("pd-area")}
  <div class="section-head" style="margin:0"><h2 style="font-size:2rem">Confirmed PIN codes</h2><ul class="area-list" data-area-list>${areaList()}</ul><p class="small" style="color:var(--fog)">Indore city PIN codes from India Post data. Other areas, including the rest of Indore district (Mhow, Sanwer, Depalpur, Hatod), aren't confirmed yet — contact us to check.</p></div>
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
  <p>Area guides with distance, covered localities and prices: <a href="car-service-vijay-nagar-indore.html">car service in Vijay Nagar</a> and <a href="car-service-rajendra-nagar-indore.html">car service in Rajendra Nagar</a>.</p>
</div></section>${ctaBand("Book a pickup")}`;
  return layout({ file: "pickup-drop.html", title: "Car Pickup & Drop Service in Indore | Car Repair Wala", desc: "Free car pickup and drop for servicing in listed Indore areas. Check your locality or PIN code before you book.", body, navKey: "pickup-drop.html" });
}

function contactPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Contact</p><span class="eyebrow">Contact</span><h1>Contact Car Repair Wala</h1><p>The fastest way to reach us is WhatsApp. Send your car model and the problem, and we'll reply with next steps.</p></div></section>
<section class="band band--white"><div class="wrap two-col">
  <div class="prose">
    <h2 style="margin-top:0">Phone &amp; WhatsApp</h2><p class="phone-line" style="color:var(--ink);font-size:1.4rem" data-phone>${esc(B.phoneDisplay)}</p>
    <h2>Workshop</h2>${B.address ? `<p data-workshop-address>${esc(addressText())}</p>${!B.googleBusinessProfileUrl && B.googleMapsSearchUrl ? '<p class="small muted">The map link searches the landmark area. Please call for the exact workshop entrance before visiting.</p>' : ""}` : `<p class="placeholder">Please call or WhatsApp for the workshop address and directions before visiting.</p>`}
    <h2>Working hours</h2>${B.hours ? `<p data-working-hours>${hoursText()}</p>` : `<p class="placeholder">Please call or WhatsApp to confirm today’s hours and appointment availability.</p>`}
    ${B.email ? `<h2>Email</h2><p>${esc(B.email)}</p>` : ""}
  </div>
  <div class="side-card"><a class="btn btn--block" href="tel:${B.phoneE164}" data-tel>${ic("phone")}Call now</a><a class="btn btn--wa btn--block" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}Chat on WhatsApp</a><a class="btn btn--outline btn--block" href="booking.html">${ic("calendar")}Booking form</a>${mapLink()}${B.instagramUrl ? `<a class="btn btn--outline btn--block" data-instagram href="${esc(B.instagramUrl)}" target="_blank" rel="noopener noreferrer">${ic("insta")}Instagram</a>` : ""}</div>
</div></section>`;
  return layout({ file: "contact.html", title: "Contact | Car Repair Wala — Car Mechanic in Indore", desc: "Call or WhatsApp Car Repair Wala for car service, repair quotes and pickup and drop bookings.", body, navKey: "contact.html" });
}

function legalPage(file, title, h1, sections, desc) {
  const body = `<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / ${esc(h1)}</p><h1>${esc(h1)}</h1><p class="small" style="color:var(--fog)">Please confirm service-specific terms with the garage before approving work.</p></div></section>
<section class="band band--white"><div class="wrap legal">${sections.map(([h, t]) => `<h2>${esc(h)}</h2>${t}`).join("")}</div></section>`;
  return layout({ file, title, desc, body });
}
const PH = (t) => `<p>${t}</p>`;
const terms = legalPage("terms.html", "Terms & Conditions | Car Repair Wala", "Terms & conditions", [
  ["Estimates", `<p>Prices shown on this website are indicative ranges for planning only. The final price is given in a quotation after the vehicle is inspected.</p>`],
  ["Approval before work", `<p>We start work only after you approve the quotation. If additional repairs are found, we contact you with the reason and cost, and proceed only with your approval.</p>`],
  ["Bills and parts", `<p>You receive an itemised bill listing labour and each part separately, including the parts grade used. Replaced parts can be shown to you on request.</p>`],
  ["Pickup and drop", `<p>Free pickup and drop applies only in listed service areas and is subject to slot availability. See the <a href="policies.html">pickup, drop and cancellation policy</a>.</p>`],
  ["Warranty", PH("Any applicable parts or workmanship warranty, exclusions and claim procedure will be stated in your quotation or invoice. Please ask before approving work; this website does not promise a fixed warranty period.")],
  ["Payment", PH("Confirm accepted payment methods and when payment is due with the garage before approving work. This website does not collect payments.")],
  ["Liability", PH("Before handover, remove valuables and record the vehicle condition and belongings with the garage. Agree any road-test, custody and handover arrangements before work. Nothing here limits rights available under applicable law.")]
], "Terms and conditions for car service and repair bookings with Car Repair Wala.");
const privacy = legalPage("privacy.html", "Privacy Policy | Car Repair Wala", "Privacy policy", [
  ["What we collect", `<p>When you request an estimate or booking we may collect your name, mobile number, car details, optional registration number, service needs, and pickup address and PIN code if you request pickup. We do not ask for payment card details, ID documents or other sensitive information on this website.</p>`],
  ["How it's used", `<p>To contact you about your enquiry, arrange pickup and service, and send your quotation and bill. Feedback you send through the review form is used to respond to your experience. Your display name, rating, car model, service and feedback are published only if you choose the optional publication permission and the garage approves the review. Private feedback is not published.</p>`],
  ["Location (optional)", `<p>The booking form never asks for your location unless you tap “Use my current location”. If you tap it, your browser asks your permission and then shares your position with the page. It is used only to fill in your pickup address: the position is sent to OpenStreetMap's address lookup service (Nominatim) to find the street and PIN code, a small OpenStreetMap map is shown so you can adjust the pin, and a Google Maps link to that spot is included in your booking so the driver can find you. You can clear it with “Don’t use my location” or simply type your address instead.</p>`],
  ["WhatsApp", `<p>If you use the WhatsApp buttons, your message is sent through WhatsApp and is subject to WhatsApp's own privacy policy.</p>`],
  ["Images", `<p>Images and fonts are served with this website. Stock photos, where used, are credited. External services such as WhatsApp or Google receive connection information when you follow their links.</p>`],
  ["Storage", `<p>The cost estimator runs in your browser. Booking details you send are kept only as long as needed for your service and records.</p><p>The estimator temporarily keeps its booking handoff in session storage in this browser tab; closing the tab clears that session. Language preference is saved locally. Online booking form submissions are stored in Car Repair Wala's private Supabase database for authorised owner access, so the garage can contact you about the request. WhatsApp buttons and the service-page quick-enquiry forms prepare messages that you must send in WhatsApp. Private job files and billing records may also be stored there. Technical request identifiers and short-lived rate limits help prevent duplicate requests and abuse. Contact the garage about access, correction, deletion and record retention; billing records may need to be retained for legal requirements.</p>`],
  ["Your choices", `<p>Ask us at any time to see or delete the details we hold about you by contacting <span data-phone>${esc(B.phoneDisplay)}</span>.</p>`]
], "How Car Repair Wala handles customer data from estimates and bookings.");
const policies = legalPage("policies.html", "Cancellation, Pickup & Billing Policy | Car Repair Wala", "Cancellation, pickup & billing", [
  ["Indicative estimates", `<p><strong>All estimates are indicative until the car is inspected.</strong> The quotation after inspection is the price you approve.</p>`],
  ["Additional repairs", `<p>If more work is needed, we send the details and cost first. Nothing extra is done without your confirmation.</p>`],
  ["Itemised final bill", `<p>The final bill lists labour, each part, consumables and any taxes separately.</p>`],
  ["Pickup and drop", `<p>Free pickup and drop is available only in listed areas and when a slot is free. Areas marked as needing confirmation may have a charge, which we tell you before pickup.</p>${PH("Confirm the pickup address, time, vehicle handover and any fuel, toll or transport charges with the garage before pickup.")}`],
  ["Cancellation", PH("To cancel or reschedule, call or WhatsApp the garage as early as possible. Confirm any charges for work, diagnosis or transport already authorised before approving that work.")]
], "Cancellation, pickup and drop, additional repair approval and billing policy.");

const notFound = layout({ file: "404.html", title: "Page not found | Car Repair Wala", desc: "Page not found.", body: `<section class="page-hero"><div class="wrap"><h1>Page not found</h1><p>The page you're looking for doesn't exist. Try the cost estimator or message us on WhatsApp.</p><div class="hero-ctas"><a class="btn" href="index.html">Go to homepage</a><a class="btn btn--wa" data-wa="general" href="https://wa.me/${B.whatsapp}">WhatsApp us</a></div></div></section>` });

/* ------------------------------ New pages (v1.1) ------------------------------ */
function estimatePage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Cost calculator</p><span class="eyebrow">Cost calculator</span><h1>Car service cost calculator</h1><p>Choose your car and the work you need to see an estimated price range for labour, parts and time — before you book.</p></div></section>
<section class="band"><div class="wrap two-col">
  <div class="jobcard" id="estimate" data-estimator data-heading-level="2"><noscript><p style="padding:20px">The cost calculator needs JavaScript. Message us on WhatsApp for a quote.</p></noscript></div>
  <aside class="side-card" aria-label="How the estimate works">
    <h2 class="aside-title">How the estimate works</h2>
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
  return layout({ file: "estimate.html", title: "Car Service Cost Calculator Indore | Car Repair Wala", desc: "Estimate your car service or repair cost in Indore. Pick your car and services to see labour, parts and time ranges, then book on WhatsApp.", body, navKey: "estimate.html" });
}

function galleryPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Service Gallery</p><span class="eyebrow">Gallery</span><h1>${esc(GALLERY.title)}</h1><p>${esc(GALLERY.subtitle)}</p><div class="hero-ctas"><a class="btn" href="tel:${B.phoneE164}" data-tel data-call-now>${ic("phone")}Call Now</a><a class="btn btn--wa" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}WhatsApp us</a></div></div></section>
<section class="band"><div class="wrap">
  <h2 class="sr-only">Service photo comparisons</h2>
  <div class="filters" data-gallery-filters="#ba-all" role="toolbar" aria-label="Filter by category"></div>
  <div class="ba-grid" id="ba-all" data-gallery></div>
</div></section>
${ctaBand("Want a result like this for your car?")}`;
  return layout({ file: "gallery.html", title: "Service Gallery | Car Repair Wala", desc: "Explore car servicing, denting, painting, cleaning, suspension and mechanical repairs in the Car Repair Wala service gallery.", body, navKey: "gallery.html" });
}

function reviewsPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / Reviews</p><span class="eyebrow">Reviews</span><h1>Customer reviews</h1><p>Had your car serviced at Car Repair Wala? Share your experience. We’ll publish genuine customer feedback here with permission.</p></div></section>
${reviewsSection(true)}
${reviewForm()}
<section class="band"><div class="wrap prose">
  <h2 style="margin-top:0">Our review policy</h2>
  <ul>
    <li>Reviews are approved by the garage owner and credited to their source. Customer-submitted feedback is published with permission.</li>
    <li>We don't edit what customers say, apart from removing phone numbers or other personal details.</li>
    <li>We do not publish customer phone numbers, addresses or other private contact details.</li>
  </ul>
</div></section>`;
  return layout({ file: "reviews.html", title: "Customer Reviews | Car Repair Wala", desc: "Reviews from Car Repair Wala customers and how to share your own feedback on car servicing and repairs.", body, navKey: "reviews.html" });
}

function aboutPage() {
  const body = `
<section class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / About us</p><span class="eyebrow">About us</span><h1>About Car Repair Wala</h1><p>A local multi-brand garage in ${esc(B.city)} for servicing, maintenance and repairs, built around clear estimates and your approval at every step.</p></div></section>
<section class="band band--white"><div class="wrap two-col">
  <div class="prose">
    ${B.ownerName ? `<p>Car Repair Wala is owned by <strong>${esc(B.ownerName)}</strong>.</p>` : ""}
    <h2 style="margin-top:0">How we work</h2>
    <p>Car repairs are stressful when you don't know what you're paying for. We show you an estimated range before you book, inspect the car, and send a quotation you approve before any work starts.</p>
    <p>If we find something else during the job, we call or WhatsApp you with the reason and cost first. Your final bill lists labour and every part separately.</p>
    <h2>What we work on</h2>
    <p>Periodic servicing, AC, brakes and clutch, suspension and steering, battery and electrical faults, diagnostics, denting and painting, detailing and pre-purchase inspections — for most car brands sold in India.</p>
    <h2>Talk to us</h2>
    <p>Tell us about your car and the problem you’re facing. We’ll confirm whether we can help, explain the next steps and share a quotation before work starts.</p>
    ${B.address ? `<h2>Visit our workshop</h2><p data-workshop-address>${esc(addressText())}</p>${mapLink(true)}` : ""}
    <h2>Workshop services</h2>
    ${photo("workshop-cars", { sizes: "(max-width: 900px) 100vw, 60vw" })}
    ${B.hours ? `<p>Opening hours: ${hoursText()}. To check a slot for your car, <a href="contact.html">call or WhatsApp us</a> before visiting.</p>` : `<p>For opening hours and appointment availability, <a href="contact.html">contact us before visiting</a>.</p>`}
  </div>
  <div style="display:grid;gap:18px;align-content:start">
    <div class="brand-stamp">${LOGO}${WORDMARK}</div>
    <div class="why" style="grid-template-columns:minmax(0,1fr)">
      <div>${ic("receipt")}<h3>Estimate first</h3><p>See the likely cost before you book.</p></div>
      <div>${ic("shield")}<h3>Your approval</h3><p>No extra work without your OK.</p></div>
      <div>${ic("truck")}<h3>Pickup &amp; drop</h3><p>Free across our confirmed Indore PIN codes, subject to booking confirmation.</p></div>
    </div>
    <a class="btn btn--block" href="booking.html">${ic("calendar")}Book online</a>
    <a class="btn btn--wa btn--block" data-wa="general" href="https://wa.me/${B.whatsapp}">${ic("wa")}Chat on WhatsApp</a>
    <a class="btn btn--outline btn--block" href="reviews.html#write-review">${ic("star")}Write a website review</a>
  </div>
</div></section>`;
  return layout({ file: "about.html", title: "About Us | Car Repair Wala — Multi-brand Car Garage", desc: "About Car Repair Wala, a multi-brand car service and repair garage in Indore focused on transparent estimates and customer approval.", body, navKey: "about.html" });
}

/* ------------------------------ Write ------------------------------ */
const pages = {
  "index.html": homepage(), "services.html": servicesHub(), "booking.html": bookingPage(), "pickup-drop.html": pickupPage(),
  "contact.html": contactPage(), "terms.html": terms, "privacy.html": privacy, "policies.html": policies, "404.html": notFound,
  "estimate.html": estimatePage(), "gallery.html": galleryPage(), "reviews.html": reviewsPage(), "about.html": aboutPage()
};
SERVICE_PAGES.forEach((p) => { pages[p.file] = servicePage(p); });
LANDING_PAGES.forEach((p) => { pages[p.file] = landingPage(p); });
for (const file of ["accident-repair-indore.html", "emergency-car-repair-indore.html"]) {
  if (!pages[file] && existsSync(join(ROOT, file))) unlinkSync(join(ROOT, file));
}
for (const [f, html] of Object.entries(pages)) writeFileSync(join(ROOT, f), html);
// A small generated public data file lets the owner copy the workshop address
// into private invoice settings without loading pricing or duplicating data.
writeFileSync(join(ROOT, "assets/js/workshop-details.js"), `/* Generated by tools/build.mjs from config.js; public business details only. */\nwindow.GW_WORKSHOP = Object.freeze(${JSON.stringify({ name: B.name, invoiceFooter: `Thank you for choosing ${B.name}.`, addressText: addressText(), googleProfileUrl: B.googleBusinessProfileUrl })});\n`);

const today = BUILD_DATE;
const indexable = Object.keys(pages).filter((f) => f !== "404.html");
if (siteUrl) writeFileSync(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((f) => `  <url><loc>${esc(url(f))}</loc><lastmod>${today}</lastmod><priority>${f === "index.html" ? "1.0" : [...SERVICE_PAGES, ...LANDING_PAGES].some((p) => p.file === f) ? "0.8" : "0.5"}</priority></url>`).join("\n")}
</urlset>
`);
if (!siteUrl && existsSync(join(ROOT, "sitemap.xml"))) unlinkSync(join(ROOT, "sitemap.xml"));
writeFileSync(join(ROOT, "robots.txt"), siteUrl ? `User-agent: *\nAllow: /\nDisallow: /Project/admin/\nDisallow: /admin/\n\nSitemap: ${siteUrl}/sitemap.xml\n` : "User-agent: *\nDisallow: /\n");

/* ------------------------------ AI discovery files ------------------------------ */
// llms.txt, /.well-known/ai.txt, /ai/*.json and feed.xml, generated from the same config as the pages
// so AI search tools read the same facts customers see. Only written for a real HTTPS domain.
const AI_FILES = ["llms.txt", ".well-known/ai.txt", "ai/summary.json", "ai/faq.json", "ai/service.json", "feed.xml"];
if (siteUrl) {
  const pageMeta = (file) => createSeo({ file, title: "", description: "", business: B, siteUrl, services: [...SERVICE_PAGES, ...LANDING_PAGES], serviceCount: C.services.length });
  const md = (file, label) => { const m = pageMeta(file); return `- [${label || m.name}](${url(file)}): ${m.description}`; };
  const svcPages = [...SERVICE_PAGES, ...LANDING_PAGES];
  const address = B.address ? addressText() : `${B.city}, ${B.state}`;
  const hours = B.hours ? hoursText() : "Please call to confirm";
  const allFaqs = [...C.faqs, ...SERVICE_PAGES.flatMap((p) => p.faqs || []), ...LANDING_PAGES.flatMap((p) => p.faqs || [])]
    .filter((f, i, a) => a.findIndex((x) => x.q === f.q) === i);
  const summaryText = `${B.name} is an independent multi-brand car garage in ${B.city}, ${B.state} (India) for car servicing, AC repair, brakes and clutch, battery and electrical work, diagnostics, denting and painting, detailing and car wash. Estimates are shown before booking, extra work is done only with the customer's approval, and pickup and drop is free in confirmed ${B.city} PIN codes.`;
  const llms = `# ${B.name}

> ${summaryText}

- Owner: ${B.ownerName || "—"}
- Address: ${address}
- Phone and WhatsApp: ${B.phoneDisplay}
- Opening hours: ${hours}
- Areas served: ${[B.city, ...(B.areasServed || [])].join(", ")}
- Google Maps: ${B.googleBusinessProfileUrl || B.googleMapsSearchUrl || ""}
${B.instagramUrl ? `- Instagram: ${B.instagramUrl}\n` : ""}- Not affiliated with any car manufacturer; brand names identify the cars we work on.

## Main pages

${md("index.html", "Home")}
${md("services.html", "Services and prices")}
${md("estimate.html", "Cost calculator")}
${md("booking.html", "Book online")}
${md("pickup-drop.html", "Free pickup and drop areas")}
${md("contact.html", "Contact and directions")}
${md("about.html", "About us")}
${md("reviews.html", "Customer reviews")}
${md("gallery.html", "Gallery")}

## Services

${svcPages.map((p) => md(p.file, p.h1)).join("\n")}

## Common questions

${C.faqs.map((f) => `- **${f.q}** ${f.a}`).join("\n")}

## Optional

${md("terms.html", "Terms and conditions")}
${md("privacy.html", "Privacy policy")}
${md("policies.html", "Cancellation, warranty and payment policies")}
`;
  const write = (rel, text) => { const out = join(ROOT, rel); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, text); };
  write("llms.txt", llms);
  write(".well-known/ai.txt", `# ${B.name} — AI crawler policy (${siteUrl})
# AI assistants and search engines may read and cite all public pages.
# Please quote prices as indicative estimates; the final price is confirmed after inspection.
User-agent: *
Allow: /
Disallow: /admin/

Contact: tel:${B.phoneE164}
Summary: ${siteUrl}/llms.txt
Sitemap: ${siteUrl}/sitemap.xml
`);
  const json = (v) => JSON.stringify(v, null, 2) + "\n";
  write("ai/summary.json", json({
    name: B.name, description: summaryText, url: siteUrl + "/", type: "AutoRepair", owner: B.ownerName || null,
    telephone: B.phoneE164, whatsapp: "https://wa.me/" + B.whatsapp, address, city: B.city, region: B.state, country: B.country,
    openingHours: hours, areasServed: [B.city, ...(B.areasServed || [])], languages: ["en-IN", "hi-IN"],
    sameAs: [B.googleBusinessProfileUrl, B.instagramUrl].filter(Boolean), llms: siteUrl + "/llms.txt", dateModified: BUILD_DATE
  }));
  write("ai/faq.json", json({ name: B.name, url: siteUrl + "/", dateModified: BUILD_DATE, faqs: allFaqs.map((f) => ({ question: f.q, answer: f.a })) }));
  write("ai/service.json", json({
    name: B.name, url: siteUrl + "/", provider: "AutoRepair", areaServed: [B.city, ...(B.areasServed || [])], priceList: url("services.html"),
    booking: url("booking.html"), contact: { telephone: B.phoneE164, whatsapp: "https://wa.me/" + B.whatsapp },
    capabilities: svcPages.map((p) => ({ name: p.h1, url: url(p.file), description: pageMeta(p.file).description })), dateModified: BUILD_DATE
  }));
  const rssDate = new Date(BUILD_DATE + "T00:00:00+05:30").toUTCString();
  write("feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(B.name)} — car service and repair in ${esc(B.city)}</title>
  <link>${esc(siteUrl)}/</link>
  <atom:link href="${esc(siteUrl)}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>${esc(summaryText)}</description>
  <language>en-IN</language>
  <lastBuildDate>${rssDate}</lastBuildDate>
${["index.html", "services.html", ...svcPages.map((p) => p.file), "pickup-drop.html", "about.html"].map((f) => { const m = pageMeta(f); return `  <item><title>${esc(m.title)}</title><link>${esc(url(f))}</link><guid isPermaLink="true">${esc(url(f))}</guid><pubDate>${rssDate}</pubDate><description>${esc(m.description)}</description></item>`; }).join("\n")}
</channel>
</rss>
`);
} else {
  for (const rel of AI_FILES) if (existsSync(join(ROOT, rel))) unlinkSync(join(ROOT, rel));
}
if (!siteUrl) console.log("Preview build: indexing disabled until SITE_URL or business.siteUrl is set to your HTTPS domain.");
console.log("Built " + Object.keys(pages).length + " pages + " + (siteUrl ? "sitemap.xml + " + AI_FILES.join(" + ") + " + " : "") + "robots.txt into public/");
