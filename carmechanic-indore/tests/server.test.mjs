import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createServer} from '../tools/serve.mjs';
test('Static server: pages, HEAD, nested 404, private paths and malformed URLs',async()=>{
 const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  const home=await fetch(base+'/'); assert.equal(home.status,200);assert.match(await home.text(),/Book Your Car Service/);
  assert.equal(home.headers.get('x-content-type-options'),'nosniff');
  const head=await fetch(base+'/assets/js/app.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.match(head.headers.get('content-type'),/javascript/);
  const missing=await fetch(base+'/unknown/deep/page');assert.equal(missing.status,404);assert.match(await missing.text(),/<base href="\/">/);
  for(const path of ['/.git/config','/%2e%2e%2fREADME.md','/%5c..%5cREADME.md']){
   const status=await new Promise((resolve,reject)=>http.get(base+path,r=>{r.resume();resolve(r.statusCode);}).on('error',reject));assert.equal(status,403,path);
  }
  assert.equal((await fetch(base+'/%ZZ')).status,400);
  assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
