import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { OC16_DEPARTMENTS, WA_PILLARS } from '../src/lib/wa/oc16-catalog.js';
import { analyzeOC16, prepareWaPreview, scopeOC16 } from '../src/lib/wa/oc16-analysis.js';
import { analyzeWa, collectPair } from '../src/lib/wa/analysis.js';
import { extractTeamActivations } from '../src/lib/human-design/team-activation.js';
import { chart, fixture } from './helpers/wa-fixtures.js';

const root = new URL('../', import.meta.url);
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const pair = (result, id = '21-45') => result.pairs.find(pair => pair.channelId === id);
const absentCoverage = result => {
  assert.equal(result.status, 'not_ready');
  assert.ok(result.issues.length);
  for (const key of ['gateRecords', 'pairs', 'departments', 'pillars', 'groups', 'gateCount', 'pairCount', 'coreWa', 'pentas']) {
    assert.equal(Object.hasOwn(result, key), false, `error must omit ${key}`);
  }
};
const providersFor = snapshot => {
  const lookups = [], calculations = [];
  return { lookups, calculations, providers: {
    getPerson: async id => { lookups.push(id); return { id, name: 'Synthetic person', birthDate: '2000-01-01', birthTime: '10:30', timezone: 8 }; },
    calculateBirth: async birth => { calculations.push(birth); return { chart: chart([21, 45]) }; }
  } };
};

test('catalog exactly preserves user display mapping and partitions 64 gates into 6 core + 26 support pairs', () => {
  const expected = {
    management: [[45, 21], [54, 32], [44, 26], [19, 49], [37, 40]],
    competition: [[51, 25], [10, 34]],
    direction: [[14, 2], [61, 24], [43, 23], [8, 1]],
    interaction: [[59, 6], [64, 47], [11, 56], [35, 36], [30, 41], [53, 42], [29, 46], [13, 33]],
    logic: [[27, 50], [63, 4], [17, 62], [48, 16], [18, 58], [9, 52], [5, 15], [7, 31]],
    innovation: [[3, 60], [38, 28], [57, 20], [39, 55], [22, 12]]
  };
  assert.deepEqual(Object.fromEntries(OC16_DEPARTMENTS.map(dept => [dept.id, dept.displayPairs])), expected);
  assert.equal(OC16_DEPARTMENTS.length, 6);
  const all = OC16_DEPARTMENTS.flatMap(dept => dept.pairs);
  assert.equal(all.length, 32);
  assert.equal(all.filter(pair => pair.role === 'core').length, 6);
  assert.equal(all.filter(pair => pair.role === 'support').length, 26);
  assert.equal(new Set(all.map(pair => pair.channelId)).size, 32);
  assert.deepEqual(all.flatMap(pair => pair.gates).sort((a, b) => a - b), Array.from({ length: 64 }, (_, i) => i + 1));
  for (const dept of OC16_DEPARTMENTS) {
    assert.equal(dept.nameKey, `OC16 ${dept.id}`);
    for (const [i, pair] of dept.pairs.entries()) {
      assert.deepEqual(pair.displayGates, expected[dept.id][i]);
      assert.deepEqual(pair.gates, [...pair.displayGates].sort((a, b) => a - b));
      assert.equal(pair.channelId, pair.gates.join('-'));
      assert.equal(pair.departmentId, dept.id);
      assert.equal(pair.role, i ? 'support' : 'core');
      assert.ok(Object.isFrozen(pair) && Object.isFrozen(pair.gates) && Object.isFrozen(pair.displayGates));
    }
  }
  assert.deepEqual(WA_PILLARS.map(({ id, gate, nameKey }) => [id, gate, nameKey]), [
    ['structure', 60, 'OC16 structure'], ['safety', 50, 'OC16 safety'],
    ['interaction', 6, 'OC16 interaction'], ['hierarchy', 45, 'OC16 hierarchy']
  ]);
  assert.ok(Object.isFrozen(OC16_DEPARTMENTS) && Object.isFrozen(WA_PILLARS));
});

