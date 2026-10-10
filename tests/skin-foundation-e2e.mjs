/** Focused Foundation parity + migration + relationship semantics; no Release sweep. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { SKIN_TOKENS, CENTER_PALETTE_TOKENS } from '../src/lib/skin-registry.js';
const base=process.env.E2E_URL||'http://127.0.0.1:5212';
const baseline=process.env.BASELINE_E2E_URL||'http://127.0.0.1:5213';
const output=process.env.SKIN_EVIDENCE_DIR||'/tmp/td-ohd-skin-foundation-browser';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true});
const results=[],errors=[];
const birth='/?d=2000-05-10&t=12%3A30&tz=8';
const call=(page,method,value)=>page.evaluate(async({method,value})=>(await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/appearance.js')?.name || '/src/lib/appearance.js'))[method](value),{method,value});
const tokens=[...SKIN_TOKENS,...CENTER_PALETTE_TOKENS,'--font','--font-serif','--hd-gate-number-size'];
async function open(url,width,theme) {
 const context=await browser.newContext({viewport:{width,height:900},locale:'en-GB',reducedMotion:'reduce',colorScheme:theme});
 await context.addInitScript(theme=>{localStorage.setItem('ohd-language','zh-CN');localStorage.setItem('bodygraph-theme',theme);},theme);
 await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+birth);await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
 return{context,page};
}
async function snapshot(page) {
 return page.evaluate(tokens=>{
  const s=getComputedStyle(document.documentElement);
  const selectors=['body','.header','.bodygraph-container','#foundation-panel','.foundation-item','.bg-planet-row'];
  return{tokens:Object.fromEntries(tokens.map(k=>[k,s.getPropertyValue(k).trim()])),elements:Object.fromEntries(selectors.map(sel=>[sel,[...document.querySelectorAll(sel)].map(n=>{const r=n.getBoundingClientRect(),c=getComputedStyle(n);return{x:r.x,y:r.y,w:r.width,h:r.height,color:c.color,background:c.backgroundColor,border:c.borderColor,shadow:c.boxShadow,font:c.font};})])),svg:document.querySelector('#bodygraph-container svg').outerHTML};
 },tokens);
}
function compare(before,after,label) {
 // Added Relationship semantics have explicit parity assertions below; every prior token must match.
 for(const[k,v]of Object.entries(before.tokens))if(v)assert.equal(after.tokens[k],v,label+' '+k);
 assert.deepEqual(after.elements,before.elements,label+' colors, typography, shadows and geometry');
 assert.equal(after.svg,before.svg,label+' SVG palette, gradients, glyphs and geometry');
}
async function relationship(page) {
 await page.evaluate(async()=>{const{savePerson}=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/people.js')?.name || '/src/lib/people.js');savePerson({name:'Foundation Fixture',birthDate:'1985-03-20',birthTime:'08:00',timezone:0,location:{name:'Fixture UTC',lat:51.5,lon:0}});});
 if (!(await page.locator('.nav-link[data-view="connection"]').isVisible())) await page.locator('.mobile-menu-toggle').click();
 await page.locator('.nav-link[data-view="connection"]').click();
 await page.locator('#conn-person').selectOption({label:'Foundation Fixture'});
 await page.locator('#conn-calculate').click();
 await page.locator('#connection-content .composite-graph .bodygraph-svg').waitFor({timeout:60000});
 return page.evaluate(()=>({text:document.querySelector('#connection-content').innerText,svg:document.querySelector('#connection-content .composite-graph svg').outerHTML,colors:[...document.querySelectorAll('#connection-content .conn-mechanic-marker')].map(n=>getComputedStyle(n).backgroundColor),legend:getComputedStyle(document.querySelector('#connection-content .lg-stripe')).backgroundImage}));
}
try {
 for(const width of [1224,390])for(const mode of ['light','dark']) {
  const old=await open(baseline,width,mode),current=await open(base,width,mode);
  try{
   for(const palette of ['classic','chakra']) {
    await old.page.evaluate(async palette=>{const a=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/appearance.js')?.name || '/src/lib/appearance.js');(a.setCenterPalette || a.setHumanDesignSkin)(palette);},palette);await call(current.page,'setCenterPalette',palette);
    compare(await snapshot(old.page),await snapshot(current.page),`${width}/${mode}/${palette}`);
    await current.page.screenshot({path:`${output}/${width}-${mode}-${palette}.png`});
    results.push({width,mode,palette,bodygraphAndUiEqual:true});
   }
   // Real relationship UI and calculation. No network place search or account mutation.
   const before=await relationship(old.page),after=await relationship(current.page);
   assert.deepEqual(after,before,`${width}/${mode} relationship parity`);
   const colorsBefore=after.colors;
   await current.page.addStyleTag({content:':root { --hd-circuit-integration: #ee00ff !important; --hd-circuit-collective: #ee00ff !important; --text-tertiary: #ee00ff !important; }'});
   const colorsAfter=await current.page.locator('#connection-content .conn-mechanic-marker').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).backgroundColor));
   assert.deepEqual(colorsAfter,colorsBefore,'relationship state colors do not follow circuit/weak text changes');
   await current.page.addStyleTag({content:':root { --hd-connection-bridged: #123456 !important; --hd-connection-both: #123456 !important; --hd-connection-a: #123456 !important; --hd-connection-b: #123456 !important; }'});
   assert.ok((await current.page.locator('#connection-content .conn-mechanic-marker').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).backgroundColor))).every(c=>c==='rgb(18, 52, 86)'));
   const previousFill=await current.page.locator('.composite-graph .bg-gate-path').evaluateAll(ns=>ns.map(n=>n.getAttribute('fill')));
   await current.page.addStyleTag({content:':root { --hd-connection-a: #1234ee !important; --hd-connection-b: #ee3412 !important; }'});
   await current.page.evaluate(async()=>(await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/views/connection.js')?.name || '/src/views/connection.js')).rerenderConnectionGraphs());
   const nextFill=await current.page.locator('.composite-graph .bg-gate-path').evaluateAll(ns=>ns.map(n=>n.getAttribute('fill')));
   assert.notDeepEqual(nextFill,previousFill,'Relationship repaint follows source tokens');
   assert.ok(nextFill.includes('#1234ee')&&nextFill.includes('#ee3412'));
   results.push({width,mode,relationshipEqual:true,relationshipDecoupled:true});
  }finally{await old.context.close();await current.context.close();}
 }
 // Migration against actual reload, settings dialog, computed values and an opposing system mode.
 const context=await browser.newContext({viewport:{width:1224,height:900},colorScheme:'dark'});
 await context.addInitScript(()=>{
  if(!localStorage.getItem('migration-seeded')){
   localStorage.setItem('migration-seeded','yes');localStorage.setItem('bodygraph-theme','light');
   localStorage.setItem('td-ohd-appearance-v1',JSON.stringify({version:2,preset:'chakra',globalOverrides:{design:'#123456',accent:'#654321',gateNumberSize:18}}));
  }
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+birth);await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
 assert.equal(await page.locator('html').getAttribute('data-skin'),'default-light');
 const legacy=await page.evaluate(()=>localStorage.getItem('td-ohd-appearance-v1'));
 await call(page,'setSkin','default-dark');assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--hd-design').trim()),'#123456');
 await page.evaluate(async()=>{const a=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/appearance.js')?.name || '/src/lib/appearance.js');a.setCustomOverride('design','#abcdef');});
 await call(page,'setSkin','default-light');assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--hd-design').trim()),'#123456');
 await call(page,'restoreCurrentSkin');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--hd-design').trim()),'#B84D43');
 await call(page,'setSkin','default-dark');await page.reload();await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');assert.equal(await page.locator('html').getAttribute('data-center-palette'),'chakra');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--hd-design').trim()),'#abcdef');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--hd-gate-number-size').trim()),'18px');
 assert.equal(await page.evaluate(()=>localStorage.getItem('td-ohd-appearance-v1')),legacy,'legacy storage remains byte-for-byte intact');
 results.push({migrationReload:true,oldStoragePreserved:true,perSkinRestore:true});await context.close();
 assert.deepEqual(errors,[],'no page errors');
 writeFileSync(`${output}/results.json`,JSON.stringify({results,errors},null,2));
 console.log(`Skin Foundation: ${results.length} focused parity/migration/relationship scenarios PASS; screenshots at ${output}`);
}finally{await browser.close();}
