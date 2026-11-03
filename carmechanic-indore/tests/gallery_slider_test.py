"""Local browser checks for the service gallery and homepage photo navigation.
Only inspect telephone/WhatsApp links; never place calls or send messages.
"""
import os, re, shutil, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
server = subprocess.Popen(['node', 'tools/serve.mjs'], cwd=ROOT,
    env={**os.environ, 'PORT': '0'}, stdout=subprocess.PIPE, text=True)
checks = 0
def check(value, message):
    global checks
    if not value:
        raise AssertionError(message)
    checks += 1
    print('✓ ' + message, flush=True)

try:
    line = server.stdout.readline()
    match = re.search(r'127\.0\.0\.1:(\d+)', line)
    if not match:
        raise RuntimeError('Local server did not start: ' + line)
    base = 'http://127.0.0.1:' + match[1] + '/'
    shots = Path(os.environ.get('SHOTS', '/tmp/garagewala-gallery-slider-shots'))
    shots.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
        for width in [320, 390, 768, 1024, 1366, 1920]:
            page = browser.new_page(viewport={'width': width, 'height': 900})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(base)
            slider = page.locator('[data-workshop-slider]')
            slider.scroll_into_view_if_needed()
            check(slider.locator('[data-slide]').count() == 20, f'{width}px: twenty service photos')
            count = slider.locator('[data-slide-count]')
            expect(count).to_have_text('1 / 20')
            check(page.locator('.hero-art').count() == 0 and page.locator('[data-workshop-slider]').count() == 1, f'{width}px: one slider without the separate photo')
            check(slider.evaluate('s => {const w=s.parentElement.getBoundingClientRect();const c=getComputedStyle(s.parentElement);return Math.abs(s.getBoundingClientRect().width-(w.width-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight)))<2;}'), f'{width}px: slider spans the full content width')
            home_style=page.locator('.nav-home').evaluate('e=>{const c=getComputedStyle(e);return [c.backgroundImage,c.backgroundColor,c.color,c.borderColor];}')
            header_metrics='e=>{const b=e.querySelector(".brand"),n=e.querySelector(".nav");return [e.offsetHeight,b.getBoundingClientRect().left,getComputedStyle(e.querySelector(".brand-name")).fontSize,getComputedStyle(n).backgroundImage,getComputedStyle(n).borderRadius];}'
            header_style=page.locator('.site-header').evaluate(header_metrics)
            sources = set()
            for i in range(20):
                photo = slider.locator('[data-slide] img').nth(i)
                expect(photo).to_have_js_property('complete', True)
                check(photo.evaluate('i => i.naturalWidth > 0'), f'{width}px: photo {i+1} decodes')
                sources.add(photo.get_attribute('src'))
                check(slider.evaluate('r => {const t=r.querySelector("[data-slide-track]");const i=Math.round(t.scrollLeft/t.getBoundingClientRect().width);const s=r.querySelectorAll("[data-slide]")[i];return Math.abs(s.getBoundingClientRect().left-t.getBoundingClientRect().left)<2;}'), f'{width}px: photo {i+1} aligns with viewport')
                slider.locator('[data-slide-next]').click()
                expect(count).to_have_text(f'{(i+1)%20+1} / 20')
            check(len(sources) == 20, f'{width}px: twenty distinct assets and Next wraps to first')
            slider.locator('[data-slide-prev]').click()
            expect(count).to_have_text('20 / 20')
            track = slider.locator('[data-slide-track]')
            track.focus()
            page.keyboard.press('Home'); expect(count).to_have_text('1 / 20')
            page.keyboard.press('End'); expect(count).to_have_text('20 / 20')
            page.keyboard.press('ArrowRight'); expect(count).to_have_text('1 / 20')
            page.keyboard.press('ArrowLeft'); expect(count).to_have_text('20 / 20')
            check(True, f'{width}px: Previous, keyboard navigation and wrapping')
            track.evaluate('t => t.scrollLeft = t.getBoundingClientRect().width * 4')
            expect(count).to_have_text('5 / 20')
            check(True, f'{width}px: swipe/scroll position updates the counter')
            check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{width}px: homepage has no overflow')
            if width == 1366:
                page.locator('.hero').screenshot(path=str(shots / 'home-desktop.png'))
            if width == 390:
                slider.screenshot(path=str(shots / 'slider-mobile.png'))
                page.set_viewport_size({'width': 1366, 'height': 900})
                expect(count).to_have_text('5 / 20')
                check(True, 'Resizing keeps the selected photo')
                page.set_viewport_size({'width': width, 'height': 900})
            page.goto(base + 'gallery.html'); page.wait_for_load_state('networkidle')
            current=page.locator('.nav a[aria-current="page"]')
            check(current.count()==1 and current.get_attribute('href')=='gallery.html' and current.evaluate('e=>{const c=getComputedStyle(e);return [c.backgroundImage,c.backgroundColor,c.color,c.borderColor];}')==home_style, f'{width}px: only the current gallery link gets the selected style')
            check(page.locator('.nav-home').get_attribute('aria-current') is None and page.locator('.nav-home').evaluate('e=>{const c=getComputedStyle(e);return [c.backgroundImage,c.backgroundColor,c.color,c.borderColor];}')!=home_style, f'{width}px: Home is not selected on another page')
            check(page.locator('.site-header').evaluate(header_metrics)==header_style, f'{width}px: header size, branding and navigation style stay consistent between pages')
            check(page.locator('h1').text_content() == 'Service Gallery', f'{width}px: gallery is renamed')
            calls = page.locator('main [data-call-now]')
            check(calls.count() == 20 and all(h == 'tel:+918965957978' for h in calls.evaluate_all('els=>els.map(e=>e.getAttribute("href"))')), f'{width}px: gallery header and all nineteen cards have Call Now')
            check(page.locator('.ba-note').count() == 0 and not re.search(r'illustrative example|about these images|not an actual customer vehicle', page.inner_text('main'), re.I), f'{width}px: image disclaimer labels removed')
            page.locator('[data-filter="body"]').click()
            check(page.locator('.ba-card:visible').count() == 5, f'{width}px: category filters still work')
            check(page.evaluate('document.documentElement.scrollWidth <= innerWidth') and not errors, f'{width}px: gallery fits without script errors')
            if width == 1366:
                page.locator('.ba-card').first.screenshot(path=str(shots / 'gallery-card-desktop.png'))
            page.close()
        nojs = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844})
        page = nojs.new_page(); page.goto(base)
        check(page.locator('[data-slide]').count() == 20 and page.locator('[data-slider-controls]').is_hidden() and page.locator('[data-slide-track]').evaluate('t=>getComputedStyle(t).overflowX') == 'auto', 'Without JavaScript, photos remain a native swipeable strip')
        page.goto(base + 'gallery.html')
        check(page.locator('.page-hero [data-call-now]').get_attribute('href') == 'tel:+918965957978', 'Gallery Call Now works without JavaScript')
        nojs.close(); browser.close()
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill(); server.wait()
print(f'{checks} gallery and slider checks passed', flush=True)
