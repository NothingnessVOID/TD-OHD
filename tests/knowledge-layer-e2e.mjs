/** Phase 4C compact-summary surfaces, pure locale display and Detail-growth isolation. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const base=process.env.E2E_URL || 'http://127.0.0.1:5194';
const baseline=process.env.BASELINE_E2E_URL || 'http://127.0.0.1:5191';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true});
const results=[];
const snapshot=page=>page.evaluate(()=>({banner:document.querySelector('#type-banner').innerText,cards:[...document.querySelectorAll('#foundation-panel .foundation-item')].map(n=>({text:n.innerText,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}))}));
async function open(url,width,locale) {
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${url}/?d=2000-05-10&t=12%3A30&tz=8`, { waitUntil: 'domcontentloaded' });
 await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
 await page.locator('#more-toggle').click();await page.locator('#language-menu > summary').click();await page.locator(`[data-language="${locale}"]`).click();await page.keyboard.press('Escape');
 return {context,page,errors};
}
try {
 for(const width of [1224,903,664,390])for(const locale of ['en','zh-CN','zh-Hant']) {
  const old=await open(baseline,width,locale),current=await open(base,width,locale);
  const before=await snapshot(old.page),after=await snapshot(current.page);
  assert.equal(after.cards.length,before.cards.length);assert.deepEqual(after.cards.map(x=>x.width),before.cards.map(x=>x.width));
  const allowed=new Set([0,1,2,3,7]); // Approved Type/Authority/Profile copy and removed bilingual Variable heading.
  after.cards.forEach((card,i)=>{if(!allowed.has(i))assert.equal(card.text,before.cards[i].text);});
  const expected=await current.page.evaluate(async()=>{
   const {getKnowledgeSummary}=await import('/src/lib/knowledge/registry.js');
   return ['type','authority','profile'].map((objectType,i)=>getKnowledgeSummary({objectType,objectId:['generator','sacral','2/4'][i]}).content);
  });
  for(const [i,slot]of [0,2,3].entries())assert.ok(after.cards[slot].text.includes(expected[i]));
  if(locale!=='en')assert.doesNotMatch((await current.page.locator('.foundation-variable-heading').allInnerTexts()).join(' '),/[A-Za-z]/);
  await current.page.locator('[data-panel="variable"]').click();
  const variableBefore=await current.page.locator('.variable-grid').evaluate(n=>({text:n.innerText,height:n.getBoundingClientRect().height}));
  if(locale==='en')assert.doesNotMatch(variableBefore.text,/[\u3400-\u9fff]/);else assert.doesNotMatch(variableBefore.text,/[A-Za-z]/);
  await current.page.evaluate(async()=>{
   const {foundationRecords}=await import('/src/lib/knowledge/human-design-foundation.js');
   for(const record of foundationRecords.filter(r=>r.detail))record.detail={...record.detail,templateRead:undefined,read:()=> 'TEST_ONLY_LONG_DETAIL '.repeat(3000)};
   const {refreshChartLanguage}=await import('/src/views/chart.js');refreshChartLanguage();
  });
  assert.deepEqual(await snapshot(current.page),after,`${width}/${locale}: Detail cannot change Foundation`);
  assert.deepEqual(await current.page.locator('.variable-grid').evaluate(n=>({text:n.innerText,height:n.getBoundingClientRect().height})),variableBefore);
  await current.page.locator('[data-panel="cross"]').click();
  const crossText=await current.page.locator('#panel-content').innerText();assert.doesNotMatch(crossText,/70%|TEST_ONLY_LONG_DETAIL/);if(locale==='en')assert.doesNotMatch(crossText,/[\u3400-\u9fff]/);else assert.doesNotMatch(crossText,/[A-Za-z]/);
  assert.deepEqual(current.errors,[]);assert.deepEqual(old.errors,[]);
  results.push({width,locale,cardCount:after.cards.length,cardWidthsEqual:true,longDetailIsolation:true,variablePureLocale:true,heightChanges:after.cards.map((card,i)=>({card:i,previous:before.cards[i].height,current:card.height})).filter(x=>x.previous!==x.current)});
  await old.context.close();await current.context.close();
 }
 if(process.env.KNOWLEDGE_VALIDATION_OUTPUT)writeFileSync(process.env.KNOWLEDGE_VALIDATION_OUTPUT,JSON.stringify({layoutComparisons:results},null,2)+'\n');
 console.log(`PASS ${results.length} Phase 4C approved-copy/layout/pure-locale checks and 50k+ Detail isolation checks`);
} finally {await browser.close();}
