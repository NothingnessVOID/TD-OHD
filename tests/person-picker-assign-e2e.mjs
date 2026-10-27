import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
const base = process.env.E2E_URL || 'http://127.0.0.1:9970';
const browser = await chromium.launch({ channel:'chromium', headless:true });
const page = await browser.newPage({ viewport:{ width:1440, height:960 } });
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
const people = Array.from({length:4},(_,i)=>({id:`assign-fictional-${i}`,name:`Assign Fictional ${i}`,birthDate:`199${i}-07-0${i+1}`,birthTime:'09:00',timeUnknown:false,location:{timezone:0},createdAt:3000+i}));
const chips = () => page.locator('.team-person-chip');
async function addToCurrent(id){
  await page.locator('#team-add-saved-person').click();
  await page.locator(`[data-add-person="${id}"]`).click();
  await page.locator('#team-selection-confirm').click();
  if (await page.locator('[data-confirm]').count()) await page.locator('[data-confirm]').click();
}
try {
 await page.addInitScript(({key,people})=>{localStorage.setItem(key,JSON.stringify(people));localStorage.setItem('ohd-language','en');localStorage.setItem('ohd-last-person-id',people[0].id);},{key:PROFILE_STORAGE_KEY,people});
 await page.goto(base); await page.locator('#chart-view:not(.hidden)').waitFor({timeout:120000});
 await page.locator('[data-view="team"]').click();
 await addToCurrent(people[0].id);
 await page.waitForFunction(()=>document.querySelectorAll('.team-person-chip').length===1);
 // second Penta holds person 1
 await page.locator('#team-current').click();
 await page.locator('#team-new-group').click();
 await page.locator('.team-control-dialog button[type=submit]').click();
 await addToCurrent(people[1].id);
 await page.waitForFunction(()=>document.querySelectorAll('.team-person-chip').length===1);
 // back to the first Penta; manage lists person 1 as assignable
 await page.locator('#team-current').click();
 await page.locator('[data-local-group]').first().click();
 await page.waitForFunction(()=>document.querySelectorAll('.team-person-chip').length===1);
 await page.locator('#team-manage').click();
 await page.locator(`[data-assign="${people[1].id}"]`).click();
 await page.locator('.modal.person-picker').waitFor();
 assert.match(await page.locator('#team-selection-count').innerText(), /2\/5/, 'assign preselects current member + the assignable person');
 assert.equal(await page.locator('.team-control-dialog').count(), 1, 'manage dialog closed before reopening');
 await page.locator('#team-selection-confirm').click();
 await page.locator('[data-confirm]').click();
 await page.waitForFunction(()=>document.querySelectorAll('.team-person-chip').length===2);
 // language switch closes an open picker instead of leaving stale text
 await page.locator('#team-add-saved-person').click();
 await page.locator('.modal.person-picker').waitFor();
 await page.evaluate(async()=>{ (await import('/src/lib/i18n.js')).setLocale('zh-Hant'); });
 await page.locator('.modal.person-picker').waitFor({state:'detached'});
 assert.equal(await chips().count(), 2);
 assert.deepEqual(errors, []);
 console.log('PASS manage assign reopens picker with draft; language switch closes it');
} finally { await browser.close(); }
