// Zero-dependency static server; serves public/ only.
import http from 'node:http';
import {readFile, realpath, stat} from 'node:fs/promises';
import {dirname, extname, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
export function createServer(root=ROOT) {
 root=resolve(root);
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Cache-Control','no-cache');
  const send=(status,body,type='text/plain; charset=utf-8')=>{
   res.writeHead(status,{'Content-Type':type,'Content-Length':Buffer.byteLength(body)});
   res.end(req.method==='HEAD'?undefined:body);
  };
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(405,'Method not allowed');}
  let pathname;
  try {pathname=decodeURIComponent(req.url.split('?')[0]);}catch{return send(400,'Invalid URL');}
  if(!pathname.startsWith('/') || /[\\\0]/.test(pathname) || pathname.split('/').some(p=>p.startsWith('.'))) return send(403,'Forbidden');
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep))return send(403,'Forbidden');
  try {
   const actual=await realpath(file);
   if(!actual.startsWith(root+sep)||!(await stat(actual)).isFile())return send(403,'Forbidden');
   return send(200,await readFile(actual),MIME[extname(actual).toLowerCase()]||'application/octet-stream');
  }catch(error){
   if(!['ENOENT','ENOTDIR'].includes(error.code))return send(500,'Unable to read file');
   try {return send(404,(await readFile(resolve(root,'404.html'),'utf8')).replace('<head>','<head><base href="/">'),MIME['.html']);}
   catch{return send(404,'Not found');}
  }
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const port=Number(process.env.PORT||8080),host=process.env.HOST||'127.0.0.1';
 if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid PORT');
 const server=createServer();
 server.on('error',e=>{console.error('Server could not start: '+e.message);process.exitCode=1;});
 server.listen(port,host,()=>console.log(`CarMechanic website running on ${host}:${server.address().port}; public/ only. Ctrl+C to stop.`));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close());
}
