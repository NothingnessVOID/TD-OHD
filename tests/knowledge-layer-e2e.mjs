/** Compare Phase 2/3 Summary surfaces and prove injected Detail cannot grow Home. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const base=process.env.E2E_URL || 'http://127.0.0.1:5193';
const baseline=process.env.BASELINE_E2E_URL || 'http://127.0.0.1:5191';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true});
const results=[];
const snapshot=async page=>({
  banner:await page.locator('#type-banner').innerText(),
  foundation:await page.locator('#foundation-panel').evaluate(node=>({
    text:node.innerText, width:node.getBoundingClientRect().width, height:node.getBoundingClientRect().height,
    cards:[...node.querySelectorAll('.foundation-item')].map(n=>({text:n.innerText,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}))
  }))
});
try {
 for(const width of [1224,903,664,390])for(const locale of ['en','zh-CN','zh-Hant']) {
  const open=async url=>{
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`${url}/?d=2000-05-10&t=12%3A30&tz=8`);
   await page.locator('#foundation-panel .foundation-item').first().waitFor({timeout:60000});
   await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
   await page.locator('#more-toggle').click();await page.locator('#language-menu > summary').click();await page.locator(`[data-language="${locale}"]`).click();await page.keyboard.press('Escape');
   return {context,page,errors};
  };
  const old=await open(baseline),current=await open(base);
  const expected=await snapshot(old.page);assert.deepEqual(await snapshot(current.page),expected,`${width}/${locale}: unchanged Home`);
  await current.page.evaluate(async()=>{
   const {foundationRecords}=await import('/src/lib/knowledge/human-design-foundation.js');
   for(const record of foundationRecords.filter(r=>['type','authority','profile'].includes(r.objectType)))record.detail={...record.summary,read:()=> 'TEST_ONLY_LONG_DETAIL '.repeat(3000)};
   const {getKnowledgeEntry}=await import('/src/lib/knowledge/registry.js');
   if(getKnowledgeEntry({objectType:'type',objectId:'generator'}).detail.content.length<50000)throw new Error('Detail fixture did not grow');
   const {refreshChartLanguage}=await import('/src/views/chart.js');refreshChartLanguage();
  });
  assert.deepEqual(await snapshot(current.page),expected,`${width}/${locale}: long Detail cannot grow Home`);
  assert.deepEqual(current.errors,[]);assert.deepEqual(old.errors,[]);
  results.push({width,locale,textAndGeometryEqual:true,longDetailIsolation:true});
  await old.context.close();await current.context.close();
 }
 if(process.env.KNOWLEDGE_VALIDATION_OUTPUT)writeFileSync(process.env.KNOWLEDGE_VALIDATION_OUTPUT,JSON.stringify({layoutComparisons:results},null,2)+'\n');
 console.log(`PASS ${results.length} Phase 2/3 Home text/geometry comparisons and 50k+ Detail isolation checks`);
} finally { await browser.close(); }
