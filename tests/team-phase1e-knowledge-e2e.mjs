import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const base=process.env.E2E_URL;
assert.ok(base,'Set E2E_URL to the running app.');
const output=new URL('../docs/team/screenshots/phase1e-review/',import.meta.url).pathname;
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chrome',headless:true});
const people=Array.from({length:3},(_,i)=>({id:`phase1e-${i}`,name:`Member ${i+1}`,birthDate:`198${i}-05-16`,birthTime:'12:00',timeUnknown:false,location:{timezone:0,lat:null,lon:null,iana:null,name:null}}));
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try {
  await page.addInitScript(({key,people})=>{localStorage.setItem('ohd-language','en');localStorage.setItem(key,JSON.stringify(people));localStorage.setItem('ohd-last-person-id',people[0].id);},{key:PROFILE_STORAGE_KEY,people});
  await page.goto(base);
  await page.locator('#chart-view:not(.hidden)').waitFor({timeout:120000});
  const inventory=await page.evaluate(async()=>{const {listKnowledgeEntries,getKnowledgeEntry}=await import('/src/lib/knowledge/registry.js');return {original:listKnowledgeEntries().length,all:listKnowledgeEntries({includePenta:true}).length,gate:getKnowledgeEntry({objectType:'penta',objectId:'gate:31'}).summaryStatus};});
  assert.deepEqual(inventory,{original:70,all:91,gate:'missing'});
  await page.locator('.nav-link[data-view="team"]').click();
  for(const person of people){await page.locator('#team-person-picker').selectOption(person.id);await page.locator('#team-add-person').click();}
  await page.locator('#team-group-new').click();
  for(let i=0;i<3;i++)await page.locator('.team-member-card').nth(i).locator('.team-assign').click();
  await page.locator('#team-calculate').click();
  await page.locator('.penta-canvas').waitFor({timeout:90000});
  assert.equal(await page.locator('.penta-knowledge-nav button').count(),3);
  await page.locator('.penta-gate-hit[data-gate="31"]').click();
  await page.locator('.penta-detail [data-knowledge-id="hd.penta.gate.31"]').waitFor();
  assert.equal(await page.locator('.penta-detail .penta-structure-facts').count(),1);
  assert.equal(await page.locator('.penta-detail [data-detail-status="missing"]').count(),1);
  assert.match(await page.locator('.penta-detail').innerText(),/Verified structural sources/);
  assert.match(await page.locator('.penta-detail').innerText(),/Member|Contributors/);
  assert.match(await page.locator('.penta-detail').innerText(),/Specific interpretation has not been verified/);
  await page.locator('.penta-detail .gate-detail-card').screenshot({path:`${output}/penta-gate-31-en.png`});
  await page.locator('.penta-detail .gate-detail-close').click();
  await page.locator('.team-channel[data-channel="7-31"]').click();
  await page.locator('.penta-detail [data-knowledge-id="hd.penta.channel.7-31"]').waitFor();
  assert.equal(await page.locator('.penta-detail .penta-knowledge-sources a').count(),1);
  assert.equal(await page.locator('.penta-detail [data-detail-status="missing"]').count(),1);
  assert.match(await page.locator('.penta-detail').innerText(),/BG5 Semester 3/);
  await page.locator('.penta-detail .gate-detail-card').screenshot({path:`${output}/penta-channel-7-31-en.png`});
  await page.locator('.penta-detail .gate-detail-close').click();
  await page.locator('[data-penta-knowledge="introduction"]').click();
  await page.locator('.penta-detail [data-knowledge-id="hd.penta.introduction"]').waitFor();
  assert.match(await page.locator('.penta-detail').innerText(),/Sacral Center/);
  await page.locator('.penta-detail .gate-detail-close').click();
  await page.locator('[data-penta-knowledge="powerColumn"]').click();
  await page.locator('.penta-detail [data-knowledge-id="hd.penta.powerColumn"]').waitFor();
  assert.equal(await page.locator('.penta-detail .penta-knowledge-sources a').count(),3);
  assert.match(await page.locator('.penta-detail').innerText(),/G Center role gates/);
  await page.locator('.penta-detail .gate-detail-close').click();
  for(const locale of ['zh-CN','zh-Hant']) {
    await page.evaluate(async locale=>{const {setLocale}=await import('/src/lib/i18n.js');setLocale(locale,{persist:false});},locale);
    await page.locator('.penta-gate-hit[data-gate="31"]').click();
    await page.locator('.penta-detail [data-knowledge-id="hd.penta.gate.31"]').waitFor();
    assert.match(await page.locator('.penta-detail').innerText(),locale==='zh-CN'?/已核实结构资料/:/已核實結構資料/);
    assert.match(await page.locator('.penta-detail').innerText(),locale==='zh-CN'?/专属解读尚未核实/:/專屬解讀尚未核實/);
    await page.locator('.penta-detail .gate-detail-card').screenshot({path:`${output}/penta-gate-31-${locale}.png`});
    await page.locator('.penta-detail .gate-detail-close').click();
  }
  assert.deepEqual(errors,[]);
  console.log('Phase 1E browser: gate/channel/overview Knowledge, missing, sources and three locales passed.');
} finally {await browser.close();}
