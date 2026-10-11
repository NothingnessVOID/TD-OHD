import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {PROFILE_STORAGE_KEY} from '../src/lib/profile-storage.js';
const base=process.env.E2E_URL||'http://127.0.0.1:19964';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chromium',headless:true});
const people=Array.from({length:3},(_,i)=>({id:`fictional-knowledge-${i}`,name:`Fictional ${i}`,birthDate:`198${i}-05-16`,birthTime:'12:00',location:{timezone:0}}));
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,people})=>{localStorage.setItem(key,JSON.stringify(people));localStorage.setItem('ohd-language','en');localStorage.setItem('ohd-last-person-id',people[0].id);},{key:PROFILE_STORAGE_KEY,people});
 await page.goto(base);await page.locator('#chart-view:not(.hidden)').waitFor({timeout:120000});
 const inventory=await page.evaluate(async()=>{const api=await import('/src/lib/knowledge/registry.js');return{original:api.listKnowledgeEntries().length,all:api.listKnowledgeEntries({includePenta:true}).length,gate:api.getKnowledgeEntry({objectType:'penta',objectId:'gate:31'}).summaryStatus};});assert.deepEqual(inventory,{original:70,all:99,gate:'available'});
 await page.locator('[data-view="team"]').click();await page.locator('#team-add-saved-person').click();for(const p of people)await page.locator(`[data-add-person="${p.id}"]`).click();await page.locator('#team-selection-confirm').click();await page.locator('.penta-channel-reading').first().waitFor({timeout:90000});
 assert.equal(await page.locator('.penta-background-note').count(),3);
 const detail=page.locator('.penta-detail');
 for(const locale of ['en','zh-CN','zh-Hant']){
  await page.evaluate(async locale=>(await import('/src/lib/i18n.js')).setLocale(locale,{persist:false}),locale);
  await page.locator('.penta-gate-hit[data-gate="31"]').click();await page.locator('.penta-detail:not(.hidden)').waitFor();assert.equal(await detail.locator('[data-shared-gate="31"]').count(),1);assert.equal(await detail.locator('[data-penta-activations]').count(),1);assert.equal(await detail.locator('[data-penta-specific]').count(),1);assert.doesNotMatch(await detail.innerText(),/hd\.penta\.|https?:|data-detail-status/);await page.keyboard.press('Escape');
  await page.locator('.penta-channel-hit[data-channel="7-31"]').click();assert.equal(await detail.locator('[data-penta-channel-state]').count(),1);assert.equal(await detail.locator('[data-penta-specific]').count(),1);assert.equal(await detail.locator('[data-shared-gate-select]').count(),2);await page.keyboard.press('Escape');
  // Editorial completion stays distinct from structural evidence and human approval.
  const evidence=await page.evaluate(async()=>{const api=await import('/src/lib/knowledge/registry.js');return ['gate:31','channel:7-31','powerColumn'].map(objectId=>{const e=api.getKnowledgeEntry({objectType:'penta',objectId});return{interpretation:e.properties.interpretationStatus,detail:e.detailStatus,approval:e.properties.editorialReview.humanApproval,sources:e.properties.sourceRefs.length>0};});});assert.deepEqual(evidence,Array.from({length:3},()=>({interpretation:'editorial-reviewed',detail:'available',approval:false,sources:true})));
  for(const id of ['introduction','powerColumn','contexts']){await page.locator(`[data-open-kind="knowledge"][data-open-id="${id}"]`).click();await page.locator('.penta-detail:not(.hidden)').waitFor();const expected=await page.evaluate(async id=>{const api=await import('/src/lib/knowledge/registry.js');return api.getKnowledgeDetail({objectType:'penta',objectId:id}).content;},id);assert.equal((await detail.locator('.knowledge-body').innerText()).replace(/\s+/g,' ').trim(),expected.replace(/\s+/g,' ').trim());await page.keyboard.press('Escape');}
 }
 assert.deepEqual(errors,[]);console.log('PASS 70/99 registry, three background sheets/locales, dedicated gate/channel articles, editorial evidence retained in registry; skip=0');
}finally{await browser.close();}
