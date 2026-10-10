import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
const base=process.env.E2E_URL||'http://127.0.0.1:19964',out='artifacts/visual-review/penta-card-hover';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true});
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/dev/test-people.html');await page.locator('#import:not([disabled])').click();await page.goto(base);if(mobile)await page.locator('#mobile-menu-toggle').click();await page.locator('.nav-link[data-view="team"]').click();await page.locator('#team-add-saved-person').click();for(let i=1;i<=3;i++)await page.locator(`[data-add-person="td-ohd-fictional-0${i}"]`).click();await page.locator('#team-selection-confirm').click();await page.waitForFunction(()=>document.querySelectorAll('.penta-gate-reading').length===12);
  const style=row=>row.evaluate(n=>{const s=getComputedStyle(n);return{background:s.backgroundColor,border:s.borderTopColor,outline:s.outlineStyle,focus:n.matches(':focus-visible'),active:n.classList.contains('penta-active-detail')};});
  for(const[kind,id]of [['channel','7-31'],['gate','14']]){
   const row=page.locator(`.penta-analysis-card[data-detail-kind="${kind}"][data-detail-id="${id}"]`);await row.scrollIntoViewIfNeeded();await page.mouse.move(1,1);const before=await style(row);
   if(!mobile){await row.hover();assert.notEqual((await style(row)).background,before.background);await page.mouse.move(1,1);assert.equal((await style(row)).background,before.background);}
   if(mobile)await row.tap();else await row.click();await page.locator('.penta-detail:not(.hidden)').waitFor();await page.locator('.penta-detail .gate-detail-close').click();
   await page.mouse.move(1,1);const after=await style(row);assert.equal(after.active,false);assert.equal(after.background,before.background);assert.equal(after.border,before.border);if(!after.focus)assert.equal(after.outline,'none');
   assert.ok(await page.locator('.penta-selected-target').count()>0,'left graph selection preserved');await row.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-${kind}-closed.png`});
   await row.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal((await style(row)).focus,true);assert.notEqual((await style(row)).outline,'none');
   await row.press('Enter');await page.locator('.penta-detail:not(.hidden)').waitFor();await page.keyboard.press('Escape');assert.equal(await row.evaluate(n=>n===document.activeElement),true);assert.equal((await style(row)).active,false);await row.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-${kind}-keyboard.png`});
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS gate/channel pointer hover resets, click/close no selected card fill/border, left graph selection preserved, focus-visible Enter/Escape return, mobile tap');
}finally{await browser.close();}
