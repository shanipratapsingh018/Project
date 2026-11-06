"""All public layouts, including open sections, on real mobile viewport widths.

No production writes: remote HTTP is blocked and backend configuration is disabled.
Run with `npm run test:responsive`; SHOTS selects the JSON/screenshot directory.
"""
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('SHOTS', '/tmp/carrepair-responsive-shots'))
OUT.mkdir(parents=True, exist_ok=True)
WIDTHS = [320, 360, 390, 430, 640, 760, 768, 900, 1024, 1280, 1440]
PAGES = sorted(p.name for p in (ROOT / 'public').glob('*.html')) + ['admin/index.html']
rows = []
server = subprocess.Popen(['node', 'tools/serve.mjs'], cwd=ROOT,
    env={**os.environ, 'PORT': '0'}, stdout=subprocess.PIPE, text=True)

MEASURE = r'''() => {
  const cw = document.documentElement.clientWidth;
  const rect = e => e.getBoundingClientRect();
  const visible = e => e && getComputedStyle(e).display !== 'none' && rect(e).width > 0;
  const issues = [];
  const check = (ok, label) => { if (!ok) issues.push(label); };
  // innerWidth grows to include overflowing content under mobile emulation.
  // clientWidth is the layout viewport and catches the original 636px-on-390px bug.
  check(document.documentElement.scrollWidth <= cw + 1, 'document overflows screen');
  for (const e of document.querySelectorAll('.prose > *, .table-scroll')) {
    if (!visible(e)) continue;
    const r = rect(e), p = rect(e.parentElement);
    const c = getComputedStyle(e.parentElement);
    check(r.left >= p.left - 1 && r.right <= p.right - parseFloat(c.paddingRight) + 1,
      'content escapes its column: ' + e.className);
  }
  for (const e of document.querySelectorAll('.rate-table-block .table-scroll')) {
    if (!visible(e)) continue;
    check(e.tabIndex === 0 && !!e.getAttribute('aria-label'), 'price scroll region lacks keyboard access');
    if (e.scrollWidth > e.clientWidth + 1) {
      check(visible(e.previousElementSibling), 'overflowing price table has no scroll hint');
      const old = e.scrollLeft;
      e.scrollLeft = e.scrollWidth;
      check(e.scrollLeft > 0, 'last vehicle category cannot be reached');
      e.scrollLeft = old;
    }
  }
  const bar = document.querySelector('.mbar'), float = document.querySelector('.wa-float');
  if (visible(bar)) {
    check(!visible(float), 'duplicate mobile WhatsApp');
    check(rect(bar).left >= 0 && rect(bar).right <= cw + 1, 'action bar extends off screen');
    check([...bar.querySelectorAll('a')].every(a => rect(a).width >= 44 && rect(a).height >= 44
      && rect(a).right <= cw && rect(a).left >= 0), 'action buttons are clipped or too small');
  } else if (document.querySelector('.site-footer')) {
    check(visible(float), 'desktop WhatsApp missing');
  }
  for (const h of document.querySelectorAll('.jobcard-head time')) {
    const r = document.createRange(); r.selectNodeContents(h);
    check(r.getClientRects().length === 1, 'rate-card date splits across lines');
  }
  if (cw <= 520) for (const e of document.querySelectorAll('.steps--service')) {
    check(getComputedStyle(e).gridTemplateColumns.split(' ').length === 1, 'service steps cramped into two columns');
  }
  for (const e of document.querySelectorAll('.page-photo .ba-pair')) {
    check(e.scrollWidth <= e.clientWidth + 1, 'service before/after pair clipped');
    check(e.querySelectorAll('.ba-shot').length === 2, 'service comparison incomplete');
  }
  for (const e of document.querySelectorAll('.page-photo img, .ba-card img')) {
    if (!visible(e)) continue;
    check(e.complete && e.naturalWidth > 0, 'comparison image failed to load');
    if (e.naturalWidth) check(rect(e).width <= e.naturalWidth + 1, 'comparison image enlarged beyond original resolution');
  }
  return {clientWidth: cw, scrollWidth: document.documentElement.scrollWidth, issues};
}'''

