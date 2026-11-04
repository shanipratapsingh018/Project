# Activate the booking-handler fixes

The website update keeps the parts preference in enquiry notes, which the
existing deployed function already stores. The updated handler also preserves
structured parts/category metadata and enforces the workshop's India date.

**Server activation is a separate deployment from GitHub Pages.** This cloud
environment has no Supabase deployment identity. The code is prepared and tested;
the existing Supabase project still needs the following function deployment.

1. Open your existing project:
   https://supabase.com/dashboard/project/oraooxeefxcwmwgycrei/functions
2. Open **submit-booking → Code**.
3. Replace the contents of **index.ts** with the complete file
   [submit-booking-v2.3.0.ts](deploy/submit-booking-v2.3.0.ts).
   It is self-contained, so it does not require an imported `handler.mjs`.
   Leave the existing project and function name unchanged.
4. Keep the existing secrets, including `BOOKING_ALLOWED_ORIGINS`, and the
   function's existing public-invocation/JWT configuration. Do not paste secret
   values into the website or a chat. No database migration is required.
5. Click **Deploy updates**.
6. Use the website to make one deliberate test enquiry, confirm its receipt in
   **Admin → Bookings**, and check that its notes include the parts preference.

For a CLI already authenticated to this project, the equivalent command from
the website source folder is:

```sh
supabase functions deploy submit-booking --project-ref oraooxeefxcwmwgycrei --no-verify-jwt
```

The local suites use fake requests and an isolated database. They do not send
customer enquiries to the live project. The source-code past-date fix is not
active on the live server until this deployment is completed.
