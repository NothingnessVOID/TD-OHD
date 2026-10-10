import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sha256Hex } from '../src/lib/sha256.js';
import { createAnnualLoader } from '../src/features/transit-timeline/annual-loader.js';
import { ANNUAL_SIGNATURE } from '../src/features/transit-timeline/annual-signature.js';
import { TRANSIT_POINTS } from '../src/features/transit-timeline/annual-events.js';
const vectors = [['','e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],['abc','ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad']];
const original = globalThis.crypto;
async function withoutSubtle(run) {
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{}});
  try { await run(); } finally { Object.defineProperty(globalThis,'crypto',{configurable:true,value:original}); }
}
test('known vectors and offset views agree in native and fallback paths', async()=>{
  for (const [text, expected] of vectors) {
    const bytes = new TextEncoder().encode(text);
    assert.equal(await sha256Hex(bytes.buffer),expected);
    await withoutSubtle(async()=>assert.equal(await sha256Hex(bytes),expected));
  }
  const padded = new Uint8Array([9,97,98,99,8]);
  for (const view of [padded.subarray(1,4),new DataView(padded.buffer,1,3)]) {
    assert.equal(await sha256Hex(view),vectors[1][1]);
    await withoutSubtle(async()=>assert.equal(await sha256Hex(view),vectors[1][1]));
  }
  for (const invalid of [null,'abc',[97,98,99],{}]) await assert.rejects(sha256Hex(invalid),TypeError);
});
test('WebCrypto is preferred; its errors are not silently bypassed',async()=>{
  let called=false;
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{digest:async()=>{called=true;throw new Error('native failure');}}}});
  try { await assert.rejects(sha256Hex(new Uint8Array()),/native failure/);assert.equal(called,true); }
  finally { Object.defineProperty(globalThis,'crypto',{configurable:true,value:original}); }
});
test('annual loader without subtle accepts valid bytes but rejects tampering and invalid structure',async()=>{
  const data={format:1,year:2026,start:Date.UTC(2026,0,1),end:Date.UTC(2027,0,1),pointOrder:TRANSIT_POINTS,initial:Object.fromEntries(TRANSIT_POINTS.map(point=>[point,[1,1]])),events:[],signature:ANNUAL_SIGNATURE};
  const bytes=new TextEncoder().encode(JSON.stringify(data));
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const loader=(body,digest=hash(bytes))=>createAnnualLoader({fetcher:async url=>url.endsWith('manifest.json')?new Response(JSON.stringify({format:1,signature:ANNUAL_SIGNATURE,years:{2026:{path:'2026.json',bytes:body.byteLength,sha256:digest}}})):new Response(body)});
  await withoutSubtle(async()=>{
    assert.equal((await loader(bytes).load(2026)).year,2026);
    const tampered=bytes.slice();tampered[0]^=1;
    await assert.rejects(loader(tampered).load(2026),/hash mismatch/);
    const broken=new TextEncoder().encode(JSON.stringify({...data,initial:{}}));
    await assert.rejects(loader(broken,hash(broken)).load(2026));
    const badSignature=new TextEncoder().encode(JSON.stringify({...data,signature:'invalid'}));
    await assert.rejects(loader(badSignature,hash(badSignature)).load(2026),/signature\/year mismatch/);
  });
});
