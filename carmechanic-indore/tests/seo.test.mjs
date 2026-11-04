import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createSeo,jsonLd} from '../tools/seo.mjs';
const require=createRequire(import.meta.url), C=require('../public/assets/js/config.js');
const root=new URL('../public/',import.meta.url), domain=C.business.siteUrl;
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>');
const meta=(html,name)=>{const m=html.match(new RegExp('<meta (?:name|property)="'+name+'" content="([^"]*)"'));return m?decode(m[1]):null};
const pages=(await readdir(root)).filter(f=>f.endsWith('.html'));
test('Every indexable page has distinct branded metadata and a canonical HTTPS URL',async()=>{
 const titles=new Set(),descriptions=new Set();
 for(const file of pages){
  const html=await readFile(new URL(file,root),'utf8'), title=decode(html.match(/<title>(.*?)<\/title>/s)[1]),desc=meta(html,'description');
  assert(title.includes(C.business.name),file);assert(desc,file);assert(!titles.has(title),file);assert(!descriptions.has(desc),file);titles.add(title);descriptions.add(desc);
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,file);
  if(file==='404.html'){assert.match(meta(html,'robots'),/noindex/);assert(!html.includes('rel="canonical"'));continue;}
  const canonical=html.match(/rel="canonical" href="([^"]+)"/)[1];assert.equal(canonical,domain+'/'+(file==='index.html'?'':file));
  assert.match(meta(html,'robots'),/^index,follow,max-image-preview:large/);
  if(file.endsWith('-indore.html')){assert(title.includes('Indore'));assert(desc.length>=90 && desc.length<=165,file);}
 }
});
test('Sharing previews point to the bundled brand image with accurate dimensions',async()=>{
 for(const file of pages.filter(f=>f!=='404.html')){
  const html=await readFile(new URL(file,root),'utf8');assert.equal(meta(html,'og:image'),domain+'/assets/img/car-repair-wala-logo.png',file);
  assert.equal(meta(html,'og:image:width'),'1254');assert.equal(meta(html,'og:image:height'),'1254');assert.equal(meta(html,'og:image:type'),'image/png');
  assert.equal(meta(html,'twitter:image'),meta(html,'og:image'));assert.equal(meta(html,'twitter:title'),meta(html,'og:title'));assert(meta(html,'og:image:alt'));
 }
 const bytes=await readFile(new URL('assets/img/car-repair-wala-logo.png',root));assert.equal(bytes.readUInt32BE(16),1254);assert.equal(bytes.readUInt32BE(20),1254);
});
test('Business, website, page and service entities are connected and factual',async()=>{
 for(const file of pages.filter(f=>f!=='404.html')){
  const html=await readFile(new URL(file,root),'utf8');const schemas=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
  const business=schemas.find(x=>x['@type']==='AutoRepair'), page=schemas.find(x=>['WebPage','CollectionPage','ContactPage','AboutPage'].includes(x['@type'])),website=schemas.find(x=>x['@type']==='WebSite');
  assert.equal(business['@id'],domain+'/#business');assert.equal(business.telephone,C.business.phoneE164);assert.equal(business.address.postalCode,'452012');assert.equal(business.address.streetAddress,'17, AB Rd, Choithram Mandi');
  assert.deepEqual(business.openingHours,['Mo-Su 07:00-23:30']);assert.equal(business.openingHoursSpecification[0].dayOfWeek.length,7);
  assert(!business.geo,'No unverified coordinates');assert(!html.includes('aggregateRating'),'No invented ratings');assert.equal(business.sameAs[0],C.business.googleBusinessProfileUrl);
  assert.equal(page.about['@id'],business['@id']);assert.equal(page.isPartOf['@id'],website['@id']);assert.equal(website.publisher['@id'],business['@id']);assert.equal(business.hasOfferCatalog.itemListElement.length,9);
  if(file.endsWith('-indore.html')){const service=schemas.find(x=>x['@type']==='Service');assert.equal(service.provider['@id'],business['@id']);assert.equal(page.mainEntity['@id'],service['@id']);}
  if(file!=='index.html'){const crumbs=schemas.find(x=>x['@type']==='BreadcrumbList');assert.equal(crumbs.itemListElement[0].item,domain+'/');assert.equal(crumbs.itemListElement.at(-1).item,page.url);assert.equal(page.breadcrumb['@id'],crumbs['@id']);}
 }
});
test('Sitemap includes all and only indexable public pages; admin stays noindex',async()=>{
 const xml=await readFile(new URL('sitemap.xml',root),'utf8');const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.equal(urls.length,pages.length-1);assert.equal(new Set(urls).size,urls.length);
 for(const file of pages.filter(f=>f!=='404.html'))assert(urls.includes(domain+'/'+(file==='index.html'?'':file)),file);
 const admin=await readFile(new URL('admin/index.html',root),'utf8');assert.match(admin,/name="robots" content="noindex,nofollow,noarchive"/);
 const robots=await readFile(new URL('robots.txt',root),'utf8');assert(robots.includes('Disallow: /admin/'));assert(robots.includes('Sitemap: '+domain+'/sitemap.xml'));
});
test('Each service page links to relevant existing services and names its city',async()=>{
 for(const file of pages.filter(f=>f.endsWith('-indore.html'))){
  const html=await readFile(new URL(file,root),'utf8');assert.match(html,/<h1>[^<]*Indore<\/h1>/);
  const list=html.match(/<ul data-related-services>(.*?)<\/ul>/s)[1];const links=[...list.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);assert.equal(links.length,2);assert(!links.includes(file));for(const target of links)assert(pages.includes(target),target);
 }
});
test('Confirmed pickup areas are available in the initial HTML without JavaScript',async()=>{
 const areas=require('../public/assets/js/service-areas.js');
 for(const file of ['index.html','pickup-drop.html']){
  const html=await readFile(new URL(file,root),'utf8');const list=html.match(/<ul class="area-list" data-area-list>(.*?)<\/ul>/s)[1];
  for(const pin of areas.coveredPins)assert(list.includes(pin),file+' '+pin);
  for(const pin of areas.pendingPins)assert(!list.includes(pin),file+' unconfirmed '+pin);
 }
});
test('Preview builds omit public entities and social URLs; JSON-LD cannot close its script',()=>{
 const args={file:'index.html',title:'Title',description:'Description',business:C.business,siteUrl:''};const preview=createSeo(args);assert.equal(preview.canonical,'');assert.equal(preview.image,null);assert.deepEqual(preview.schemas,[]);assert.match(preview.robots,/noindex/);
 const value={name:'</script><script>alert(1)</script>'};const encoded=jsonLd(value);assert(!encoded.includes('<'));assert.deepEqual(JSON.parse(encoded),value);
});
