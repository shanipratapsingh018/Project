/* CarMechanic Indore — front-end behaviour (no framework, no build step).
   Depends on config.js and pricing.js loaded first. */
(function () {
  "use strict";
  const C = window.CMI_CONFIG, PR = window.CMI_PRICING;
  if (!C || !PR) return;
  const B = C.business, F = window.CMI_FORMS;
  const today = () => F.today(B.timeZone || "Asia/Kolkata");
  function dateIssue(el) { el.min = today(); return F.dateError(el.value, el.min, el.validity.badInput); }
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    remove(k) { try { sessionStorage.removeItem(k); } catch (e) {} },
    lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const svcById = Object.fromEntries(C.services.map((s) => [s.id, s]));
  const brandById = Object.fromEntries(C.brands.map((b) => [b.id, b]));
  const LUX = ["bmw", "mercedes", "audi"];
  const RATE_V = (window.CMI_RATE_CARD && window.CMI_RATE_CARD.version) || "";
  function errorBox(el) {
    const parent = el.closest(".field, .qty-item") || el.parentElement;
    let box = $(".err", parent);
    if (!box) { box = document.createElement("p"); box.className = "err"; box.hidden = true; parent.appendChild(box); }
    if (!box.id) box.id = (el.id || "field") + "-error";
    box.setAttribute("aria-live", "polite");
    const ids = new Set((el.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    ids.add(box.id); el.setAttribute("aria-describedby", [...ids].join(" "));
    return box;
  }
  function fieldError(el, message) {
    const box = errorBox(el); box.textContent = message || ""; box.hidden = !message;
    message ? el.setAttribute("aria-invalid", "true") : el.removeAttribute("aria-invalid");
    return !message;
  }
  function focusStep(step) {
    const heading = $(".step-title h3, .step-title h2", step) || $("legend", step);
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }

  /* ---------- WhatsApp ---------- */
  function waUrl(text) { return "https://wa.me/" + B.whatsapp + (text ? "?text=" + encodeURIComponent(text) : ""); }
  window.CMI_waUrl = waUrl;
  function wireWhatsApp(root = document) {
    $$("[data-wa]", root).forEach((a) => {
      const svc = a.getAttribute("data-wa");
      const msg = svc && svc !== "general"
        ? `Hello ${B.name}, I'd like a quote for: ${svc}.\nCar (make/model/year): \nArea / PIN: `
        : `Hello ${B.name}, I'd like to book a car service.\nCar (make/model/year): \nService needed: \nArea / PIN: `;
      a.href = waUrl(msg);
      a.target = "_blank"; a.rel = "noopener";
    });
    $$("[data-tel]", root).forEach((a) => { a.href = "tel:" + B.phoneE164; });
  }

  /* ---------- Footer "Open now / Closed now" from config hours, in the garage's time zone ---------- */
  function openStatus(hours, timeZone, now = new Date()) {
    const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map((p) => [p.type, p.value]));
    const day = DAYS.indexOf(parts.weekday.slice(0, 2)), mins = Number(parts.hour) * 60 + Number(parts.minute);
    const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const covers = (spec) => String(spec).split(",").some((r) => {
      const [a, b] = r.trim().split("-").map((d) => DAYS.indexOf(d.slice(0, 2)));
      return b === undefined || b < 0 ? a === day : (a <= b ? day >= a && day <= b : day >= a || day <= b);
    });
    return (hours || []).some((h) => covers(h.days) && mins >= toMin(h.open) && mins < toMin(h.close));
  }
  function renderOpenStatus() {
    const els = $$("[data-open-status]");
    if (!els.length || !B.hours) return;
    let open;
    try { open = openStatus(B.hours, B.timeZone || "Asia/Kolkata"); } catch (e) { return; }
    els.forEach((el) => { el.textContent = open ? "Open now" : "Closed now"; el.classList.toggle("is-open", open); el.hidden = false; });
  }

  /* ---------- Service-area check (logic in area-check.js, data in service-areas.js) ---------- */
  const AREAS = window.CMI_AREAS, AREA = window.CMI_AREA;
  function checkArea(raw) { return AREA.checkArea(AREAS, raw); }
  function pickupWaText(r, query) {
    const where = r && r.pin ? `PIN ${r.pin}${r.locality ? " (" + r.locality + ")" : ""}` : (query ? `"${query}"` : "my area");
    return `Hello ${B.name}, please confirm if pickup and drop is available for ${where}.\nCar (make/model): \nPreferred date: `;
  }
  function areaMessage(r, query, opts = {}) {
    if (!r) return "";
    const tone = r.status === "covered" ? "ok" : r.status === "not-listed" ? "warn" : "bad";
    const icon = r.status === "covered" ? "check" : r.status === "not-listed" ? "pin" : "info";
    const where = r.pin ? `<span class="status-pin">PIN ${esc(r.pin)}${r.locality ? " · " + esc(r.locality) : ""}</span>` : "";
    const extra = r.status === "covered" && r.free ? `<span>Free pickup &amp; drop within our confirmed Indore service area.</span>` : "";
    const btn = opts.noButton ? "" : `<a class="btn btn--wa btn--sm" data-area-wa target="_blank" rel="noopener" href="${waUrl(pickupWaText(r, query))}">${ICON.wa} ${r.status === "covered" ? "Request pickup on WhatsApp" : "Ask us on WhatsApp"}</a>`;
    return `<div class="status status--${tone}" role="status" data-area-status="${r.status}"><svg viewBox="0 0 24 24" aria-hidden="true" class="status-ico"><use href="#i-${icon}"/></svg><div>${where}<strong>${esc(r.message)}</strong>${extra}</div></div>${btn}`;
  }
  function renderAreas() {
    const byPin = {};
    AREAS.localities.forEach(([n, pin]) => { (byPin[pin] = byPin[pin] || []).push(n); });
    $$("[data-area-list]").forEach((ul) => {
      ul.innerHTML = AREAS.coveredPins.map((pin) => `<li><b>${pin}</b>${byPin[pin] ? " " + esc(byPin[pin].slice(0, 2).join(", ")) : ""}</li>`).join("");
    });
    $$("[data-pin-count]").forEach((el) => { el.textContent = AREAS.coveredPins.length; });
    $$("form[data-area-check]").forEach((f) => {
      const input = f.querySelector("input");
      const out = f.parentElement.querySelector("[data-area-result]");
      const show = () => { out.innerHTML = areaMessage(checkArea(input.value), input.value.trim()); };
      // WhatsApp stays visible before any check too
      out.innerHTML = `<a class="btn btn--wa btn--sm" data-area-wa target="_blank" rel="noopener" href="${waUrl(pickupWaText(null, ""))}">${ICON.wa} Ask about pickup on WhatsApp</a>`;
      f.addEventListener("submit", (e) => { e.preventDefault(); show(); });
      input.addEventListener("input", () => { if (/^\s*\d{6}\s*$/.test(input.value)) show(); });
    });
  }

  /* ---------- Icons used by JS ---------- */
  const ICON = {
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-wa"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-calendar"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-phone"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-star"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"/></svg>'
  };

  /* ---------- Shared vehicle helpers ---------- */
  function fillBrands(sel) {
    sel.innerHTML = '<option value="">Select manufacturer</option>' + C.brands.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("");
  }
  function fillModels(sel, brandId) {
    const b = brandById[brandId];
    sel.innerHTML = '<option value="">' + (b ? "Select model" : "Select manufacturer first") + "</option>" +
      (b ? b.models.map((m) => `<option value="${esc(m[0])}" data-cat="${m[1]}">${esc(m[0])}</option>`).join("") : "");
    sel.disabled = !b;
  }
  function fillYears(sel) {
    const now = new Date().getFullYear();
    let h = '<option value="">Select year</option>';
    for (let y = now; y >= C.yearRange.from; y--) h += `<option>${y}</option>`;
    sel.innerHTML = h;
  }
  function chipsHtml(name, items, type = "radio") {
    return items.map((i) => `<label class="chip"><input type="${type}" name="${name}" value="${i.id}"><span>${esc(i.label)}</span></label>`).join("");
  }
  function cleanMobile(v) {
    let d = String(v || "").replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
    if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : null;
  }

  /* ---------- Estimator (2 steps: car & jobs → price) ---------- */
  // Popular jobs shown as tiles; each one ticks the matching service in the full list.
  const EST_TILES = [["GS-01", "Car service", "service"], ["AC-03", "AC service", "ac"], ["BR-01", "Brake check", "brake"], ["BD-01", "Dent & paint", "paint"], ["TB-05", "Battery", "battery"], ["GS-04", "Oil change", "oil"]];
  const svgUse = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  function rateDate() {
    try { return new Date(RATE_V + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); } catch (e) { return RATE_V; }
  }
  function mountEstimator(root) {
    const headingTag = root.dataset.headingLevel === "2" ? "h2" : "h3";
    const subHeadingTag = headingTag === "h2" ? "h3" : "h4";
    const state = { partsGrade: "standard", qty: {}, services: new Set() };
    const preset = (root.getAttribute("data-preset") || "").split(",").filter(Boolean);
    const groups = {};
    const calcServices = C.services.filter((s) => s.inCalculator !== false);
    calcServices.forEach((s) => { (groups[s.group] = groups[s.group] || []).push(s); });
    const catLabel = (id) => ((C.categories.find((c) => c.id === id) || {}).label || "Hatchback");
    const fuelLabel = (id) => ((C.fuels.find((f) => f.id === id) || {}).label || "");
    const fromText = (s, category = "hatchback", fuel = "petrol") => {
      const q = PR.quickRange(C, s.id, category, fuel);
      if (q.status === "priced") return catLabel(category) + " " + PR.formatINR(q.range[0]) + "–" + PR.formatINR(q.range[1]).slice(1) + (q.partsQuoted ? " + parts" : "") + (s.qty ? " · per " + s.unit.replace(/^per /, "") : "");
      if (q.status === "not-applicable") return "Not for " + fuelLabel(fuel).toLowerCase() + " cars";
      if (q.status === "inspection" || /inspection/i.test(q.text || "")) return "Quote after inspection";
      return "Price on request";
    };
    const tileText = (id, category = "hatchback", fuel = "petrol") => {
      const s = svcById[id], q = PR.quickRange(C, id, category, fuel);
      if (q.status === "priced") return "from " + PR.formatINR(q.range[0]) + (s.qty ? " / " + s.unit.replace(/^per /, "") : "");
      if (q.status === "not-applicable") return "Not for " + fuelLabel(fuel).toLowerCase() + " cars";
      return q.status === "inspection" ? "Quote after inspection" : "Price on request";
    };
    const carOptions = C.brands.filter((b) => b.models.length).flatMap((b) => b.models.map((m) => `<option value="${esc(b.name + " " + m[0])}"></option>`)).join("");
    const tiles = EST_TILES.filter(([id]) => svcById[id]);

    root.innerHTML = `
      <div class="jobcard-head"><span><b>Get a price in 30 seconds</b></span><span>${C.pricing.isDemo ? '<span class="tag tag--demo">Demo prices</span>' : `Prices updated <time datetime="${esc(RATE_V)}">${esc(rateDate())}</time>`}</span></div>
      <div class="est-stepline"><span data-e-count>Step 1 of 2</span><span>Free · no sign-up</span></div>
      <div class="steps-bar" aria-hidden="true"><span class="on"></span><span></span></div>
      <form class="jobcard-body" novalidate>
        <section data-step="1">
          <div class="step-title"><${headingTag} data-i18n="est.need">What does your car need?</${headingTag}></div>
          <div class="est-tiles" role="group" aria-label="Popular jobs">${tiles.map(([id, label, icon]) => `<label class="est-tile"><input type="checkbox" data-tile="${id}"><span>${svgUse(icon)}<b>${esc(label)}</b><small data-tile-price="${id}">${esc(tileText(id))}</small></span></label>`).join("")}</div>
          <details class="est-all" data-all-services>
            <summary><span>Search all ${calcServices.length} services</span> <span class="small muted" data-all-count></span></summary>
            <p class="hint muted small" style="margin:10px 0" data-svc-hint>Select one or more. Overlapping jobs are counted once. Prices shown are for a hatchback; your estimate adjusts for your car.</p>
            <div class="field svc-search"><label class="sr-only" for="e-search">Search services</label><input id="e-search" type="search" placeholder="Search, e.g. brake, AC, battery, dent" autocomplete="off"></div>
            <div class="svc-groups">${Object.entries(groups).map(([g, list]) => `
              <div class="svc-group" data-group="${esc(g)}"><${subHeadingTag} class="svc-group-title">${esc(g)}</${subHeadingTag}><div class="svc-list">${list.map((s) => `
                <label class="svc-opt" data-svc="${s.id}" data-search="${esc((s.name + " " + g + " " + (s.includes || []).join(" ")).toLowerCase())}"><input type="checkbox" value="${s.id}"><span><span class="t">${esc(s.name)}</span><span class="s">${esc(fromText(s))}</span></span></label>`).join("")}
              </div></div>`).join("")}
              <p class="muted small" data-search-empty hidden>No service matches. Choose "Other / custom repair" and describe the problem.</p>
            </div>
          </details>
          <div class="qty-row" data-qty hidden></div>
          <p class="err" data-err="2" hidden></p>
          <div class="est-car">
            <${subHeadingTag} class="est-sub">Your car</${subHeadingTag}>
            <div class="field"><label for="e-car">Which car?</label><input id="e-car" list="e-car-list" autocomplete="off" autocapitalize="words" maxlength="80" placeholder="e.g. Maruti Swift"><datalist id="e-car-list">${carOptions}</datalist></div>
            <p class="est-auto" data-cat-auto hidden>Car type: <b data-cat-label></b> (auto) · <button type="button" class="linkish" data-cat-change>change</button></p>
            <div class="field" data-cat-field hidden><span class="label" id="l-cat">Car type</span><div class="chips" role="radiogroup" aria-labelledby="l-cat">${chipsHtml("cat", C.categories)}</div></div>
            <div class="field"><span class="label" id="l-fuel">Fuel</span><div class="chips" role="radiogroup" aria-labelledby="l-fuel">${chipsHtml("fuel", C.fuels)}</div></div>
            <div class="field"><span class="label" id="l-age">Car age <span class="hint">Optional</span></span><div class="chips" role="radiogroup" aria-labelledby="l-age">${chipsHtml("age", [{ id: "new", label: "Under " + (C.pricing.ageRule ? C.pricing.ageRule.olderThanYears : 10) + " years" }, { id: "old", label: "Over " + (C.pricing.ageRule ? C.pricing.ageRule.olderThanYears : 10) + " years" }])}</div></div>
          </div>
          <p class="err" data-err="1" hidden></p>
        </section>
        <section data-step="2" hidden>
          <div class="step-title"><${headingTag}>Your price</${headingTag}></div>
          <div class="estimate">
            <div data-res-total aria-live="polite"></div>
            <div class="field est-grade"><span class="label" id="l-grade">Parts quality</span><div class="chips" role="radiogroup" aria-labelledby="l-grade">${Object.entries(C.pricing.partsGrade).map(([id, g]) => `<label class="chip"><input type="radio" name="grade" value="${id}"${id === "standard" ? " checked" : ""}><span>${esc({ economy: "Economy", standard: "Standard", genuine: "Genuine (OEM)" }[id] || g.label)}</span></label>`).join("")}</div><span class="hint" data-grade-hint></span></div>
            <div class="est-body" data-res-body></div>
          </div>
        </section>
        <div class="est-foot" data-foot>
          <button type="button" class="btn btn--outline btn--sm" data-back hidden>Back</button>
          <div class="est-run" data-run><small data-run-k>Your estimate</small><b data-run-v>Pick a job and your car</b></div>
          <button type="submit" class="btn" data-next><span data-i18n="est.see">See my price</span> ${ICON.arrow}</button>
        </div>
      </form>`;

    const form = $("form", root);
    const car = $("#e-car", root);
    let step = 1, vehicle = { brand: "", model: "", category: "" };
    function setRadio(name, val) { const r = form.querySelector(`input[name="${name}"][value="${val}"]`); if (r) r.checked = true; }
    function radio(name) { const r = form.querySelector(`input[name="${name}"]:checked`); return r ? r.value : ""; }
    const nowYear = () => new Date().getFullYear();
    const yearForAge = () => radio("age") === "old" ? String(nowYear() - (C.pricing.ageRule ? C.pricing.ageRule.olderThanYears : 10) - 1) : "";

    // Typed car → brand, model and car type. Unknown cars are still accepted; then the car type is asked.
    let catManual = false;
    function readCar() {
      vehicle = resolveCar(car.value);
      const brandId = (C.brands.find((b) => b.name === vehicle.brand) || {}).id || "";
      let category = vehicle.category || (LUX.includes(brandId) ? "luxury" : "");
      if (category && !catManual) setRadio("cat", category);
      if (/\bEV\b|EV$/i.test(car.value.trim())) setRadio("fuel", "electric");
      const auto = !!category && !catManual;
      $("[data-cat-auto]", root).hidden = !auto;
      $("[data-cat-field]", root).hidden = auto || !car.value.trim();
      if (auto) $("[data-cat-label]", root).textContent = catLabel(radio("cat"));
      vehicle.brandId = brandId;
    }
    car.addEventListener("input", () => { readCar(); refreshPrices(); });
    car.addEventListener("change", () => { readCar(); refreshPrices(); });
    $("[data-cat-change]", root).addEventListener("click", () => { catManual = true; $("[data-cat-auto]", root).hidden = true; $("[data-cat-field]", root).hidden = false; const r = $('input[name="cat"]:checked', root) || $('input[name="cat"]', root); if (r) r.focus(); });
    $$('input[name="cat"]', root).forEach((r) => r.addEventListener("change", () => { catManual = true; refreshPrices(); }));
    $$('input[name="fuel"], input[name="age"]', root).forEach((r) => r.addEventListener("change", refreshPrices));

    function renderQty() {
      const box = $("[data-qty]", root);
      const list = [...state.services].map((id) => svcById[id]).filter((s) => s && s.qty);
      box.hidden = !list.length;
      box.innerHTML = list.map((s) => `<div class="qty-item"><label for="q-${s.id}" class="label">${esc(s.name)} — how many (${esc(s.unit.replace(/^per /, ""))}s)?</label><input id="q-${s.id}" data-qty-for="${s.id}" type="number" min="1" max="${s.qty.max}" value="${state.qty[s.id] || 1}" inputmode="numeric"></div>`).join("");
      $$("[data-qty-for]", box).forEach((inp) => inp.addEventListener("input", () => {
        const s = svcById[inp.dataset.qtyFor];
        state.qty[s.id] = inp.value;
        fieldError(inp, F.quantityError(inp.value, s.qty.max));
        updateRun();
      }));
    }
    function syncTiles() {
      $$("[data-tile]", root).forEach((t) => {
        const cb = $(`.svc-opt input[value="${t.dataset.tile}"]`, root);
        t.checked = state.services.has(t.dataset.tile); t.disabled = cb.disabled;
        t.closest(".est-tile").classList.toggle("disabled", cb.disabled);
      });
      $("[data-all-count]", root).textContent = state.services.size ? "· " + state.services.size + " selected" : "";
    }
    $$(".svc-opt input", root).forEach((cb) => cb.addEventListener("change", () => {
      const s = svcById[cb.value];
      if (cb.checked && state.services.size >= F.maxServices && !state.services.has(cb.value) &&
          !(s.exclusive && [...state.services].some(id => svcById[id].exclusive === s.exclusive))) {
        cb.checked = false; err(2, `Choose up to ${F.maxServices} services per request.`); syncTiles(); return;
      }
      if (cb.checked && s.exclusive) {   // e.g. only one periodic service level at a time
        $$(".svc-opt input", root).forEach((o) => { if (o !== cb && o.checked && svcById[o.value].exclusive === s.exclusive) { o.checked = false; o.closest(".svc-opt").classList.remove("checked"); state.services.delete(o.value); } });
      }
      cb.closest(".svc-opt").classList.toggle("checked", cb.checked);
      cb.checked ? state.services.add(cb.value) : state.services.delete(cb.value);
      if (state.services.size) err(2, "");
      renderQty(); syncTiles(); updateRun();
    }));
    $$("[data-tile]", root).forEach((t) => t.addEventListener("change", () => {
      const cb = $(`.svc-opt input[value="${t.dataset.tile}"]`, root);
      if (cb && cb.checked !== t.checked) { cb.checked = t.checked; cb.dispatchEvent(new Event("change")); }
      syncTiles();
    }));
    const search = $("#e-search", root);
    const searchVocab = F.searchVocabulary($$(".svc-opt", root).map((o) => o.dataset.search));
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      $$(".svc-group", root).forEach((g) => {
        let any = false;
        $$(".svc-opt", g).forEach((o) => { const hit = F.searchMatch(o.dataset.search, q, searchVocab); o.hidden = !hit; if (hit) any = true; });
        g.hidden = !any; if (any) shown++;
      });
      $("[data-search-empty]", root).hidden = shown > 0;
    });
    function applyPreset(ids) {
      $$(".svc-opt input", root).forEach((cb) => { const on = ids.includes(cb.value); if (cb.checked !== on) { cb.checked = on; cb.dispatchEvent(new Event("change")); } });
      // A preset job that isn't one of the tiles is visible in the full list.
      if (ids.some((id) => !tiles.some(([t]) => t === id))) $("[data-all-services]", root).open = true;
    }
    if (preset.length) applyPreset(preset);

    function carLabel() {
      const name = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
      return name + (radio("age") === "old" ? " (over " + (C.pricing.ageRule ? C.pricing.ageRule.olderThanYears : 10) + " years old)" : "");
    }
    function err(n, msg) { const e = $(`[data-err="${n}"]`, root); e.id = `estimate-step-${n}-error`; e.setAttribute("role", "alert"); e.textContent = msg || ""; e.hidden = !msg; }
    function validate() {
      let ok = true;
      const svcMsg = !state.services.size ? "Pick at least one job (or search all services)." : state.services.size > F.maxServices ? `Choose up to ${F.maxServices} services per request.` : "";
      err(2, svcMsg); ok = !svcMsg;
      for (const el of $$("[data-qty-for]", root)) ok = fieldError(el, F.quantityError(el.value, svcById[el.dataset.qtyFor].qty.max)) && ok;
      readCar();
      const missing = [car.value.trim().length < 2 && "car", !radio("fuel") && "fuel", car.value.trim().length >= 2 && !radio("cat") && "car type"].filter(Boolean);
      car.setAttribute("aria-describedby", "estimate-step-1-error");
      car.value.trim().length < 2 ? car.setAttribute("aria-invalid", "true") : car.removeAttribute("aria-invalid");
      $$('input[name="fuel"], input[name="cat"]', root).forEach((el) => { el.setAttribute("aria-describedby", "estimate-step-1-error"); !radio(el.name) ? el.setAttribute("aria-invalid", "true") : el.removeAttribute("aria-invalid"); });
      if (missing.includes("car type")) $("[data-cat-field]", root).hidden = false;
      err(1, missing.length ? "Please add your " + missing.join(", ") + "." : "");
      ok = !missing.length && ok;
      if (!ok) {
        const target = svcMsg ? $('[data-err="2"]', root) : $('[aria-invalid="true"]', root);
        if (target) { if (!target.matches("input")) target.tabIndex = -1; target.focus(); }
      }
      return ok;
    }
    function ready() { return state.services.size > 0 && car.value.trim().length >= 2 && radio("fuel") && radio("cat"); }
    function compute() {
      return PR.estimate(C, {
        category: radio("cat"), fuel: radio("fuel"), year: yearForAge(), partsGrade: state.partsGrade,
        services: [...state.services].map((id) => ({ id, qty: state.qty[id] || 1 }))
      });
    }
    function bookingPayload(r) {
      return {
        brand: vehicle.brandId || (car.value.trim() ? "other" : ""), model: vehicle.model,
        car: carLabel(), year: "", yearExact: false, fuel: radio("fuel"), category: radio("cat"),
        services: [...state.services], qty: Object.fromEntries(Object.entries(state.qty).map(([id, q]) => [id, Number(q)])), lights: [],
        symptoms: radio("age") === "old" ? "Car is over " + (C.pricing.ageRule ? C.pricing.ageRule.olderThanYears : 10) + " years old" : "",
        estimate: r.pricedJobs ? PR.formatRange(r.total) + (r.partsQuoted ? " + parts quoted by model" : "") : unpriced(r).short, partsGrade: state.partsGrade
      };
    }
    // Headline when nothing could be priced: say why.
    function unpriced(r) {
      if (r.inspection.length) return { title: "Quote after inspection", short: "Quote after inspection", text: "We'll price it after inspecting the car" };
      if (r.quotes.length) return { title: "Price on request", short: "Price on request", text: "We'll send you a quote on WhatsApp" };
      return { title: "No priced jobs", short: "No applicable jobs", text: "These jobs don't apply to your car. Go back and choose other services" };
    }
    function waMessage(p, r) {
      const svcNames = p.services.map((id) => svcById[id].name + (svcById[id].qty ? " × " + (p.qty[id] || 1) + " " + svcById[id].unit.replace(/^per /, "") + "(s)" : ""));
      return [
        `Hello ${B.name}, I'd like to book a service.`,
        `Car: ${p.car}`,
        `Fuel: ${fuelLabel(p.fuel)}`,
        `Services: ${svcNames.join(", ")}`,
        `Estimated range: ${p.estimate}${C.pricing.isDemo ? " (website demo estimate)" : ""}`,
        `Parts: ${(C.pricing.partsGrade[p.partsGrade] || {}).label || p.partsGrade}`,
        r.inspection.length ? `Needs inspection: ${r.inspection.join(", ")}` : null,
        r.quotes.length ? `Price on request: ${r.quotes.join(", ")}` : null,
        "Area / PIN: ",
        "Please confirm availability and the final quote."
      ].filter((x) => x != null).join("\n");
    }
    // Running price on step 1: updates as jobs and car details change.
    function updateRun() {
      const k = $("[data-run-k]", root), v = $("[data-run-v]", root);
      if (!state.services.size) { k.textContent = "Your estimate"; v.textContent = "Pick a job and your car"; return; }
      if (!ready()) { k.textContent = state.services.size + (state.services.size === 1 ? " job" : " jobs") + " selected"; v.textContent = "Add your car to see the price"; return; }
      const r = compute();
      k.textContent = "Estimate · " + state.services.size + (state.services.size === 1 ? " job" : " jobs");
      v.textContent = r.pricedJobs ? PR.formatRange(r.total) + (r.partsQuoted ? " + parts" : "") : unpriced(r).short;
    }
    // Re-price the tiles and the service list for the chosen car; switch off jobs that don't apply (e.g. oil change on an EV).
    function refreshPrices() {
      const category = radio("cat") || "hatchback", fuel = radio("fuel") || "petrol";
      let removed = false;
      $$(".svc-opt", root).forEach((o) => {
        const s = svcById[o.dataset.svc], cb = $("input", o);
        $(".s", o).textContent = fromText(s, category, fuel);
        const na = PR.serviceStatus(s, fuel) === "not-applicable";
        o.classList.toggle("disabled", na);
        cb.disabled = na;
        if (na && cb.checked) { cb.checked = false; o.classList.remove("checked"); state.services.delete(s.id); removed = true; }
      });
      $$("[data-tile-price]", root).forEach((el) => { el.textContent = tileText(el.dataset.tilePrice, category, fuel); });
      if (removed) renderQty();
      const hint = $("[data-svc-hint]", root);
      if (hint) hint.textContent = "Select one or more. Overlapping jobs are counted once. Prices shown are for a " + catLabel(category).toLowerCase() + (fuel !== "petrol" ? " (" + fuelLabel(fuel).toLowerCase() + ")" : "") + "; your estimate also reflects the car's age and parts quality." + (fuel === "electric" ? " Jobs that don't apply to electric cars are switched off." : "");
      if ($("[data-cat-label]", root)) $("[data-cat-label]", root).textContent = catLabel(radio("cat"));
      syncTiles(); updateRun();
    }
    function renderResult() {
      const r = compute();
      const p = bookingPayload(r);
      store.set("cmi-booking", p);
      const rows = r.lines.map((l) => {
        if (l.status === "priced") return `<tr><td>${esc(l.name)}${l.qty > 1 ? ` × ${l.qty} ${esc((l.unit || "").replace(/^per /, ""))}s` : ""}<br><span class="small muted">Labour ${PR.formatRange(l.labour)} · ${l.parts ? "Parts " + PR.formatRange(l.parts) : esc(l.partsNote || "Parts quoted by model")}</span></td><td>${PR.formatRange(l.total)}${l.partsQuoted ? "<br><span class=\"small muted\">+ parts</span>" : ""}</td></tr>`;
        if (l.status === "covered") return `<tr><td>${esc(l.name)} <span class="tag tag--ok">Included</span><br><span class="small muted">Part of ${esc(l.coveredBy)}</span></td><td>—</td></tr>`;
        if (l.status === "inspection") return `<tr><td>${esc(l.name)} <span class="tag tag--warn">Inspection</span><br><span class="small muted">Quote after inspection</span></td><td>Quote</td></tr>`;
        if (l.status === "quote") return `<tr><td>${esc(l.name)} <span class="tag tag--warn">On request</span><br><span class="small muted">${esc(l.reason)} — we'll quote on WhatsApp</span></td><td>Quote</td></tr>`;
        return `<tr><td>${esc(l.name)} <span class="tag tag--muted">N/A</span><br><span class="small muted">${esc(l.reason || "Not applicable")}</span></td><td>—</td></tr>`;
      }).join("");
      const priced = r.pricedJobs > 0;
      // One line per chosen job: its name and the first "includes" note.
      const incList = r.lines.filter((l) => l.status !== "not-applicable").map((l) => [l.name, ((svcById[l.id] || {}).includes || [])[0] || ""]);
      const summaryLine = [carLabel(), fuelLabel(p.fuel), catLabel(p.category), state.services.size + (state.services.size === 1 ? " job" : " jobs")].filter(Boolean).join(" · ");
      const resBody = $("[data-res-body]", root);
      const wasOpen = !!$(".est-breakdown[open]", resBody);
      $("[data-res-total]", root).innerHTML = `
          <div class="est-total">
            <span class="k">${esc(summaryLine)}</span>
            <span class="v">${priced ? PR.formatRange(r.total) : esc(unpriced(r).title)}</span>
            <span class="t">${priced ? "Estimated total" + (r.partsQuoted ? " + parts quoted by model" : "") + (r.tax ? " incl. " + esc(r.taxLabel) : "") + (r.inspection.length || r.quotes.length ? " · other jobs quoted separately" : "") : esc(unpriced(r).text)}${r.hours ? " · Typical time: " + PR.formatHours(r.hours) : ""}</span>
          </div>`;
      $("[data-grade-hint]", root).textContent = ((C.pricing.partsGrade[state.partsGrade] || {}).label || "") + " — the price above updates when you change this.";
      resBody.innerHTML = `          ${incList.length ? `<div class="est-inc"><${subHeadingTag} class="estimate-list-title">What's included</${subHeadingTag}><ul>${incList.map(([n, i]) => `<li><b>${esc(n)}</b>${i ? " — " + esc(i) : ""}</li>`).join("")}</ul></div>` : ""}
          <div class="est-promise"><strong>Final price after inspection.</strong> No extra work without your OK. Free pickup &amp; drop in our confirmed Indore PIN codes.</div>
          <div class="est-actions est-actions--3">
            <a class="btn" data-book-form href="booking.html">${ICON.calendar} Book at this price</a>
            <a class="btn btn--wa" data-book-wa target="_blank" rel="noopener" href="${waUrl(waMessage(p, r))}">${ICON.wa} WhatsApp</a>
            <button type="button" class="btn btn--outline" data-share-est>Share</button>
          </div>
          <p class="small muted" data-copy-status aria-live="polite">Booking keeps your car and jobs, so you only add your name and number.</p>
          <details class="est-breakdown"><summary>See full breakdown</summary>
            <div class="table-scroll"><table class="est-table">
              <thead><tr><th>Job</th><th>Range</th></tr></thead>
              <tbody>${rows}
                ${priced ? `<tr><td>Estimated labour</td><td>${PR.formatRange(r.labour)}</td></tr>
                <tr><td>Estimated parts & consumables</td><td>${PR.formatRange(r.parts)}${r.partsQuoted ? "<br><span class=\"small muted\">+ parts quoted by model</span>" : ""}</td></tr>
                <tr><td>${r.tax ? esc(r.taxLabel) : "Taxes"}</td><td>${r.tax ? PR.formatRange(r.tax) : "As per final bill"}</td></tr>` : ""}
                ${priced ? `<tr class="sum"><td>Estimated total${r.partsQuoted ? " (excl. parts quoted by model)" : ""}</td><td>${PR.formatRange(r.total)}</td></tr>` : ""}
              </tbody></table></div>
            ${r.excludes.length ? `<div class="inc-exc"><div><${subHeadingTag} class="estimate-list-title">Not included</${subHeadingTag}><ul>${r.excludes.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div></div>` : ""}
            ${r.notes.map((n) => `<p class="small muted">• ${esc(n)}</p>`).join("")}
            <p class="disclaimer"><strong>This is an indicative estimate, not a final price.</strong> The final quotation is given after inspection. No additional work is done without your approval, and you get an itemised bill.${C.pricing.isDemo ? " <strong>Prices shown are demo values until the workshop publishes its rate card.</strong>" : ""}</p>
            <div class="est-tools">
              <button type="button" class="btn btn--outline btn--sm" data-copy-est>Copy estimate</button>
              <button type="button" class="btn btn--outline btn--sm" data-restart>Start over</button>
            </div>
          </details>`;
      if (wasOpen) $(".est-breakdown", resBody).open = true;
      const box = resBody;
      const text = [waMessage(p, r).replace(/^Hello[^\n]*\n/, "").replace(/\nArea \/ PIN:.*$/s, ""), "Indicative estimate — final quote after inspection.", location.origin + location.pathname.replace(/[^/]*$/, "") + "estimate.html"].join("\n");
      const status = (msg) => { $("[data-copy-status]", box).textContent = msg; };
      const copy = (okMsg) => { try { navigator.clipboard.writeText(text).then(() => status(okMsg), () => status("Couldn't copy automatically — select the text in the breakdown instead.")); } catch (e) { status("Couldn't copy automatically — select the text in the breakdown instead."); } };
      $("[data-copy-est]", box).addEventListener("click", () => copy("Estimate copied."));
      $("[data-share-est]", box).addEventListener("click", () => {
        if (navigator.share) navigator.share({ title: "Car service estimate — " + B.name, text }).catch(() => {});
        else copy("Estimate copied — paste it anywhere to share.");
      });
      $("[data-restart]", box).addEventListener("click", () => {
        store.remove("cmi-booking");
        form.reset(); state.services.clear(); state.qty = {}; state.partsGrade = "standard"; setRadio("grade", "standard"); catManual = false; vehicle = { brand: "", model: "", category: "" };
        $$(".svc-opt", root).forEach((o) => o.classList.remove("checked"));
        renderQty(); search.value = ""; search.dispatchEvent(new Event("input"));
        $("[data-cat-auto]", root).hidden = true; $("[data-cat-field]", root).hidden = true; $("[data-all-services]", root).open = false;
        refreshPrices(); go(1);
      });
    }
    function go(n, moveFocus = true) {
      step = n;
      $$("section[data-step]", root).forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
      $$(".steps-bar span", root).forEach((s, i) => s.classList.toggle("on", i < n));
      $("[data-e-count]", root).textContent = `Step ${n} of 2`;
      $("[data-back]", root).hidden = n === 1;
      $("[data-next]", root).hidden = n === 2;
      $("[data-run]", root).hidden = n === 2;
      $("[data-foot]", root).classList.toggle("est-foot--result", n === 2);
      if (n === 2) renderResult();
      if (!moveFocus) return;
      focusStep($(`section[data-step="${n}"]`, root));
      const top = root.getBoundingClientRect().top; if (top < 0) root.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    $$('input[name="grade"]', root).forEach((g) => g.addEventListener("change", () => { state.partsGrade = g.value; renderResult(); }));
    form.addEventListener("submit", (e) => { e.preventDefault(); if (step === 1 && validate()) go(2); });
    $("[data-back]", root).addEventListener("click", () => go(1));
    refreshPrices();
    root.cmiPreset = (ids) => { applyPreset(ids); if (step !== 1) go(1, false); };
    root.cmiFocusCar = () => { car.focus({ preventScroll: true }); };
    // Test hook (also handy for owner QA in the console)
    root.cmiDebug = { compute, go, setRadio };
  }

  /* ---------- Package & rate tables (prices from the engine) ---------- */
  const baseCar = { category: "hatchback", fuel: "petrol", partsGrade: "standard", pickup: "none" };
  function renderPackages() {
    $$("[data-pkg]").forEach((el) => {
      const pkg = C.packages.find((p) => p.id === el.getAttribute("data-pkg"));
      if (!pkg) return;
      const r = PR.estimate(C, { ...baseCar, services: pkg.services.map((id) => ({ id })) });
      el.innerHTML = `<small>${C.pricing.isDemo ? "Demo estimate · hatchback" : "Hatchback · indicative"}</small>${r.pricedJobs ? PR.formatRange(r.total) : "Quote after inspection"}`;
    });
    $$("[data-pkg-btn]").forEach((btn) => btn.addEventListener("click", (e) => {
      const est = $("[data-estimator]");
      const pkg = C.packages.find((p) => p.id === btn.getAttribute("data-pkg-btn"));
      if (est && est.cmiPreset && pkg) { e.preventDefault(); est.cmiPreset(pkg.services); est.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }));
  }
  function renderRateTables() {
    const PT = window.CMI_PRICE_TABLE; if (!PT) return;
    $$("[data-rate-table]").forEach((el) => {
      el.innerHTML = PT.rateTable(C, PR, el.getAttribute("data-rate-table").split(",")) + PT.footnote(C);
    });
    $$("[data-price-list]").forEach((el) => { el.innerHTML = PT.priceList(C, PR); });
    $$("[data-from-price]").forEach((el) => { const v = PT.fromPrice(C, PR, el.getAttribute("data-from-price").split(",")); if (v) el.textContent = "From " + v; });
  }


  /* ---------- Services menu: progressive search and car-specific prices ---------- */
  function mountServiceExplorer(root) {
    const search = $("[data-services-search]", root), car = $("[data-services-car]", root);
    const cards = $$("[data-service-card]", root), filters = $$("[data-service-filter]", root);
    let group = "all";
    const searchable = Object.fromEntries(C.services.map((s) => [s.id, [s.name, s.group, ...(s.includes || [])].join(" ").toLowerCase()]));
    const searchVocab = F.searchVocabulary(Object.values(searchable));
    function update() {
      const query = search.value.trim().toLowerCase(), category = car.value;
      const visible = new Set();
      cards.forEach((card) => {
        const id = card.dataset.serviceCard;
        card.hidden = (group !== "all" && card.dataset.serviceGroup !== group) || !F.searchMatch(searchable[id], query, searchVocab);
        if (!card.hidden) visible.add(id);
        const price = PR.quickRange(C, id, category);
        $("[data-service-range]", card).textContent = price.text;
        $("[data-service-price-status]", card).textContent = price.status === "priced" ? "Published estimate" : price.status === "inspection" ? "Inspection first" : "Let’s talk";
        $(".service-card-footer a", card).firstChild.textContent = price.status === "priced" ? "Book service" : "Request quote";
      });
      $$("[data-svc-row]", root).forEach((row) => { row.hidden = !visible.has(row.dataset.svcRow); });
      $$(".pl-group", root).forEach((section) => { section.hidden = !$$("[data-svc-row]", section).some((row) => !row.hidden); });
      const categoryLabel = (C.categories.find((c) => c.id === category) || {}).label || category;
      $("[data-service-count]", root).textContent = `${visible.size} of ${C.services.length} services · ${categoryLabel} prices`;
      $("[data-services-empty]", root).hidden = visible.size !== 0;
      $("[data-compare-prices]", root).hidden = visible.size === 0;
      $$("[data-package-range]", root).forEach((el) => { el.textContent = PR.quickRange(C, el.dataset.packageRange, category).text; });
      $$("[data-package-car]", root).forEach((el) => { el.textContent = categoryLabel + " · standard parts"; });
    }
    filters.forEach((button) => button.addEventListener("click", () => {
      group = button.dataset.serviceFilter;
      filters.forEach((b) => { b.classList.toggle("on", b === button); b.setAttribute("aria-pressed", String(b === button)); });
      update();
    }));
    search.addEventListener("input", update); car.addEventListener("change", update);
    $("[data-clear-services]", root).addEventListener("click", () => { search.value = ""; filters[0].click(); search.focus(); });
    $("[data-explorer-tools]", root).hidden = false;
    update();
  }

  /* ---------- Reviews (data in reviews.js) ---------- */
  const RV = window.CMI_REVIEWS || { items: [], showSamples: false };
  function stars(n) {
    const full = Math.max(0, Math.min(5, Math.round(n || 0)));
    return `<span class="stars" role="img" aria-label="${full} out of 5 stars">${[1, 2, 3, 4, 5].map((i) => `<svg viewBox="0 0 24 24" class="${i <= full ? "on" : ""}" aria-hidden="true"><use href="#i-star"/></svg>`).join("")}</span>`;
  }
  function feedbackWa() { return waUrl(`Hello ${B.name}, I'd like to share feedback about my car service.\nName: \nCar: \nService: \nMy feedback: `); }
  function renderReviews() {
    const genuine = RV.items.filter((r) => r.isSample === false && r.approved === true && r.consent === true);
    const samples = RV.items.filter((r) => r.isSample);
    const list = genuine.length ? genuine : RV.showSamples ? samples : [];
    const isSample = !genuine.length;
    $$("[data-review-summary]").forEach((el) => {
      const snap = RV.snapshot;
      el.hidden = !(genuine.length && snap && Number.isFinite(snap.rating) && snap.rating >= 0 && snap.rating <= 5 && Number.isInteger(snap.count) && snap.count > 0);
      if (!el.hidden) el.innerHTML = `<strong>${esc(snap.rating.toFixed(1))} / 5</strong> · ${esc(snap.count)} Google reviews <span class="tag">${esc(snap.businessName)}</span><p class="small muted">${esc(snap.source)}. Rating snapshot, not a live Google feed. These reviews were posted under our garage’s name, ${esc(snap.businessName)}.</p>`;
    });
    $$("[data-reviews]").forEach((el) => {
      const limit = Number(el.getAttribute("data-limit")) || list.length;
      const notice = $("[data-reviews-notice]", el.parentElement);
      if (notice) notice.hidden = !(isSample && list.length);
      if (!list.length) {
        el.innerHTML = `<div class="review-empty"><h3>Be one of our first reviewers</h3><p>Had your car serviced with us? Tell us how it went. With your permission, we'll publish your review here.</p></div>`;
        return;
      }
      el.innerHTML = list.slice(0, limit).map((r) => `
        <figure class="review${r.isSample ? " sample" : ""}">
          <div class="review-top">${stars(r.rating)}${r.isSample ? '<span class="tag tag--demo">Sample review</span>' : `<span class="tag tag--ok">${esc(r.source || "Customer")}</span>`}</div>
          <blockquote>“${esc(r.text)}”</blockquote>
          <figcaption>
            <span class="avatar" aria-hidden="true">${esc((r.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2))}</span>
            <span><cite>${esc(r.name)}</cite><span class="small muted">${[r.service, r.vehicle, r.date].filter(Boolean).map(esc).join(" · ")}</span>
            ${r.isSample ? '<span class="small sample-note">Demo content — not a real customer</span>' : ""}</span>
          </figcaption>
        </figure>`).join("");
    });
    $$("[data-google-review]").forEach((a) => {
      const googleUrl = RV.googleReviewUrl || RV.googleProfileUrl || B.googleBusinessProfileUrl;
      if (googleUrl && /^https:\/\//i.test(googleUrl)) {
        a.href = googleUrl;
        a.textContent = RV.googleReviewUrl ? "Review on Google" : "Car Repair Wala on Google";
        a.target = "_blank"; a.rel = "noopener";
        a.hidden = false;
      }
    });
    $$("[data-feedback-wa]").forEach((a) => { a.href = feedbackWa(); a.target = "_blank"; a.rel = "noopener"; });
  }

  function mountReviewForm(f) {
    f.closest("[data-review-enhanced]").hidden = false;
    const out = $("[data-review-result]", f);
    const clear = () => {
      out.replaceChildren(); out.hidden = true;
      $$("input, textarea", f).forEach(el => el.setCustomValidity(""));
    };
    f.addEventListener("input", clear);
    f.addEventListener("change", clear);
    f.addEventListener("reset", clear);
    f.addEventListener("submit", e => {
      e.preventDefault();
      const name = f.elements.name.value.trim();
      const text = f.elements.experience.value.trim();
      f.elements.name.setCustomValidity(name ? "" : "Please enter your display name.");
      f.elements.experience.setCustomValidity(text.length >= 20 ? "" : "Please write at least 20 characters about your experience.");
      if (!f.reportValidity()) return;
      const permission = f.elements.consent.checked;
      const message = [`Hello ${B.name}, here is my website feedback.`,
        `Display name: ${name}`, `Rating: ${f.elements.rating.value}/5`,
        `Car: ${f.elements.car.value.trim() || "Not specified"}`,
        `Service: ${f.elements.service.value || "Not specified"}`,
        `My experience: ${text}`,
        `Permission to publish display name, rating, car model, service and feedback on the Car Repair Wala website: ${permission ? "YES" : "NO — private feedback only"}`].join("\n");
      out.innerHTML = `<div class="notice"><strong>Ready to send — your feedback has not been sent yet.</strong><p>Open WhatsApp and press Send to deliver it to the garage. ${permission ? "Your review can be published after the garage checks it." : "You chose private feedback. It will not be published on the website."}</p><a class="btn btn--wa" data-review-send target="_blank" rel="noopener" href="${esc(waUrl(message))}">Open WhatsApp to send ${ICON.wa}</a></div>`;
      out.hidden = false;
      out.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  /* ---------- Before & After gallery (data in gallery.js) ---------- */
  const GL = window.CMI_GALLERY || { items: [], groups: [] };
  function galleryItems() {
    const vis = GL.items.filter((i) => i.show !== false);
    return [...vis.filter((i) => i.kind === "real"), ...vis.filter((i) => i.kind !== "real")];
  }
  function baFigure(img, label, eager) {
    return `<figure class="ba-shot"><img src="${esc(img.src)}" alt="${esc(img.alt)}" width="${img.width || 800}" height="${img.height || 600}" ${eager ? "" : 'loading="lazy"'} decoding="async"><figcaption class="ba-label ba-label--${label.toLowerCase()}">${label}</figcaption></figure>`;
  }
  function galleryCard(it, i) {
    const photoWidth = Math.min(it.before.width || 600, it.after.width || 600);
    const svcName = svcById[it.serviceId] ? svcById[it.serviceId].name : it.category;
    const facts = [it.vehicle && ["Vehicle", it.vehicle], it.duration && ["Time taken", it.duration], it.price && ["Price", it.price]].filter(Boolean);
    return `<article class="ba-card" data-group="${esc(it.group)}" id="ba-${esc(it.id)}">
      <div class="ba-head"><span class="eyebrow">${esc(it.category)}</span><h3>${esc(it.title)}</h3></div>
      <div class="ba-pair" style="--photo-width:${photoWidth}px;--comparison-width:${photoWidth * 2 + 8}px" tabindex="0" aria-label="Before and after images, swipe to compare">${baFigure(it.before, "Before", i < 2)}${baFigure(it.after, "After", i < 2)}</div>
      <div class="ba-dots" aria-hidden="true"><span class="on"></span><span></span><em>Swipe to see after →</em></div>
      <p class="ba-desc">${esc(it.description)}</p>
      ${facts.length ? `<dl class="ba-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
      <div class="ba-actions">
        <a class="btn btn--sm" href="booking.html?service=${esc(it.serviceId)}" data-book-similar="${esc(it.serviceId)}">${ICON.calendar} Book Similar Service</a>
        <a class="btn btn--wa btn--sm" target="_blank" rel="noopener" href="${waUrl(`Hello ${B.name}, I'm interested in ${it.category.toLowerCase()} (${svcName}).\nCar (make/model/year): \nArea / PIN: `)}">${ICON.wa} WhatsApp enquiry</a>
        <a class="btn btn--outline btn--sm" data-tel data-call-now href="tel:${B.phoneE164}">${ICON.phone} Call Now</a>
      </div>
    </article>`;
  }
  function renderGallery() {
    $$("[data-gallery]").forEach((el) => {
      let items = galleryItems();
      const ids = (el.getAttribute("data-ids") || "").split(",").filter(Boolean);
      if (ids.length) items = ids.map((id) => items.find((x) => x.id === id)).filter(Boolean);
      if (el.hasAttribute("data-featured")) items = items.filter((x) => x.featured || x.kind === "real");
      const limit = Number(el.getAttribute("data-limit")); if (limit) items = items.slice(0, limit);
      el.innerHTML = items.map(galleryCard).join("") || `<p class="muted">Photos coming soon.</p>`;
    });
    $$("[data-gallery-filters]").forEach((bar) => {
      const grid = $(bar.getAttribute("data-gallery-filters"));
      bar.innerHTML = [{ id: "all", label: "All" }, ...GL.groups].map((g, i) => `<button type="button" class="filter${i ? "" : " on"}" data-filter="${g.id}" aria-pressed="${i ? "false" : "true"}">${esc(g.label)}</button>`).join("");
      bar.addEventListener("click", (e) => {
        const b = e.target.closest("[data-filter]"); if (!b) return;
        $$("[data-filter]", bar).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
        $$(".ba-card", grid).forEach((c) => { c.hidden = b.dataset.filter !== "all" && c.dataset.group !== b.dataset.filter; });
      });
    });
    // mobile swipe indicator
    $$(".ba-pair").forEach((pair) => pair.addEventListener("scroll", () => {
      const on = pair.scrollLeft > pair.clientWidth / 2 ? 1 : 0;
      $$(".ba-dots span", pair.parentElement).forEach((d, i) => d.classList.toggle("on", i === on));
    }, { passive: true }));
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-book-similar]"); if (!a) return;
      store.set("cmi-booking", { services: [a.getAttribute("data-book-similar")] });
    });
  }

  /* ---------- Homepage service photos ---------- */
  function mountWorkshopSlider(root) {
    const track = $("[data-slide-track]", root);
    const slides = $$("[data-slide]", root);
    const controls = $("[data-slider-controls]", root);
    const count = $("[data-slide-count]", root);
    if (!track || !slides.length || !controls) return;
    let active = 0;
    const update = () => {
      if (track.clientWidth) active = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.getBoundingClientRect().width)));
      count.textContent = `${active + 1} / ${slides.length}`;
    };
    const go = (index) => {
      active = (index + slides.length) % slides.length;
      track.scrollTo({ left: active * track.getBoundingClientRect().width, behavior: "instant" });
      update();
    };
    controls.hidden = false;
    $("[data-slide-prev]", root).addEventListener("click", () => go(active - 1));
    $("[data-slide-next]", root).addEventListener("click", () => go(active + 1));
    track.addEventListener("scroll", update, { passive: true });
    root.addEventListener("keydown", e => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      go(e.key === "Home" ? 0 : e.key === "End" ? slides.length - 1 : active + (e.key === "ArrowRight" ? 1 : -1));
    });
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => go(active)).observe(track);
    update();
  }

  /* ---------- Quick booking form on service pages ---------- */
  function mountQuickBook(form) {
    const svc = svcById[form.getAttribute("data-quick-book")];
    const out = $("[data-qb-result]", form.parentElement);
    const err = fieldError;
    $("[name=date]", form).min = today();
    form.addEventListener("input", () => { out.innerHTML = ""; });
    form.addEventListener("change", () => { out.innerHTML = ""; });
    form.addEventListener("submit", (e) => {
      e.preventDefault(); out.innerHTML = "";
      const v = (n) => $(`[name=${n}]`, form).value.trim();
      let ok = err($("[name=name]", form), v("name").length >= 2 ? "" : "Enter your name.");
      ok = err($("[name=mobile]", form), cleanMobile(v("mobile")) ? "" : "Enter a valid 10-digit mobile number.") && ok;
      ok = err($("[name=car]", form), v("car").length >= 2 ? "" : "Enter your car make and model.") && ok;
      const pr = v("pin") ? checkArea(v("pin")) : null;
      ok = err($("[name=date]", form), dateIssue($("[name=date]", form))) && ok;
      ok = err($("[name=pin]", form), !v("pin") || pr.pin ? "" : pr.message) && ok;
      if (!ok) { const inv = $('[aria-invalid="true"]', form); if (inv) inv.focus(); return; }
      const pickup = $("[name=pickup]", form).checked;
      const msg = [
        `Hello ${B.name}, booking request from your website.`,
        `Service: ${svc ? svc.name : "General enquiry"}`, `Name: ${v("name")}`, `Mobile: ${cleanMobile(v("mobile"))}`, `Car: ${v("car")}`,
        v("problem") ? `Problem: ${v("problem")}` : null,
        `Pickup & drop: ${pickup ? "Yes" : "No"}${v("pin") ? ` — PIN ${pr.pin}${pr.status === "covered" ? " (in your confirmed service area)" : " (please confirm availability)"}` : ""}`,
        v("date") || v("time") ? `Preferred: ${[v("date"), v("time")].filter(Boolean).join(", ")}` : null,
        "Please confirm the slot."
      ].filter(Boolean).join("\n");
      out.innerHTML = `<div class="status status--ok"><div><strong>Ready to send.</strong>WhatsApp will open with your details. The request is placed when you press send there; the garage replies to confirm.</div></div><a class="btn btn--wa btn--block" data-qb-wa target="_blank" rel="noopener" href="${waUrl(msg)}">${ICON.wa} Send booking on WhatsApp</a>`;
      out.querySelector("[data-qb-wa]").focus();
    });
  }

  /* ---------- Booking form (2 steps) ---------- */
  // Match a typed car ("maruti swift", "Swift", "Hyundai i20") to the vehicle list. Anything
  // unmatched is still accepted as the model text, so no customer is blocked by the list.
  const carKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  function resolveCar(text) {
    const raw = String(text || "").trim().replace(/\s+/g, " ");
    const words = raw.toLowerCase();
    if (!raw) return { brand: "", model: "", category: "" };
    // Exact model, a typed start of a model ("cre" → Creta), or a model inside extra words
    // ("Nexon EV", "City 2015", "Swift Dzire" → Dzire): the longest (then last) model name found sets the car type.
    const findModel = (b, rest) => {
      const k = carKey(rest);
      if (!k) return null;
      const exact = b.models.find((m) => carKey(m[0]) === k) || b.models.find((m) => carKey(m[0]).startsWith(k) && k.length >= 3);
      if (exact) return { m: exact, exact: true };
      const pre = b.models.filter((m) => k.includes(carKey(m[0])))
        .sort((x, y) => carKey(y[0]).length - carKey(x[0]).length || k.lastIndexOf(carKey(y[0])) - k.lastIndexOf(carKey(x[0])))[0];
      return pre ? { m: pre, exact: false } : null;
    };
    for (const b of C.brands) {
      if (!b.models.length) continue;
      const names = [b.name, b.name.split(/[\s-]/)[0]].map((n) => n.toLowerCase());
      const hit = names.find((n) => words === n || words.startsWith(n + " "));
      if (hit) {
        const rest = raw.slice(hit.length).trim();
        const f = findModel(b, rest);
        if (f) return { brand: b.name, model: f.exact ? f.m[0] : rest.slice(0, 80), category: f.m[1] };
        return { brand: b.name, model: (rest || raw).slice(0, 80), category: "" };
      }
    }
    for (const b of C.brands) {
      const f = findModel(b, raw);
      if (f && (f.exact ? carKey(f.m[0]) === carKey(raw) : true)) return { brand: b.name, model: f.exact ? f.m[0] : raw.slice(0, 80), category: f.m[1] };
    }
    return { brand: "", model: raw.slice(0, 80), category: "" };
  }
  function isoPlusDays(iso, days) {
    const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function prettyDate(iso) {
    try { return new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }); } catch (e) { return iso; }
  }
  function mountBooking(root) {
    const pre = F.draft(C, store.get("cmi-booking"));
    try { const qs = new URLSearchParams(location.search).get("service"); if (qs && Object.hasOwn(svcById, qs) && !(pre.services || []).includes(qs)) { pre.services = [qs]; delete pre.estimate; } } catch (e) {}
    const steps = $$("[data-bstep]", root);
    let step = 0, sending = false, requestSignature = "", requestId = "";
    const f = $("form", root);
    const car = $("#b-car", f), notes = $("#b-notes", f), more = $("[data-b-more]", f);
    // A page cached from before the 2-step form can load this script; ask for a refresh instead of breaking.
    if (!car || !more) {
      const body = $(".jobcard-body", root) || root;
      body.insertAdjacentHTML("afterbegin", `<p class="notice" data-b-stale>This booking page was updated. <a href="booking.html">Refresh the page</a> to book online, or <a href="${waUrl("")}" target="_blank" rel="noopener">book on WhatsApp</a>.</p>`);
      if (f) f.hidden = true;
      return;
    }
    const radioVal = (name) => { const r = $(`input[name="${name}"]:checked`, f); return r ? r.value : ""; };
    const setRadio = (name, value) => { const r = $$(`input[name="${name}"]`, f).find((x) => x.value === value); if (r) r.checked = true; return !!r; };
    const quickWa = $("[data-b-quick-wa]", root);
    if (quickWa) quickWa.href = waUrl(`Hello ${B.name}, I want to book a car service.\nCar: \nProblem: \nArea / PIN: `);

    // Full service list, tucked away for customers who know the exact job.
    {
      const groups = {};
      C.services.filter((s) => s.inCalculator !== false).forEach((s) => { (groups[s.group] = groups[s.group] || []).push(s); });
      const pick = new Set(pre.services || []);
      $("[data-b-services]", f).innerHTML = Object.entries(groups).map(([g, list]) => `<details class="b-group"${list.some((s) => pick.has(s.id)) ? " open" : ""}><summary>${esc(g)} <span class="small muted" data-b-count-g></span></summary><div class="chips">${list.map((s) => `<label class="chip"><input type="checkbox" name="b-svc" value="${s.id}"><span>${esc(s.name)}</span></label>`).join("")}</div></details>`).join("");
    }
    const recount = () => {
      $$(".b-group", f).forEach((d) => { const n = $$("input:checked", d).length; $("[data-b-count-g]", d).textContent = n ? "· " + n + " selected" : ""; });
      const total = $$('input[name="b-svc"]:checked', f).length;
      $("[data-b-more-count]", f).textContent = total ? "· " + total + " selected" : "";
    };
    const svcErr = $("[data-svc-err]", f);
    const clearSvcErr = () => { svcErr.hidden = true; svcErr.textContent = ""; };
    $("[data-b-services]", f).addEventListener("change", (e) => {
      const cb = e.target;
      const svc = svcById[cb.value];
      if (cb.checked && svc && svc.exclusive) {
        $$('input[name="b-svc"]:checked', f).forEach((other) => {
          if (other !== cb && svcById[other.value].exclusive === svc.exclusive) other.checked = false;
        });
      }
      if (selectedCount() > F.maxServices) {
        cb.checked = false; svcErr.hidden = false; svcErr.textContent = `Choose up to ${F.maxServices} services per request.`;
      } else clearSvcErr();
      recount(); renderBookingQty();
    });
    $("[data-b-needs]", f).addEventListener("change", (e) => {
      if (selectedCount() > F.maxServices) { e.target.checked = false; svcErr.hidden = false; svcErr.textContent = `Choose up to ${F.maxServices} services per request.`; }
      else clearSvcErr();
    });
    function selectedCount() { return $$('input[name="b-svc"]:checked, input[name="b-need"]:checked', f).length; }

    // Prefill from the estimator (or ?service=ID).
    const preBrand = brandById[pre.brand];
    if (pre.model || preBrand) car.value = [preBrand && pre.brand !== "other" ? preBrand.name : "", pre.model || ""].filter(Boolean).join(" ");
    (pre.services || []).forEach((id) => { const c = f.querySelector(`input[name="b-svc"][value="${id}"]`); if (c) c.checked = true; });
    if ((pre.services || []).length) more.open = true;
    if (pre.name) $("#b-name", f).value = pre.name;
    notes.value = [pre.symptoms, pre.lights && pre.lights.length ? "Warning lights: " + pre.lights.join(", ") : ""].filter(Boolean).join("\n");
    if (pre.area) { if (/^\d{6}$/.test(pre.area)) $("#b-pin", f).value = pre.area; else $("#b-address", f).value = pre.area; }
    const dateIn = $("#b-date", f), dateField = $("[data-b-date-field]", f);
    dateIn.min = today();
    if (pre.date && !F.dateError(pre.date, today())) {
      if (pre.date === today()) setRadio("b-day", "today");
      else if (pre.date === isoPlusDays(today(), 1)) setRadio("b-day", "tomorrow");
      else { setRadio("b-day", "pick"); dateIn.value = pre.date; }
    }
    if (pre.time && !setRadio("b-time", pre.time)) {
      const opt = document.createElement("label"); opt.className = "seg-opt";
      opt.innerHTML = `<input type="radio" name="b-time" value="${esc(pre.time)}"><span>${esc(pre.time)}</span>`;
      $('input[name="b-time"]', f).closest(".seg").appendChild(opt); setRadio("b-time", pre.time);
    }
    if (pre.pickup === "no") setRadio("b-pickup", "no");
    if (pre.estimate) { const n = $("[data-b-estimate]", root); n.hidden = false; n.innerHTML = `<div class="status status--ok"><div><strong>Carried over from your estimate: ${esc(pre.estimate)}</strong>${C.pricing.isDemo ? "Demo prices — " : ""}final quote after inspection.</div></div>`; }
    recount();

    // Quantity must survive the estimator → booking handoff.
    const quantities = { ...pre.qty };
    function renderBookingQty() {
      const box = $("[data-b-qty]", f);
      const list = $$('input[name="b-svc"]:checked', f).map((cb) => svcById[cb.value]).filter((s) => s.qty);
      box.hidden = !list.length;
      box.innerHTML = list.map((s) => `<div class="field"><label for="bq-${s.id}">${esc(s.name)} — quantity (${esc(s.unit)})</label><input id="bq-${s.id}" data-b-qty-for="${s.id}" type="number" min="1" max="${s.qty.max}" value="${quantities[s.id] || 1}"></div>`).join("");
    }
    renderBookingQty();
    $("[data-b-qty]", f).addEventListener("input", (e) => {
      const id = e.target.dataset.bQtyFor;
      if (!id || !svcById[id]) return;
      quantities[id] = e.target.value;
      fieldError(e.target, F.quantityError(e.target.value, svcById[id].qty.max));
    });

    // A carried price is valid only while the car, jobs, quantities and pickup stay the same.
    function priceSelection() {
      return JSON.stringify([carKey(car.value), radioVal("b-pickup"), $("#b-pin", f).value.trim(),
        $$('input[name="b-svc"]:checked', f).map((cb) => [cb.value, quantities[cb.value] || 1])]);
    }
    const originalSelection = priceSelection();
    let estimateValid = !!pre.estimate;
    function invalidateEstimate() {
      if (!estimateValid || priceSelection() === originalSelection) return;
      estimateValid = false;
      $("[data-b-estimate]", root).innerHTML = '<p class="notice">Your vehicle or services changed. <a href="estimate.html">Recalculate your estimate</a>, or request a fresh quote with this booking.</p>';
      store.remove("cmi-booking");
    }
    const changed = (e) => {
      invalidateEstimate(); if (!sending) $("[data-b-result]", root).textContent = "";
      // Clear a field's message as soon as the customer fixes it.
      const t = e && e.target;
      if (t && t.getAttribute && t.getAttribute("aria-invalid") === "true" && !t.matches("[data-b-qty-for]")) fieldError(t, "");
    };
    f.addEventListener("change", changed);
    f.addEventListener("input", changed);

    const toggleAddr = () => { $$("[data-addr]", f).forEach((el) => { el.hidden = radioVal("b-pickup") === "no"; }); if (radioVal("b-pickup") === "no") pinOut.innerHTML = ""; };
    const toggleDate = () => { dateField.hidden = radioVal("b-day") !== "pick"; };
    const pinIn = $("#b-pin", f), pinOut = $("[data-b-pin-result]", f);
    $$('input[name="b-pickup"]', f).forEach((r) => r.addEventListener("change", toggleAddr));
    $$('input[name="b-day"]', f).forEach((r) => r.addEventListener("change", () => { toggleDate(); if (radioVal("b-day") === "pick") dateIn.focus(); else fieldError(dateIn, ""); }));
    toggleAddr(); toggleDate();
    let pinT;
    const pinCheck = () => { const v = pinIn.value.trim(); pinOut.innerHTML = v && !/^\d{1,5}$/.test(v) ? areaMessage(checkArea(v), v) : ""; };
    pinIn.addEventListener("input", () => { clearTimeout(pinT); pinT = setTimeout(pinCheck, /^\d{6}$/.test(pinIn.value.trim()) ? 0 : 700); });
    if (pinIn.value) pinCheck();

    function chosenDate() {
      const d = radioVal("b-day");
      if (d === "today") return today();
      if (d === "tomorrow") return isoPlusDays(today(), 1);
      if (d === "pick") return dateIn.value;
      return "";
    }
    function validate(i) {
      let ok = true;
      if (i === 0) {
        ok = fieldError(car, car.value.trim().length >= 2 ? "" : "Type your car, e.g. Maruti Swift.") && ok;
        const count = selectedCount();
        const msg = !count && notes.value.trim().length < 3 ? "Tap what your car needs — or choose “Not sure — please check”." : count > F.maxServices ? `Choose up to ${F.maxServices} services per request.` : "";
        svcErr.hidden = !msg; svcErr.textContent = msg;
        if (msg && ok) { svcErr.tabIndex = -1; svcErr.focus(); }
        ok = !msg && ok;
        for (const el of $$("[data-b-qty-for]", f)) ok = fieldError(el, F.quantityError(el.value, svcById[el.dataset.bQtyFor].qty.max)) && ok;
      }
      if (i === 1) {
        ok = fieldError($("#b-name", f), $("#b-name", f).value.trim().length >= 2 ? "" : "Enter your name.") && ok;
        ok = fieldError($("#b-mobile", f), cleanMobile($("#b-mobile", f).value) ? "" : "Enter a valid 10-digit Indian mobile number.") && ok;
        if (radioVal("b-pickup") === "yes") {
          ok = fieldError($("#b-address", f), $("#b-address", f).value.trim().length >= 5 ? "" : "Enter the pickup address.") && ok;
          ok = fieldError(pinIn, F.validPin(pinIn.value) ? "" : "Enter a 6-digit PIN code (it cannot start with 0).") && ok;
        }
        if (radioVal("b-day") === "pick") ok = fieldError(dateIn, dateIn.value ? dateIssue(dateIn) : "Choose a date, or pick Today / Tomorrow.") && ok;
        else fieldError(dateIn, "");
      }
      if (!ok) { const inv = $('[aria-invalid="true"]', steps[i]); if (inv) inv.focus(); }
      return ok;
    }
    function payload() {
      const v = resolveCar(car.value);
      const needs = $$('input[name="b-need"]:checked', f).map((i) => i.value);
      const picked = $$('input[name="b-svc"]:checked', f).map((i) => {
        const s = svcById[i.value];
        return s.name + (s.qty ? " × " + (quantities[s.id] || 1) + " " + s.unit.replace(/^per /, "") + "(s)" : "");
      });
      let services = [...needs, ...picked].slice(0, 30);
      if (!services.length) services = ["Problem described in notes"];
      const category = v.category || (estimateValid ? pre.category || "" : "");
      const partsGrade = estimateValid && Object.hasOwn(C.pricing.partsGrade, pre.partsGrade) ? pre.partsGrade : "";
      const pickup = radioVal("b-pickup") === "no" ? "no" : "yes";
      return {
        name: $("#b-name", f).value.trim(), mobile: cleanMobile($("#b-mobile", f).value), contactMethod: "WhatsApp",
        brand: v.brand, model: v.model, registration: "",
        year: estimateValid && pre.year ? String(pre.year) : "", fuel: estimateValid && pre.fuel ? pre.fuel : "",
        services,
        serviceItems: $$('input[name="b-svc"]:checked', f).map((i) => ({ id: i.value, qty: svcById[i.value].qty ? Number(quantities[i.value] || 1) : 1 })),
        partsGrade, category,
        notes: [notes.value.trim(), partsGrade ? `Parts preference: ${C.pricing.partsGrade[partsGrade].label}` : "", estimateValid && pre.category ? `Vehicle category: ${pre.category}` : ""].filter(Boolean).join("\n"),
        pickup, address: pickup === "yes" ? $("#b-address", f).value.trim() : "", pin: pickup === "yes" ? pinIn.value.trim() : "",
        date: chosenDate(), time: radioVal("b-time"), estimate: estimateValid ? pre.estimate : ""
      };
    }
    function bookingText(p) {
      const fuel = p.fuel ? ((C.fuels.find((x) => x.id === p.fuel) || {}).label || p.fuel) : "";
      const area = p.pickup === "yes" ? checkArea(p.pin) : null;
      return [
        `Hello ${B.name}, booking request from your website.`,
        `Name: ${p.name}`, `Mobile: ${p.mobile}`,
        `Car: ${[p.brand, p.model, p.year ? "(" + p.year + ")" : ""].filter(Boolean).join(" ")}${fuel ? ", " + fuel : ""}`,
        `Needs: ${p.services.join(", ")}`,
        p.estimate ? `Website estimate: ${p.estimate}` : null,
        p.notes ? `Notes: ${p.notes}` : null,
        p.pickup === "yes" ? `Pickup & drop: Yes — ${p.address}, ${p.pin}${area && area.status === "covered" ? " (in your confirmed service area)" : " (please confirm availability)"}` : "Pickup & drop: No, I'll drop the car",
        p.date || p.time ? `Preferred: ${[p.date ? prettyDate(p.date) : "", p.time].filter(Boolean).join(", ")}` : null,
        "Please confirm the slot."
      ].filter(Boolean).join("\n");
    }
    function whenText(p) {
      const day = p.date === today() ? "Today" : p.date === isoPlusDays(today(), 1) ? "Tomorrow" : p.date ? prettyDate(p.date) : "Any day";
      return [day, p.time || "Any time"];
    }
    // What happens next — shown once the garage has the request.
    function successHtml(p) {
      const first = p.name.split(/\s+/)[0];
      const reply = B.bookingReplyTime ? ` ${esc(B.bookingReplyTime)}` : "";
      // Each item gets its own element so the Hindi view can translate it.
      const rows = [
        ["Car", [[p.brand, p.model].filter(Boolean).join(" ")]],
        ["Needs", p.services],
        ["Pickup", [p.pickup === "yes" ? `Yes — ${p.pin}` : "No, I'll drop it"]],
        ["When", whenText(p)]
      ];
      return `<div class="b-done">
        <div class="b-done-head"><span class="b-done-tick" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg></span><div><h2>Request received, ${esc(first)}!</h2><p>We'll WhatsApp or call you on <strong>${esc(p.mobile)}</strong>${reply} to confirm your slot.</p></div></div>
        <dl class="b-done-sum">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v.map((x) => `<span>${esc(x)}</span>`).join(", ")}</dd></div>`).join("")}</dl>
        <h3 class="b-done-title">What happens next</h3>
        <ol class="b-next">
          <li><strong>We confirm your slot</strong><span>on WhatsApp or a call${p.pickup === "yes" ? ", with the pickup time" : ""}.</span></li>
          <li><strong>We check the car</strong><span>and tell you the final price.</span></li>
          <li><strong>Work starts only after you say OK.</strong><span>No extra work without your approval.</span></li>
        </ol>
        <p class="small muted">Your booking is confirmed only after we call or message you.</p>
        <div class="b-done-actions"><a class="btn btn--outline" data-tel href="tel:${esc(B.phoneE164)}">${ICON.phone} Call us</a><a class="btn btn--wa" target="_blank" rel="noopener" href="${waUrl(`Hello ${B.name}, I just sent a booking request on your website (name: ${p.name}, mobile: ${p.mobile}).`)}">${ICON.wa} WhatsApp us</a></div>
      </div>`;
    }
    function show(i, moveFocus = true) {
      step = i;
      steps.forEach((s, k) => { s.hidden = k !== i; });
      $$(".steps-bar span", root).forEach((s, k) => s.classList.toggle("on", k <= i));
      $("[data-b-back]", root).hidden = i === 0;
      $("[data-b-next] span", root).textContent = i === steps.length - 1 ? (B.bookingEndpoint ? "Send request" : "Review & send") : "Next";
      $("[data-b-count]", root).textContent = `Step ${i + 1} of ${steps.length}`;
      if (moveFocus) {
        focusStep(steps[i]);
        const top = root.getBoundingClientRect().top;
        if (top < 0) root.scrollIntoView({ block: "start" });
      }
    }
    $("[data-b-back]", root).addEventListener("click", () => show(Math.max(0, step - 1)));
    // Tell the customer what actually happened. Resending unchanged details reuses the same
    // request ID, and the server ignores duplicates, so "press Send again" is safe.
    function bookingFailure(err, timedOut) {
      const status = err && err.status;
      if (err && err.offline) return { title: "You're offline. Your request was not sent.", text: "Connect to the internet and press Send request again, or send the same details on WhatsApp.", button: "Send on WhatsApp" };
      if (status === 400 || status === 413 || status === 415) return { title: "We couldn't accept these details.", text: "Your request was not saved. Please check your details and try again, or send them on WhatsApp.", button: "Send on WhatsApp" };
      if (status === 429) return { title: "Too many requests from this number.", text: "Your request was not saved. Please call or WhatsApp the garage to book.", button: "Send on WhatsApp" };
      if (status === 403 || status === 404 || status === 405) return { title: "Online booking isn't available right now.", text: "Your request was not saved. Please send it on WhatsApp or call the garage.", button: "Send on WhatsApp" };
      if (status === 409) return { title: "An earlier version of this request already reached us.", text: "Please message the garage on WhatsApp with any changes instead of resending.", button: "Message on WhatsApp" };
      return { title: timedOut ? "The request timed out." : "We couldn't confirm your request.", text: "It may or may not have reached the garage. You can safely press Send request again — the same request is never booked twice — or check with us on WhatsApp.", button: "Check on WhatsApp" };
    }
    function hideQuick(hidden) { const q = $(".b-quick", root); if (q) q.hidden = hidden; $(".jobcard-head", root).hidden = hidden; $(".steps-bar", root).hidden = hidden; }
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending || !validate(step)) return;
      if (step < steps.length - 1) return show(step + 1);
      for (let i = 0; i < steps.length; i++) { if (!validate(i)) { show(i); return; } }
      invalidateEstimate();
      const p = payload();
      const out = $("[data-b-result]", root);
      const btn = $("[data-b-next]", root);
      if (B.bookingEndpoint) {
        sending = true; f.inert = true; f.setAttribute("aria-busy", "true");
        btn.disabled = true; $("[data-b-back]", root).disabled = true;
        $("[data-b-next] span", root).textContent = "Sending…";
        out.textContent = "Sending your request…";
        const controller = new AbortController();
        const timeoutMs = Number(B.bookingTimeoutMs) > 0 ? Math.min(Number(B.bookingTimeoutMs), 60000) : 15000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const endpoint = new URL(B.bookingEndpoint, location.href);
          if (endpoint.protocol !== "https:" && !(endpoint.origin === location.origin && endpoint.protocol === "http:")) throw new Error("Unsafe endpoint");
          const body = JSON.stringify(p);
          const headers = { "Content-Type": "application/json", ...(B.bookingHeaders || {}) };
          if (B.bookingIdempotency) {
            if (requestSignature !== body) { requestSignature = body; requestId = crypto.randomUUID(); }
            headers["X-Idempotency-Key"] = requestId;
          }
          let res;
          try { res = await fetch(endpoint.href, { method: "POST", headers, body, signal: controller.signal, referrerPolicy: "no-referrer", credentials: "omit" }); }
          catch (netErr) { netErr.offline = typeof navigator !== "undefined" && navigator.onLine === false; throw netErr; }
          if (!res.ok) { const httpErr = new Error("HTTP " + res.status); httpErr.status = res.status; throw httpErr; }
          const acknowledgement = await res.json();
          if (!F.receipt(acknowledgement, B.bookingIdempotency ? requestId : "")) throw new Error("Receipt not confirmed");
          f.hidden = true; store.remove("cmi-booking"); hideQuick(true); $("[data-b-estimate]", root).hidden = true;
          out.innerHTML = successHtml(p);
        } catch (err) {
          const fail = bookingFailure(err, controller.signal.aborted);
          out.innerHTML = `<div class="status status--bad" role="alert"><div><strong>${esc(fail.title)}</strong>${esc(fail.text)}</div></div><a class="btn btn--wa" target="_blank" rel="noopener" href="${waUrl(bookingText(p))}">${ICON.wa} ${esc(fail.button)}</a>`;
        } finally {
          clearTimeout(timer); sending = false; f.inert = false; f.removeAttribute("aria-busy");
          btn.disabled = false; $("[data-b-back]", root).disabled = false; show(step, false);
          if (f.hidden) { out.setAttribute("tabindex", "-1"); out.focus({ preventScroll: true }); root.scrollIntoView({ block: "start" }); }
        }
        return;
      }
      // No backend configured → WhatsApp fallback
      f.hidden = true; hideQuick(true);
      out.innerHTML = `<div class="success">
        <div class="step-title"><span class="num">Last step</span><h2>Send your request on WhatsApp</h2></div>
        <pre class="summary-chip" style="white-space:pre-wrap;margin:0">${esc(bookingText(p))}</pre>
        <a class="btn btn--wa btn--block" data-b-wa target="_blank" rel="noopener" href="${waUrl(bookingText(p))}">${ICON.wa} Open WhatsApp & send</a>
        <p class="small muted"><strong>How bookings work:</strong> this website doesn't store bookings in a database. Your details go to the garage only through the WhatsApp message you send. Your request is placed only when you press send in WhatsApp. We'll reply to confirm the slot and quotation. If WhatsApp doesn't open, call <span class="phone-line" style="color:inherit">${esc(B.phoneDisplay)}</span>.</p>
        <button type="button" class="btn btn--outline btn--sm" data-b-edit>Edit details</button>
        <div data-b-after></div></div>`;
      out.setAttribute("tabindex", "-1"); out.focus({ preventScroll: true }); root.scrollIntoView({ block: "start" });
      $("[data-b-wa]", out).addEventListener("click", () => {
        store.remove("cmi-booking");
        $("[data-b-after]", out).innerHTML = `<div class="status status--ok"><div><strong>WhatsApp opened with your details.</strong>Press send in WhatsApp to complete the request.</div></div>`;
      });
      $("[data-b-edit]", out).addEventListener("click", () => { f.hidden = false; hideQuick(false); out.innerHTML = ""; });
    });
    // Coming from the calculator with the car and jobs already chosen: open straight at "your details".
    show(pre.estimate && car.value.trim().length >= 2 && selectedCount() ? 1 : 0, false);
  }

  /* ---------- Display language ---------- */
  function applyLang(lang) {
    if (window.CMI_I18N?.available) { window.CMI_I18N.apply(lang); return; }
    // If a language asset fails, keep the English controls usable and correctly tagged.
    document.documentElement.lang = "en";
    $$(".lang-toggle").forEach(button => {
      button.disabled = true;
      button.lang = "hi";
      button.title = "Hindi could not load. Refresh to try again.";
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    $$("[data-estimator]").forEach(mountEstimator);
    // Home hero price tiles (phones): open the calculator with that job ticked, ready for the car.
    $$("[data-hero-svc]").forEach((a) => a.addEventListener("click", (e) => {
      const est = $("#estimate[data-estimator]");
      if (!est || !est.cmiPreset) return;
      e.preventDefault();
      est.cmiPreset([a.dataset.heroSvc]);
      est.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => est.cmiFocusCar && est.cmiFocusCar(), 450);
    }));
    $$("[data-booking]").forEach(mountBooking);
    renderPackages(); renderRateTables(); renderReviews(); renderAreas(); renderGallery();
    $$("form[data-review-form]").forEach(mountReviewForm);
    $$("[data-workshop-slider]").forEach(mountWorkshopSlider);
    $$("[data-service-explorer]").forEach(mountServiceExplorer);
    $$("form[data-quick-book]").forEach(mountQuickBook);
    $$(".field input, .field select, .field textarea").forEach(el => { if ($(".err", el.closest(".field"))) errorBox(el); });
    const mobileActions = $(".mbar");
    if (mobileActions && typeof ResizeObserver !== "undefined") new ResizeObserver(() => {
      document.documentElement.style.setProperty("--mobile-actions-height", Math.ceil(mobileActions.getBoundingClientRect().height) + "px");
    }).observe(mobileActions);
    // Slide the bottom action bar away while someone types, so it never sits over a field.
    if (mobileActions) {
      const typingField = (el) => el && el.matches && el.matches("input:not([type=radio]):not([type=checkbox]):not([type=button]):not([type=submit]), textarea, select");
      document.addEventListener("focusin", (e) => { if (typingField(e.target)) document.body.classList.add("is-typing"); });
      document.addEventListener("focusout", (e) => { if (!typingField(e.relatedTarget)) document.body.classList.remove("is-typing"); });
    }
    wireWhatsApp();
    $$("[data-phone]").forEach((el) => { el.textContent = B.phoneDisplay; });
    const menu = $(".menu-btn"), nav = $(".nav");
    if (menu && nav) {
      const closeMenu = () => { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); };
      menu.addEventListener("click", () => { const open = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(open)); });
      nav.addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) { closeMenu(); menu.focus(); } });
      document.addEventListener("click", (e) => { if (!nav.contains(e.target) && !menu.contains(e.target)) closeMenu(); });
    }
    let lang = store.lget("cmi-lang") || "en";
    applyLang(lang);
    $$(".lang-toggle").forEach((b) => b.addEventListener("click", () => { lang = lang === "hi" ? "en" : "hi"; store.lset("cmi-lang", lang); applyLang(lang); }));
    $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
    renderOpenStatus(); setInterval(renderOpenStatus, 60000);
    if (B.googleAnalyticsId) {
      const s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + B.googleAnalyticsId; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); }; gtag("js", new Date()); gtag("config", B.googleAnalyticsId);
    }
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
})();
