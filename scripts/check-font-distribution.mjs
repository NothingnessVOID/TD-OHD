import { readFileSync,readdirSync,existsSync } from 'node:fs';
import {resolve,relative,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]||'dist'),fonts=join(root,'fonts');
const sha=b=>createHash('sha256').update(b).digest('hex');
const lines=readFileSync(join(fonts,'SHA256SUMS'),'utf8').trim().split('\n');const listed=new Set(['SHA256SUMS']);
for(const line of lines){const m=/^([a-f0-9]{64})  (.+)$/.exec(line);if(!m||m[2].includes('..'))throw Error('Invalid font inventory');listed.add(m[2]);if(sha(readFileSync(join(fonts,m[2])))!==m[1])throw Error('Font distribution mismatch: '+m[2]);}
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const actual=walk(fonts).map(p=>relative(fonts,p).replaceAll('\\','/'));
if(actual.length!==listed.size||actual.some(p=>!listed.has(p)))throw Error('Unexpected/missing font distribution file');
for(const file of ['README.html','ipa-original/ipamjm.ttf','ipa-original/IPA_Font_License_Agreement_v1.0.txt','lxgw-neo-zhisong/v1.067/LICENSE.md','rebuild/build-chinese-fonts.py','rebuild/priority.txt'])if(!listed.has(file))throw Error('Missing restoration/build resource '+file);
for(const file of actual.filter(p=>p.endsWith('.html'))){const html=readFileSync(join(fonts,file),'utf8');for(const[,url]of html.matchAll(/href="([^"]+)"/g)){if(/^(https?:|#)/.test(url))continue;const target=resolve(join(fonts,file,'..'),url.split('#')[0]);if(!existsSync(target))throw Error('Broken font link: '+url);}}
for(const file of walk(root)){const p=relative(root,file).replaceAll('\\','/');if(/(^|\/)(?:\.git|\.env[^/]*|handoff|\.font-venv|browser-profile)(\/|$)|\.(?:sqlite|db|pem|key)$/i.test(p))throw Error('Private file in Pages bundle: '+p);}
console.log(`Font distribution: ${actual.length} exact resources, licenses/restoration and private-file boundary passed.`);
