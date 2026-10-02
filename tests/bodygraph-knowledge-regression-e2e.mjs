/** Phase 5 P0: compare the unchanged BodyGraph renderers and timing against Phase 4C. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const base=process.env.E2E_URL||'http://127.0.0.1:5196',baseline=process.env.BASELINE_E2E_URL||'http://127.0.0.1:5195';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true});
const results=[];
async function open(url,width) {
 const context=await browser.newContext({viewport:{width,height:900},locale:'en-GB',reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  localStorage.setItem('ohd-language','en');
  const Native=Date,at=Native.parse('2026-10-01T06:31:21Z');
  globalThis.Date=class extends Native {constructor(...args){super(...(args.length?args:[at]));}static now(){return at;}};
 });
 // External web fonts are blocked equally so geometry compares a deterministic font stack.
 await context.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route=>route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${url}/?d=2000-05-10&t=12%3A30&tz=8`,{waitUntil:'domcontentloaded'});
 await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});await page.evaluate(async()=>{await document.fonts.ready;return true;});
 return {context,page,errors};
}
const selectors=['.gate-detail-card','.gate-detail-body','.tl-detail-header','.tl-detail-heading','.tl-detail-statuses','.tl-detail-activations','.tl-detail-timing','.tl-timing-duration','.tl-timing-boundary','.tl-timing-source','.gate-lens-switch','.gate-detail-lines','.center-detail-head','.planet-detail-title'];
async function snapshot(page) {
 await page.locator('#gate-detail:not(.hidden) .gate-detail-card').waitFor();
 await page.waitForTimeout(300);
 return page.evaluate(selectors=>{
  const root=document.querySelector('#gate-detail'),body=root.querySelector('.gate-detail-body');
  const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  return {text:body.innerText,html:body.innerHTML,geometry:selectors.map(s=>({selector:s,nodes:[...root.querySelectorAll(s)].map(n=>({class:n.className,box:box(n)}))}))};
 },selectors);
}
function compare(old,current,label) {
 assert.equal(current.text,old.text,label+' visible content');assert.equal(current.html,old.html,label+' DOM/order/status/timing');
 for(let i=0;i<old.geometry.length;i++){
  const a=old.geometry[i],b=current.geometry[i];assert.equal(b.nodes.length,a.nodes.length,label+' '+a.selector);
  for(let j=0;j<a.nodes.length;j++){assert.equal(b.nodes[j].class,a.nodes[j].class);for(const key of ['x','y','width','height'])assert.ok(Math.abs(b.nodes[j].box[key]-a.nodes[j].box[key])<=1,`${label} ${a.selector} ${key}: ${b.nodes[j].box[key]} vs ${a.nodes[j].box[key]}`);}
 }
}
const invoke=(page,kind,id)=>page.evaluate(async({kind,id})=>{const view=await import('/src/views/chart.js');view[kind](id);},{kind,id});
try {
 for(const width of [1224,390]) {
  console.log(`Checking BodyGraph at ${width}`);
  const old=await open(baseline,width),current=await open(base,width);
  const both=async operation=>{await operation(old.page);await operation(current.page);};
  const check=async label=>{console.log(`Checking ${width}/${label}`);compare(await snapshot(old.page),await snapshot(current.page),`${width}/${label}`);results.push({width,scenario:label,domEqual:true,textEqual:true,geometryTolerance:1});};
  const close=()=>both(page=>page.keyboard.press('Escape'));
  for(const [label,kind,id]of [['birth-gate','showGateDetail',28],['birth-center','showCenterDetail','sacral']]){await both(p=>invoke(p,kind,id));await check(label);await close();}
  await both(p=>p.locator('#bodygraph-container .bg-planets-personality .bg-planet-row').first().click());await check('birth-planet');await close();
  await both(p=>invoke(p,'showGateDetail',23));
  for(const lens of ['hd','iching','gk','meridian']){await both(p=>p.locator(`#gate-detail [data-lens="${lens}"]`).click());await check('gate-lens-'+lens);}
  await close();
  // Real Transit SVG/card callbacks supply the current graph context.
  await both(async p=>{await p.goto(`${p===old.page?baseline:base}/?d=2000-05-10&t=12%3A30&tz=8&view=transits`,{waitUntil:'domcontentloaded'});await p.locator('#transit-stage .tl-planet[data-planet="sun"][data-gate]').waitFor({timeout:60000});});
  await both(p=>p.locator('#transit-bodygraph .bg-gate[data-gate="18"]').first().click());await check('transit-gate');
  await both(p=>p.locator('#gate-detail [data-channel]').first().click());await check('transit-channel');await close();
  await both(p=>p.locator('#transit-bodygraph .bg-center[data-center="root"]').click());await check('transit-center');await close();
  await both(async p=>{await p.goto(`${p===old.page?baseline:base}/?d=2000-05-10&t=12%3A30&tz=8&view=timeline`,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy')==='false',null,{timeout:120000});if(width<=640)await p.locator('#timeline-view [data-action="mobile-controls"]').click();await p.locator('#timeline-view [data-field="kind"]').selectOption('gate');if(width<=640)await p.locator('#timeline-view [data-action="mobile-controls"]').click();});
  await both(p=>p.locator('#timeline-view .tl-row[data-key^="gate:"] .tl-bar:not([data-source="natal"])').first().click());await check('timeline-gate-timing');
  await both(async p=>{
   const timing=p.locator('#gate-detail .tl-detail-timing');assert.equal(await timing.count(),1);assert.equal(await timing.locator('.tl-timing-duration').count(),1);assert.equal(await timing.locator('.tl-timing-boundary').count(),2);assert.equal(await timing.locator('.tl-timing-source').count(),1);
   assert.match(await timing.locator('.tl-timing-source').innerText(),/≈/);
   assert.deepEqual(await timing.locator('.tl-timing-values > div').evaluateAll(nodes=>nodes.map(n=>n.className)),['tl-timing-duration','tl-timing-boundary','tl-timing-boundary']);
   const labels=await timing.locator('.tl-timing-values dt').allInnerTexts();assert.match(labels[0],/Duration/);assert.match(labels[1],/Start/);assert.match(labels[2],/End/);
  });await close();
  // Full-range fixture exercises shell/renderer semantics independently of interval availability.
  await both(p=>p.evaluate(async()=>{
   const {showTransitDetail}=await import('/src/views/chart.js');
   showTransitDetail('gate',23,{transitGates:{},detailTiming:()=>({kind:'gate',id:23,label:'Activation timing',fullRange:true,source:'Transit',sourceTitle:'Fixture',estimateTitle:'Estimated',estimateLabel:'Estimated',durationTitle:'Duration',durationLabel:'Duration',durationValue:'Full range',fullRangeLabel:'Throughout the displayed range'})});
  }));await check('timeline-full-range-fixture');
  await both(async p=>{assert.equal(await p.locator('#gate-detail .tl-timing-full-range').count(),1);assert.equal(await p.locator('#gate-detail .tl-timing-boundary').count(),0);assert.equal(await p.locator('#gate-detail .tl-timing-range-note').count(),1);});await close();
  // Candidate-only direct owner transitions while old state/history/pin/timing exist.
  await current.page.evaluate(async()=>{
   const {showGateDetail}=await import('/src/views/chart.js');const {openKnowledgeDetail}=await import('/src/lib/knowledge/detail-controller.js');
   showGateDetail(28);showGateDetail(23);openKnowledgeDetail({objectType:'authority',objectId:'sacral'});
  });
  assert.equal(await current.page.locator('#gate-detail .gate-detail-back').count(),0);assert.equal(await current.page.locator('#gate-detail .tl-detail-timing').count(),0);
  assert.equal(await current.page.locator('#gate-detail .knowledge-detail').count(),1);
  await current.page.evaluate(async()=>(await import('/src/views/chart.js')).showGateDetail(28));
  assert.equal(await current.page.locator('#gate-detail .knowledge-detail').count(),0);assert.equal(await current.page.locator('#gate-detail .gate-detail-back').count(),0);
  assert.equal(await current.page.evaluate(async()=>(await import('/src/lib/knowledge/detail-controller.js')).getKnowledgeDetailState()),null);
  assert.equal(await current.page.locator('#gate-detail .tl-detail-timing').count(),0);
  await current.page.keyboard.press('Escape');
  // Explicitly exercise old context cleanup and pinned selection release.
  await current.page.evaluate(async()=>{
   window.phase5Pins=[];window.phase5Closed=0;
   const {showTransitDetail}=await import('/src/views/chart.js');
   const {openKnowledgeDetail}=await import('/src/lib/knowledge/detail-controller.js');
   showTransitDetail('gate',28,{api:{setPinned:selection=>window.phase5Pins.push(selection)},onDetailClose:()=>window.phase5Closed++});
   openKnowledgeDetail({objectType:'authority',objectId:'sacral'});
  });
  assert.deepEqual(await current.page.evaluate(()=>({pins:window.phase5Pins,closed:window.phase5Closed})),{pins:[{kind:'gate',id:28},null],closed:1});
  await current.page.keyboard.press('Escape');
  assert.deepEqual(old.errors,[]);assert.deepEqual(current.errors,[]);
  await old.context.close();await current.context.close();
 }
 if(process.env.BODYGRAPH_VALIDATION_OUTPUT)writeFileSync(process.env.BODYGRAPH_VALIDATION_OUTPUT,JSON.stringify({bodygraphComparisons:results,ownerTransitions:true,timelineTimingSemantics:true},null,2)+'\n');
 console.log(`PASS ${results.length} protected BodyGraph DOM/text/geometry comparisons; timing order/boundaries/estimate/full-range and controller transitions`);
}finally{await browser.close();}
