/** Narrow real-page comparison of Delve Azure and unchanged Deep Think. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const base=(process.env.E2E_URL||'http://127.0.0.1:5212').replace(/\/$/,'');
const evidence=process.env.SKIN_EVIDENCE_DIR||'/tmp/td-ohd-delve-azure';
mkdirSync(evidence,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1224,height:900},reducedMotion:'reduce'});
  await page.clock.setFixedTime(new Date('2026-03-15T04:00:00Z'));
  await page.addInitScript(()=>localStorage.setItem('ohd-language','zh-CN'));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?d=2000-05-10&t=12%3A30&tz=8');
  await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
  await page.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
  const navigate=async view=>page.locator(`.nav-link[data-view="${view}"]`).click();
  const expected={delve:{accent:'#2E75D4',transit:'#2E75D4',natal:'#6F6F6F',design:'#6F6F6F',personality:'#1A1A1A',mode:'unified-natal'},'deep-think':{accent:'#4D6BFE',transit:'#4660E5',natal:'#747B8A',design:'#C26068',personality:'#252A36',mode:'split'}};
  const color=async(locator,token,property='color')=>{
    const pair=await locator.first().evaluate((n,{token,property})=>{
      const probe=document.createElement('span');probe.style.setProperty(property,`var(${token})`);document.body.append(probe);
      const v=[getComputedStyle(n).getPropertyValue(property),getComputedStyle(probe).getPropertyValue(property)];probe.remove();return v;
    },{token,property});assert.equal(pair[0],pair[1],token+' on real surface');
  };
  const results=[];let centers;
  for(const id of ['delve','deep-think']){
    await page.locator('#more-toggle').click();await page.locator('#skin-settings-button').click();
    await page.locator(`[data-skin-id="${id}"]`).click();
    await page.locator('#skin-picker').screenshot({path:`${evidence}/${id}-picker.png`});
    await page.keyboard.press('Escape');
    const tokens=await page.locator('html').evaluate(n=>Object.fromEntries(['--accent','--hd-transit','--hd-overlay-natal','--hd-personality','--hd-design'].map(k=>[k,getComputedStyle(n).getPropertyValue(k).trim()])));
    for(const [key,token]of Object.entries({accent:'--accent',transit:'--hd-transit',natal:'--hd-overlay-natal',design:'--hd-design',personality:'--hd-personality'}))assert.equal(tokens[token],expected[id][key]);
    const edges=await page.locator('#bodygraph-container radialGradient stop').evaluateAll(ns=>ns.map(n=>n.getAttribute('stop-color')));
    if(centers)assert.deepEqual(edges,centers,'Classic centers remain identical');else centers=edges;
    await color(page.locator('#bodygraph-container .bg-planets-design .bg-planet-act'),'--hd-design');
    await color(page.locator('#bodygraph-container .bg-planets-personality .bg-planet-act'),'--hd-personality');
    assert.equal(await page.locator('#bodygraph-container').getAttribute('data-transit-source-mode'),'split');
    await page.locator('#bodygraph-container').screenshot({path:`${evidence}/${id}-birth.png`});
    await navigate('transits');await page.locator('#transit-stage .bodygraph-svg').waitFor({timeout:60000});
    assert.equal(await page.locator('#transit-stage .tl-graph').getAttribute('data-transit-source-mode'),expected[id].mode);
    await color(page.locator('#transit-stage .tl-birth-value[data-side="design"] .bg-planet-act'),id==='delve'?'--hd-overlay-natal':'--hd-design');
    await color(page.locator('#transit-stage .tl-transit-column .bg-planet-act'),'--hd-transit-text');
    await page.locator('#transit-stage .tl-graph-panel').screenshot({path:`${evidence}/${id}-transit.png`});
    await navigate('timeline');await page.locator('#timeline-view .bodygraph-svg').waitFor({timeout:60000});
    await page.locator('#timeline-view [data-field="span"]').selectOption('past-year');
    await page.waitForFunction(()=>document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy')==='false'&&document.querySelectorAll('#timeline-view .tl-bar').length>100,null,{timeout:180000});
    await page.waitForFunction(({mode,transit})=>{
      const graph=document.querySelector('#timeline-view .tl-graph');
      return graph?.dataset.transitSourceMode===mode&&[...graph.querySelectorAll('.bg-gate-circle')].some(n=>n.getAttribute('fill')===transit);
    },expected[id]);
    await color(page.locator('#timeline-view .tl-birth-value[data-side="design"] .bg-planet-act'),id==='delve'?'--hd-overlay-natal':'--hd-design');
    await color(page.locator('#timeline-view .tl-bar[data-source="natal"]'),'--hd-overlay-natal','background-color');
    await color(page.locator('#timeline-view .tl-bar[data-source="transit"]'),'--hd-transit','background-color');
    await color(page.locator('#timeline-view .tl-bar[data-source="transit"]'),'--hd-transit-on');
    await page.locator('#timeline-view .tl-legend-disclosure').evaluate(n=>n.open=true);
    await color(page.locator('#timeline-view .tl-legend [data-source="natal"] i'),'--hd-overlay-natal','background-color');
    await color(page.locator('#timeline-view .tl-legend [data-source="transit"] i'),'--hd-transit','background-color');
    await color(page.locator('#timeline-view .tl-legend [data-source="both"] i'),'--hd-overlay-natal','border-top-color');
    const completed=await page.locator('#timeline-view .tl-legend [data-source="completed"] i').evaluate(n=>getComputedStyle(n).backgroundImage);
    assert.match(completed,/linear-gradient/);
    await page.locator('#timeline-view .tl-legend-disclosure').evaluate(n=>n.open=false);
    await page.locator('#timeline-view .tl-workspace').screenshot({path:`${evidence}/${id}-timeline.png`});
    results.push({id,tokens,centersUnchanged:true,completed});await navigate('chart');
  }
  assert.deepEqual(errors,[]);
  writeFileSync(evidence+'/delve-blue-results.json',JSON.stringify({results,errors},null,2));
  console.log('PASS: Delve black/gray birth, gray/Azure overlay and tracks, shared columns, Natal/Transit/Completed/Both legend, Picker, unchanged centers and distinct Deep Think. Evidence: '+evidence);
} finally {await browser.close();}
