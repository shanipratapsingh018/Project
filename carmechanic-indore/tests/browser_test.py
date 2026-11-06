# End-to-end checks in headless Chromium.
# Run from project root:  python3 tests/browser_test.py   (needs: pip install playwright && playwright install chromium)
import http.server, threading, functools, os, sys, urllib.parse, shutil, json
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
SHOTS = os.environ.get("SHOTS", os.path.join(os.path.dirname(__file__), "screenshots"))
os.makedirs(SHOTS, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path.split("?")[0] == "/404.html":
            # The deployed absolute base points at the public site. Use the
            # local origin while exercising the same root-relative asset paths.
            import re
            with open(os.path.join(ROOT, "404.html"), encoding="utf-8") as file:
                body = re.sub(r'<base href="[^"]+">', '<base href="/">', file.read()).encode()
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
        else: super().do_GET()
handler = functools.partial(Quiet, directory=ROOT)
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{srv.server_port}/"
fails = []
def check(cond, msg):
    print(("✓ " if cond else "✗ ") + msg)
    if not cond: fails.append(msg)

PAGES = [f for f in os.listdir(ROOT) if f.endswith(".html")]

with sync_playwright() as p:
    browser_path = os.environ.get("CHROMIUM_PATH") or shutil.which("chromium")
    b = p.chromium.launch(executable_path=browser_path)
    # 1. Every page: no console errors, no horizontal overflow on a phone
    for vp, name in [({"width": 390, "height": 844}, "mobile"), ({"width": 1366, "height": 900}, "desktop")]:
        ctx = b.new_context(viewport=vp, is_mobile=(name == "mobile"))
        for f in sorted(PAGES):
            pg = ctx.new_page(); errs = []
            pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
            pg.on("console", lambda m, errs=errs: errs.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text and "fonts.g" not in m.text and "status of 404" not in m.text else None)
            # 404s are allowed only for stock photos not yet downloaded (npm run photos); anything else is an error
            pg.on("response", lambda r, errs=errs: errs.append(f"{r.status} {r.url}") if r.status >= 400 and "/assets/img/photos/" not in r.url else None)
            pg.goto(BASE + f); pg.wait_for_load_state("networkidle")
            over = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if over > 0 or errs:
                check(False, f"{name} {f}: overflow={over} errors={errs[:2]}")
            pg.close()
        check(True, f"{name}: {len(PAGES)} pages loaded, no overflow or script errors (unless listed above)")
        ctx.close()

    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    booking_requests = []
    def booking_intake(route):
        cors = {"Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"*", "Access-Control-Allow-Methods":"POST,OPTIONS"}
        if route.request.method == "OPTIONS": return route.fulfill(status=204,headers=cors)
        booking_requests.append((route.request.headers,route.request.post_data_json))
        route.fulfill(status=200,content_type="application/json",headers=cors,body=json.dumps({'received':True,'requestId':route.request.headers['x-idempotency-key']}))
    # Intercept the actual configured function; never submit fixture details to production.
    ctx.route("https://oraooxeefxcwmwgycrei.supabase.co/functions/v1/submit-booking",booking_intake)
    pg = ctx.new_page()
    pg.goto(BASE + "index.html"); pg.wait_for_load_state("networkidle")
    pg.screenshot(path=f"{SHOTS}/home-mobile.png", full_page=False)
    est = "#estimate"
    # Validation: submitting empty step 1 shows an error
    check(not pg.is_visible(f"{est} [data-back]"), "Back button hidden on calculator step 1")
    pg.click(f"{est} [data-next]")
    check(pg.is_visible(f'{est} [data-err="1"]'), "Estimator blocks empty car step with an error")
    # Mobile bottom bar visible, has 3 actions with correct targets
    hrefs = pg.eval_on_selector_all(".mbar a", "els => els.map(e => e.href)")
    check(len(hrefs) == 3 and hrefs[0].startswith("tel:+918965957978") and "wa.me/918965957978" in hrefs[1] and hrefs[2].endswith("booking.html"), "Mobile bar: Call / WhatsApp / Book links correct")
    check(not pg.is_visible(".wa-float") and pg.is_visible(".mbar .wa"), "Mobile WhatsApp is available once in the action bar")
    mb = pg.eval_on_selector(".menu-btn", "e => e.getBoundingClientRect().width")
    check(mb >= 40, f"Mobile menu button is full size ({mb:.0f}px)")
    check("From ₹0" not in pg.inner_text("#services"), "Service cards never say 'From ₹0'")

    def fill_car(brand, model, year, fuel, cat=None):
        pg.select_option("#e-brand", brand)
        if brand == "other": pg.fill("#e-model-other", model)
        else: pg.select_option("#e-model", model)
        pg.select_option("#e-year", year)
        pg.check(f'{est} input[name="fuel"][value="{fuel}"]', force=True)
        if cat: pg.check(f'{est} input[name="cat"][value="{cat}"]', force=True)

    def run(case, brand, model, year, fuel, services, pin=None, cat=None, panels=None, grade=None, disabled=()):
        pg.goto(BASE + "index.html"); pg.wait_for_load_state("networkidle")
        fill_car(brand, model, year, fuel, cat)
        if grade: pg.select_option("#e-grade", grade)
        pg.click(f"{est} [data-next]")
        for s in disabled:
            check(pg.is_disabled(f'{est} .svc-opt[data-svc="{s}"] input') and "Not for" in pg.inner_text(f'{est} .svc-opt[data-svc="{s}"] .s'), f"{case}: {s} switched off in the service list")
        for s in services: pg.click(f'{est} .svc-opt[data-svc="{s}"]')
        if panels: pg.fill(f"{est} [data-qty-for=BD-01]", str(panels))
        pg.click(f"{est} [data-next]")
        if pin is None: pg.select_option("#e-pickup", "no")
        else: pg.fill("#e-pin", pin); pg.locator("#e-pin").blur()
        pg.fill("#e-name", "Test User")
        pg.click(f"{est} [data-next]")
        total = pg.inner_text(f"{est} .est-total .v")
        wa = pg.get_attribute(f"{est} [data-book-wa]", "href")
        msg = urllib.parse.unquote(wa.split("?text=")[1])
        print(f"   {case}: {total} | {pg.inner_text(f'{est} .est-total .t')}")
        return total, msg

    t, msg = run("Swift 2021 petrol: standard service + oil + AC service, Vijay Nagar", "maruti", "Swift", "2021", "petrol", ["GS-02", "GS-04", "AC-03"], pin="452010")
    check(t == "₹4,200 – ₹5,800", f"Swift: standard service ₹3,000–4,000 + AC service ₹1,200–1,800 = ₹4,200–5,800 (got {t})")
    check("included" in pg.inner_text(f"{est} .est-table").lower(), "Swift: oil change marked included in standard service")
    check(all(k in msg for k in ["Name: Test User", "Car: Maruti Suzuki Swift (2021)", "Fuel: Petrol", "Standard service", "Estimated range: ₹4,200 – ₹5,800", "Pickup & drop: Yes", "Area / PIN: 452010"]), "Swift: WhatsApp message prefilled with name, car, fuel, services, range, pickup, PIN")
    check("demo" not in msg.lower(), "WhatsApp message no longer says 'demo estimate'")
    check("Free pickup" in pg.inner_text(f"{est} .est-table"), "Swift: free pickup shown for listed area")
    pg.screenshot(path=f"{SHOTS}/estimate-mobile.png", full_page=False)
    pg.locator(f"{est} .estimate").screenshot(path=f"{SHOTS}/estimate-card.png")

    t2, m2 = run("Creta 2023 diesel: brake pads + shock absorbers, genuine parts, PIN 452020", "hyundai", "Creta", "2023", "diesel", ["BR-02", "SU-02"], pin="452020", grade="genuine")
    check("+ parts quoted by model" in pg.inner_text(f"{est} .est-total") and "+ parts quoted by model" in m2, "Labour-only shock absorbers flagged 'parts quoted by model' in total and WhatsApp")
    check("SUV / MUV" in pg.inner_text(f"{est} .est-total .k"), "Creta auto-categorised as SUV")
    check("Free pickup" in pg.inner_text(f"{est} .est-table") and "Area / PIN: 452020" in m2, "PIN 452020 gets free pickup in the estimate")
    # copy + start over tools
    check(pg.locator(f"{est} [data-book-form]").get_attribute("href") == "booking.html", "Result 'Book This Service' goes to booking form")
    pg.click(f"{est} [data-restart]")
    check(pg.is_visible(f'{est} [data-step="1"]') and pg.input_value("#e-brand") == "", "Start over resets the calculator")

    t3, m3 = run("Nexon EV: standard service + battery (oil change and clutch switched off)", "tata", "Nexon", "2024", "electric", ["GS-02", "TB-05"], pin="999999", disabled=["GS-04", "CL-02"])
    check("N/A" not in pg.inner_text(f"{est} .est-table"), "EV: no not-applicable jobs reach the estimate")
    check("on request" in pg.inner_text(f"{est} .est-table").lower() and "Price on request: Standard service" in m3, "EV: periodic service shown as price on request")
    check("Outside our confirmed pickup area" in pg.inner_text(f"{est} .est-table"), "Out-of-area PIN not promised free pickup")

    t4, _ = run("BMW X3 2012: gearbox + accident only", "bmw", "X3", "2012", "diesel", ["CL-04", "BD-09"])
    check(t4 == "Inspection required", "Inspection-only jobs show 'Inspection required'")

    # luxury car: standard service becomes quote, oil change has its own luxury price
    t6, m6 = run("BMW 3 Series 2022 luxury: standard service + oil change", "bmw", "3 Series", "2022", "petrol", ["GS-02", "GS-04"])
    check(t6 == "₹4,800 – ₹6,650" and "Price on request: Standard service" in m6, f"Luxury: oil change priced ₹4,800–6,650, standard service on request (got {t6})")
    t5, m5 = run("Other brand (Jeep Compass 2019) SUV: dent & paint x3", "other", "Jeep Compass", "2019", "diesel", ["BD-01"], cat="suv", panels=3)
    check(t5 == "₹7,200 – ₹10,800", f"SUV dent & paint ×3 = 3 × ₹2,400–3,600 (got {t5})")
    check("Jeep Compass" in m5 and "× 3 panel" in m5, "Other brand + per-panel denting carried into WhatsApp")
    # search + exclusive service levels
    pg.goto(BASE + "index.html"); pg.wait_for_load_state("networkidle")
    fill_car("maruti", "Swift", "2021", "petrol"); pg.click(f"{est} [data-next]")
    pg.fill("#e-search", "battery")
    vis = pg.eval_on_selector_all(f"{est} .svc-opt", "els => els.filter(e => !e.hidden).map(e => e.dataset.svc)")
    check("TB-05" in vis and "GS-04" not in vis and len(vis) < 10, f"Service search filters the list ({len(vis)} shown for 'battery')")
    pg.fill("#e-search", "")
    pg.click(f'{est} .svc-opt[data-svc="GS-01"]'); pg.click(f'{est} .svc-opt[data-svc="GS-03"]')
    check(not pg.is_checked(f'{est} .svc-opt input[value="GS-01"]') and pg.is_checked(f'{est} .svc-opt input[value="GS-03"]'), "Only one service level (basic/standard/comprehensive) can be selected")
    check("₹2,200" in pg.inner_text(f'{est} .svc-opt[data-svc="GS-01"]'), "Service list shows hatchback price beside each option")

    # Package button presets estimator
    pg.goto(BASE + "index.html"); pg.wait_for_load_state("networkidle")
    check("₹" in pg.inner_text('[data-pkg="ac-service"]'), "Package cards show computed price ranges")
    pg.click('[data-pkg-btn="ac-service"]')
    check(pg.is_checked(f'{est} .svc-opt input[value="AC-03"]'), "AC package button preselects AC service in estimator")
    check("₹1,200 – ₹1,800" in pg.inner_text('[data-pkg="ac-service"]') and "₹3,000 – ₹4,000" in pg.inner_text('[data-pkg="standard-service"]'), "Package cards show approved rate-card prices")

    # Area checker
    check(pg.locator("#areas [data-area-wa]").count() == 1, "PIN checker shows WhatsApp button before any check")
    GOOD = "Great news! Pickup and drop are available in your area, subject to booking confirmation."
    NOT = "Your location is not in our confirmed service list yet. Contact us to check availability."
    for q, expect in [("452020", GOOD), ("452010", GOOD), ("Kasturbagram", GOOD), ("452004", NOT), ("453441", NOT), ("110001", NOT), ("4520", "all 6 digits"), ("45A010", "valid PIN"), ("052010", "valid PIN"), ("Atlantis", "couldn't find")]:
        pg.fill("#home-area", q); pg.click("#areas .checker button")
        out = pg.inner_text("#areas [data-area-result]")
        wa = pg.get_attribute("#areas [data-area-wa]", "href") or ""
        check(expect in out and "wa.me/918965957978" in wa, f"PIN checker '{q}' → {expect[:40]} (+ WhatsApp button)")
    pg.fill("#home-area", "452020"); pg.click("#areas .checker button")
    wmsg = urllib.parse.unquote(pg.get_attribute("#areas [data-area-wa]", "href").split("?text=")[1])
    check("PIN 452020" in wmsg and "pickup and drop" in wmsg, "Checker WhatsApp message carries PIN 452020")

    # Hindi toggle
    pg.click("header .lang-toggle")
    check("इंदौर" in pg.inner_text("h1"), "Hindi toggle translates hero")
    pg.click("header .lang-toggle")
    check("indore" in pg.inner_text("h1").lower() and pg.locator("h1 span").count() == 1, "English restored (with accent span)")
    pg.click("footer .lang-toggle")
    check(pg.evaluate("document.documentElement.lang") == "hi" and pg.inner_text("header .lang-toggle") == "English", "Footer language switch changes the whole page")
    pg.click("footer .lang-toggle")
    check(pg.evaluate("document.documentElement.lang") == "en", "Footer switch returns to English")
    check(pg.locator("footer .footer-cta [data-tel]").get_attribute("href") == "tel:+918965957978" and "wa.me/918965957978" in pg.locator("footer .footer-cta .btn--wa").get_attribute("href"), "Footer Call now and WhatsApp us buttons link correctly")
    check(pg.inner_text("footer [data-open-status]") in ("Open now", "Closed now", "OPEN NOW", "CLOSED NOW"), "Footer shows an open/closed label")

    # Booking form
    pg.goto(BASE + "booking.html"); pg.wait_for_load_state("networkidle")
    check("Carried over" in pg.inner_text("[data-b-estimate]"), "Booking form receives estimate from calculator")
    pg.fill("#b-name", "Asha"); pg.fill("#b-mobile", "12345")
    pg.click("[data-b-next]")
    check("valid 10-digit" in pg.inner_text("[data-booking]"), "Booking rejects invalid mobile")
    pg.fill("#b-mobile", "+91 98765 43210"); pg.click("[data-b-next]")
    check(pg.input_value("#b-model-other") == "Jeep Compass", "Booking prefilled car from estimate (other brand)")
    pg.fill("#b-reg", "MP09 AB 1234"); pg.click("[data-b-next]")
    pg.click("[data-b-next]")  # services prefilled from estimate
    pg.select_option("#b-pickup", "yes")
    pg.fill("#b-address", "12, Test Colony"); pg.fill("#b-pin", "45201")
    pg.click("[data-b-next]")
    check("6-digit PIN" in pg.inner_text("[data-booking]"), "Booking validates PIN")
    pg.fill("#b-pin", "452010"); pg.click("[data-b-next]")
    pg.locator('[data-b-result] strong').filter(has_text='Request received.').wait_for()
    check(len(booking_requests)==1 and booking_requests[0][1]['mobile']=='9876543210' and booking_requests[0][1]['registration']=='MP09 AB 1234' and booking_requests[0][1]['pin']=='452010', "Enabled website form posts customer, car and pickup details to the configured function")
    check(bool(booking_requests[0][0].get('apikey')) and bool(booking_requests[0][0].get('x-idempotency-key')), "Online booking includes the public key and a duplicate-safe request ID")
    check("Request received." in pg.inner_text("[data-b-result]") and "confirmed only after" in pg.inner_text("[data-b-result]"), "Online receipt still requires the garage to confirm the appointment")
    pg.screenshot(path=f"{SHOTS}/booking-mobile.png", full_page=False)

    # Reviews: genuine customer invitation, no borrowed testimonials
    pg.goto(BASE + "index.html"); pg.wait_for_load_state("networkidle")
    check(pg.locator("#reviews .review").count() == 0 and pg.locator("#reviews .tag--demo").count() == 0, "No reviews from another garage or sample testimonials")
    check(pg.locator("#reviews [data-review-summary]").is_hidden() and pg.locator("#reviews .review-empty").is_visible(), "No borrowed Google rating; invite genuine Car Repair Wala customers instead")
    check(pg.get_attribute("#reviews [data-share-review]", "href") == "reviews.html#write-review", "Website reviews link to the customer feedback form")
    check(pg.locator("#before-after .ba-card").count() == 4, "Homepage shows 4-card Before & After preview")

    # Gallery page: 10 cards, labels, filters, swipe on mobile
    pg.goto(BASE + "gallery.html"); pg.wait_for_load_state("networkidle")
    n = pg.locator(".ba-card").count()
    check(n == 19 and pg.locator(".ba-note").count() == 0 and pg.locator(".ba-card [data-call-now]").count() == 19, "Service gallery has 19 cards with Call Now and no image disclaimers")
    check(pg.locator(".ba-label--before").count() == 19 and pg.locator(".ba-label--after").count() == 19, "Every card has a Before and an After image")
    pg.click('[data-filter="body"]')
    vis = pg.eval_on_selector_all(".ba-card", "els => els.filter(e => !e.hidden).length")
    vis_px = pg.eval_on_selector_all(".ba-card", "els => els.filter(e => e.offsetHeight > 0).length")
    check(vis == 5 and vis_px == 5, f"Gallery filter 'Bodywork & lights' shows 5 cards (got {vis})")
    pg.click('[data-filter="all"]')
    sw = pg.evaluate("(() => { const p = document.querySelector('.ba-pair'); return p.scrollWidth > p.clientWidth * 1.5; })()")
    check(sw, "On mobile, before/after pair is a swipeable slider")
    pg.locator(".ba-card").first.screenshot(path=f"{SHOTS}/gallery-card-mobile.png")
    pg.click('.ba-card >> nth=0 >> [data-book-similar]')
    pg.wait_for_load_state("networkidle")
    check(pg.url.endswith("booking.html?service=BD-01") and pg.is_checked('input[name="b-svc"][value="BD-01"]'), "'Book Similar Service' opens booking form with the service ticked")

    # Quick booking form on a service page
    pg.goto(BASE + "car-ac-repair-indore.html"); pg.wait_for_load_state("networkidle")
    pg.click("[data-quick-book] button[type=submit]")
    check(pg.locator("[data-quick-book] [aria-invalid=true]").count() == 3, "Service-page booking form validates name, mobile and car")
    pg.fill("#qb-name", "Neha"); pg.fill("#qb-mobile", "9876543210"); pg.fill("#qb-car", "Honda City 2020"); pg.fill("#qb-pin", "452020"); pg.fill("#qb-problem", "AC not cooling")
    pg.click("[data-quick-book] button[type=submit]")
    qm = urllib.parse.unquote(pg.get_attribute("[data-qb-wa]", "href").split("?text=")[1])
    check("Service: AC service (standard)" in qm and "PIN 452020 (in your confirmed service area)" in qm and "Problem: AC not cooling" in qm, "Service-page booking builds WhatsApp message")
    check(pg.locator(".page-photo img").count() >= 2, "Service page shows before/after photos")

    # Service page rate table
    pg.goto(BASE + "car-ac-repair-indore.html"); pg.wait_for_load_state("networkidle")
    check(pg.locator(".rate-table tbody tr").count() >= 1 and "₹" in pg.inner_text(".rate-table"), "Service page renders rate table")
    check(pg.is_checked('[data-estimator] .svc-opt input[value="AC-03"]'), "Service page estimator preset to AC service")
    check("₹1,200 – ₹1,800" in pg.inner_text(".rate-table") and "Inspection required" in pg.inner_text(".rate-table"), "AC page price list shows approved range and inspection-only jobs")

    # Services & prices page: full list, static HTML matches live render
    pg.goto(BASE + "services.html"); pg.wait_for_load_state("networkidle")
    pg.locator("[data-compare-prices] summary").click()
    rows = pg.locator(".price-list tbody tr").count()
    check(rows == 69, f"Price list shows all 69 services (got {rows})")
    txt = pg.inner_text(".price-list")
    check("₹2,200 – ₹3,000" in txt and "₹20,000 – ₹30,000" in txt and "Price on request" in txt, "Price list shows approved ranges (basic service, full-body paint) and price-on-request rows")
    import urllib.request
    raw = urllib.request.urlopen(BASE + "services.html").read().decode()
    check("₹2,200 – ₹3,000" in raw, "Prices are in the static HTML (visible to search engines without JavaScript)")

    # Navigation: Home works from every page, no broken internal links, images load with alt text
    import re as _re
    missing, nohome, badimg, badwa = set(), [], [], []
    for f in sorted(PAGES):
        pg.goto(BASE + f); pg.wait_for_load_state("networkidle")
        hrefs = pg.eval_on_selector_all("a[href]", "els => els.map(e => e.getAttribute('href'))")
        for h in hrefs:
            if h.startswith(("http", "tel:", "mailto:", "#")): continue
            target = h.split("#")[0].split("?")[0]
            if target and not os.path.exists(os.path.join(ROOT, target)): missing.add(f"{f} → {h}")
        if not pg.locator('.nav a[href="index.html"]').count() or not pg.locator('a.brand[href="index.html"]').count(): nohome.append(f)
        if f not in ("index.html", "404.html") and not pg.locator(".back-home").count(): nohome.append(f + " (no back-to-home)")
        imgs = pg.eval_on_selector_all('main img:not([aria-hidden="true"])', "els => els.map(e => [e.getAttribute('src'), e.complete && e.naturalWidth > 0, (e.getAttribute('alt')||'').length])")
        for src, ok, alt in imgs:
            if alt < 10: badimg.append(f"{f}: {src} alt too short")
        for wa in pg.eval_on_selector_all("a[href*='wa.me']", "els => els.map(e => e.href)"):
            if "wa.me/918965957978" not in wa: badwa.append(f"{f}: {wa[:60]}")
    check(not missing, f"No internal links to missing pages {sorted(missing)[:5]}")
    check(not nohome, f"Home link, logo link and Back to Home present on every page {nohome[:5]}")
    check(not badimg, f"All images have descriptive alt text {badimg[:3]}")
    check(not badwa, f"Every WhatsApp link uses 918965957978 {badwa[:3]}")
    # Click Home from a deep page, and active-page highlight
    pg.goto(BASE + "gallery.html"); pg.wait_for_load_state("networkidle")
    check(pg.get_attribute('.nav a[aria-current="page"]', "href") == "gallery.html", "Active page highlighted in nav")
    pg.click(".menu-btn"); pg.click('.nav a[href="index.html"]'); pg.wait_for_load_state("networkidle")
    check(pg.url.endswith("index.html") and pg.locator("[data-estimator]").count() == 1, "Mobile hamburger → Home navigates to homepage")
    # All gallery images actually load (lazy images scrolled into view)
    pg.goto(BASE + "gallery.html"); pg.wait_for_load_state("networkidle")
    for i in range(pg.locator(".ba-shot img").count()): pg.locator(".ba-shot img").nth(i).scroll_into_view_if_needed()
    pg.wait_for_timeout(400)
    broken = pg.eval_on_selector_all(".ba-shot img", "els => els.filter(e => !(e.complete && e.naturalWidth > 0)).map(e => e.src)")
    check(not broken and pg.locator(".ba-shot img").count() == 38, f"All 38 gallery images load {broken[:2]}")

    # Bundled illustrations work without third-party image servers.
    import io
    pg.goto(BASE + "index.html"); pg.wait_for_load_state("networkidle")
    check(pg.locator(".hero-art").count() == 0 and pg.locator("[data-slide]").count() == 20, "Homepage has one twenty-photo slider and no separate image")
    check("AI-generated" in pg.locator("[data-slide] img").first.get_attribute("alt"), "Slider source metadata is retained in alt text")
    # (b) available: serve a test JPEG for every local photo path
    from PIL import Image
    buf = io.BytesIO(); Image.new("RGB", (1600, 1067), (90, 110, 130)).save(buf, "JPEG"); JPG = buf.getvalue()
    pctx = b.new_context(viewport={"width": 1366, "height": 900})
    pctx.route("**/assets/img/photos/*.jpg", lambda route: route.fulfill(status=200, content_type="image/jpeg", body=JPG))
    pp = pctx.new_page()
    pp.goto(BASE + "index.html"); pp.wait_for_load_state("networkidle"); pp.wait_for_timeout(300)
    pp.evaluate("(async () => { for (const c of document.querySelectorAll('figure.photo')) { c.scrollIntoView(); await new Promise(r => setTimeout(r, 80)); } })()")
    pp.wait_for_timeout(600); pp.evaluate("window.scrollTo(0,0)")
    loaded = pp.eval_on_selector_all("figure.photo img", "els => els.filter(e => e.complete && e.naturalWidth > 0 && !e.closest('figure').hidden).length")
    total = pp.locator("figure.photo img").count()
    check(total == 9 and loaded == total, f"Photos available → all {total} homepage photos display ({loaded} loaded)")
    check(pp.locator(".hero-art").count() == 0, "Separate homepage image is removed as requested")
    pp.screenshot(path=f"{SHOTS}/photos-home-desktop.png", full_page=False)
    pp.goto(BASE + "car-detailing-indore.html"); pp.wait_for_load_state("networkidle")
    check(pp.locator(".page-hero-photo img").is_visible() and pp.locator(".photo-row img").count() == 2, "Detailing page shows hero photo + 2 extra photos")
    over = pp.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(over <= 0, "No horizontal overflow with photos")
    mctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    mctx.route("**/assets/img/photos/*.jpg", lambda route: route.fulfill(status=200, content_type="image/jpeg", body=JPG))
    mp = mctx.new_page(); mp.goto(BASE + "car-service-indore.html"); mp.wait_for_load_state("networkidle")
    check(mp.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "Mobile service page with photo has no overflow")
    mp.screenshot(path=f"{SHOTS}/photos-service-mobile.png", full_page=False)
    mctx.close(); pctx.close()

    # Desktop screenshots
    dctx = b.new_context(viewport={"width": 1366, "height": 900})
    d = dctx.new_page(); d.goto(BASE + "index.html"); d.wait_for_load_state("networkidle")
    d.screenshot(path=f"{SHOTS}/home-desktop.png", full_page=True)
    d.goto(BASE + "car-service-indore.html"); d.wait_for_load_state("networkidle")
    d.screenshot(path=f"{SHOTS}/service-desktop.png", full_page=True)
    d.goto(BASE + "gallery.html"); d.wait_for_load_state("networkidle")
    for i in range(d.locator(".ba-shot img").count()): d.locator(".ba-shot img").nth(i).scroll_into_view_if_needed()
    d.screenshot(path=f"{SHOTS}/gallery-desktop.png", full_page=True)
    d.goto(BASE + "pickup-drop.html"); d.wait_for_load_state("networkidle")
    d.fill("#pd-area", "452020"); d.click(".checker button")
    d.screenshot(path=f"{SHOTS}/pickup-452020.png", full_page=False)
    b.close()

srv.shutdown()
print(f"\n{'ALL PASSED' if not fails else str(len(fails)) + ' FAILED'}")
sys.exit(1 if fails else 0)
