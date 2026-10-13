import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// Round 2 targeted acceptance only. Do not run until the parent freezes B/C and
// confirms root :9961. This process never starts a server or imports stale local product modules.
const base = process.env.E2E_URL || 'http://127.0.0.1:9961';
const sourceCommit = process.env.WA_SOURCE_COMMIT;
const output = process.env.WA_EVIDENCE_DIR || 'artifacts/visual-review/wa-oc16-details-r2';
const DOM_CONTRACT_READY = true; // Read from B worktree wa-detail-content.js; execution still requires parent freeze.
const sorted = values => [...values].sort();
const unique = values => sorted(new Set(values));
const canonical = gates => [...gates].sort((a, b) => a - b).join('-');
const activationKey = a => JSON.stringify([a.memberId, a.side, a.planet, a.gate, a.line]);
const pairKey = p => JSON.stringify([p.firstMemberId, p.secondMemberId]);
const departments = {
  management: [[45,21],[54,32],[44,26],[19,49],[37,40]],
  competition: [[51,25],[10,34]], direction: [[14,2],[61,24],[43,23],[8,1]],
  interaction: [[59,6],[64,47],[11,56],[35,36],[30,41],[53,42],[29,46],[13,33]],
  logic: [[27,50],[63,4],[17,62],[48,16],[18,58],[9,52],[5,15],[7,31]],
  innovation: [[3,60],[38,28],[57,20],[39,55],[22,12]],
};
const pairs = Object.entries(departments).flatMap(([department, values]) => values.map(displayGates => ({
  department, displayGates, channelId: canonical(displayGates), gates: [...displayGates].sort((a,b) => a-b),
})));
const states = ['absent', 'hanging', 'selfComplete', 'crossMemberOnly', 'both'];
const independentBirthSkins = ['absolutely', 'delve', 'midnight-contrast', 'coral'];

// Independent oracle: no collectPair/analyzeOC16/extractTeamActivations/product result as expected.
function gateOracle(raw, ids, gate) {
  const activations = ids.flatMap(id => raw[id]).filter(a => a.gate === gate);
  const memberIds = unique(activations.map(a => a.memberId));
  return { gate, activations, memberIds, contributorCount: memberIds.length, activationCount: activations.length };
}
function pairOracle(raw, ids, pair) {
  const endpoints = pair.displayGates.map(gate => gateOracle(raw, ids, gate));
  const [left, right] = pair.gates.map(gate => gateOracle(raw, ids, gate).memberIds);
  const selfCompleteMemberIds = left.filter(id => right.includes(id));
  const complementaryMemberPairs = left.flatMap(firstMemberId => right.filter(id => id !== firstMemberId)
    .map(secondMemberId => ({ firstMemberId, secondMemberId })));
  const covered = endpoints.filter(e => e.memberIds.length).length;
  const status = covered === 0 ? 'absent' : covered === 1 ? 'hanging'
    : selfCompleteMemberIds.length ? (complementaryMemberPairs.length ? 'both' : 'selfComplete') : 'crossMemberOnly';
  return { ...pair, endpoints, status, selfCompleteMemberIds, complementaryMemberPairs };
}
function verifyGate(actual, expected, names, label) {
  assert.equal(actual.gate, expected.gate, `${label}: endpoint identity`);
  if (actual.covered !== undefined) assert.equal(actual.covered,String(expected.memberIds.length > 0),`${label}: covered state`);
  if (actual.state !== undefined) {
    assert.equal(actual.state,expected.memberIds.length ? 'active' : 'inactive',`${label}: gate state`);
    assert.equal(actual.relatedPair,pairs.find(p => p.gates.includes(expected.gate)).channelId,`${label}: related canonical pair link`);
  }
  assert.equal(actual.contributorCount, expected.contributorCount, `${label}: deduplicated people count`);
  assert.equal(actual.activationCount, expected.activationCount, `${label}: activation count`);
  assert.deepEqual(sorted(actual.memberIds), expected.memberIds, `${label}: exact holders (no duplicates)`);
  assert.deepEqual(sorted(actual.names), sorted(expected.memberIds.map(id => names[id])), `${label}: exact visible names`);
  assert.deepEqual(sorted(actual.activations.map(activationKey)), sorted(expected.activations.map(activationKey)), `${label}: all planetary P/D records`);
}
function verifyPair(actual, expected, names, label) {
  assert.equal(actual.channelId, expected.channelId, `${label}: canonical source ID`);
  // Non-core channels read their department's Wa theme, keyed by the core channel's source ID.
  const readingId = canonical(departments[pairs.find(p => p.channelId === expected.channelId).department][0]);
  assert.equal(actual.contentId, readingId, `${label}: canonical reading source ID`);
  assert.deepEqual(actual.displayGates, expected.displayGates, `${label}: display order`);
  assert.equal(actual.status, expected.status, `${label}: actual renderer state`);
  assert.deepEqual(sorted(actual.selfCompleteMemberIds), expected.selfCompleteMemberIds, `${label}: self-complete members`);
  assert.deepEqual(sorted(actual.selfCompleteNames), sorted(expected.selfCompleteMemberIds.map(id => names[id])), `${label}: self names`);
  assert.deepEqual(sorted(actual.complementaryMemberPairs.map(pairKey)), sorted(expected.complementaryMemberPairs.map(pairKey)), `${label}: canonical cross-member mapping`);
  assert.deepEqual(sorted(actual.crossNames), sorted(expected.complementaryMemberPairs.map(p => JSON.stringify([names[p.firstMemberId], names[p.secondMemberId]]))), `${label}: cross names`);
  assert.deepEqual(actual.endpointLinks, expected.displayGates, `${label}: endpoint navigation order`);
  assert.equal(actual.endpoints.length, 2, `${label}: both endpoints exist`);
  actual.endpoints.forEach((endpoint, i) => verifyGate(endpoint, expected.endpoints[i], names, `${label}/${endpoint.gate}`));
}

