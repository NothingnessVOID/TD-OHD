import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chromium',headless:true});
try {
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto(process.env.LAN_E2E_URL||'http://192.168.10.99:19961');
  const result=await page.evaluate(async()=>{
    const {sha256Hex}=await import('/src/lib/sha256.js');
    const {createAnnualLoader}=await import('/src/features/transit-timeline/annual-loader.js');
    const {ANNUAL_SIGNATURE}=await import('/src/features/transit-timeline/annual-signature.js');
    const {TRANSIT_POINTS}=await import('/src/features/transit-timeline/annual-events.js');
    const data={format:1,year:2026,start:Date.UTC(2026,0,1),end:Date.UTC(2027,0,1),pointOrder:TRANSIT_POINTS,initial:Object.fromEntries(TRANSIT_POINTS.map(p=>[p,[1,1]])),events:[],signature:ANNUAL_SIGNATURE};
    const bytes=new TextEncoder().encode(JSON.stringify(data));
    const sha256=await sha256Hex(bytes);
    const loader=body=>createAnnualLoader({fetcher:async url=>url.endsWith('manifest.json')?new Response(JSON.stringify({format:1,signature:ANNUAL_SIGNATURE,years:{2026:{path:'fictional-2026.json',bytes:bytes.length,sha256}}})):new Response(body)});
    const year=(await loader(bytes).load(2026)).year;
    const bad=bytes.slice();bad[0]^=1;
    let rejected='';try { await loader(bad).load(2026); } catch(error) { rejected=error.message; }
    return {secure:isSecureContext,subtle:!!globalThis.crypto?.subtle,abc:await sha256Hex(new TextEncoder().encode('abc')),year,rejected};
  });
  assert.equal(result.secure,false);assert.equal(result.subtle,false);
  assert.equal(result.abc,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(result.year,2026);assert.match(result.rejected,/Annual hash mismatch/);
  console.log('LAN HTTP fallback passed',JSON.stringify(result));
} finally { await browser.close(); }
