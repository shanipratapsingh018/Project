import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('Preview and production builds generate honest SEO URLs and remove disabled pages',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'cmi-build-'));
 try {
  for(const dir of ['public','tools'])await cp(resolve(dir),join(temp,dir),{recursive:true});
  const build=(site)=>{const r=spawnSync(process.execPath,['tools/build.mjs'],{cwd:temp,env:{...process.env,SITE_URL:site},encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw new Error(r.stderr||'Build failed');return r.stdout;};
  build('https://garage.test');
  assert.match(await readFile(join(temp,'public/index.html'),'utf8'),/rel="canonical" href="https:\/\/garage.test\/"/);
  assert.match(await readFile(join(temp,'public/sitemap.xml'),'utf8'),/<loc>https:\/\/garage.test\/booking.html<\/loc>/);
  assert.match(await readFile(join(temp,'public/robots.txt'),'utf8'),/Sitemap: https:\/\/garage.test\/sitemap.xml/);
  assert(!/name="robots" content="noindex/.test(await readFile(join(temp,'public/index.html'),'utf8')));
  const cfg=join(temp,'public/assets/js/config.js');
  await writeFile(cfg,(await readFile(cfg,'utf8')).replace('accidentRepair: true','accidentRepair: false'));
  build('https://www.example.com');
  assert.match(await readFile(join(temp,'public/index.html'),'utf8'),/name="robots" content="noindex,follow"/);
  assert(!/rel="canonical"/.test(await readFile(join(temp,'public/index.html'),'utf8')));
  assert.match(await readFile(join(temp,'public/robots.txt'),'utf8'),/Disallow: \//);
  await assert.rejects(access(join(temp,'public/sitemap.xml')));
  await assert.rejects(access(join(temp,'public/accident-repair-indore.html')));
  assert.throws(()=>build('http://garage.test'));
 }finally{await rm(temp,{recursive:true,force:true});}
});
