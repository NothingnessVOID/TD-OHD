/** Real clipboard coverage using existing rendered chart and transit snapshots. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const base=(process.env.E2E_URL || 'http://127.0.0.1:5177').replace(/\/$/,'');
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chrome',headless:true});
try {
  const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],locale:'en-US'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8&n=PRIVATE_EXPORT_NAME`);
  await page.locator('#foundation-panel .foundation-item').first().waitFor({timeout:60000});
  const share=async()=>{
    if(!await page.locator('#more-menu').evaluate(node=>node.open)) await page.locator('#more-toggle').click();
    if(!await page.locator('#chart-share-menu').evaluate(node=>node.open)) await page.locator('#chart-share-menu > summary').click();
  };
  const copy=async()=>{
    await share();await page.locator('#copy-data').click();
    return page.evaluate(()=>navigator.clipboard.readText());
  };
  const privacy=text=>assert.doesNotMatch(text,/PRIVATE_EXPORT_NAME|2000-05-10|12:30|2000-02-11|Shanghai|上海|birthDate|birthTime|https?:\/\//);
  for(const [locale,title,p,d] of [['en','Basic structure','Personality','Design'],['zh-CN','基础结构','人格','设计'],['zh-Hant','基礎結構','人格','設計']]) {
    if(!await page.locator('#more-menu').evaluate(node=>node.open)) await page.locator('#more-toggle').click();
    await page.locator('#language-menu > summary').click();
    await page.locator(`[data-language="${locale}"]`).click();
    const text=await copy();
    assert.ok(text.includes(`【${title}】`));assert.ok(text.includes(`${p} 23.2 ｜ ${d} 49.4`));
    privacy(text);assert.doesNotMatch(text,/【Transit】|【行运】|【行運】/);
    assert.deepEqual(await page.locator('#chart-share-menu button').evaluateAll(nodes=>nodes.map(n=>n.id)),['share-chart','copy-data','save-image','invite-compare']);
    await page.keyboard.press('Escape');
  }
  await page.locator('#more-toggle').click();await page.locator('#language-menu > summary').click();await page.locator('[data-language="en"]').click();await page.keyboard.press('Escape');
  await page.locator('.nav-link[data-view="transits"]').click();
  const setMoment=async(date,time)=>{
    await page.locator('#transit-date').fill(date);
    await page.locator('#transit-time').fill(time);
    await page.locator('#transit-time').dispatchEvent('change');
    await page.waitForFunction(async ({date,time})=>{
      const {getCurrentTransitExportData}=await import('/src/views/transits.js');
      const value=getCurrentTransitExportData();return value?.date===date&&value?.time===time;
    },{date,time},{timeout:60000});
  };
  await setMoment('2026-01-02','03:04:05');
  const first=await copy();privacy(first);
  assert.ok(first.includes('2026-01-02 03:04:05 GMT'));
  assert.deepEqual(await page.locator('#chart-share-menu button').evaluateAll(nodes=>nodes.map(n=>n.id)),['copy-data','save-image']);
  const renderedSun=await page.locator('#transits-view .tl-planet[data-planet="sun"] .bg-planet-act').textContent();
  assert.ok(first.split('【Transit】')[1].includes(`Sun: ${renderedSun}`));
  // Delay the next snapshot so clicking Copy data exercises the stale-data guard.
  await page.evaluate(async()=>{
    const providerUrl=performance.getEntriesByType('resource').map(r=>r.name).find(name=>/\/src\/lib\/chart-engine\/sharp-provider\.js(?:\?|$)/.test(name));
    const {initializeEngine}=await import(providerUrl);
    const runtime=await initializeEngine();
    const original=runtime.transit;
    window.exportSnapshotCalls=0;
    runtime.transit=async (...args)=>{
      window.exportSnapshotCalls++;
      await new Promise(resolve=>window.releaseExportSnapshot=resolve);
      runtime.transit=original;
      return original(...args);
    };
  });
  await page.locator('#transit-date').evaluate(node=>{node.value='2026-07-02';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>typeof window.releaseExportSnapshot==='function');
  await share();await page.locator('#copy-data').click();
  assert.equal(await page.locator('#copy-data').textContent(),'Transit data is not ready yet');
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),first,'loading cannot copy the previous moment');
  assert.equal(await page.evaluate(()=>window.exportSnapshotCalls),1,'copy performs no additional calculation');
  await page.evaluate(()=>window.releaseExportSnapshot());
  await page.waitForFunction(async()=> (await import('/src/views/transits.js')).getCurrentTransitExportData()?.date==='2026-07-02',null,{timeout:60000});
  const second=await copy();privacy(second);assert.ok(second.includes('2026-07-02 03:04:05 GMT'));assert.notEqual(first,second);
  const newSun=await page.locator('#transits-view .tl-planet[data-planet="sun"] .bg-planet-act').textContent();
  assert.ok(second.split('【Transit】')[1].includes(`Sun: ${newSun}`));assert.notEqual(newSun,renderedSun);
  await page.keyboard.press('Escape');await page.locator('.nav-link[data-view="timeline"]').click();
  await page.locator('#timeline-view .tl-graph svg').waitFor({timeout:60000});
  await page.waitForFunction(()=>!!document.querySelector('#timeline-view .tl-planet[data-planet="sun"] strong')?.textContent);
  const timelineText=await copy();privacy(timelineText);assert.ok(timelineText.includes('【Transit】'));
  const timelineSun=await page.locator('#timeline-view .tl-planet[data-planet="sun"] strong').textContent();
  assert.ok(timelineText.split('【Transit】')[1].includes(`Sun: ${timelineSun}`));
  const timelineDate=await page.locator('#timeline-view .tl-moment-date').textContent();assert.ok(timelineText.includes(timelineDate));
  for(const view of ['connection','team','library']) {
    await page.keyboard.press('Escape');await page.locator(`.nav-link[data-view="${view}"]`).click();
    assert.equal(await page.locator('#copy-data').count(),0,`${view} has no Human Design data export`);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: real clipboard, 3 locales, anonymous natal output, timestamp/Sun, fresh Transit, loading guard, no extra calculation, Timeline and excluded views');
  await context.close();
} finally {await browser.close();}
