"""Regressions for the 13 audit findings. Local pages and intercepted HTTP only."""
import json,os,re,shutil,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('SHOTS','/tmp/carrepair-audit-fixes'));OUT.mkdir(parents=True,exist_ok=True)
server=subprocess.Popen(['node','tools/serve.mjs'],cwd=ROOT,env={**os.environ,'PORT':'0'},stdout=subprocess.PIPE,text=True)
checks=0
def check(ok,label):
 global checks
 assert ok,label
 checks+=1;print('✓ '+label,flush=True)
try:
 base='http://127.0.0.1:'+re.search(r':(\d+)',server.stdout.readline())[1]
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
  ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
  ctx.route('https://**/*',lambda r:r.abort())
  ctx.route('**/assets/js/backend-config.js*',lambda r:r.fulfill(content_type='text/javascript',body='window.GW_BACKEND={url:"https://test.supabase.co",publishableKey:"sb_publishable_fixture",bookingEnabled:true};'))
  requests=[];mode={'value':'success'};errors=[]
  def api(route):
   headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,OPTIONS'}
   if route.request.method=='OPTIONS':return route.fulfill(status=204,headers=headers)
   requests.append(route.request.post_data_json)
   body={'received':True,'requestId':route.request.headers.get('x-idempotency-key')}
   if mode['value']=='false':body['received']=False
   if mode['value']=='wrong-id':body['requestId']='wrong'
   if mode['value']=='missing':body={}
   route.fulfill(status=200,headers=headers,content_type='application/json',body='not JSON' if mode['value']=='invalid-json' else json.dumps(body))
  ctx.route('https://test.supabase.co/functions/v1/submit-booking',api)
  def page(name='booking.html',draft=None):
   p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
   if draft:p.add_init_script('sessionStorage.setItem("cmi-booking",'+json.dumps(json.dumps(draft))+');')
   p.goto(base+'/'+name);return p
  def next(p):p.locator('[data-b-next]').click()
  def car(p,brand='maruti',model='Swift'):
   p.select_option('#b-brand',brand)
   if brand=='other' or model not in p.eval_on_selector_all('#b-model option','e=>e.map(o=>o.value)'):
    if brand!='other':p.select_option('#b-model','__other')
    p.fill('#b-model-other',model)
   else:p.select_option('#b-model',model)
  def choose(p,id):
   cb=p.locator('input[name="b-svc"][value="'+id+'"]');cb.evaluate('e=>{e.closest("[data-b-more]").open=true;e.closest("details").open=true}');cb.click()
  def details(p):
   p.fill('#b-name','Fictional Audit Customer');p.fill('#b-mobile','9000000003');p.check('input[name="b-pickup"][value="no"]')
  def finish(p):next(p);details(p);next(p)
  p=page();next(p)
  bad=p.locator('#b-brand');description=bad.get_attribute('aria-describedby')
  check(bad.get_attribute('aria-invalid')=='true' and description and p.locator('#'+description).is_visible(),'Invalid fields expose their visible error as an accessible description')
  car(p);p.check('input[name="b-need"][value="General service"]');next(p);check(p.evaluate('document.activeElement.tagName') in ['H2','H3'],'Booking focuses the new step heading');p.keyboard.press('Tab');check(p.evaluate('document.activeElement.id')=='b-name','Tab reaches the first new field')
  p.close()
  p=page(draft={'year':'2004','brand':'maruti','model':'Swift','fuel':'petrol'});car(p);p.check('input[name="b-need"][value="General service"]');finish(p);expect(p.locator('[data-b-result]')).to_contain_text('Request received')
  check(requests[-1]['year']=='' and requests[-1]['model']=='Swift','An unconfirmed handoff year is never submitted as fact');p.close()
  p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  legacy=(ROOT/'public/booking.html').read_text().replace('id="b-brand"','id="b-brand-old"')
  p.route('**/booking.html',lambda route:route.fulfill(content_type='text/html',body=legacy));p.goto(base+'/booking.html')
  check(p.locator('[data-b-stale]').is_visible() and p.locator('[data-b-stale] a[href="booking.html"]').count()==1,'A cached older booking page asks for a refresh instead of breaking');p.close()
  p=page();car(p);choose(p,'BD-01');p.fill('#bq-BD-01','0');before=len(requests);next(p)
  check(p.locator('[data-bstep]').nth(0).is_visible() and p.locator('#bq-BD-01').input_value()=='0' and len(requests)==before,'Invalid quantity is blocked without changing the displayed number')
  p.fill('#bq-BD-01','2');finish(p);expect(p.locator('[data-b-result]')).to_contain_text('Request received')
  check(requests[-1]['serviceItems']==[{'id':'BD-01','qty':2}] and any('× 2' in x for x in requests[-1]['services']) and requests[-1]['brand']=='Maruti Suzuki' and requests[-1]['category']=='hatchback','Corrected quantity and matched car are submitted exactly');p.close()
  p=page();car(p)
  for id in p.locator('input[name="b-svc"]').evaluate_all('els=>els.map(e=>e.value)'):choose(p,id)
  check(p.locator('input[name="b-svc"]:checked').count()==30 and '30' in p.locator('[data-svc-err]').inner_text(),'Service choices stop at the backend limit with an explanation');p.close()
  handoff={'brand':'maruti','model':'Swift','year':'1998','yearExact':True,'fuel':'petrol','category':'hatchback','partsGrade':'genuine','services':['GS-01'],'pickup':'no','estimate':'₹3,000 – ₹4,000'}
  p=page(draft=handoff);finish(p);expect(p.locator('[data-b-result]')).to_contain_text('Request received')
  check(requests[-1]['partsGrade']=='genuine' and 'Parts preference: Genuine OEM' in requests[-1]['notes'] and requests[-1]['year']=='1998' and requests[-1]['fuel']=='petrol','The estimate’s year, fuel and parts preference reach the garage');p.close()
  p=page();car(p,'tata','Nexon EV');p.fill('#b-notes','Makes a clicking noise');finish(p);expect(p.locator('[data-b-result]')).to_contain_text('Request received')
  check(requests[-1]['services']==['Problem described in notes'] and requests[-1]['brand']=='Tata','A described problem is enough without tapping a tile');p.close()
  for value in ['false','wrong-id','missing','invalid-json']:
   mode['value']=value;p=page();car(p);choose(p,'GS-01');finish(p);expect(p.locator('[data-b-result]')).to_contain_text("couldn't confirm")
   check(p.locator('[data-booking] form').is_visible() and p.locator('#b-name').input_value()=='Fictional Audit Customer',value+' acknowledgement never clears the form or claims receipt');p.close()
  mode['value']='success'
  p=page('estimate.html');p.select_option('#e-brand','maruti');p.select_option('#e-model','Swift');p.check('input[name="fuel"][value="petrol"]',force=True);p.check('input[name="age"][value="old"]',force=True);p.check('[data-tile="BD-01"]',force=True)
  p.fill('#q-BD-01','0');p.locator('[data-next]').click();check(p.locator('[data-step="1"]').is_visible() and p.locator('#q-BD-01').get_attribute('aria-invalid')=='true','Calculator blocks an invalid quantity')
  p.fill('#q-BD-01','2');p.locator('[data-next]').click();check(p.evaluate('document.activeElement.tagName') in ['H2','H3'],'Calculator focuses the price step heading')
  p.keyboard.press('Tab');check(p.evaluate('document.activeElement.name')=='grade','Keyboard order continues with the parts-quality choice')
  p.locator('.est-breakdown > summary').click();check('older than 10 years' in p.locator('[data-step="2"]').inner_text() and '× 2' in p.locator('.est-table').inner_text(),'Over-10-years age and panel count are priced');p.close()
  p=ctx.new_page();p.add_init_script("{const D=Date;const at=D.parse('2026-11-04T20:00:00Z');globalThis.Date=class extends D{constructor(...a){super(...(a.length?a:[at]))}static now(){return at}};}");p.goto(base+'/booking.html')
  check(p.locator('#b-date').get_attribute('min')=='2026-11-05','Calendar uses the India date just after midnight');p.close()
  p=page(draft=handoff);p.locator('header .lang-toggle').click();expect(p.locator('h1')).to_contain_text('कार सर्विस बुक करें');check(p.locator('[data-b-count]').text_content()=='चरण 2 / 2','A complete estimate opens booking at step 2, in Hindi too');p.locator('[data-b-back]').click()
  check(p.locator('label[for="b-brand"]').inner_text()=='कार ब्रांड *' and p.locator('[data-b-next]').inner_text()=='आगे' and p.locator('input[name="b-need"][value="AC not cooling"] + span').inner_text()=='एसी ठंडा नहीं कर रहा','Hindi covers booking headings, labels, tiles and Next')
  finish(p)
  expect(p.locator('[data-b-result]')).to_contain_text('अनुरोध मिल गया')
  check(requests[-1]['fuel']=='petrol' and requests[-1]['partsGrade']=='genuine' and requests[-1]['year']=='1998' and requests[-1]['pickup']=='no','Hindi display does not alter submitted vehicle or preference values')
  check('आगे क्या होगा' in p.locator('[data-b-result]').inner_text(),'Hindi confirmation explains what happens next')
  p.locator('header .lang-toggle').click();expect(p.locator('h1')).to_contain_text('Book a car service',ignore_case=True);check(p.locator('[data-b-result]').text_content().strip().startswith('Request received'),'Switching back restores English, including dynamic confirmations');p.close();ctx.close()
  # Test enlarged browser preferences, not CSS that suppresses overflow.
  ctx=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');ctx.route('https://**/*',lambda r:r.abort());p=ctx.new_page();session=ctx.new_cdp_session(p);session.send('Page.setFontSizes',{'fontSizes':{'standard':32,'fixed':26}})
  for width in [320,390,768,1024,1440]:
   p.set_viewport_size({'width':width,'height':844})
   for name in sorted(f.name for f in (ROOT/'public').glob('*.html')):
    p.goto(base+('/audit-missing-page' if name=='404.html' else '/'+name));p.evaluate('document.fonts.ready')
    check(p.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'),f'{width}px large text fits '+name)
    p.locator('header .lang-toggle').click()
    check(p.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'),f'{width}px large Hindi text fits '+name)
    if name=='booking.html' and width==390:p.screenshot(path=str(OUT/'large-hindi-booking.png'))
    p.locator('header .lang-toggle').click()
  ctx.close();check(not errors,'No script errors in the audit regressions: '+repr(errors));b.close()
finally:
 server.terminate();server.wait(timeout=10)
print(f'{checks} audit-fix browser checks passed',flush=True)
