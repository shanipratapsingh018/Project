// Update prices in public/assets/js/rate-card.js from an edited rate-card CSV.
//
//   npm run import-rates -- docs/rate-card/proposed_rate_card.csv
//
// The CSV must have the columns of docs/rate-card/proposed_rate_card.csv:
//   id, inspection_required, parts_consumables, labour_low, labour_high, parts_low, parts_high,
//   sedan_factor, suv_factor, luxury_factor   (other columns are ignored)
// Rules:
//   labour_low/high blank        → "Price on request"
//   parts_low/high blank         → parts quoted by model (labour shown only)
//   inspection_required = Yes    → "Inspection required — request a quote"
//   luxury_factor blank          → luxury cars get "Quote after inspection"
// Services not in the CSV are left unchanged. Hours, covers and other settings are kept.
import { readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "public/assets/js/rate-card.js");
const csvPath = process.argv[2];
if (!csvPath) { console.error("Usage: npm run import-rates -- path/to/rate_card.csv"); process.exit(1); }

function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}
const num = (v, label, id) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/[₹,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error(`${id}: ${label} "${v}" is not a valid number`);
  return n;
};

const RC = require(FILE);
const DEF = require(join(ROOT, "public/assets/js/config.js")).pricing.defaultFactors;
const byId = Object.fromEntries(RC.services.map((s) => [s.id, s]));
const rows = parseCSV(readFileSync(resolve(csvPath), "utf8"));
const need = ["id", "labour_low", "labour_high", "parts_low", "parts_high", "inspection_required"];
const missing = need.filter((k) => !(k in rows[0]));
if (missing.length) { console.error("CSV is missing columns: " + missing.join(", ")); process.exit(1); }

let changed = 0, unknown = [];
for (const r of rows) {
  const s = byId[r.id];
  if (!s) { unknown.push(r.id); continue; }
  const insp = /^y/i.test(r.inspection_required);
  const L = [num(r.labour_low, "labour_low", r.id), num(r.labour_high, "labour_high", r.id)];
  const P = [num(r.parts_low, "parts_low", r.id), num(r.parts_high, "parts_high", r.id)];
  if ((L[0] == null) !== (L[1] == null)) throw new Error(`${r.id}: fill both labour_low and labour_high, or neither`);
  if ((P[0] == null) !== (P[1] == null)) throw new Error(`${r.id}: fill both parts_low and parts_high, or neither`);
  if (L[0] != null && L[0] > L[1]) throw new Error(`${r.id}: labour_low is higher than labour_high`);
  if (P[0] != null && P[0] > P[1]) throw new Error(`${r.id}: parts_low is higher than parts_high`);
  const before = JSON.stringify(s);
  s.inspectionRequired = insp;
  const priced = !insp && L[0] != null;
  s.labour = priced ? L : null;
  s.parts = priced ? (P[0] != null ? P : null) : null;
  s.priceOnRequest = !insp && !priced;
  if ("parts_consumables" in r && r.parts_consumables && r.parts_consumables !== "—") s.partsNote = r.parts_consumables;
  const f = (k) => (k in r ? num(r[k], k, r.id) : undefined);
  const sed = f("sedan_factor"), suv = f("suv_factor"), lux = f("luxury_factor");
  // A value equal to the site default is stored as null ("use default"), so changing the default later still applies.
  const set = (k, v) => {
    if (v === undefined) return;
    const effective = s.factors[k] != null ? s.factors[k] : DEF[k];
    if (v === effective) return;                       // unchanged → keep as stored
    s.factors[k] = (v != null && v === DEF[k]) ? null : v;
  };
  set("sedan", sed); set("suv", suv); set("luxury", lux);
  if (JSON.stringify(s) !== before) changed++;
}

// Rewrite only the services array, keeping the file header.
const src = readFileSync(FILE, "utf8");
const start = src.indexOf("services: [") + "services: [".length;
const end = src.indexOf("\n    ]\n  };");
let body = "", cur = null;
for (const s of RC.services) {
  if (s.category !== cur) { cur = s.category; body += `\n\n    // ---- ${cur} ` + "-".repeat(Math.max(4, 60 - cur.length)); }
  body += "\n    " + JSON.stringify(s) + ",";
}
body = body.replace(/,$/, "");
const today = new Date().toISOString().slice(0, 10);
const out = src.slice(0, start).replace(/version: "[^"]*"/, `version: "${today}"`) + body + src.slice(end);
writeFileSync(FILE, out);
console.log(`Updated ${changed} service(s) in rate-card.js from ${csvPath}.`);
if (unknown.length) console.log("Ignored unknown IDs: " + unknown.join(", "));
console.log("Next: npm test, then npm run build.");
