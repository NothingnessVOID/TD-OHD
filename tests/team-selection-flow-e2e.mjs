import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
const browser = await chromium.launch({channel:'chromium',headless:true});
const context = await browser.newContext({viewport:{width:1440,height:960}});
const page = await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
const people=Array.from({length:7},(_,i)=>({id:`fictional-flow-${i}`,name:i<2?'Fictional same':`Fictional ${i}`,birthDate:`198${i}-05-16`,birthTime:i===0?'':'10:00',timeUnknown:i===0,location:{timezone:0},createdAt:1000+i}));
const output='test-results/team-flow'; await mkdir(output,{recursive:true});
try {
 await page.addInitScript(({key,people})=>{localStorage.setItem(key,JSON.stringify(people));localStorage.setItem('ohd-language','en');localStorage.setItem('ohd-last-person-id',people[2].id);},{key:PROFILE_STORAGE_KEY,people});
 await page.goto(process.env.E2E_URL || process.env.PREVIEW_URL || 'http://127.0.0.1:9961'); await page.locator('#chart-view:not(.hidden)').waitFor({timeout:120000}); await page.locator('[data-view="team"]').click();
 const chips=page.locator('.team-person-chip');
 assert.equal(await chips.count(),0); assert.equal(await page.locator('.penta-placeholder svg').count(),1);
 await page.locator('#team-add-saved-person').click();
 await page.locator(`[data-add-person="${people[0].id}"]`).click(); await page.locator(`[data-add-person="${people[1].id}"]`).click();
 assert.equal(await chips.count(),0); assert.match(await page.locator('#team-selection-count').innerText(),/2\/5/);
 await page.locator('#team-person-search').fill(people[1].id); await page.locator(`[data-edit-person="${people[1].id}"]`).click(); await page.keyboard.press('Escape');
 assert.equal(await page.locator('#team-person-search').inputValue(),people[1].id); assert.match(await page.locator('#team-selection-count').innerText(),/2\/5/);
 await page.keyboard.press('Escape'); assert.equal(await chips.count(),0); assert.equal(await page.locator('#team-add-saved-person').evaluate(n=>n===document.activeElement),true); assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 const add=async i=>{await page.locator('#team-add-saved-person').click();await page.locator('#team-person-search').fill(people[i].id);await page.locator(`[data-add-person="${people[i].id}"]`).click();await page.locator('#team-selection-confirm').click();};
 await add(0); assert.equal(await chips.count(),1); assert.equal(await chips.locator('small').count(),1);
 await add(1); assert.equal(await chips.count(),2); assert.equal(await page.locator('.penta-placeholder').count(),1);
 await add(2); await page.locator('.penta-render:not(.penta-placeholder)').waitFor({timeout:90000});
 await page.screenshot({path:`${output}/desktop-three.png`,fullPage:true});
 await add(3); await add(4); await page.waitForFunction(()=>document.querySelector('#team-content').getAttribute('aria-busy')==='false');
 await page.locator('#team-add-saved-person').click(); assert.equal(await page.locator('.team-control-dialog').count(),1); assert.match(await page.locator('#team-selection-count').innerText(),/5\/5/); await page.locator(`[data-add-person="${people[0].id}"]`).click(); await page.locator(`[data-add-person="${people[5].id}"]`).click(); assert.equal(await chips.count(),5); await page.keyboard.press('Escape'); assert.equal(await chips.locator('small').count(),1);
 await page.locator('#team-save').click(); await page.locator('#team-save-name').fill('Fictional Team'); await page.locator('#team-save-form button[type=submit]').click();
 const saved=await page.evaluate(async()=> (await import('/src/lib/team-repository.js')).listTeams()[0]); assert.equal(saved.members.length,5);
 await page.locator('#team-current').click(); await page.locator('#team-new-group').click(); await page.locator('.team-control-dialog button[type=submit]').click(); assert.equal(await chips.count(),0);
 await page.locator('#team-add-saved-person').click(); await page.locator(`[data-add-person="${people[0].id}"]`).click(); await page.locator(`[data-add-person="${people[1].id}"]`).click(); await page.locator('#team-selection-confirm').click(); assert.equal(await chips.count(),0); assert.match(await page.locator('.operation-message').innerText(),/\n/); await page.locator('.operation-confirm [data-close]').click(); assert.equal(await chips.count(),0); await page.locator('.team-control-dialog [data-close]').first().click();
 await add(0); await page.locator('[data-confirm]').click(); assert.equal(await chips.count(),1);
 await add(5); await add(6);
 await page.locator('#team-save').click(); await page.locator('#team-save-form button[type=submit]').click();
 const moved=await page.evaluate(async()=> (await import('/src/lib/team-repository.js')).listTeams()[0]); assert.equal(moved.members.length,7); assert.deepEqual(moved.groups.map(g=>g.memberIds.length),[4,3]); assert.equal(moved.members[0].memberId,saved.members[0].memberId);
 await page.locator('#team-current').click(); await page.locator(`[data-local-group="${saved.groups[0].pentaId}"]`).click(); assert.equal(await chips.count(),4);
 await page.locator('#team-add-saved-person').click();await page.locator('#team-person-search').fill('Fictional same'); assert.equal(await page.locator('.team-picker-row').count(),2);
 await page.locator(`[data-edit-person="${people[1].id}"]`).click(); assert.equal(await page.locator('.team-control-dialog').count(),0); assert.equal(await page.locator('.person-editor').count(),1);
 await page.locator('#edit-name').fill('Fictional renamed');await page.locator('#edit-save').click(); await page.locator('.person-editor').waitFor({state:'detached'}); assert.match(await page.locator('#team-selected-chips').innerText(),/Fictional renamed/); assert.equal(await page.locator('#team-person-search').inputValue(),'Fictional same'); await page.keyboard.press('Escape');
 const edited=await page.evaluate(async id=>(await import('/src/lib/people.js')).getPerson(id),people[1].id); assert.equal(edited.id,people[1].id); assert.equal(edited.createdAt,1001);
 await page.locator('#team-add-saved-person').click(); await page.locator('#team-person-create').click(); assert.equal(await page.locator('#edit-time').inputValue(),''); assert.equal(await page.locator('#edit-unknown').isChecked(),false);
 await page.locator('#edit-name').fill('Fictional created'); await page.locator('#edit-date').fill('2000-05-16'); await page.locator('#edit-save').click(); assert.equal(await page.locator('.person-editor').count(),1);
 await page.locator('#edit-unknown').check(); if (!(await page.locator('.person-editor .ps-manual').isVisible())) await page.locator('.person-editor .ps-toggle').click(); await page.locator('.person-editor .ps-manual').fill('0'); await page.locator('#edit-save').click(); await page.locator('.person-editor').waitFor({state:'detached'}); assert.equal(await chips.count(),4); await page.locator('#team-selection-confirm').click(); assert.equal(await chips.count(),5);
 await page.waitForFunction(()=>document.querySelector('#team-content').getAttribute('aria-busy')==='false');
 await page.evaluate(async id=>(await import('/src/lib/people.js')).deletePerson(id),people[3].id); await page.waitForFunction(()=>document.querySelector('#team-flow-status').textContent.includes('Missing reference')); assert.equal(await chips.count(),5);
 await page.setViewportSize({width:390,height:844}); assert.equal(await page.locator('#team-view').isVisible(),true); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false); await page.screenshot({path:`${output}/mobile-controls.png`,fullPage:true});
 await page.locator('#team-current').click(); await page.locator('#team-temporary').click(); await page.locator('[data-confirm]').click();
 await add(5); await page.locator('#team-save').click(); await page.locator('#team-save-target').selectOption(saved.teamId); await page.locator('#team-save-form button[type=submit]').click(); await page.locator('[data-confirm]').click();
 const imported=await page.evaluate(async()=> (await import('/src/lib/team-repository.js')).listTeams()[0]); assert.equal(imported.groups.length,3); assert.equal(imported.members.find(m=>m.personId===people[5].id).memberId,moved.members.find(m=>m.personId===people[5].id).memberId);
 await page.locator('#team-add-saved-person').click(); await page.locator(`[data-add-person="${people[0].id}"]`).click(); await page.locator('#team-selection-confirm').click();
 const beforeConflict = await page.locator('#team-selected-chips').innerText();
 await page.evaluate(async id=>{ const api=await import('/src/lib/team-repository.js'); api.saveTeam({...api.getTeam(id),name:'Fictional conflict'}); },saved.teamId);
 await page.locator('[data-confirm]').click(); assert.equal(await page.locator('#team-selected-chips').innerText(),beforeConflict); assert.match(await page.locator('.team-layer-error').innerText(),/revision/i); await page.keyboard.press('Escape');
 await page.locator('#team-save').click();
 await page.evaluate(async id=>{const api=await import('/src/lib/team-repository.js');const current=api.getTeam(id);api.saveTeam({...current,name:'Fictional external'});},saved.teamId);
 await page.locator('#team-save-form button[type=submit]').click(); assert.match(await page.locator('.team-layer-error').innerText(),/revision/i); assert.equal(await page.locator('.team-control-dialog').count(),1);
 await page.keyboard.press('Escape'); assert.equal(await page.locator('.team-control-dialog').count(),0);
 await page.locator('#team-add-saved-person').click();
 for (const [language,skin] of [['en','default-light'],['zh-CN','default-dark'],['zh-Hant','high-contrast']]) {
  await page.evaluate(async ({language,skin})=>{ const i18n=await import('/src/lib/i18n.js'); i18n.setLocale(language); document.documentElement.dataset.skin=skin; },{language,skin});
  // Reopen to read translated operation labels.
  await page.keyboard.press('Escape'); await page.locator('#team-add-saved-person').click();
  assert.equal(await page.locator('#team-selection-confirm').boundingBox().then(b=>b.height>=44),true);
  await page.screenshot({path:`${output}/picker-${language}-${skin}.png`,fullPage:true});
 }
 await page.keyboard.press('Escape');
 const skins=await page.evaluate(async()=> (await import('/src/lib/skin-registry.js')).SKINS.map(s=>s.id));
 for (const skin of skins) {
  await page.evaluate(skin=>document.documentElement.dataset.skin=skin,skin); await page.locator('#team-add-saved-person').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  assert.equal(await page.locator('.operation-dialog').evaluate(n=>n.scrollWidth>n.clientWidth+2),false);
  await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]); console.log('PASS 0/1/2/3/5 automatic flow, chips, search, editor create/edit, identity, new/existing save, move cancel/accept, delete invalidation, mobile');
} finally {await context.close();await browser.close();}
