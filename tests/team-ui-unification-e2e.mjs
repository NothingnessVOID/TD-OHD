import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SKINS } from '../src/lib/skin-registry.js';
const base=(process.env.E2E_URL||'http://127.0.0.1:19964').replace(/\/$/,'');
const output=path.resolve(process.env.SCREENSHOT_DIR||'artifacts/visual-review/unification');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chromium',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:960},locale:'zh-CN',reducedMotion:'reduce'});page.setDefaultTimeout(15000);
const errors=[],observations=[],images=[];page.on('pageerror',e=>errors.push(e.message));
const panelStyle=selector=>page.locator(selector).first().evaluate(n=>{const s=getComputedStyle(n);return Object.fromEntries(['backgroundColor','borderRadius','borderTopColor','borderTopWidth','boxShadow','paddingTop','paddingLeft'].map(k=>[k,s[k]]));});
async function shot(name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});images.push(name);}
async function settled(){await page.waitForFunction(()=>document.querySelector('#team-content').getAttribute('aria-busy')==='false'&&document.querySelectorAll('.penta-gate-reading').length===12,{},{timeout:90000});}
async function language(code){if(!await page.locator('#more-menu').evaluate(n=>n.open))await page.locator('#more-toggle').click();if(!await page.locator('#language-menu').evaluate(n=>n.open))await page.locator('#language-menu summary').click();await page.locator(`[data-language="${code}"]`).click();if(await page.locator('#more-menu').evaluate(n=>n.open))await page.locator('#more-toggle').click();}
async function skin(id){if(!await page.locator('#more-menu').evaluate(n=>n.open))await page.locator('#more-toggle').click();await page.locator('#skin-settings-button').click();await page.locator(`#skin-picker [data-skin-id="${id}"]`).click();await page.locator('#skin-settings-close').click();if(await page.locator('#more-menu').evaluate(n=>n.open))await page.locator('#more-toggle').click();}
async function openGate(){await page.locator('.penta-gate-reading[data-detail-id="31"]').click();await page.locator('.penta-detail:not(.hidden)').waitFor();}
try{
 await page.goto(base+'/dev/test-people.html');await page.locator('#import:not([disabled])').click();await page.goto(base);await page.locator('#chart-view:not(.hidden)').waitFor({timeout:90000});
 const birthPanel=await panelStyle('#chart-view .panel');await shot('01-birth-panels');
 await page.locator('#bodygraph-container .bg-gate[data-gate="31"]').click();await page.locator('#gate-detail:not(.hidden)').waitFor();const birthGate=await page.locator('#gate-detail .tl-detail-heading .detail-name').innerText();await shot('02-birth-gate');
 await page.locator('#gate-detail [data-channel="7-31"]').click();const birthChannel=await page.locator('#gate-detail .channel-detail-heading').innerText();await shot('03-birth-channel');await page.keyboard.press('Escape');
 await page.locator('.nav-link[data-view="transits"]').click();await page.locator('#transits-view:not(.hidden)').waitFor();await shot('04-transit-panels');
 await page.locator('.nav-link[data-view="team"]').click();await page.locator('#team-add-saved-person').click();
 for(let i=1;i<=3;i++)await page.locator(`[data-add-person="td-ohd-fictional-0${i}"]`).click();
 assert.equal(await page.locator('.team-person-chip').count(),0,'selection stays draft');await shot('05-add-people');
 await page.locator('#team-person-search').fill('td-ohd-fictional-02');await page.locator('[data-edit-person="td-ohd-fictional-02"]').click();await shot('06-person-editor');await page.keyboard.press('Escape');
 assert.equal(await page.locator('#team-person-search').inputValue(),'td-ohd-fictional-02');assert.match(await page.locator('#team-selection-count').innerText(),/3\/5/);
 await page.locator('#team-selection-confirm').click();await settled();
 assert.deepEqual(await panelStyle('#team-analysis .panel'),birthPanel,'Team uses exact shared panel surface and padding');
 const left=await page.locator('.team-graph-column').boundingBox();const first=await page.locator('#team-analysis .panel').first().boundingBox();assert.ok(Math.abs(left.y-first.y)<2,'visible panels aligned');
 await shot('07-team-scroll-start');
 await page.locator('.team-results').hover();await page.mouse.wheel(0,600);await page.waitForFunction(()=>scrollY>300);await shot('08-team-scroll-middle');
 const after=await page.locator('.team-graph-column').boundingBox();assert.ok(after.y>=56&&after.y<90);assert.ok(await page.evaluate(()=>scrollY)>300);
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await shot('09-team-scroll-end');
 const bounds=await page.locator('.team-results').evaluate(n=>{const last=n.querySelector('.panel:last-child').getBoundingClientRect(),host=n.getBoundingClientRect();return {lastBottom:last.bottom,hostBottom:host.bottom,scrollable:n.scrollHeight>n.clientHeight,overflow:n.scrollWidth>n.clientWidth};});assert.ok(Math.abs(bounds.hostBottom-bounds.lastBottom)<2);assert.equal(bounds.scrollable,false);assert.equal(bounds.overflow,false);
 await page.locator('.penta-gate-hit[data-gate="31"]').click();await page.locator('.penta-detail:not(.hidden) [data-shared-gate="31"]').waitFor();await shot('10-graph-reading-link');
 const scroll=await page.evaluate(()=>scrollY);assert.equal(await page.locator('.penta-detail .detail-name').innerText(),birthGate);await shot('11-penta-gate');
 for(const lens of ['iching','gk','meridian','hd']){await page.locator(`.penta-detail [data-shared-lens="${lens}"]`).click();assert.equal(await page.locator(`.penta-detail [data-shared-lens="${lens}"]`).getAttribute('aria-pressed'),'true');}
 await page.locator('.penta-detail [data-shared-channel-select="7-31"]').click();assert.equal(await page.locator('.penta-detail .channel-detail-heading').innerText(),birthChannel);assert.equal(await page.locator('.penta-detail .channel-detail-heading .circuit-badge').count(),2);await shot('12-penta-channel');
 await page.locator('.penta-detail [data-shared-back]').click();assert.equal(await page.locator('.penta-detail [data-shared-gate="31"]').count(),1);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>scrollY),scroll);
 assert.equal(await page.locator('.penta-gate-hit[data-gate="31"]').evaluate(n=>n===document.activeElement),true);
 await page.locator('#team-save').click();await shot('13-save');await page.keyboard.press('Escape');await page.locator('#team-current').click();await shot('14-switcher');await page.keyboard.press('Escape');await page.locator('#team-manage').click();await shot('15-manage');await page.keyboard.press('Escape');
 for(const width of [1280,1024,430,390,320]){await page.setViewportSize({width,height:width===1280?720:844});await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.team-results').scrollTop=0;});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await shot(`16-analysis-${width}`);}
 await page.setViewportSize({width:390,height:844});await openGate();await shot('17-mobile-gate');await page.locator('.penta-detail [data-shared-channel-select="7-31"]').click();await shot('18-mobile-channel');await page.keyboard.press('Escape');
 await page.locator('#team-add-saved-person').click();await shot('19-mobile-picker');await page.locator('#team-person-search').fill('td-ohd-fictional-01');await page.locator('[data-edit-person="td-ohd-fictional-01"]').click();await shot('20-mobile-editor');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.setViewportSize({width:1440,height:960});await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.team-results').scrollTop=0;});
 for(const code of ['en','zh-Hant','zh-CN']){await language(code);await settled();await shot(`21-language-${code}`);await page.locator('#team-add-saved-person').click();await shot(`22-picker-${code}`);await page.keyboard.press('Escape');}
 for(const item of SKINS){await skin(item.id);await shot(`23-skin-${item.id}`);const shared=await panelStyle('#team-analysis .panel'),original=await panelStyle('#chart-view .panel');assert.deepEqual(shared,original,item.id+' panel semantics');await page.locator('#team-add-saved-person').click();const dialog=await page.locator('.operation-dialog').evaluate(n=>({overflow:n.scrollWidth>n.clientWidth+1,background:getComputedStyle(n).backgroundColor}));assert.equal(dialog.overflow,false);observations.push({skin:item.id,shared,dialog});if(['default-dark','high-contrast','midnight-contrast'].includes(item.id))await shot(`24-picker-${item.id}`);await page.keyboard.press('Escape');}
 await skin('default-light');assert.deepEqual(errors,[]);
 await writeFile(path.join(output,'observations.json'),JSON.stringify({base,errors,birthPanel,bounds,observations,images},null,2));
 console.log(`PASS shared panel equality, scroll edges/linkage, birth/Penta headings, lenses/navigation, selection draft/editor return, responsive layouts, 3 languages and ${SKINS.length} Skins. ${images.length} screenshots in ${output}`);
}catch(error){await page.screenshot({path:path.join(output,'failure.png'),animations:'disabled'}).catch(()=>{});throw error;}finally{await browser.close();}
