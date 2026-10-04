/** Inspect actual production output; mentions inside licensing notices are not runtime code. */
import { readFileSync,readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
const all=files(path.join(root,'dist'));
const forbidden=/jovian|swiss176|de406|native_backend|\.py$|\.dylib$|\.so$/i;
for(const p of all){const relative=path.relative(path.join(root,'dist'),p);if(forbidden.test(relative))throw new Error('Unexpected historical/runtime artifact '+relative);if(/\.(js|html)$/.test(p)&&/jovian-engine|native_backend|jovian-compatible|createNativeEngineProviders|swiss176/i.test(readFileSync(p,'utf8')))throw new Error('Historical engine in browser code '+relative);}
const maps=files(process.env.INTEGRATION_SOURCEMAPS||'/tmp/td-integration-sourcemap').filter(p=>p.endsWith('.map'));
const modules=maps.flatMap(p=>JSON.parse(readFileSync(p)).sources).map(s=>s.includes('/src/')?'src/'+s.split('/src/')[1]:s.includes('/node_modules/')?'node_modules/'+s.split('/node_modules/')[1]:s);
if(modules.some(s=>/src\/lib\/engine\/|jovian|birth-engine-providers|shared-mechanics-client|native_backend/i.test(s)))throw new Error('Local provider unexpectedly in static module graph');
const manifest=JSON.parse(readFileSync(path.join(root,'engine-wasm/ephemeris-manifest.json')));
for(const [p,h] of Object.entries(manifest.files)){const actual=createHash('sha256').update(readFileSync(path.join(root,'dist/engine/ephe',p))).digest('hex');if(actual!==h)throw new Error('Modern data asset differs '+p);}
const entry=readFileSync(path.join(root,'src/lib/chart-engine/index.js'),'utf8');if(!entry.includes('export const chartEngine = sharpProvider;'))throw new Error('Production provider changed');
console.log(JSON.stringify({passed:true,productionFilesInspected:all.length,browserModuleSources:modules.length,modernOnly:true,historicalRuntimeArtifacts:0,modernDataHashesUnchanged:true,productionProvider:'sharpProvider'},null,2));
