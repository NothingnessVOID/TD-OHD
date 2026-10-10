import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { SKINS } from '../src/lib/skin-registry.js';
const base = process.env.PREVIEW_URL || process.env.E2E_URL || 'http://127.0.0.1:9961';
const output = path.resolve(process.env.SCREENSHOT_DIR || 'artifacts/visual-review/final');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel:process.env.CHROME_CHANNEL || 'chrome', headless:true });
const context = await browser.newContext({ viewport:{width:1440,height:960}, locale:'zh-CN', reducedMotion:'reduce' });
const page = await context.newPage(); page.setDefaultTimeout(15000);
const errors=[], records=[]; page.on('pageerror', error=>errors.push(error.message));
const geometry = () => page.evaluate(() => {
 const rect=selector=>{const r=document.querySelector(selector)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}:null;};
 return {width:innerWidth,height:innerHeight,windowY:scrollY,overflow:document.documentElement.scrollWidth>innerWidth+1,left:rect('.team-graph-column'),right:rect('.team-results'),canvas:rect('#team-content .penta-canvas'),firstPanel:rect('#team-analysis .panel'),rightScroll:document.querySelector('.team-results')?.scrollTop,gateCount:document.querySelectorAll('.penta-gate-reading').length,channelCount:document.querySelectorAll('.penta-channel-reading').length,gateOrder:[...document.querySelectorAll('.penta-gate-reading')].map(n=>Number(n.dataset.detailId)),contentIds:document.querySelectorAll('#team-content').length};
});
async function shot(name) { await page.evaluate(()=>document.fonts.ready); const file=path.join(output,name+'.png'); await page.screenshot({path:file,animations:'disabled'});const state=await geometry();records.push({name,file,...state});console.log(JSON.stringify({name,file,...state})); }
async function settled(){await page.waitForFunction(()=>document.querySelector('#team-content')?.getAttribute('aria-busy')==='false'&&document.querySelectorAll('.penta-channel-reading').length===6,{},{timeout:90000});}
async function add(id){await page.locator('#team-add-saved-person').click();await page.locator('#team-person-search').fill(id);await page.locator(`[data-add-person="${id}"]`).click();await page.locator('#team-selection-confirm').click();}
async function locale(code){if(!(await page.locator('#more-menu').evaluate(n=>n.open)))await page.locator('#more-toggle').click();if(!(await page.locator('#language-menu').evaluate(n=>n.open)))await page.locator('#language-menu summary').click();await page.locator(`[data-language="${code}"]`).click();if(await page.locator('#more-menu').evaluate(n=>n.open))await page.locator('#more-toggle').click();}
try {
 await page.goto(base+'/dev/test-people.html');await page.locator('#import:not([disabled])').click();
 await page.evaluate(()=>localStorage.removeItem('ohd-last-person-id'));
 await page.goto(base);await page.locator('.nav-link[data-view="team"]').click();
 await page.locator('#team-view:not(.hidden) .penta-placeholder').waitFor();
 await shot('01-empty-no-global-chart');
 for(const id of ['td-ohd-fictional-01','td-ohd-fictional-02','td-ohd-fictional-03'])await add(id);
 await settled();await shot('02-desktop-three');
 const before=await geometry();assert.equal(before.contentIds,1);assert.equal(before.channelCount,6);assert.equal(before.gateCount,12);assert.deepEqual(before.gateOrder,[31,8,33,7,1,13,15,2,46,5,14,29]);
 assert.ok(Math.abs(before.canvas.height/before.canvas.width-410/320)<.01);
 assert.ok(Math.abs(before.left.y-before.firstPanel.y)<2, 'graph and reading start aligned');assert.ok(before.canvas.bottom<960);
 await page.locator('.team-results').hover();await page.mouse.wheel(0,650);await page.waitForFunction(()=>scrollY>300);
 const scrolled=await geometry();assert.ok(scrolled.windowY>before.windowY);assert.equal(scrolled.rightScroll,0);assert.ok(scrolled.left.y>=56&&scrolled.left.y<90);
 await shot('03-document-scroll');
 await page.locator('.penta-gate-hit[data-gate="31"]').click();
 await page.locator('.penta-detail:not(.hidden) [data-shared-gate="31"]').waitFor();
 assert.equal(await page.locator('.penta-detail:not(.hidden)').count(),1);
 await shot('04-graph-gate-link');
 const scrollBeforePopup=scrolled.windowY;
 assert.equal((await geometry()).windowY,scrollBeforePopup);await page.locator('.penta-detail:not(.hidden)').waitFor();
 assert.equal(await page.locator('.gate-detail:not(.hidden)').count(),1);await shot('05-gate-dialog');
 await page.locator('.penta-detail [data-shared-lens="meridian"]').click();await page.locator('.penta-detail .meridian-reading').waitFor();await shot('06-gate-meridian-dialog');
 await page.keyboard.press('Escape');assert.ok(Math.abs((await geometry()).windowY-scrollBeforePopup)<2);
 await page.locator('.penta-channel-hit[data-channel="7-31"]').click();await page.locator('.penta-detail:not(.hidden) [data-penta-channel-state]').waitFor();
 assert.equal(await page.locator('.penta-gate.penta-selected-target').count(),2);
 await page.locator('.penta-detail:not(.hidden)').waitFor();await shot('07-channel-dialog');
 await page.keyboard.press('Escape');
 const totals=await page.locator('.penta-overview-stats').innerText();await page.locator('#team-selected-chips [data-focus-member]').first().click();assert.equal(await page.locator('.penta-overview-stats').innerText(),totals);await shot('08-member-focus');await page.locator('#team-selected-chips [data-focus-member]').first().click();
 await add('td-ohd-fictional-04');await add('td-ohd-fictional-05');await settled();
 await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.team-results').scrollTop=0;});await shot('09-desktop-five');
 for(const [width,height] of [[1280,720],[1024,768],[430,932],[390,844],[320,800]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.team-results').scrollTop=0;});await shot(`10-layout-${width}`);assert.equal((await geometry()).overflow,false);
 }
 await page.setViewportSize({width:390,height:844});await page.locator('.penta-gate-reading[data-detail-id="31"]').click();await page.locator('.penta-detail:not(.hidden)').waitFor();await shot('11-mobile-dialog');await page.keyboard.press('Escape');
 await page.setViewportSize({width:1440,height:960});await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.team-results').scrollTop=0;});
 for(const code of ['en','zh-Hant','zh-CN']){await locale(code);await shot(`12-locale-${code}`);assert.equal((await geometry()).overflow,false);}
 const skinShots=[];
 for(const skin of SKINS){
  if(!(await page.locator('#more-menu').evaluate(n=>n.open)))await page.locator('#more-toggle').click();await page.locator('#skin-settings-button').click();await page.locator(`#skin-picker [data-skin-id="${skin.id}"]`).click();await page.locator('#skin-settings-close').click();if(await page.locator('#more-menu').evaluate(n=>n.open))await page.locator('#more-toggle').click();
  const name=`13-skin-${skin.id}`;await shot(name);skinShots.push({name:skin.id,file:name+'.png'});assert.equal((await geometry()).overflow,false);
 }
 const gallery=path.join(output,'skin-contact-sheet.html');
 await writeFile(gallery,`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#eee;font:14px system-ui}.grid{display:grid;grid-template-columns:repeat(3,400px);gap:12px}figure{margin:0}img{width:400px;height:267px;object-fit:contain;background:white}figcaption{padding:5px}</style><div class="grid">${skinShots.map(s=>`<figure><img src="${s.file}"><figcaption>${s.name}</figcaption></figure>`).join('')}</div>`);
 const sheet=await context.newPage();await sheet.setViewportSize({width:1248,height:1230});await sheet.goto(pathToFileURL(gallery).href);await sheet.screenshot({path:path.join(output,'14-skin-contact-sheet.png'),fullPage:true,animations:'disabled'});await sheet.close();
 assert.deepEqual(errors,[]);await writeFile(path.join(output,'observations.json'),JSON.stringify({base,errors,records},null,2));console.log('PASS focused layout, real clicks, dialog, scroll, member focus, viewport/language/skin capture.');
} catch(error){await page.screenshot({path:path.join(output,'failure.png'),animations:'disabled'}).catch(()=>{});await writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),errors,records},null,2));throw error;}
finally{await context.close();await browser.close();}
