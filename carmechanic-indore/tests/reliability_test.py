"""Regression checks for booking failures, stale estimates and review provenance.
Uses only a local server; API responses are intercepted, never sent to a garage.
"""
import json, os, re, shutil, subprocess, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parent.parent
server = subprocess.Popen(['node','tools/serve.mjs'], cwd=ROOT, env={**os.environ,'PORT':'0'}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
checks = 0

def check(value, message):
    global checks
    if not value: raise AssertionError(message)
    checks += 1
    print('✓ '+message, flush=True)

try:
    line = server.stdout.readline()
    match = re.search(r'127\.0\.0\.1:(\d+)', line)
    if not match: raise RuntimeError('Server failed: '+line)
    base = 'http://127.0.0.1:'+match[1]+'/'
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
        ctx = browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        errors = []
        ctx.on('page',lambda pg: pg.on('pageerror',lambda e:errors.append(str(e))))
        def page(draft=None, api=None, timeout=15000):
            pg = ctx.new_page()
            # Explicitly exercise the optional WhatsApp fallback and mock API modes;
            # never let regression fixtures submit to the production intake.
            pg.route('**/assets/js/backend-config.js*',lambda route:route.fulfill(content_type='text/javascript',body='window.GW_BACKEND={url:"",publishableKey:"",bookingEnabled:false};'))
            if draft is not None:
                pg.add_init_script('sessionStorage.setItem("cmi-booking", '+json.dumps(json.dumps(draft))+');')
            if api:
                config=(ROOT/'public/assets/js/config.js').read_text()+f'\nwindow.CMI_CONFIG.business.bookingEndpoint="/api/bookings";window.CMI_CONFIG.business.bookingTimeoutMs={timeout};'
                pg.route('**/assets/js/config.js*',lambda route:route.fulfill(status=200,content_type='text/javascript',body=config))
                pg.route('**/api/bookings',api)
            pg.goto(base+'booking.html');pg.wait_for_load_state('networkidle')
            return pg
        def next(pg): pg.locator('[data-b-next]').click()
        def fill(pg, service='GS-01'):
            pg.select_option('#b-brand','maruti');pg.select_option('#b-model','Swift')
            pg.locator('[data-b-more] > summary').click()
            cb=pg.locator(f'input[name="b-svc"][value="{service}"]')
            cb.evaluate('e=>e.closest("details").open=true')
            if not cb.is_checked(): cb.check()
            expect(cb).to_be_checked()
            next(pg)
            pg.fill('#b-name','Test Customer');pg.fill('#b-mobile','9876543210');pg.check('input[name="b-pickup"][value="no"]')

        pg=page({'services':['bad\"selector','__proto__',None],'qty':[], 'lights':'bad'})
        check(pg.locator('[data-b-count]').text_content()=='Step 1 of 2','Corrupt persisted selections do not crash booking: '+repr(pg.locator('[data-b-count]').inner_text())+' errors='+repr(errors))
        pg.close()
        pg=page('not an object');check(pg.locator('#b-brand option').count()>30 and pg.input_value('#b-brand')=='','Wrong-shaped session JSON is safely ignored');pg.close()

        handoff={'brand':'maruti','model':'Swift','year':'2025','fuel':'petrol','category':'hatchback','partsGrade':'genuine','services':['BD-01'],'qty':{'BD-01':3},'pickup':'no','estimate':'₹6,750 – ₹9,000','time':'Evening (4–8)'}
        pg=page(handoff)
        check(pg.input_value('#b-brand')=='maruti' and pg.input_value('#b-model')=='Swift','Estimator car survives booking handoff')
        check(pg.input_value('#bq-BD-01')=='3','Estimator panel quantity survives booking handoff')
        check(pg.is_checked('input[name="b-time"][value="Evening (4–8)"]'),'Preferred time survives booking handoff')
        check(pg.locator('[data-b-count]').text_content()=='Step 2 of 2' and pg.locator('#b-name').is_visible(),'A complete estimate opens booking straight at your details')
        pg.fill('#b-name','Test Customer');pg.fill('#b-mobile','9876543210')
        pg.check('input[name="b-day"][value="pick"]');pg.fill('#b-date','2000-01-01');next(pg)
        check(pg.locator('#b-date').get_attribute('aria-invalid')=='true' and pg.locator('[data-b-wa]').count()==0,'Booking rejects a past date even with novalidate')
        pg.check('input[name="b-day"][value="tomorrow"]');pg.check('input[name="b-pickup"][value="yes"]');pg.fill('#b-address','12 Test Road');pg.fill('#b-pin','052010');next(pg)
        check(pg.locator('#b-pin').get_attribute('aria-invalid')=='true','Booking rejects a six-digit PIN starting with zero')
        pg.check('input[name="b-pickup"][value="no"]');next(pg)
        msg=pg.locator('[data-b-wa]').get_attribute('href')
        from urllib.parse import unquote
        msg=unquote(msg)
        check('× 3 panel' in msg,'WhatsApp booking includes the selected number of panels')
        check('Car: Maruti Suzuki Swift' in msg and 'Preferred: ' in msg,'WhatsApp booking names the car and preferred day')
        # Pickup changed and then reverted: safely request a fresh quote rather than reusing one.
        check('Website estimate:' not in msg,'Changed pickup choices invalidate a carried estimate')
        pg.close()

        pg=page(handoff);pg.click('[data-b-back]')
        pg.select_option('#b-model','Baleno')
        check('Recalculate your estimate' in pg.locator('[data-b-estimate]').inner_text(),'Changing vehicle invalidates the old price immediately')
        next(pg);pg.fill('#b-name','Test Customer');pg.fill('#b-mobile','9876543210');next(pg)
        check('Website estimate:' not in unquote(pg.locator('[data-b-wa]').get_attribute('href')),'Stale price is absent from the final booking message');pg.close()

        pg=page(handoff);pg.fill('#b-name','Test Customer');pg.fill('#b-mobile','9876543210');next(pg)
        check('Website estimate: ₹6,750 – ₹9,000' in unquote(pg.locator('[data-b-wa]').get_attribute('href')),'Unchanged estimate is carried into the booking message');pg.close()

        pg=page();next(pg)
        check(pg.locator('#b-brand').get_attribute('aria-invalid')=='true' and pg.locator('[data-svc-err]').is_visible(),'Step 1 asks for the car and what it needs')
        pg.select_option('#b-brand','hyundai');pg.select_option('#b-model','Creta');pg.check('input[name="b-need"][value="AC not cooling"]')
        check(pg.locator('#b-brand').get_attribute('aria-invalid') is None,'Fixing a field clears its error straight away')
        next(pg)
        check(pg.locator('[data-b-count]').text_content()=='Step 2 of 2' and pg.locator('#b-address').is_visible(),'Problem tiles complete step 1; pickup address shows by default')
        pg.check('input[name="b-pickup"][value="no"]')
        check(pg.locator('#b-address').is_hidden(),'Choosing drop-off hides the address fields');
        pg.focus('#b-name');pg.wait_for_timeout(350)
        hidden=pg.evaluate('()=>{const r=document.querySelector(".mbar").getBoundingClientRect();return document.body.classList.contains("is-typing") && r.top>=innerHeight-1}')
        check(hidden,'The bottom action bar slides away while a field is being typed in')
        pg.locator('input[name="b-pickup"][value="yes"]').evaluate('e=>e.closest("label").click()');pg.evaluate('document.activeElement.blur()');pg.wait_for_timeout(350)
        check(pg.evaluate('()=>!document.body.classList.contains("is-typing") && document.querySelector(".mbar").getBoundingClientRect().bottom<=innerHeight+1'),'The bottom action bar returns after typing');pg.close()

        # Optional location: fills address + PIN from GPS, adds a map link; typing still works; blocked permission is handled.
        import base64
        TILE=base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMB/axs0WQAAAAASUVORK5CYII=")
        def loc_ctx(allow):
            c=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,geolocation={'latitude':22.7533,'longitude':75.8937,'accuracy':25},permissions=['geolocation'] if allow else [])
            c.on('page',lambda pg: pg.on('pageerror',lambda e:errors.append(str(e))))
            c.route('**/assets/js/backend-config.js*',lambda route:route.fulfill(content_type='text/javascript',body='window.GW_BACKEND={url:"",publishableKey:"",bookingEnabled:false};'))
            c.route('https://nominatim.openstreetmap.org/**',lambda r:r.fulfill(content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps({'address':{'road':'Scheme 54 Road','suburb':'Vijay Nagar','city':'Indore','postcode':'452010'}})))
            c.route('https://tile.openstreetmap.org/**',lambda r:r.fulfill(content_type='image/png',body=TILE))
            return c
        lc=loc_ctx(True);pg=lc.new_page();pg.goto(base+'booking.html');pg.wait_for_load_state('networkidle')
        pg.select_option('#b-brand','maruti');pg.select_option('#b-model','Swift');pg.check('input[name="b-need"][value="General service"]');next(pg);pg.check('input[name="b-pickup"][value="yes"]')
        check(pg.locator('#b-address').input_value()=='' and pg.locator('[data-b-map]').is_hidden(),'Location is never requested until the customer taps the button')
        pg.click('[data-b-locate]');expect(pg.locator('#b-pin')).to_have_value('452010')
        check(pg.locator('#b-address').input_value()=='Scheme 54 Road, Vijay Nagar, Indore' and pg.locator('[data-b-pin-result]').inner_text().strip()!='','“Use my current location” fills the address and PIN and checks free pickup')
        expect(pg.locator('[data-b-map] .leaflet-marker-icon')).to_be_visible()
        check(pg.locator('[data-b-map]').is_visible(),'A map with a draggable pin appears after locating')
        pg.fill('#b-address','12B, Scheme 54 Road, Vijay Nagar, Indore');pg.fill('#b-name','Test Customer');pg.fill('#b-mobile','9876543210');next(pg)
        msg=unquote(pg.locator('[data-b-wa]').get_attribute('href'))
        check('Pickup location (map): https://maps.google.com/?q=22.753300,75.893700' in msg and '12B, Scheme 54 Road' in msg,'The booking carries the typed address plus a Google Maps link to the spot')
        pg.locator('[data-b-edit]').click();pg.click('[data-b-loc-clear]')
        check(pg.locator('[data-b-map]').is_hidden() and pg.locator('#b-address').input_value().startswith('12B'),'“Don’t use my location” removes the pin but keeps what the customer typed')
        check(pg.locator('#b-pin').input_value()=='','Auto-filled PIN is cleared with the location')
        pg.fill('#b-pin','452010');next(pg)
        check('Pickup location' not in unquote(pg.locator('[data-b-wa]').get_attribute('href')),'Without location, no map link is sent');pg.close();lc.close()
        lc=loc_ctx(False);pg=lc.new_page();pg.goto(base+'booking.html');pg.wait_for_load_state('networkidle')
        pg.select_option('#b-brand','maruti');pg.select_option('#b-model','Swift');pg.check('input[name="b-need"][value="General service"]');next(pg);pg.check('input[name="b-pickup"][value="yes"]')
        pg.click('[data-b-locate]');expect(pg.locator('[data-b-loc-msg]')).to_contain_text('type your address',timeout=20000)
        check(pg.locator('#b-address').is_editable() and pg.locator('[data-b-locate]').is_enabled(),'If location is blocked, the customer is told to type the address and nothing is stuck');pg.close();lc.close()
        # Past time slots: late evening in India, "Today" greys out Morning/Afternoon/Evening.
        lc=loc_ctx(False);pg=lc.new_page()
        pg.add_init_script("{const D=Date;const at=D.parse('2026-11-13T15:45:00Z');globalThis.Date=class extends D{constructor(...a){super(...(a.length?a:[at]))}static now(){return at}};}")
        pg.goto(base+'booking.html');pg.wait_for_load_state('networkidle')
        pg.select_option('#b-brand','maruti');pg.select_option('#b-model','Swift');pg.check('input[name="b-need"][value="General service"]');next(pg);pg.check('input[name="b-pickup"][value="no"]')
        pg.check('input[name="b-day"][value="today"]')
        check(pg.locator('[data-b-garage]').is_visible() and pg.locator('[data-b-locate]').is_hidden(),'Drop-off hides the location button and shows the garage address with directions')
        off=pg.locator('input[name="b-time"]:disabled').evaluate_all('e=>e.map(x=>x.value)')
        check(off==['Morning (7–12)','Afternoon (12–4)','Evening (4–8)'] and pg.locator('[data-b-passed]').is_visible(),f'At 9:15 PM, Today greys out the slots that have passed ({off})')
        check(pg.locator('[data-b-day-sub="0"]').text_content()=='Fri 13','Day buttons show the real date');pg.close();lc.close()

        requests=[]
        def success(route): requests.append(route.request.post_data_json);route.fulfill(status=201,content_type='application/json',body='{"received":true}')
        pg=page(api=success);fill(pg);next(pg)
        expect(pg.locator('[data-b-result]')).to_contain_text('Request received')
        check(len(requests)==1 and requests[0]['serviceItems']==[{'id':'GS-01','qty':1}],'Successful API submission includes stable service IDs and quantities')
        check(pg.locator('[data-booking] form').is_hidden(),'Successful submission prevents accidental resubmission');pg.close()

        pg=page(api=lambda route:route.fulfill(status=500,body='test failure'));fill(pg);next(pg)
        expect(pg.locator('[data-b-result]')).to_contain_text("couldn't confirm")
        check(pg.locator('[data-booking] form').is_visible() and pg.locator('[data-b-result] a[href*="wa.me"]').count()==1,'API failure preserves details and offers a WhatsApp recovery')
        pg.fill('#b-name','Test Customer B')
        check(pg.locator('[data-b-result]').inner_text()=='','Editing after API failure clears the stale WhatsApp payload');pg.close()

        attempts=[]
        def stalled(route):
            attempts.append(route.request)
            # Browser timers keep running while this test endpoint delays its response.
            time.sleep(1.6)
            route.abort()
        pg=page(api=stalled,timeout=1200);fill(pg)
        pg.evaluate('()=>{const f=document.querySelector("[data-booking] form");f.requestSubmit();f.requestSubmit();}')
        expect(pg.locator('[data-b-result]')).to_contain_text('timed out',timeout=10000)
        check(len(attempts)==1,'Repeated submits while a request is pending send only one API request')
        check(pg.locator('[data-b-next]').is_enabled() and not pg.locator('[data-booking] form').evaluate('e=>e.inert'),'Timeout restores interactive controls and offers recovery');pg.close()

        pg=ctx.new_page();pg.goto(base+'car-ac-repair-indore.html')
        pg.fill('#qb-name','Test Customer');pg.fill('#qb-mobile','9876543210');pg.fill('#qb-car','Swift')
        pg.fill('#qb-date','2000-01-01');pg.locator('[data-quick-book] button[type="submit"]').click()
        check(pg.locator('#qb-date').get_attribute('aria-invalid')=='true' and pg.locator('[data-qb-wa]').count()==0,'Quick booking also rejects past dates');pg.close()

        pg=ctx.new_page();pg.goto(base+'reviews.html');pg.wait_for_load_state('networkidle')
        check(pg.locator('.review').count()==0 and pg.locator('.review-empty').is_visible(),'Invite Car Repair Wala customers without publishing another garage’s reviews')
        check(pg.locator('[data-review-summary]').is_hidden() and 'The Car Junction' not in pg.inner_text('main'),'Another garage’s name and aggregate rating are removed')
        check('aggregateRating' not in pg.content(),'No unsupported aggregate rating is injected into structured data')
        form=pg.locator('[data-review-form]')
        check(form.is_visible() and not pg.locator('[name=consent]').is_checked(),'Website feedback form is available and publication consent starts unchecked')
        pg.locator('[data-review-form] button[type=submit]').click()
        check(pg.locator('[data-review-send]').count()==0 and not form.evaluate('f=>f.checkValidity()'),'Empty reviews cannot prepare a delivery link')
        pg.fill('#r-name','   ');pg.locator('[name=rating][value="2"]').check(force=True)
        pg.fill('#r-text','This is a local test about my workshop experience.')
        form.locator('button[type=submit]').click()
        check(pg.locator('[data-review-send]').count()==0,'Whitespace-only names are rejected')
        pg.fill('#r-name','Local Test Customer');pg.fill('#r-text',' '*30)
        form.locator('button[type=submit]').click()
        check(pg.locator('[data-review-send]').count()==0,'Whitespace-only feedback is rejected')
        text='Local test: <img src=x onerror=alert(1)> and honest feedback.'
        pg.fill('#r-text',text);pg.fill('#r-car','Swift');pg.select_option('#r-service','Engine repair')
        form.locator('button[type=submit]').click()
        message=unquote(pg.locator('[data-review-send]').get_attribute('href'))
        check('Rating: 2/5' in message and text in message and 'NO — private feedback only' in message and 'Engine repair' in message,'Low-rated private feedback prepares an accurate WhatsApp message without requiring public consent')
        check(pg.locator('[data-review-result] img').count()==0 and 'not been sent yet' in pg.locator('[data-review-result]').inner_text(),'Review text is never interpreted as markup and preparation is not reported as delivery')
        pg.fill('#r-text','An updated local test review for the garage.')
        check(pg.locator('[data-review-send]').count()==0,'Editing feedback removes the stale prepared WhatsApp link')
        pg.locator('[name=rating][value="1"]').check(force=True);pg.locator('[name=consent]').check()
        form.locator('button[type=submit]').click()
        message=unquote(pg.locator('[data-review-send]').get_attribute('href'))
        check('Rating: 1/5' in message and 'website: YES' in message,'One-star reviews use the same publication permission flow as other ratings')
        form.locator('button[type=reset]').click()
        check(pg.input_value('#r-name')=='' and pg.locator('[data-review-send]').count()==0 and not pg.locator('[name=consent]').is_checked(),'Clear removes personal feedback and publication consent')
        check(pg.locator('[data-google-review]').get_attribute('href')=='https://share.google/xKw37sHP3Pm3QmCXr' and pg.locator('[data-google-review]').text_content()=='Car Repair Wala on Google','Google profile button follows the current owner-supplied business link')
        pg.locator('.menu-btn').click();pg.keyboard.press('Escape')
        check(pg.locator('.menu-btn').get_attribute('aria-expanded')=='false','Escape closes the mobile menu accessibly')
        pg.close()
        for consent in [False,True]:
            review_page=ctx.new_page()
            fixture={'name':'Test Customer','rating':5,'text':'Local regression fixture, never published.','source':'Customer','isSample':False,'approved':True,'consent':consent,'ownerApprovedScreenshot':True}
            body=(ROOT/'public/assets/js/reviews.js').read_text()+'\nwindow.CMI_REVIEWS.items='+json.dumps([fixture])+';'
            review_page.route('**/assets/js/reviews.js*',lambda route:route.fulfill(status=200,content_type='text/javascript',body=body))
            review_page.goto(base+'reviews.html');review_page.wait_for_load_state('networkidle')
            check(review_page.locator('.review').count()==(1 if consent else 0),'Approved feedback publishes only with customer permission: '+str(consent))
            review_page.close()
        pg=ctx.new_page();pg.goto(base+'contact.html');pg.wait_for_load_state('networkidle')
        check(pg.locator('[data-workshop-address]').first.text_content()=='17, AB Rd, Choithram Mandi, Indore, Madhya Pradesh 452012','Contact page shows the complete owner-supplied shop address and PIN')
        from urllib.parse import urlsplit,parse_qs
        maps=pg.locator('.side-card [data-map-link]')
        check(maps.get_attribute('href')=='https://share.google/xKw37sHP3Pm3QmCXr' and 'View workshop on Google' in maps.text_content(),'Contact location button opens the owner-supplied business listing')
        ld=json.loads(pg.locator('script[type="application/ld+json"]').first.text_content())
        check('7:00 AM–11:30 PM' in pg.locator('[data-working-hours]').inner_text() and ld['openingHours']==['Mo-Su 07:00-23:30'],'Everyday owner-confirmed hours appear in contact details and structured data')
        check(ld['address']['streetAddress']=='17, AB Rd, Choithram Mandi' and ld['address']['postalCode']=='452012' and ld['address']['addressRegion']=='Madhya Pradesh' and ld['sameAs']==['https://share.google/xKw37sHP3Pm3QmCXr'] and 'geo' not in ld,'Structured data uses the supplied address, PIN and profile without invented coordinates')
        pg.close()
        for file in ['index.html','about.html']:
            pg=ctx.new_page();pg.goto(base+file);pg.wait_for_load_state('networkidle')
            image=pg.locator('[data-slide] img').first if file=='index.html' else pg.locator('[data-photo-id="workshop-cars"] img')
            image.scroll_into_view_if_needed()
            check(image.is_visible() and image.evaluate('i=>i.complete && i.naturalWidth>0') and ('assets/img/workshop/' if file=='index.html' else 'car-repair-wala-workshop-') in image.get_attribute('src'),'Responsive generated workshop photo loads on mobile: '+file)
            pg.close()
        nojs=browser.new_context(java_script_enabled=False)
        pg=nojs.new_page();pg.goto(base+'reviews.html')
        check(pg.locator('[data-review-form]').is_hidden() and pg.locator('#write-review [data-feedback-wa]').is_visible(),'Without JavaScript, feedback still has a working WhatsApp fallback')
        nojs.close()
        check(not errors,'No uncaught JavaScript errors in regression scenarios: '+repr(errors))
        browser.close()
finally:
    server.terminate()
    try: server.wait(timeout=5)
    except subprocess.TimeoutExpired: server.kill();server.wait()
print(f'{checks} reliability checks passed',flush=True)
