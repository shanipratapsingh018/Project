// Run: node tests/estimate.test.js
const assert = require("assert");
const CFG = require("../public/assets/js/config.js");
const { estimate, formatRange, formatHours } = require("../public/assets/js/pricing.js");

let passed = 0;
function test(name, fn) { fn(); passed++; console.log("✓ " + name); }
const base = { category: "hatchback", fuel: "petrol", year: 2021, partsGrade: "standard", pickup: "free", nowYear: 2026 };
const one = (extra, ...ids) => estimate(CFG, { ...base, ...extra, services: ids.map((id) => (typeof id === "string" ? { id } : id)) });

test("Approved rates in use (not demo)", () => {
  assert.equal(CFG.pricing.isDemo, false);
  assert.equal(CFG.services.length, 85);
});

test("Standard service, Swift petrol = ₹3,000–4,000 (rate card GS-02)", () => {
  const r = one({}, "GS-02");
  assert.deepEqual(r.total, [3000, 4000]);
  assert.deepEqual(r.labour, [1100, 1400]);
  assert.deepEqual(r.parts, [1900, 2600]);
  console.log("   ", formatRange(r.total), formatHours(r.hours));
});

test("Standard service absorbs oil change, air filter and basic service (no double count)", () => {
  const r = one({}, "GS-02", "GS-04", "GS-05", "GS-01");
  assert.deepEqual(r.total, [3000, 4000]);
  assert.equal(r.lines.filter((l) => l.status === "covered").length, 3);
});

test("Comprehensive covers standard when both are picked", () => {
  const r = one({}, "GS-02", "GS-03");
  assert.deepEqual(r.total, [4500, 5800]);
  assert.equal(r.lines.find((l) => l.id === "GS-02").status, "covered");
});

test("Sedan/SUV use the service's own factors (GS-01: 1.10 / 1.25)", () => {
  assert.deepEqual(one({ category: "sedan" }, "GS-01").total, [2400, 3300]);
  assert.deepEqual(one({ category: "suv" }, "GS-01").total, [2750, 3750]);
});

test("Luxury without a factor → quote; oil change has its own luxury factor", () => {
  const r = one({ category: "luxury" }, "GS-02", "GS-04");
  assert.equal(r.lines.find((l) => l.id === "GS-02").status, "quote");
  const oil = one({ category: "luxury" }, "GS-04");
  assert.deepEqual(oil.total, [4800, 6650]);
});

test("A job shown as 'quote' never hides the price of jobs it would include", () => {
  const lux = one({ category: "luxury" }, "GS-02", "GS-04");
  assert.equal(lux.lines.find((l) => l.id === "GS-04").status, "priced");
  assert.deepEqual(lux.total, [4800, 6650]);
  const ev = one({ fuel: "electric" }, "GS-02", "GS-05");
  assert.equal(ev.lines.find((l) => l.id === "GS-05").status, "quote");
});

test("Price on request (no published price) is excluded from totals", () => {
  const r = one({}, "GS-05", "SU-04");
  assert.equal(r.pricedJobs, 0);
  assert.equal(r.quotes.length, 2);
  assert.deepEqual(r.total, [0, 0]);
});

test("Labour-only jobs flag parts as quoted by model (clutch)", () => {
  const r = one({}, "CL-02");
  assert.equal(r.partsQuoted, true);
  assert.deepEqual(r.labour, [2000, 3500]);
  assert.equal(r.lines[0].parts, null);
  assert(r.notes.some((n) => /parts are quoted/.test(n)));
});

test("Electric car: periodic service on request, oil & clutch not applicable", () => {
  const r = one({ fuel: "electric" }, "GS-02", "GS-04", "CL-02", "TB-05");
  assert.equal(r.lines.find((l) => l.id === "GS-02").status, "quote");
  assert.equal(r.notApplicable.length, 2);
  assert.equal(r.pricedJobs, 1);
});

test("Inspection-only jobs show no price", () => {
  const r = one({}, "CL-04", "BD-09");
  assert.equal(r.pricedJobs, 0);
  assert.equal(r.inspection.length, 2);
});

test("Dent & paint scales with panel count", () => {
  const r1 = one({}, { id: "BD-01", qty: 1 }), r3 = one({}, { id: "BD-01", qty: 3 });
  assert.deepEqual(r1.total, [2000, 3000]);
  assert.deepEqual(r3.total, [6000, 9000]);
  assert.match(formatHours(r3.hours), /working day/);
});

test("Genuine parts raise parts only; diesel raises service parts only", () => {
  const std = one({}, "BR-02"), oem = one({ partsGrade: "genuine" }, "BR-02");
  assert.deepEqual(oem.labour, std.labour);
  assert(oem.parts[1] > std.parts[1]);
  const pet = one({}, "GS-02"), dsl = one({ fuel: "diesel" }, "GS-02");
  assert.deepEqual(dsl.labour, pet.labour);
  assert(dsl.total[1] > pet.total[1]);
  const acD = one({ fuel: "diesel" }, "AC-03"), acP = one({}, "AC-03");
  assert.deepEqual(acD.total, acP.total);
});

test("Car older than 10 years adds labour time", () => {
  const r = one({ year: 2012 }, "AC-03");
  assert(r.labour[1] > one({}, "AC-03").labour[1]);
  assert(r.notes.some((n) => n.includes("older than")));
});

test("Pre-purchase inspection covers diagnostics", () => {
  const r = one({}, "OT-04", "EN-02");
  assert.equal(r.lines.find((l) => l.id === "EN-02").status, "covered");
});

test("Pickup outside area is never shown as free", () => {
  const r = one({ pickup: "outside" }, "TB-05");
  assert.equal(r.pickup.amount, null);
  assert(!/free/i.test(r.pickup.label));
});

test("Labour + parts always equal the line total", () => {
  for (const s of CFG.services) for (const category of ["hatchback", "sedan", "suv", "luxury"]) {
    const r = one({ category, partsGrade: "genuine", fuel: "diesel", year: 2010 }, s.id);
    const l = r.lines[0];
    if (l.status !== "priced") continue;
    const p = l.parts || [0, 0];
    assert.deepEqual([l.labour[0] + p[0], l.labour[1] + p[1]], l.total, s.id + " " + category);
    assert(l.total[0] <= l.total[1], s.id);
  }
});

test("Every service has hours, a group and valid covers", () => {
  const ids = new Set(CFG.services.map((s) => s.id));
  for (const s of CFG.services) {
    assert(Array.isArray(s.hours) && s.hours.length === 2, s.id);
    assert(s.group, s.id);
    (s.covers || []).forEach((c) => assert(ids.has(c), s.id + " covers " + c));
  }
});

test("No duplicate brands; Other present", () => {
  const names = CFG.brands.map((b) => b.name);
  assert.equal(new Set(names).size, names.length);
  assert(CFG.brands.some((b) => b.id === "other"));
});

test("Packages point to real services", () => {
  const ids = new Set(CFG.services.map((s) => s.id));
  CFG.packages.forEach((p) => p.services.forEach((id) => assert(ids.has(id), p.id)));
});

console.log(`\n${passed} tests passed`);
