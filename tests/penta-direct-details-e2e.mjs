import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
const base=process.env.E2E_URL||'http://127.0.0.1:9961',out='artifacts/visual-review/penta-direct-details';await mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chromium',headless:true});const p=await b.newPage({viewport:{width:1440,height:960},locale:'zh-CN',reducedMotion:'reduce',hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
async function shot(name){await p.screenshot({path:`${out}/${name}.png`,animations:'disabled'});}
async function openClose(trigger,key){await trigger.scrollIntoViewIfNeeded();await trigger.focus();const y=await p.evaluate(()=>scrollY);if(key)await trigger.press(key);else await trigger.click();await p.locator('.penta-detail:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>scrollY),y);await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>scrollY),y);assert.equal(await trigger.evaluate(n=>n===document.activeElement),true);}
try{
 await p.goto(base+'/dev/test-people.html');await p.locator('#import:not([disabled])').click();await p.goto(base);await p.locator('.nav-link[data-view="team"]').click();await p.locator('#team-add-saved-person').click();for(let i=1;i<=5;i++)await p.locator(`[data-add-person="td-ohd-fictional-0${i}"]`).click();await p.locator('#team-selection-confirm').click();await p.waitForFunction(()=>document.querySelectorAll('.penta-channel-reading').length===6&&document.querySelector('#team-content').getAttribute('aria-busy')==='false');
 assert.equal(await p.locator('.penta-analysis-card[role="button"][tabindex="0"]').count(),18);assert.equal(await p.locator('.penta-analysis-card button, .penta-analysis-card a').count(),0);
 await shot('01-desktop');
 for(const target of ['.penta-gate-hit[data-gate="14"]','.penta-channel-hit[data-channel="2-14"]','.penta-channel-reading[data-detail-id="2-14"]','.penta-gate-reading[data-detail-id="14"]','.penta-gate-reference'])await openClose(p.locator(target).first());
 await openClose(p.locator('.penta-channel-reading').first(),'Enter');await openClose(p.locator('.penta-gate-reading').first(),'Space');
 // The SVG line itself shares the button route, without focusing an offscreen analysis row.
 await p.evaluate(()=>scrollTo(0,500));const line=p.locator('.penta-edge[data-channel="7-31"] .penta-hit');const y=await p.evaluate(()=>scrollY);await line.dispatchEvent('click');await p.locator('.penta-detail:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>scrollY),y);await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>scrollY),y);
 for(const locale of ['en','zh-Hant','zh-CN']){
  if(!await p.locator('#more-menu').evaluate(n=>n.open))await p.locator('#more-toggle').click();if(!await p.locator('#language-menu').evaluate(n=>n.open))await p.locator('#language-menu summary').click();await p.locator(`[data-language="${locale}"]`).click();if(await p.locator('#more-menu').evaluate(n=>n.open))await p.locator('#more-toggle').click();
  const expected=await p.evaluate(async()=>{const {channelName}=await import('/src/lib/vocabulary.js');const {t}=await import('/src/lib/i18n.js');return ['7-31','1-8','13-33','5-15','2-14','29-46'].map(id=>({id,name:channelName(id),label:t('Channel {channel}',{channel:id.replace('-','–')})}));});
  for(const item of expected){const card=p.locator(`.penta-channel-reading[data-detail-id="${item.id}"]`);assert.equal(await card.locator('.detail-name').innerText(),item.name);assert.equal(await card.locator('.detail-label').textContent(),item.label);}
  await p.locator('.penta-channel-reading').first().scrollIntoViewIfNeeded();await shot(`02-titles-${locale}`);
 }
 // Exercise actual coverage calculation to produce all four statuses; compare every visible icon.
 await p.evaluate(async()=>{
  const {analyzePentaStructure}=await import('/src/lib/human-design/penta-structure.js');const {TEAM_PLANETS}=await import('/src/lib/human-design/team-activation.js');const {createPentaMatrix}=await import('/src/views/penta-matrix.js');const {pentaDetailAdapter}=await import('/src/lib/shared-object-details.js');
  const activated=[[7,31,1,13,33],[8,13],[33]];
  const members=activated.map((values,i)=>({memberId:'symbol-'+i,chart:{gates:{personality:Object.fromEntries(TEAM_PLANETS.map((planet,j)=>[planet,{gate:values[j]||64,line:1,planet}])),design:Object.fromEntries(TEAM_PLANETS.map(planet=>[planet,{gate:64,line:1,planet}]))}}}));
  const host=document.createElement('div');host.id='symbol-proof';document.querySelector('#team-view').append(host);const result=analyzePentaStructure(members);window.__symbolResult=result.channels;createPentaMatrix(host,{result,people:members.map(m=>({memberId:m.memberId,displayName:m.memberId})),groupLabel:'Fictional state proof',detailAdapter:pentaDetailAdapter});
 });
 const states=await p.evaluate(()=>window.__symbolResult.map(c=>({id:c.channelId,status:c.status})));assert.equal(new Set(states.map(s=>s.status)).size,4);
 for(const{ id,status}of states){assert.equal(await p.locator(`#symbol-proof .penta-edge[data-channel="${id}"] [data-penta-state]`).getAttribute('data-penta-state'),status);assert.equal(await p.locator(`#symbol-proof .penta-channel-reading[data-detail-id="${id}"] [data-penta-state]`).getAttribute('data-penta-state'),status);assert.equal(await p.locator(`#symbol-proof .penta-state-legend [data-penta-state="${status}"]`).count(),1);}
 await p.locator('#symbol-proof .penta-state-legend').screenshot({path:`${out}/03-four-states.png`});
 await p.evaluate(()=>document.querySelector('#symbol-proof').remove());
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>scrollTo(0,0));await shot('04-mobile');await openClose(p.locator('.penta-gate-hit[data-gate="14"]'),'Enter');
 const row=p.locator('.penta-channel-reading').first();await row.scrollIntoViewIfNeeded();const mobileY=await p.evaluate(()=>scrollY);await row.tap();await p.locator('.penta-detail:not(.hidden)').waitFor();await shot('05-mobile-detail');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>scrollY),mobileY);assert.deepEqual(errors,[]);
 console.log('PASS 18 accessible cards, no nested buttons, graph/line/shortcut direct details, Enter/Space, scroll/focus return, six titles in 3 locales, computed four-state symbols, mobile');
}finally{await b.close();}
