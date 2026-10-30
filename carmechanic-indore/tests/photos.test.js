const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../public');
const manifest=require('../tools/photos.json');
const files=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
test('Every static image, script, stylesheet and font resolves locally',()=>{
 for(const file of files){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const m of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)(?:\?[^"#]*)?"/g))assert(fs.existsSync(path.join(root,m[1])),`${file}: missing ${m[1]}`);
  for(const m of html.matchAll(/srcset="([^"]+)"/g))for(const item of m[1].split(',')){
   const src=item.trim().split(/\s+/)[0];if(src.startsWith('assets/'))assert(fs.existsSync(path.join(root,src)),`${file}: ${src}`);
  }
  assert(!/<(?:img|script|link)[^>]+(?:src|href)="https?:/.test(html),`${file}: external asset dependency`);
 }
 for(const css of ['fonts.css','style.css'])for(const m of fs.readFileSync(path.join(root,'assets/css',css),'utf8').matchAll(/url\("([^"#]+)"\)/g))assert(fs.existsSync(path.resolve(root,'assets/css',m[1])));
});
test('Every photo slot is used; illustrations are clearly labelled',()=>{
 const html=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
 for(const photo of manifest.photos){assert(html.includes(`data-photo-id="${photo.id}"`),photo.id);assert(photo.own||(photo.photographer&&photo.profile.startsWith('https://unsplash.com/@')),photo.id);}
 assert(html.includes('Illustrative example — not our workshop or a customer vehicle.'));
});
test('Bundled fonts include their open licences',()=>{
 for(const font of ['barlow','barlow-condensed','ibm-plex-mono'])assert(fs.readFileSync(path.join(root,`assets/fonts/${font}-LICENSE.txt`),'utf8').includes('SIL OPEN FONT LICENSE'));
});