// Actual B DOM only. Counts measure rendered rows/names; the renderer exposes no
// separate contributor-count attribute. Compare these independently with raw-chart counts.
async function readDetailDOM(page, type) {
  return page.locator(`.wa-reading-sheet [data-wa-detail="${type}"]`).evaluate((node, type) => {
    const required = (n, key) => { if (!n?.hasAttribute(key)) throw Error(`Missing DOM contract ${key}`); return n.getAttribute(key); };
    const activations = [...node.querySelectorAll('li[data-activation-side]')].map(n => {
      const row = {memberId:required(n,'data-wa-member'),side:required(n,'data-activation-side'),planet:required(n,'data-activation-planet'),
        gate:Number(required(n,'data-activation-gate')),line:Number(required(n,'data-activation-line'))};
      if (n.querySelector('strong')?.textContent.trim() !== `${row.gate}.${row.line}`) throw Error('Activation label differs from attributes');
      if (!n.querySelector(`[data-wa-side="${row.side}"]`)?.textContent.trim()) throw Error('Missing visible source badge');
      return row;
    });
    const gateRecord = (gate, endpoint) => {
      const sources = activations.filter(a => a.gate === gate);
      const members = endpoint ? [...endpoint.querySelectorAll('.wa-detail-members [data-wa-member]')]
        : [...node.querySelectorAll('[data-wa-activation-member]')];
      const memberIds = members.map(n => required(n,endpoint ? 'data-wa-member' : 'data-wa-activation-member'));
      const names = members.map(n => endpoint ? n.textContent.trim() : n.querySelector('h4')?.textContent.trim());
      return {gate,memberIds,names,activations:sources,contributorCount:members.length,activationCount:sources.length,
        covered:endpoint ? required(endpoint,'data-wa-covered') : undefined};
    };
    if (type === 'gate') return {...gateRecord(Number(required(node,'data-wa-detail-id'))),
      state:required(node.querySelector('[data-wa-gate-state]'),'data-wa-gate-state'),
      relatedPair:required(node.querySelector('.wa-detail-related [data-wa-pair]'),'data-wa-pair')};
    const channelId = required(node,'data-wa-detail-id');
    const canonicalGates = channelId.split('-').map(Number);
    const endpointNodes = [...node.querySelectorAll(':scope > .wa-detail-endpoints [data-wa-endpoint]')];
    const endpoints = endpointNodes.map(n => gateRecord(Number(required(n,'data-wa-endpoint')),n));
    const heading = node.querySelector(':scope > h2'), displayGates = (heading.querySelector('.wa-channel-number') || heading).textContent.trim().split('–').map(Number);
    const combinations = [], crossNames = [];
    for (const left of node.querySelectorAll('[data-wa-combination-left]')) {
      const leftGate = Number(required(left,'data-wa-left-gate')), rightGate = Number(required(left,'data-wa-right-gate'));
      if (leftGate !== displayGates[0] || rightGate !== displayGates[1]) throw Error('Cross-member visual endpoint mapping reversed');
      const leftId = required(left,'data-wa-combination-left');
      const leftLabel = [...left.querySelectorAll('[data-wa-member]')].find(n => !n.closest('[data-wa-combination-right]'));
      if (required(leftLabel,'data-wa-member') !== leftId) throw Error('Cross-member left identity mismatch');
      for (const right of left.querySelectorAll('[data-wa-combination-right]')) {
        const rightId = required(right,'data-wa-combination-right'), rightLabel = right.querySelector('[data-wa-member]');
        if (required(rightLabel,'data-wa-member') !== rightId) throw Error('Cross-member right identity mismatch');
        const reversed = leftGate !== canonicalGates[0];
        combinations.push({firstMemberId:reversed ? rightId : leftId,secondMemberId:reversed ? leftId : rightId});
        crossNames.push(JSON.stringify(reversed ? [rightLabel.textContent.trim(),leftLabel.textContent.trim()] : [leftLabel.textContent.trim(),rightLabel.textContent.trim()]));
      }
    }
    const selves = [...node.querySelectorAll('[data-wa-self-complete] [data-wa-member]')];
    const reading = node.querySelector('[data-wa-knowledge]');
    return {channelId,displayGates,endpoints,status:required(node.querySelector(':scope > [data-wa-state]'),'data-wa-state'),
      endpointLinks:endpointNodes.map(n => Number(required(n.querySelector('[data-wa-gate]'),'data-wa-gate'))),
      selfCompleteMemberIds:selves.map(n => required(n,'data-wa-member')),selfCompleteNames:selves.map(n => n.textContent.trim()),
      complementaryMemberPairs:combinations,crossNames,contentId:required(reading,'data-wa-content-id')};
  },type);
}
async function readPairRows(locator) {
  return locator.locator('[data-pair-row]').evaluateAll(rows => rows.map(row => ({
    channelId:row.getAttribute('data-pair-row'),
    status:row.querySelector('[data-wa-state]')?.getAttribute('data-wa-state'),
    displayText:row.querySelector('[data-wa-pair]')?.textContent.trim(),
    endpoints:[...row.querySelectorAll('[data-wa-endpoint]')].map(endpoint => {
      const gate = Number(endpoint.getAttribute('data-wa-endpoint'));
      const members = [...endpoint.querySelectorAll('.wa-detail-members [data-wa-member]')];
      const sourceRows = [...row.querySelectorAll(`li[data-activation-gate="${gate}"]`)];
      return {gate,covered:endpoint.getAttribute('data-wa-covered'),memberIds:members.map(n => n.dataset.waMember),names:members.map(n => n.textContent.trim()),
        contributorCount:members.length,activationCount:sourceRows.length,activations:sourceRows.map(n => ({memberId:n.dataset.waMember,side:n.dataset.activationSide,
          planet:n.dataset.activationPlanet,gate:Number(n.dataset.activationGate),line:Number(n.dataset.activationLine)}))};
    })
  })));
}
async function readInlineRows(locator) {
  return locator.locator('[data-pair-row]').evaluateAll(rows => rows.map(row => ({
    channelId:row.getAttribute('data-pair-row'),
    status:row.getAttribute('data-wa-state'),
    displayText:row.querySelector('[data-wa-pair]')?.textContent.trim(),
    endpoints:[...row.querySelectorAll('[data-wa-endpoint]')].map(endpoint => ({gate:Number(endpoint.getAttribute('data-wa-endpoint')),covered:endpoint.getAttribute('data-wa-covered'),
      memberIds:[...endpoint.querySelectorAll('[data-wa-marker-member]')].map(n => n.dataset.waMarkerMember)}))
  })));
}
// Inline rows show holders only; full planetary sources are verified in the department dialog.
function verifyInlineRows(actual, expected, label) {
  assert.equal(actual.length,expected.length,`${label}: number of displayed pairs`);
  actual.forEach((row,i) => {
    const pair = expected[i];
    assert.equal(row.channelId,pair.channelId,`${label}: row canonical ID`);
    assert.equal(row.displayText,pair.displayGates.join('–'),`${label}: display order`);
    assert.equal(row.status,pair.status,`${label}: actual row status`);
    assert.equal(row.endpoints.length,2);
    row.endpoints.forEach((endpoint,j) => {
      const want = pair.endpoints[j];
      assert.equal(endpoint.gate,want.gate,`${label}/${pair.channelId}: endpoint order`);
      assert.equal(endpoint.covered,String(want.memberIds.length>0),`${label}/${pair.channelId}/${want.gate}: covered`);
      assert.deepEqual(sorted(endpoint.memberIds),want.memberIds,`${label}/${pair.channelId}/${want.gate}: exact holders (no duplicates)`);
    });
  });
}
function verifyRows(actual, expected, names, label) {
  assert.equal(actual.length,expected.length,`${label}: number of displayed pairs`);
  actual.forEach((row,i) => {
    const pair = expected[i];
    assert.equal(row.channelId,pair.channelId,`${label}: row canonical ID`);
    assert.equal(row.displayText,pair.displayGates.join('–'),`${label}: display order`);
    assert.equal(row.status,pair.status,`${label}: actual row status`);
    assert.equal(row.endpoints.length,2);
    row.endpoints.forEach((endpoint,j) => verifyGate(endpoint,pair.endpoints[j],names,`${label}/${pair.channelId}`));
  });
}
async function readPairDOM(page) { return readDetailDOM(page,'pair'); }
async function readGateDOM(page) { return readDetailDOM(page,'gate'); }
async function readSourceStyles(page) {
  return page.evaluate(async () => {
    const {resolveRGB,contrastRatio} = await import('/src/lib/source-contrast.js');
    return [...document.querySelectorAll('.wa-reading-sheet [data-wa-side]')].map(n => {
      const side = n.dataset.waSide, style = getComputedStyle(n);
      const suffix = side === 'personality' ? 'Personality' : 'Design';
      const expectedTextRGB = resolveRGB(style.getPropertyValue(`--source-birth${suffix}-text`));
      const birthRGB = resolveRGB(style.getPropertyValue(`--hd-birth-${side}`));
      const labelRGB = resolveRGB(style.color), backgroundRGB = resolveRGB(style.backgroundColor);
      return {side,labelRGB,backgroundRGB,borderRGB:resolveRGB(style.borderLeftColor),borderWidth:parseFloat(style.borderLeftWidth),birthRGB,expectedTextRGB,
        elevatedRGB:resolveRGB(style.getPropertyValue('--bg-elevated')),contrast:contrastRatio(labelRGB,backgroundRGB)};
    });
  });
}

