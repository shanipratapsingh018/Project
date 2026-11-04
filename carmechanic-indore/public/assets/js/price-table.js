/* Price tables — pure HTML builders shared by the page generator (static HTML for
   SEO / no-JS visitors) and the browser (refreshed from rate-card.js on load). */
(function (root) {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function cell(C, PR, id, cat) {
    const q = PR.quickRange(C, id, cat);
    if (q.status === "priced") return `<td class="num">${esc(PR.formatRange(q.range))}${q.partsQuoted ? '<span class="pt-sub">+ parts</span>' : ""}</td>`;
    if (q.status === "inspection") return `<td class="num pt-q">Quote after inspection</td>`;
    return `<td class="num pt-q">${cat === "luxury" && PR.serviceStatus(C.services.find((s) => s.id === id)) === "priced" ? "Quote after inspection" : "Price on request"}</td>`;
  }

  /** Table of services × vehicle categories. */
  function rateTable(C, PR, ids, opts) {
    opts = opts || {};
    const byId = Object.fromEntries(C.services.map((s) => [s.id, s]));
    const rows = ids.map((id) => byId[id]).filter(Boolean).map((s) => {
      const name = `<th scope="row"><span class="pt-name">${esc(s.name)}</span><span class="pt-sub">${esc(s.unit)}${s.partsNote && !/^Included/.test(s.partsNote) ? " · " + esc(s.partsNote) : ""}</span></th>`;
      if (s.inspectionRequired) return `<tr data-svc-row="${s.id}">${name}<td class="num pt-q" colspan="${C.categories.length}">Inspection required — request a quote</td></tr>`;
      if (!s.labour) return `<tr data-svc-row="${s.id}">${name}<td class="num pt-q" colspan="${C.categories.length}">Price on request</td></tr>`;
      return `<tr data-svc-row="${s.id}">${name}${C.categories.map((c) => cell(C, PR, s.id, c.id)).join("")}</tr>`;
    }).join("");
    return `<div class="rate-table-block"><p class="table-scroll-hint">Swipe or scroll to compare all vehicle categories →</p><div class="table-scroll" role="region" aria-label="Service prices by vehicle category" tabindex="0"><table class="rate-table${opts.compact ? " rate-table--compact" : ""}">${opts.caption ? `<caption>${esc(opts.caption)}</caption>` : ""}
      <thead><tr><th scope="col">Service</th>${C.categories.map((c) => `<th scope="col" class="num">${esc(c.label)}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  }

  /** Short footnote under every price table. */
  function footnote(C) {
    return `<p class="small muted pt-foot">Indicative prices for petrol cars with standard parts, rounded to ₹50. Final price after inspection — no extra work without your approval.${C.pricing.taxes && C.pricing.taxes.enabled ? "" : " Taxes as per final bill."}${C.pricing.isDemo ? " <strong>Demo prices.</strong>" : ""}</p>`;
  }

  /** Full price list grouped by category (Services page). */
  function priceList(C, PR) {
    const groups = [];
    C.services.forEach((s) => {
      let g = groups.find((x) => x.cat === s.category);
      if (!g) groups.push((g = { cat: s.category, group: s.group, ids: [] }));
      g.ids.push(s.id);
    });
    return groups.map((g) => `<section class="pl-group" id="${esc(g.group.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}">
      <h2>${esc(g.cat.replace(/^\d+\.\s*/, ""))}</h2>${rateTable(C, PR, g.ids)}</section>`).join("") + footnote(C);
  }

  /** Individual service cards: the same engine and ranges as the comparison tables. */
  function serviceCards(C, PR) {
    return C.services.map((s) => {
      const q = PR.quickRange(C, s.id, "hatchback");
      const status = q.status === "priced" ? "Published estimate" : q.status === "inspection" ? "Inspection first" : "Let’s talk";
      return `<article class="service-menu-card" data-service-card="${esc(s.id)}" data-service-group="${esc(s.group)}">
        <div class="service-card-top"><span class="service-card-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${esc(s.icon || "service")}"/></svg></span><span class="service-card-group">${esc(s.group)}</span></div>
        <h3>${esc(s.name)}</h3><p class="service-card-description">${esc((s.includes || [])[0] || "Tell us about your car and we’ll confirm the work needed.")}</p>
        <div class="service-card-cost"><span class="service-price-status" data-service-price-status>${status}</span><strong data-service-range>${esc(q.text)}</strong><span class="service-unit">${esc(s.unit || "per job")}</span></div>
        <div class="service-card-footer"><span>${esc(PR.formatHours(s.hours))}<small>typical time</small></span><a href="booking.html?service=${encodeURIComponent(s.id)}" aria-label="Request ${esc(s.name)}">${q.status === "priced" ? "Book service" : "Request quote"}<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"/></svg></a></div>
      </article>`;
    }).join("");
  }

  /** "From ₹x" teaser for a list of services (cheapest priced hatchback low). */
  function fromPrice(C, PR, ids) {
    let min = null;
    ids.forEach((id) => { const q = PR.quickRange(C, id, "hatchback"); if (q.status === "priced" && q.range[0] > 0 && (min == null || q.range[0] < min)) min = q.range[0]; });
    return min == null ? null : PR.formatINR(min);
  }

  const API = { rateTable, priceList, footnote, fromPrice, serviceCards };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CMI_PRICE_TABLE = API;
})(typeof window !== "undefined" ? window : this);
