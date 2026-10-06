/** Approved Variable 29 corpus: full prose, shared surfaces, Tone and Summary isolation. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {chromium} from 'playwright-core';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/variable-29-content.json',import.meta.url)));
const base=process.env.E2E_URL || 'http://127.0.0.1:5211';
const birth='?d=2000-05-10&t=12%3A30&tz=8';
const clean=s=>s.replaceAll('**','').replace(/^- /gm,'').replace(/\s+/g,'');
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true});
const cases=[],home=[];
try {
 for(const width of [1224,903,664,390])for(const locale of ['en','zh-CN','zh-Hant']){
  console.log(`Variable 29: ${width}/${locale}`);
  const context=await browser.newContext({viewport:{width,height:900},locale,reducedMotion:'reduce'});
  await context.addInitScript(l=>localStorage.setItem('ohd-language',l),locale);
  await context.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/${birth}`,{waitUntil:'domcontentloaded'});
  await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
  await page.evaluate(async()=>{await document.fonts.ready;});
  for(const [key,record]of Object.entries(fixture.records[locale])){
   const objectId=key.replace('variable.',''),isPublic=objectId==='introduction'||objectId.endsWith(':introduction');
   await page.evaluate(async({objectId,isPublic,tone})=>{
    const {openKnowledgeDetail}=await import('/src/lib/knowledge/detail-controller.js');
    openKnowledgeDetail({objectType:'variable',objectId},isPublic?null:{variable:{color:2,tone,base:1,direction:tone<=3?'left':'right'}});
   },{objectId,isPublic,tone:width>=900?2:5});
   const article=page.locator('#gate-detail .knowledge-detail');
   const expected=objectId==='introduction'?'hd.variable.introduction':'hd.variable.'+objectId.replace(':','.');
   assert.equal(await article.getAttribute('data-knowledge-id'),expected);
   const modalText=clean(await article.innerText());
   for(const s of record.presentation.sections)assert.ok(modalText.includes(clean(record.detail.slice(s.start,s.end))),`${locale}/${objectId}/${s.id}: incomplete`);
   assert.equal(await article.locator('.knowledge-yours').count(),isPublic?0:1);
   const fit=await article.evaluate(n=>({fits:n.closest('.gate-detail-body').scrollWidth<=n.closest('.gate-detail-body').clientWidth+1}));
   assert.ok(fit.fits,`${width}/${locale}/${objectId}: modal overflow`);
   assert.equal(await article.locator('.knowledge-context').count(),isPublic?0:1);
   const body=await article.locator('.knowledge-body').innerHTML();
   await page.locator('#gate-detail .knowledge-library-link').click();
   const library=page.locator('#reference-detail .knowledge-detail');await library.waitFor();
   assert.equal(await library.getAttribute('data-knowledge-id'),expected);
   const libraryText=clean(await library.innerText());
   for(const s of record.presentation.sections)assert.ok(libraryText.includes(clean(record.detail.slice(s.start,s.end))));
   assert.equal(await library.locator('.knowledge-context,.knowledge-yours').count(),0);
   assert.ok(await library.evaluate(n=>n.scrollWidth<=n.clientWidth+1&&n.parentElement.scrollWidth<=n.parentElement.clientWidth+1));
   assert.ok(body.includes('knowledge-variable-links'));
   if(isPublic){
    await library.locator('[data-knowledge-jump]').first().click();
    assert.notEqual(await page.locator('#reference-detail .knowledge-detail').getAttribute('data-knowledge-id'),expected);
   }
   cases.push({width,locale,id:expected,fullModal:true,fullLibrary:true,tone:isPublic?null:width>=900?2:5,noOverflow:true});
  }
  await page.goto(`${base}/${birth}`,{waitUntil:'domcontentloaded'});
  await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
  await page.locator('[data-panel="variable"]').click();
  const snapshot=()=>page.evaluate(()=>[...document.querySelectorAll('#foundation-panel .foundation-item,.variable-grid .arrow-card')].map(n=>({text:n.innerText,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
  const before=await snapshot();
  await page.evaluate(async locale=>{
   const {knowledgeContent}=await import('/src/lib/knowledge/content/index.js');
   for(const [key,r]of Object.entries(knowledgeContent[locale]))if(key.startsWith('variable.'))r.detail='DETAIL_SENTINEL'.repeat(10000);
   const {refreshChartLanguage}=await import('/src/views/chart.js');refreshChartLanguage();
  },locale);
  assert.deepEqual(await snapshot(),before,`${width}/${locale}: Detail changed Home`);
  assert.deepEqual(errors,[]);
  home.push({width,locale,detailPoison:true,textAndGeometryUnchanged:true});await context.close();
 }
 const result={cases:cases.length,homeCases:home.length,results:cases,home};
 if(process.env.VARIABLE29_OUTPUT)writeFileSync(process.env.VARIABLE29_OUTPUT,JSON.stringify(result,null,2)+'\n');
 console.log(`PASS ${cases.length} complete Variable cases, ${home.length} Home Detail-isolation cases`);
} finally {await browser.close();}
