import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  paise,
  lineTotal,
  backendConfig,
  today,
} from "../src/core.mjs";
import { invoiceDocument } from "../src/print.mjs";
import {
  validateBooking,
  createHandler,
} from "../../supabase/functions/submit-booking/handler.mjs";
import vm from "node:vm";
import { readFileSync } from "node:fs";
test("money parsing preserves paise and rejects ambiguous amounts", () => {
  assert.equal(paise("100.01"), 10001);
  assert.equal(paise("0.1"), 10);
  for (const s of ["-1", "1e3", "2.999", "Infinity", "1,000", ""])
    assert.throws(() => paise(s));
});
test("line rounding follows server integer amounts, including split GST", () => {
  const l = {
    quantity: "1.125",
    unit_price_paise: 9999,
    discount_paise: 100,
    tax_bps: 0,
  };
  assert.equal(lineTotal(l, "none"), 11149);
  assert.equal(lineTotal({ ...l, tax_bps: 1800 }, "cgst_sgst"), 13155);
  assert.equal(lineTotal({ ...l, tax_bps: 1800 }, "igst"), 13156);
  assert.throws(() => lineTotal({ ...l, discount_paise: 999999 }, "none"));
  assert.throws(() => lineTotal({ ...l, quantity: "1.0001" }, "none"));
});
test("connection settings reject secret-role keys and insecure URLs", () => {
  assert.equal(
    backendConfig({
      url: "http://x.supabase.co",
      publishableKey: "sb_publishable_test",
    }),
    null,
  );
  assert.equal(
    backendConfig({
      url: "https://x.supabase.co",
      publishableKey: "sb_secret_abc",
    }),
    null,
  );
  const jwt = btoa(JSON.stringify({ role: "service_role" }));
  assert.equal(
    backendConfig({
      url: "https://x.supabase.co",
      publishableKey: `a.${jwt}.c`,
    }),
    null,
  );
  assert.ok(
    backendConfig({
      url: "https://x.supabase.co",
      publishableKey: "sb_publishable_test",
    }),
  );
});
test("customer-controlled fields are escaped in invoice print HTML", () => {
  const html = invoiceDocument(
    {
      number: "GW/1",
      status: "issued",
      supplier_snapshot: { name: "<script>alert(1)</script>" },
      buyer_snapshot: { name: "<img onerror=x>" },
      total_paise: 100,
    },
    [{ description: "<svg onload=x>", quantity: 1, tax_bps: 0 }],
    [],
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;svg onload=x&gt;"));
  assert.equal(escapeHtml("'\"<>"), "&#39;&quot;&lt;&gt;");
});
test("IST date is a date-only string", () =>
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/));
const booking = {
  name: "Test Customer",
  mobile: "9000000000",
  model: "Test car",
  fuel: "Petrol",
  services: ["Oil change"],
  date: today(),
  pickup: "no",
};
test("public intake allows only validated booking fields", () => {
  const b = validateBooking({
    ...booking,
    status: "delivered",
    total_paise: 1,
  });
  assert.equal(b.fuel, "petrol");
  assert.equal(validateBooking({ ...booking, contactMethod: "Phone call" }).contactMethod, "call");
  assert.equal(validateBooking({ ...booking, contactMethod: "WhatsApp" }).contactMethod, "whatsapp");
  assert.equal(b.status, undefined);
  assert.throws(() => validateBooking({ ...booking, mobile: "123" }));
  assert.throws(() => validateBooking({ ...booking, pickup: "yes" }));
  assert.throws(() => validateBooking({ ...booking, date: "2026-02-30" }));
});
const origin = "https://shanipratapsingh018.github.io";
function request(body = booking, extra = {}) {
  return new Request("https://test.supabase.co/functions/v1/submit-booking", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-idempotency-key": "11111111-1111-4111-8111-111111111111",
      ...extra,
    },
    body: JSON.stringify(body),
  });
}
test("intake checks origin, body size and request ID before writing", async () => {
  let writes = 0;
  const handler = createHandler({
    origins: [origin],
    hash: async () => "a".repeat(64),
    save: async () => {
      writes++;
      return { data: "id" };
    },
  });
  assert.equal(
    (await handler(request(booking, { origin: "https://bad.test" }))).status,
    403,
  );
  assert.equal(
    (await handler(request(booking, { "x-idempotency-key": "" }))).status,
    400,
  );
  assert.equal(
    (await handler(request({ ...booking, notes: "x".repeat(17000) }))).status,
    413,
  );
  assert.equal(writes, 0);
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(writes, 1);
  const body = await response.text();
  assert.ok(!body.includes(booking.mobile));
});
test("intake reports rate limits and uncertain receipt without exposing database errors", async () => {
  for (const [msg, status] of [
    ["BOOKING_RATE_LIMIT", 429],
    ["REQUEST_CONFLICT", 409],
    ["Internal secret detail", 503],
  ]) {
    const handler = createHandler({
      origins: [origin],
      hash: async () => "a".repeat(64),
      save: async () => ({ error: { message: msg } }),
    });
    const res = await handler(request());
    assert.equal(res.status, status);
    assert.ok(!(await res.text()).includes("Internal secret"));
  }
});
test("public bridge remains on WhatsApp unless safely configured and explicitly enabled", () => {
  const script = readFileSync(
    new URL("../../public/assets/js/booking-backend.js", import.meta.url),
    "utf8",
  );
  for (const config of [
    {},
    {
      url: "https://test.supabase.co",
      publishableKey: "sb_publishable_test",
      bookingEnabled: false,
    },
    {
      url: "http://test.supabase.co",
      publishableKey: "sb_publishable_test",
      bookingEnabled: true,
    },
    {
      url: "https://test.supabase.co",
      publishableKey: "sb_secret_test",
      bookingEnabled: true,
    },
  ]) {
    const window = {
      GW_BACKEND: config,
      CMI_CONFIG: { business: { bookingEndpoint: null } },
    };
    vm.runInNewContext(script, { window, URL, atob });
    assert.equal(window.CMI_CONFIG.business.bookingEndpoint, null);
  }
  const window = {
    GW_BACKEND: {
      url: "https://test.supabase.co",
      publishableKey: "sb_publishable_test",
      bookingEnabled: true,
    },
    CMI_CONFIG: { business: { bookingEndpoint: null } },
  };
  vm.runInNewContext(script, { window, URL, atob });
  assert.equal(
    window.CMI_CONFIG.business.bookingEndpoint,
    "https://test.supabase.co/functions/v1/submit-booking",
  );
  assert.equal(window.CMI_CONFIG.business.bookingIdempotency, true);
});
