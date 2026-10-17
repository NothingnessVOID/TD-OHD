import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const base=process.env.E2E_URL||'http://127.0.0.1:9961';
const output='artifacts/visual-review/wa-oc16-preview';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chromium',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const evidence=[];
const root=()=>page.locator('#wa-view');
const top=()=>page.locator('.wa-composer').last();
const waitReady=async()=>{
  await page.waitForFunction(()=>document.querySelector('#wa-view .wa-workspace')?.getAttribute('aria-busy')==='false'&&!document.querySelector('#wa-view .wa-error'));
};
try {
  await page.addInitScript(()=>localStorage.setItem('ohd-language','zh-CN'));
  await page.goto(`${base}/?view=wa`);
  await root().locator('[data-wa-page]').waitFor();
  await page.evaluate(async()=>{
    window.live=path=>performance.getEntriesByType('resource').map(row=>row.name).find(url=>new URL(url).pathname===path)||path;
    window.people=await import(window.live('/src/lib/people.js'));
    window.repo=(await import(window.live('/src/lib/wa/repository.js'))).createWaRepository();
    window.i18n=await import(window.live('/src/lib/i18n.js'));
    window.compute=(await import(window.live('/src/lib/chartdata.js'))).computeChart;
    const {saveTeam}=await import(window.live('/src/lib/team-repository.js'));
    const dates=['1987-02-14','1973-08-29','1998-11-06','2001-04-19','1965-12-23','1992-07-08','1981-03-30','1979-10-17','1995-05-02','1988-09-11','2000-01-26','1969-06-15'];
    const names=['林岚','周舟','陈禾','苏衡','许澄','江序','叶青','陆遥','温宁','沈简','季朗','程雨'];
    window.fixturePeople=dates.map((birthDate,index)=>({id:`fictional-oc16-${index}`,name:`虚构·${names[index]}`,birthDate,birthTime:`${String(2+index).padStart(2,'0')}:${index%2?'35':'10'}`,timeUnknown:false,timezone:8,location:{lat:31.2,lon:121.4,name:'Fictional test location',timezone:8}}));
    for(const person of window.fixturePeople)window.people.savePerson(person);
    for(let group=0;group<3;group++){
      const selected=window.fixturePeople.slice(1+group*3,4+group*3);
      saveTeam({teamId:`fictional-oc16-team-${group}`,name:`虚构示范团队 ${group+1}`,members:selected.map((person,index)=>({memberId:`team-only-${group}-${index}`,personId:person.id,labelSnapshot:person.name})),groups:[{pentaId:`team-group-${group}`,label:['产品小组','客户小组','交付小组'][group],memberIds:selected.map((_,index)=>`team-only-${group}-${index}`)}]});
    }
    window.gateSets={};window.rawActivations={};
    for(const person of window.fixturePeople){const {chart}=await window.compute(person);const activations=['personality','design'].flatMap(side=>Object.entries(chart.gates[side]).map(([planet,activation])=>({side,planet,gate:activation.gate,line:activation.line})));window.rawActivations[person.id]=activations;window.gateSets[person.id]=[...new Set(activations.map(a=>a.gate))];}
    window.referencePairs={management:[[45,21],[44,26]],competition:[[51,25]],direction:[[14,2]],interaction:[[59,6]],logic:[[27,50]],innovation:[[3,60]]};
  });
  await root().locator('[data-title]').fill('虚构组织 · OC16 结构实验');
  const groupIds=await root().locator('[data-import]').evaluateAll(nodes=>nodes.map(node=>node.dataset.import));
  const verify=async(ids,label)=>{
    await waitReady();
    const expected=await page.evaluate(ids=>{
      const gates=new Set(ids.flatMap(index=>window.gateSets[`fictional-oc16-${index}`]));
      return {departments:Object.fromEntries(Object.entries(window.referencePairs).map(([id,pairs])=>[id,{gates:pairs.flat().filter(gate=>gates.has(gate)).length,pairs:pairs.filter(pair=>pair.every(gate=>gates.has(gate))).length}])),core:Object.values(window.referencePairs).map(pairs=>pairs[0].map(gate=>[gate,gates.has(gate)])),gates:[...gates].sort((a,b)=>a-b)};
    },ids);
    const actual=await root().locator('[data-department-card]').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>[node.dataset.departmentCard,{gates:Number(node.dataset.gateCount),pairs:Number(node.dataset.pairCount)}])));
    assert.deepEqual(actual,expected.departments,label);
    for(const [gate,present] of expected.core.flat())assert.equal(await root().locator(`.wa-core-svg [data-wa-gate="${gate}"]`).getAttribute('data-covered'),String(present),`${label} gate ${gate}`);
    evidence.push({label,people:ids,departments:actual,coveredGates:expected.gates});return actual;
  };
  const quickSelect=async(target,ids)=>{
    await root().locator(`[data-compose="${target}"]`).click();
    for(const id of ids)await top().locator(`[data-person="fictional-oc16-${id}"]`).click();
    await top().locator('[data-selection]').click();
    await page.waitForFunction(()=>!document.querySelector('.wa-composer'));
  };
  await quickSelect('alpha',[0]);
  const one=await verify([0],'one real WASM person, no Penta');
  await quickSelect(groupIds[0],[1]);
  const two=await verify([0,1],'two real people');assert.notDeepEqual(one,two);
  await root().locator('.wa-graph-panel').screenshot({path:`${output}/two-person-core-channels.png`});
  await quickSelect(groupIds[0],[2]);
  await verify([0,1,2],'three people, Penta still has only two');
  for(let index=0;index<3;index++){
    await root().locator(`[data-import="${groupIds[index]}"]`).click();
    await top().locator(`[data-import-index="${index}"]`).click();
    await page.waitForFunction(()=>!document.querySelector('.wa-composer'));
  }
  await verify([0,1,2,3,4,5,6,7,8,9],'standard 10-person Wa');
  assert.ok((await root().innerText()).includes('标准配置已齐备'));
  await root().locator('[data-action="edit"]').click();
  assert.ok((await page.locator('.wa-composer').boundingBox()).width>600,'desktop composer must not inherit the generic 360px modal cap');
  await page.locator('.wa-composer').screenshot({path:`${output}/member-editor.png`});
  await page.keyboard.press('Escape');
  await page.screenshot({path:`${output}/desktop-overview.png`,fullPage:true});
  await root().locator('.wa-configuration').screenshot({path:`${output}/configuration.png`});
  await root().locator('.wa-graph-panel').screenshot({path:`${output}/six-core-channels.png`});
  await root().locator('.wa-department-list').screenshot({path:`${output}/six-departments.png`});
  // Import the already-assigned first group into B: clear conflict, no silent move.
  await root().locator(`[data-import="${groupIds[1]}"]`).click();
  await top().locator('[data-import-index="0"]').click();
  assert.notEqual(await top().locator('[data-error]').innerText(),'');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.wa-composer'));
  await verify([0,1,2,3,4,5,6,7,8,9],'conflicting import leaves organization intact');
  // Single Penta defaults to its own members; Alpha is always explicit.
  await root().locator(`[data-scope-option="${groupIds[0]}"]`).click();
  assert.equal(await root().locator('[data-include-alpha]').isChecked(),false);
  await verify([1,2,3],'group A alone by default');
  await root().locator('[data-include-alpha]').check();await verify([0,1,2,3],'group A with explicit Alpha');
  await root().locator('[data-include-alpha]').uncheck();await verify([1,2,3],'group A alone');
  await root().locator('[data-scope-option=""]').click();
  // Returning to all participants restores Alpha inclusion.
  await verify([0,1,2,3,4,5,6,7,8,9],'all participants after group-only');
  // Shared details: core gate -> channel -> other endpoint -> Back -> Escape.
  await root().locator('.wa-core-svg [data-wa-gate="60"]').focus();await page.keyboard.press('Enter');
  assert.ok(await page.locator('.wa-reading-sheet').isVisible());
  assert.ok((await page.locator('.wa-reading-sheet').boundingBox()).width>600,'desktop details use the shared wide sheet');
  const expectedNames=await page.evaluate(()=>window.fixturePeople.slice(0,10).filter(p=>window.gateSets[p.id].includes(60)).map(p=>p.name));
  for(const name of expectedNames)assert.ok((await page.locator('.wa-reading-sheet').innerText()).includes(name));
  await page.locator('.wa-reading-sheet [data-wa-pair="3-60"]').first().click();
  await page.locator('.wa-reading-sheet [data-wa-gate="3"]').first().click();
  await page.locator('[data-wa-back]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.waPair||document.activeElement?.dataset.waGate),'60','closing returns to the original gate trigger, not the last visited pair');
  await root().locator('[data-department-toggle="management"]').click();
  await root().locator('[data-pair-row="26-44"] [data-wa-pair]').click();
  assert.ok((await page.locator('.wa-reading-sheet').innerText()).includes('人事'));
  await page.keyboard.press('Escape');
  // Real v1 save -> annotated v2 load -> Alpha replacement preserves all annotations.
  await root().locator('[data-action="save"]').click();await page.waitForFunction(()=>document.querySelector('.wa-draft-status')?.textContent.includes('r1'));
  const organizationId=await page.evaluate(async()=>{
    const [saved]=await window.repo.list();assertRef(saved);
    function assertRef(saved){if(saved.schema!=='wa-refs-v1'||saved.members.some(member=>'chart'in member||'birth'in member))throw Error('Saved snapshot must stay refs-only v1');}
    const {updateWaAnnotations}=await import(window.live('/src/lib/wa/model.js'));
    const annotated=updateWaAnnotations(saved,{consultation:{assignment:'manual',origin:'manual',specificProblem:'Fictional legacy note preserved'},manualCommunicationEdges:[{edgeId:'fictional-old-edge',fromMemberId:saved.pentas[0].memberIds[0],toMemberId:saved.pentas[1].memberIds[0],assignment:'manual'}]});
    await window.repo.save(annotated,{expectedRevision:1});return saved.organizationId;
  });
  await page.reload();await root().locator('[data-wa-page]').waitFor();await waitReady();
  await page.waitForFunction(()=>document.querySelector('.wa-draft-status')?.textContent.includes('r2'));
  await quickSelect('alpha',[10]);
  // Oracle seed stays outside the app and is restored after reload without affecting displayed results.
  const captured=await page.evaluate(async()=>{const people=await import('/src/lib/people.js');const {computeChart}=await import('/src/lib/chartdata.js');return Promise.all(people.listPeople().map(async person=>{const {chart}=await computeChart({...person,timezone:person.location.timezone});return {id:person.id,gates:[...new Set(['personality','design'].flatMap(side=>Object.values(chart.gates[side]).map(a=>a.gate)))]};}));});
  await page.evaluate(captured=>{window.gateSets=Object.fromEntries(captured.map(p=>[p.id,p.gates]));window.referencePairs={management:[[45,21],[44,26]],competition:[[51,25]],direction:[[14,2]],interaction:[[59,6]],logic:[[27,50]],innovation:[[3,60]]};},captured);
  await verify([10,1,2,3,4,5,6,7,8,9],'direct Alpha replacement');
  await root().locator('[data-action="save"]').click();await page.waitForFunction(()=>document.querySelector('.wa-draft-status')?.textContent.includes('r3'));
  const persisted=await page.evaluate(async id=>{const repo=(await import('/src/lib/wa/repository.js')).createWaRepository();return {head:await repo.get(id),history:await repo.history(id)};},organizationId);
  assert.equal(persisted.head.consultation.specificProblem,'Fictional legacy note preserved');assert.equal(persisted.head.manualCommunicationEdges.length,1);assert.equal(persisted.history.length,3);
  assert.equal(persisted.head.layoutMode,'standard');
  await root().locator('[data-action="open"]').click();await page.locator(`[data-history-org="${organizationId}"]`).click();
  await page.locator(`[data-restore="${persisted.history.find(r=>r.revision===1).revisionId}"]`).click();await page.locator('[data-confirm]').click();
  await page.waitForFunction(()=>document.querySelector('.wa-draft-status')?.textContent.includes('r4'));await waitReady();
  assert.equal((await page.evaluate(async id=>(await (await import('/src/lib/wa/repository.js')).createWaRepository().history(id)).find(r=>r.revision===2).consultation.specificProblem,organizationId)),'Fictional legacy note preserved');
  // A genuinely missing assigned person must identify the error and show unknown, never zero.
  await page.evaluate(async()=>{const people=await import('/src/lib/people.js');const person=people.getPerson('fictional-oc16-9');window.removedPerson={...person,timezone:person.location.timezone};people.deletePerson(person.id);});
  await root().locator('.wa-error').waitFor();
  assert.ok((await root().locator('.wa-errors').innerText()).includes('MISSING_PERSON_REFERENCE'));
  assert.ok((await root().locator('[data-oc16-gates]').innerText()).includes('—'));
  assert.equal(await root().locator('.wa-core-svg [data-wa-gate="60"]').getAttribute('data-covered'),'unknown');
  await page.evaluate(async()=>{(await import('/src/lib/people.js')).savePerson(window.removedPerson);});await waitReady();
  // The whole-organization Core Wa uncertainty metadata must not leak into a group-only view.
  await page.evaluate(async()=>{const people=await import('/src/lib/people.js');const person=people.getPerson('fictional-oc16-0');window.exactAlpha={...person,timezone:person.location.timezone};people.savePerson({...window.exactAlpha,timeUnknown:true});});
  await waitReady();assert.equal(await root().locator('[data-wa-uncertainty]').count(),1);
  await root().locator(`[data-scope-option="${groupIds[0]}"]`).click();assert.equal(await root().locator('[data-wa-uncertainty]').count(),0);
  await root().locator('[data-include-alpha]').check();assert.equal(await root().locator('[data-wa-uncertainty]').count(),1);
  await page.evaluate(async()=>{(await import('/src/lib/people.js')).savePerson(window.exactAlpha);});await waitReady();
  await root().locator('[data-scope-option=""]').click();assert.equal(await root().locator('[data-wa-uncertainty]').count(),0);
  // Three focused visual samples only; full Skin/language matrix follows user acceptance.
  for(const [locale,skin,width] of [['zh-CN','default-light',390],['zh-Hant','default-dark',320],['en','high-contrast',1280]]){
    await page.setViewportSize({width,height:900});
    await page.evaluate(async({locale,skin})=>{(await import('/src/lib/i18n.js')).setLocale(locale,{persist:false});(await import('/src/lib/appearance.js')).setSkin(skin);},{locale,skin});
    await root().locator('[data-wa-page]').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,`${locale} ${width} overflow`);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`${output}/${width}-${locale}-${skin}.png`,fullPage:true});
    await page.screenshot({path:`${output}/${width}-${locale}-${skin}-viewport.png`});
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/coverage-evidence.json`,JSON.stringify({kind:'real-WASM fictional participants; UI compared to direct activation union',cases:evidence},null,2));
  console.log('PASS Wa OC16 preview: real WASM 1/2/3/10 people, direct selection/import/conflict, scoped coverage + actual SVG gates, pillar/pair/gate details and focus, v1/v2 IndexedDB save/reload/restore, 3 visual samples. Full acceptance matrix deferred.');
}catch(error){await page.screenshot({path:`${output}/failure.png`,fullPage:true}).catch(()=>{});throw error;}
finally{await browser.close();}
