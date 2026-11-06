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
            pg.fill('#b-name','Test Customer');pg.fill('#b-mobile','9876543210');next(pg)
            pg.select_option('#b-brand','maruti');pg.select_option('#b-model','Swift');pg.select_option('#b-year','2025');pg.select_option('#b-fuel','petrol');next(pg)
            cb=pg.locator(f'input[name="b-svc"][value="{service}"]')
            cb.evaluate('e=>e.closest("details").open=true')
            if not cb.is_checked(): cb.locator('..').click()
            expect(cb).to_be_checked()
            next(pg);pg.select_option('#b-pickup','no')

        pg=page({'services':['bad\"selector','__proto__',None],'qty':[], 'lights':'bad'})
        check(pg.locator('[data-b-count]').text_content()=='Step 1 of 4','Corrupt persisted selections do not crash booking: '+repr(pg.locator('[data-b-count]').inner_text())+' errors='+repr(errors))
        pg.close()
        pg=page('not an object');check(pg.locator('#b-brand option').count()>1,'Wrong-shaped session JSON is safely ignored');pg.close()

        handoff={'brand':'maruti','model':'Swift','year':'2025','fuel':'petrol','category':'hatchback','partsGrade':'genuine','services':['BD-01'],'qty':{'BD-01':3},'pickup':'no','estimate':'₹6,750 – ₹9,000','time':'Evening (4–8)'}
        pg=page(handoff)
        check(pg.input_value('#bq-BD-01')=='3','Estimator panel quantity survives booking handoff')
        check(pg.input_value('#b-time')=='Evening (4–8)','Preferred time survives booking handoff')
        pg.fill('#b-name','Test Customer');pg.fill('#b-mobile','9876543210');next(pg);next(pg);next(pg)
        pg.fill('#b-date','2000-01-01');next(pg)
        check(pg.locator('#b-date').get_attribute('aria-invalid')=='true' and pg.locator('[data-b-wa]').count()==0,'Booking rejects a past date even with novalidate')
        pg.fill('#b-date','');pg.select_option('#b-pickup','yes');pg.fill('#b-address','12 Test Road');pg.fill('#b-pin','052010');next(pg)
        check(pg.locator('#b-pin').get_attribute('aria-invalid')=='true','Booking rejects a six-digit PIN starting with zero')
        pg.select_option('#b-pickup','no');next(pg)
        msg=pg.locator('[data-b-wa]').get_attribute('href')
        from urllib.parse import unquote
        msg=unquote(msg)
        check('× 3 panel' in msg,'WhatsApp booking includes the selected number of panels')
        # Pickup changed and then reverted: safely request a fresh quote rather than reusing one.
        check('Website estimate:' not in msg,'Changed pickup choices invalidate a carried estimate')
        pg.close()

        pg=page(handoff);pg.fill('#b-name','Test Customer');pg.fill('#b-mobile','9876543210');next(pg)
        pg.select_option('#b-model','Baleno')
        check('Recalculate your estimate' in pg.locator('[data-b-estimate]').inner_text(),'Changing vehicle invalidates the old price immediately')
        next(pg);next(pg);next(pg)
        check('Website estimate:' not in unquote(pg.locator('[data-b-wa]').get_attribute('href')),'Stale price is absent from the final booking message');pg.close()

        requests=[]
        def success(route): requests.append(route.request.post_data_json);route.fulfill(status=201,content_type='application/json',body='{"received":true}')
        pg=page(api=success);fill(pg);next(pg)
        expect(pg.locator('[data-b-result]')).to_contain_text('Request received.')
        check(len(requests)==1 and requests[0]['serviceItems']==[{'id':'GS-01','qty':1}],'Successful API submission includes stable service IDs and quantities')
        check(pg.locator('[data-booking] form').is_hidden(),'Successful submission prevents accidental resubmission');pg.close()

        pg=page(api=lambda route:route.fulfill(status=500,body='test failure'));fill(pg);next(pg)
        expect(pg.locator('[data-b-result]')).to_contain_text("couldn't confirm")
        check(pg.locator('[data-booking] form').is_visible() and pg.locator('[data-b-result] a[href*="wa.me"]').count()==1,'API failure preserves details and offers a WhatsApp recovery')
        pg.fill('#b-date','2030-01-01')
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
