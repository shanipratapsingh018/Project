import { escapeHtml as e } from "./core.mjs";
import {
  VEHICLE_CATALOG,
  CATALOG_COUNTS,
  findBrand,
  searchVehicles,
  vehicleYears,
  FUEL_OPTIONS,
} from "./vehicle-catalog.mjs";
const CUSTOM = "gw:custom",
  SAVED = "gw:saved",
  UNKNOWN = "gw:unknown";
const option = (value, label, selected) =>
  `<option value="${e(value)}" ${selected ? "selected" : ""}>${e(label)}</option>`;
// UI-only controls have no `name`: only readVehicleFields() supplies database fields.
export function vehicleFieldsHtml(row = {}) {
  return `<section class="vehicle-fields full" data-vehicle-fields aria-label="Vehicle details">
    <div class="vehicle-fields-head"><strong>Vehicle details</strong><span>${CATALOG_COUNTS.brands} brands · ${CATALOG_COUNTS.models} models</span></div>
    <label>Search make or model<input type="search" data-vehicle-search placeholder="Try Swift, Toyota Innova or VW Polo" maxlength="100" autocomplete="off"></label>
    <label data-vehicle-matches hidden>Matching vehicles<select aria-label="Matching vehicles" data-vehicle-match></select><small>Choose a result to fill the brand and model. Up to 40 matches are shown.</small></label>
    <p class="small muted" data-vehicle-search-status role="status" aria-live="polite" hidden></p>
    <div class="grid">
      <label>Brand<select aria-label="Brand" data-vehicle-brand required></select></label>
      <label data-custom-brand-wrap hidden>Other brand name<input data-custom-brand maxlength="60"></label>
      <label>Car model<select aria-label="Car model" data-vehicle-model required></select></label>
      <label data-custom-model-wrap hidden>Other model name<input data-custom-model maxlength="80"></label>
      <label>Year (optional)<select aria-label="Year (optional)" data-vehicle-year></select></label>
      <label data-custom-year-wrap hidden>Other year<input type="number" data-custom-year min="1950" max="2100" step="1"></label>
      <label>Fuel<select name="fuel" aria-label="Fuel">${FUEL_OPTIONS.map(([value, label]) => option(value, label, value === (row.fuel || "other"))).join("")}</select></label>
      <label class="full">Registration (optional)<input name="registration" value="${e(row.registration)}" maxlength="20" pattern="[A-Z0-9 -]{3,20}" autocapitalize="characters" autocomplete="off" placeholder="MP09 AB 1234"></label>
    </div>
    <p class="small muted">For a vehicle missing from the catalogue, choose Other and enter its details. Check the actual year and fuel; the catalogue does not determine them.</p>
  </section>`;
}
export function mountVehicleFields(form, row = {}) {
  const root = form.querySelector("[data-vehicle-fields]"),
    q = (selector) => root.querySelector(selector);
  const brand = q("[data-vehicle-brand]"),
    model = q("[data-vehicle-model]"),
    year = q("[data-vehicle-year]");
  const originalMake = String(row.make || ""),
    originalModel = String(row.model || "");
  const exactBrand = VEHICLE_CATALOG.find((b) => b.name === originalMake);
  const initialBrand =
    exactBrand?.id || (originalMake ? SAVED : originalModel ? UNKNOWN : "");
  brand.innerHTML =
    option("", "Choose a brand", !initialBrand) +
    (originalMake && !exactBrand
      ? option(SAVED, originalMake + " (saved)", true)
      : "") +
    VEHICLE_CATALOG.map((b) =>
      option(b.id, b.name, b.id === initialBrand),
    ).join("") +
    option(CUSTOM, "Other brand — enter manually", false) +
    option(UNKNOWN, "Brand not known yet", initialBrand === UNKNOWN);
  const setCustom = (name, active) => {
    const input = q(`[data-custom-${name}]`);
    q(`[data-custom-${name}-wrap]`).hidden = !active;
    input.disabled = !active;
    input.required = active;
  };
  const loadModels = (selected = "") => {
    const selectedBrand =
      VEHICLE_CATALOG.find((b) => b.id === brand.value) ||
      (brand.value === SAVED ? findBrand(originalMake) : null);
    const values = selectedBrand?.models || [];
    const allowSaved =
      brand.value === initialBrand &&
      originalModel &&
      !values.includes(originalModel);
    model.disabled = !brand.value;
    model.innerHTML =
      option(
        "",
        brand.value ? "Choose a model" : "Select a brand first",
        !selected,
      ) +
      (allowSaved
        ? option(SAVED, originalModel + " (saved)", selected === originalModel)
        : "") +
      values.map((value) => option(value, value, value === selected)).join("") +
      option(CUSTOM, "Other model — enter manually", selected === CUSTOM);
    setCustom("model", model.value === CUSTOM);
  };
  setCustom("brand", false);
  loadModels(originalModel);
  const years = vehicleYears(),
    savedYear = row.year == null ? "" : String(row.year);
  year.innerHTML =
    option("", "Not known yet", !savedYear) +
    (savedYear && !years.includes(Number(savedYear))
      ? option(savedYear, savedYear + " (saved)", true)
      : "") +
    years
      .map((value) => option(value, value, String(value) === savedYear))
      .join("") +
    option(CUSTOM, "Other year — enter manually", false);
  setCustom("year", false);
  brand.addEventListener("change", () => {
    setCustom("brand", brand.value === CUSTOM);
    q("[data-custom-model]").value = "";
    loadModels();
    if (brand.value === CUSTOM) q("[data-custom-brand]").focus();
  });
  model.addEventListener("change", () => {
    setCustom("model", model.value === CUSTOM);
    if (model.value === CUSTOM) q("[data-custom-model]").focus();
  });
  year.addEventListener("change", () => {
    setCustom("year", year.value === CUSTOM);
    if (year.value === CUSTOM) q("[data-custom-year]").focus();
  });
  const search = q("[data-vehicle-search]"),
    matches = q("[data-vehicle-match]"),
    matchesWrap = q("[data-vehicle-matches]"),
    status = q("[data-vehicle-search-status]");
  let results = [];
  search.addEventListener("input", () => {
    results = searchVehicles(search.value);
    matchesWrap.hidden = !results.length;
    status.hidden = !search.value.trim();
    status.textContent = results.length
      ? `${results.length} matches. Choose a matching vehicle.`
      : "No matches. Choose Other brand or Other model to enter it manually.";
    matches.innerHTML =
      option("", "Choose a matching vehicle", true) +
      results
        .map((r, i) => option(i, `${r.brand} · ${r.model}`, false))
        .join("");
  });
  matches.addEventListener("change", () => {
    if (matches.value === "") return;
    const result = results[Number(matches.value)];
    if (!result) return;
    brand.value = result.brandId;
    setCustom("brand", false);
    q("[data-custom-model]").value = "";
    loadModels(result.model);
    search.value = "";
    matchesWrap.hidden = true;
    status.hidden = false;
    status.textContent = `Selected ${result.brand} ${result.model}. Choose the year and fuel.`;
    model.focus();
  });
  const registration = form.elements.registration;
  registration.addEventListener("input", () => {
    const start = registration.selectionStart,
      end = registration.selectionEnd;
    registration.value = registration.value.toUpperCase();
    registration.setSelectionRange(start, end);
  });
  root.read = () => {
    const make =
      brand.value === CUSTOM
        ? q("[data-custom-brand]").value.trim()
        : brand.value === SAVED
          ? originalMake
          : VEHICLE_CATALOG.find((b) => b.id === brand.value)?.name || "";
    const selectedModel =
      model.value === CUSTOM
        ? q("[data-custom-model]").value.trim()
        : model.value === SAVED
          ? originalModel
          : model.value;
    const rawYear =
      year.value === CUSTOM ? q("[data-custom-year]").value : year.value;
    if (!brand.value)
      throw new Error("Choose a brand, Other brand or Brand not known yet.");
    if (brand.value === CUSTOM && !make)
      throw new Error("Enter the brand name.");
    if (!selectedModel || selectedModel.length > 80)
      throw new Error("Choose or enter the car model (up to 80 characters).");
    if (make.length > 60)
      throw new Error("Brand name must be at most 60 characters.");
    if (year.value === CUSTOM && !rawYear)
      throw new Error("Enter the year or choose Not known yet.");
    const parsedYear = rawYear === "" ? null : Number(rawYear);
    if (
      parsedYear !== null &&
      (!Number.isInteger(parsedYear) || parsedYear < 1950 || parsedYear > 2100)
    )
      throw new Error("Choose a year from 1950 to 2100, or leave it unknown.");
    return {
      make,
      model: selectedModel,
      year: parsedYear,
      fuel: form.elements.fuel.value,
      registration: registration.value.trim().toUpperCase() || null,
    };
  };
}
export function readVehicleFields(form) {
  return form.querySelector("[data-vehicle-fields]").read();
}
