import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
const base=process.env.E2E_URL || 'http://127.0.0.1:19980';
const out='artifacts/visual-review/wa-ui-v1';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chromium',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try {
  await page.route('**/__wa-ui-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/styles.css"></head><body></body></html>'}));
  await page.goto(`${base}/__wa-ui-test`);
  await page.evaluate(async()=>{
    const {mountWa}=await import('/src/views/wa.js');
    const people=await import('/src/lib/people.js');
    const {computeChart}=await import('/src/lib/chartdata.js');
    document.querySelectorAll('body > *').forEach(node=>{if(node.tagName!=='SCRIPT')node.remove();});
    (await import('/src/lib/i18n.js')).setLocale('en',{persist:false});
    (await import('/src/lib/appearance.js')).initAppearance();
    const host=document.createElement('section');host.id='wa-test-host';document.body.append(host);
    window.waCalls=0;window.waDelay=false;window.waRelease=null;
    const repository=(await import('/src/lib/wa/repository.js')).createWaRepository();
    window.waSaveDelay=false;window.waSaveRelease=null;window.waHistoryDelay=false;window.waHistoryRelease=null;window.waDerivedChange=false;
    const delayedRepository={...repository,history:async(...args)=>{if(window.waHistoryDelay)await new Promise(resolve=>{window.waHistoryRelease=resolve;});return repository.history(...args);},save:async(...args)=>{if(window.waSaveDelay)await new Promise(resolve=>{window.waSaveRelease=resolve;});return repository.save(...args);}};
    window.waMount=()=>mountWa(host,{repository:delayedRepository,computeChart:async birth=>{window.waCalls++;if(window.waDelay)await new Promise(resolve=>{window.waRelease=resolve;});const output=await computeChart(birth);if(!window.waDerivedChange)return output;const copy=structuredClone(output);const ordinary=Object.values(copy.chart.gates.personality).find(item=>![21,45,25,51,2,14,3,60,6,59,27,50].includes(item.gate));ordinary.gate=ordinary.gate===1?7:1;return copy;}});
    window.waView=window.waMount();window.waPeople=people;
  });
  assert.equal(await page.locator('[data-member]').count(),0);
  assert.equal(await page.locator('[data-action=analyze]').isDisabled(),true);
  await page.evaluate(()=>{
    for(let i=0;i<11;i++)window.waPeople.savePerson({id:`wa-fictional-${i}`,name:i===0?'<img src=x onerror=alert(1)> Fictional Alpha':`Fictional ${i}`,birthDate:`1990-01-${String(i+1).padStart(2,'0')}`,birthTime:'12:00',timeUnknown:i===1,timezone:0,location:{lat:0,lon:0,iana:'UTC',name:'Fictional test'}});
  });
  for(let i=0;i<11;i++){await page.locator('[data-person]').selectOption(`wa-fictional-${i}`);await page.locator('[data-action=add]').click();}
  assert.equal(await page.locator('[data-member]').count(),11);
  assert.equal(await page.locator('.wa-page img').count(),0);
  await page.locator('[data-title]').fill('Fictional Wa <safe>');
  const ids=await page.locator('[data-alpha] option').evaluateAll(nodes=>nodes.map(node=>node.value).filter(Boolean));
  const groups=await page.locator('[data-group]').evaluateAll(nodes=>nodes.map(node=>node.dataset.group));
  await page.locator('[data-alpha]').selectOption(ids[0]);
  for(let i=1;i<=9;i++)await page.locator(`[data-assign="${ids[i]}"]`).selectOption(groups[Math.floor((i-1)/3)]);
  await page.locator('[data-action=save]').click();
  await page.waitForFunction(()=>document.querySelector('.wa-draft-status').textContent.includes('r1'));
  await page.locator('[data-action=analyze]').click();
  await page.waitForSelector('[data-pair="21-45"]',{timeout:180000});
  assert.equal(await page.evaluate(()=>window.waCalls),10,'unassigned pool excluded');
  assert.equal(await page.locator('.wa-theme').count(),6);
  assert.equal(await page.locator('.wa-conditional').count(),1);
  assert.ok((await page.locator('.wa-theme small').allTextContents()).some(text=>!/^\d+: 0 · \d+: 0$/.test(text)),'real charts have contributions');
  const coverage=await page.locator('.wa-theme small').allTextContents();
  await page.locator(`[data-assign="${ids[1]}"]`).selectOption(groups[1]);
  assert.equal(await page.locator('.wa-theme').count(),0,'clear stale result on move');
  await page.locator(`[data-assign="${ids[4]}"]`).selectOption(groups[0]);
  await page.locator('[data-action=analyze]').click();await page.waitForSelector('[data-pair="21-45"]',{timeout:180000});
  assert.deepEqual(await page.locator('.wa-theme small').allTextContents(),coverage);
  assert.ok((await page.locator('.wa-comparison').innerText()).includes('Fictional 1'),'moves visible with unchanged global coverage');
  await page.locator('[data-action=save]').click();await page.waitForFunction(()=>document.querySelector('.wa-draft-status').textContent.includes('r2'));
  for(const width of [1440,390,320])for(const locale of ['en','zh-CN','zh-Hant'])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(async({locale,theme})=>{(await import('/src/lib/i18n.js')).setLocale(locale,{persist:false});(await import('/src/lib/appearance.js')).setSkin(`default-${theme}`);window.waView.refreshLanguage();},{locale,theme});
    assert.equal(await page.locator('html').getAttribute('data-skin'), `default-${theme}`, 'actual registered Skin applied');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} ${locale} overflow`);
    const controls=await page.locator('.wa-page button:visible,.wa-page select:visible,.wa-page input:visible').evaluateAll(nodes=>nodes.map(node=>({h:node.getBoundingClientRect().height,w:node.getBoundingClientRect().width})));
    assert.ok(controls.every(rect=>rect.h>=44&&rect.w>=44));
    await page.screenshot({path:`${out}/${width}-${locale}-${theme}.png`,fullPage:true,animations:'disabled'});
    await page.locator('[data-pair="21-45"]').click();
    assert.equal(await page.locator('.wa-detail:not(.hidden)').count(),1);
    assert.ok((await page.locator('.wa-detail .knowledge-body').innerText()).length>200);
    assert.equal(await page.locator('.wa-detail img').count(),0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-pair="21-45"]').evaluate(node=>node===document.activeElement),true);
  }
  await page.evaluate(async()=>{(await import('/src/lib/i18n.js')).setLocale('en',{persist:false});window.waView.refreshLanguage();});
  await page.locator('[data-action=history]').click();
  await page.locator('[data-restore]').last().click();
  await page.waitForFunction(()=>document.querySelector('.wa-draft-status').textContent.includes('r3'));
  assert.equal(await page.locator(`[data-assign="${ids[1]}"]`).inputValue(),groups[0]);
  assert.equal(await page.locator('.wa-theme').count(),0,'restored chart must be recalculated');
  await page.evaluate(()=>{window.waView.dispose();window.waView=window.waMount();});
  await page.locator('[data-action=list]').click();await page.locator('[data-load]').click();
  await page.waitForFunction(()=>document.querySelector('[data-title]').value==='Fictional Wa <safe>');
  assert.equal(await page.locator('[data-title]').inputValue(),'Fictional Wa <safe>');
  assert.equal(await page.locator('[data-member]').count(),11);
  // Real IndexedDB head conflict must retain local edits.
  await page.evaluate(async()=>{const repo=(await import('/src/lib/wa/repository.js')).createWaRepository();const [head]=await repo.list();await repo.save({...head,title:'External saved revision'},{expectedRevision:head.revision});});
  await page.locator('[data-title]').fill('Retain this local draft');await page.locator('[data-action=save]').click();
  await page.waitForFunction(()=>document.querySelector('.wa-notice').textContent.includes('local draft'));
  assert.equal(await page.locator('[data-title]').inputValue(),'Retain this local draft');
  // Deferred production provider: person snapshot mutation rejects its late answer.
  await page.evaluate(()=>{window.waDelay=true;});await page.locator('[data-action=analyze]').click();
  await page.waitForFunction(()=>!!window.waRelease);
  await page.evaluate(()=>{const person=window.waPeople.getPerson('wa-fictional-1');window.waPeople.savePerson({...person,birthDate:'1991-01-01',timezone:0});window.waDelay=false;window.waRelease();});
  await page.waitForFunction(()=>document.querySelector('.wa-results').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('.wa-theme').count(),0);
  // Missing assigned reference clears ready results; missing pool reference does not enter calculation.
  await page.evaluate(()=>window.waPeople.deletePerson('wa-fictional-2'));
  await page.locator('[data-action=analyze]').click();await page.waitForFunction(()=>document.querySelector('.wa-notice').textContent.includes('Missing reference'));
  assert.equal(await page.locator('.wa-theme').count(),0);
  await page.locator('[data-mode]').selectOption('observation');
  for(const id of ids.slice(1,10))await page.locator(`[data-assign="${id}"]`).selectOption('');
  await page.locator('[data-action=analyze]').click();await page.waitForSelector('[data-pair="21-45"]',{timeout:180000});
  assert.ok((await page.locator('[data-wa-state]').innerText()).includes('Observation'));
  const beforeMemberChange=await page.locator('.wa-theme small').allTextContents();
  await page.evaluate(()=>{window.waDerivedChange=true;});
  await page.locator('[data-action=analyze]').click();await page.waitForSelector('[data-pair="21-45"]');
  assert.deepEqual(await page.locator('.wa-theme small').allTextContents(),beforeMemberChange);
  assert.ok((await page.locator('.wa-comparison').innerText()).includes('Member structure changed'),'non-theme derived change must be visible');
  await page.evaluate(()=>{window.waHistoryDelay=true;window.waHistoryRelease=null;});
  await page.locator('[data-action=history]').click();await page.waitForFunction(()=>!!window.waHistoryRelease);
  await page.locator('[data-action=new]').click();await page.locator('[data-confirm]').click();
  await page.evaluate(()=>{window.waHistoryDelay=false;window.waHistoryRelease();});
  await page.waitForFunction(()=>!document.querySelector('[data-member]'));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.locator('.wa-operation').count(),0,'stale history must not open over a new organization');
  await page.locator('[data-title]').fill('Unsaved before delayed saves');
  // A save resolving after another operation must unlock its controls and keep intervening edits.
  for(const action of ['list','history','new']){
    await page.evaluate(()=>{window.waSaveDelay=true;window.waSaveRelease=null;});
    await page.locator('[data-action=save-new]').click();await page.waitForFunction(()=>!!window.waSaveRelease);
    await page.locator(`[data-action=${action}]`).click();
    if(action==='new')await page.locator('[data-confirm]').click();
    else {await page.waitForSelector('.wa-operation');await page.keyboard.press('Escape');}
    await page.locator('[data-title]').fill(`During save ${action}`);
    await page.evaluate(()=>{window.waSaveDelay=false;window.waSaveRelease();});
    await page.waitForFunction(()=>!document.querySelector('[data-action=save]').disabled);
    assert.equal(await page.locator('[data-title]').inputValue(),`During save ${action}`);
  }
  const integration=await browser.newPage();await integration.goto(base);
  await integration.locator('[data-view="wa"]').first().click();
  await integration.waitForSelector('#wa-view [data-wa-page]');
  assert.equal(await integration.locator('#wa-view [data-member]').count(),0,'production navigation never seeds members');
  await integration.close();
  assert.deepEqual(errors,[]);
  console.log('Wa e2e passed: real WASM/core analysis, 18 responsive locale/theme screenshots, moves, IndexedDB save/list/history/restore/conflict, stale person snapshot, missing data, observation.');
}finally{await browser.close();}
