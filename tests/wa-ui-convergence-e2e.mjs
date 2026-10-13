import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Parent authorized frozen b2b3019 on 2026-10-13. Root-served product only.
// No product imports from this worktree, no server management, no persistent user profile.
// Adapter reconciled against frozen renderer and reading-presentation unit contracts.
const ADAPTER = Object.freeze({
  ready: true,
  participantCount: '.wa-channel-people-count',
  reading: '[data-wa-reading-id]',
  readingTitle: 'h3',
  displayMapAttribute: 'data-wa-display-map',
  displayMap: 'wa-reading-ui-v1',
  back: '[data-wa-back], [data-shared-back]',
});
const base = process.env.E2E_URL || 'http://127.0.0.1:9961';
const rootSource = process.env.WA_ROOT_SOURCE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../TD-OHD');
const sorted = values => [...values].sort();
const unique = values => sorted(new Set(values));
const canonical = gates => [...gates].sort((a,b) => a-b).join('-');
const key = a => JSON.stringify([a.memberId,a.side,a.planet,a.gate,a.line]);
const departments = {
  management:[[45,21],[54,32],[44,26],[19,49],[37,40]], competition:[[51,25],[10,34]],
  direction:[[14,2],[61,24],[43,23],[8,1]],
  interaction:[[59,6],[64,47],[11,56],[35,36],[30,41],[53,42],[29,46],[13,33]],
  logic:[[27,50],[63,4],[17,62],[48,16],[18,58],[9,52],[5,15],[7,31]],
  innovation:[[3,60],[38,28],[57,20],[39,55],[22,12]],
};
const pairs = Object.entries(departments).flatMap(([department,values]) => values.map((displayGates,i) => ({
  department, displayGates, channelId:canonical(displayGates), core:i===0,
})));
const coreGates = pairs.filter(p => p.core).flatMap(p => p.displayGates);
const sourceByDepartment = { management:'45-21', competition:'51-25', direction:'2-14', interaction:'59-6', logic:'27-50', innovation:'3-60' };
const forbidden = /门对|門對|支持门对|覆盖|覆蓋|不同成员共同覆盖|不代表正式|仅供参考|僅供參考|尚未证实|仅实验性|\b(?:coverage|pairs?|supporting\s+pairs?|disclaimers?)\b|for reference only|not (?:official|proven|verified)|experimental only/i;
const normalize = value => value.replace(/\s+/g,' ').trim();
// Reviewed independently from frozen presentation rules; expected text uses author JSON,
// never DOM or readWaReadingExcerpt output. These are the six department sources.
function excerptOracle(source,locale) {
  const indices=['51-25','scale-and-template','powerbases'].includes(source.objectId)?[0]:source.objectId==='membership'?[1]:[0,1];
  let detail=indices.map(i=>source.locales[locale].detail.split(/\n\n+/)[i]).join('\n\n');
  if(locale==='en' && source.objectId==='2-14') {assert.equal(detail.split('same pair').length-1,2);detail=detail.replaceAll('same pair','same channel');}
  if(locale==='en' && source.objectId==='51-25') {assert.equal(detail.split('pairs it with Powerbase study').length-1,1);detail=detail.replace('pairs it with Powerbase study','teaches it alongside Powerbase study');}
  const rules={
    'penta-and-wa:en':['group coverage','group activation patterns'],
    'gapping:zh-CN':['实际成员进入后形成什么覆盖','实际成员进入后激活哪些闸门'],
    'gapping:zh-Hant':['實際成員加入後形成何種覆蓋','實際成員加入後啟動哪些閘門'],
    'gapping:en':['Coverage produced by the actual members','The gates activated by the actual members'],
    'membership:zh-CN':['组内覆盖','组内闸门的激活情况'],
    'membership:zh-Hant':['組內覆蓋','組內閘門的啟動情況'],
    'membership:en':['headcount and coverage','headcount and active gates'],
  };
  const rule=rules[`${source.objectId}:${locale}`];if(rule){assert.equal(detail.split(rule[0]).length-1,1);detail=detail.replace(rule[0],rule[1]);}
  return {...source.locales[locale],summary:['alpha','scale-and-template'].includes(source.objectId)?null:source.locales[locale].summary,detail,indices};
}

