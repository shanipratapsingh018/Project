import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { createHandler } from "./handler.mjs";
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