test('preview preparation accepts incomplete standard drafts, excludes pool and never changes persisted mode', async () => {
  for (const count of [1, 2, 3, 4, 5]) {
    const { snapshot } = fixture({ size: count, groupSizes: [count - 1, 0, 0], pool: 2 });
    const before = structuredClone(snapshot);
    const { providers, lookups, calculations } = providersFor(snapshot);
    const prepared = await prepareWaPreview(freeze(snapshot), providers);
    assert.equal(prepared.status, 'ready');
    assert.equal(prepared.layoutValidation.ready, false);
    assert.equal(prepared.standardTemplateSatisfied, false);
    assert.equal(prepared.members.length, count);
    assert.deepEqual(lookups, snapshot.members.slice(0, count).map(member => member.personId));
    assert.equal(calculations.length, count);
    const result = analyzeOC16(snapshot, prepared);
    assert.equal(result.status, 'ready');
    assert.equal(result.layoutValidation.status, 'layout_not_ready');
    assert.equal(result.memberIds.length, count);
    assert.deepEqual(snapshot, before);
  }
});

test('original invalid JSON, unsupported modes and disjointness fail before providers or chart access', async () => {
  const cases = [];
  for (const mutate of [
    value => { value.layoutMode = 'custom'; },
    value => { value.layoutMode = 'invalid'; },
    value => { value.customPolicy = {}; },
    value => { value.members.push({ ...value.members[0] }); },
    value => { value.pentas[0].memberIds.push(value.alphaId); },
    value => { value.pentas[1].memberIds.push(value.pentas[0].memberIds[0]); },
    value => { value.pentas[0].memberIds.push('missing-member'); },
    value => { value.hidden = undefined; },
    value => { value.cycle = value; }
  ]) {
    const { snapshot } = fixture(); mutate(snapshot); cases.push(snapshot);
  }
  let getterCalls = 0;
  const getter = fixture().snapshot;
  Object.defineProperty(getter, 'layoutMode', { enumerable: true, get() { getterCalls++; throw new Error('accessor'); } });
  cases.push(getter, null, {}, []);
  const providers = { getPerson() { throw new Error('must not lookup'); }, calculateBirth() { throw new Error('must not calculate'); } };
  const chartBomb = [{ memberId: 'm00', get chart() { throw new Error('must not extract'); } }];
  for (const snapshot of cases) {
    const prepared = await prepareWaPreview(snapshot, providers);
    assert.equal(prepared.status, 'not_ready');
    assert.deepEqual(prepared.members, []);
    absentCoverage(analyzeOC16(snapshot, chartBomb));
  }
  assert.equal(getterCalls, 0);
});

test('empty assignment has genuine zero structure, skips providers and preserves explicit preparation errors', async () => {
  const { snapshot } = fixture({ size: 0, groupSizes: [0, 0, 0] });
  snapshot.members.push({ memberId: 'pool', personId: 'synthetic-pool', labelSnapshot: 'Synthetic pool' });
  const prepared = await prepareWaPreview(snapshot);
  assert.equal(prepared.status, 'empty');
  const result = analyzeOC16(snapshot, prepared);
  assert.equal(result.status, 'empty');
  assert.equal(result.gateCount, 0); assert.equal(result.gatePercentage, 0);
  assert.equal(result.pairCount, 0); assert.equal(result.pairPercentage, 0);
  assert.equal(result.gateRecords.length, 64); assert.equal(result.pairs.length, 32);
  assert.ok(result.pairs.every(pair => pair.status === 'absent'));
  assert.ok(result.gateRecords.every(record => record.activationCount === 0));
  assert.ok(result.departments.every(dept => dept.gateCount === 0 && dept.pairCount === 0));
  assert.ok(result.pillars.every(pillar => !pillar.present));
  assert.ok(result.pentas.every(penta => penta.result === null));
  assert.equal(result.coreWa, null);
  assert.deepEqual(result.poolMemberIds, ['pool']);
  absentCoverage(analyzeOC16(snapshot, { status: 'not_ready', members: [], issues: [{ code: 'FAILED' }] }));
  absentCoverage(analyzeOC16(snapshot, [null]));
});

