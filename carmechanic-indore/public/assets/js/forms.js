/* Shared booking validation. No customer details leave this module. */
(function (root) {
  "use strict";
  function today(timeZone = "Asia/Kolkata", now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(now);
    const value = (type) => parts.find((p) => p.type === type).value;
    return `${value("year")}-${value("month")}-${value("day")}`;
  }
  function dateError(value, minimum, badInput = false) {
    if (badInput) return "Enter a valid date.";
    if (!value) return "";
    const parsed = new Date(value + "T12:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return "Enter a valid date.";
    return value < minimum ? "Choose today or a future date." : "";
  }
  function validPin(value) { return /^[1-9]\d{5}$/.test(String(value).trim()); }
  const maxServices = 30;
  function quantityError(value, maximum) {
    const n = Number(value);
    return /^\d+$/.test(String(value)) && Number.isSafeInteger(n) && n >= 1 && n <= maximum
      ? "" : `Enter a whole number from 1 to ${maximum}.`;
  }
  function receipt(value, requestId = "") {
    return !!value && typeof value === "object" && value.received === true &&
      (!requestId || !Object.hasOwn(value, "requestId") || value.requestId === requestId);
  }
  function draft(cfg, value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out = {};
    out.yearExact = value.yearExact === true;
    for (const key of ["name", "brand", "model", "year", "fuel", "category", "partsGrade", "symptoms", "pickup", "area", "date", "time", "estimate"]) {
      if (typeof value[key] === "string") out[key] = value[key].slice(0, 1000);
    }
    // Old releases used 2004 as the value of "Before 2005", not an exact year.
    if (out.year === "2004" && !out.yearExact) delete out.year;
    const byId = Object.fromEntries(cfg.services.map((s) => [s.id, s]));
    out.services = [...new Set(Array.isArray(value.services) ? value.services.filter((id) => typeof id === "string" && Object.hasOwn(byId, id)) : [])];
    out.qty = {};
    for (const id of out.services) {
      const svc = byId[id];
      if (svc.qty) out.qty[id] = Math.max(1, Math.min(svc.qty.max, Math.floor(Number(value.qty && value.qty[id])) || 1));
    }
    out.lights = Array.isArray(value.lights) ? value.lights.filter((s) => typeof s === "string").slice(0, 6) : [];
    return out;
  }
  // Service search: every typed word must match the START of a word in the text,
  // so "brak" finds "Brake pads" but not "replACement". A
  // two-letter word that is itself a word in the service list (e.g. "AC") must match
  // that whole word, so "AC" skips "Accident"; "b" and "br" still match word starts.
  function searchWords(text) {
    return String(text == null ? "" : text).toLowerCase().split(/[^a-z0-9\u0900-\u097f]+/).filter(Boolean);
  }
  function searchVocabulary(texts) {
    const v = new Set();
    (texts || []).forEach((t) => searchWords(t).forEach((w) => v.add(w)));
    return v;
  }
  function searchMatch(text, query, vocabulary) {
    const terms = searchWords(query);
    if (!terms.length) return true;
    const words = searchWords(text);
    return terms.every((t) => {
      const whole = t.length === 2 && vocabulary && vocabulary.has(t);
      return words.some((w) => (whole ? w === t : w.startsWith(t)));
    });
  }
  const api = { today, dateError, validPin, quantityError, maxServices, receipt, draft, searchMatch, searchVocabulary };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CMI_FORMS = api;
})(typeof window !== "undefined" ? window : this);
