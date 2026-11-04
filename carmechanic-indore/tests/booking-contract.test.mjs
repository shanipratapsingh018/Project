import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {validateBooking,createHandler} from '../supabase/functions/submit-booking/handler.mjs';
const require=createRequire(import.meta.url), F=require('../public/assets/js/forms.js'), C=require('../public/assets/js/config.js');
const clock=new Date('2026-11-04T20:00:00Z'); // 5 November in the workshop timezone
const base={name:'Fictional Customer',mobile:'9000000000',model:'Swift',services:['Basic service'],date:'2026-11-05',partsGrade:'genuine',category:'hatchback'};
test('Booking intake preserves parts preference and rejects unknown grades/categories',()=>{
 const b=validateBooking(base,clock);assert.equal(b.partsGrade,'genuine');assert.equal(b.category,'hatchback');
 for(const partsGrade of ['fake','constructor','__proto__'])assert.throws(()=>validateBooking({...base,partsGrade},clock));
 assert.throws(()=>validateBooking({...base,category:'unknown'},clock));
});
test('Server dates agree with India time, including midnight and invalid calendars',()=>{
 assert.equal(validateBooking(base,clock).date,'2026-11-05');
 assert.equal(validateBooking({...base,date:''},clock).date,'');
 for(const date of ['2026-11-04','2000-01-01','2026-02-30','2026-13-01','invalid'])assert.throws(()=>validateBooking({...base,date},clock));
});
test('The browser service cap matches the server cap',()=>{
 const services=Array.from({length:F.maxServices},(_,i)=>'Service '+i);
 assert.equal(validateBooking({...base,services},clock).services.length,F.maxServices);
 assert.throws(()=>validateBooking({...base,services:[...services,'One too many']},clock));
});
test('Quantities and acknowledgements reject ambiguous values',()=>{
 for(const value of ['',0,-1,1.5,'1e0','NaN',11])assert(F.quantityError(value,10));
 for(const value of ['1',2,'10'])assert.equal(F.quantityError(value,10),'');
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 assert(F.receipt({received:true,requestId:id},id));
 assert(F.receipt({received:true},id)); // existing positive acknowledgements remain compatible
 for(const body of [null,{},[],{received:false},{received:'true'},{received:true,requestId:'wrong'}])assert(!F.receipt(body,id));
});
test('Legacy Before-2005 drafts cannot become an invented actual year',()=>{
 assert.equal(F.draft(C,{year:'2004'}).year,undefined);
 assert.equal(F.draft(C,{year:'2004',yearExact:true}).year,'2004');
 assert.equal(F.draft(C,{year:'1998',yearExact:true}).year,'1998');
});
test('Handler rejects a past date before fake storage and echoes a genuine receipt',async()=>{
 let stored;
 const handler=createHandler({origins:['https://fixture.test'],now:()=>clock,hash:async()=> 'a'.repeat(64),save:async(args)=>{stored=args;return {error:null}}});
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const request=p=>new Request('https://fixture.test/functions/v1/submit-booking',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json','x-idempotency-key':id},body:JSON.stringify(p)});
 assert.equal((await handler(request({...base,date:'2026-11-04'}))).status,400);assert.equal(stored,undefined);
 const response=await handler(request(base));assert.equal(response.status,200);assert.deepEqual(await response.json(),{received:true,requestId:id});assert.equal(stored.p_data.partsGrade,'genuine');
});
