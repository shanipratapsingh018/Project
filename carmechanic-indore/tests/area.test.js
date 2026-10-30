// Run: node tests/area.test.js
const assert = require("assert");
const A = require("../public/assets/js/service-areas.js");
const { checkArea, pickupState } = require("../public/assets/js/area-check.js");

let passed = 0;
function test(name, fn) { fn(); passed++; console.log("✓ " + name); }
const st = (q) => checkArea(A, q).status;

test("452020 is covered (Kasturbagram / Palda / Tillor)", () => {
  const r = checkArea(A, "452020");
  assert.equal(r.status, "covered");
  assert.equal(r.message, "Great news! Pickup and drop are available in your area, subject to booking confirmation.");
  assert.equal(pickupState(r), "free");
});

test("All core city PINs are covered", () => {
  ["452001", "452002", "452003", "452005", "452006", "452007", "452009", "452010", "452011", "452012", "452013", "452014", "452015", "452016", "452018"]
    .forEach((p) => assert.equal(st(p), "covered", p));
});

test("Spaces and dashes are tolerated: '452 010', '452-020'", () => {
  assert.equal(st("452 010"), "covered");
  assert.equal(st("452-020"), "covered");
});

test("Unverified Indore PINs are not promised (452004, 452008 → not-listed, pending)", () => {
  const r = checkArea(A, "452004");
  assert.equal(r.status, "not-listed");
  assert.equal(r.pending, true);
  assert.equal(r.message, "Your location is not in our confirmed service list yet. Contact us to check availability.");
});

test("Valid PINs outside coverage → not-listed (Mhow, Rau-area, Delhi, 452017)", () => {
  ["453441", "453331", "110001", "452017", "452019"].forEach((p) => assert.equal(st(p), "not-listed", p));
  assert.equal(pickupState(checkArea(A, "453441")), "outside");
});

test("Incomplete PINs", () => {
  ["4", "45", "4520", "45201"].forEach((p) => assert.equal(st(p), "incomplete", p));
});

test("Invalid PINs", () => {
  ["45201a", "052010", "4520100", "45@010", "4520 100"].forEach((p) => assert.equal(st(p), "invalid", p));
});

test("Empty input", () => { assert.equal(st(""), "empty"); assert.equal(st("   "), "empty"); });

test("Locality names resolve to their PIN", () => {
  const r = checkArea(A, "vijay nagar");
  assert.equal(r.status, "covered"); assert.equal(r.pin, "452010"); assert.equal(r.locality, "Vijay Nagar");
  assert.equal(checkArea(A, "Kasturbagram").pin, "452020");
  assert.equal(checkArea(A, "Khajrana").status, "covered");
  assert.equal(checkArea(A, "Mhow").status, "not-listed");
});

test("Unknown locality asks for the PIN", () => {
  assert.equal(st("Atlantis"), "unknown-locality");
  assert.equal(st("ab"), "unknown-locality");
});

test("Config sanity: every covered PIN is 6 digits, no duplicates, no overlap with pending", () => {
  assert(A.coveredPins.every((p) => /^[1-9]\d{5}$/.test(p)));
  assert.equal(new Set(A.coveredPins).size, A.coveredPins.length);
  assert(!A.pendingPins.some((p) => A.coveredPins.includes(p)));
});

console.log(`\n${passed} tests passed`);
