import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.E2E_URL||'http://127.0.0.1:9961',out='artifacts/visual-review/reference-mobile-sheet';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true});const errors=[],records=[];
try{
 for(const width of [320,390])for(const locale of ['zh-CN','zh-Hant','en']){
  const page=await browser.newPage({viewport:{width,height:844},locale,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(l=>localStorage.setItem('ohd-language',l),locale);
  await page.goto(base+'/#library');await page.locator('#reference-results .reference-result').first().waitFor();
  const first=page.locator('#reference-results .reference-result').nth(12);await first.scrollIntoViewIfNeeded();await first.focus();const y=await page.evaluate(()=>scrollY),id=await first.getAttribute('data-reference-id');await first.click();await page.locator('#reference-mobile-detail:not(.hidden)').waitFor();
  assert.equal(await page.locator('#reference-mobile-detail .gate-detail-back').count(),1);assert.equal(await page.locator('#reference-mobile-detail .gate-detail-close').count(),1);
  await page.locator('#reference-mobile-detail .gate-detail-back').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#reference-mobile-detail')),true);await page.keyboard.press('Tab');assert.equal(await page.locator('#reference-mobile-detail .gate-detail-back').evaluate(n=>n===document.activeElement),true);
  await page.locator('#reference-detail').click({position:{x:20,y:90}});assert.equal(await page.locator('#reference-mobile-detail').isVisible(),true,'body click stays open');
  await page.locator('#reference-mobile-detail .gate-detail-close').click();await page.waitForURL('**/#library');assert.equal(await page.locator('#reference-mobile-detail').isVisible(),false);assert.equal(await page.evaluate(()=>scrollY),y);assert.equal(await page.evaluate(()=>document.activeElement.dataset.referenceId),id);
  await page.goForward();await page.locator('#reference-mobile-detail:not(.hidden)').waitFor();await page.keyboard.press('Escape');await page.waitForURL('**/#library');assert.equal(await page.locator('#reference-mobile-detail').isVisible(),false);
  // Start from a fresh deep link: no previous in-app list entry required.
  await page.goto(base+'/#library/gate/14?line=2');await page.locator('#reference-mobile-detail:not(.hidden)').waitFor();await page.locator('#reference-detail [data-reference-kind="channel"][data-reference-id="2-14"]').click();await page.waitForURL('**/#library/channel/2-14');await page.locator('#reference-mobile-detail .gate-detail-back').click();await page.waitForURL('**/#library/gate/14?line=2');
  await page.locator('#reference-detail [data-reference-kind="channel"][data-reference-id="2-14"]').click();await page.locator('#reference-mobile-detail .gate-detail-close').click();await page.waitForURL('**/#library');assert.equal(await page.locator('#reference-mobile-detail').isVisible(),false,'deep-link close must not reopen');await page.goBack();await page.locator('#reference-mobile-detail:not(.hidden)').waitFor();assert.ok(page.url().includes('#library/gate/14'));await page.goForward();await page.waitForURL('**/#library');assert.equal(await page.locator('#reference-mobile-detail').isVisible(),false);
  const knowledge=await page.evaluate(async()=>(await import('/src/lib/reference-catalog.js')).referenceEntries().find(e=>e.kind==='knowledge').id);
  for(const[kind,value]of [['gate','14'],['channel','2-14'],['center','g'],['circuit','knowing'],['group','individual'],['planet','sun'],['knowledge',knowledge]]){
   await page.goto(`${base}/#library/${kind}/${encodeURIComponent(value)}`);await page.locator('#reference-mobile-detail:not(.hidden)').waitFor();assert.equal(await page.locator('#reference-detail').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,`${width}/${locale}/${kind}`);
   const sheet=await page.locator('#reference-mobile-detail .gate-detail-card').boundingBox();assert.ok(sheet.y>30,'backdrop exposed');await page.screenshot({path:`${out}/${width}-${locale}-${kind}.png`,animations:'disabled'});
   // Click the actual overlay outside the sheet, not the content or a pseudo element.
   await page.mouse.click(8,Math.max(4,sheet.y/2));await page.waitForURL('**/#library');assert.equal(await page.locator('#reference-mobile-detail').isVisible(),false);
  }
  // Nested links opened from an actual list: close jumps to the list, Back only one step.
  await page.locator('#reference-search').fill('14');await page.locator('.reference-result[data-reference-kind="gate"][data-reference-id="14"]').click();await page.locator('#reference-detail [data-reference-kind="channel"][data-reference-id="2-14"]').click();await page.locator('#reference-mobile-detail .gate-detail-close').click();await page.waitForURL('**/#library');assert.equal(await page.locator('#reference-search').inputValue(),'14');assert.equal(await page.evaluate(()=>document.activeElement.dataset.referenceId),'14');
  await page.goForward();await page.waitForURL('**/#library/gate/14');await page.locator('#reference-mobile-detail:not(.hidden)').waitFor();await page.goForward();await page.waitForURL('**/#library/channel/2-14');await page.locator('#reference-mobile-detail:not(.hidden)').waitFor();
  // Resizing must not alter the address or close the desktop region.
  await page.setViewportSize({width:1280,height:900});await page.locator('#reference-mobile-detail').waitFor({state:'hidden'});assert.equal(await page.locator('#reference-mobile-detail').isVisible(),false);assert.equal(await page.locator('.reference-layout > #reference-detail').count(),1);assert.ok(page.url().endsWith('/channel/2-14'));await page.setViewportSize({width,height:844});await page.locator('#reference-mobile-detail:not(.hidden)').waitFor();await page.keyboard.press('Escape');await page.waitForURL('**/#library');
  await page.goto(base+'/#library/gate/not-a-gate');await page.locator('#reference-mobile-detail:not(.hidden)').waitFor();await page.keyboard.press('Escape');await page.waitForURL('**/#library');
  records.push({width,locale,passed:true});await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({records,errors},null,2));console.log('PASS 320/390 three locales; all detail kinds, Back/Close/backdrop/body/Escape, list scroll/focus, deep links, browser back/forward, desktop resize');
}finally{await browser.close();}
