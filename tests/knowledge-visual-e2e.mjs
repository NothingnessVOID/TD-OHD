/** Round 2D representative structures, responsive layouts and shared public articles. */
import assert from 'node:assert/strict';
import {chromium}from'playwright-core';
import {mkdirSync,writeFileSync}from'node:fs';
const url=process.env.E2E_URL||'http://127.0.0.1:5207';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome'}),results=[];
const cases=[['generator','type','generator'],['emotional','authority','emotional'],['process','profile','2/4'],['timeline','profile','3/6'],['split','definition','split'],['cross','cross',null],['taste','variable','determination:taste'],['survival','variable','perspective:survival']];
const body=n=>n.evaluate(node=>{const c=node.cloneNode(true);c.querySelectorAll('.knowledge-yours').forEach(n=>n.remove());c.querySelectorAll('[data-selected]').forEach(n=>n.removeAttribute('data-selected'));return c.innerHTML;});
try{
 for(const width of [1224,903,664,390])for(const locale of ['en','zh-CN','zh-Hant']){
  console.log('Visual',width,locale);const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.addInitScript(l=>localStorage.setItem('ohd-language',l),locale);await context.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/?d=2000-05-10&t=12%3A30&tz=8');await page.locator('#foundation-panel .reliability').waitFor();
  for(const [name,objectType,objectId]of cases){
   await page.evaluate(async({objectType,objectId})=>{const{openKnowledgeDetail}=await import('/src/lib/knowledge/detail-controller.js');const{getCurrentChart}=await import('/src/views/chart.js');const{chartKnowledgeQuery}=await import('/src/lib/knowledge/access.js');openKnowledgeDetail(objectType==='cross'?chartKnowledgeQuery(getCurrentChart().chart,'cross'):{objectType,objectId},objectType==='variable'?{variable:{color:2,tone:5,base:1}}:null);},{objectType,objectId});
   const article=page.locator('#gate-detail .knowledge-detail');assert.equal(await article.locator('.knowledge-summary-callout').count(),name==='cross'?0:1);if(name!=='cross')assert.equal(await article.locator('.knowledge-summary-label').innerText(),locale==='en'?'Overview':'概要');assert.equal(await article.locator('button').count(),name==='cross'?1:0);
   const fits=await article.evaluate(n=>n.scrollWidth<=n.clientWidth+1);assert.ok(fits,`${width}/${locale}/${name} overflow`);
   if(name==='generator'){assert.equal(await article.locator('[data-section="strategy"]').count(),1);assert.ok(await article.locator('[data-section="aura"] .knowledge-chip').count());assert.equal(await article.locator('.knowledge-meta dt').count(),2);}
   if(name==='emotional'){assert.equal(await article.locator('.knowledge-body h3').count(),0);assert.ok(await article.locator('.knowledge-reading p').count()>=2);}
   if(name==='process'){assert.equal(await article.locator('.knowledge-process-step').count(),3);const direction=await article.locator('.knowledge-process').evaluate(n=>getComputedStyle(n).flexDirection);assert.equal(direction,width===390?'column':'row');}
   if(name==='timeline')assert.equal(await article.locator('.knowledge-timeline-stage').count(),3);
   if(name==='split'){assert.equal(await article.locator('.knowledge-island-card').count(),0);}
   if(name==='cross'){assert.deepEqual((await article.locator('.knowledge-activation .knowledge-chip').allInnerTexts()).map(s=>Number(s.match(/\d+/)[0])),[23,43,49,4]);assert.equal(await article.locator('.knowledge-geometry').count(),1);}
   if(objectType==='variable'){assert.equal(await article.locator('[data-selected="true"][data-section="tone4to6"] .knowledge-yours').count(),1);if(width===390){const rects=await article.locator('.knowledge-branch').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));assert.ok(rects[1].y>=rects[0].y+rects[0].height);}}
   if(name==='survival'){assert.equal(await article.locator('[data-section="distraction"].knowledge-information').count(),1);assert.equal(await article.locator('[role="alert"]').count(),0);}
   if(process.env.KNOWLEDGE_SCREENSHOT_DIR&&locale==='zh-CN'&&[1224,390].includes(width)){mkdirSync(process.env.KNOWLEDGE_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.KNOWLEDGE_SCREENSHOT_DIR+`/${width}-${name}.png`});}
   const reading=await body(article.locator('.knowledge-body'));await page.locator('.knowledge-library-link').click();const library=page.locator('#reference-detail .knowledge-detail');await library.waitFor();if(name!=='cross')assert.equal(await body(library.locator('.knowledge-body')),reading);assert.equal(await library.locator('.knowledge-yours,[data-selected="true"],.knowledge-context').count(),0);assert.ok(await library.evaluate(n=>n.scrollWidth<=n.clientWidth+1),`${width}/${locale}/${name} Library overflow`);if(name==='cross')assert.equal(await library.locator('.knowledge-activation').count(),0);
   results.push({width,locale,name,modal:true,library:true,sameReading:true,noOverflow:true});
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 if(process.env.KNOWLEDGE_VISUAL_OUTPUT)writeFileSync(process.env.KNOWLEDGE_VISUAL_OUTPUT,JSON.stringify(results,null,2)+'\n');console.log('PASS',results.length,'Round 2D visual Modal/Library cases');
}finally{await browser.close();}
