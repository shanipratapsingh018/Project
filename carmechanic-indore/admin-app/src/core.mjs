export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(value || 0) / 100,
  );
export function paise(value) {
  const s = String(value).trim();
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(s))
    throw new Error("Enter an amount with up to two decimal places.");
  const [a, b = ""] = s.split(".");
  return Number(BigInt(a) * 100n + BigInt(b.padEnd(2, "0")));
}
export const rupees = (value) => (Number(value || 0) / 100).toFixed(2);
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function lineTotal(item, mode) {
  const q = String(item.quantity);
  if (!/^\d{1,4}(\.\d{1,3})?$/.test(q))
    throw new Error("Quantity needs up to three decimal places.");
  const [a, b = ""] = q.split("."),
    qty = BigInt(a) * 1000n + BigInt(b.padEnd(3, "0"));
  if (qty <= 0n || qty > 1000000n)
    throw new Error("Quantity must be above zero and at most 1000.");
  const price = BigInt(item.unit_price_paise),
    discount = BigInt(item.discount_paise),
    base = (qty * price + 500n) / 1000n;
  if (discount < 0n || discount > base)
    throw new Error("Discount exceeds the item amount.");
  const taxable = base - discount,
    rate = BigInt(item.tax_bps);
  if (![0n, 500n, 1200n, 1800n, 2800n].includes(rate))
    throw new Error("Choose a supported GST rate.");
  if (mode === "none" && rate !== 0n)
    throw new Error("Select 0% tax for No GST.");
  const cg = mode === "cgst_sgst" ? (taxable * rate + 10000n) / 20000n : 0n;
  const ig = mode === "igst" ? (taxable * rate + 5000n) / 10000n : 0n;
  return Number(taxable + cg * 2n + ig);
}
export function backendConfig(config) {
  if (!config?.url || !config?.publishableKey) return null;
  let u;
  try {
    u = new URL(config.url);
  } catch {
    return null;
  }
  if (
    u.protocol !== "https:" ||
    u.pathname !== "/" ||
    u.username ||
    u.password ||
    u.search ||
    u.hash
  )
    return null;
  const key = config.publishableKey;
  if (key.startsWith("sb_secret_")) return null;
  if (!key.startsWith("sb_publishable_")) {
    try {
      const p = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (p.role !== "anon") return null;
    } catch {
      return null;
    }
  }
  return { url: u.origin, key };
}
export const message = (err) => {
  const text = String(err?.message || err || "Something went wrong.");
  if (/JWT|session.*expired|refresh token/i.test(text))
    return "Your session expired. Sign in again.";
  if (/fetch|network/i.test(text))
    return "Could not reach the server. Your changes have not been confirmed. Check your connection and retry.";
  if (/row-level|permission denied|42501/i.test(text))
    return "This account does not have owner access.";
  if (/duplicate key/i.test(text))
    return "That mobile number or record already exists.";
  if (/check constraint|invalid input|not-null/i.test(text))
    return "Check the required fields, amounts and selected status.";
  return text.slice(0, 300);
};