test('Penta results only exist at group sizes 3..5 while coverage remains ready for all assigned sizes', () => {
  for (const count of [1, 2, 3, 4, 5, 6]) {
    const { snapshot, prepared } = fixture({ size: count + 1, groupSizes: [count, 0, 0] });
    const result = analyzeOC16(snapshot, prepared);
    assert.equal(result.status, 'ready');
    assert.equal(result.standardTemplateSatisfied, false);
    assert.equal(result.pentas[0].result !== null, count >= 3 && count <= 5);
    assert.equal(result.pentas[0].status, count >= 3 && count <= 5 ? 'ready' : 'outside_standard_template');
    const original = analyzeWa({ ...snapshot, layoutMode: 'observation' }, prepared);
    assert.deepEqual(result.coreWa, original);
    assert.deepEqual(result.pentas, original.pentas);
  }
  const { snapshot, prepared } = fixture();
  const result = analyzeOC16(snapshot, prepared);
  assert.equal(result.standardTemplateSatisfied, true);
  assert.equal(result.layoutValidation.ready, true);
  assert.equal(result.gateCount, 1); // template satisfaction does not imply coverage
});

test('all five pair statuses have exact shared collector semantics and canonical endpoint attribution', () => {
  const statuses = [
    ['absent', [4], [4]], ['hanging', [21], [4]],
    ['selfComplete', [21, 45], [4]], ['crossMemberOnly', [21], [45]],
    ['both', [21, 45], [45]]
  ];
  for (const [expected, first, second] of statuses) {
    const { snapshot, prepared } = fixture({ size: 2, groupSizes: [1, 0, 0] });
    prepared[0].chart = chart(first); prepared[1].chart = chart(second);
    const result = analyzeOC16(snapshot, prepared);
    assert.equal(pair(result).status, expected);
    const byGate = new Map();
    for (const activation of prepared.flatMap(extractTeamActivations)) {
      if (!byGate.has(activation.gate)) byGate.set(activation.gate, []);
      byGate.get(activation.gate).push(activation);
    }
    for (const actual of result.pairs) {
      const { displayGates, departmentId, role, contributorIds, ...shared } = actual;
      assert.deepEqual(shared, collectPair(actual, byGate));
      assert.deepEqual(contributorIds, [...new Set(actual.gateRecords.flatMap(record => record.memberIds))].sort());
    }
    if (expected === 'crossMemberOnly') {
      assert.deepEqual(pair(result).complementaryMemberPairs, [{ firstMemberId: 'm00', secondMemberId: 'm01' }]);
    }
  }
});

test('all 64 gate records preserve repeated personality/design/planet/line provenance with exact percentages', () => {
  const { snapshot, prepared } = fixture({ size: 3, groupSizes: [2, 0, 0] });
  prepared[0].chart = chart([21]);
  prepared[0].chart.gates.design.moon.line = 6;
  prepared[1].chart = chart([45, 60, 50, 6]);
  prepared[2].chart = chart([45]);
  const result = analyzeOC16(freeze(snapshot), freeze(prepared));
  assert.deepEqual(result.gateRecords.map(record => record.gate), Array.from({ length: 64 }, (_, i) => i + 1));
  const gate21 = result.gateRecords[20];
  assert.equal(gate21.activationCount, 26); assert.equal(gate21.contributorCount, 1);
  assert.deepEqual(gate21.contributorIds, ['m00']);
  assert.deepEqual(gate21.activations, extractTeamActivations(prepared[0]));
  assert.deepEqual(gate21.activations.find(a => a.side === 'design' && a.planet === 'moon'),
    { memberId: 'm00', side: 'design', planet: 'moon', gate: 21, line: 6 });
  assert.equal(result.gateRecords.reduce((sum, record) => sum + record.activationCount, 0), 78);
  assert.equal(result.gateCount, 5); assert.equal(result.gateTotal, 64); assert.equal(result.gatePercentage, 5 / 64 * 100);
  assert.equal(result.pairCount, 1); assert.equal(result.pairTotal, 32); assert.equal(result.pairPercentage, 1 / 32 * 100);
  const management = result.departments[0];
  assert.equal(management.gateCount, 2); assert.equal(management.gateTotal, 10); assert.equal(management.gatePercentage, 20);
  assert.equal(management.pairCount, 1); assert.equal(management.pairTotal, 5); assert.equal(management.pairPercentage, 20);
  assert.deepEqual(management.contributorIds, ['m00', 'm01', 'm02']);
  assert.ok(result.pillars.every(pillar => pillar.present));
});

