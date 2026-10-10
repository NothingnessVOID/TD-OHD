/** Phase 5 access, shared shell, locale, route and exact compact-layout checks. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const base = process.env.E2E_URL || 'http://127.0.0.1:5196';
const baseline = process.env.BASELINE_E2E_URL || 'http://127.0.0.1:5195';
const birth = '?d=2000-05-10&t=12%3A30&tz=8';
const browser = await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chrome',headless:true});
const results=[];
const ids=['hd.type.generator','hd.authority.sacral','hd.profile.2-4','hd.definition.split'];
const snapshot=page=>page.evaluate(()=>({cards:[...document.querySelectorAll('#foundation-panel .foundation-item')].map(n=>({text:n.innerText,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})),variable:[...document.querySelectorAll('.variable-grid .arrow-card')].map(n=>({text:n.innerText,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}))}));
const pure=(text,locale)=>locale==='en'?assert.doesNotMatch(text,/[\u3400-\u9fff]/):locale==='zh-Hant'?assert.doesNotMatch(text,/骶骨|实践家|正向反馈/):undefined;
async function open(url,width,locale) {
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',locale});
 await context.addInitScript(code=>localStorage.setItem('ohd-language',code),locale);
 // External web fonts are blocked equally so geometry compares a deterministic font stack.
 await context.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route=>route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${url}/${birth}`,{waitUntil:'domcontentloaded'});
 await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
 await page.evaluate(async()=>{await document.fonts.ready;return true;});
 await page.locator('[data-panel="variable"]').click();
 return {page,context,errors};
}
try {
 for(const width of [1224,903,664,390])for(const locale of ['en','zh-CN','zh-Hant']) {
  console.log(`Checking layout ${width}/${locale}`);
  const old=await open(baseline,width,locale),current=await open(base,width,locale),page=current.page;
  const before=await snapshot(old.page);const initial=await snapshot(page); assert.deepEqual(initial.cards,before.cards,'Foundation text and dimensions remain exact');
  for(const [index,kind]of ['type','authority','profile','definition'].entries()) {
   const trigger=page.locator(`[data-knowledge-object="${kind}"]`);
   assert.equal(await trigger.getAttribute('role'),'button');assert.equal(await trigger.getAttribute('tabindex'),'0');
   await trigger.focus();await page.keyboard.press(index%2?' ':'Enter');
   assert.equal(await page.locator('#gate-detail').getAttribute('role'),'dialog');assert.equal(await page.locator('#gate-detail').getAttribute('aria-modal'),'true');
   assert.equal(await page.locator('#gate-detail .knowledge-detail').getAttribute('data-knowledge-id'),ids[index]);
   pure(await page.locator('#gate-detail').innerText(),locale);
   const sheet = await page.locator('#gate-detail .gate-detail-card').boundingBox();
   if (width <= 640) { assert.equal(sheet.width,width); assert.ok(Math.abs(sheet.y + sheet.height - 900) < 1); assert.ok(sheet.height >= 315 && sheet.height <= 738); }
   else { assert.ok(sheet.width <= 540); assert.ok(Math.abs(sheet.x + sheet.width / 2 - width / 2) < 1); }
   assert.equal(await page.locator('#knowledge-detail').count(),0);
   assert.equal(await page.locator('#gate-detail .tl-detail-timing').count(),0);
   // Focus trap includes the library action and close button.
   await page.locator('#gate-detail .knowledge-library-link').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('gate-detail-close')),true);
   await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(n=>n===document.activeElement),true);
  }
  for(const key of ['Enter',' ']) {const strategy=page.locator('[data-knowledge-object="strategy"]');await strategy.focus();await page.keyboard.press(key);assert.equal(await page.locator('#gate-detail .knowledge-detail').getAttribute('data-knowledge-id'),'hd.type.generator');await page.keyboard.press('Escape');assert.equal(await strategy.evaluate(n=>n===document.activeElement),true);}
  for(const index of [5,7])assert.equal(await page.locator('#foundation-panel .foundation-item').nth(index).getAttribute('role'),null);
  for(const selector of ['.foundation-variable-slot','.variable-grid .arrow-card'])for(const kind of ['motivation','perspective','determination','environment']) {
   const target=page.locator(`${selector}[data-knowledge-variable="${kind}"]`);
   const expected=await page.evaluate(async kind=>{const {getCurrentChart}=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/views/chart.js')?.name || '/src/views/chart.js');return getCurrentChart().chart.variable[kind].valueId;},kind);
   await target.click();assert.equal(await page.locator('#gate-detail .knowledge-detail').getAttribute('data-knowledge-id'),`hd.variable.${kind}.${expected}`);
   const context=await page.locator('#gate-detail .knowledge-context').innerText();pure(context,locale);assert.match(context,/\d/);
   await page.keyboard.press('Escape');
  }
  await page.locator('[data-knowledge-object="cross"]').click();
  assert.match(await page.locator('#gate-detail .knowledge-detail').getAttribute('data-knowledge-id'),/CrossOfExplanation2$/);
  assert.equal(await page.locator('#gate-detail .knowledge-missing').count(),0);
  assert.deepEqual((await page.locator('#gate-detail .knowledge-activation .knowledge-chip').allInnerTexts()).map(text=>Number(text.match(/\d+/)[0])),[23,43,49,4]);
  await page.locator('.knowledge-library-link').click();assert.match(page.url(),/#library\/knowledge\/hd.cross.introduction$/);
  await page.locator('#reference-detail .knowledge-detail').waitFor();pure(await page.locator('#reference-detail').innerText(),locale);
  if(width<=640)await page.locator('#reference-mobile-detail .gate-detail-nav [data-reference-back]').click();
  await page.locator('.reference-filter-toggle').click();
  await page.locator('[data-reference-filter="basic"]').click();assert.equal(await page.locator('.reference-result[data-reference-kind="knowledge"]').count(),0);
  assert.equal(await page.locator('.reference-result[data-reference-kind="concept"]').count(),3);
  await page.locator('.reference-filter-toggle').click();
  await page.locator('[data-reference-filter="variable"]').click();assert.equal(await page.locator('.reference-result').count(),29);
  await page.locator('#reference-search').fill('hope');assert.equal(await page.locator('.reference-result').getAttribute('data-reference-id'),'hd.variable.motivation.hope');
  assert.deepEqual(current.errors,[]);assert.deepEqual(old.errors,[]);
  results.push({width,locale,foundationExact:true,variableSummaryFromApprovedSource:true,keyboard:true,modal:true,library:true,pureLocale:true});
  await old.context.close();await current.context.close();
 }
 // One body regardless of shell, including runtime locale refresh and library links.
 const current=await open(base,903,'zh-CN'),page=current.page;
 for(const [type,objectId]of [['type','generator'],['authority','sacral'],['profile','1/3'],['definition','split'],['variable','motivation:hope']]) {
  for(const locale of ['en','zh-CN','zh-Hant']) {
   await page.evaluate(async({type,objectId,locale})=>{const {setLocale}=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/i18n.js')?.name || '/src/lib/i18n.js');setLocale(locale,{persist:false});const {openKnowledgeDetail}=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/knowledge/detail-controller.js')?.name || '/src/lib/knowledge/detail-controller.js');openKnowledgeDetail({objectType:type,objectId});},{type,objectId,locale});
   const article=await page.locator('#gate-detail .knowledge-detail').innerHTML();pure(await page.locator('#gate-detail').innerText(),locale);
   const label=await page.locator('#gate-detail').getAttribute('aria-label');assert.ok(label);pure(label,locale);
   await page.locator('.knowledge-library-link').click();await page.locator('#reference-detail .knowledge-detail').waitFor();
   assert.equal(await page.locator('#reference-detail .knowledge-detail').innerHTML(),article);
  }
 }
 await page.goto(`${base}/${birth}`,{waitUntil:'domcontentloaded'});await page.locator('[data-knowledge-object="authority"]').waitFor();
 await page.locator('[data-knowledge-object="authority"]').click();
 await page.evaluate(async()=>(await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/i18n.js')?.name || '/src/lib/i18n.js')).setLocale('en',{persist:false}));
 await page.keyboard.press('Escape');assert.equal(await page.locator('[data-knowledge-object="authority"]').evaluate(n=>n===document.activeElement),true);
 // Locale changes while open, using real locale notifications.
 await page.evaluate(async()=>{const {openKnowledgeDetail}=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/knowledge/detail-controller.js')?.name || '/src/lib/knowledge/detail-controller.js');openKnowledgeDetail({objectType:'variable',objectId:'motivation:hope'},{variable:{color:2,tone:4,base:3}});});
 for(const locale of ['en','zh-CN','zh-Hant']){await page.evaluate(async locale=>(await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/i18n.js')?.name || '/src/lib/i18n.js')).setLocale(locale,{persist:false}),locale);pure(await page.locator('#gate-detail').innerText(),locale);}
 await page.locator('#gate-detail').click({position:{x:4,y:4}});assert.equal(await page.locator('#gate-detail').getAttribute('class'),'gate-detail hidden');
 assert.equal(await page.evaluate(async()=>(await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/knowledge/detail-controller.js')?.name || '/src/lib/knowledge/detail-controller.js')).getKnowledgeDetailState()),null);
 const routes=['hd.type.generator','hd.authority.sacral','hd.profile.1-3','hd.definition.split','hd.variable.motivation.hope','hd.cross.introduction'];
 for(const id of routes){await page.goto(`${base}/#library/knowledge/${id}`,{waitUntil:'domcontentloaded'});await page.locator(`#reference-detail [data-knowledge-id="${id}"]`).waitFor();await page.reload({waitUntil:'domcontentloaded'});await page.locator(`#reference-detail [data-knowledge-id="${id}"]`).waitFor();}
 await page.evaluate(async()=>(await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/views/reference.js')?.name || '/src/views/reference.js')).openReference('knowledge','hd.authority.sacral'));
 await page.locator('#reference-detail [data-knowledge-id="hd.authority.sacral"]').waitFor();await page.goBack({waitUntil:'domcontentloaded'});await page.locator('#reference-detail [data-knowledge-id="hd.cross.introduction"]').waitFor();await page.goForward({waitUntil:'domcontentloaded'});await page.locator('#reference-detail [data-knowledge-id="hd.authority.sacral"]').waitFor();
 assert.deepEqual(current.errors,[]);await current.context.close();
 if(process.env.KNOWLEDGE_ACCESS_VALIDATION_OUTPUT)writeFileSync(process.env.KNOWLEDGE_ACCESS_VALIDATION_OUTPUT,JSON.stringify({layoutComparisons:results,sameBodyLanguages:15,routes:routes.length},null,2)+'\n');
 console.log(`PASS ${results.length} exact Foundation comparisons and Variable access checks, keyboard/shell/library checks; 15 same-body/locale combinations and six deep-link reload routes`);
}finally{await browser.close();}
