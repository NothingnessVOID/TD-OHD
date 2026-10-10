import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
const base = process.env.E2E_URL || 'http://127.0.0.1:19964';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
const profiles = Array.from({ length: 6 }, (_, i) => ({ id: `team-test-${i}`, name: i < 2 ? 'Fictional same name' : `Fictional person ${i}`, birthDate: `${1990+i}-04-15`, birthTime: '12:00', timeUnknown: false, location: { timezone: 0 } }));
try {
 const page = await browser.newPage({viewport:{width:390,height:844}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,profiles})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(profiles));localStorage.setItem('ohd-language','en');localStorage.setItem('ohd-last-person-id',profiles[0].id);},{key:PROFILE_STORAGE_KEY,profiles});
 const enter=async()=>{await page.goto(base);await page.locator('#chart-view:not(.hidden)').waitFor({timeout:120000});await page.locator('#mobile-menu-toggle').click();await page.locator('[data-view="team"]').click();};
 const select=async ids=>{await page.locator('#team-add-saved-person').click();for(const id of ids)await page.locator(`[data-add-person="${id}"]`).click();await page.locator('#team-selection-confirm').click();};
 const ready=()=>page.waitForFunction(()=>document.querySelector('#team-content').getAttribute('aria-busy')==='false'&&document.querySelectorAll('.penta-channel-reading').length===6,{},{timeout:90000});
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ohd-teams-v1')).teams[0]);
 await enter();await select(profiles.slice(0,2).map(p=>p.id));
 assert.equal(await page.locator('.team-person-chip').count(),2);assert.equal(await page.locator('.penta-placeholder').count(),1);
 await select([profiles[2].id]);await ready();
 // Existing selections are checked once; confirming unchanged cannot duplicate identities.
 await page.locator('#team-add-saved-person').click();assert.equal(await page.locator(`[data-add-person="${profiles[2].id}"]`).getAttribute('aria-pressed'),'true');await page.locator('#team-selection-confirm').click();
 assert.equal(await page.locator('.team-person-chip').count(),3);
 await page.locator('#team-save').click();await page.locator('#team-save-name').fill('<Team & friends>');await page.locator('#team-save-form button[type=submit]').click();
 const saved=await stored();assert.equal(saved.schemaVersion,2);assert.equal(saved.kind,'penta');assert.equal(saved.members.length,3);assert.equal(JSON.stringify(saved).includes('birthDate'),false);assert.equal(JSON.stringify(saved).includes('chart'),false);assert.equal(await page.locator('#team-selected-chips script').count(),0);
 assert.equal(await page.locator('.penta-channel-reading').count(),6);assert.equal(await page.locator('.penta-gate').count(),12);assert.doesNotMatch(await page.locator('#team-content').innerText(),/Team Roles|Recommendations|Group Type/);
 await enter();await page.locator('#team-current').click();await page.locator(`[data-team="${saved.teamId}"][data-group="${saved.groups[0].pentaId}"]`).click();await ready();
 assert.equal(await page.locator('.team-person-chip').count(),3);assert.deepEqual((await stored()).members.map(m=>m.memberId),saved.members.map(m=>m.memberId));
 // The shared editor replaces quick rows: invalid drafts stay unsaved and cannot enter analysis.
 const count=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).length,PROFILE_STORAGE_KEY), before=await count();
 await page.locator('#team-add-saved-person').click();await page.locator('#team-person-create').click();assert.equal(await page.locator('#edit-time').inputValue(),'');await page.locator('#edit-name').fill('Fictional Quick');await page.locator('#edit-save').click();assert.equal(await page.locator('.person-editor').count(),1);assert.equal(await count(),before);
 await page.locator('#edit-date').fill('2000-02-29');await page.locator('#edit-save').click();assert.equal(await page.locator('.person-editor').count(),1);assert.equal(await count(),before);
 await page.locator('#edit-time').fill('10:00');if(!await page.locator('.person-editor .ps-manual').isVisible())await page.locator('.person-editor .ps-toggle').click();await page.locator('.person-editor .ps-manual').fill('0');
 assert.equal(await page.locator('.team-person-chip').count(),3);assert.equal((await stored()).members.length,3);
 await page.locator('#edit-save').click();await page.locator('.person-editor').waitFor({state:'detached'});assert.equal(await count(),before+1);assert.equal(await page.locator('.team-person-chip').count(),3);
 await page.locator('#team-selection-confirm').click();await ready();assert.equal(await page.locator('.team-person-chip').count(),4);await page.locator('#team-save').click();assert.equal(await page.locator('#team-save-name').inputValue(),'<Team & friends>');await page.locator('#team-save-form button[type=submit]').click();assert.equal((await stored()).members.length,4);
 for(const locale of ['zh-Hant','zh-CN']){await page.evaluate(async locale=>(await import('/src/lib/i18n.js')).setLocale(locale),locale);assert.equal(await page.locator('.team-person-chip').count(),4);assert.match(await page.locator('#team-current').innerText(),/<Team & friends>/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}
 assert.deepEqual(errors,[]);console.log('PASS Phase1B identity, 2/3 auto analysis, duplicate prevention, reference-only save/reload, editor validation/save, explicit selection, locales and 390px; skip=0');
}finally{await browser.close();}