test('full synthetic gate coverage gives 100 percent across all six departments', () => {
  const { snapshot, prepared } = fixture({ size: 3, groupSizes: [2, 0, 0] });
  prepared.forEach((member, i) => { member.chart = chart(Array.from({ length: 26 }, (_, j) => (i * 26 + j) % 64 + 1)); });
  const result = analyzeOC16(snapshot, prepared);
  assert.equal(result.gateCount, 64); assert.equal(result.pairCount, 32);
  assert.equal(result.gatePercentage, 100); assert.equal(result.pairPercentage, 100);
  assert.ok(result.departments.every(dept => dept.gatePercentage === 100 && dept.pairPercentage === 100));
});

test('group scopes, optional Alpha and explicit ID scope preserve provenance and exclude legacy pool', () => {
  const { snapshot, prepared } = fixture({ pool: 1 });
  prepared[0].chart = chart([45]); prepared[1].chart = chart([21]);
  prepared.push({ memberId: 'm10', chartQuality: { mode: 'interval' }, get chart() { throw new Error('pool chart forbidden'); } });
  const result = analyzeOC16(snapshot, prepared);
  assert.equal(result.status, 'ready');
  assert.equal(result.poolExcluded, true); assert.deepEqual(result.poolMemberIds, ['m10']);
  const group = result.groups[0];
  assert.equal(group.scope, 'group_members_only'); assert.equal(group.withAlpha.scope, 'group_union_manual_alpha');
  assert.equal(pair(group).status, 'hanging'); assert.equal(pair(group.withAlpha).status, 'crossMemberOnly');
  assert.deepEqual(group.memberIds, ['m01', 'm02', 'm03']);
  assert.deepEqual(group.withAlpha.memberIds, ['m00', 'm01', 'm02', 'm03']);
  assert.equal(result.groups[1].memberIds.some(id => group.memberIds.includes(id)), false);
  for (const includeAlpha of [false, true]) {
    const scoped = analyzeOC16(snapshot, prepared, { pentaId: 'g0', includeAlpha });
    const expected = includeAlpha ? group.withAlpha : group;
    for (const key of ['gateRecords', 'pairs', 'departments', 'pillars', 'memberIds', 'gateCount', 'pairCount']) {
      assert.deepEqual(scoped[key], expected[key]);
    }
    assert.equal(scoped.standardTemplateSatisfied, true);
    assert.deepEqual(scoped.assignedMemberIds, result.memberIds);
    assert.deepEqual(scoped.coreWa, result.coreWa);
  }
  const noAlpha = analyzeOC16(snapshot, prepared, { includeAlpha: false });
  assert.equal(noAlpha.memberIds.includes('m00'), false);
  assert.equal(pair(noAlpha).status, 'hanging');
  const scoped = scopeOC16(result, ['m01']);
  assert.equal(scoped.status, 'ready'); assert.equal(pair(scoped).status, 'hanging');
  assert.ok(scoped.gateRecords.flatMap(record => record.activations).every(a => a.memberId === 'm01'));
  for (const ids of [['m10'], ['missing'], ['m01', 'm01'], null, [1]]) absentCoverage(scopeOC16(result, ids));
  assert.equal(scopeOC16(result, []).status, 'empty');
  absentCoverage(scopeOC16(JSON.parse(JSON.stringify(result)), ['m01']));
  result.gateRecords[20].activations[0].line = 2;
  assert.equal(scopeOC16(result, ['m01']).gateRecords[20].activations[0].line, 1);
});

test('empty selected scope is empty while original organization diagnostics and Core WA remain intact', () => {
  const { snapshot, prepared } = fixture({ size: 1, groupSizes: [0, 0, 0] });
  const result = analyzeOC16(snapshot, prepared, { pentaId: 'g0', includeAlpha: false });
  assert.equal(result.status, 'empty'); assert.equal(result.gateCount, 0);
  assert.deepEqual(result.memberIds, []); assert.deepEqual(result.assignedMemberIds, ['m00']);
  assert.equal(result.coreWa.status, 'ready');
  assert.equal(result.standardTemplateSatisfied, false);
  for (const options of [null, [], { pentaId: 'missing' }, { includeAlpha: 1 }]) {
    absentCoverage(analyzeOC16(snapshot, prepared, options));
  }
});

