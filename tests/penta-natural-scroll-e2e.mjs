import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.E2E_URL||'http://127.0.0.1:19964',out=path.resolve(process.env.SCREENSHOT_DIR||'artifacts/visual-review/penta-restoration');await mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chromium',headless:true}),p=await b.newPage({viewport:{width:1440,height:960},locale:'zh-CN',reducedMotion:'reduce'});p.setDefaultTimeout(15000);const errors=[],observations=[];p.on('pageerror',e=>errors.push(e.message));
async function shot(name){await p.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});}
async function settled(){await p.waitForFunction(()=>document.querySelector('#team-content').getAttribute('aria-busy')==='false'&&document.querySelectorAll('.penta-gate-reading').length===12,{},{timeout:90000});}
async function geometry(){return p.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {y:r.y,bottom:r.bottom,height:r.height,width:r.width};};return {scrollY,graph:rect('.team-graph-column'),workspace:rect('.team-workspace'),results:rect('.team-results'),toolbar:rect('.team-management'),header:rect('.header'),overflow:getComputedStyle(document.querySelector('.team-results')).overflowY,internalScroll:document.querySelector('.team-results').scrollTop,horizontal:document.documentElement.scrollWidth>innerWidth+1};});}
try{
 await p.goto(base+'/dev/test-people.html');await p.locator('#import:not([disabled])').click();await p.goto(base);await p.locator('#chart-view:not(.hidden)').waitFor({timeout:90000});
 await p.locator('#bodygraph-container .bg-gate[data-gate="14"]').click();await shot('01-birth-gate');await p.locator('#gate-detail [data-channel="2-14"]').click();await shot('02-birth-channel');await p.keyboard.press('Escape');
 await p.locator('.nav-link[data-view="team"]').click();await p.locator('#team-add-saved-person').click();for(let i=1;i<=5;i++)await p.locator(`[data-add-person="td-ohd-fictional-0${i}"]`).click();await shot('03-picker');await p.locator('#team-selection-confirm').click();await settled();await shot('04-top-1440');
 assert.equal(await p.locator('.penta-gate-reading').count(),12);assert.equal(await p.locator('.penta-channel-reading').count(),6);
 const before=await geometry();assert.ok(before.toolbar.bottom<=before.graph.y);assert.equal(before.overflow,'visible');
 await p.mouse.wheel(0,650);await p.waitForFunction(()=>scrollY>500);await shot('05-sticky-middle');const mid=await geometry();assert.ok(Math.abs(mid.graph.y-mid.header.bottom-16)<2);assert.equal(mid.internalScroll,0);assert.ok(mid.toolbar.bottom<0);
 await p.mouse.wheel(0,850);await p.waitForFunction(()=>scrollY>1200);
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await shot('06-sticky-reading');
 const continued=await geometry();assert.ok(Math.abs(continued.graph.y-continued.header.bottom-16)<2);
 await p.locator('.penta-gate-hit[data-gate="14"]').click();await p.waitForFunction(()=>{const r=document.querySelector('.penta-gate-reading[data-detail-id="14"]').getBoundingClientRect();return r.y>=50&&r.y<100;});const linked=await geometry();assert.ok(linked.scrollY>mid.scrollY);await shot('07-gate-link');
 await p.locator('[data-open-kind="gate"][data-open-id="14"]').first().click();await p.locator('.penta-detail [data-penta-member]').first().waitFor();await shot('08-penta-gate-members');
 const memberColors=await p.locator('.penta-detail .penta-member-tag').evaluateAll(ns=>ns.map(n=>({index:n.textContent,color:getComputedStyle(n).backgroundColor})));assert.ok(memberColors.length>1);
 await p.locator('.penta-detail [data-shared-channel-select="2-14"]').click();await shot('09-penta-channel');await p.locator('.penta-detail .gate-detail-body').evaluate(n=>n.scrollTop=n.scrollHeight);await shot('09b-penta-related-gates');assert.equal(await p.locator('.penta-detail .transit-channel-gates .transit-detail-link').count(),2);await p.locator('.penta-detail [data-shared-back]').click();await p.keyboard.press('Escape');
 const savedY=await p.evaluate(()=>scrollY);await p.locator('.penta-gate-reading[data-detail-id="14"]').click();assert.equal(await p.evaluate(()=>scrollY),savedY);
 await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await shot('10-page-end');const end=await geometry();assert.ok(end.graph.bottom<=end.workspace.bottom+1);// At the real document end there may still be viewport room below a short graph.
 // A temporary spacer allows reaching the parent boundary and verifies sticky containment.
 await p.evaluate(()=>{const spacer=document.createElement('div');spacer.id='sticky-test-spacer';spacer.style.height='100vh';document.body.append(spacer);scrollTo(0,document.querySelector('.team-workspace').getBoundingClientRect().bottom+scrollY-300);});
 const boundary=await geometry();assert.ok(boundary.graph.y<mid.graph.y,'sticky releases when parent bottom reaches graph');assert.ok(Math.abs(boundary.graph.bottom-boundary.workspace.bottom)<2);
 await p.evaluate(()=>document.querySelector('#sticky-test-spacer').remove());
 await p.evaluate(()=>scrollTo(0,0));await p.locator('#team-add-saved-person').click();await p.locator('#team-person-search').fill('td-ohd-fictional-02');await p.locator('[data-edit-person="td-ohd-fictional-02"]').click();await shot('11-editor');await p.keyboard.press('Escape');assert.equal(await p.locator('#team-person-search').inputValue(),'td-ohd-fictional-02');await p.keyboard.press('Escape');
 await p.locator('#team-save').click();await shot('12-save');await p.keyboard.press('Escape');await p.locator('#team-manage').click();await shot('13-manage');await p.keyboard.press('Escape');await p.locator('#team-current').click();await shot('14-switcher');await p.keyboard.press('Escape');
 for(const [w,h]of [[1280,800],[1280,640],[390,844]]){await p.setViewportSize({width:w,height:h});await p.evaluate(()=>scrollTo(0,0));await shot(`15-layout-${w}-${h}`);const g=await geometry();assert.equal(g.horizontal,false);if(w>1050){await p.mouse.wheel(0,600);await p.waitForFunction(()=>scrollY>300);const s=await geometry();assert.ok(s.graph.bottom<=h-4,`short viewport graph fits ${w}x${h}`);await shot(`16-sticky-${w}-${h}`);}observations.push({w,h,...g});}
 await p.locator('[data-open-kind="gate"][data-open-id="14"]').first().click();await shot('17-mobile-gate');await p.locator('.penta-detail [data-shared-channel-select="2-14"]').click();await shot('18-mobile-channel');await p.keyboard.press('Escape');await p.evaluate(()=>scrollTo(0,0));await p.locator('#team-add-saved-person').click();await shot('19-mobile-picker');await p.keyboard.press('Escape');
 await p.setViewportSize({width:1440,height:960});await p.evaluate(()=>scrollTo(0,0));
 const idsBefore=await p.locator('#team-selected-chips [data-focus-member]').evaluateAll(ns=>Object.fromEntries(ns.map(n=>[n.dataset.focusMember,n.querySelector('.penta-member-tag').textContent])));
 await p.locator('#team-selected-chips [data-remove-member]').first().click();await settled();
 const idsAfter=await p.locator('#team-selected-chips [data-focus-member]').evaluateAll(ns=>Object.fromEntries(ns.map(n=>[n.dataset.focusMember,n.querySelector('.penta-member-tag').textContent])));for(const[id,index]of Object.entries(idsAfter))assert.equal(index,idsBefore[id]);
 for(const [locale,skin]of [['en','default-dark'],['zh-Hant','high-contrast'],['zh-CN','default-light']]){
  if(!await p.locator('#more-menu').evaluate(n=>n.open))await p.locator('#more-toggle').click();
  if(!await p.locator('#language-menu').evaluate(n=>n.open))await p.locator('#language-menu summary').click();await p.locator(`[data-language="${locale}"]`).click();
  if(!await p.locator('#more-menu').evaluate(n=>n.open))await p.locator('#more-toggle').click();await p.locator('#skin-settings-button').click();await p.locator(`#skin-picker [data-skin-id="${skin}"]`).click();await p.locator('#skin-settings-close').click();if(await p.locator('#more-menu').evaluate(n=>n.open))await p.locator('#more-toggle').click();await settled();await p.evaluate(()=>scrollTo(0,0));await shot(`20-${locale}-${skin}`);assert.equal((await geometry()).horizontal,false);
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(out,'natural-scroll-observations.json'),JSON.stringify({before,mid,linked,end,memberColors,observations,errors},null,2));console.log('PASS document scroll, sticky and parent end, anchor offset, 6/12 content, multi-member colors, details/operations, 1440/1280/390 and short desktop');
}catch(e){await shot('failure');throw e;}finally{await b.close();}