async function seed(page) {
  return page.evaluate(async () => {
    const live = path => performance.getEntriesByType('resource').map(r => r.name).find(url => new URL(url).pathname === path) || path;
    window.waAcceptanceLive = live;
    const people = await import(live('/src/lib/people.js'));
    const { computeChart } = await import(live('/src/lib/chartdata.js'));
    const { createWaDraft, createWaMember } = await import(live('/src/lib/wa/model.js'));
    const { createWaRepository } = await import(live('/src/lib/wa/repository.js'));
    const dates = ['1987-02-14','1973-08-29','1998-11-06','2001-04-19','1965-12-23','1992-07-08','1981-03-30','1979-10-17','1995-05-02','1988-09-11','2000-01-26','1969-06-15'];
    const labels = ['林岚','周舟','陈禾','苏衡','许澄','江序','叶青','陆遥','温宁','沈简','季朗','程雨'];
    const fixture = dates.map((birthDate, index) => ({ id: `fictional-r2-${index}`, name: `虚构·${labels[index]}`,
      birthDate, birthTime: `${String(2 + index).padStart(2,'0')}:${index % 2 ? '35' : '10'}`, timeUnknown: false, timezone: 8,
      location: { lat: 31.2, lon: 121.4, name: 'Fictional test location', timezone: 8 } }));
    const raw = {}, names = {};
    for (const [index, person] of fixture.entries()) {
      people.savePerson(person);
      const { chart } = await computeChart(person);
      const memberId = `r2-member-${index}`;
      raw[memberId] = ['personality','design'].flatMap(side => Object.entries(chart.gates[side])
        .map(([planet, a]) => ({ memberId, side, planet, gate: a.gate, line: a.line })));
      names[memberId] = person.name;
    }
    const draft = createWaDraft({ organizationId: 'fictional-wa-r2', title: '虚构组织 · OC16 第二轮验收' });
    draft.members = fixture.map((p, i) => createWaMember({ personId: p.id, labelSnapshot: p.name, memberId: `r2-member-${i}` }));
    draft.alphaId = draft.members[0].memberId;
    draft.pentas.forEach((p, i) => { p.memberIds = draft.members.slice(1+i*3,4+i*3).map(m => m.memberId); });
    const saved = await createWaRepository().save(draft, { expectedRevision: 0 });
    localStorage.setItem('ohd-wa-last-organization-v1', saved.organizationId);
    return { fixture, raw, names, draft: saved };
  });
}

