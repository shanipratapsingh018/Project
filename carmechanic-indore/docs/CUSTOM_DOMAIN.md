# Connect carrepairwala.co.in

Primary address: `https://carrepairwala.co.in/`.
The `www` address should redirect to the primary address through GitHub Pages.
The existing GitHub Pages hosting can continue; a GoDaddy hosting plan is not needed.

This branch prepares `public/CNAME`, the website URL, canonical links, structured
data, sitemap and robots.txt. These prepared files have not activated the domain.
Complete the following account settings before treating the domain as ready.

## Supabase: booking and owner access

These account changes require the Supabase project's owner access. Public website
keys do not grant permission to change project settings.

1. In the project's Edge Function secrets, append
   `https://carrepairwala.co.in` and `https://www.carrepairwala.co.in` to
   `BOOKING_ALLOWED_ORIGINS`. Preserve every existing origin. Separate origins
   with commas and use scheme and hostname only, without paths or trailing slashes.
2. In Authentication → URL Configuration, add
   `https://carrepairwala.co.in/admin/` and `https://www.carrepairwala.co.in/admin/`
   to Redirect URLs. Preserve existing valid redirect URLs during the transition.
   Once the new HTTPS address works, set Site URL to
   `https://carrepairwala.co.in/admin/`.

The booking function checks its Origin allow-list. The custom domain must be
included for online bookings to work from the new address.

## GitHub Pages: register the domain first

Open <https://github.com/shanipratapsingh018/Project/settings/pages>.
Under **Custom domain**, enter `carrepairwala.co.in` and select **Save**.
Keep **Deploy from a branch → gh-pages → /(root)**.

GitHub's official instructions specify registering the domain in Pages before
changing DNS. Saving creates a CNAME file on the publishing branch. The prepared
source includes the same file so future builds retain it. The initial DNS check
may fail until the records below propagate.

The old GitHub Pages address may start redirecting during this switch, so make
the DNS changes immediately afterward.

## GoDaddy: set DNS records

Open the domain in GoDaddy, then **DNS → DNS Records**. Set these records:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | shanipratapsingh018.github.io |

Use the default TTL. Replace conflicting apex A records, such as parking records,
with these four A records. Edit an existing www CNAME instead of adding a duplicate.
The www value is a hostname only, without `https://` or `/Project/`.
Preserve unrelated email, TXT and nameserver records. If apex AAAA records exist,
reconcile them with GitHub's documented IPv6 addresses rather than leaving
conflicting web-host addresses. If GoDaddy says DNS is managed elsewhere, edit
records at the authoritative DNS provider shown there.

DNS changes may take up to 24 hours to propagate.

## Publish and verify

After the account settings and DNS are ready, publish the prepared `public/`
contents to `gh-pages`. First inspect remote changes made by the Pages settings
UI and preserve its CNAME and unrelated changes. Save the matching source on
`website-v1.5` and refresh the downloadable ZIP after activation.

When GitHub's DNS check passes and the certificate is available, enable
**Enforce HTTPS**. Confirm both the primary and www addresses, menu links, owner
login and a password-reset link. Check a controlled booking without using a real
customer's information. A successful local build does not verify these live steps.

The new public and admin paths are `/` and `/admin/`, without `/Project/`.

Reference: [GitHub's official custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
