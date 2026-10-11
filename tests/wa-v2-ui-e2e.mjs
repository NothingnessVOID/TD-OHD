import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, readFile } from 'node:fs/promises';
import { SKINS } from '../src/lib/skin-registry.js';
const base=process.env.E2E_URL||'http://127.0.0.1:19981';
const out='artifacts/visual-review/wa-ui-v2';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chromium',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try {
  await page.route('**/__wa-v2-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/styles.css"></head><body></body></html>'}));
  await page.goto(`${base}/__wa-v2-test`);
  await page.evaluate(async()=>{
    const {mountWa}=await import('/src/views/wa.js');
    const {fixture,chart}=await import('/tests/helpers/wa-fixtures.js');
    const {createWaRepository}=await import('/src/lib/wa/repository.js');
    (await import('/src/lib/i18n.js')).setLocale('en',{persist:false});
    (await import('/src/lib/appearance.js')).initAppearance();
    const host=document.createElement('section');document.body.append(host);
    window.repo=createWaRepository();
    const {snapshot}=fixture({pool:1});
    snapshot.manualMetadata={powerBases:[{memberId:'m01',label:'Manual fictional role',assignment:'manual'}]};
    await window.repo.save(snapshot,{expectedRevision:0});
    window.people=new Map(snapshot.members.map((member,index)=>[member.personId,{id:member.personId,name:`Fictional ${index}`,birthDate:'1990-01-01',birthTime:'12:00',timeUnknown:false,timezone:0}]));
    window.providerMode='ready';window.calls=0;
    const uiRepository={...window.repo,list:async()=>{if(window.readFailure==='list')await new Promise((resolve,reject)=>{window.rejectRead=reject;});return window.repo.list();},history:async(...args)=>{if(window.readFailure==='history')await new Promise((resolve,reject)=>{window.rejectRead=reject;});return window.repo.history(...args);}};
    window.mount=()=>mountWa(host,{repository:uiRepository,peopleStore:{list:()=>[...window.people.values()],get:id=>window.people.get(id),subscribe:()=>()=>{}},computeChart:async birth=>{
      window.calls++;
      if(window.providerMode==='delay')await new Promise(resolve=>{window.release=resolve;});
      if(window.providerMode==='null')throw null;
      if(window.providerMode==='invalid')return {chart:{}};
      const output=chart(birth.id==='synthetic-person-0'?[21]:[45]);if(window.lineChanged)output.gates.personality.sun.line=2;return {chart:output};
    }});
    window.view=window.mount();
  });
  const load=async()=>{await page.locator('[data-action=list]').click();await page.locator('[data-load]').click();await page.waitForFunction(()=>document.querySelector('[data-title]').value==='Synthetic Wa');};
  const openManual=async()=>{if(!await page.locator('[data-manual-section=records]').evaluate(node=>node.open))await page.locator('[data-manual-section=records]>summary').click();};
  const save=async revision=>{await page.locator('[data-action=save]').click();await page.waitForFunction(revision=>document.querySelector('.wa-draft-status').textContent.includes(`r${revision}`),revision);};
  await load();
  assert.equal(await page.evaluate(async()=>{const [head]=await window.repo.list();return head.schema;}),'wa-refs-v1');
  await openManual();
  assert.equal(await page.evaluate(async()=>Object.hasOwn((await window.repo.list())[0],'consultation')),false,'opening optional section does not add records');
  await page.locator('[data-manual-field=specificProblem]').fill('Fictional problem <img src=x onerror=alert(1)>');
  await page.locator('[data-manual-field=personalManagementNotes]').fill('Fictional management notes');
  await page.locator('[data-manual-field=communicationPlan]').fill('Fictional weekly plan');
  await page.locator('[data-manual-section=g0]>summary').click();
  for(const [field,value] of [['workScope','Delivery'],['demand','Weekly handoff'],['requiredSkills','Listening\nWriting']])await page.locator(`[data-area=g0][data-manual-field=${field}]`).fill(value);
  await page.locator('[data-area=g0][data-manual-field=requiredSkills]').fill('');
  await page.locator('[data-area=g0][data-manual-field=requiredSkills]').pressSequentially('Listening\nWriting');
  assert.equal(await page.locator('[data-area=g0][data-manual-field=requiredSkills]').inputValue(),'Listening\nWriting','line breaks survive each render');
  await page.locator('[data-action=add-intent]').click();
  await page.locator('[name=theme]').fill('Fictional intention');await page.locator('[name=note]').fill('Fictional intention note');await page.locator('[data-save-record]').click();
  const intentId=await page.locator('[data-edit-intent]').getAttribute('data-edit-intent');
  await page.locator('[data-edit-intent]').click();await page.locator('[name=stage]').selectOption('observed');await page.locator('[data-save-record]').click();
  assert.equal(await page.locator('[data-edit-intent]').getAttribute('data-edit-intent'),intentId);
  assert.equal(await page.locator('[data-ally=m10]').count(),0,'pool cannot be selected as ally');
  await page.locator('[data-ally=m01]').check();await page.locator('[data-ally=m00]').check();
  await page.locator('[data-action=add-edge]').click();await page.locator('[name=fromMemberId]').selectOption('m00');await page.locator('[name=toMemberId]').selectOption('m01');await page.locator('[name=label]').fill('Fictional handoff');await page.locator('[name=note]').fill('Directed manual agreement');await page.locator('[data-save-record]').click();
  const edgeId=await page.locator('[data-edit-edge]').getAttribute('data-edit-edge');
  await page.locator('[data-edit-edge]').click();await page.locator('[name=label]').fill('Edited handoff');await page.locator('[data-save-record]').click();
  assert.equal(await page.locator('[data-edit-edge]').getAttribute('data-edit-edge'),edgeId);
  assert.equal(await page.locator('.wa-page img').count(),0);
  await save(2);
  const annotated=await page.evaluate(async()=>{const [head]=await window.repo.list();return head;});
  assert.equal(annotated.schema,'wa-refs-v2');assert.deepEqual(annotated.consultation.businessAreas[0].requiredSkills,['Listening','Writing']);
  assert.equal(annotated.consultation.gapIntents[0].id,intentId);assert.equal(annotated.manualCommunicationEdges[0].edgeId,edgeId);
  await page.evaluate(()=>{window.view.dispose();window.view=window.mount();});await load();await openManual();
  assert.equal(await page.locator('[data-manual-field=specificProblem]').inputValue(),annotated.consultation.specificProblem);
  await page.locator('[data-action=history]').click();await page.locator('[data-restore]').last().click();await page.waitForSelector('[data-confirm-cleanup]');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-edit-edge]').count(),1,'clean v2 head still requires restore annotation confirmation');
  // Structural changes preserve participant references. Pool/remove/Alpha replacement are explicit.
  await page.locator('[data-assign=m01]').selectOption('g1');assert.equal(await page.locator('[data-confirm-cleanup]').count(),0);assert.equal(await page.locator('[data-edit-edge]').count(),1);
  await page.locator('[data-assign=m01]').selectOption('');
  assert.ok((await page.locator('.wa-operation').innerText()).includes('Fictional 1'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('[data-assign=m01]').inputValue(),'g1');assert.equal(await page.locator('[data-edit-edge]').count(),1);
  await page.locator('[data-remove=m01]').click();assert.ok((await page.locator('.wa-operation').innerText()).includes('Manual fictional role'));await page.keyboard.press('Escape');
  await page.locator('[data-remove=m01]').click();
  await page.evaluate(()=>{const field=document.querySelector('[data-manual-field=communicationPlan]');field.value='Changed while confirmation was pending';field.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-confirm-cleanup]').click();assert.equal(await page.locator('[data-member=m01]').count(),1,'stale cleanup confirmation cannot remove records after a draft edit');assert.equal(await page.locator('[data-edit-edge]').count(),1);
  await page.locator('[data-alpha]').selectOption('m10');await page.waitForSelector('[data-confirm-cleanup]');await page.keyboard.press('Escape');assert.equal(await page.locator('[data-alpha]').inputValue(),'m00');
  await page.locator('[data-assign=m01]').selectOption('g0');
  await page.locator('[data-action=analyze]').click();await page.waitForSelector('[data-coverage=all]');
  assert.equal(await page.evaluate(()=>window.calls),10);
  const globalCoverage=await page.locator('[data-coverage=all] small').allTextContents();
  await page.evaluate(()=>{window.lineChanged=true;});await page.locator('[data-action=analyze]').click();await page.waitForSelector('[data-coverage=all]');
  assert.deepEqual(await page.locator('[data-coverage=all] small').allTextContents(),globalCoverage);
  assert.equal(await page.locator('.wa-trace').count(),1,'line-only trace is visible despite unchanged gate union');
  await page.locator('.wa-trace summary').click();assert.ok((await page.locator('.wa-trace').innerText()).includes('21.2'));
  await page.locator('[data-communication-group]').selectOption('g0');
  await page.locator('[data-group-alpha]').uncheck();assert.equal(await page.locator('[data-coverage=alpha]').count(),0);assert.equal(await page.locator('[data-coverage=group]').count(),1);
  await page.locator('[data-group-alpha]').check();
  assert.equal(await page.locator('[data-coverage=group] .wa-theme').count(),6);assert.equal(await page.locator('[data-coverage=alpha] .wa-theme').count(),6);
  assert.equal(await page.locator('[data-coverage=group] [data-pair="21-45"] small').innerText(),'21: 0 · 45: 3');
  assert.equal(await page.locator('[data-coverage=alpha] [data-pair="21-45"] small').innerText(),'21: 1 · 45: 3');
  await page.locator('[data-coverage=group] [data-pair="21-45"]').click();assert.ok(!(await page.locator('.wa-contributions').innerText()).includes('Fictional 0'));await page.keyboard.press('Escape');
  await page.locator('[data-coverage=alpha] [data-pair="21-45"]').click();assert.ok((await page.locator('.wa-contributions').innerText()).includes('Fictional 0'));await page.keyboard.press('Escape');
  for(const width of (process.env.WA_SKIP_VISUAL_MATRIX==='1'?[]:[1440,390,320]))for(const locale of ['en','zh-CN','zh-Hant'])for(const skin of SKINS){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(async({locale,skin})=>{(await import('/src/lib/i18n.js')).setLocale(locale,{persist:false});(await import('/src/lib/appearance.js')).setSkin(skin);window.view.refreshLanguage();},{locale,skin:skin.id});
    assert.equal(await page.locator('html').getAttribute('data-skin'),skin.id);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}/${locale}/${skin.id} overflow`);
    const rects=await page.locator('.wa-page button:visible,.wa-page select:visible,.wa-page input:visible,.wa-page textarea:visible').evaluateAll(nodes=>nodes.map(node=>({h:node.getBoundingClientRect().height,w:node.getBoundingClientRect().width})));
    assert.ok(rects.every(rect=>rect.h>=44&&rect.w>=44),`${width}/${locale}/${skin.id} targets`);
    if(['default-light','default-dark'].includes(skin.id))await page.screenshot({path:`${out}/${width}-${locale}-${skin.id}.png`,fullPage:true,animations:'disabled'});
  }
  await page.evaluate(async()=>{(await import('/src/lib/i18n.js')).setLocale('en',{persist:false});window.view.refreshLanguage();});
  await page.setViewportSize({width:390,height:1000});
  // Optional records support explicit delete and cancel without mutating saved history.
  await page.locator('[data-action=add-intent]').click();await page.locator('[name=theme]').fill('Delete me');await page.locator('[data-save-record]').click();
  await page.locator('[data-remove-intent]').last().click();assert.equal(await page.locator('[data-edit-intent]').count(),1);
  await page.locator('[data-action=add-edge]').click();await page.locator('[name=fromMemberId]').selectOption('m01');await page.locator('[name=toMemberId]').selectOption('m00');await page.locator('[data-save-record]').click();
  await page.locator('[data-remove-edge]').last().click();assert.equal(await page.locator('[data-edit-edge]').count(),1);
  await page.locator('[data-action=add-edge]').click();await page.locator('[name=fromMemberId]').selectOption('m00');await page.locator('[name=toMemberId]').selectOption('m01');await page.locator('[name=label]').fill('Second purpose, same direction');await page.locator('[data-save-record]').click();assert.equal(await page.locator('[data-edit-edge]').count(),2,'same direction edges retain distinct IDs');await page.locator('[data-remove-edge]').last().click();
  await page.locator('[data-action=remove-consultation]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('[data-manual-field=specificProblem]').inputValue(),annotated.consultation.specificProblem);
  // Explicit downloads preserve current draft and all immutable history.
  for(const action of ['export-annotations','export-backup']){
    const pending=page.waitForEvent('download');await page.locator(`[data-action=${action}]`).click();const download=await pending;const data=JSON.parse(await readFile(await download.path(),'utf8'));
    assert.equal(action==='export-backup'?data.saved.revisions.length:data.annotations.manualCommunicationEdges.length,action==='export-backup'?2:1);
  }
  // Restore from v2 to a v1 revision must require a separate annotation diff confirmation.
  await page.locator('[data-action=history]').click();await page.locator('[data-restore]').last().click();assert.ok((await page.locator('.wa-operation').last().innerText()).includes('no v2 consultation'));await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-edit-edge]').count(),1);
  await page.locator('[data-action=history]').click();await page.locator('[data-restore]').last().click();await page.locator('[data-confirm-cleanup]').click();await page.waitForFunction(()=>document.querySelector('.wa-draft-status').textContent.includes('r3'));
  assert.equal(await page.locator('[data-edit-edge]').count(),0);
  await page.locator('[data-action=history]').click();await page.locator('[data-restore]').nth(1).click();await page.waitForFunction(()=>document.querySelector('.wa-draft-status').textContent.includes('r4'));
  assert.equal(await page.locator('[data-edit-edge]').getAttribute('data-edit-edge'),edgeId);
  await page.locator('[data-action=remove-consultation]').click();await page.locator('[data-confirm]').click();assert.equal(await page.locator('[data-edit-intent]').count(),0);assert.equal(await page.locator('[data-edit-edge]').count(),1,'removing consultation retains edges');
  await page.locator('[data-action=history]').click();await page.locator('[data-restore]').first().click();await page.locator('[data-confirm]').click();await page.waitForFunction(()=>document.querySelector('.wa-draft-status').textContent.includes('r5'));
  // Explicit cleanup really removes affected references; saved history stays immutable.
  await page.locator('[data-remove=m01]').click();await page.locator('[data-confirm-cleanup]').click();assert.equal(await page.locator('[data-member=m01]').count(),0);assert.equal(await page.locator('[data-edit-edge]').count(),0);
  await save(6);
  assert.equal(await page.evaluate(async()=>{const [head]=await window.repo.list();return head.manualMetadata.powerBases.length;}),0);
  await page.locator('[data-mode]').selectOption('observation');
  for(const mode of ['null','invalid']){
    await page.evaluate(mode=>{window.providerMode=mode;},mode);await page.locator('[data-action=analyze]').click();await page.waitForFunction(()=>document.querySelector('.wa-results').getAttribute('aria-busy')==='false');assert.equal(await page.locator('.wa-theme').count(),0);assert.ok((await page.locator('.wa-notice').innerText()).includes(mode==='null'?'Chart calculation failed':'Invalid chart provider result'));
  }
  // PeopleStore snapshot changes without subscribe still reject late provider responses.
  await page.evaluate(()=>{window.providerMode='delay';window.release=null;});await page.locator('[data-action=analyze]').click();await page.waitForFunction(()=>!!window.release);await page.evaluate(()=>{window.people.get('synthetic-person-0').birthDate='1991-01-01';window.providerMode='ready';window.release();});await page.waitForFunction(()=>document.querySelector('.wa-results').getAttribute('aria-busy')==='false');assert.equal(await page.locator('.wa-theme').count(),0);
  assert.equal(await page.evaluate(()=>new Promise(resolve=>{const request=indexedDB.open('ohd-wa-refs-v1',1);request.onerror=()=>resolve(request.error.name);request.onsuccess=()=>{request.result.close();resolve('unexpected');};})),'VersionError','old client fenced');
  await page.evaluate(async()=>{const [head]=await window.repo.list();await window.repo.save({...head,title:'External revision'},{expectedRevision:head.revision});});await page.locator('[data-title]').fill('Retained local annotated draft');await page.locator('[data-action=save]').click();await page.waitForFunction(()=>document.querySelector('.wa-notice').textContent.includes('local draft'));assert.equal(await page.locator('[data-title]').inputValue(),'Retained local annotated draft');
  for(const action of ['list','history']){
    await page.evaluate(action=>{window.readFailure=action;window.rejectRead=null;},action);await page.locator(`[data-action=${action}]`).click();await page.waitForFunction(()=>!!window.rejectRead);
    await page.locator('[data-action=new]').click();if(await page.locator('[data-confirm]').count())await page.locator('[data-confirm]').click();
    await page.evaluate(()=>{window.readFailure=null;window.rejectRead(Error('Stale read failure'));});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.locator('.wa-notice').innerText(),'','old read failure cannot pollute new organization');assert.equal(await page.locator('.wa-operation').count(),0);
  }
  // Focused review regressions use a separate fictional annotated snapshot.
  await page.evaluate(async()=>{
    window.view.dispose();
    const {mountWa}=await import('/src/views/wa.js');const {fixture,chart}=await import('/tests/helpers/wa-fixtures.js');
    const {updateWaAnnotations}=await import('/src/lib/wa/model.js');
    const snapshot=updateWaAnnotations(fixture().snapshot,{manualCommunicationEdges:[{edgeId:'legacy-edge',fromMemberId:'m00',toMemberId:'m01',assignment:'manual',sourceRef:'manual-source'}]});
    const host=document.createElement('section');document.body.append(host);
    window.reviewSaved=snapshot;
    const repository={list:async()=>[snapshot],get:async()=>snapshot,save:async next=>{window.reviewSaved=structuredClone(next);return next;}};
    window.view=mountWa(host,{repository,peopleStore:{list:()=>[...window.people.values()],get:id=>window.people.get(id),subscribe:()=>()=>{}},computeChart:async()=>({chart:chart([21,45])})});
  });
  await load();await openManual();await page.locator('[data-manual-section=g0]>summary').click();
  await page.locator('[data-action=analyze]').click();await page.waitForSelector('[data-coverage=all]');
  const fields=[['[data-title]','中文组织'],['[data-group-title=g0]','中文分组'],['[data-manual-field=specificProblem]','跨组沟通问题'],['[data-manual-field=personalManagementNotes]','个人管理记录'],['[data-manual-field=communicationPlan]','繁體溝通計畫'],['[data-area=g0][data-manual-field=workScope]','工作范围'],['[data-area=g0][data-manual-field=demand]','每周需求'],['[data-area=g0][data-manual-field=requiredSkills]','倾听\n记录']];
  for(const [selector,value] of fields){
    const check=await page.locator(selector).evaluate((node,value)=>{
      node.focus();node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));
      node.value='zhong';node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',isComposing:true,data:'zhong'}));
      const retained=node.isConnected&&document.activeElement===node;
      const cleared=!document.querySelector('.wa-theme')&&document.querySelector('.wa-results').getAttribute('aria-busy')==='false';
      node.value=value;node.dispatchEvent(new CompositionEvent('compositionupdate',{bubbles:true,data:value}));
      node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',isComposing:true,data:value}));
      node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:value}));
      node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',isComposing:false,data:value}));
      return {retained,cleared,finalRetained:node.isConnected&&document.activeElement===node,value:node.value};
    },value);
    assert.deepEqual(check,{retained:true,cleared:true,finalRetained:true,value},`IME retains native node: ${selector}`);
  }
  await page.locator('[data-action=save]').click();await page.waitForFunction(()=>!document.querySelector('[data-action=save]').disabled);
  const composed=await page.evaluate(()=>window.reviewSaved);
  assert.equal(composed.title,'中文组织');assert.equal(composed.pentas[0].title,'中文分组');
  assert.equal(composed.consultation.specificProblem,'跨组沟通问题');assert.equal(composed.consultation.personalManagementNotes,'个人管理记录');assert.equal(composed.consultation.communicationPlan,'繁體溝通計畫');assert.deepEqual(composed.consultation.businessAreas[0],{pentaId:'g0',workScope:'工作范围',demand:'每周需求',requiredSkills:['倾听','记录']});
  const saveReview=async()=>{await page.locator('[data-action=save]').click();await page.waitForFunction(()=>!document.querySelector('[data-action=save]').disabled);return page.evaluate(()=>window.reviewSaved.manualCommunicationEdges);};
  await page.locator('[data-edit-edge=legacy-edge]').click();await page.locator('[data-save-record]').click();
  let edge=(await saveReview())[0];assert.equal(Object.hasOwn(edge,'label'),false);assert.equal(Object.hasOwn(edge,'note'),false);assert.equal(edge.sourceRef,'manual-source');
  await page.locator('[data-edit-edge=legacy-edge]').click();await page.locator('[name=toMemberId]').selectOption('m02');await page.locator('[data-save-record]').click();
  edge=(await saveReview())[0];assert.equal(edge.toMemberId,'m02');assert.equal(Object.hasOwn(edge,'label'),false);assert.equal(Object.hasOwn(edge,'note'),false);assert.equal(edge.sourceRef,'manual-source');
  await page.locator('[data-edit-edge=legacy-edge]').click();await page.locator('[name=label]').fill('中文联系');await page.locator('[data-save-record]').click();await saveReview();
  await page.locator('[data-edit-edge=legacy-edge]').click();await page.locator('[name=label]').fill('');await page.locator('[data-save-record]').click();
  edge=(await saveReview())[0];assert.equal(edge.label,'');assert.equal(Object.hasOwn(edge,'note'),false);assert.equal(edge.sourceRef,'manual-source');
  await page.locator('[data-action=add-edge]').click();await page.locator('[data-save-record]').click();edge=(await saveReview()).at(-1);assert.equal(Object.hasOwn(edge,'label'),false);assert.equal(Object.hasOwn(edge,'note'),false);
  assert.deepEqual(errors,[]);
  console.log(`Wa v2 UI passed: annotations, stable IDs, reload, restore warning/history, reference cancel/cleanup, backup downloads, group/Alpha scopes, provider errors/stale, protected v1, CAS; IME node identity/Chinese save and optional-edge absence/explicit clear; ${process.env.WA_SKIP_VISUAL_MATRIX==='1'?0:3*3*SKINS.length} actual Skin/locale/viewport checks.`);
} finally {await browser.close();}
