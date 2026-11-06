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

  /* ---------- Estimator ---------- */
  function mountEstimator(root) {
    const headingTag = root.dataset.headingLevel === "2" ? "h2" : "h3";
    const subHeadingTag = headingTag === "h2" ? "h3" : "h4";
    const state = { partsGrade: "standard", qty: {}, services: new Set(), pickupResult: null };
    const preset = (root.getAttribute("data-preset") || "").split(",").filter(Boolean);
    const groups = {};
    C.services.filter((s) => s.inCalculator !== false).forEach((s) => { (groups[s.group] = groups[s.group] || []).push(s); });
    // Price line under each service. Uses the car type and fuel chosen in step 1 (hatchback/petrol before that).
    const catLabel = (id) => ((C.categories.find((c) => c.id === id) || {}).label || "Hatchback");
    const fuelLabel = (id) => ((C.fuels.find((f) => f.id === id) || {}).label || "");
    const fromText = (s, category = "hatchback", fuel = "petrol") => {
      const q = PR.quickRange(C, s.id, category, fuel);
      if (q.status === "priced") return catLabel(category) + " " + PR.formatINR(q.range[0]) + "–" + PR.formatINR(q.range[1]).slice(1) + (q.partsQuoted ? " + parts" : "") + (s.qty ? " · per " + s.unit.replace(/^per /, "") : "");
      if (q.status === "not-applicable") return "Not for " + fuelLabel(fuel).toLowerCase() + " cars";
      if (q.status === "inspection" || /inspection/i.test(q.text || "")) return "Quote after inspection";
      return "Price on request";
    };

    root.innerHTML = `
      <div class="jobcard-head"><span>Job card · <b>Estimate</b></span><span>${C.pricing.isDemo ? '<span class="tag tag--demo">Demo prices</span>' : `Rate card <time datetime="${esc(RATE_V)}">${esc(RATE_V)}</time>`}</span></div>
      <div class="steps-bar" aria-hidden="true"><span class="on"></span><span></span><span></span><span></span></div>
      <form class="jobcard-body" novalidate>
        <section data-step="1">
          <div class="step-title"><span class="num">01–05</span><${headingTag} data-i18n="est.car">Your car</${headingTag}></div>
          <div class="grid-2" style="margin-top:14px">
            <div class="field"><label for="e-brand">Manufacturer</label><select id="e-brand" required></select></div>
            <div class="field"><label for="e-model">Model</label><select id="e-model" required disabled></select><input id="e-model-other" aria-label="Car model" maxlength="80" placeholder="Type your car model" hidden></div>
            <div class="field"><label for="e-year">Year</label><select id="e-year" required></select></div>
            <div class="field"><label for="e-grade">Parts grade</label><select id="e-grade">${Object.entries(C.pricing.partsGrade).map(([k, v]) => `<option value="${k}" ${k === "standard" ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select></div>
          </div>
          <div class="field" style="margin-top:14px"><span class="label" id="l-fuel">Fuel type</span><div class="chips" role="radiogroup" aria-labelledby="l-fuel">${chipsHtml("fuel", C.fuels)}</div></div>
          <div class="field" style="margin-top:14px"><span class="label" id="l-cat">Vehicle category</span><div class="chips" role="radiogroup" aria-labelledby="l-cat">${chipsHtml("cat", C.categories)}</div><span class="hint">Auto-selected from your model — change it if needed.</span></div>
          <p class="err" data-err="1" hidden></p>
        </section>
        <section data-step="2" hidden>
          <div class="step-title"><span class="num">06</span><${headingTag} data-i18n="est.services">Choose services</${headingTag}></div>
          <p class="hint muted small" style="margin:6px 0 12px" data-svc-hint>Select one or more. Overlapping jobs are counted once. Prices shown are for a hatchback; your estimate adjusts for your car.</p>
          <div class="field svc-search"><label class="sr-only" for="e-search">Search services</label><input id="e-search" type="search" placeholder="Search, e.g. brake, AC, battery, dent" autocomplete="off"></div>
          <div class="svc-groups">${Object.entries(groups).map(([g, list]) => `
            <div class="svc-group" data-group="${esc(g)}"><${subHeadingTag} class="svc-group-title">${esc(g)}</${subHeadingTag}><div class="svc-list">${list.map((s) => `
              <label class="svc-opt" data-svc="${s.id}" data-search="${esc((s.name + " " + g + " " + (s.includes || []).join(" ")).toLowerCase())}"><input type="checkbox" value="${s.id}"><span><span class="t">${esc(s.name)}</span><span class="s">${esc(fromText(s))}</span></span></label>`).join("")}
            </div></div>`).join("")}
            <p class="muted small" data-search-empty hidden>No service matches. Choose "Other / custom repair" and describe the problem.</p>
          </div>
          <div class="qty-row" data-qty hidden></div>
          <p class="err" data-err="2" hidden></p>
        </section>
        <section data-step="3" hidden>
          <div class="step-title"><span class="num">07</span><${headingTag} data-i18n="est.details">Problem & pickup</${headingTag}></div>
          <div class="field" style="margin-top:14px"><span class="label" id="l-lights">Warning lights on the dashboard (optional)</span><div class="chips" aria-labelledby="l-lights">${chipsHtml("lights", ["Check engine", "ABS", "Battery", "Oil pressure", "Temperature", "Airbag"].map((x) => ({ id: x, label: x })), "checkbox")}</div></div>
          <div class="field" style="margin-top:14px"><label for="e-symptoms">Symptoms or notes (optional)</label><textarea id="e-symptoms" maxlength="500" placeholder="e.g. squeaking when braking, AC not cooling"></textarea></div>
          <div class="grid-2" style="margin-top:14px">
            <div class="field"><label for="e-pickup">Pickup & drop</label><select id="e-pickup"><option value="yes">Yes, pick up my car</option><option value="no">No, I'll drop it at the workshop</option></select></div>
            <div class="field" data-pin-field><label for="e-pin">Locality or PIN code</label><input id="e-pin" autocomplete="postal-code" placeholder="e.g. Vijay Nagar or 452010"></div>
            <div class="field"><label for="e-date">Preferred date (optional)</label><input id="e-date" type="date"><p class="err" data-date-err hidden></p></div>
            <div class="field"><label for="e-time">Preferred time (optional)</label><select id="e-time"><option value="">Any time</option>${(B.timeSlots || []).map((t) => `<option>${esc(t)}</option>`).join("")}</select></div>
            <div class="field"><label for="e-name">Your name (optional)</label><input id="e-name" autocomplete="name" maxlength="60"></div>
          </div>
          <div data-pin-result style="margin-top:12px"></div>
        </section>
        <section data-step="4" hidden aria-live="polite"></section>
        <div class="summary-chip" data-summary hidden></div>
        <div class="step-nav">
          <button type="button" class="btn btn--outline btn--sm" data-back hidden>Back</button>
          <button type="submit" class="btn" data-next style="margin-left:auto"><span data-i18n="est.next">Next</span> ${ICON.arrow}</button>
        </div>
      </form>`;

    const form = $("form", root);
    const brand = $("#e-brand", root), model = $("#e-model", root), modelOther = $("#e-model-other", root), year = $("#e-year", root);
    fillBrands(brand); fillModels(model, ""); fillYears(year);
    $("#e-date", root).min = today();
    let step = 1;

    brand.addEventListener("change", () => {
      const other = brand.value === "other";
      model.hidden = other; modelOther.hidden = !other;
      fillModels(model, brand.value);
      if (LUX.includes(brand.value)) setRadio("cat", "luxury");
    });
    model.addEventListener("change", () => {
      const opt = model.selectedOptions[0];
      if (opt && opt.dataset.cat) setRadio("cat", opt.dataset.cat);
      if (/EV$/.test(model.value)) setRadio("fuel", "electric");
    });
    function setRadio(name, val) { const r = form.querySelector(`input[name="${name}"][value="${val}"]`); if (r) r.checked = true; }
    function radio(name) { const r = form.querySelector(`input[name="${name}"]:checked`); return r ? r.value : ""; }

    function renderQty() {
      const box = $("[data-qty]", root);
      const list = [...state.services].map((id) => svcById[id]).filter((s) => s && s.qty);
      box.hidden = !list.length;
      box.innerHTML = list.map((s) => `<div class="qty-item"><label for="q-${s.id}" class="label">${esc(s.name)} — how many (${esc(s.unit.replace(/^per /, ""))}s)?</label><input id="q-${s.id}" data-qty-for="${s.id}" type="number" min="1" max="${s.qty.max}" value="${state.qty[s.id] || 1}" inputmode="numeric"></div>`).join("");
      $$("[data-qty-for]", box).forEach((inp) => inp.addEventListener("input", () => {
        const s = svcById[inp.dataset.qtyFor];
        state.qty[s.id] = inp.value;
        fieldError(inp, F.quantityError(inp.value, s.qty.max));
      }));
    }
    $$(".svc-opt input", root).forEach((cb) => cb.addEventListener("change", () => {
      const s = svcById[cb.value];
      if (cb.checked && state.services.size >= F.maxServices && !state.services.has(cb.value) &&
          !(s.exclusive && [...state.services].some(id => svcById[id].exclusive === s.exclusive))) {
        cb.checked = false; err(2, `Choose up to ${F.maxServices} services per request.`); return;
      }
      if (cb.checked && s.exclusive) {   // e.g. only one periodic service level at a time
        $$(".svc-opt input", root).forEach((o) => { if (o !== cb && o.checked && svcById[o.value].exclusive === s.exclusive) { o.checked = false; o.closest(".svc-opt").classList.remove("checked"); state.services.delete(o.value); } });
      }
      cb.closest(".svc-opt").classList.toggle("checked", cb.checked);
      cb.checked ? state.services.add(cb.value) : state.services.delete(cb.value);
      renderQty();
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
    preset.forEach((id) => { const cb = $(`.svc-opt input[value="${id}"]`, root); if (cb) { cb.checked = true; cb.dispatchEvent(new Event("change")); } });

    const pickupSel = $("#e-pickup", root), pin = $("#e-pin", root);
    // State is recomputed silently; the message renders while typing (debounced), never on blur,
    // so the layout doesn't jump under the user's finger as they tap "See estimate".
    function refreshPin(render = true) {
      $("[data-pin-field]", root).hidden = pickupSel.value === "no";
      state.pickupResult = pickupSel.value === "no" || !pin.value.trim() ? null : checkArea(pin.value);
      if (render) $("[data-pin-result]", root).innerHTML = state.pickupResult ? areaMessage(state.pickupResult, pin.value.trim()) : "";
    }
    let pinTimer;
    pickupSel.addEventListener("change", () => refreshPin());
    pin.addEventListener("input", () => { clearTimeout(pinTimer); refreshPin(false); pinTimer = setTimeout(refreshPin, /^\s*\d{6}\s*$/.test(pin.value) ? 0 : 700); });
    $("#e-date", root).min = today();

    function carLabel() {
      const b = brandById[brand.value];
      const m = brand.value === "other" ? modelOther.value.trim() : model.value;
      return [b && b.id !== "other" ? b.name : "", m, year.value ? "(" + (Number(year.value) < C.yearRange.from ? "before " + C.yearRange.from : year.value) + ")" : ""].filter(Boolean).join(" ");
    }
    function err(n, msg) { const e = $(`[data-err="${n}"]`, root); e.id = `estimate-step-${n}-error`; e.setAttribute("role", "alert"); e.textContent = msg || ""; e.hidden = !msg; }
    function validate(n) {
      if (n === 1) {
        const m = brand.value === "other" ? modelOther.value.trim() : model.value;
        const missing = [!brand.value && "manufacturer", !m && "model", !year.value && "year", !radio("fuel") && "fuel type", !radio("cat") && "category"].filter(Boolean);
        [brand, model, modelOther, year].forEach((el) => el.removeAttribute("aria-invalid"));
        if (!brand.value) brand.setAttribute("aria-invalid", "true");
        if (!m) (brand.value === "other" ? modelOther : model).setAttribute("aria-invalid", "true");
        if (!year.value) year.setAttribute("aria-invalid", "true");
        for (const el of [brand, model, modelOther, year, ...$$('input[name="fuel"], input[name="cat"]', root)]) {
          el.setAttribute("aria-describedby", "estimate-step-1-error");
          if (el.name === "fuel" || el.name === "cat") !radio(el.name) ? el.setAttribute("aria-invalid", "true") : el.removeAttribute("aria-invalid");
        }
        err(1, missing.length ? "Please choose your " + missing.join(", ") + "." : "");
        return !missing.length;
      }
      if (n === 2) {
        const message = !state.services.size ? "Select at least one service." : state.services.size > F.maxServices ? `Choose up to ${F.maxServices} services per request.` : "";
        err(2, message); let ok = !message;
        for (const el of $$("[data-qty-for]", root)) ok = fieldError(el, F.quantityError(el.value, svcById[el.dataset.qtyFor].qty.max)) && ok;
        if (message) { const box = $('[data-err="2"]', root); box.tabIndex = -1; box.focus(); }
        return ok;
      }
      if (n === 3) {
        const date = $("#e-date", root), msg = dateIssue(date);
        fieldError(date, msg);
        return !msg;
      }
      return true;
    }
    function compute() {
      refreshPin(false);
      const pr = pickupSel.value === "no" ? "none" : AREA.pickupState(state.pickupResult);
      return PR.estimate(C, {
        category: radio("cat"), fuel: radio("fuel"), year: year.value, partsGrade: $("#e-grade", root).value,
        services: [...state.services].map((id) => ({ id, qty: state.qty[id] || 1 })),
        pickup: pr
      });
    }
    function bookingPayload(r) {
      return {
        name: $("#e-name", root).value.trim(), brand: brand.value, model: brand.value === "other" ? modelOther.value.trim() : model.value,
        car: carLabel(), year: year.value, yearExact: true, fuel: radio("fuel"), category: radio("cat"),
        services: [...state.services], qty: Object.fromEntries(Object.entries(state.qty).map(([id, q]) => [id, Number(q)])), lights: $$('input[name="lights"]:checked', root).map((i) => i.value),
        symptoms: $("#e-symptoms", root).value.trim(), pickup: pickupSel.value, area: pin.value.trim(),
        date: $("#e-date", root).value, time: $("#e-time", root).value,
        estimate: r.pricedJobs ? PR.formatRange(r.total) + (r.partsQuoted ? " + parts quoted by model" : "") : unpriced(r).short, partsGrade: $("#e-grade", root).value
      };
    }
    // Headline when nothing could be priced: say why, instead of always "Inspection required".
    function unpriced(r) {
      if (r.inspection.length) return { title: "Inspection required", short: "Quote after inspection", text: "Request a quote — we'll price it after inspecting the car" };
      if (r.quotes.length) return { title: "Price on request", short: "Price on request", text: "We'll send you a quote on WhatsApp" };
      return { title: "No priced jobs", short: "No applicable jobs", text: "These jobs don't apply to your car. Go back and choose other services" };
    }
    function waMessage(p, r) {
      const svcNames = p.services.map((id) => svcById[id].name + (svcById[id].qty ? " × " + (p.qty[id] || 1) + " " + svcById[id].unit.replace(/^per /, "") + "(s)" : ""));
      const fuel = (C.fuels.find((f) => f.id === p.fuel) || {}).label || "";
      return [
        `Hello ${B.name}, I'd like to book a service.`,
        p.name ? `Name: ${p.name}` : null,
        `Car: ${p.car}`,
        `Fuel: ${fuel}`,
        `Services: ${svcNames.join(", ")}`,
        `Estimated range: ${p.estimate}${C.pricing.isDemo ? " (website demo estimate)" : ""}`,
        r.inspection.length ? `Needs inspection: ${r.inspection.join(", ")}` : null,
        r.quotes.length ? `Price on request: ${r.quotes.join(", ")}` : null,
        p.lights.length ? `Warning lights: ${p.lights.join(", ")}` : null,
        p.symptoms ? `Symptoms: ${p.symptoms}` : null,
        `Pickup & drop: ${p.pickup === "yes" ? "Yes" : "No, I'll drop it"}`,
        p.area ? `Area / PIN: ${p.area}` : null,
        p.date || p.time ? `Preferred: ${[p.date, p.time].filter(Boolean).join(", ")}` : null,
        "Please confirm availability and the final quote."
      ].filter(Boolean).join("\n");
    }
    function renderResult() {
      const r = compute();
      const p = bookingPayload(r);
      store.set("cmi-booking", p);
      const rows = r.lines.map((l) => {
        if (l.status === "priced") return `<tr><td>${esc(l.name)}${l.qty > 1 ? ` × ${l.qty} ${esc((l.unit || "").replace(/^per /, ""))}s` : ""}<br><span class="small muted">Labour ${PR.formatRange(l.labour)} · ${l.parts ? "Parts " + PR.formatRange(l.parts) : esc(l.partsNote || "Parts quoted by model")}</span></td><td>${PR.formatRange(l.total)}${l.partsQuoted ? "<br><span class=\"small muted\">+ parts</span>" : ""}</td></tr>`;
        if (l.status === "covered") return `<tr><td>${esc(l.name)} <span class="tag tag--ok">Included</span><br><span class="small muted">Part of ${esc(l.coveredBy)}</span></td><td>—</td></tr>`;
        if (l.status === "inspection") return `<tr><td>${esc(l.name)} <span class="tag tag--warn">Inspection</span><br><span class="small muted">Inspection required — request a quote</span></td><td>Quote</td></tr>`;
        if (l.status === "quote") return `<tr><td>${esc(l.name)} <span class="tag tag--warn">On request</span><br><span class="small muted">${esc(l.reason)} — we'll quote on WhatsApp</span></td><td>Quote</td></tr>`;
        return `<tr><td>${esc(l.name)} <span class="tag tag--muted">N/A</span><br><span class="small muted">${esc(l.reason || "Not applicable")}</span></td><td>—</td></tr>`;
      }).join("");
      const priced = r.pricedJobs > 0;
      $('[data-step="4"]', root).innerHTML = `
        <div class="step-title"><span class="num">08</span><${headingTag}>Your estimate</${headingTag}></div>
        <div class="estimate">
          <div class="est-total">
            <span class="k">${esc(p.car)} · ${esc((C.fuels.find((f) => f.id === p.fuel) || {}).label)} · ${esc((C.categories.find((c) => c.id === p.category) || {}).label)}</span>
            <span class="v">${priced ? PR.formatRange(r.total) : esc(unpriced(r).title)}</span>
            <span class="t">${priced ? "Estimated total" + (r.partsQuoted ? " + parts quoted by model" : "") + (r.tax ? " incl. " + esc(r.taxLabel) : "") + (r.inspection.length || r.quotes.length ? " · other jobs quoted separately" : "") : esc(unpriced(r).text)}${r.hours ? " · Typical time: " + PR.formatHours(r.hours) : ""}</span>
          </div>
          <div class="table-scroll"><table class="est-table">
            <thead><tr><th>Job</th><th>Range</th></tr></thead>
            <tbody>${rows}
              ${priced ? `<tr><td>Estimated labour</td><td>${PR.formatRange(r.labour)}</td></tr>
              <tr><td>Estimated parts & consumables</td><td>${PR.formatRange(r.parts)}${r.partsQuoted ? "<br><span class=\"small muted\">+ parts quoted by model</span>" : ""}</td></tr>
              <tr><td>${r.tax ? esc(r.taxLabel) : "Taxes"}</td><td>${r.tax ? PR.formatRange(r.tax) : "As per final bill"}</td></tr>` : ""}
              <tr><td>${esc(r.pickup.label)}${r.pickup.note ? `<br><span class="small muted">${esc(r.pickup.note)}</span>` : ""}</td><td>${r.pickup.amount ? (r.pickup.amount[1] === 0 ? "₹0" : PR.formatRange(r.pickup.amount)) : "TBC"}</td></tr>
              ${priced ? `<tr class="sum"><td>Estimated total${r.partsQuoted ? " (excl. parts quoted by model)" : ""}</td><td>${PR.formatRange(r.total)}</td></tr>` : ""}
            </tbody></table></div>
          ${r.includes.length || r.excludes.length ? `<div class="inc-exc">
            <div><${subHeadingTag} class="estimate-list-title">Included</${subHeadingTag}><ul>${r.includes.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>
            <div><${subHeadingTag} class="estimate-list-title">Not included</${subHeadingTag}><ul>${r.excludes.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div></div>` : ""}
          ${r.notes.map((n) => `<p class="small muted">• ${esc(n)}</p>`).join("")}
          <p class="disclaimer"><strong>This is an indicative estimate, not a final price.</strong> The final quotation is given after inspection. No additional work is done without your approval, and you get an itemised bill.${C.pricing.isDemo ? " <strong>Prices shown are demo values until the workshop publishes its rate card.</strong>" : ""}</p>
          <div class="est-actions">
            <a class="btn" data-book-form href="booking.html">${ICON.calendar} Book This Service</a>
            <a class="btn btn--wa" data-book-wa target="_blank" rel="noopener" href="${waUrl(waMessage(p, r))}">${ICON.wa} Book on WhatsApp</a>
          </div>
          <div class="est-tools">
            <button type="button" class="btn btn--outline btn--sm" data-copy-est>Copy estimate</button>
            <button type="button" class="btn btn--outline btn--sm" data-restart>Start over</button>
          </div>
          <p class="small muted" data-copy-status aria-live="polite">Your details carry over to the booking form, or WhatsApp opens with them filled in. A booking is confirmed only after the garage replies.</p>
        </div>`;
      const box = $('[data-step="4"]', root);
      const text = [waMessage(p, r).replace(/^Hello[^\n]*\n/, "").replace(/\nPlease confirm.*$/, ""), "Indicative estimate — final quote after inspection."].join("\n");
      $("[data-copy-est]", box).addEventListener("click", () => {
        const done = (ok) => { $("[data-copy-status]", box).textContent = ok ? "Estimate copied." : "Couldn't copy automatically — select the text in the table instead."; };
        try { navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); } catch (e) { done(false); }
      });
      $("[data-restart]", box).addEventListener("click", () => {
        store.remove("cmi-booking");
        form.reset(); state.services.clear(); state.pickupResult = null;
        $$(".svc-opt", root).forEach((o) => o.classList.remove("checked"));
        state.qty = {}; renderQty(); search.value = ""; search.dispatchEvent(new Event("input"));
        fillModels(model, ""); model.hidden = false; modelOther.hidden = true; refreshPin(); go(1);
      });
    }
    // Re-price the service list for the chosen car and switch off jobs that don't apply (e.g. oil change on an EV).
    function refreshServiceList() {
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
      if (removed) renderQty();
      const hint = $("[data-svc-hint]", root);
      if (hint) hint.textContent = "Select one or more. Overlapping jobs are counted once. Prices shown are for a " + catLabel(category).toLowerCase() + (fuel !== "petrol" ? " (" + fuelLabel(fuel).toLowerCase() + ")" : "") + "; your final estimate also reflects the car's age and parts grade." + (fuel === "electric" ? " Jobs that don't apply to electric cars are switched off." : "");
    }
    function go(n) {
      if (n === 2) refreshServiceList();
      step = n;
      $$("section[data-step]", root).forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
      $$(".steps-bar span", root).forEach((s, i) => s.classList.toggle("on", i < n));
      $("[data-back]", root).hidden = n === 1;
      $("[data-next]", root).hidden = n === 4;
      const nx = $("[data-next] span", root);
      nx.textContent = n === 3 ? "See estimate" : "Next";
      const sum = $("[data-summary]", root);
      sum.hidden = n === 1 || n === 4;
      sum.textContent = carLabel() + (state.services.size && n > 2 ? " · " + state.services.size + " service(s)" : "");
      if (n === 4) renderResult();
      focusStep($(`section[data-step="${n}"]`, root));
      if (n > 1) { const top = root.getBoundingClientRect().top; if (top < 0) root.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }
    form.addEventListener("submit", (e) => { e.preventDefault(); if (validate(step)) go(Math.min(4, step + 1)); else { const inv = $('[aria-invalid="true"]', root); if (inv) inv.focus(); } });
    $("[data-back]", root).addEventListener("click", () => go(Math.max(1, step - 1)));
    refreshPin();
    root.cmiPreset = (ids) => {
      $$(".svc-opt input", root).forEach((cb) => { const on = ids.includes(cb.value); if (cb.checked !== on) { cb.checked = on; cb.dispatchEvent(new Event("change")); } });
      if (step > 2) go(validate(1) ? 2 : 1);
    };
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

  /* ---------- Booking form ---------- */
  function mountBooking(root) {
    const pre = F.draft(C, store.get("cmi-booking"));
    try { const qs = new URLSearchParams(location.search).get("service"); if (qs && Object.hasOwn(svcById, qs) && !(pre.services || []).includes(qs)) { pre.services = [qs]; delete pre.estimate; } } catch (e) {}
    const steps = $$("[data-bstep]", root);
    let step = 0, sending = false, requestSignature = "", requestId = "";
    const f = $("form", root);
    const brand = $("#b-brand", f), model = $("#b-model", f), modelOther = $("#b-model-other", f), year = $("#b-year", f);
    let grade = $("#b-grade", f);
    if (!grade) {
      const field = document.createElement("div"); field.className = "field";
      field.innerHTML = '<label for="b-grade">Parts preference</label><select id="b-grade"></select>';
      steps[1].appendChild(field); grade = $("#b-grade", f);
    }
    grade.innerHTML = Object.entries(C.pricing.partsGrade).map(([id, g]) => `<option value="${id}">${esc(g.label)}</option>`).join("");
    grade.value = Object.hasOwn(C.pricing.partsGrade, pre.partsGrade) ? pre.partsGrade : "standard";
    fillBrands(brand); fillModels(model, ""); fillYears(year);
    $("#b-fuel", f).innerHTML = '<option value="">Select fuel</option>' + C.fuels.map((x) => `<option value="${x.id}">${x.label}</option>`).join("");
    {
      const groups = {};
      C.services.filter((s) => s.inCalculator !== false).forEach((s) => { (groups[s.group] = groups[s.group] || []).push(s); });
      const pick = new Set(pre.services || []);
      $("[data-b-services]", f).innerHTML = Object.entries(groups).map(([g, list]) => `<details class="b-group"${list.some((s) => pick.has(s.id)) ? " open" : ""}><summary>${esc(g)} <span class="small muted" data-b-count-g></span></summary><div class="chips">${list.map((s) => `<label class="chip"><input type="checkbox" name="b-svc" value="${s.id}"><span>${esc(s.name)}</span></label>`).join("")}</div></details>`).join("");
      const recount = () => $$(".b-group", f).forEach((d) => { const n = $$("input:checked", d).length; $("[data-b-count-g]", d).textContent = n ? "· " + n + " selected" : ""; });
      $("[data-b-services]", f).addEventListener("change", (e) => {
        const cb = e.target;
        const svc = svcById[cb.value];
        if (cb.checked && svc && svc.exclusive) {
          $$('input[name="b-svc"]:checked', f).forEach((other) => {
            if (other !== cb && svcById[other.value].exclusive === svc.exclusive) other.checked = false;
          });
        }
        if ($$('input[name="b-svc"]:checked', f).length > F.maxServices) {
          cb.checked = false; const box = $("[data-svc-err]", f); box.hidden = false; box.textContent = `Choose up to ${F.maxServices} services per request.`;
        }
        recount(); renderBookingQty();
      });
      setTimeout(recount);
    }
    brand.addEventListener("change", () => { const o = brand.value === "other"; model.hidden = o; modelOther.hidden = !o; fillModels(model, brand.value); });
    $("#b-date", f).min = today();
    // Prefill from estimator
    if (pre.brand) { brand.value = pre.brand; brand.dispatchEvent(new Event("change")); if (pre.brand === "other") modelOther.value = pre.model || ""; else model.value = pre.model || ""; }
    if (pre.year) year.value = pre.year;
    if (pre.fuel) $("#b-fuel", f).value = pre.fuel;
    (pre.services || []).forEach((id) => { const c = f.querySelector(`input[name="b-svc"][value="${id}"]`); if (c) c.checked = true; });
    if (pre.name) $("#b-name", f).value = pre.name;
    $("#b-notes", f).value = [pre.symptoms, pre.lights && pre.lights.length ? "Warning lights: " + pre.lights.join(", ") : ""].filter(Boolean).join("\n");
    if (pre.area) $("#b-pin", f).value = /^\d{6}$/.test(pre.area) ? pre.area : "";
    if (pre.area && !/^\d{6}$/.test(pre.area)) $("#b-address", f).value = pre.area;
    if (pre.date && !F.dateError(pre.date, today())) $("#b-date", f).value = pre.date;
    if (pre.time) $("#b-time", f).value = pre.time;
    if (pre.pickup === "no") $("#b-pickup", f).value = "no";
    if (pre.estimate) { const n = $("[data-b-estimate]", root); n.hidden = false; n.innerHTML = `<div class="status status--ok"><div><strong>Carried over from your estimate: ${esc(pre.estimate)}</strong>${C.pricing.isDemo ? "Demo prices — " : ""}final quote after inspection.</div></div>`; }
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
    // A carried price is valid only while the vehicle, jobs and quantities stay the same.
    function priceSelection() {
      return JSON.stringify([brand.value, model.value, modelOther.value.trim(), year.value, grade.value, $("#b-fuel", f).value, $("#b-pickup", f).value, $("#b-pin", f).value.trim(),
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
    const changed = () => { invalidateEstimate(); if (!sending) $("[data-b-result]", root).textContent = ""; };
    f.addEventListener("change", changed);
    f.addEventListener("input", changed);
    const pickupSel = $("#b-pickup", f);
    const toggleAddr = () => { $$("[data-addr]", f).forEach((el) => { el.hidden = pickupSel.value === "no"; }); };
    pickupSel.addEventListener("change", toggleAddr); toggleAddr();
    const pinIn = $("#b-pin", f), pinOut = $("[data-b-pin-result]", f);
    let pinT;
    const pinCheck = () => { const v = pinIn.value.trim(); pinOut.innerHTML = v && !/^\d{1,5}$/.test(v) ? areaMessage(checkArea(v), v) : ""; };
    pinIn.addEventListener("input", () => { clearTimeout(pinT); pinT = setTimeout(pinCheck, /^\d{6}$/.test(pinIn.value.trim()) ? 0 : 700); });

    function setErr(el, msg) {
      return fieldError(el, msg);
    }
    function validate(i) {
      let ok = true;
      if (i === 0) {
        ok = setErr($("#b-name", f), $("#b-name", f).value.trim().length >= 2 ? "" : "Enter your name.") && ok;
        ok = setErr($("#b-mobile", f), cleanMobile($("#b-mobile", f).value) ? "" : "Enter a valid 10-digit Indian mobile number.") && ok;
      }
      if (i === 1) {
        ok = setErr(brand, brand.value ? "" : "Select the manufacturer.") && ok;
        const m = brand.value === "other" ? modelOther : model;
        ok = setErr(m, m.value.trim() ? "" : "Select or type the model.") && ok;
        ok = setErr(year, year.value ? "" : "Select the year.") && ok;
        ok = setErr($("#b-fuel", f), $("#b-fuel", f).value ? "" : "Select the fuel type.") && ok;
        const reg = $("#b-reg", f); const rv = reg.value.trim().toUpperCase().replace(/\s+/g, "");
        ok = setErr(reg, !rv || /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$|^\d{2}BH\d{4}[A-Z]{1,2}$/.test(rv) ? "" : "Check the format, e.g. MP09 AB 1234 (or leave blank).") && ok;
      }
      if (i === 2) {
        const count = $$('input[name="b-svc"]:checked', f).length;
        const msg = !count ? "Select at least one service." : count > F.maxServices ? `Choose up to ${F.maxServices} services per request.` : "";
        const box = $("[data-svc-err]", f); box.hidden = !msg; box.textContent = msg; box.id = "booking-services-error"; box.setAttribute("role", "alert");
        if (msg) { box.tabIndex = -1; box.focus(); }
        ok = !msg;
        for (const el of $$("[data-b-qty-for]", f)) ok = setErr(el, F.quantityError(el.value, svcById[el.dataset.bQtyFor].qty.max)) && ok;
      }
      if (i === 3) ok = setErr($("#b-date", f), dateIssue($("#b-date", f))) && ok;
      if (i === 3 && pickupSel.value === "yes") {
        ok = setErr($("#b-address", f), $("#b-address", f).value.trim().length >= 5 ? "" : "Enter the pickup address.") && ok;
        ok = setErr($("#b-pin", f), F.validPin($("#b-pin", f).value) ? "" : "Enter a 6-digit PIN code (it cannot start with 0).") && ok;
      }
      if (!ok) { const inv = $('[aria-invalid="true"]', steps[i]); if (inv) inv.focus(); }
      return ok;
    }
    function payload() {
      const b = brandById[brand.value];
      return {
        name: $("#b-name", f).value.trim(), mobile: cleanMobile($("#b-mobile", f).value), contactMethod: $("#b-contact", f).value,
        brand: b ? b.name : "", model: brand.value === "other" ? modelOther.value.trim() : model.value, registration: $("#b-reg", f).value.trim().toUpperCase(),
        year: year.value, fuel: $("#b-fuel", f).value,
        services: $$('input[name="b-svc"]:checked', f).map((i) => {
          const s = svcById[i.value];
          return s.name + (s.qty ? " × " + (quantities[s.id] || 1) + " " + s.unit.replace(/^per /, "") + "(s)" : "");
        }),
        serviceItems: $$('input[name="b-svc"]:checked', f).map((i) => ({ id: i.value, qty: svcById[i.value].qty ? Number(quantities[i.value] || 1) : 1 })),
        partsGrade: grade.value, category: estimateValid ? pre.category || "" : "",
        // Notes are also retained by the already deployed handler.
        notes: [$("#b-notes", f).value.trim(), `Parts preference: ${C.pricing.partsGrade[grade.value].label}`, estimateValid && pre.category ? `Vehicle category: ${pre.category}` : ""].filter(Boolean).join("\n"),
        pickup: pickupSel.value, address: pickupSel.value === "yes" ? $("#b-address", f).value.trim() : "", pin: pickupSel.value === "yes" ? $("#b-pin", f).value.trim() : "",
        date: $("#b-date", f).value, time: $("#b-time", f).value, estimate: estimateValid ? pre.estimate : ""
      };
    }
    function bookingText(p) {
      const fuel = (C.fuels.find((x) => x.id === p.fuel) || {}).label || p.fuel;
      const area = p.pickup === "yes" ? checkArea(p.pin) : null;
      return [
        `Hello ${B.name}, booking request from your website.`,
        `Name: ${p.name}`, `Mobile: ${p.mobile}`, `Contact me by: ${p.contactMethod}`,
        `Car: ${[p.brand !== "Other brand" ? p.brand : "", p.model, "(" + p.year + ")"].filter(Boolean).join(" ")}, ${fuel}`,
        p.registration ? `Registration: ${p.registration}` : null,
        `Services: ${p.services.join(", ")}`,
        p.estimate ? `Website estimate: ${p.estimate}` : null,
        p.partsGrade ? `Parts grade: ${((C.pricing.partsGrade || {})[p.partsGrade] || {}).label || p.partsGrade}` : null,
        p.notes ? `Notes: ${p.notes}` : null,
        p.pickup === "yes" ? `Pickup & drop: Yes — ${p.address}, ${p.pin}${area && area.status === "covered" ? " (in your confirmed service area)" : " (please confirm availability)"}` : "Pickup & drop: No, I'll drop the car",
        p.date || p.time ? `Preferred: ${[p.date, p.time].filter(Boolean).join(", ")}` : null,
        "Please confirm the slot."
      ].filter(Boolean).join("\n");
    }
    function show(i, moveFocus = true) {
      step = i;
      steps.forEach((s, k) => { s.hidden = k !== i; });
      $$(".steps-bar span", root).forEach((s, k) => s.classList.toggle("on", k <= i));
      $("[data-b-back]", root).hidden = i === 0;
      $("[data-b-next] span", root).textContent = i === steps.length - 1 ? (B.bookingEndpoint ? "Submit request" : "Review & send") : "Next";
      $("[data-b-count]", root).textContent = `Step ${i + 1} of ${steps.length}`;
      if (moveFocus) focusStep(steps[i]);
    }
    $("[data-b-back]", root).addEventListener("click", () => show(Math.max(0, step - 1)));
    // Tell the customer what actually happened. Resending unchanged details reuses the same
    // request ID, and the server ignores duplicates, so "press Submit again" is safe.
    function bookingFailure(err, timedOut) {
      const status = err && err.status;
      if (err && err.offline) return { title: "You're offline. Your request was not sent.", text: "Connect to the internet and press Submit request again, or send the same details on WhatsApp.", button: "Send on WhatsApp" };
      if (status === 400 || status === 413 || status === 415) return { title: "We couldn't accept these details.", text: "Your request was not saved. Please check your details and try again, or send them on WhatsApp.", button: "Send on WhatsApp" };
      if (status === 429) return { title: "Too many requests from this number.", text: "Your request was not saved. Please call or WhatsApp the garage to book.", button: "Send on WhatsApp" };
      if (status === 403 || status === 404 || status === 405) return { title: "Online booking isn't available right now.", text: "Your request was not saved. Please send it on WhatsApp or call the garage.", button: "Send on WhatsApp" };
      if (status === 409) return { title: "An earlier version of this request already reached us.", text: "Please message the garage on WhatsApp with any changes instead of resending.", button: "Message on WhatsApp" };
      return { title: timedOut ? "The request timed out." : "We couldn't confirm your request.", text: "It may or may not have reached the garage. You can safely press Submit request again — the same request is never booked twice — or check with us on WhatsApp.", button: "Check on WhatsApp" };
    }
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
          f.hidden = true; store.remove("cmi-booking");
          out.innerHTML = `<div class="success"><div class="status status--ok"><div><strong>Request received.</strong>We'll contact you on ${esc(p.mobile)} to confirm the slot and quotation. Your booking is confirmed only after we call or message you.</div></div></div>`;
        } catch (err) {
          const fail = bookingFailure(err, controller.signal.aborted);
          out.innerHTML = `<div class="status status--bad" role="alert"><div><strong>${esc(fail.title)}</strong>${esc(fail.text)}</div></div><a class="btn btn--wa" target="_blank" rel="noopener" href="${waUrl(bookingText(p))}">${ICON.wa} ${esc(fail.button)}</a>`;
        } finally {
          clearTimeout(timer); sending = false; f.inert = false; f.removeAttribute("aria-busy");
          btn.disabled = false; $("[data-b-back]", root).disabled = false; show(step, false);
          if (f.hidden) out.setAttribute("tabindex", "-1");
          if (f.hidden) out.focus();
        }
        return;
      }
      // No backend configured → WhatsApp fallback
      f.hidden = true;
      out.innerHTML = `<div class="success">
        <div class="step-title"><span class="num">Last step</span><h2>Send your request on WhatsApp</h2></div>
        <pre class="summary-chip" style="white-space:pre-wrap;margin:0">${esc(bookingText(p))}</pre>
        <a class="btn btn--wa btn--block" data-b-wa target="_blank" rel="noopener" href="${waUrl(bookingText(p))}">${ICON.wa} Open WhatsApp & send</a>
        <p class="small muted"><strong>How bookings work:</strong> this website doesn't store bookings in a database. Your details go to the garage only through the WhatsApp message you send. Your request is placed only when you press send in WhatsApp. We'll reply to confirm the slot and quotation. If WhatsApp doesn't open, call <span class="phone-line" style="color:inherit">${esc(B.phoneDisplay)}</span>.</p>
        <button type="button" class="btn btn--outline btn--sm" data-b-edit>Edit details</button>
        <div data-b-after></div></div>`;
      out.setAttribute("tabindex", "-1"); out.focus();
      $("[data-b-wa]", out).addEventListener("click", () => {
        store.remove("cmi-booking");
        $("[data-b-after]", out).innerHTML = `<div class="status status--ok"><div><strong>WhatsApp opened with your details.</strong>Press send in WhatsApp to complete the request.</div></div>`;
      });
      $("[data-b-edit]", out).addEventListener("click", () => { f.hidden = false; out.innerHTML = ""; });
    });
    show(0, false);
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
    if (B.googleAnalyticsId) {
      const s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + B.googleAnalyticsId; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); }; gtag("js", new Date()); gtag("config", B.googleAnalyticsId);
    }
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
})();