try:
    line = server.stdout.readline()
    match = re.search(r'127\.0\.0\.1:(\d+)', line)
    if not match:
        raise RuntimeError('Server did not start: ' + line)
    base = 'http://127.0.0.1:' + match[1]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
        for width in WIDTHS:
            ctx = browser.new_context(viewport={'width': width, 'height': 900},
                is_mobile=width <= 768, has_touch=width <= 768, reduced_motion='reduce')
            ctx.route('https://**/*', lambda route: route.abort())
            ctx.route('**/assets/js/backend-config.js*', lambda route: route.fulfill(
                content_type='text/javascript', body='window.GW_BACKEND={url:"",publishableKey:"",bookingEnabled:false};'))
            page = ctx.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))

            def inspect(name, state='initial'):
                data = page.evaluate(MEASURE)
                rows.append({'page': name, 'width': width, 'state': state, **data})

            for name in PAGES:
                errors.clear()
                page.goto(base + ('/responsive-missing-page' if name == '404.html' else '/' + name))
                page.evaluate('document.fonts.ready')
                # Lazy images must decode before checking their source dimensions.
                for image in page.locator('.page-photo img, .ba-card img').all():
                    image.evaluate('e=>e.loading="eager"')
                    expect(image).to_have_js_property('complete', True)
                inspect(name)
                rows[-1]['issues'].extend('script error: ' + e for e in errors)
                if name == 'services.html':
                    page.locator('[data-compare-prices] summary').click()
                    inspect(name, 'price comparison open')
                if name == 'index.html' and page.locator('.menu-btn').is_visible():
                    page.locator('.menu-btn').click()
                    expect(page.locator('.menu-btn')).to_have_attribute('aria-expanded', 'true')
                    inspect(name, 'mobile menu open')
                    page.locator('.menu-btn').click()
                if name in ['index.html', 'brake-clutch-repair-indore.html']:
                    page.locator('header .lang-toggle').click()
                    inspect(name, 'Hindi labels')
                    page.locator('header .lang-toggle').click()
                if width == 390 and name in ['index.html', 'brake-clutch-repair-indore.html', 'car-ac-repair-indore.html', 'gallery.html']:
                    page.evaluate('scrollTo(0,0)')
                    page.screenshot(path=str(OUT / (name.replace('.html', '') + '-mobile-top.png')))
                    if page.locator('.rate-table-block').count():
                        page.locator('.rate-table-block').first.screenshot(path=str(OUT / (name.replace('.html', '') + '-mobile-prices.png')))
                if page.locator('.site-footer').count():
                    page.evaluate('scrollTo(0,document.documentElement.scrollHeight)')
                    covered = page.evaluate('''() => {
                      const f=document.querySelector('.site-footer .fine').getBoundingClientRect();
                      const b=document.querySelector('.mbar');
                      return f.bottom > (getComputedStyle(b).display==='none' ? innerHeight : b.getBoundingClientRect().top)+1;
                    }''')
                    if covered:
                        rows.append({'page': name, 'width': width, 'state': 'footer', 'issues': ['copyright obscured by fixed controls']})
                    if width == 390 and name == 'brake-clutch-repair-indore.html':
                        page.screenshot(path=str(OUT / 'brake-clutch-mobile-footer.png'))
            print(f'{width}px: {len(PAGES)} pages; {sum(bool(r["issues"]) for r in rows if r["width"] == width)} failing states', flush=True)
            ctx.close()
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=10)
    (OUT / 'responsive-results.json').write_text(json.dumps(rows, indent=2))

failures = [r for r in rows if r['issues']]
for row in failures:
    print(f'FAIL {row["width"]}px {row["page"]} ({row["state"]}): {row["issues"]}')
assert rows and len({r['page'] for r in rows}) == len(PAGES), 'Audit must check every route'
assert not failures, f'{len(failures)} responsive states failed; see {OUT}'
print(f'{len(rows)} responsive states passed across {len(PAGES)} routes and {len(WIDTHS)} viewport widths. Report: {OUT}', flush=True)
