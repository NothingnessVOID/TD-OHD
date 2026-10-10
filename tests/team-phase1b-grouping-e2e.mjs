import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
const base=process.env.E2E_URL||'http://127.0.0.1:19964';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chromium',headless:true});
const profiles=Array.from({length:8},(_,i)=>({id:`fictional-group-${i}`,name:`Fictional member ${i}`,birthDate:`${1988+i}-04-15`,birthTime:'12:00',timeUnknown:i===0,location:{timezone:0}}));
const invalid=[{...profiles[1],id:'no-zone',location:{timezone:null}},{...profiles[1],id:'bad-date',birthDate:'2001-02-29'},{...profiles[1],id:'no-time',birthTime:''},{...profiles[1],id:'bad-time',birthTime:'25:61'},{...profiles[1],id:'bad-zone',location:{timezone:19}}];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,people})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(people));localStorage.setItem('ohd-language','en');localStorage.setItem('ohd-last-person-id',people[3].id);window.__calls=0;const fetch=window.fetch.bind(window);window.fetch=(...args)=>{if(String(args[0]).includes('/engine'))window.__calls++;return fetch(...args);};},{key:PROFILE_STORAGE_KEY,people:[...profiles,...invalid]});
 const enter=async()=>{await page.goto(base);await page.locator('#chart-view:not(.hidden)').waitFor({timeout:120000});await page.locator('#mobile-menu-toggle').click();await page.locator('[data-view="team"]').click();};
 const ready=()=>page.waitForFunction(()=>document.querySelector('#team-content').getAttribute('aria-busy')==='false'&&document.querySelectorAll('.penta-channel-reading').length===6,{},{timeout:90000});
 const choose=async ids=>{await page.locator('#team-add-saved-person').click();const selected=await page.locator('[data-add-person][aria-pressed="true"]').evaluateAll(ns=>ns.map(n=>n.dataset.addPerson));for(const id of selected)await page.locator(`[data-add-person="${id}"]`).click();for(const id of ids)await page.locator(`[data-add-person="${id}"]`).click();await page.locator('#team-selection-confirm').click();if(await page.locator('[data-confirm]').count())await page.locator('[data-confirm]').click();};
 await enter();await choose([profiles[0].id,profiles[3].id,profiles[4].id]);await ready();assert.match(await page.locator('.penta-overview').innerText(),/estimated.*12:00/i);
 for(const [i,message]of [/timezone/i,/Birth details need correction/i,/Missing birth time/i,/Birth details need correction/i,/Birth details need correction/i].entries()){
  const before=await page.evaluate(()=>window.__calls);await choose([invalid[i].id,profiles[3].id,profiles[4].id]);await page.waitForFunction(()=>document.querySelector('#team-content').getAttribute('aria-busy')==='false');assert.match(await page.locator('#team-flow-status').innerText(),message);assert.equal(await page.evaluate(()=>window.__calls),before,'invalid saved data rejected before engine request');assert.equal(await page.locator('.penta-channel-reading').count(),0);
 }
 // Reset clears invalid drafts. Eight identities are distributed via two selection dialogs.
 await page.locator('#team-current').click();await page.locator('#team-temporary').click();await page.locator('[data-confirm]').click();
 await choose([profiles[0].id]);assert.equal(await page.locator('.penta-placeholder').count(),1);
 await choose(profiles.slice(0,3).map(p=>p.id));await ready();
 await page.locator('#team-current').click();const first=await page.locator('[data-local-group]').first().getAttribute('data-local-group');await page.locator('#team-new-group').click();await page.locator('.team-control-dialog input[name=group]').fill('Draft group name');await page.locator('.team-control-dialog button[type=submit]').click();
 await choose(profiles.slice(3,6).map(p=>p.id));await ready();await page.locator('#team-current').click();const second=await page.locator('[data-local-group]').last().getAttribute('data-local-group');await page.keyboard.press('Escape');
 const switchTo=async id=>{await page.locator('#team-current').click();await page.locator(`[data-local-group="${id}"]`).click();};
 for(const[a,b]of [[3,3],[3,4],[4,4],[3,5]]){
  await switchTo(first);await choose(profiles.slice(0,a).map(p=>p.id));await ready();assert.equal(await page.locator('.team-person-chip').count(),a);
  await switchTo(second);await choose(profiles.slice(a,a+b).map(p=>p.id));await ready();assert.equal(await page.locator('.team-person-chip').count(),b);
 }
 // Moving an assigned person requires confirmation; cancel preserves both groups.
 await page.locator('#team-add-saved-person').click();await page.locator(`[data-add-person="${profiles[7].id}"]`).click();await page.locator(`[data-add-person="${profiles[0].id}"]`).click();await page.locator('#team-selection-confirm').click();assert.equal(await page.locator('[data-confirm]').count(),1);await page.locator('.operation-confirm [data-close]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.team-person-chip').count(),5);
 await page.locator('#team-save').click();await page.locator('#team-save-name').fill('Fictional grouping');await page.locator('#team-save-form button[type=submit]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ohd-teams-v1')).teams[0]);assert.equal(saved.members.length,8);assert.deepEqual(saved.groups.map(g=>g.memberIds.length),[3,5]);assert.equal(JSON.stringify(saved).includes('birthDate'),false);
 await enter();await page.locator('#team-current').click();assert.equal(await page.locator(`[data-team="${saved.teamId}"]`).count(),2);await page.locator(`[data-team="${saved.teamId}"][data-group="${second}"]`).click();await ready();assert.match(await page.locator('#team-current').innerText(),/Draft group name/);assert.equal(await page.locator('.team-person-chip').count(),5);
 // An incomplete editor draft cannot be saved even while outside the selected Penta.
 await page.locator('#team-add-saved-person').click();await page.locator('#team-person-create').click();await page.locator('#edit-name').fill('Fictional missing time');await page.locator('#edit-date').fill('2000-05-16');const before=await page.evaluate(()=>window.__calls);await page.locator('#edit-save').click();assert.equal(await page.locator('.person-editor').count(),1);assert.equal(await page.evaluate(()=>window.__calls),before);await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 for(const locale of ['zh-Hant','zh-CN','en']){await page.evaluate(async locale=>(await import('/src/lib/i18n.js')).setLocale(locale),locale);assert.equal(await page.locator('.team-person-chip').count(),5);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ohd-teams-v1')).teams[0].members.length),8);}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);console.log('PASS five validation guards, noon estimate, 1/3/5 limits, 3+3/3+4/4+4/3+5, move cancellation, 8 identities, persistence, editor guard, locales/mobile; skip=0');
}finally{await browser.close();}
