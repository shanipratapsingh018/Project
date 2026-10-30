/* =====================================================================
   Estimate engine — pure functions, no DOM. Prices come from rate-card.js.
   Tested by tests/estimate.test.js and tests/ratecard.test.js (which checks
   every figure against docs/rate-card/proposed_rate_card.csv).
   ===================================================================== */
(function (root) {
  // Round to the step, half away from zero, after removing float noise (matches the Excel workbook).
  function roundTo(n, step) { return Math.floor(Math.round(n * 100) / 100 / step + 0.5) * step; }

  function formatINR(n) {
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }

  function formatRange(r) {
    if (r[0] === r[1]) return formatINR(r[0]);
    return formatINR(r[0]) + " – " + formatINR(r[1]);
  }

  function formatHours(h) {
    const [a, b] = h;
    if (b <= 10) {
      const f = (x) => (x % 1 ? x.toFixed(1) : String(x));
      return a === b ? f(a) + " hours" : f(a) + "–" + f(b) + " hours";
    }
    const da = Math.max(1, Math.ceil(a / 8)), db = Math.max(da, Math.ceil(b / 8));
    return da === db ? da + " working day" + (da > 1 ? "s" : "") : da + "–" + db + " working days";
  }

  /** Category factor for a service: its own factor, else the site default. null → quote. */
  function factorFor(cfg, s, category) {
    if (!category || category === "hatchback") return 1;
    const own = s.factors ? s.factors[category] : null;
    if (own != null) return own;
    const d = cfg.pricing.defaultFactors || {};
    return d[category] != null ? d[category] : null;
  }

  /** What a single service shows before any car details (used by lists and price tables). */
  function serviceStatus(s, fuel) {
    if (s.inspectionRequired) return "inspection";
    if (fuel && (s.notFor || []).includes(fuel)) return "not-applicable";
    if (fuel && (s.quoteFor || []).includes(fuel)) return "quote";
    if (!s.labour) return "quote";
    return "priced";
  }

  /**
   * @param {object} cfg   CONFIG (services from rate-card.js)
   * @param {object} input { category, fuel, year, partsGrade, services:[{id, qty}], pickup, nowYear }
   */
  function estimate(cfg, input) {
    const P = cfg.pricing;
    const step = P.roundTo || 50;
    const category = input.category || "hatchback";
    const fuel = input.fuel || "petrol";
    const fuelF = (P.fuelMultiplier || {})[fuel] || 1;
    const grade = ((P.partsGrade || {})[input.partsGrade] || { factor: 1 }).factor;
    const nowYear = input.nowYear || new Date().getFullYear();
    const age = input.year ? nowYear - Number(input.year) : 0;
    const ageF = P.ageRule && age > P.ageRule.olderThanYears ? P.ageRule.labourFactor : 1;

    const byId = Object.fromEntries(cfg.services.map((s) => [s.id, s]));
    const selected = [...new Map((input.services || []).filter((s) => s && typeof s.id === "string" && Object.hasOwn(byId, s.id)).map((s) => [s.id, s])).values()];
    const selectedIds = new Set(selected.map((s) => s.id));

    // Which selected services are already included in another selected service?
    // Only a job that is actually being priced can absorb another one (a job shown as
    // "quote" or "inspection" must not hide the price of the jobs it would include).
    const willPrice = (id) => serviceStatus(byId[id], fuel) === "priced" && factorFor(cfg, byId[id], category) != null;
    const coveredBy = {};
    selected.forEach(({ id }) => {
      if (!willPrice(id)) return;
      (byId[id].covers || []).forEach((c) => { if (selectedIds.has(c) && c !== id && !coveredBy[c] && !(byId[c].covers || []).includes(id)) coveredBy[c] = id; });
    });

    const lines = [], includes = [], excludes = [], notes = [], inspection = [], quotes = [], notApplicable = [];
    let labour = [0, 0], parts = [0, 0], pricedJobs = 0, partsQuoted = false;
    let hMin = 0, hMax = 0;

    selected.forEach(({ id, qty }) => {
      const s = byId[id];
      const q = s.qty ? Math.max(1, Math.min(s.qty.max || 10, Math.floor(Number(qty)) || 1)) : 1;
      const line = { id, name: s.name, qty: s.qty ? q : null, unit: s.unit || null };
      const status = serviceStatus(s, fuel);

      if (status === "not-applicable") { line.status = status; line.reason = "Not applicable for " + fuel + " cars"; notApplicable.push(s.name); lines.push(line); return; }
      if (coveredBy[id]) { line.status = "covered"; line.coveredBy = byId[coveredBy[id]].name; lines.push(line); return; }
      if (status === "inspection") { line.status = "inspection"; inspection.push(s.name); lines.push(line); return; }
      if (status === "quote") {
        line.status = "quote";
        line.reason = s.labour ? "Price on request for " + fuel + " cars" : "Price on request";
        quotes.push(s.name); lines.push(line); return;
      }
      const f = factorFor(cfg, s, category);
      if (f == null) {
        line.status = "quote"; line.reason = "Quote after inspection for this vehicle category";
        quotes.push(s.name); lines.push(line); return;
      }

      // total first (so a single standard job equals the published rate card), then split labour/parts
      const pf = (s.fuelSensitive ? fuelF : 1) * grade;
      const pr = s.parts || [0, 0];
      const rawL = [s.labour[0] * f * ageF * q, s.labour[1] * f * ageF * q];
      const rawT = [rawL[0] + pr[0] * f * pf * q, rawL[1] + pr[1] * f * pf * q];
      line.total = [roundTo(rawT[0], step), roundTo(rawT[1], step)];
      line.labour = [Math.min(roundTo(rawL[0], step), line.total[0]), Math.min(roundTo(rawL[1], step), line.total[1])];
      line.parts = s.parts ? [line.total[0] - line.labour[0], line.total[1] - line.labour[1]] : null;
      if (!s.parts) { line.partsQuoted = true; partsQuoted = true; line.partsNote = s.partsNote || "Parts quoted by model"; }
      line.status = "priced";

      hMin = Math.max(hMin, s.hours[0]);
      hMax += s.hours[1] * (s.qty ? Math.sqrt(q) : 1);
      labour = [labour[0] + line.labour[0], labour[1] + line.labour[1]];
      if (line.parts) parts = [parts[0] + line.parts[0], parts[1] + line.parts[1]];
      pricedJobs++;
      (s.includes || []).forEach((i) => includes.push(i));
      (s.excludes || []).forEach((e) => excludes.push(e));
      lines.push(line);
    });

    const subtotal = [labour[0] + parts[0], labour[1] + parts[1]];
    const tax = P.taxes && P.taxes.enabled ? [roundTo(subtotal[0] * P.taxes.rate, 10), roundTo(subtotal[1] * P.taxes.rate, 10)] : null;

    let pickup;
    switch (input.pickup) {
      case "free": pickup = { label: P.pickup.freeLabel, amount: [0, 0], note: "Subject to booking confirmation" }; break;
      case "confirm": pickup = { label: P.pickup.confirmLabel, amount: null, note: "We'll confirm the charge before pickup" }; break;
      case "outside": pickup = P.pickup.outsideFee
        ? { label: "Pickup & drop (outside free area)", amount: P.pickup.outsideFee }
        : { label: "Outside our confirmed pickup area", amount: null, note: "Self drop-in, or ask us on WhatsApp" }; break;
      case "none": pickup = { label: "Self drop-in at workshop", amount: [0, 0] }; break;
      default: pickup = { label: "Pickup & drop", amount: null, note: "Check your PIN to see if it's free" };
    }

    const pickupAmt = pickup.amount || [0, 0];
    const total = [subtotal[0] + (tax ? tax[0] : 0) + pickupAmt[0], subtotal[1] + (tax ? tax[1] : 0) + pickupAmt[1]];

    if (ageF > 1) notes.push("Cars older than " + P.ageRule.olderThanYears + " years usually need extra labour time; this is included in the range.");
    if (grade !== 1 && pricedJobs) notes.push("Parts prices adjusted for the parts grade you chose.");
    if (partsQuoted) notes.push("Some jobs show labour only — parts are quoted for your exact model before work starts.");

    return {
      isDemo: !!P.isDemo,
      lines, labour, parts, tax, taxLabel: tax ? P.taxes.label + " " + Math.round(P.taxes.rate * 100) + "%" : null,
      pickup, total, pricedJobs, partsQuoted,
      hours: pricedJobs ? [hMin, Math.max(hMin, Math.round(hMax * 2) / 2)] : null,
      includes: [...new Set(includes)], excludes: [...new Set(excludes)], notes: [...new Set(notes)],
      inspection, quotes, notApplicable
    };
  }

  /** Price for one service and category with default options (hatchback base, petrol, standard parts). */
  function quickRange(cfg, id, category, fuel) {
    const r = estimate(cfg, { category, fuel: fuel || "petrol", partsGrade: "standard", services: [{ id, qty: 1 }], pickup: "none" });
    const l = r.lines[0];
    if (!l) return { status: "unknown" };
    if (l.status !== "priced") return { status: l.status, text: l.status === "inspection" ? "Inspection required — request a quote" : l.reason || "Price on request" };
    return { status: "priced", range: l.total, partsQuoted: !!l.partsQuoted, text: formatRange(l.total) + (l.partsQuoted ? " + parts" : "") };
  }

  const API = { estimate, quickRange, factorFor, serviceStatus, formatINR, formatRange, formatHours, roundTo };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CMI_PRICING = API;
})(typeof window !== "undefined" ? window : this);
