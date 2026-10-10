import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist'),prefix='/TD-OHD/',port=Number(process.env.PORT||19965);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.woff2':'font/woff2','.ttf':'font/ttf','.png':'image/png'};
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith(prefix)){res.writeHead(404);return res.end();}const file=resolve(root,decodeURIComponent(u.pathname.slice(prefix.length))||'index.html');if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);return res.end();}const target=(await stat(file)).isDirectory()?resolve(file,'index.html'):file;const bytes=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'public,max-age=3600'});res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Pages artifact at http://127.0.0.1:${port}${prefix}`));
