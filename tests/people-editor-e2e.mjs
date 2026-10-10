import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
const browser = await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chromium',headless:true});
const base = process.env.E2E_URL || 'http://127.0.0.1:19961';
const profiles = ['a','b'].map((id,index)=>({id:`fictional-${id}`,name:`Fictional ${id}`,birthDate:`199${index}-04-15`,birthTime:'12:00',timeUnknown:false,createdAt:'2001-01-01T00:00:00.000Z',location:{timezone:0,iana:null,lat:null,lon:null,name:null}}));
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({key,profiles})=>{
    localStorage.setItem('ohd-language','en');localStorage.setItem(key,JSON.stringify(profiles));localStorage.setItem('ohd-last-person-id',profiles[0].id);
  },{key:PROFILE_STORAGE_KEY,profiles});
  await page.route('**/src/lib/chartdata.js', async route => {
    const response = await route.fetch();
    const source = (await response.text()).replace('async function computeChart(birth) {', 'async function computeChart(birth) { if (birth.name === "First") await new Promise(resolve => setTimeout(resolve, 1200));');
    await route.fulfill({response,body:source});
  });
  await page.goto(base);
  await page.locator('#chart-view:not(.hidden)').waitFor({timeout:120000});
  await page.locator('#people-switcher').selectOption('__edit');
  await page.locator('#edit-name').fill('Edited fictional');
  await page.locator('#edit-unknown').check();
  await page.locator('#edit-save').click();
  await page.waitForFunction(()=>document.querySelector('#type-banner')?.textContent.includes('Edited fictional'));
  const saved = await page.evaluate(async()=>{const p=await import('/src/lib/people.js');return p.getPerson('fictional-a');});
  assert.equal(saved.id,'fictional-a');assert.equal(saved.createdAt,profiles[0].createdAt);assert.equal(saved.location.timezone,0);assert.equal(saved.timeUnknown,true);assert.equal(saved.birthTime,'12:00');
  await page.locator('#people-switcher').selectOption('__edit');
  await page.locator('#edit-cancel').click();
  await page.evaluate(async()=>{
    const {openPersonEditor}=await import('/src/lib/person-editor.js');
    const p=await import('/src/lib/people.js');
    openPersonEditor({...p.birthFromPerson(p.getPerson('fictional-a')),timeUnknown:false,location:{name:'Fictional New York',iana:'America/New_York',lat:40.7,lon:-74,timezone:-5}});
  });
  await page.locator('#edit-date').fill('2000-07-15');
  await page.locator('#edit-save').click();
  await page.waitForFunction(async()=>{const p=await import('/src/lib/people.js');return p.getPerson('fictional-a').location.timezone===-4;});
  await page.waitForFunction(async()=>{const c=await import('/src/views/chart.js');return c.getCurrentChart().birth.timezone===-4;});
  await page.locator('#people-switcher').selectOption('__edit');
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='natalengine_profiles')throw new Error('Fictional quota failure');return window.originalSetItem.call(this,key,value);};});
  await page.locator('#edit-name').fill('Must not save');await page.locator('#edit-save').click();
  assert.equal(await page.locator('#edit-error').isVisible(),true);
  assert.match(await page.locator('#edit-error').innerText(),/quota/);
  await page.evaluate(()=>Storage.prototype.setItem=window.originalSetItem);
  await page.locator('#edit-cancel').click();
  await page.locator('.nav-link[data-view="connection"]').click();
  await page.locator('#conn-person').selectOption('fictional-b');await page.locator('#conn-calculate').click();
  await page.waitForFunction(()=>document.querySelector('#connection-content')?.textContent.includes('Fictional b'));
  await page.evaluate(async()=>{const p=await import('/src/lib/people.js');p.savePerson({...p.birthFromPerson(p.getPerson('fictional-b')),name:'Updated B',birthTime:'14:00'});});
  await page.waitForFunction(()=>document.querySelector('#connection-content')?.textContent.includes('Updated B'));
  await page.evaluate(async()=>{const p=await import('/src/lib/people.js');p.deletePerson('fictional-b');});
  assert.equal(await page.locator('#connection-content').innerText(),'');
  await page.evaluate(async()=>{const p=await import('/src/lib/people.js');const b=p.birthFromPerson(p.getPerson('fictional-a'));p.savePerson({...b,name:'First',birthTime:'01:00',timeUnknown:false});p.savePerson({...b,name:'Final',birthTime:'23:00',timeUnknown:false});});
  await page.waitForFunction(()=>document.querySelector('#type-banner')?.textContent.includes('Final'));
  assert.equal(await page.locator('.nav-link.active').getAttribute('data-view'),'connection');
  await page.waitForTimeout(1500); // The deliberately delayed first request has now returned.
  assert.equal(await page.evaluate(async()=>{const {getCurrentChart}=await import('/src/views/chart.js');return getCurrentChart().birth.birthTime;}),'23:00');
  const other = await context.newPage();
  await other.goto(base);
  await other.evaluate(async()=>{const p=await import('/src/lib/people.js');p.savePerson({...p.birthFromPerson(p.getPerson('fictional-a')),name:'Cross tab final'});});
  await page.waitForFunction(()=>document.querySelector('#type-banner')?.textContent.includes('Cross tab final'));
  await other.close();
  await page.locator('.nav-link[data-view="transits"]').click();
  await page.waitForFunction(async()=>{const t=await import('/src/views/transits.js');return !!t.getCurrentTransitExportData();});
  await page.evaluate(async()=>{
    const c=await import('/src/views/chart.js');c.showGateDetail(1);
    const p=await import('/src/lib/people.js');
    p.savePerson({...p.birthFromPerson(p.getPerson('fictional-a')),name:'Transit edited',birthTime:'18:00'});
  });
  assert.equal(await page.locator('#gate-detail').isVisible(),false);
  await page.waitForFunction(async()=>{const t=await import('/src/views/transits.js');const c=await import('/src/views/chart.js');return !!t.getCurrentTransitExportData() && c.getCurrentChart().birth.birthTime==='18:00';});
  assert.equal(await page.locator('.nav-link.active').getAttribute('data-view'),'transits');
  await page.evaluate(async()=>{
    const p=await import('/src/lib/people.js');window.peopleEvents=[];p.onPeopleChange(e=>window.peopleEvents.push(e));
    const before=p.getPerson('fictional-a');p.savePerson({...p.birthFromPerson(before),name:'Presentation only'});
  });
  const payload=await page.evaluate(()=>window.peopleEvents[0]);
  assert.equal(payload.type,'save');assert.equal(payload.calculationChanged,false);assert.equal(payload.presentationChanged,true);assert.equal(payload.personId,'fictional-a');
  await page.waitForFunction(()=>document.querySelector('#type-banner')?.textContent.includes('Presentation only'));
  assert.deepEqual(errors,[]);
  console.log('People editor E2E passed: stable identity, noon, UTC0, failure retention, B update/delete, consecutive saves and view preservation.');
} finally { await browser.close(); }