test('any assigned input error prevents all coverage, including when that member is outside selected scope', () => {
  const { snapshot, prepared } = fixture();
  const broken = [];
  for (const mutate of [
    members => members.pop(),
    members => members.push(members[0]),
    members => { members[0].chartQuality = { mode: 'interval' }; },
    members => { members[0].birthTimeConfidence = 'certain'; },
    members => { members[0].timeUnknown = 'yes'; },
    members => { delete members[0].chart.gates.design.pluto; },
    members => { members[0].chart.gates.personality.sun.gate = 65; },
    members => { members[0].chart.gates.personality.sun.line = 0; }
  ]) {
    const input = structuredClone(prepared); mutate(input); broken.push(input);
  }
  for (const input of [null, {}, 'bad', [null], ...broken,
    { status: 'not_ready', members: prepared, issues: [{ code: 'PROVIDER_FAILED' }] },
    { status: 'empty', members: [] }]) {
    absentCoverage(analyzeOC16(snapshot, input));
    absentCoverage(analyzeOC16(snapshot, input, { pentaId: 'g1', includeAlpha: false }));
  }
});

test('provider failures never become zero or partial success; exact/unknown birth behavior is reused', async () => {
  const { snapshot } = fixture({ size: 2, groupSizes: [1, 0, 0] });
  const { providers, calculations } = providersFor(snapshot);
  const lookup = providers.getPerson;
  providers.getPerson = async id => ({ ...await lookup(id), timeUnknown: true, birthTime: '' });
  const prepared = await prepareWaPreview(snapshot, providers);
  assert.equal(prepared.status, 'ready');
  assert.ok(calculations.every(birth => birth.birthTime === '12:00' && birth.timeUnknown));
  assert.ok(prepared.members.every(member => member.birthTimeConfidence === 'estimated'));
  assert.deepEqual(analyzeOC16(snapshot, prepared).coreWa.uncertainty.estimatedMemberIds, ['m00', 'm01']);
  for (const failureProviders of [
    {},
    { ...providers, getPerson: async () => null },
    { ...providers, calculateBirth: async () => { throw new Error('synthetic failure'); } },
    { ...providers, calculateBirth: async () => ({ chart: { gates: {} } }) },
    { ...providers, effectiveBirth: birth => ({ ...birth, birthTime: '01:00' }) }
  ]) {
    const failure = await prepareWaPreview(snapshot, failureProviders);
    assert.equal(failure.status, 'not_ready'); assert.deepEqual(failure.members, []);
    absentCoverage(analyzeOC16(snapshot, failure));
  }
});

test('optional manual metadata does not alter statistics or imply Powerbase inference', () => {
  const { snapshot, prepared } = fixture();
  const before = analyzeOC16(snapshot, prepared);
  snapshot.manualMetadata = { powerBases: [{ memberId: 'm00', assignment: 'manual', label: 'Synthetic note' }] };
  snapshot.schema = 'wa-refs-v2';
  snapshot.manualCommunicationEdges = [{ edgeId: 'synthetic-edge', fromMemberId: 'm00', toMemberId: 'm01', assignment: 'manual' }];
  const after = analyzeOC16(snapshot, prepared);
  assert.equal(after.status, 'ready');
  for (const key of ['gateRecords', 'pairs', 'departments', 'pillars', 'groups']) assert.deepEqual(after[key], before[key]);
  assert.equal(after.classification, 'user-supplied-reference-classification');
  assert.equal(after.structuralStatisticsOnly, true); assert.equal(after.officialMechanics, false);
  assert.equal(after.powerbaseInference, false); assert.equal(after.coreWa.capabilities.automaticPowerBases.supported, false);
  assert.equal(Object.hasOwn(after, 'score'), false); assert.equal(Object.hasOwn(after, 'powerBases'), false);
});

test('legacy analysis differs from the exact task baseline only by collectPair export; providers and engines unchanged', () => {
  const base = '5f7bf7326a21149e6f9b2079c022895a85f56443';
  for (const path of ['src/lib/wa/analysis.js', 'src/lib/wa/prepare.js', 'src/lib/wa/model.js',
    'src/lib/wa/repository.js', 'src/lib/wa/schema.json', 'src/lib/human-design/team-activation.js',
    'src/lib/human-design/penta-structure.js', 'src/lib/human-design/penta-catalog.js']) {
    const old = execFileSync('git', ['show', `${base}:${path}`], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n');
    const actual = readFileSync(new URL(path, root), 'utf8').replaceAll('\r\n', '\n');
    assert.equal(actual, path === 'src/lib/wa/analysis.js'
      ? old.replace('function collectPair(pair, activationsByGate) {', 'export function collectPair(pair, activationsByGate) {') : old);
  }
});
