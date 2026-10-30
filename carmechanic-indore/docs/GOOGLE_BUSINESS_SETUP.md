> v1.7.0 update: The owner supplied https://share.google/Zot7dWX2M9FAUQRIX.
> It is connected as a separate "Garagewala on Google" button via `reviews.js → googleProfileUrl`.
> The redirect destination could not be checked in this environment; no direct-review URL,
> ownership verification or Google rating is inferred. The address-search link remains separate.
> The owner confirmed daily hours: 7:00 AM–11:30 PM IST.

# Garagewala: create your own Google Business Profile

No Google listing has been created or verified by this code change. The website currently
links to a **landmark search** on Google Maps, not to a registered Garagewala business profile.
The earlier review screenshots belonged to another garage and have been removed.

The owner must sign in with their own Google account at https://business.google.com/create.
Search for the actual Garagewala business first. Claim it only if it is your business; otherwise
create a new listing. Do not claim or rename another garage's existing profile.

Ready details:

- Business name: Garagewala (use the real name displayed on your business signage).
- Category: Auto repair shop, or the closest available category for your actual service.
- Address supplied by owner: Front of Regional Park, Indore, Madhya Pradesh, India.
- Phone: +91 89659 57978, as configured on the website; confirm it is the correct business number.
- Website: https://shanipratapsingh018.github.io/Project/

Enter the exact street/shop address and postal code yourself and place the pin at your actual
workshop entrance. These details were not supplied and have not been guessed. Enter only real
working hours. Complete whatever ownership/location verification Google requests.

After Google verification, obtain the business's Maps sharing URL and its **Ask for reviews**
link. Put the actual profile URL in `business.googleBusinessProfileUrl` and the review link in
`public/assets/js/reviews.js → googleReviewUrl`, then rebuild and deploy. Keep the landmark
search separate. Do not put account passwords, verification codes or OAuth tokens in these files.
