const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../public/assets/js/forms.js');
const C=require('../public/assets/js/config.js');
const P=require('../public/assets/js/pricing.js');
test('Booking dates use the garage timezone across the UTC date boundary',()=>{
 assert.equal(F.today('Asia/Kolkata',new Date('2026-10-30T19:00:00Z')),'2026-10-31');
 assert.equal(F.today('Asia/Kolkata',new Date('2026-10-30T18:00:00Z')),'2026-10-30');
});
test('Optional dates reject past and invalid calendar dates',()=>{
 assert.equal(F.dateError('','2026-10-30'),'');assert.equal(F.dateError('2026-10-30','2026-10-30'),'');
 assert(F.dateError('2026-10-29','2026-10-30'));assert(F.dateError('2026-02-30','2026-01-01'));assert(F.dateError('','2026-10-30',true));
});
test('PIN validation rejects leading zeros and malformed input',()=>{
 assert(F.validPin('452010'));for(const pin of ['052010','12345','45201a','4520100'])assert(!F.validPin(pin));
});
test('Corrupt session handoffs cannot inject selectors or break booking',()=>{
 for(const value of [null,[],'text',1])assert.deepEqual(F.draft(C,value),{});
 const d=F.draft(C,{services:['GS-01','GS-01','__proto__','bad"selector',null,'BD-01'],qty:{'BD-01':9999},lights:'bad',name:{}});
 assert.deepEqual(d.services,['GS-01','BD-01']);assert.equal(d.qty['BD-01'],C.services.find(s=>s.id==='BD-01').qty.max);assert.deepEqual(d.lights,[]);assert.equal(d.name,undefined);
});
test('Duplicate and invalid service IDs never inflate an estimate',()=>{
 const options={category:'hatchback',fuel:'petrol',pickup:'none'};
 const one=P.estimate(C,{...options,services:[{id:'GS-01'}]});
 const dupe=P.estimate(C,{...options,services:[null,{id:'__proto__'},{id:'GS-01'},{id:'GS-01'}]});
 assert.deepEqual(dupe.total,one.total);assert.equal(dupe.lines.length,1);
});