async function main() {
  assert.ok(sourceCommit, 'PENDING parent: set WA_SOURCE_COMMIT to frozen integrated B/C commit after :9961 approval');
  assert.equal(DOM_CONTRACT_READY, true, 'PENDING B DOM contract; no browser or service request performed');
  assert.equal(new URL(base).port, '9961', 'Use parent root server :9961; never start/replace it');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
  const page = await browser.newPage({ viewport: { width:1440, height:1000 }, reducedMotion:'reduce' });
  page.setDefaultTimeout(15000);
  const errors = [], evidence = { sourceCommit, sourceBranch:process.env.WA_SOURCE_BRANCH || 'feature/penta-wa-integration-v1', base, fixture: 'actual WASM / refs-only IDB', cases: [], colors: [], screenshots: [] };
  page.on('pageerror', error => errors.push(error.message));
  const root = () => page.locator('#wa-view');
  const sheet = () => page.locator('.wa-reading-sheet');
  const ready = () => page.waitForFunction(() => document.querySelector('#wa-view .wa-workspace')?.getAttribute('aria-busy') === 'false' && !document.querySelector('#wa-view .wa-error'));
  const shot = async (name, viewportOnly = false) => {
    const detailVisible = await sheet().isVisible();
    await page.screenshot({ path:`${output}/${name}.png`, fullPage:!detailVisible && !viewportOnly });
    evidence.screenshots.push({name,scope:await root().locator('[data-scope-label]').innerText(),viewport:page.viewportSize(),sourceCommit,kind:detailVisible ? 'detail viewport' : viewportOnly ? 'page viewport' : 'whole page'});
  };
  const keyboardKnowledge = async type => {
    const summary = sheet().locator('[data-wa-knowledge] > summary').last();
    assert.equal(await summary.locator('..').evaluate(n => n.open),false,`${type}: knowledge starts closed`);
    let reached = false;
    for (let step=0;step<30;step++) {
      await page.keyboard.press('Tab');
      if (await summary.evaluate(n => document.activeElement === n)) { reached = true; break; }
      assert.equal(await sheet().evaluate(n => n.contains(document.activeElement)),true,`${type}: Tab remains in dialog`);
    }
    assert.equal(reached,true,`${type}: final knowledge summary reachable by Tab`);
    await page.keyboard.press('Enter');
    assert.equal(await summary.locator('..').evaluate(n => n.open),true,`${type}: Enter expands knowledge`);
    await page.keyboard.press('Enter');
    assert.equal(await summary.locator('..').evaluate(n => n.open),false,`${type}: Enter collapses knowledge`);
    await page.keyboard.press('Tab');
    const first = await sheet().locator('[data-wa-back]').isVisible() ? sheet().locator('[data-wa-back]') : sheet().locator('.gate-detail-close');
    assert.equal(await first.evaluate(n => document.activeElement === n),true,`${type}: final collapsed summary Tab cycles to first navigation control`);
  };
  const close = async () => { if (await sheet().isVisible()) await page.keyboard.press('Escape'); };
  try {
    await page.addInitScript(() => localStorage.setItem('ohd-language','zh-CN'));
    await page.goto(`${base}/?view=wa`);
    await root().locator('[data-wa-page]').waitFor();
    const data = await seed(page);
    for (const records of Object.values(data.raw)) {
      assert.equal(records.length,26,'exactly 26 actual chart activations');
      for (const side of ['personality','design']) assert.equal(new Set(records.filter(a => a.side === side).map(a => a.planet)).size,13);
      for (const a of records) assert.ok(Number.isInteger(a.gate) && a.gate >= 1 && a.gate <= 64 && Number.isInteger(a.line) && a.line >= 1 && a.line <= 6);
    }
    evidence.raw = data.raw;
    await page.reload(); await ready();
    const groupIds = data.draft.pentas.map(p => p.pentaId);
    const all = data.draft.members.slice(0,10).map(m => m.memberId);
    const scopeIds = (group, alpha) => group === null ? all : [...data.draft.pentas[group].memberIds, ...(alpha ? [data.draft.alphaId] : [])];
    const scope = async (group, alpha = false) => {
      await close();
      await root().locator(`[data-scope-option="${group === null ? '' : groupIds[group]}"]`).click();
      if (group !== null) {
        assert.equal(await root().locator('[data-include-alpha]').isChecked(),false,'every Penta selection resets Alpha false');
        if (alpha) await root().locator('[data-include-alpha]').check();
      }
      await ready();
      const count = scopeIds(group,alpha).length;
      assert.equal(Number(await root().locator('.wa-overview-stats dd').first().innerText()),count,'UI scope count');
      assert.match(await root().locator('[data-scope-label]').innerText(),new RegExp(`\\b${count}\\b`),'scope label includes actual count');
      return scopeIds(group,alpha);
    };
    const openPair = async pair => {
      await close();
      const toggle = root().locator(`[data-department-toggle="${pair.department}"]`);
      if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
      await root().locator(`[data-pair-row="${pair.channelId}"] [data-wa-pair]`).click();
      await sheet().waitFor();
    };
    // Run the previously failing keyboard/layout path first, then continue the full targeted run.
    await scope(null);
    await openPair(pairs[0]);
    await keyboardKnowledge('pair smoke');
    await sheet().locator('[data-wa-gate="45"]').first().click();
    await keyboardKnowledge('gate smoke');
    const navGeometry = await sheet().evaluate(n => {
      const nav=n.querySelector('.gate-detail-nav'),row=nav.querySelector('.gate-detail-nav-buttons')||nav,a=n.getBoundingClientRect(),b=nav.getBoundingClientRect(),s=getComputedStyle(nav);
      return {sheet:{x:a.x,y:a.y,width:a.width,height:a.height},nav:{x:b.x,y:b.y,width:b.width,height:b.height},position:s.position,direction:getComputedStyle(row).flexDirection};
    });
    assert.equal(navGeometry.position,'static','Wa nav stays in sheet flow');
    assert.equal(navGeometry.direction,'row','Wa nav horizontal');
    assert.ok(navGeometry.nav.x >= navGeometry.sheet.x && navGeometry.nav.y >= navGeometry.sheet.y && navGeometry.nav.y+navGeometry.nav.height <= navGeometry.sheet.y+navGeometry.sheet.height,'navigation contained in sheet');
    evidence.keyboardGeometry = navGeometry;
    console.log('PASS early keyboard/geometry: pair+gate Tab/Enter/cycle, static horizontal nav within sheet');
    await close();
    const seenStates = new Map(); let repeatedPD;
    // Actual UI across all organization/Penta scopes, all 32 pairs and 64 gates.
    for (const [group, alpha] of [[null,false],[0,false],[0,true],[1,false],[1,true],[2,false],[2,true]]) {
      const ids = await scope(group,alpha);
      const label = group === null ? 'organization' : `Penta-${group}-${alpha ? 'alpha' : 'alone'}`;
      for (const department of Object.keys(departments)) {
        const expected = pairs.filter(p => p.department === department).map(p => pairOracle(data.raw,ids,p));
        const card = root().locator(`[data-department-card="${department}"]`);
        assert.equal(Number(await card.getAttribute('data-gate-count')),expected.flatMap(p => p.endpoints).filter(e => e.memberIds.length).length,`${label}/${department}: coverage gates`);
        assert.equal(Number(await card.getAttribute('data-pair-count')),expected.filter(p => p.endpoints.every(e => e.memberIds.length)).length,`${label}/${department}: coverage pairs`);
        await close();
        const toggle = card.locator('[data-department-toggle]');
        if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
        verifyInlineRows(await readInlineRows(card),expected,`${label}/${department}/inline`);
        await card.locator('[data-wa-department]').click();
        const detail = sheet().locator('[data-wa-detail="department"]');
        assert.equal(await detail.getAttribute('data-wa-detail-id'),department);
        verifyRows(await readPairRows(detail),expected,data.names,`${label}/${department}/detail`);
        await close();
      }
      for (const pair of pairs) {
        const expected = pairOracle(data.raw, ids, pair);
        await openPair(pair);
        verifyPair(await readPairDOM(page),expected,data.names,`${label}/${pair.channelId}`);
        if (!seenStates.has(expected.status)) seenStates.set(expected.status,{ label, channelId:pair.channelId, ids });
        for (const endpoint of expected.endpoints) {
          await sheet().locator(`[data-wa-gate="${endpoint.gate}"]`).first().click();
          verifyGate(await readGateDOM(page),endpoint,data.names,`${label}/gate-${endpoint.gate}`);
          for (const id of endpoint.memberIds) {
            const records = endpoint.activations.filter(a => a.memberId === id);
            if (records.length > 2 && new Set(records.map(a => a.side)).size === 2 && new Set(records.map(a => a.planet)).size > 1)
              repeatedPD ||= { group, alpha, gate:endpoint.gate, memberId:id, records };
          }
          await sheet().locator('[data-wa-back]').click();
          verifyPair(await readPairDOM(page),expected,data.names,`${label}/${pair.channelId}/back`);
        }
      }
      evidence.cases.push({ label, ids, states:pairs.map(p => ({channelId:p.channelId,status:pairOracle(data.raw,ids,p).status})) });
      console.log(`PASS raw oracle scope ${label}`);
    }
    assert.deepEqual(sorted(seenStates.keys()),sorted(states),'all five states discovered in actual fixture/scopes; never invent missing coverage');
    assert.ok(repeatedPD,'actual repeated same-gate multi-planet P/D fixture required');
    evidence.stateWitnesses = Object.fromEntries(seenStates); evidence.repeatedPD = repeatedPD;

    await scope(null);
    for (const department of Object.keys(departments)) {
      const toggle = root().locator(`[data-department-toggle="${department}"]`);
      if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click();
    }
    await page.setViewportSize({width:1440,height:1000}); await page.evaluate(() => scrollTo(0,0)); await shot('1440-whole-organization');
    await page.setViewportSize({width:1280,height:900});
    await scope(0); await shot('1280-penta-A');
    await scope(0,true); await shot('1280-penta-A-alpha');
    await scope(1); // A+Alpha -> B must reset false.
    await scope(null); // Global remains all ten regardless of the previous checkbox.
    const management = root().locator('[data-department-toggle="management"]');
    if (await management.getAttribute('aria-expanded') !== 'true') await management.click();
    await shot('1280-management-expanded');
    await openPair(pairs[0]); await shot('1280-pair-45-21');
    await keyboardKnowledge('pair');
    await sheet().locator('[data-wa-gate="45"]').first().click(); await shot('1280-gate-45');
    await keyboardKnowledge('gate');
    await close();

    // Back restores internal scroll; Escape restores ORIGINAL trigger and viewport scroll.
    const trigger = root().locator('.wa-core-svg [data-wa-gate="45"]');
    await trigger.scrollIntoViewIfNeeded(); await trigger.focus();
    const beforeScroll = await page.evaluate(() => { window.waOriginalTrigger = document.activeElement; return window.scrollY; });
    await page.keyboard.press('Enter');
    await sheet().locator('[data-wa-knowledge="gate"]').evaluate(n => { n.open = true; });
    await sheet().locator('.gate-detail-body').evaluate(n => { n.scrollTop = Math.min(160,n.scrollHeight-n.clientHeight); });
    const detailScroll = await sheet().locator('.gate-detail-body').evaluate(n => n.scrollTop);
    assert.ok(detailScroll > 0,'fixture gate details must actually scroll');
    await sheet().locator('[data-wa-pair="21-45"]').first().click();
    await sheet().locator('[data-wa-back]').click();
    assert.ok(Math.abs(await sheet().locator('.gate-detail-body').evaluate(n => n.scrollTop)-detailScroll) <= 2,'Back preserves detail scroll');
    assert.equal(await sheet().locator('[data-wa-knowledge="gate"]').evaluate(n => n.open),true,'Back preserves reading fold');
    await close();
    assert.equal(await trigger.evaluate(n => document.activeElement === n && n === window.waOriginalTrigger),true,'original gate trigger DOM preserved and restored');
    const selection = root().locator('[data-wa-selection-summary] [data-wa-selected="gate"]');
    assert.equal(await selection.getAttribute('data-wa-selected-id'),'45','selected gate footer follows navigation');
    const footerNames = await selection.locator('[data-wa-endpoint="45"] .wa-detail-members [data-wa-member]').allTextContents();
    assert.deepEqual(sorted(footerNames.map(n => n.trim())),sorted(gateOracle(data.raw,all,45).memberIds.map(id => data.names[id])),'selected footer names');
    assert.ok(Math.abs(await page.evaluate(() => window.scrollY)-beforeScroll) <= 2,'viewport scroll preserved');

    await scope(repeatedPD.group,repeatedPD.alpha);
    const pdPair = pairs.find(p => p.gates.includes(repeatedPD.gate));
    await openPair(pdPair); await sheet().locator(`[data-wa-gate="${repeatedPD.gate}"]`).first().click();
    await shot('1280-multiple-planet-PD-activations');
    const skins = await page.evaluate(async () => (await import('/src/lib/skin-registry.js')).SKINS.map(s => s.id));
    assert.equal(skins.length,11,'all registered Skins');
    for (const skin of skins) {
      await page.evaluate(async skin => { const a = await import('/src/lib/appearance.js'); a.setSkin(skin); a.restoreCurrentSkin(); },skin);
      const initial = await readSourceStyles(page);
      for (const custom of [false,true]) {
        if (custom) await page.evaluate(async () => { const a = await import('/src/lib/appearance.js'); a.setCustomOverride('personality','#55cc88'); a.setCustomOverride('design','#dd88ee'); });
        const colors = custom ? await readSourceStyles(page) : initial;
        assert.deepEqual(unique(colors.map(c => c.side)),['design','personality'],'actual P and D labels');
        for (const c of colors) {
          assert.deepEqual(c.labelRGB,c.expectedTextRGB,`${skin}/${custom}/${c.side}: source birth text token`);
          assert.deepEqual(c.backgroundRGB,c.elevatedRGB,`${skin}: bg-elevated`);
          assert.deepEqual(c.borderRGB,c.birthRGB,`${skin}: birth border token`);
          assert.ok(c.borderWidth > 0,`${skin}: birth border is rendered`);
          assert.ok(c.contrast >= 4.5,`${skin}/${custom}/${c.side}: actual contrast ${c.contrast}`);
          if (custom && independentBirthSkins.includes(skin)) {
            const before = initial.find(row => row.side === c.side);
            assert.deepEqual(c.birthRGB,before.birthRGB,`${skin}: independent birth fill survives generic override`);
            assert.deepEqual(c.expectedTextRGB,before.expectedTextRGB,`${skin}: independent birth text survives generic override`);
          }
        }
        evidence.colors.push({skin,custom,colors});
        console.log(`PASS source colors ${skin} custom=${custom}`);
      }
      await page.evaluate(async () => (await import('/src/lib/appearance.js')).restoreCurrentSkin());
    }
    await close();
    // Three locale/Skin visual samples, plus the two requested mobile widths in both scopes/details.
    for (const [locale,skin,width] of [['zh-CN','default-light',390],['zh-Hant','default-dark',320],['en','high-contrast',1280]]) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(async ({locale,skin}) => { (await import('/src/lib/i18n.js')).setLocale(locale,{persist:false}); (await import('/src/lib/appearance.js')).setSkin(skin); },{locale,skin});
      for (const group of [null,0]) {
        await scope(group);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),true,`${width} page overflow`);
        const prefix = `${width}-${locale}-${skin}-${group === null ? 'all' : 'A'}`;
        await shot(`${prefix}-main`);
        await openPair(pairs[0]); await shot(`${prefix}-pair`);
        await sheet().locator('[data-wa-gate="45"]').first().click(); await shot(`${prefix}-gate`);
        assert.equal(await sheet().evaluate(n => n.scrollWidth <= n.clientWidth+1),true,`${width} detail overflow`);
        await close();
      }
    }
    await page.setViewportSize({width:1280,height:640}); await scope(null);
    const geometry = await root().locator('.wa-core-svg').evaluate(svg => {
      const rect = svg.getBoundingClientRect();
      const scale = rect.width / svg.viewBox.baseVal.width;
      return { width:rect.width, viewBox:svg.getAttribute('viewBox'),
        fontSizes:[...svg.querySelectorAll('.wa-node-number,.wa-diagram-name')].map(n => parseFloat(getComputedStyle(n).fontSize)*scale),
        endpoints:[...svg.querySelectorAll('.wa-node-face')].map(n => [n.getAttribute('cx'),n.getAttribute('cy'),n.getAttribute('r')]) };
    });
    assert.ok(geometry.width >= 300,'1280x640 primary graph at least 300px');
    assert.ok(geometry.fontSizes.every(size => size >= 12),'short desktop effective graph fonts >=12px');
    assert.equal(geometry.viewBox,'0 0 360 454','primary graph geometry stays baseline');
    assert.deepEqual(geometry.endpoints,Array.from({length:6},(_,i) => [['180',String(43+i*74),'19'],['306',String(43+i*74),'19']]).flat());
    evidence.shortDesktop = geometry;
    await page.evaluate(() => scrollTo(0,0));
    await shot('1280x640-short-desktop');
    await shot('1280x640-short-desktop-viewport',true);

    // Changes go through the actual People store and trigger the live app subscription.
    await openPair(pairs[0]); await sheet().locator('[data-wa-gate="45"]').first().click();
    const replacement = {...data.fixture[1],birthDate:data.fixture[10].birthDate,birthTime:data.fixture[10].birthTime};
    const newRaw = await page.evaluate(async person => {
      const live = path => performance.getEntriesByType('resource').map(r => r.name).find(url => new URL(url).pathname === path) || path;
      (await import(live('/src/lib/people.js'))).savePerson(person);
      const {chart} = await (await import(live('/src/lib/chartdata.js'))).computeChart(person);
      return ['personality','design'].flatMap(side => Object.entries(chart.gates[side]).map(([planet,a]) => ({memberId:'r2-member-1',side,planet,gate:a.gate,line:a.line})));
    },replacement);
    assert.notDeepEqual(newRaw,data.raw['r2-member-1'],'birth edit changes actual raw chart');
    data.raw['r2-member-1'] = newRaw;
    await ready();
    // Accepted lifecycle: close stale detail or replace it. A still-open detail must be current.
    if (await sheet().isVisible()) verifyGate(await readGateDOM(page),gateOracle(data.raw,all,45),data.names,'People edit live detail');
    for (const pair of pairs) { await openPair(pair); verifyPair(await readPairDOM(page),pairOracle(data.raw,all,pair),data.names,`People edit/${pair.channelId}`); }
    await close();
    await page.evaluate(async () => (await import('/src/lib/people.js')).deletePerson('fictional-r2-9'));
    await root().locator('.wa-error').waitFor();
    assert.match(await root().locator('.wa-errors').innerText(),/MISSING_PERSON_REFERENCE/);
    assert.match(await root().locator('[data-oc16-gates]').innerText(),/—/);
    for (const covered of await root().locator('.wa-core-svg [data-wa-gate]').evaluateAll(nodes => nodes.map(n => n.dataset.covered))) assert.equal(covered,'unknown');
    for (const status of await root().locator('.wa-core-svg [data-wa-pair]').evaluateAll(nodes => nodes.map(n => n.dataset.state))) assert.equal(status,'unknown');
    await shot('missing-reference-unknown');
    await page.evaluate(async person => (await import('/src/lib/people.js')).savePerson(person),data.fixture[9]); await ready();
    assert.deepEqual(errors,[],'no uncaught browser errors');
    evidence.lifecycle = {peopleMutation:'all32PairsRevalidated',missingReference:'unknownNotZero',recovery:'ready',back:'foldAndScrollRestored',escape:'originalDOMFocusAndViewportRestored',selectedFooter:'exactNames'};
    evidence.status = 'PASS';
    await writeFile(`${output}/evidence.json`,JSON.stringify(evidence,null,2));
    console.log(`PASS targeted Wa round 2 (${sourceCommit}); full regression intentionally deferred`);
  } catch (error) {
    evidence.status = 'FAIL'; evidence.failure = error.stack;
    evidence.failureDOM = await page.evaluate(() => {
      const rect = n => { const r = n.getBoundingClientRect(),s=getComputedStyle(n); return {tag:n.tagName,class:n.className,
        x:r.x,y:r.y,width:r.width,height:r.height,scrollTop:n.scrollTop,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight,
        display:s.display,position:s.position,flex:s.flex,overflow:s.overflow,heightCSS:s.height,maxHeight:s.maxHeight}; };
      return {width:innerWidth,height:innerHeight,scrollX,scrollY,active:document.activeElement?.outerHTML.slice(0,2000),
        focusCandidates:[...document.querySelectorAll('.wa-reading-sheet button,.wa-reading-sheet a[href],.wa-reading-sheet [tabindex]')].map(n => ({tag:n.tagName,html:n.outerHTML.slice(0,300),rects:n.getClientRects().length,tabIndex:n.tabIndex,closedFold:!!n.closest('details:not([open])')})),
        nodes:[...document.querySelectorAll('.wa-detail,.wa-reading-sheet,.wa-reading-sheet .gate-detail-nav,.wa-reading-sheet .gate-detail-body,.wa-reading-sheet [data-wa-gate="45"]')].map(rect),
        hitTests:[...document.querySelectorAll('.wa-reading-sheet [data-wa-gate="45"]')].map(n => { const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
          return {x,y,target:n.outerHTML,hit:document.elementFromPoint(x,y)?.outerHTML.slice(0,1200)}; })};
    }).catch(() => null);
    await page.screenshot({path:`${output}/failure-viewport.png`}).catch(() => {});
    await page.screenshot({path:`${output}/failure.png`,fullPage:!(await sheet().isVisible().catch(() => false))}).catch(() => {});
    await writeFile(`${output}/evidence.json`,JSON.stringify(evidence,null,2));
    throw error;
  } finally { await browser.close(); }
}
await main();
