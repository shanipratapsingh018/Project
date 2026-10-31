"""Local browser checks with fictional records and mocked Supabase HTTP only."""
import base64,json,os,re,shutil,subprocess,time
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parent.parent
OUT=Path('/workspace/website-review/admin-v2.0.0');OUT.mkdir(parents=True,exist_ok=True)
server=subprocess.Popen(['node','tools/serve.mjs'],cwd=ROOT,env={**os.environ,'PORT':'0'},stdout=subprocess.PIPE,text=True)
checks=0
def check(v,label):
    global checks
    if not v: raise AssertionError(label)
    checks+=1;print('✓ '+label,flush=True)
uid='11111111-1111-4111-8111-111111111111';cid='33333333-3333-4333-8333-333333333333';vid='44444444-4444-4444-8444-444444444444'
def jwt():
    enc=lambda obj:base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip('=')
    return enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':uid,'role':'authenticated','aud':'authenticated','exp':int(time.time())+3600})+'.testsignature'
config='window.GW_BACKEND={url:"https://test.supabase.co",publishableKey:"sb_publishable_fixture",bookingEnabled:false};'
try:
    line=server.stdout.readline();base='http://127.0.0.1:'+re.search(r':(\d+)',line)[1]+'/'
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
        ctx=browser.new_context(viewport={'width':1366,'height':900})
        errors=[];writes=[];requests=[]
        ctx.on('page',lambda pg:pg.on('pageerror',lambda err:errors.append(str(err))))
        pg=ctx.new_page();pg.route('**/assets/js/backend-config.js*',lambda route:route.fulfill(content_type='text/javascript',body='window.GW_BACKEND={url:"",publishableKey:"",bookingEnabled:false};'));pg.goto(base+'admin/index.html');expect(pg.get_by_text('Your workspace is ready to connect.')).to_be_visible()
        check(pg.locator('input[type=password]').count()==0,'Unconnected admin fails closed without a fake login')
        pg.screenshot(path=str(OUT/'setup-desktop.png'),full_page=True);pg.close()
        state={'owner':True,'fail':False}
        customers=[{'id':cid,'name':'Fictional Customer','mobile':'9000000000','address':'Test billing address','state_code':'23','email':'','gstin':None,'notes':'','archived':False,'version':1,'vehicle_count':1,'created_at':'2026-10-31T00:00:00Z'}]
        vehicle={'id':vid,'customer_id':cid,'make':'Test','model':'Test car','registration':'MP09TEST','fuel':'petrol','year':2050,'version':1}
        vehicles=[vehicle];bookings=[]
        profile={'id':True,'invoice_name':'Garagewala','phone':'8965957978','address':'Test garage address','state_code':'23','gstin':None,'billing_ready':True,'invoice_prefix':'GW','invoice_footer':'Thank you','version':1}
        iid='55555555-5555-4555-8555-555555555555'
        invoice={'id':iid,'customer_id':cid,'customer_name':'Fictional Customer','mobile':'9000000000','number':'GW/2026-27/0001','status':'issued','issue_date':'2026-10-31','due_date':None,'tax_mode':'none','supply_state':'23','total_paise':100001,'subtotal_paise':100001,'discount_paise':0,'cgst_paise':0,'sgst_paise':0,'igst_paise':0,'paid_paise':0,'due_paise':100001,'version':3,'supplier_snapshot':{'name':'Garagewala','address':'Test garage address','phone':'8965957978','footer':'Thank you'},'buyer_snapshot':{'name':'Fictional <img onerror=x>','mobile':'9000000000','address':'Test billing address'},'vehicle_snapshot':{'make':'Test','model':'Test car','registration':'MP09TEST'}}
        invoice_items=[{'description':'Oil service','hsn_sac':'','quantity':1,'unit_price_paise':100001,'base_paise':100001,'discount_paise':0,'tax_bps':0,'cgst_paise':0,'sgst_paise':0,'igst_paise':0,'total_paise':100001}]
        payments=[]
        def route_api(route):
            req=route.request;url=urlsplit(req.url);requests.append(url.path)
            headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Access-Control-Expose-Headers':'content-range'}
            def send(data,status=200,extra=None):route.fulfill(status=status,content_type='application/json',headers={**headers,**(extra or {})},body=json.dumps(data))
            if req.method=='OPTIONS':return send(None,204)
            if url.path=='/auth/v1/token':return send({'access_token':jwt(),'refresh_token':'fictional-refresh','expires_in':3600,'token_type':'bearer','user':{'id':uid,'email':'owner@example.test','aud':'authenticated','role':'authenticated'}})
            if url.path=='/auth/v1/user':return send({'id':uid,'email':'owner@example.test','aud':'authenticated','role':'authenticated'})
            if url.path=='/auth/v1/logout':return send(None,204)
            if url.path.endswith('/rpc/admin_access'):return send(state['owner'])
            if url.path.endswith('/rpc/admin_summary'):return send({'customers':len(customers),'new_bookings':0,'active_jobs':0,'collected_today':0,'collected_month':0,'outstanding':0,'today':'2026-10-31'})
            if url.path.endswith('/rpc/save_invoice'):
                writes.append((url.path,req.post_data_json));return send('55555555-5555-4555-8555-555555555555')
            if url.path.endswith('/rpc/record_payment'):
                data=req.post_data_json;writes.append((url.path,data))
                if state.get('payment_fail'):return send({'message':'Temporary network failure'},503)
                invoice['paid_paise']+=data['p_amount'];invoice['due_paise']-=data['p_amount'];payments.append({'amount_paise':data['p_amount'],'method':data['p_method'],'paid_on':data['p_date'],'voided_at':None})
                return send('66666666-6666-4666-8666-666666666666')
            table=url.path.rsplit('/',1)[-1]
            if req.method in ['POST','PATCH']:
                data=req.post_data_json;writes.append((table,data))
                if state['fail']:return send({'message':'Temporary network failure'},503)
                if table=='customers':
                    if req.method=='POST':customers.append({**customers[0],**data,'id':'99999999-9999-4999-8999-999999999999'})
                    return send([{'id':cid}] if req.method=='PATCH' else {'id':cid},201)
                if table=='vehicles':
                    if req.method=='POST':
                        record={**data,'id':'aaaaaaaa-aaaa-4aaa-8aaa-'+str(len(vehicles)).zfill(12),'version':1};vehicles.append(record);return send({'id':record['id']},201)
                    record=next(v for v in vehicles if v['id']==parse_qs(url.query)['id'][0][3:]);record.update(data);record['version']+=1;return send([{'id':record['id']}])
                if table=='bookings':
                    if req.method=='POST':
                        record={**data,'id':'bbbbbbbb-bbbb-4bbb-8bbb-'+str(len(bookings)).zfill(12),'reference':'GW-B000001','version':1,'job_id':None};bookings.append(record);return send({'id':record['id']},201)
                    record=next(b for b in bookings if b['id']==parse_qs(url.query)['id'][0][3:]);record.update(data);record['version']+=1;return send([{'id':record['id']}])
                if table=='garage_profile':
                    profile.update(data);profile['version']+=1;return send([{'id':True}])
                return send({'id':vid},201)
            data=customers if table in ['customers','admin_customers'] else vehicles if table=='vehicles' else [profile] if table=='garage_profile' else [invoice] if table=='admin_invoices' else invoice_items if table=='invoice_items' else payments if table in ['payments','admin_payments'] else bookings if table in ['bookings','admin_bookings'] else []
            if req.method=='GET' and 'id' in parse_qs(url.query):data=[r for r in data if str(r.get('id')).lower()==parse_qs(url.query)['id'][0][3:].lower()]
            single='application/vnd.pgrst.object+json' in req.headers.get('accept','')
            return send(data[0] if single and data else data,extra={'content-range':f'0-{max(0,len(data)-1)}/{len(data)}'})
        ctx.route('https://test.supabase.co/**',route_api)
        ctx.route('**/assets/js/backend-config.js*',lambda route:route.fulfill(content_type='text/javascript',body=config))
        def login():
            page=ctx.new_page();page.goto(base+'admin/index.html');page.get_by_label('Email address',exact=True).fill('owner@example.test');page.get_by_label('Password',exact=True).fill('fictional-password-only');page.get_by_role('button',name='Sign in →',exact=True).click();return page
        state['owner']=False;pg=login();expect(pg.get_by_text('This account does not have owner access.',exact=False)).to_be_visible();check(pg.locator('[data-nav]').count()==0,'Authenticated non-owner cannot open workspace');pg.close()
        state['owner']=True;pg=login();expect(pg.get_by_role('heading',name='Let’s get to work.')).to_be_visible();check(True,'Owner login opens overview with real-response metrics')
        pg.screenshot(path=str(OUT/'overview-desktop.png'),full_page=True)
        pg.get_by_role('button',name='Customers',exact=True).click();expect(pg.get_by_text('Fictional Customer',exact=True)).to_be_visible()
        check('9000000000' in pg.inner_text('main'),'Customer mobile visible only inside authenticated workspace')
        pg.get_by_role('button',name='+ Add customer',exact=True).click();pg.get_by_label('Customer name',exact=True).fill('<img src=x onerror=alert(1)>');pg.get_by_label('Mobile number',exact=True).fill('9000000001')
        state['fail']=True;pg.get_by_role('button',name='Save changes',exact=True).click();expect(pg.locator('#editor .form-error')).to_contain_text('server')
        check(pg.locator('#editor').is_visible() and pg.get_by_label('Mobile number',exact=True).input_value()=='9000000001','Failed save keeps entered values and does not report success')
        state['fail']=False;pg.get_by_role('button',name='Save changes',exact=True).click();expect(pg.locator('#editor')).not_to_be_visible();expect(pg.get_by_text('<img src=x onerror=alert(1)>',exact=True)).to_be_visible()
        check(writes[-1][1]['name']=='<img src=x onerror=alert(1)>','Enabled form submits actual values instead of empty disabled fields')
        check(pg.locator('main img[src=x]').count()==0,'Customer HTML renders as text without execution')
        vehicle_shots=Path('/workspace/website-review/vehicles-v2.1.0');vehicle_shots.mkdir(parents=True,exist_ok=True)
        def open_customer():
            pg.locator('tbody tr').filter(has_text='Fictional Customer').get_by_role('button',name='Open',exact=True).click()
            expect(pg.get_by_role('button',name='+ Add vehicle',exact=True)).to_be_visible()
        open_customer();pg.get_by_role('button',name='+ Add vehicle',exact=True).click()
        check(pg.locator('[data-vehicle-brand] option').count()>=72 and pg.get_by_label('Car model',exact=True).is_disabled(),'New vehicle offers the full brand dropdown and waits for a brand before models')
        pg.get_by_label('Search make or model',exact=True).fill('Maruti Swift');pg.get_by_label('Matching vehicles',exact=True).select_option(label='Maruti Suzuki · Swift')
        check(pg.get_by_label('Brand',exact=True).input_value()=='maruti' and pg.get_by_label('Car model',exact=True).input_value()=='Swift','Catalogue search fills the corresponding make and model')
        pg.get_by_label('Year (optional)',exact=True).select_option('2022');pg.get_by_label('Fuel',exact=True).select_option('cng');pg.get_by_label('Registration (optional)',exact=True).fill('mp09ab1234');pg.get_by_label('Vehicle notes',exact=True).fill('VXi, manual transmission')
        pg.locator('#editor').screenshot(path=str(vehicle_shots/'new-vehicle-desktop.png'))
        pg.get_by_role('button',name='Save changes',exact=True).click();expect(pg.locator('#editor')).not_to_be_visible()
        check(writes[-1][0]=='vehicles' and all(writes[-1][1][k]==v for k,v in {'make':'Maruti Suzuki','model':'Swift','year':2022,'fuel':'cng','registration':'MP09AB1234'}.items()),'Vehicle save sends readable make/model, numeric year, fuel and normalised registration')
        check(set(writes[-1][1])=={'customer_id','make','model','year','fuel','registration','notes'},'Search controls and catalogue IDs are excluded from database writes')
        open_customer();pg.locator('#editor .detail-list li').filter(has_text='Test Test car').get_by_role('button',name='Edit',exact=True).click()
        check(pg.get_by_label('Brand',exact=True).input_value()=='gw:saved' and pg.get_by_label('Car model',exact=True).input_value()=='gw:saved' and pg.get_by_label('Year (optional)',exact=True).input_value()=='2050','Saved unlisted vehicles and unusual supported years stay selectable')
        pg.get_by_label('Vehicle notes',exact=True).fill('Notes-only edit');pg.get_by_role('button',name='Save changes',exact=True).click();expect(pg.locator('#editor')).not_to_be_visible()
        check(all(writes[-1][1][k]==v for k,v in {'make':'Test','model':'Test car','year':2050,'fuel':'petrol'}.items()),'Editing notes preserves saved vehicle details outside the catalogue')
        open_customer();pg.get_by_role('button',name='+ Add vehicle',exact=True).click();pg.get_by_label('Search make or model',exact=True).fill('unknown-brand-1234')
        expect(pg.locator('[data-vehicle-search-status]')).to_contain_text('No matches')
        pg.get_by_label('Brand',exact=True).select_option('gw:custom');pg.get_by_label('Other brand name',exact=True).fill('Unlisted Motors');pg.get_by_label('Car model',exact=True).select_option('gw:custom');pg.get_by_label('Other model name',exact=True).fill('<img src=x onerror=alert(1)>');pg.get_by_label('Year (optional)',exact=True).select_option('gw:custom');pg.get_by_label('Other year',exact=True).fill('2035');pg.get_by_label('Fuel',exact=True).select_option('electric')
        pg.set_viewport_size({'width':390,'height':844});check(pg.evaluate('document.documentElement.scrollWidth<=innerWidth') and pg.locator('[data-vehicle-fields]').evaluate('e=>e.scrollWidth<=e.clientWidth'),'Vehicle dropdowns and manual fields fit mobile screens')
        pg.locator('#editor').screenshot(path=str(vehicle_shots/'new-vehicle-mobile.png'));pg.get_by_role('button',name='Save changes',exact=True).click();expect(pg.locator('#editor')).not_to_be_visible();pg.set_viewport_size({'width':1366,'height':900})
        check(writes[-1][1]['make']=='Unlisted Motors' and writes[-1][1]['year']==2035 and writes[-1][1]['fuel']=='electric','Manual brand, model and year entries support cars missing from the list')
        open_customer();pg.locator('#editor .detail-list li').filter(has_text='Unlisted Motors').get_by_role('button',name='Edit',exact=True).click()
        check(pg.locator('#editor img[src=x]').count()==0 and pg.get_by_label('Car model',exact=True).locator('option:checked').text_content()=='<img src=x onerror=alert(1)> (saved)','Unlisted saved names are escaped in dropdown options')
        pg.get_by_role('button',name='Cancel',exact=True).click()
        pg.get_by_role('button',name='Bookings',exact=True).click();pg.get_by_role('button',name='+ Add enquiry',exact=True).click();pg.get_by_label('Customer name',exact=True).fill('Test caller');pg.get_by_label('Mobile number',exact=True).fill('9000000002');pg.get_by_label('Brand',exact=True).select_option('hyundai');pg.get_by_label('Car model',exact=True).select_option('i20');pg.get_by_label('Year (optional)',exact=True).select_option('2016');pg.get_by_label('Fuel',exact=True).select_option('diesel');pg.get_by_label('Requested services',exact=False).fill('Brake service');pg.get_by_role('button',name='Save changes',exact=True).click();expect(pg.locator('#editor')).not_to_be_visible();check(writes[-1][1]['source']=='call' and writes[-1][1]['services']==['Brake service'],'Call enquiry records entered number and services')
        check(writes[-1][1]['make']=='Hyundai' and writes[-1][1]['model']=='i20' and writes[-1][1]['year']==2016 and writes[-1][1]['fuel']=='diesel','Manual enquiries use the same full vehicle dropdowns')
        pg.get_by_role('button',name='Open',exact=True).click();pg.get_by_role('button',name='Edit enquiry',exact=True).click();check(pg.get_by_label('Year (optional)',exact=True).input_value()=='2016' and pg.get_by_label('Fuel',exact=True).input_value()=='diesel','Editing an enquiry restores its saved year and fuel')
        pg.get_by_label('Brand',exact=True).select_option('toyota');check(pg.get_by_label('Car model',exact=True).input_value()=='','Changing make clears the previous make’s model')
        before=len(writes);pg.get_by_role('button',name='Save changes',exact=True).click();check(pg.locator('#editor').is_visible() and len(writes)==before,'A model must be selected again after changing make')
        pg.get_by_label('Car model',exact=True).select_option('Fortuner');pg.get_by_role('button',name='Save changes',exact=True).click();expect(pg.locator('#editor')).not_to_be_visible();check(writes[-1][1]['make']=='Toyota' and writes[-1][1]['model']=='Fortuner' and writes[-1][1]['year']==2016,'Enquiry edits save the selected make/model without losing the year')
        pg.get_by_role('button',name='Invoices',exact=True).click();pg.get_by_role('button',name='+ Draft invoice',exact=True).click();expect(pg.locator('select[name=customer_id] option')).to_have_count(3);pg.select_option('select[name=customer_id]',cid);pg.get_by_label('Item / labour description',exact=True).fill('Oil service');pg.locator('[data-item=price]').fill('1000.01');pg.locator('[data-item=quantity]').fill('1.125');expect(pg.locator('[data-total]')).to_contain_text('1,125.01');pg.get_by_role('button',name='Save draft',exact=True).click();expect(pg.locator('#editor')).not_to_be_visible();check(writes[-1][1]['p_items'][0]['unit_price_paise']==100001,'Invoice submits integer paise for server calculation')
        pg.get_by_role('button',name='Job cards',exact=True).click();pg.get_by_role('button',name='+ Create job card',exact=True).click();pg.select_option('select[name=customer_id]',cid);pg.get_by_role('button',name='+ Add task',exact=True).click();pg.get_by_label('Task description',exact=True).fill('Inspect front suspension');pg.get_by_role('button',name='Save changes',exact=True).click();expect(pg.locator('#editor')).not_to_be_visible();check(writes[-1][1]['tasks']==[{'description':'Inspect front suspension','done':False}],'Job card saves task checklist and pending approval')
        pg.get_by_role('button',name='Settings',exact=True).click();expect(pg.get_by_role('heading',name='Garage settings')).to_be_visible();check(pg.get_by_label('GSTIN · registered business only',exact=True).input_value()=='','No GST registration is invented')
        check(pg.get_by_label('Full legal billing address',exact=True).input_value()=='Test garage address','Opening Settings preserves existing private billing details')
        before=len(writes);pg.get_by_role('button',name='Use workshop address',exact=True).click();expect(pg.get_by_label('Full legal billing address',exact=True)).to_have_value('Shop No. 1, Sobhag Bagh, Pipliya Rau, Opp. Regional Park Road, Pawan Putra Nagar, Indore, Madhya Pradesh 452012');check(len(writes)==before and not pg.locator('input[name=billing_ready]').is_checked(),'Copying workshop address requests billing review and does not save automatically')
        pg.locator('input[name=billing_ready]').check();pg.get_by_role('button',name='Save settings',exact=True).click();expect(pg.locator('#toast')).to_contain_text('Invoice settings saved.');check(profile['address'].endswith('Madhya Pradesh 452012') and profile['billing_ready'],'Owner save updates the private company address for future invoices')
        pg.get_by_role('button',name='Invoices',exact=True).click();pg.get_by_role('button',name='Open',exact=True).click();expect(pg.get_by_text('Fictional <img onerror=x>',exact=True)).to_be_visible();pg.get_by_role('button',name='Print / Save PDF',exact=True).click();expect(pg.frame_locator('.print-frame').get_by_role('heading',name='Garagewala',exact=True)).to_be_visible();check(pg.frame_locator('.print-frame').locator('img').count()==0,'Invoice PDF view escapes customer details and stays inside private page');check('Test garage address' in pg.frame_locator('.print-frame').locator('body').inner_text(),'Already issued invoices retain their original supplier-address snapshot')
        pg.get_by_role('button',name='+ Record payment',exact=True).click();pg.get_by_label('Received amount (₹)',exact=True).fill('100.01');state['payment_fail']=True;pg.get_by_role('button',name='Record received payment',exact=True).click();expect(pg.locator('#editor .form-error')).to_contain_text('server');first_request=writes[-1][1]['p_request'];state['payment_fail']=False;pg.get_by_role('button',name='Record received payment',exact=True).click();expect(pg.locator('#editor')).not_to_be_visible();check(writes[-1][1]['p_request']==first_request and writes[-1][1]['p_amount']==10001,'Uncertain payment retry keeps its idempotency key and amount in paise')
        pg.get_by_role('button',name='Overview',exact=True).click();expect(pg.get_by_role('heading',name='Let’s get to work.')).to_be_visible()
        for width in [390,768,1366]:
            pg.set_viewport_size({'width':width,'height':844});check(pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Admin has no page overflow at '+str(width))
            if width==390:pg.screenshot(path=str(OUT/'overview-mobile.png'),full_page=True)
        storage=pg.evaluate('({local:Object.keys(localStorage),session:Object.keys(sessionStorage)})');check(not storage['local'] and not storage['session'],'No auth tokens or private customer data persist in browser storage')
        pg.reload();expect(pg.get_by_role('button',name='Sign in →',exact=True)).to_be_visible();check(pg.locator('[data-nav]').count()==0,'Reload ends memory-only owner session')
        pg.close();pg=login();expect(pg.get_by_role('heading',name='Let’s get to work.')).to_be_visible();pg.get_by_role('button',name='Sign out',exact=True).click();expect(pg.get_by_role('button',name='Sign in →',exact=True)).to_be_visible();check('Fictional Customer' not in pg.content(),'Sign out clears private interface')
        pg.close();pg=ctx.new_page();pg.goto(base+'admin/index.html#access_token='+jwt()+'&refresh_token=fictional-refresh&expires_in=3600&token_type=bearer&type=recovery');expect(pg.get_by_role('heading',name='Set a new password',exact=True)).to_be_visible();pg.get_by_label('New password',exact=True).fill('fictional-new-password-only');pg.get_by_label('Confirm password',exact=True).fill('fictional-new-password-only');pg.get_by_role('button',name='Save changes',exact=True).click();expect(pg.locator('#editor')).not_to_be_visible();check('access_token' not in pg.url,'Owner recovery opens reset form and removes auth tokens from the URL')
        check(not errors,'No browser script errors: '+repr(errors));pg.close()
        public_ctx=browser.new_context(viewport={'width':390,'height':844})
        public_ctx.route('**/assets/js/backend-config.js*',lambda route:route.fulfill(content_type='text/javascript',body=config.replace('bookingEnabled:false','bookingEnabled:true')))
        submissions=[]
        def intake(route):
            if route.request.method=='OPTIONS':return route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,OPTIONS'})
            submissions.append((route.request.headers,route.request.post_data_json));route.fulfill(status=503 if len(submissions)==1 else 200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body='{}' if len(submissions)==1 else '{"received":true}')
        public_ctx.route('https://test.supabase.co/functions/v1/submit-booking',intake)
        pg=public_ctx.new_page();pg.goto(base+'booking.html')
        next_step=lambda:pg.locator('[data-b-next]').click()
        pg.fill('#b-name','Test Website Booking');pg.fill('#b-mobile','9000000003');pg.select_option('#b-contact','Phone call');next_step()
        pg.select_option('#b-brand','maruti');pg.select_option('#b-model','Swift');pg.select_option('#b-year','2025');pg.select_option('#b-fuel','petrol');next_step()
        cb=pg.locator('input[name="b-svc"][value="GS-01"]');cb.evaluate('e=>e.closest("details").open=true');cb.check(force=True);next_step();pg.select_option('#b-pickup','no');next_step()
        expect(pg.locator('[data-b-result]')).to_contain_text("couldn't confirm");next_step();expect(pg.locator('[data-b-result]')).to_contain_text('Request received.')
        check(len(submissions)==2 and submissions[0][0]['x-idempotency-key']==submissions[1][0]['x-idempotency-key'],'Public booking retries preserve the request ID after uncertain receipt')
        check(submissions[0][0]['apikey']=='sb_publishable_fixture' and submissions[0][1]['contactMethod']=='Phone call','Enabled bridge sends public key and customer contact preference')
        public_ctx.close();browser.close()
    print(f'{checks} admin browser checks passed. Fixtures are fictional; no live backend was contacted.',flush=True)
finally:server.terminate();server.wait(timeout=10)
