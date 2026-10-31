# Garagewala owner workspace · v2.0.1

The public connection settings now point to project `oraooxeefxcwmwgycrei`. **Database and owner-account setup still need to be completed and verified** through the owner's Supabase dashboard. The public site continues to use WhatsApp booking by default. Publishing the admin files does not publish customer records. The owner's email and password are not placed in public website files.

Open [this project's SQL Editor](https://supabase.com/dashboard/project/oraooxeefxcwmwgycrei/sql/new) and use [the combined database setup file](../supabase/setup-admin.sql) for a new project. It contains the same two reviewed initial migrations, without account credentials. Use Supabase's dashboard to create the owner Auth user and grant owner membership as described below.

## Accounts and cost

Create a Supabase project in your own account, preferably in an India region if available. A free project can be used for a small first deployment within its current limits. Check Supabase’s current pricing for database/file capacity, email limits, idle-project pausing, backups and production availability before relying on it for daily billing. A paid plan is optional for development, and may become appropriate for reliable daily operations. GitHub Pages can continue hosting the website.

No WhatsApp API, SMS/OTP provider, payment gateway, accounting subscription or AI subscription is required for this version. Calls and WhatsApp buttons do not expose a visitor’s phone number. Enter those enquiries manually. Payment entries are records of money already received; they do not charge customers or refund money.

## 1. Create the backend

1. Create a dedicated Supabase project and keep the database password private.
2. In SQL Editor, run the complete contents of `supabase/setup-admin.sql` once for a new project. This combines `202610310001_admin.sql` and `202610310002_finance.sql` in order. Each migration is transactional. If both migrations have already succeeded, skip the combined file. Do not rerun successful migrations.
3. In Authentication settings, disable public sign-ups. Set Site URL to `https://shanipratapsingh018.github.io/Project/admin/` and add that exact URL to allowed redirect URLs. Remove unused local redirect entries before production. Configure a strong password policy and, for reliable password-reset delivery, your own SMTP provider if required by Supabase’s email limits.
4. In Authentication → Users, create the owner account with your email and a strong unique password. Confirm the email through the supported dashboard flow. Do not put that password in GitHub or send it in chat.
5. Copy the new account’s User UID and substitute it in `supabase/bootstrap-owner.sql`; run that SQL in SQL Editor. Creating an Auth account alone does **not** give owner access.
6. Keep the `private` schema out of exposed API schemas. Keep Row Level Security enabled. Do not add broad anonymous read/write policies. Storage bucket `garagewala-private` must stay private (4 MB per file; JPEG/PNG/WebP/PDF only).

To remove an owner immediately, delete their row from `private.owner_access` in SQL Editor and revoke their Auth sessions. All subsequent database and file requests are denied, including previously logged-in sessions. Do not delete a customer’s billing history just to revoke an owner.

## 2. Connect the admin

In `public/assets/js/backend-config.js`, set:

```js
window.GW_BACKEND = Object.freeze({
  url: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "YOUR_PUBLIC_PUBLISHABLE_OR_LEGACY_ANON_KEY",
  bookingEnabled: false
});
```

Only the **public publishable key** (`sb_publishable_…`) or legacy **anon** JWT belongs here. A service-role/secret key, database URL, database password, Auth password or management token must never be included in browser files. The public URL/key can be shared for connection setup. The database policies protect customer data.

The admin’s Content Security Policy permits Supabase’s `*.supabase.co` project hosts. A custom Supabase domain needs an explicit update to the CSP in `admin-app/src/index.html` and a rebuild. The public booking bridge currently expects the standard Supabase project host.

The owner's supplied public URL/key are already configured in v2.0.1. After completing the database and owner account steps, open `/Project/admin/`, sign in, and complete Settings with the **actual legal business name, full billing address and state code**. Leave GSTIN empty if not registered. Invoice issuing stays blocked until these details are checked. Customer billing addresses are required before an invoice can be issued. Tax rates and HSN/SAC codes must be chosen for the actual supply; no tax registration is assumed. Public connection settings do not grant SQL Editor, account-creation or project-management access.

## 3. Enable website booking storage

The admin works without this optional step; calls/WhatsApp/walk-ins can be entered manually.

Using the official Supabase CLI on your own trusted machine:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set BOOKING_ALLOWED_ORIGINS=https://shanipratapsingh018.github.io
supabase functions deploy submit-booking --no-verify-jwt
```

Run those commands from this site folder. The CLI reads `supabase/config.toml`. Origin values contain only scheme and host, not `/Project/`. Add a custom website origin as a comma-separated value if needed. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function **server**; never copy the service-role key into the website. The endpoint is intentionally public, accepts only validated booking fields, and has no customer-read operation. `apikey` is sent by the public site, but is public configuration, not proof of identity.

Test one booking in the browser, confirm it appears only in the owner workspace, then set `bookingEnabled: true` and deploy. Before enabling, test the deployed endpoint with a controlled request using a UUID `X-Idempotency-Key`; a repeat with the same body must return success without adding another booking. The response contains no customer details. The browser retains its request ID in memory for identical retries after a timeout. If the tab is reloaded after uncertain receipt, check with the garage before submitting again.

Persistent hourly limits are 100 total, 30 per IP hash and 5 per mobile hash. Hashes are HMAC-derived server-side and old rate-limit rows are purged on subsequent submissions after two days. The database stores contact information because the garage needs it to provide service. CORS is a browser safeguard, not authentication; a public intake can still receive spam. Monitor usage and contact the garage by call/WhatsApp if a limit is reached. If needed later, add a verified bot challenge, without weakening owner policies.

## Owner workflow

- **Customers:** contact details, vehicles, private notes, archive flag, recent jobs and bills. Search covers name, mobile and registration. Lists use server pagination; customer pickers search the database and show up to 20 matches.
- **Bookings:** new requests and manually entered enquiries; convert once into a linked customer, vehicle and job card. Slot confirmation remains manual.
- **Job cards:** tasks, inspection notes, quote, approval reference and work status. Customer approval is required before progressing work. Upload private photos/PDFs up to 4 MB each; download is authenticated.
- **Invoices:** draft itemised labour/parts, per-item discounts, optional GST and server-checked totals. Quantity supports 3 decimals; prices use integer paise. Issue once to reserve a financial-year number and freeze supplier/customer/vehicle details. Issued amounts cannot be edited by browser API. Void an incorrect unpaid invoice with a reason; do not reuse its number. Consult your accountant about credit notes or statutory corrections for paid GST invoices; this version does not implement credit notes or GST filing.
- **Payments:** enter actual cash/UPI/bank/card receipts. Duplicate retries use the same request ID; concurrent writes lock the invoice to prevent overpayment. “Correct entry” reverses the ledger entry with a reason, and moves no money. Do not use ledger reversal as a substitute for a refund record or credit note.
- **Print / Save PDF:** opens the browser print dialog; select Save as PDF and share it manually. No public invoice links are generated.

Sessions are held in memory, with a 20-minute inactivity sign-out. Reloading requires signing in again. Do not use a shared browser while another person has access to your open tab. Use Supabase account MFA for the project dashboard. This version does not claim that admin-login MFA, employee roles, automated backups, inventory accounting, payroll, WhatsApp automation or online payments have been implemented.

## Backups, retention and maintenance

Before daily use, arrange database **and private file** backups with a recovery process you have tested. Do not assume free-tier snapshots or GitHub source archives back up customer data. Use Supabase’s supported database export tooling from a trusted machine, export Storage separately, encrypt backups and keep them outside the public repository. Review the plan’s backup capabilities and restore instructions. Periodically verify a restore into a separate private test project.

Only keep contact and job data for service/business needs, and billing/audit data for applicable legal retention periods. Respond to access/correction/deletion requests through the owner; check invoice retention requirements before deleting linked records. Archiving a customer hides no billing audit trail and is not deletion. The UI intentionally avoids destructive financial deletes. Database maintenance/deletion/export is an owner operation through Supabase, not a public API.

Migrations keep financial writes in owner-checked SQL functions, all browser tables behind owner RLS, and objects in a private bucket. Recheck policies after any schema change. Review Supabase Security Advisor before launch. No private records or credentials belong in test fixtures, GitHub issues, deployment logs or public ZIPs.

## Build and verification

```sh
cd admin-app
npm ci --ignore-scripts
npm test
npm run build
cd ..
npm run build
npm test
python3 tests/admin_test.py
```

The bundled official Supabase client is pinned in `admin-app/package-lock.json`; no runtime CDN is required. Commit the built `public/admin/` files. The root static server does not require admin build dependencies.

`npm --prefix admin-app run test:database` runs against an isolated local PostgreSQL 16 Docker container named `garagewala-db-test`. It creates disposable test databases and stubs Supabase Auth/Storage roles; never point it at production. See `admin-app/tests/database.mjs`. Browser tests mock HTTP responses using fictional records. These checks do **not** establish that your live Supabase Auth, email delivery, Edge Function or Storage service is configured correctly. Verify those after connecting your own project.
