import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.E2E_URL||'http://127.0.0.1:9961',out='artifacts/visual-review/channel-labels';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true}),page=await browser.newPage({viewport:{width:1280,height:900},locale:'zh-CN',reducedMotion:'reduce'});page.setDefaultTimeout(15000);const errors=[],records=[];page.on('pageerror',e=>errors.push(e.message));
async function badges(root,label){
 const data=await page.locator(root+' .channel-detail-heading').evaluate(n=>{const group=n.querySelector('.channel-circuit-badges'),items=[...group.children],r=group.getBoundingClientRect(),a=items[0].getBoundingClientRect(),b=items[1].getBoundingClientRect(),host=n.closest('.gate-detail-body,.reference-detail')||n,hr=host.getBoundingClientRect(),nav=n.closest('.gate-detail-card')?.querySelector('.gate-detail-nav')?.getBoundingClientRect();return{count:items.length,gap:b.x-a.right,sameRow:Math.abs(a.y-b.y)<1,right:r.right,hostRight:hr.right,overflow:host.scrollWidth>host.clientWidth+1,navOverlap:nav? r.left<nav.right&&r.right>nav.left&&r.top<nav.bottom&&r.bottom>nav.top:false,margins:items.map(i=>getComputedStyle(i).marginLeft),texts:items.map(i=>i.textContent)};});
 assert.equal(data.count,2);assert.equal(data.sameRow,true,label);assert.ok(Math.abs(data.gap-4)<1,label);assert.ok(data.right<=data.hostRight+1,label);assert.equal(data.overflow,false,label);assert.equal(data.navOverlap,false,label);assert.deepEqual(data.margins,['0px','0px']);records.push({label,...data});
}
async function shot(name){await page.screenshot({path:`${out}/${name}.png`,animations:'disabled'});}
async function language(locale){if(!await page.locator('#more-menu').evaluate(n=>n.open))await page.locator('#more-toggle').click();if(!await page.locator('#language-menu').evaluate(n=>n.open))await page.locator('#language-menu summary').click();await page.locator(`[data-language="${locale}"]`).click();if(await page.locator('#more-menu').evaluate(n=>n.open))await page.locator('#more-toggle').click();}
async function nav(view){const link=page.locator(`.nav-link[data-view="${view}"]`);if(!await link.isVisible())await page.locator('#mobile-menu-toggle').click();await link.click();}
try{
 await page.goto(base+'/dev/test-people.html');await page.locator('#import:not([disabled])').click();await page.goto(base);await page.locator('#chart-view:not(.hidden)').waitFor({timeout:90000});
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:900});
  for(const locale of ['zh-CN','zh-Hant','en']){
   await page.goto(base);await page.locator('#chart-view:not(.hidden)').waitFor({timeout:90000});await language(locale);await nav('chart');await page.locator('#bodygraph-container .bg-gate[data-gate="10"]').click();await page.locator('#gate-detail [data-channel="10-20"]').click();await badges('#gate-detail',`birth-${width}-${locale}`);await shot(`birth-${width}-${locale}`);await page.keyboard.press('Escape');
   await page.goto(base+'/#library/channel/10-20');await page.locator('.reference-detail .channel-detail-heading').waitFor();await badges('.reference-detail',`library-${width}-${locale}`);if(width===320)await shot(`library-${width}-${locale}`);
  }
 }
 // Real transit callbacks use the same heading; verify their independent source status.
 for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.goto(base+'/?d=2000-05-10&t=12%3A30&tz=8&view=transits');await page.locator('#transit-bodygraph .bg-gate[data-gate="10"]').waitFor({timeout:90000});await page.locator('#transit-bodygraph .bg-gate[data-gate="10"]').click();await page.locator('#gate-detail [data-channel="10-20"]').click();await badges('#gate-detail',`transit-${width}`);await shot(`transit-${width}`);await page.keyboard.press('Escape');}
 await page.goto(base);await page.locator('#chart-view:not(.hidden)').waitFor({timeout:90000});
 // Use actual Penta calculation to cover all four states, including the longest state.
 await nav('team');await page.evaluate(async()=>{
  const {analyzePentaStructure}=await import('/src/lib/human-design/penta-structure.js'),{TEAM_PLANETS}=await import('/src/lib/human-design/team-activation.js'),{createPentaMatrix}=await import('/src/views/penta-matrix.js'),{pentaDetailAdapter}=await import('/src/lib/shared-object-details.js');
  const values=[[7,31,1,13,33],[8,13],[33]],members=values.map((v,i)=>({memberId:'label-'+i,chart:{gates:{personality:Object.fromEntries(TEAM_PLANETS.map((planet,j)=>[planet,{gate:v[j]||64,line:1,planet}])),design:Object.fromEntries(TEAM_PLANETS.map(planet=>[planet,{gate:64,line:1,planet}]))}}}));
  const result=analyzePentaStructure(members);window.__labelResult=result;const proof=document.createElement('div');proof.id='label-proof';proof.innerHTML='<div class="proof-graph"></div><div class="proof-analysis"></div>';document.querySelector('#team-view').append(proof);window.__labelMatrix=createPentaMatrix(proof.querySelector('.proof-graph'),{result,people:members.map(m=>({memberId:m.memberId,displayName:m.memberId})),groupLabel:'Fictional label verification',analysisContainer:proof.querySelector('.proof-analysis'),detailAdapter:pentaDetailAdapter});
 });
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  for(const locale of ['en','zh-CN','zh-Hant']){
   // Refresh this isolated explicit-context renderer, not Team's unrelated state.
   await page.evaluate(async locale=>{(await import('/src/lib/i18n.js')).setLocale(locale);window.__labelMatrix.refreshLanguage();},locale);await page.evaluate(()=>document.fonts.ready);
   const rows=await page.locator('.penta-channel-reading').evaluateAll(ns=>ns.map(n=>{const h=n.querySelector('.penta-channel-title').getBoundingClientRect(),s=n.querySelector('.penta-state-text').getBoundingClientRect(),icon=n.querySelector('.penta-status-icon').getBoundingClientRect(),text=n.querySelector('.penta-state-text > span').getBoundingClientRect();return{titleBottom:h.bottom,stateTop:s.top,gap:text.x-icon.right,iconY:icon.y,textY:text.y,iconHeight:icon.height,textHeight:text.height,overflow:n.scrollWidth>n.clientWidth+1,state:n.querySelector('[data-penta-state]').dataset.pentaState};}));
   assert.equal(rows.length,6);assert.equal(new Set(rows.map(r=>r.state)).size,4);for(const r of rows){assert.ok(r.stateTop>=r.titleBottom+4);assert.ok(Math.abs(r.gap-5)<1);assert.ok(Math.abs(r.iconY-r.textY)<1);assert.equal(r.overflow,false);assert.equal(r.iconHeight,18);}records.push({width,locale,rows});
   const both=page.locator('.penta-channel-reading[data-detail-id="13-33"]');await both.scrollIntoViewIfNeeded();await shot(`penta-card-${width}-${locale}`);await both.click();await badges('.penta-detail',`penta-${width}-${locale}`);
   assert.equal(await page.locator('.penta-detail [data-penta-channel-state] > .transit-source-badge').evaluate(n=>getComputedStyle(n).marginLeft),'0px');await shot(`penta-detail-${width}-${locale}`);await page.keyboard.press('Escape');
  }
 }
 // All registered skins retain grouped geometry; no palette edits.
 const skins=await page.evaluate(async()=>(await import('/src/lib/skin-registry.js')).SKINS.map(s=>s.id));for(const skin of skins){await page.evaluate(async id=>{(await import('/src/lib/appearance.js')).setSkin(id);},skin);await page.locator('.penta-channel-reading[data-detail-id="13-33"]').click();await badges('.penta-detail',`skin-${skin}`);await page.keyboard.press('Escape');}
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({errors,records},null,2));console.log('PASS grouped circuit badges: birth/library/Penta, 1280/390/320, three languages, 11 skins; four computed Penta states compact without overlap, status margin zero');
}catch(error){await shot('failure');throw error;}finally{await browser.close();}
