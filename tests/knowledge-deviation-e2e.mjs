/** Round 2F: actual shared surfaces, conditional flow, exact Home regression. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.E2E_URL||'http://127.0.0.1:5210';
const baseline=process.env.BASELINE_E2E_URL||'http://127.0.0.1:5209';
const cases=['perspective:survival','perspective:power','perspective:personal','motivation:fear','motivation:desire','motivation:innocence'];
const results=[],layouts=[];
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true});
const birth='?d=2000-05-10&t=12%3A30&tz=8';
async function open(url,width,locale){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',locale});
 await context.addInitScript(l=>localStorage.setItem('ohd-language',l),locale);
 await context.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/'+birth,{waitUntil:'domcontentloaded'});
 await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
 await page.evaluate(async()=>{await document.fonts.ready;return true;});
 await page.locator('[data-panel="variable"]').click();
 return {context,page,errors};
}
const snapshot=p=>p.evaluate(()=>({cards:[...document.querySelectorAll('#foundation-panel .foundation-item,.variable-grid .arrow-card')].map(n=>({text:n.innerText,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}))}));
const deviation=p=>p.locator('.knowledge-deviation');
async function check(block,width,locale,id){
 assert.equal(await block.count(),1);
 assert.equal(await block.locator('.knowledge-deviation-heading').innerText(),{en:'Off-track State','zh-CN':'偏离状态','zh-Hant':'偏離狀態'}[locale]);
 assert.equal(await block.locator('.knowledge-deviation-node').count(),2);
 assert.equal(await block.locator('.knowledge-deviation-arrow').innerText(),'↓');
 assert.equal(await block.locator('.knowledge-yours,[data-selected="true"]').count(),0);
 const data=await block.evaluate(n=>{
  const flow=n.querySelector('.knowledge-deviation-flow'),a=flow.children[0].getBoundingClientRect(),arrow=flow.children[1].getBoundingClientRect(),b=flow.children[2].getBoundingClientRect();
  const token=document.createElement('span');token.style.color='var(--accent)';n.append(token);const accent=getComputedStyle(token).color;token.remove();
  return {fits:n.scrollWidth<=n.clientWidth+1,vertical:a.bottom<=arrow.top+1&&arrow.bottom<=b.top+1,accent,heading:getComputedStyle(n.querySelector('h3')).color};
 });
 assert.equal(data.fits,true,`${width}/${locale}/${id}: overflow`);assert.equal(data.vertical,true);assert.equal(data.heading,data.accent);
 const mechanism=await block.locator('.knowledge-deviation-mechanism').innerText();
 assert.match(mechanism,locale==='en'?/not a second/:locale==='zh-CN'?/不是你的另一项/:/並非你的另一項/);
}
try{
 for(const width of [1224,903,664,390])for(const locale of ['en','zh-CN','zh-Hant']){
  console.log(`Checking deviation ${width}/${locale}`);
  const old=await open(baseline,width,locale),current=await open(base,width,locale),page=current.page;
  assert.deepEqual(await snapshot(page),await snapshot(old.page),`${width}/${locale}: Home text and box model`);
  layouts.push({width,locale,identical:true});await old.context.close();
  for(const id of cases){
   await page.evaluate(async id=>{const {openKnowledgeDetail}=await import('/src/lib/knowledge/detail-controller.js');openKnowledgeDetail({objectType:'variable',objectId:id},{variable:{tone:2,color:1,base:1}});},id);
   const modal=page.locator('#gate-detail .knowledge-detail'),block=modal.locator('.knowledge-deviation');
   await modal.waitFor();await check(block,width,locale,id);
   assert.equal(await modal.locator('.knowledge-yours').count(),1);
   const order=await modal.evaluate(n=>({summary:n.querySelector('.knowledge-summary-callout').offsetTop,tone:n.querySelector('.knowledge-branches').offsetTop,deviation:n.querySelector('.knowledge-deviation').offsetTop}));
   assert.ok(order.summary<order.tone&&order.tone<order.deviation);
   const modalBody=await block.innerHTML();
   if(process.env.KNOWLEDGE_SCREENSHOT_DIR&&width===903&&locale==='zh-CN'&&id==='motivation:fear'){
    mkdirSync(process.env.KNOWLEDGE_SCREENSHOT_DIR,{recursive:true});await block.scrollIntoViewIfNeeded();await page.screenshot({path:process.env.KNOWLEDGE_SCREENSHOT_DIR+'/fear-modal.png'});
   }
   await page.locator('#gate-detail .knowledge-library-link').click();
   await page.locator('#gate-detail').waitFor({state:'hidden'});
   const library=page.locator('#reference-detail .knowledge-detail');await library.waitFor();const libBlock=library.locator('.knowledge-deviation');
   await check(libBlock,width,locale,id);assert.equal(await libBlock.innerHTML(),modalBody);
   assert.equal(await library.locator('.knowledge-yours').count(),0);
   const fit=await library.evaluate(n=>n.scrollWidth<=n.clientWidth+1&&n.parentElement.scrollWidth<=n.parentElement.clientWidth+1);assert.equal(fit,true);
   if(process.env.KNOWLEDGE_SCREENSHOT_DIR&&width===390&&locale==='zh-Hant'&&id==='perspective:survival'){
    await libBlock.scrollIntoViewIfNeeded();await page.screenshot({path:process.env.KNOWLEDGE_SCREENSHOT_DIR+'/survival-mobile-library.png'});
   }
   results.push({width,locale,id,modal:true,library:true,flow:true,contextIndependent:true,noOverflow:true});
  }
  assert.deepEqual(current.errors,[]);await current.context.close();
 }
 if(process.env.KNOWLEDGE_DEVIATION_OUTPUT)writeFileSync(process.env.KNOWLEDGE_DEVIATION_OUTPUT,JSON.stringify({cases:results,layouts},null,2)+'\n');
 console.log(`PASS ${results.length} deviation cases on both surfaces; ${layouts.length} exact Home layout comparisons`);
}finally{await browser.close();}
