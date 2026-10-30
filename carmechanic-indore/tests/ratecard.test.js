// Run: node tests/ratecard.test.js
// Checks that the website calculator reproduces EVERY figure in the approved rate card
// (docs/rate-card/proposed_rate_card.csv) for hatchback, sedan, SUV and luxury.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const CFG = require("../public/assets/js/config.js");
const { quickRange } = require("../public/assets/js/pricing.js");

function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ""])));
}

const card = parseCSV(fs.readFileSync(path.join(__dirname, "../docs/rate-card/proposed_rate_card.csv"), "utf8"));
const svc = Object.fromEntries(CFG.services.map((s) => [s.id, s]));
const COLS = { hatchback: "hatchback_range", sedan: "sedan_range", suv: "suv_range", luxury: "luxury_range" };
const num = (t) => (t.match(/₹([\d,]+)\s*–\s*₹([\d,]+)/) || []).slice(1).map((x) => Number(x.replace(/,/g, "")));

let checked = 0, fails = [];
assert.equal(card.length, CFG.services.length, "rate card and rate-card.js have the same number of services");
for (const row of card) {
  assert(svc[row.id], "service " + row.id + " exists in rate-card.js");
  for (const [cat, col] of Object.entries(COLS)) {
    const want = row[col];
    const got = quickRange(CFG, row.id, cat);
    const n = num(want);
    if (n.length) {
      if (got.status !== "priced" || got.range[0] !== n[0] || got.range[1] !== n[1] || got.partsQuoted !== /labour \+ parts/.test(want))
        fails.push(`${row.id} ${cat}: card "${want}" vs site ${JSON.stringify(got)}`);
    } else if (/Inspection required/.test(want)) {
      if (got.status !== "inspection") fails.push(`${row.id} ${cat}: expected inspection, got ${got.status}`);
    } else if (/owner to set|Quote after inspection/.test(want)) {
      if (got.status !== "quote") fails.push(`${row.id} ${cat}: expected price on request / quote, got ${got.status}`);
    } else fails.push(`${row.id} ${cat}: unrecognised card value "${want}"`);
    checked++;
  }
}
if (fails.length) { console.log(fails.join("\n")); process.exit(1); }
console.log(`✓ All ${checked} rate-card figures (${card.length} services × 4 categories) match the website calculator`);
