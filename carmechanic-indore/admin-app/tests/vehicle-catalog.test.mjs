import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  VEHICLE_CATALOG,
  findBrand,
  searchVehicles,
  vehicleYears,
} from "../src/vehicle-catalog.mjs";
const require = createRequire(import.meta.url);
test("catalogue values are unique and fit the existing database fields", () => {
  assert.equal(
    new Set(VEHICLE_CATALOG.map((b) => b.id)).size,
    VEHICLE_CATALOG.length,
  );
  assert.equal(
    new Set(VEHICLE_CATALOG.map((b) => b.name)).size,
    VEHICLE_CATALOG.length,
  );
  for (const brand of VEHICLE_CATALOG) {
    assert.ok(brand.name.length <= 60 && brand.models.length > 0);
    assert.equal(new Set(brand.models).size, brand.models.length, brand.name);
    for (const model of brand.models)
      assert.ok(
        model.length > 0 && model.length <= 80,
        brand.name + " " + model,
      );
  }
});
test("the admin catalogue includes every existing public-site vehicle", () => {
  const config = require("../../public/assets/js/config.js");
  for (const brand of config.brands.filter((b) => b.id !== "other")) {
    const found = findBrand(brand.name);
    assert.ok(found, brand.name);
    for (const [model] of brand.models)
      assert.ok(found.models.includes(model), brand.name + " " + model);
  }
});
test("search supports make aliases, older cars and imported models", () => {
  for (const [query, brand, model] of [
    ["VW Polo", "Volkswagen", "Polo"],
    ["Maruti Swift", "Maruti Suzuki", "Swift"],
    ["Škoda Octavia", "Skoda", "Octavia"],
    ["Ford Ikon", "Ford", "Ikon"],
    ["Toyota Qualis", "Toyota", "Qualis"],
    ["Tesla Model Y", "Tesla", "Model Y"],
    ["BMW X5", "BMW", "X5"],
  ]) {
    assert.ok(
      searchVehicles(query).some((r) => r.brand === brand && r.model === model),
      query,
    );
  }
  assert.deepEqual(searchVehicles(""), []);
  assert.deepEqual(searchVehicles("unknown-brand-1234"), []);
  assert.equal(searchVehicles("BMW", 3).length, 3);
  assert.equal(
    findBrand("JLR"),
    undefined,
    "an ambiguous parent-company name must not choose a brand",
  );
});
test("year dropdown rolls over in India and retains the supported oldest year", () => {
  const years = vehicleYears(new Date("2026-12-31T20:00:00Z"));
  assert.equal(years[0], 2028);
  assert.equal(years.at(-1), 1950);
  assert.equal(new Set(years).size, years.length);
});
