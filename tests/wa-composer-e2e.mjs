import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const base=process.env.E2E_URL||'http://127.0.0.1:9961';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chromium',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const root=()=>page.locator('#wa-view');
const picker=()=>page.locator('.wa-target-picker');
const ready=()=>page.waitForFunction(()=>document.querySelector('.wa-workspace')?.getAttribute('aria-busy')==='false');
// The 700 ms autosave can commit at any point of a slower run, so revisions are read from storage instead of assumed.
const storedSnapshot=()=>page.evaluate(async()=>{const repo=(await import('/src/lib/wa/repository.js')).createWaRepository();const [saved]=await repo.list();return saved??null;});
const revisionMatches=expected=>page.waitForFunction(value=>{const status=document.querySelector('.wa-draft-status');return status?.dataset.dirty==='false'&&Number(status.textContent.match(/r(\d+)$/)?.[1]??-1)===value;},expected);
// An autosave finishing between the read and the click only makes the stored revision jump further, which still passes; the
// guard below rejects a click that saved nothing, and the returned record is read once after the wait so later math cannot drift.
const saveAdvances=async()=>{const before=(await storedSnapshot())?.revision??0;await root().locator('[data-action="save"]').click();await page.waitForFunction(value=>{const status=document.querySelector('.wa-draft-status');return status?.dataset.dirty==='false'&&Number(status.textContent.match(/r(\d+)$/)?.[1]??-1)>value;},before);const saved=await storedSnapshot();if(!saved||saved.revision<=before)throw new Error(`Wa save did not advance past r${before}`);return saved;};
try {
 await page.goto(`${base}/?view=wa`);await root().locator('[data-title]').waitFor();
 await page.evaluate(async()=>{
  window.live=path=>performance.getEntriesByType('resource').map(row=>row.name).find(url=>new URL(url).pathname===path)||path;
  window.people=await import(window.live('/src/lib/people.js'));
  window.repo=(await import(window.live('/src/lib/wa/repository.js'))).createWaRepository();
  for(let index=0;index<7;index++)window.people.savePerson({id:`fictional-direct-${index}`,name:`Fictional direct ${index}`,birthDate:`199${index}-01-01`,birthTime:'12:00',timezone:0,location:{lat:0,lon:0,timezone:0,name:'Fictional'}});
  window.births=JSON.stringify(window.people.listPeople());
  (await import(window.live('/src/lib/team-repository.js'))).saveTeam({teamId:'fictional-direct-team',name:'Fictional import team',members:[2,4].map(i=>({memberId:`team-only-${i}`,personId:`fictional-direct-${i}`,labelSnapshot:`Fictional direct ${i}`})),groups:[{pentaId:'source-group',label:'Fictional source group',memberIds:['team-only-2','team-only-4']}]});
 });
 await root().locator('[data-title]').fill('Fictional inline Wa');
 assert.equal(await root().locator('.wa-header [data-action="edit"]').count(),0,'no general editor button');
 const groups=await root().locator('[data-wa-target]').evaluateAll(nodes=>nodes.map(node=>node.dataset.waTarget).filter(id=>id!=='alpha'));
 const choose=async(target,indices)=>{
  await root().locator(`[data-compose="${target}"]`).click();
  assert.equal(await page.locator('.operation-dialog').count(),1,'exactly one picker, no editor underneath');
  assert.equal(await page.locator('.wa-composer-cards,[data-apply]').count(),0);
  for(const i of indices)await picker().locator(`[data-person="fictional-direct-${i}"]`).click();
  await picker().locator('[data-selection]').click();await page.waitForFunction(()=>!document.querySelector('.wa-target-picker'));await ready();
 };
 await choose('alpha',[0]);await choose('alpha',[1]);
 assert.ok((await root().locator('[data-wa-target="alpha"]').innerText()).includes('Fictional direct 1'));
 await root().locator('[data-clear-alpha]').click();await ready();
 assert.equal(await root().locator('[data-wa-target="alpha"] [data-wa-member-chip]').count(),0);
 await choose(groups[0],[2,3]);
 const oldIds=await root().locator(`[data-wa-target="${groups[0]}"] [data-wa-member-chip]`).evaluateAll(nodes=>nodes.map(node=>node.dataset.waMemberChip));
 await root().locator(`[data-compose="${groups[0]}"]`).click();
 await picker().locator('[data-person="fictional-direct-5"]').click();await page.keyboard.press('Escape');
 assert.deepEqual(await root().locator(`[data-wa-target="${groups[0]}"] [data-wa-member-chip]`).evaluateAll(nodes=>nodes.map(node=>node.dataset.waMemberChip)),oldIds,'cancel never commits');
 await root().locator(`[data-import="${groups[1]}"]`).click();await picker().locator('[data-import-index="0"]').click();
 assert.notEqual(await picker().locator('[data-error]').innerText(),'','cross-group import rejected');await page.keyboard.press('Escape');
 await root().locator(`[data-remove-wa="${oldIds[0]}"]`).click();await ready();
 await root().locator(`[data-import="${groups[1]}"]`).click();await picker().locator('[data-import-index="0"]').click();await page.waitForFunction(()=>!document.querySelector('.wa-target-picker'));await ready();
 assert.ok(await root().locator(`[data-wa-target="${groups[1]}"] [data-wa-member-chip="${oldIds[0]}"]`).count(),'pool reference retains Wa identity on import');
 const snapshot=await saveAdvances();
 assert.equal(snapshot.schema,'wa-refs-v1');assert.ok(snapshot.members.every(m=>!('birth'in m)&&!('chart'in m)&&!m.memberId.startsWith('team-only')));
 assert.equal(await page.evaluate(()=>JSON.stringify(window.people.listPeople())===window.births),true,'organizing never rewrites people');
 await root().locator(`[data-compose="${groups[0]}"]`).click();await picker().locator('[data-search]').fill('direct 3');
 await picker().locator('[data-edit="fictional-direct-3"]').click();
 assert.equal(await page.locator('.wa-target-picker').count(),0);assert.equal(await page.locator('.operation-dialog').count(),1);
 await page.locator('#edit-cancel').click();assert.equal(await picker().locator('[data-search]').inputValue(),'direct 3');await page.keyboard.press('Escape');
 const externalRevision=await page.evaluate(async()=>{const [saved]=await window.repo.list();const {updateWaAnnotations}=await import(window.live('/src/lib/wa/model.js'));const m3=saved.members.find(m=>m.personId==='fictional-direct-3').memberId;const next=updateWaAnnotations(saved,{consultation:{assignment:'manual',origin:'manual',specificProblem:'Fictional preserved note',keyAllyIds:[m3]}});const written=await window.repo.save(next,{expectedRevision:saved.revision});return written.revision;});
 await page.reload();await revisionMatches(externalRevision);await ready();
 await root().locator(`[data-remove-wa="${oldIds[1]}"]`).click();await page.locator('[data-confirm]').waitFor();await page.keyboard.press('Escape');
 assert.equal(await root().locator(`[data-remove-wa="${oldIds[1]}"]`).count(),1);
 await root().locator(`[data-remove-wa="${oldIds[1]}"]`).click();await page.locator('[data-confirm]').click();await ready();
 assert.equal(await root().locator(`[data-remove-wa="${oldIds[1]}"]`).count(),0);
 await saveAdvances();
 const history=await page.evaluate(async id=>(await import('/src/lib/wa/repository.js')).createWaRepository().history(id),snapshot.organizationId);
 assert.equal(history.find(row=>row.revision===externalRevision).consultation.keyAllyIds.length,1);assert.equal(history[0].consultation.keyAllyIds.length,0);assert.equal(history[0].consultation.specificProblem,'Fictional preserved note');
 // Preserve the former composer's failure/cleanup assertions with the new single-dialog contract.
 await page.evaluate(async()=>{
  const live=path=>performance.getEntriesByType('resource').map(row=>row.name).find(url=>new URL(url).pathname===path)||path;
  const {openWaMemberPicker}=await import(live('/src/views/wa-composer.js'));
  const {createWaDraft,updateWaAnnotations}=await import(live('/src/lib/wa/model.js'));
  const {replaceWaSelection}=await import(live('/src/lib/wa/configuration.js'));
  const people=await import(live('/src/lib/people.js'));(await import(live('/src/lib/i18n.js'))).setLocale('en',{persist:false});
  let draft=createWaDraft();draft.pentas.forEach((g,i)=>g.pentaId=`guard-g${i}`);
  draft=replaceWaSelection(draft,{alphaPersonId:'fictional-direct-0',groups:[{pentaId:'guard-g0',personIds:['fictional-direct-1']}]},new Map(people.listPeople().map(p=>[p.id,p])));
  window.guardSnapshot=updateWaAnnotations(draft,{consultation:{assignment:'manual',origin:'manual',specificProblem:'Fictional guard',keyAllyIds:[draft.pentas[0].memberIds[0]]}});
  window.guardValid=true;window.rejectGuard=false;window.commits=[];window.guardTeams=[];
  window.launch=(target,mode='people')=>{window.picker=openWaMemberPicker({snapshot:window.guardSnapshot,target,mode,peopleStore:{list:people.listPeople,get:people.getPerson},listTeams:()=>window.guardTeams,validate:()=>window.guardValid,onCommit:(next,context)=>{if(!context.isCurrent()||window.rejectGuard)return false;window.commits.push({next,changes:context.annotationChanges,original:context.originalSnapshot});}});};
 });
 await page.evaluate(()=>window.launch('guard-g1'));
 assert.equal(await picker().locator('[data-person="fictional-direct-0"]').isDisabled(),true);assert.equal(await picker().locator('[data-person="fictional-direct-1"]').isDisabled(),true);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>window.launch('guard-g0'));await picker().locator('[data-person="fictional-direct-1"]').click();await picker().locator('[data-selection]').click();
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.commits.length),0);
 await picker().locator('[data-selection]').click();await page.evaluate(()=>window.guardValid=false);await page.locator('[data-confirm]').click();
 assert.ok((await picker().locator('[data-error]').innerText()).includes('changed'));assert.equal(await page.evaluate(()=>window.commits.length),0);await page.keyboard.press('Escape');
 await page.evaluate(()=>{window.guardValid=true;window.launch('guard-g0');});await picker().locator('[data-person="fictional-direct-1"]').click();await picker().locator('[data-selection]').click();await page.locator('[data-confirm]').click();
 const cleanup=await page.evaluate(()=>window.commits.at(-1));assert.equal(cleanup.changes.length,1);assert.equal(cleanup.changes[0].beforeSnapshot.consultation.keyAllyIds.length,1);assert.equal(cleanup.next.consultation.keyAllyIds.length,0);assert.equal(cleanup.next.members.length,cleanup.original.members.length);
 await page.evaluate(()=>{window.rejectGuard=true;window.launch('alpha');});await picker().locator('[data-person="fictional-direct-3"]').click();await picker().locator('[data-selection]').click();assert.ok((await picker().locator('[data-error]').innerText()).includes('changed'));assert.equal(await picker().count(),1);await page.keyboard.press('Escape');
 await page.evaluate(()=>{window.rejectGuard=false;window.guardTeams=[{name:'Fictional duplicate team',members:[{memberId:'source',personId:'fictional-direct-3'}],groups:[{pentaId:'g',label:'Fictional duplicate',memberIds:['source','source']}]}];window.launch('guard-g1','import');});await picker().locator('[data-import-index="0"]').click();assert.ok((await picker().locator('[data-error]').innerText()).includes('duplicate'));await page.keyboard.press('Escape');
 await page.evaluate(()=>{window.guardTeams=[];window.launch('guard-g1','import');});await page.waitForFunction(()=>document.querySelector('[data-import-list]')?.getAttribute('aria-busy')==='false');await picker().locator('[data-switch-mode]').click();assert.equal(await page.locator('.operation-dialog').count(),1);await page.keyboard.press('Escape');
 await page.evaluate(()=>window.launch('alpha'));await picker().locator('[data-person="fictional-direct-4"]').click();await picker().locator('[data-edit="fictional-direct-4"]').click();await page.locator('#edit-name').fill('Fictional direct 4 edited');await page.locator('#edit-save').click();
 assert.equal(await picker().locator('[data-person="fictional-direct-4"]').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>window.commits.length),1);await picker().locator('[data-selection]').click();assert.equal(await page.evaluate(()=>window.commits.length),2);
 // A dirty title arms the 700 ms autosave; that save must wait for an open picker instead of replacing the draft under it.
 await root().locator('[data-title]').fill('Fictional inline Wa autosave');await root().locator('[data-compose="alpha"]').click();
 await picker().locator('[data-person="fictional-direct-6"]').click();await page.waitForTimeout(1200);
 await picker().locator('[data-selection]').click();await page.waitForFunction(()=>!document.querySelector('.wa-target-picker'));await ready();
 assert.ok((await root().locator('[data-wa-target="alpha"]').innerText()).includes('Fictional direct 6'),'a background autosave never strands an open picker');
 assert.deepEqual(errors,[]);
 console.log('PASS direct Wa editing: single-layer picker, Alpha replace/clear, on-page removal, import/cancel/conflicts/duplicates, stable refs, annotation history and stale/rejected confirmations, person editor return, autosave deferred while a picker is open.');
}finally{await browser.close();}
