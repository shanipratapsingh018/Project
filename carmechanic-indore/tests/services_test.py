"""Service menu UI, accurate prices, brand and accessible filters."""
import functools, http.server, os, shutil, threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parent.parent
SHOTS=Path(os.environ.get('SHOTS',ROOT/'tests/screenshots'));SHOTS.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'public')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
passed=0
errors=[]
def check(value,message):
 global passed
 if not value:raise AssertionError(message)
 passed+=1;print('✓ '+message,flush=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
  for width,height in [(360,800),(390,844),(768,1024),(1440,1000)]:
   context=browser.new_context(viewport={'width':width,'height':height},is_mobile=width<768)
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if r.status>=400 and not r.url.endswith('/favicon.ico') else None)
   page.goto(base+'services.html');page.wait_for_load_state('networkidle')
   check(page.locator('.site-header .brand-name').inner_text().lower().replace(' ','')=='carrepairwala',f'{width}px: Car Repair Wala brand appears')
   check(page.locator('.site-header .brand-sub').is_visible() and 'Your Car. Our Care.' in page.locator('.brand-sub').first.text_content(),f'{width}px: current tagline stays visible')
   check(page.locator('.site-header .brand-logo').evaluate('e=>e.complete&&e.naturalWidth>0'),f'{width}px: new logo loads')
   check(page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),f'{width}px: no horizontal overflow')
   check(page.locator('[data-service-card]:visible').count()==85,f'{width}px: all 85 service cards initially visible')
   page.screenshot(path=str(SHOTS/f'car-repair-wala-services-{width}.png'),full_page=False)
   if width==1440:
    page.locator('[data-services-car]').select_option('suv')
    check('₹2,750 – ₹3,750'==page.locator('[data-service-card="GS-01"] [data-service-range]').text_content(),'SUV card price matches the approved calculator rate')
    check('₹2,750 – ₹3,750'==page.locator('[data-package-range="GS-01"]').text_content(),'Package price follows the vehicle selection')
    page.locator('[data-services-car]').select_option('luxury')
    check('Quote after inspection' in page.locator('[data-service-card="GS-01"] [data-service-range]').text_content(),'Luxury services without a price ask for an inspection')
    page.locator('[data-service-filter="AC"]').click()
    check(page.locator('[data-service-card]:visible').count()==7,'AC category isolates the seven AC services')
    check(page.locator('[data-service-filter="AC"]').get_attribute('aria-pressed')=='true','Active filter is announced accessibly')
    page.locator('[data-services-search]').fill('battery')
    check(page.locator('[data-services-empty]').is_visible(),'Combined search and category show a useful empty state')
    page.locator('[data-clear-services]').click()
    check(page.locator('[data-service-card]:visible').count()==85,'Clear filters restores all services')
    page.locator('[data-services-search]').fill('battery')
    check(page.locator('[data-service-card="TB-05"]').is_visible() and not page.locator('[data-service-card="BD-01"]').is_visible(),'Search finds battery services and hides unrelated jobs')
    page.locator('[data-compare-prices] summary').click()
    check(page.locator('.price-list [data-svc-row="TB-05"]').is_visible() and not page.locator('.price-list [data-svc-row="BD-01"]').is_visible(),'Comparison tables use the same search filters')
    page.locator('[data-services-search]').fill('<img src=x onerror=alert(1)>')
    check(page.locator('[data-services-empty]').is_visible() and page.locator('img[src="x"]').count()==0,'Search text is never inserted as HTML')
    page.locator('[data-clear-services]').click()
    page.locator('[data-service-card="GS-01"] .service-card-footer a').click();page.wait_for_load_state('networkidle')
    check(page.url.endswith('booking.html?service=GS-01') and page.locator('input[name="b-svc"][value="GS-01"]').is_checked(),'Book service carries the selected job into booking')
   context.close()
  # The static service menu still works without JavaScript.
  context=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844},is_mobile=True)
  page=context.new_page();page.goto(base+'services.html')
  check(page.locator('[data-service-card]').count()==85 and '₹2,200 – ₹3,000' in page.content(),'All services and base prices are present without JavaScript')
  check(not page.locator('[data-explorer-tools]').is_visible(),'Unavailable search controls are hidden when JavaScript is disabled')
  page.locator('[data-compare-prices] summary').click()
  check(page.locator('.rate-table').first.is_visible(),'Price comparison opens natively without JavaScript')
  context.close();browser.close()
 check(not errors,'No script errors or failed asset requests: '+repr(errors))
finally:server.shutdown();server.server_close()
print(f'{passed} service menu checks passed',flush=True)