// Expected values use raw computeChart gates only, never product analysis/renderer output.
export function gateOracle(raw, ids, gate) {
  const activations = ids.flatMap(id => { assert.ok(raw[id],`missing raw person ${id}`); return raw[id]; }).filter(a => a.gate===gate);
  return { gate, activations, memberIds:unique(activations.map(a => a.memberId)) };
}
export function pairOracle(raw, ids, pair) {
  const endpoints = pair.displayGates.map(g => gateOracle(raw,ids,g));
  const [left,right] = endpoints.map(e => e.memberIds);
  const self = left.filter(id => right.includes(id));
  const cross = left.flatMap(a => right.filter(b => a!==b).map(b => [a,b]));
  const status = !left.length && !right.length ? 'absent' : !left.length || !right.length ? 'hanging'
    : self.length ? cross.length ? 'both' : 'selfComplete' : 'crossMemberOnly';
  return {...pair,endpoints,status,memberIds:unique([...left,...right]),self,cross};
}
export function markerOracle(members) {
  return Object.fromEntries(members.map((m,i) => [m.memberId,{number:i+1,colorSlot:i%5+1}]));
}
function validateRaw(data) {
  assert.equal(data.fixture.length,12);
  for (const [id,records] of Object.entries(data.raw)) {
    assert.equal(records.length,26,`${id}: actual 26 activations`);
    for (const side of ['personality','design']) assert.equal(new Set(records.filter(a => a.side===side).map(a => a.planet)).size,13);
    for (const a of records) assert.ok(a.memberId===id && Number.isInteger(a.gate) && a.gate>=1 && a.gate<=64 && Number.isInteger(a.line) && a.line>=1 && a.line<=6);
  }
}
async function seed(page) {
  return page.evaluate(async () => {
    const live = p => performance.getEntriesByType('resource').map(r=>r.name).find(u=>new URL(u).pathname===p)||p;
    window.waAcceptanceLive=live;
    const people=await import(live('/src/lib/people.js'));
    const {computeChart}=await import(live('/src/lib/chartdata.js'));
    const {createWaDraft,createWaMember}=await import(live('/src/lib/wa/model.js'));
    const {createWaRepository}=await import(live('/src/lib/wa/repository.js'));
    const dates=['1987-02-14','1973-08-29','1998-11-06','2001-04-19','1965-12-23','1992-07-08','1981-03-30','1979-10-17','1995-05-02','1988-09-11','2000-01-26','1969-06-15'];
    const labels=['林岚','周舟','陈禾','苏衡','许澄','江序','叶青','陆遥','温宁','沈简','季朗','程雨'];
    const fixture=dates.map((birthDate,i)=>({id:`fictional-convergence-${i}`,name:`虚构·${labels[i]}`,birthDate,
      birthTime:`${String(2+i).padStart(2,'0')}:${i%2?'35':'10'}`,timeUnknown:false,timezone:8,
      location:{lat:31.2,lon:121.4,name:'Fictional test location',timezone:8}}));
    const raw={},names={};
    for (const [i,person] of fixture.entries()) {
      people.savePerson(person);
      const {chart}=await computeChart(person), memberId=`convergence-member-${i}`;
      raw[memberId]=['personality','design'].flatMap(side=>Object.entries(chart.gates[side]).map(([planet,a])=>({memberId,side,planet,gate:a.gate,line:a.line})));
      names[memberId]=person.name;
    }
    const draft=createWaDraft({organizationId:'fictional-wa-convergence',title:'虚构组织 · Wa 界面验收'});
    draft.members=fixture.map((p,i)=>createWaMember({personId:p.id,labelSnapshot:p.name,memberId:`convergence-member-${i}`}));
    draft.alphaId=draft.members[0].memberId;
    draft.pentas.forEach((p,i)=>{p.memberIds=draft.members.slice(1+i*3,4+i*3).map(m=>m.memberId);});
    const saved=await createWaRepository().save(draft,{expectedRevision:0});
    localStorage.setItem('ohd-wa-last-organization-v1',saved.organizationId);
    const {saveTeam}=await import(live('/src/lib/team-repository.js'));
    for (let i=0;i<3;i++) saveTeam({teamId:`fictional-convergence-team-${i}`,name:`Fictional import ${i}`,
      members:[0,1,2].map(j=>({memberId:`external-${i}-${j}`,personId:fixture[1+i*3+j].id,labelSnapshot:fixture[1+i*3+j].name})),
      groups:[{pentaId:`external-group-${i}`,label:`Fictional import ${i}`,memberIds:[0,1,2].map(j=>`external-${i}-${j}`)}]});
    return {fixture,raw,names,draft:saved,peopleBefore:JSON.stringify(people.listPeople())};
  });
}
async function main() {
  // All gates precede even loading Playwright or contacting HTTP.
  assert.equal(process.env.WA_D_FROZEN,'1','PENDING parent D freeze; no browser/network performed');
  assert.equal(process.env.WA_9961_READY,'1','PENDING parent root :9961 ready confirmation');
  assert.equal(ADAPTER.ready,true,'PENDING frozen C/D adapter and independently reviewed display map');
  assert.ok(ADAPTER.displayMapAttribute && ADAPTER.displayMap,'Missing D adapter');
  assert.equal(new URL(base).origin,'http://127.0.0.1:9961','Use the parent root origin');
  const sourceCommit=process.env.WA_SOURCE_COMMIT;
  assert.match(sourceCommit||'',/^[a-f0-9]{40}$/,'Provide full frozen source commit');
  const git=(...args)=>execFileSync('git',['-C',rootSource,...args],{encoding:'utf8'}).trim();
  assert.equal(git('rev-parse','HEAD'),sourceCommit,'Root HEAD is frozen source, not acceptance worktree');
  assert.equal(git('branch','--show-current'),'feature/penta-wa-integration-v1');
  assert.equal(git('status','--porcelain','--','src','public'),'','Commit frozen product before acceptance');
  const sourceHashes = new Map();
  const authorBytes=await readFile(path.join(rootSource,'src/lib/wa/content-data.json'));
  assert.deepEqual(authorBytes,execFileSync('git',['-C',rootSource,'show','df45d2e:src/lib/wa/content-data.json']),'author JSON unchanged');
  const authorRecords=JSON.parse(authorBytes);
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const output=path.resolve(process.env.WA_EVIDENCE_DIR||'artifacts/visual-review/wa-ui-convergence',`${stamp}-${sourceCommit.slice(0,8)}`);
  await mkdir(output,{recursive:true});
  const evidence={status:'RUNNING',sourceCommit,base,rootSource,adapter:ADAPTER,cases:[],screenshots:[],errors:[],sticky:[],fonts:[],colors:[]};
  const {chromium}=await import('playwright-core');
  const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chromium',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror',e=>evidence.errors.push(e.message));
  const root=()=>page.locator('#wa-view'), sheet=()=>page.locator('.wa-reading-sheet'), picker=()=>page.locator('.wa-target-picker');
  const ready=()=>page.waitForFunction(()=>document.querySelector('#wa-view .wa-workspace')?.getAttribute('aria-busy')==='false'&&!document.querySelector('#wa-view .wa-error'));
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const check=async(name,fn)=>{const entry={name,status:'RUNNING'};evidence.cases.push(entry);console.log(`START ${name}`);try{await fn();entry.status='PASS';console.log(`PASS ${name}`);}catch(e){entry.status='FAIL';entry.error=e.stack;throw e;}};
  const close=async()=>{if(await sheet().isVisible())await page.keyboard.press('Escape');};
  const copy=async locator=>assert.doesNotMatch(await locator.innerText(),forbidden,'visible copy forbidden vocabulary');
  const shot=async name=>{const filename=`${name}.png`;await page.screenshot({path:path.join(output,filename),fullPage:!await sheet().isVisible()&&!await picker().isVisible()});evidence.screenshots.push({filename,viewport:page.viewportSize(),locale:await page.evaluate(()=>document.documentElement.lang),sourceCommit});};
  let data,expectedDraft,markers,scopeGroup=null,includeAlpha=false;
  const id=i=>`convergence-member-${i}`;
  const ids=()=>scopeGroup===null?unique([expectedDraft.alphaId,...expectedDraft.pentas.flatMap(p=>p.memberIds)].filter(Boolean))
    :unique([...expectedDraft.pentas[scopeGroup].memberIds,...(includeAlpha&&expectedDraft.alphaId?[expectedDraft.alphaId]:[])]);
  const scope=async(group,alpha=false)=>{await close();scopeGroup=group;includeAlpha=alpha;
    await root().locator('[data-scope]').selectOption(group===null?'':expectedDraft.pentas[group].pentaId);
    if(group!==null){assert.equal(await root().locator('[data-include-alpha]').isChecked(),false);if(alpha)await root().locator('[data-include-alpha]').check();}
    await ready();assert.equal(Number(await root().locator('.wa-overview-stats dd').first().innerText()),ids().length);};
  const configuration=async()=>{const fold=root().locator('.wa-config-details');if(!await fold.evaluate(n=>n.open))await fold.locator('summary').click();};
  const choose=async(target,indices)=>{await configuration();await root().locator(`[data-compose="${target}"]`).click();
    assert.equal(await page.locator('.operation-dialog').count(),1);assert.equal(await page.locator('.wa-composer-cards,[data-apply]').count(),0);
    for(const i of indices)await picker().locator(`[data-person="${data.fixture[i].id}"]`).click();
    await picker().locator('[data-selection]').click();await picker().waitFor({state:'detached'});await ready();};
  const expand=async department=>{const toggle=root().locator(`[data-department-toggle="${department}"]`);if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();};
  const openPair=async pair=>{await close();await expand(pair.department);await root().locator(`[data-pair-row="${pair.channelId}"] .wa-channel-open[data-wa-pair="${pair.channelId}"]`).click();await sheet().waitFor();};
  const validateMarkers=async()=>{
    const actual=await root().locator('.wa-core-svg [data-wa-gate]').evaluateAll(nodes=>nodes.map(n=>({gate:Number(n.dataset.waGate),active:n.dataset.covered,
      markers:[...n.querySelectorAll('[data-wa-gate-marker]')].map(m=>({gate:Number(m.dataset.waGateMarker),id:m.dataset.waMarkerMember,number:Number(m.dataset.markerNumber),classes:m.getAttribute('class'),text:m.querySelector('text')?.textContent.trim()}))})));
    assert.deepEqual(sorted(actual.map(n=>n.gate)),sorted(coreGates),'exact twelve real core gates');
    for(const gate of actual){const oracle=gateOracle(data.raw,ids(),gate.gate);assert.equal(gate.active,String(oracle.memberIds.length>0));
      assert.deepEqual(sorted(gate.markers.map(m=>m.id)),oracle.memberIds,`gate ${gate.gate}: exact people once each`);
      for(const m of gate.markers){assert.equal(m.gate,gate.gate);assert.equal(m.number,markers[m.id].number);assert.equal(m.text,String(m.number));assert.ok(m.classes.split(/\s+/).includes(`wa-member-color-${markers[m.id].colorSlot}`));}}
    const legend=await root().locator('.wa-member-legend li').evaluateAll(nodes=>nodes.map(n=>({id:n.querySelector('[data-wa-marker-member]')?.dataset.waMarkerMember,number:Number(n.querySelector('[data-marker-number]')?.dataset.markerNumber),name:n.querySelector('.wa-member-legend-name')?.textContent.trim()})));
    assert.deepEqual(sorted(legend.map(m=>m.id)),sorted(ids()));for(const m of legend){assert.equal(m.number,markers[m.id].number);assert.equal(m.name,data.names[m.id]);}
  };
  const validateEndpoints=async(locator,expected)=>{
    const endpoints=await locator.locator(':scope > .wa-detail-endpoints [data-wa-endpoint]').evaluateAll(nodes=>nodes.map(n=>({gate:Number(n.dataset.waEndpoint),members:[...n.querySelectorAll('[data-wa-member]')].map(m=>({id:m.dataset.waMember,name:m.textContent.trim()}))})));
    assert.deepEqual(endpoints.map(e=>e.gate),expected.endpoints.map(e=>e.gate));
    endpoints.forEach((e,i)=>{assert.deepEqual(sorted(e.members.map(m=>m.id)),expected.endpoints[i].memberIds);for(const m of e.members)assert.equal(m.name,data.names[m.id]);});
  };
  const validateCards=async()=>{assert.equal(await root().locator('.wa-results li[data-activation-side],.wa-results [data-wa-knowledge],.wa-results [data-wa-prose]').count(),0,'right column excludes source rows and long readings');
    for(const pair of pairs){const row=root().locator(`[data-pair-row="${pair.channelId}"]`);if(!await row.isVisible())continue;
      const expected=pairOracle(data.raw,ids(),pair);await validateEndpoints(row,expected);
      assert.equal(await row.locator('.wa-channel-open > strong').evaluate(n=>n.firstChild.textContent.trim()),pair.displayGates.join('–'));
      assert.equal(Number(await row.getAttribute('data-participant-count')),expected.memberIds.length);
      const participants=await row.locator('[data-channel-participants] [data-wa-member]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.waMember,name:n.textContent.trim()})));
      assert.deepEqual(sorted(participants.map(m=>m.id)),expected.memberIds);for(const m of participants)assert.equal(m.name,data.names[m.id]);
      assert.equal(await row.locator('[data-wa-state]').getAttribute('data-wa-state'),expected.status);
      const count=row.locator(ADAPTER.participantCount);assert.equal(await count.count(),1);
      assert.equal(Number((await count.innerText()).match(/\d+/)?.[0]),expected.memberIds.length,'visible unique participant summary');}
    await copy(root());};
  const validateActivations=async(gates)=>{
    const actual=await sheet().locator('li[data-activation-side]').evaluateAll(nodes=>nodes.map(n=>({memberId:n.dataset.waMember,side:n.dataset.activationSide,planet:n.dataset.activationPlanet,gate:Number(n.dataset.activationGate),line:Number(n.dataset.activationLine),label:n.querySelector('strong')?.textContent.trim(),name:n.closest('[data-wa-activation-member]')?.querySelector('h4')?.textContent.trim(),planetText:n.querySelector('[data-wa-side] + span')?.textContent.trim(),sideText:n.querySelector('[data-wa-side]')?.textContent.trim()})));
    const expected=gates.flatMap(g=>gateOracle(data.raw,ids(),g).activations);
    assert.deepEqual(sorted(actual.map(key)),sorted(expected.map(key)),'every original planet/P/D/line record, including repeated planets at same gate');
    const labels=await page.evaluate(async planets=>{const {planetName}=await import(window.waAcceptanceLive('/src/lib/vocabulary.js'));const {t}=await import(window.waAcceptanceLive('/src/lib/i18n.js'));return {planets:Object.fromEntries(planets.map(p=>[p,planetName(p)])),sides:{personality:t('OC16 personality'),design:t('OC16 design')}};},unique(expected.map(a=>a.planet)));
    for(const a of actual){assert.equal(a.label,`${a.gate}.${a.line}`);assert.equal(a.name,data.names[a.memberId]);assert.equal(a.planetText,labels.planets[a.planet]);assert.equal(a.sideText,labels.sides[a.side]);}
  };
  const expandFolds=async()=>{for(const summary of await sheet().locator('details:not([open]) > summary').all())await summary.click();};
  const validateReading=async pair=>{
    const locale=await page.evaluate(async()=>(await import(window.waAcceptanceLive('/src/lib/i18n.js'))).getLocale());
    const expectedSource=`wa.communication.${sourceByDepartment[pair.department]}`;
    const article=sheet().locator(ADAPTER.reading);assert.equal(await article.count(),1,'one Wa source, no personal fallback');
    assert.equal(await article.getAttribute('data-wa-reading-id'),expectedSource);
    const source=await page.evaluate(async({source,locale})=>(await import(window.waAcceptanceLive('/src/lib/wa/content.js'))).readWaContent(source,locale),{source:sourceByDepartment[pair.department],locale});
    assert.equal(normalize(await article.locator(ADAPTER.readingTitle).innerText()),normalize(source.name),'original department title retained');
    assert.equal(await article.getAttribute('data-wa-source-refs'),source.sourceRefs.join(' '));
    const expected=excerptOracle(authorRecords.find(s=>s.id===expectedSource),locale);
    assert.equal(await article.getAttribute(ADAPTER.displayMapAttribute),ADAPTER.displayMap,'explicit display adapter identity');
    assert.equal(await article.getAttribute('data-wa-paragraphs'),expected.indices.join(','));
    const fold=sheet().locator('[data-wa-knowledge]');
    const selected=sheet().locator('[data-wa-detail]');const type=await selected.getAttribute('data-wa-detail');const selectedId=await selected.getAttribute('data-wa-detail-id');
    assert.equal(await fold.getAttribute('data-wa-content-id'),canonical(sourceByDepartment[pair.department].split('-').map(Number)));
    assert.equal(await fold.getAttribute('data-wa-reading-for'),type==='gate'?`gate:${selectedId}`:selectedId);
    assert.equal(await fold.getAttribute('data-wa-knowledge'),type==='pair'&&pair.core?'wa':'wa-department');
    for(const part of ['summary','detail'])assert.equal(normalize(await article.locator(`[data-wa-prose="${part}"]`).innerText()),normalize(expected[part]),'exact approved Wa-only excerpt');
    assert.equal(await sheet().locator('[data-shared-lens]').count(),0,'no ordinary personal reading');await copy(sheet());
  };
  const validatePair=async pair=>{const expected=pairOracle(data.raw,ids(),pair);const detail=sheet().locator('[data-wa-detail="pair"]');
    assert.equal(await sheet().evaluate(n=>n.classList.contains('gate-detail-card')),true,'shared public detail shell');
    assert.equal(await detail.getAttribute('data-wa-detail-id'),pair.channelId);assert.equal(normalize(await detail.locator('.wa-channel-number').innerText()),pair.displayGates.join('–'));
    assert.equal(await detail.locator(':scope > [data-wa-state]').getAttribute('data-wa-state'),expected.status);
    await validateEndpoints(detail,expected);await expandFolds();await validateActivations(pair.displayGates);await validateReading(pair);};
  const validateCurrent=async()=>{await validateMarkers();await validateCards();await openPair(pairs[0]);await validatePair(pairs[0]);await close();};
  const recordFonts=async label=>{const fonts=await root().locator('.wa-core-svg [data-wa-gate-marker] text').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,css:parseFloat(getComputedStyle(n).fontSize),effective:parseFloat(getComputedStyle(n).fontSize)*Math.hypot(n.getScreenCTM().a,n.getScreenCTM().b),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));assert.ok(fonts.length);assert.ok(fonts.every(f=>f.effective>0&&f.width>0&&f.height>0));evidence.fonts.push({label,fonts,review:'parent visual approval required; no invented readability threshold'});};
  const verifyMarkerFont=async label=>{
    await recordFonts(label);
    const measurement=await root().locator('.wa-core-svg').evaluate(svg=>{
      const sr=svg.getBoundingClientRect();
      const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom});
      return {svg:rect(sr),markers:[...svg.querySelectorAll('[data-wa-gate-marker]')].map(m=>{
        const text=m.querySelector('text'),circle=m.querySelector('circle'),b=text.getBBox(),t=text.getBoundingClientRect(),c=circle.getBoundingClientRect(),s=getComputedStyle(text);
        return {number:Number(m.dataset.markerNumber),memberId:m.dataset.waMarkerMember,gate:Number(m.dataset.waGateMarker),css:parseFloat(s.fontSize),bbox:{x:b.x,y:b.y,width:b.width,height:b.height},diameter:circle.r.baseVal.value*2,text:rect(t),circle:rect(c),visible:s.display!=='none'&&s.visibility==='visible'&&Number(s.opacity)>0};
      })};
    });
    evidence.markerBounds??=[];evidence.markerBounds.push({label,...measurement});
    assert.deepEqual([...new Set(measurement.markers.map(m=>m.number))].sort((a,b)=>a-b),Array.from({length:12},(_,i)=>i+1),'real core-gate markers must exercise every number 1..12');
    for(const m of measurement.markers){
      assert.equal(m.css,12.5,`${label}/${m.number}: new CSS actually applied`);
      assert.ok(m.bbox.width<=m.diameter&&m.bbox.height<=m.diameter,`${label}/${m.number}: text bbox ${m.bbox.width}x${m.bbox.height} exceeds circle diameter ${m.diameter}`);
      assert.ok(m.visible&&m.text.width>0&&m.text.height>0,`${label}/${m.number}: visible text`);
      // Preserve the strict position check, but defer its failure until all requested
      // viewports/screenshots have been collected. Do not turn a failure into a pass.
      if(!(m.text.x>=m.circle.x-0.5&&m.text.right<=m.circle.right+0.5&&m.text.y>=m.circle.y-0.5&&m.text.bottom<=m.circle.bottom+0.5)) {
        evidence.markerPositionFailures??=[];evidence.markerPositionFailures.push({label,number:m.number,gate:m.gate,topOverhang:m.circle.y-m.text.y,bottomOverhang:m.text.bottom-m.circle.bottom,leftOverhang:m.circle.x-m.text.x,rightOverhang:m.text.right-m.circle.right});
      }
      assert.ok(m.circle.x>=measurement.svg.x-0.5&&m.circle.right<=measurement.svg.right+0.5&&m.circle.y>=measurement.svg.y-0.5&&m.circle.bottom<=measurement.svg.bottom+0.5,`${label}/${m.number}: circle inside SVG bounds`);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${label}: no horizontal overflow`);
  };
  const sticky=async(width,height)=>{await close();await page.setViewportSize({width,height});await settle();await page.evaluate(()=>{const n=document.createElement('div');n.id='wa-acceptance-tail';n.style.height='2400px';n.setAttribute('aria-hidden','true');document.body.append(n);scrollTo(0,0);});await settle();
    const geometry=()=>page.evaluate(()=>{const n=document.querySelector('.wa-graph-column'),w=document.querySelector('.wa-workspace'),r=n.getBoundingClientRect(),b=w.getBoundingClientRect(),s=getComputedStyle(n);const ancestors=[];for(let a=n.parentElement;a;a=a.parentElement){const c=getComputedStyle(a);ancestors.push({tag:a.tagName,class:a.className,overflowY:c.overflowY,scrollTop:a.scrollTop});}return {y:scrollY,height:innerHeight,header:document.querySelector('.header')?.getBoundingClientRect().height||56,position:s.position,cssTop:parseFloat(s.top),left:{top:r.top,bottom:r.bottom,height:r.height},workspace:{top:b.top,bottom:b.bottom,height:b.height},ancestors};});
    try{const start=await geometry(),wanted=Math.min(start.header+16,height-start.left.height-16);assert.equal(start.position,'sticky');assert.ok(Math.abs(start.cssTop-wanted)<=1.1);assert.ok(start.left.top>start.cssTop+20,'initial natural scroll before sticking');
      for(const a of start.ancestors.filter(a=>!['HTML','BODY'].includes(a.tag)))assert.ok(['visible','clip'].includes(a.overflowY),`unexpected scroll ancestor ${a.class}: ${a.overflowY}`);
      const threshold=start.left.top-start.cssTop,stop=start.workspace.bottom-start.left.height-start.cssTop;assert.ok(stop>threshold+40,'actual analysis region must permit a sticky interval');
      const samples=[];for(const [label,y] of [['early',Math.min(100,threshold/2)],['middle',(threshold+stop)/2],['past-bottom',stop+180]]){await page.evaluate(y=>scrollTo(0,y),y);await settle();const g=await geometry();assert.ok(Math.abs(g.y-y)<=2,'real document scroll reached target');assert.ok(g.left.bottom<=g.workspace.bottom+2,'bounded by workspace bottom');if(label==='early')assert.ok(Math.abs(g.left.top-(start.left.top-g.y))<=2,'long graph first scrolls naturally');if(label==='middle')assert.ok(Math.abs(g.left.top-g.cssTop)<=2,'middle sticks at dynamic top');if(label==='past-bottom'){assert.ok(Math.abs(g.left.bottom-g.workspace.bottom)<=2);assert.ok(g.left.top<g.cssTop-100,'leaves viewport with analysis bottom');}samples.push({label,...g});await shot(`${width}x${height}-sticky-${label}`);}evidence.sticky.push({start,samples});
    }finally{await page.evaluate(()=>{document.querySelector('#wa-acceptance-tail')?.remove();scrollTo(0,0);});}
  };
  try {
    await page.addInitScript(()=>{
      localStorage.setItem('ohd-language','zh-CN');
      window.waAcceptanceLive=p=>performance.getEntriesByType('resource').map(r=>r.name).find(u=>new URL(u).pathname===p)||p;
    });
    await page.goto(`${base}/?view=wa`);await root().locator('[data-wa-page]').waitFor();
    // Vite raw imports expose the served source bytes; compare against the parent root.
    for(const resource of ['/src/views/wa.js','/src/views/wa-detail-content.js','/src/lib/wa/member-markers.js','/src/styles/wa.css','/src/styles/wa-members.css','/src/lib/wa/content-data.json','/src/lib/wa/reading-presentation.js']){
      const servedRaw=await page.evaluate(async resource=>(await import(`${resource}?raw&import`)).default,resource);
      assert.equal(servedRaw,await readFile(path.join(rootSource,resource.slice(1)),'utf8'),`9961 serves parent root ${resource}`);
      const response=await page.request.get(`${base}${resource}`);assert.ok(response.ok());const text=await response.text();sourceHashes.set(resource,createHash('sha256').update(text).digest('hex'));
    }
    evidence.servedHashes=Object.fromEntries(sourceHashes);
    await check('01 actual WASM 12-person seed and independent 26-activation oracle',async()=>{data=await seed(page);validateRaw(data);expectedDraft=structuredClone(data.draft);markers=markerOracle(data.draft.members);evidence.raw=data.raw;evidence.fixture=data.fixture;await page.reload();await ready();await scope(null);assert.equal(ids().length,10);});
    if(process.env.WA_VISUAL_ONLY==='1') {
      // Supplementary framing only: does not claim the nineteen-case run.
      evidence.mode='supplementary visual and 12.5px marker font';
      // Assign both retained real-WASM people through the ordinary picker, so
      // double-digit 10/11/12 are measured on real core gates, not synthetic text.
      await choose(expectedDraft.pentas[0].pentaId,[10,11]);expectedDraft.pentas[0].memberIds.push(id(10),id(11));
      await validateMarkers();
      evidence.visualMemberIds=ids();
      for(const [width,height,locale] of [[1440,1000,'zh-CN'],[1280,640,'zh-CN'],[390,900,'zh-Hant'],[320,900,'en']]) {
        await page.setViewportSize({width,height});await page.evaluate(async locale=>(await import(window.waAcceptanceLive('/src/lib/i18n.js'))).setLocale(locale,{persist:false}),locale);await ready();await configuration();await settle();
        const prefix=`${width}x${height}-${locale}`;
        await verifyMarkerFont(prefix);await validateMarkers();await validateCards();
        for(const [name,locator] of [['configuration',root().locator('.wa-configuration')],['graph-legend',root().locator('.wa-graph-panel')],['rightCards',root().locator('.wa-results')]]) {
          // Full-page capture at document top avoids a fixed header crossing a tall
          // element screenshot after Playwright's automatic scrollIntoView.
          await page.evaluate(()=>scrollTo(0,0));await settle();
          const rect=await locator.boundingBox();assert.ok(rect);
          const full=await page.screenshot({fullPage:true});const filename=`${prefix}-${name}-framed.png`;
          const sharp=(await import('sharp')).default;await sharp(full).extract({left:Math.floor(rect.x),top:Math.floor(rect.y),width:Math.ceil(rect.width),height:Math.ceil(rect.height)}).toFile(path.join(output,filename));
          evidence.screenshots.push({filename,viewport:page.viewportSize(),locale,kind:'crop of unmodified full-page screenshot at scrollY=0',sourceCommit});
        }
        for(const pair of [pairs[0],pairs[1]]) {
          await openPair(pair);await validatePair(pair);
          await sheet().locator('.gate-detail-body').evaluate(n=>{n.scrollTop=0;});await shot(`${prefix}-${pair.channelId}-heading`);
          await sheet().locator('[data-wa-knowledge] > summary').scrollIntoViewIfNeeded();await shot(`${prefix}-${pair.channelId}-Wa-prose`);
          if(pair.core) {await sheet().locator('[data-wa-endpoint="45"] [data-wa-gate="45"]').click();await expandFolds();await validateActivations([45]);await validateReading(pair);await sheet().locator('[data-wa-knowledge] > summary').scrollIntoViewIfNeeded();await shot(`${prefix}-gate45-Wa-prose`);}
          await close();
        }
      }
      assert.equal(git('rev-parse','HEAD'),sourceCommit);assert.equal(git('status','--porcelain','--','src','public'),'');
      for(const [resource,hash]of sourceHashes){const response=await page.request.get(`${base}${resource}`);assert.ok(response.ok());assert.equal(createHash('sha256').update(await response.text()).digest('hex'),hash,`served source changed ${resource}`);}
      assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.markerPositionFailures||[],[],'strict text-position containment: inspect recorded overhangs; all screenshots preserved');evidence.status='PASS_VISUAL';console.log(`PASS supplementary framed screenshots: ${output}`);return;
    }
    await check('02 one-page configuration and one lightweight picker',async()=>{await configuration();assert.equal(await root().locator('[data-wa-target]').count(),4);assert.equal(await page.locator('.wa-composer-cards,[data-apply]').count(),0);await shot('1440-organization-edit');await root().locator('[data-compose="alpha"]').click();assert.equal(await page.locator('.operation-dialog').count(),1);await copy(picker());await shot('1440-lightweight-alpha-picker');await page.keyboard.press('Escape');});
    await check('03 Alpha replace clear restore updates all views',async()=>{await choose('alpha',[10]);expectedDraft.alphaId=id(10);await validateCurrent();await root().locator('[data-clear-alpha]').click();expectedDraft.alphaId=null;await ready();await validateCurrent();await choose('alpha',[0]);expectedDraft.alphaId=id(0);await validateCurrent();});
    await check('04 three groups add remove import preserve IDs',async()=>{for(let i=0;i<3;i++){const group=expectedDraft.pentas[i],removed=id(1+i*3);await choose(group.pentaId,[11]);group.memberIds.push(id(11));await validateCurrent();await root().locator(`[data-remove-wa="${id(11)}"]`).click();group.memberIds=group.memberIds.filter(m=>m!==id(11));await ready();await validateCurrent();await root().locator(`[data-remove-wa="${removed}"]`).click();group.memberIds=group.memberIds.filter(m=>m!==removed);await ready();await validateCurrent();await root().locator(`[data-import="${group.pentaId}"]`).click();assert.equal(await page.locator('.operation-dialog').count(),1);await picker().locator('[data-import-index]').filter({hasText:`Fictional import ${i}`}).click();group.memberIds=[0,1,2].map(j=>id(1+i*3+j));await picker().waitFor({state:'detached'});await ready();await validateCurrent();}});
    await check('05 public person editor replaces picker and restores search',async()=>{await root().locator(`[data-compose="${expectedDraft.pentas[0].pentaId}"]`).click();await picker().locator('[data-search]').fill(data.fixture[1].name);await picker().locator(`[data-edit="${data.fixture[1].id}"]`).click();assert.equal(await picker().count(),0);assert.equal(await page.locator('.operation-dialog').count(),1);await page.locator('#edit-cancel').click();assert.equal(await picker().locator('[data-search]').inputValue(),data.fixture[1].name);await page.keyboard.press('Escape');});
    await check('06 save and reopen actual refs-only IndexedDB',async()=>{await root().locator('[data-action="save"]').click();await page.waitForFunction(()=>document.querySelector('.wa-draft-status')?.textContent.includes('r2'));const saved=await page.evaluate(async()=>{const repo=(await import(window.waAcceptanceLive('/src/lib/wa/repository.js'))).createWaRepository();return (await repo.list()).find(d=>d.organizationId==='fictional-wa-convergence');});assert.equal(saved.schema,'wa-refs-v1');assert.deepEqual(saved.members,data.draft.members);assert.equal(saved.alphaId,expectedDraft.alphaId);saved.pentas.forEach((p,i)=>assert.deepEqual(p.memberIds,expectedDraft.pentas[i].memberIds));assert.ok(saved.members.every(m=>!('birth'in m)&&!('chart'in m)));assert.equal(await page.evaluate(async()=>JSON.stringify((await import(window.waAcceptanceLive('/src/lib/people.js'))).listPeople())),data.peopleBefore);await page.reload();await ready();await page.evaluate(()=>{window.waAcceptanceLive=p=>performance.getEntriesByType('resource').map(r=>r.name).find(u=>new URL(u).pathname===p)||p;});await scope(null);await validateCurrent();evidence.saved={organizationId:saved.organizationId,revision:saved.revision,schema:saved.schema};});
    await check('07 exact gate markers legend and repeated-planet deduplication',async()=>{await validateMarkers();assert.ok(coreGates.some(g=>{const r=gateOracle(data.raw,ids(),g);return r.activations.length>r.memberIds.length;}),'real repeated activation witness required');const row=root().locator('.wa-core-svg [data-department="management"]');assert.equal(await row.locator('[data-wa-gate="45"] .wa-node-face').getAttribute('cx'),'180');assert.equal(await row.locator('[data-wa-gate="21"] .wa-node-face').getAttribute('cx'),'306');assert.equal(await row.locator('[data-wa-pair]').getAttribute('data-wa-pair'),'21-45');await recordFonts('1440');await shot('1440-graph-markers-legend');});
    await check('08 full organization group A and A plus Alpha',async()=>{for(const [group,alpha] of [[null,false],[0,false],[0,true]]){await scope(group,alpha);await validateCurrent();evidence.cases.at(-1).scopeIds??=[];evidence.cases.at(-1).scopeIds.push({group,alpha,ids:ids()});}await scope(null);});
    await check('09 membership move and replacement stable numbers',async()=>{await configuration();const a=expectedDraft.pentas[0],b=expectedDraft.pentas[1];await root().locator(`[data-remove-wa="${id(1)}"]`).click();a.memberIds=a.memberIds.filter(m=>m!==id(1));await ready();await validateCurrent();await choose(b.pentaId,[1]);b.memberIds.push(id(1));await validateCurrent();await root().locator(`[data-remove-wa="${id(1)}"]`).click();b.memberIds=b.memberIds.filter(m=>m!==id(1));await ready();await choose(a.pentaId,[10]);a.memberIds.push(id(10));await validateCurrent();await root().locator(`[data-remove-wa="${id(10)}"]`).click();a.memberIds=a.memberIds.filter(m=>m!==id(10));await ready();await choose(a.pentaId,[1]);a.memberIds.push(id(1));await validateCurrent();});
    await check('10 six core inline channels visible while others fold',async()=>{for(const department of Object.keys(departments)){const toggle=root().locator(`[data-department-toggle="${department}"]`);if(await toggle.getAttribute('aria-expanded')==='true')await toggle.click();}for(const p of pairs)assert.equal(await root().locator(`[data-pair-row="${p.channelId}"]`).isVisible(),p.core,`core visibility ${p.channelId}`);await validateCards();for(const d of Object.keys(departments))await expand(d);assert.equal(await root().locator('[data-pair-row]:visible').count(),32);await validateCards();await shot('1440-inline-channel-cards');});
    await check('11 all 32 channel and 64 gate details Wa-only source and real activation records',async()=>{for(const pair of pairs){await openPair(pair);await validatePair(pair);if(pair.channelId==='21-45'||pair.channelId==='32-54')await shot(pair.core?'1440-wa-45-21':'1440-wa-54-32-department-source');for(const gate of pair.displayGates){await sheet().locator(`[data-wa-endpoint="${gate}"] [data-wa-gate="${gate}"]`).click();assert.equal(await sheet().locator('[data-wa-detail="gate"]').getAttribute('data-wa-detail-id'),String(gate));await expandFolds();await validateActivations([gate]);await validateReading(pair);if(gate===45)await shot('1440-gate-45');await sheet().locator(ADAPTER.back).click();await validatePair(pair);}}await close();});
    await check('12 public detail back Escape and focus',async()=>{const trigger=root().locator('.wa-core-svg [data-wa-gate="45"]');await trigger.scrollIntoViewIfNeeded();await trigger.focus();const y=await page.evaluate(()=>scrollY);await page.keyboard.press('Enter');await sheet().locator('[data-wa-pair="21-45"]').click();await sheet().locator(ADAPTER.back).click();assert.equal(await sheet().locator('[data-wa-detail="gate"]').getAttribute('data-wa-detail-id'),'45');await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(n=>document.activeElement===n),true);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-y)<=2);});
    await check('13 bounded sticky 1440 desktop',async()=>{await sticky(1440,1000);});
    await check('14 bounded sticky 1280 short desktop',async()=>{await sticky(1280,640);await recordFonts('1280x640');await shot('1280x640-short-desktop');});
    await check('15 390 and 320 stacked without horizontal overflow',async()=>{for(const width of [390,320]){await page.setViewportSize({width,height:900});await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);const geometry=await root().evaluate(n=>{const a=n.querySelector('.wa-graph-column'),b=n.querySelector('.wa-results'),r=a.getBoundingClientRect(),s=b.getBoundingClientRect();return {position:getComputedStyle(a).position,graphBottom:r.bottom,rightTop:s.top};});assert.notEqual(geometry.position,'fixed');assert.notEqual(geometry.position,'sticky');assert.ok(geometry.rightTop>=geometry.graphBottom-1);await recordFonts(`${width}-phone`);await shot(`${width}-mobile-organization-graph`);await openPair(pairs[0]);await validatePair(pairs[0]);assert.equal(await sheet().evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);await shot(`${width}-mobile-wa-45-21`);await close();}});
    await check('16 three locale visible-copy scan all details',async()=>{for(const [locale,width,skin] of [['zh-CN',1440,'default-light'],['zh-Hant',390,'default-dark'],['en',320,'high-contrast']]){await page.setViewportSize({width,height:900});await page.evaluate(async({locale,skin})=>{(await import(window.waAcceptanceLive('/src/lib/i18n.js'))).setLocale(locale,{persist:false});(await import(window.waAcceptanceLive('/src/lib/appearance.js'))).setSkin(skin);},{locale,skin});await ready();await copy(root());await shot(`${width}-${locale}-${skin}-main`);for(const pair of pairs){await openPair(pair);await expandFolds();await validateReading(pair);for(const gate of pair.displayGates){await sheet().locator(`[data-wa-endpoint="${gate}"] [data-wa-gate="${gate}"]`).click();await expandFolds();await validateReading(pair);if(gate===45)await shot(`${width}-${locale}-${skin}-gate-45`);await sheet().locator(ADAPTER.back).click();}if(['21-45','32-54'].includes(pair.channelId))await shot(`${width}-${locale}-${skin}-${pair.channelId}`);}await close();
      await root().locator('[data-action="knowledge"]').click();await copy(sheet());
      assert.equal(await sheet().locator('[data-wa-reading]').count(),14);
      for(const source of authorRecords){await sheet().locator(`[data-wa-reading="${source.objectId}"]`).click();const article=sheet().locator('[data-wa-reading-id]');const expected=excerptOracle(source,locale);assert.equal(await article.getAttribute('data-wa-reading-id'),source.id);assert.equal(await article.locator('h3').innerText(),source.locales[locale].name);assert.equal(await article.getAttribute('data-wa-display-map'),'wa-reading-ui-v1');assert.equal(await article.getAttribute('data-wa-paragraphs'),expected.indices.join(','));assert.equal(await article.getAttribute('data-wa-source-refs'),source.sourceRefs.join(' '));assert.equal(normalize(await article.locator('[data-wa-prose="detail"]').innerText()),normalize(expected.detail));if(expected.summary===null)assert.equal(await article.locator('[data-wa-prose="summary"]').count(),0);else assert.equal(normalize(await article.locator('[data-wa-prose="summary"]').innerText()),normalize(expected.summary));await copy(sheet());await sheet().locator(ADAPTER.back).click();}await close();}});
    await check('17 eleven skins cheap source tokens and actual P D badges',async()=>{await page.setViewportSize({width:1280,height:900});await openPair(pairs[0]);await expandFolds();const skins=await page.evaluate(async()=>(await import(window.waAcceptanceLive('/src/lib/skin-registry.js'))).SKINS.map(s=>s.id));assert.equal(skins.length,11);for(const skin of skins){await page.evaluate(async skin=>{const a=await import(window.waAcceptanceLive('/src/lib/appearance.js'));a.setSkin(skin);a.restoreCurrentSkin();},skin);const colors=await page.evaluate(async()=>{const {resolveRGB,contrastRatio}=await import(window.waAcceptanceLive('/src/lib/source-contrast.js'));return ['personality','design'].map(side=>{const n=document.querySelector(`.wa-reading-sheet [data-wa-side="${side}"]`);if(!n)throw Error(`Missing actual ${side} badge`);const s=getComputedStyle(n),rgb=resolveRGB(s.color),bg=resolveRGB(s.backgroundColor);return {side,rgb,bg,border:resolveRGB(s.borderLeftColor),borderWidth:parseFloat(s.borderLeftWidth),expected:resolveRGB(s.getPropertyValue(`--source-birth${side==='personality'?'Personality':'Design'}-text`)),birth:resolveRGB(s.getPropertyValue(`--hd-birth-${side}`)),elevated:resolveRGB(s.getPropertyValue('--bg-elevated')),contrast:contrastRatio(rgb,bg)};});});for(const c of colors){assert.deepEqual(c.rgb,c.expected);assert.deepEqual(c.bg,c.elevated);assert.deepEqual(c.border,c.birth);assert.ok(c.borderWidth>0);assert.ok(c.contrast>=4.5,`${skin}/${c.side}: ${c.contrast}`);}evidence.colors.push({skin,colors});if(['default-light','default-dark','high-contrast'].includes(skin))await shot(`1280-${skin}-source-badges`);}await close();});
    await check('18 birth replacement updates graph cards and fresh details',async()=>{await scope(null);await openPair(pairs[0]);const replacement={...data.fixture[1],birthDate:data.fixture[10].birthDate,birthTime:data.fixture[10].birthTime};const raw=await page.evaluate(async person=>{(await import(window.waAcceptanceLive('/src/lib/people.js'))).savePerson(person);const {chart}=await(await import(window.waAcceptanceLive('/src/lib/chartdata.js'))).computeChart(person);return ['personality','design'].flatMap(side=>Object.entries(chart.gates[side]).map(([planet,a])=>({memberId:'convergence-member-1',side,planet,gate:a.gate,line:a.line})));},replacement);assert.notDeepEqual(raw,data.raw[id(1)]);data.raw[id(1)]=raw;await ready();if(await sheet().isVisible())await validatePair(pairs[0]);await close();await validateCurrent();evidence.replacementRaw=raw;
      await page.evaluate(async()=>(await import(window.waAcceptanceLive('/src/lib/people.js'))).deletePerson('fictional-convergence-9'));
      await root().locator('[data-wa-issue="MISSING_PERSON_REFERENCE"]').waitFor();
      assert.ok((await root().locator('[data-wa-issue="MISSING_PERSON_REFERENCE"]').innerText()).includes(data.names[id(9)]));
      assert.doesNotMatch(await root().locator('.wa-errors').innerText(),/MISSING_PERSON_REFERENCE/);
      for(const value of await root().locator('.wa-core-svg [data-wa-gate]').evaluateAll(nodes=>nodes.map(n=>n.dataset.covered)))assert.equal(value,'unknown');
      for(const value of await root().locator('.wa-core-svg [data-wa-pair]').evaluateAll(nodes=>nodes.map(n=>n.dataset.state)))assert.equal(value,'unknown');
      assert.equal(await root().locator('.wa-core-svg [data-wa-gate-marker]').count(),0);await shot('missing-reference-unknown');
      await page.evaluate(async person=>(await import(window.waAcceptanceLive('/src/lib/people.js'))).savePerson(person),data.fixture[9]);await ready();await validateCurrent();
    });
    await check('19 frozen-source identity and no uncaught errors',async()=>{assert.equal(git('rev-parse','HEAD'),sourceCommit);assert.equal(git('status','--porcelain','--','src','public'),'');for(const [resource,hash]of sourceHashes){const response=await page.request.get(`${base}${resource}`);assert.ok(response.ok());assert.equal(createHash('sha256').update(await response.text()).digest('hex'),hash,`served source changed ${resource}`);}assert.deepEqual(evidence.errors,[]);assert.equal(evidence.cases.length,19);});
    evidence.status='PASS';console.log(`PASS targeted Wa convergence: ${output}`);
  } catch(error) {
    evidence.status='FAIL';evidence.failure=error.stack;
    await page.screenshot({path:path.join(output,'failure-viewport.png')}).catch(e=>{evidence.captureError=e.message;});
    await writeFile(path.join(output,'failure-dom.html'),await page.content().catch(()=>''));
    evidence.failureGeometry=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},scrollX,scrollY,active:document.activeElement?.outerHTML,nodes:[...document.querySelectorAll('.wa-workspace,.wa-graph-column,.wa-reading-sheet,.wa-target-picker')].map(n=>({class:n.className,rect:n.getBoundingClientRect().toJSON(),position:getComputedStyle(n).position,overflow:getComputedStyle(n).overflow}))})).catch(()=>null);
    throw error;
  } finally {
    await writeFile(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));await browser.close();
  }
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
