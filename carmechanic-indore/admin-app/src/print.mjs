import { escapeHtml as e, money } from "./core.mjs";
export function invoiceDocument(i, items, payments) {
  const s = i.supplier_snapshot || {},
    b = i.buyer_snapshot || {},
    v = i.vehicle_snapshot || {};
  const received = payments
    .filter((p) => !p.voided_at)
    .reduce((n, p) => n + Number(p.amount_paise), 0);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>${e(i.number || "Draft invoice")}</title><style>@page{size:A4;margin:16mm}body{font:12px/1.5 system-ui,sans-serif;color:#17252a;margin:0}header{border-bottom:3px solid #ff6b17;padding-bottom:18px;display:flex;justify-content:space-between;gap:30px}h1{font-size:27px;margin:0}h2{font-size:16px;margin:0 0 8px}p{margin:5px 0;white-space:pre-wrap}.parties{display:flex;justify-content:space-between;gap:30px;padding:22px 0}.parties>div{width:50%}table{border-collapse:collapse;width:100%;font-size:11px}th,td{padding:9px 6px;border-bottom:1px solid #ddd;text-align:right;vertical-align:top}th:first-child,td:first-child{text-align:left}thead{display:table-header-group}tr{break-inside:avoid}th{background:#f2f2ee}small{color:#626b6c}.summary{margin:18px 0 18px auto;width:280px}.summary div{display:flex;justify-content:space-between;padding:4px 0}.total{border-top:2px solid #17252a;font-size:16px;font-weight:750}.note{margin-top:20px;border-top:1px solid #ddd;padding-top:12px}.void{color:#b03b2c;font-size:24px;font-weight:800}</style></head><body><header><div><h1>${e(s.name || "Car Repair Wala")}</h1><p>${e(s.address)}</p><p>Phone: ${e(s.phone)}</p>${s.gstin ? `<p>GSTIN: ${e(s.gstin)}</p>` : ""}</div><div><h2>${i.tax_mode === "none" ? "INVOICE" : "TAX INVOICE"}</h2><p><strong>${e(i.number)}</strong></p><p>Date: ${e(i.issue_date)}</p><p>Due: ${e(i.due_date || "Not set")}</p>${i.status === "void" ? '<p class="void">VOID</p>' : ""}</div></header><div class="parties"><div><h2>Bill to</h2><strong>${e(b.name)}</strong><p>${e(b.address)}</p><p>${e(b.mobile)}</p>${b.gstin ? `<p>GSTIN: ${e(b.gstin)}</p>` : ""}<p>Place of supply: ${e(i.supply_state)}</p></div><div><h2>Vehicle</h2><p>${e(v.make)} ${e(v.model)}</p><p>${e(v.registration || "No registration entered")}</p></div></div><table><thead><tr><th>Item / HSN or SAC</th><th>Qty</th><th>Rate</th><th>Discount</th><th>GST</th><th>Amount</th></tr></thead><tbody>${items.map((l) => `<tr><td>${e(l.description)}<br><small>${e(l.hsn_sac)}</small></td><td>${e(l.quantity)}</td><td>${money(l.unit_price_paise)}</td><td>${money(l.discount_paise)}</td><td>${l.tax_bps / 100}%</td><td>${money(l.total_paise)}</td></tr>`).join("")}</tbody></table><div class="summary">${[
    ["Subtotal", i.subtotal_paise],
    ["Discount", i.discount_paise],
    ["CGST", i.cgst_paise],
    ["SGST", i.sgst_paise],
    ["IGST", i.igst_paise],
  ]
    .map(([k, val]) => `<div><span>${k}</span><span>${money(val)}</span></div>`)
    .join(
      "",
    )}<div class="total"><span>Total</span><span>${money(i.total_paise)}</span></div><div><span>Recorded payments</span><span>${money(received)}</span></div><div><strong>Balance</strong><strong>${money(i.status === "issued" ? i.total_paise - received : 0)}</strong></div></div><div class="note"><p>${e(i.notes)}</p>${i.status === "void" ? `<p>Void reason: ${e(i.void_reason)}</p>` : ""}<p>${e(s.footer)}</p><small>Computer-generated invoice. Payment entries reflect the garage’s records.</small></div></body></html>`;
}
export function printInvoice(invoice, items, payments) {
  document.querySelectorAll(".print-frame").forEach((n) => n.remove());
  const frame = document.createElement("iframe");
  frame.className = "print-frame";
  frame.title = "Private invoice print view";
  frame.setAttribute("sandbox", "allow-same-origin allow-modals");
  frame.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  };
  frame.srcdoc = invoiceDocument(invoice, items, payments);
  document.body.append(frame);
  setTimeout(() => frame.remove(), 120000);
}
