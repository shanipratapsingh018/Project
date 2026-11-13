// Hindi switch for the owner workspace. Templates stay in English; this module
// translates what is on screen (text and labels) when Hindi is chosen.
// Customer data, amounts and printed invoices are never translated.
import { HI } from "./hi.mjs";
const KEY = "crw-admin-lang";
let lang = "en";
try {
  if (localStorage.getItem(KEY) === "hi") lang = "hi";
} catch {}
export const getLang = () => lang;
export function setLang(next) {
  lang = next === "hi" ? "hi" : "en";
  try {
    // Only the language choice is stored; no customer or login data.
    if (lang === "hi") localStorage.setItem(KEY, "hi");
    else localStorage.removeItem(KEY);
  } catch {}
  document.documentElement.lang = lang;
}
export const langButton = (cls) =>
  `<button type="button" class="${cls}" data-lang-toggle data-no-tr lang="${lang === "hi" ? "en" : "hi"}">${lang === "hi" ? "English" : "हिंदी"}</button>`;
const PATTERNS = [
  [/^(\d+)–(\d+) of (\d+)$/, (m) => `${m[1]}–${m[2]} (कुल ${m[3]})`],
  [/^(\d+) records?$/, (m) => `${m[1]} रिकॉर्ड`],
  [/^Due (₹[\d,.]+)$/, (m) => `बाकी ${m[1]}`],
  [/^Call (\d{10})$/, (m) => `कॉल ${m[1]}`],
  [/^Vehicle · (.+)$/, (m) => `गाड़ी · ${m[1]}`],
  [/^✓ (.+)$/, (m) => (HI[m[1]] ? "✓ " + HI[m[1]] : null)],
];
export function tr(text) {
  if (lang !== "hi") return null;
  const key = String(text).replace(/\s+/g, " ").trim();
  if (!key || !/[A-Za-z]/.test(key)) return null;
  if (Object.hasOwn(HI, key)) return HI[key];
  // Time slots, fuel and job names already translated for the public site.
  const site = window.CMI_HI;
  if (site && Object.hasOwn(site, key)) return site[key];
  for (const [re, fn] of PATTERNS) {
    const m = re.exec(key);
    if (m) return fn(m);
  }
  return null;
}
const SKIP = "script,style,textarea,code,[data-no-tr],.print-frame";
function translateTree(root) {
  if (lang !== "hi" || !root) return;
  if (root.nodeType === 3) return translateText(root);
  if (root.nodeType !== 1 || root.closest?.(SKIP)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [root];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    if (n.nodeType === 3) translateText(n);
    else
      for (const attr of ["placeholder", "aria-label", "title"]) {
        const v = n.getAttribute(attr);
        const t = v && tr(v);
        if (t) n.setAttribute(attr, t);
      }
  }
}
function translateText(node) {
  const v = node.nodeValue;
  const t = tr(v);
  if (t == null) return;
  const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
  node.nodeValue = lead + t + trail;
}
export function startTranslation() {
  document.documentElement.lang = lang;
  const run = (records) => {
    if (lang !== "hi") return;
    for (const r of records) r.addedNodes.forEach(translateTree);
  };
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  translateTree(document.body);
}
