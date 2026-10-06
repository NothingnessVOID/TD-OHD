/** Final RC navigation smoke; also runs against the deployed production bundle. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.E2E_URL || 'http://127.0.0.1:5221';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chromium',headless:true});
const categories=['all','basic','type','authority','profile','definition','cross','center','gate','channel','group','planet','variable'];
const circuits={integration:4,knowing:9,centering:2,logic:7,sensing:7,ego:5,defense:2};
try {
 for(const width of [1224,390])for(const locale of ['en','zh-CN','zh-Hant']) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addInitScript(locale=>localStorage.setItem('ohd-language',locale),locale);
  await context.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#library',{waitUntil:'domcontentloaded'});
  const toggle=page.locator('.reference-filter-toggle');await toggle.waitFor();
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  assert.deepEqual(await page.locator('[data-reference-filter]').evaluateAll(ns=>ns.map(n=>n.dataset.referenceFilter)),categories);
  const select=async id=>{
   if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
   const label=await page.locator(`[data-reference-filter="${id}"]`).innerText();
   await page.locator(`[data-reference-filter="${id}"]`).click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   assert.equal(await page.locator('.reference-filter-current').innerText(),label);
  };
  await select('basic');assert.deepEqual(await page.locator('.reference-result').evaluateAll(ns=>ns.map(n=>n.dataset.referenceId)),['design','personality','transit']);
  for(const [id,count]of [['type',6],['authority',9],['profile',13],['definition',6],['cross',1],['variable',29],['group',10],['planet',13]]) {
   await select(id);assert.equal(await page.locator('.reference-result').count(),count);
  }
  for(const [group,count]of [['individual',3],['collective',2],['tribal',2]]) {
   await page.goto(`${base}/#library/group/${group}`,{waitUntil:'domcontentloaded'});
   await page.locator('#reference-detail h2').waitFor();
   assert.equal(await page.locator('#reference-detail [data-reference-kind="circuit"]').count(),count);
  }
  for(const [id,count]of Object.entries(circuits)) {
   await page.goto(`${base}/#library/circuit/${id}`,{waitUntil:'domcontentloaded'});
   await page.locator('#reference-detail h2').waitFor();
   assert.equal(await page.locator('#reference-detail [data-reference-kind="channel"]').count(),count);
   if(id==='integration')assert.equal(await page.locator('#reference-detail h2').innerText(),locale==='en'?'Integration Channels':'整合通道');
  }
  for(const [id,group,circuit]of [['24-61','individual','knowing'],['10-20','individual','integration'],['4-63','collective','logic'],['10-34','individual','centering'],['20-57','individual','knowing']]) {
   await page.goto(`${base}/#library/channel/${id}`,{waitUntil:'domcontentloaded'});
   await page.locator('#reference-detail h2').waitFor();
   assert.equal(await page.locator('#reference-detail .channel-detail-heading .circuit-badge').count(),2);
   assert.equal(await page.locator(`#reference-detail [data-reference-kind="group"][data-reference-id="${group}"]`).count(),1);
   assert.equal(await page.locator(`#reference-detail [data-reference-kind="circuit"][data-reference-id="${circuit}"]`).count(),1);
  }
  for(const id of ['hd.type.introduction','hd.authority.introduction','hd.profile.introduction','hd.definition.introduction','hd.cross.introduction','hd.variable.introduction']) {
   await page.goto(`${base}/#library/knowledge/${id}`,{waitUntil:'domcontentloaded'});
   await page.locator(`#reference-detail [data-knowledge-id="${id}"]`).waitFor();
   assert.doesNotMatch(await page.locator('#reference-detail').innerText(),/公共说明|公共說明|基础说明|基礎說明|Public Overview|Basics/);
  }
  assert.deepEqual(errors,[]);console.log(`Release Library ${width}/${locale}: categories, collapse, groups, seven circuits, badges, overview routes PASS`);
  await context.close();
 }
} finally {await browser.close();}
