// Car Repair Wala 2.3.0 — self-contained submit-booking function.
// Uses the existing project secrets and database; no migration is required.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
// Pure handler: Deno serves it in production; Node tests use an isolated fake RPC.
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fuelTypes = ["petrol", "diesel", "cng", "electric", "hybrid", "other"];
function validateBooking(p, now = new Date()) {
  if (!p || typeof p !== "object" || Array.isArray(p))
    throw new Error("Invalid request");
  const text = (key, max, required = false) => {
    const v = p[key] ?? "";
    if (typeof v !== "string" || v.length > max || (required && !v.trim()))
      throw new Error(`Check ${key}`);
    return v.trim();
  };
  const name = text("name", 120, true),
    mobile = text("mobile", 10, true),
    model = text("model", 80, true);
  const rawContact = text("contactMethod", 20).toLowerCase() || "whatsapp";
  const contactMethod = rawContact === "phone call" ? "call" : rawContact;
  if (!["call", "whatsapp"].includes(contactMethod))
    throw new Error("Check contact method");
  if (name.length < 2 || !/^[6-9][0-9]{9}$/.test(mobile))
    throw new Error("Check name and mobile");
  if (
    !Array.isArray(p.services) ||
    p.services.length < 1 ||
    p.services.length > 30 ||
    p.services.some((s) => typeof s !== "string" || !s.trim() || s.length > 160)
  )
    throw new Error("Choose services");
  const registration = text("registration", 20).toUpperCase();
  if (registration && !/^[A-Z0-9 -]{3,20}$/.test(registration))
    throw new Error("Check registration");
  const year = String(p.year ?? "");
  if (year && (!/^\d{4}$/.test(year) || +year < 1950 || +year > 2100))
    throw new Error("Check year");
  const fuel = text("fuel", 20).toLowerCase() || "other";
  if (!fuelTypes.includes(fuel)) throw new Error("Check fuel");
  const date = text("date", 10);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const today = ["year", "month", "day"].map(key => parts.find(part => part.type === key).value).join("-");
  if (
    date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date + "T00:00:00Z")) ||
      new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date || date < today)
  )
    throw new Error("Check date");
  const pickup = p.pickup === "yes" ? "yes" : "no",
    address = text("address", 600),
    pin = text("pin", 6);
  if (pin && !/^[1-9][0-9]{5}$/.test(pin)) throw new Error("Check PIN");
  if (pickup === "yes" && (address.length < 5 || !pin))
    throw new Error("Pickup address and PIN required");
  // Estimates sent by a browser are indicative. They never become invoice totals.
  const estimate = typeof p.estimate === "string" ? text("estimate", 160) : "";
  const partsGrade = text("partsGrade", 20);
  const category = text("category", 20);
  if (partsGrade && !["economy", "standard", "genuine"].includes(partsGrade)) throw new Error("Check parts grade");
  if (category && !["hatchback", "sedan", "suv", "luxury"].includes(category)) throw new Error("Check vehicle category");
  return {
    name,
    mobile,
    model,
    contactMethod,
    brand: text("brand", 60),
    registration,
    year,
    fuel,
    services: p.services.map((s) => s.trim()),
    notes: text("notes", 3000),
    date,
    time: text("time", 60),
    pickup,
    address,
    pin,
    estimate,
    partsGrade,
    category,
  };
}
function createHandler({ origins, save, hash, now = () => new Date() }) {
  return async (request) => {
    const origin = request.headers.get("origin") || "";
    const allowed = origins.includes(origin);
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      ...(allowed
        ? {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers":
              "content-type,apikey,x-idempotency-key",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          }
        : {}),
    };
    const respond = (status, data) =>
      new Response(JSON.stringify(data), { status, headers });
    if (!allowed) return respond(403, { error: "Origin not allowed" });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST")
      return respond(405, { error: "POST required" });
    if (
      !(request.headers.get("content-type") || "")
        .toLowerCase()
        .startsWith("application/json")
    )
      return respond(415, { error: "JSON required" });
    const requestId = request.headers.get("x-idempotency-key");
    if (!uuid.test(requestId || ""))
      return respond(400, { error: "Request ID required" });
    try {
      // Bound the stream while reading; Content-Length is not trusted.
      const reader = request.body?.getReader();
      if (!reader) return respond(400, { error: "Request body required" });
      let length = 0;
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 16000) {
          await reader.cancel();
          return respond(413, { error: "Request too large" });
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      let data;
      try {
        data = validateBooking(JSON.parse(new TextDecoder().decode(bytes)), now());
      } catch {
        return respond(400, {
          error: "Check the booking details and try again",
        });
      }
      const ip = (request.headers.get("x-forwarded-for") || "unknown")
        .split(",")[0]
        .trim()
        .slice(0, 100);
      const [ipKey, phoneKey] = await Promise.all([
        hash("ip:" + ip),
        hash("phone:" + data.mobile),
      ]);
      const result = await save({
        p_request: requestId,
        p_data: data,
        p_ip_key: ipKey,
        p_phone_key: phoneKey,
      });
      if (result.error) {
        const msg = String(result.error.message || "");
        if (msg.includes("BOOKING_RATE_LIMIT"))
          return respond(429, {
            error: "Please call or WhatsApp the garage to continue",
          });
        if (msg.includes("REQUEST_CONFLICT"))
          return respond(409, { error: "Request ID already used" });
        return respond(503, {
          error:
            "Could not confirm receipt. Please contact the garage before retrying",
        });
      }
      return respond(200, { received: true, requestId });
    } catch {
      return respond(503, {
        error:
          "Could not confirm receipt. Please contact the garage before retrying",
      });
    }
  };
}

const url = Deno.env.get("SUPABASE_URL") || "";
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const origins = (
  Deno.env.get("BOOKING_ALLOWED_ORIGINS") ||
  "https://shanipratapsingh018.github.io"
)
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const hmac = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);
Deno.serve(
  createHandler({
    origins,
    save: (args) => client.rpc("submit_public_booking", args),
    hash: async (value) => {
      const bytes = await crypto.subtle.sign(
        "HMAC",
        hmac,
        new TextEncoder().encode(value),
      );
      return Array.from(new Uint8Array(bytes), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
    },
  }),
);
