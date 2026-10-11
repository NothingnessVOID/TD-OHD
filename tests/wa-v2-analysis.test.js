import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { analyzeWa, diffWa, WA_PAIRS } from '../src/lib/wa/analysis.js';
import { validateWaLayout, moveWaMember } from '../src/lib/wa/model.js';
import { chart, fixture } from './helpers/wa-fixtures.js';

const BASE = 'c379fbe6b9a1b4b472b900aeedc691275407c3f8';
const root = new URL('../', import.meta.url);
const baseSource = path => execFileSync('git', ['show', `${BASE}:${path}`], { cwd: root, encoding: 'utf8' });
const dataModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
function resolveImports(source, path) {
  return source.replace(/from '(\.[^']+)'/g, (_, relative) => `from '${new URL(relative, new URL(path, root)).href}'`);
}
const oldModelSource = baseSource('src/lib/wa/model.js')
  .replace("'ajv/dist/2020.js'", `'${import.meta.resolve('ajv/dist/2020.js')}'`)
  .replace("'ajv-formats'", `'${import.meta.resolve('ajv-formats')}'`)
  .replace("'./schema.json'", `'data:application/json;base64,${Buffer.from(baseSource('src/lib/wa/schema.json')).toString('base64')}'`);
const oldModel = dataModule(resolveImports(oldModelSource, 'src/lib/wa/model.js'));
const oldSource = baseSource('src/lib/wa/analysis.js').replace("from './model.js'", `from '${oldModel}'`);
const baseline = await import(dataModule(resolveImports(oldSource, 'src/lib/wa/analysis.js')));
const deepFreeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};

// Compare the original website source directly; no reference-engine implementation is imported.
test('legal default analysis and diff exactly equal c379 website v1 including own keys', () => {
  for (const settings of [{}, { size: 16, groupSizes: [5, 5, 5], pool: 4 },
    { size: 9, groupSizes: [2, 3, 3], layoutMode: 'observation' },
    { size: 1, groupSizes: [0, 0, 0], layoutMode: 'observation' }]) {
    const { snapshot, prepared } = fixture(settings);
    prepared.forEach((member, index) => { member.chart = chart([4, 21, 45, 2, 14, 1, 8, 27, 50].slice(index % 5)); });
    prepared[0].birthTimeConfidence = 'unknown';
    const before = analyzeWa(snapshot, prepared);
    const oldBefore = baseline.analyzeWa(snapshot, prepared);
    assert.deepEqual(before, oldBefore);
    assert.deepEqual(Reflect.ownKeys(before), Reflect.ownKeys(oldBefore));
    prepared[0].chart.gates.personality.sun.line = 5;
    const next = analyzeWa(snapshot, prepared);
    assert.deepEqual(next, baseline.analyzeWa(snapshot, prepared));
    assert.deepEqual(diffWa(before, next), baseline.diffWa(oldBefore, baseline.analyzeWa(snapshot, prepared)));
    assert.equal(Object.hasOwn(before, 'groupCommunication'), false);
    assert.equal(Object.hasOwn(before, 'manualCommunication'), false);
    assert.equal(Object.hasOwn(before, 'consultation'), false);
    assert.equal(Object.hasOwn(diffWa(before, next), 'contributionTrace'), false);
  }
});

test('default diff parity covers moves, participant entry/removal, Alpha changes and actual coverage changes', () => {
  const { snapshot, prepared } = fixture({ pool: 1, layoutMode: 'observation' });
  prepared.push({ memberId: 'm10', chart: chart([27, 50]) });
  prepared[0].chart = chart([21]); prepared[1].chart = chart([45]);
  snapshot.manualMetadata = { notes: 'unverified', powerBases: [{ memberId: 'm00', label: 'Direction', assignment: 'manual' }] };
  const before = analyzeWa(snapshot, prepared);
  const oldBefore = baseline.analyzeWa(snapshot, prepared);
  const cases = [moveWaMember(snapshot, 'm01', { pentaId: 'g1' }), moveWaMember(snapshot, 'm01', null),
    moveWaMember(snapshot, 'm10', { pentaId: 'g0' }), moveWaMember(snapshot, 'm10', { alpha: true })];
  for (const next of cases) {
    const result = analyzeWa(next, prepared);
    const oldResult = baseline.analyzeWa(next, prepared);
    assert.deepEqual(result, oldResult);
    assert.deepEqual(diffWa(before, result), baseline.diffWa(oldBefore, oldResult));
  }
  const changed = structuredClone(prepared); changed[0].chart = chart([25, 51, 2, 14]);
  assert.deepEqual(diffWa(before, analyzeWa(snapshot, changed)), baseline.diffWa(oldBefore, baseline.analyzeWa(snapshot, changed)));
});

test('Penta and original activation algorithm files remain byte-for-byte unchanged', () => {
  for (const path of ['src/lib/human-design/penta-structure.js', 'src/lib/human-design/penta-catalog.js',
    'src/lib/human-design/team-activation.js']) {
    assert.equal(readFileSync(new URL(path, root), 'utf8').replaceAll('\r\n', '\n'), baseSource(path).replaceAll('\r\n', '\n'));
  }
});

test('invalid snapshots have stable false readiness, zero counts and empty collections', () => {
  for (const snapshot of [null, 'bad', [], {}, { ...fixture().snapshot, members: null },
    { ...fixture().snapshot, pentas: 'bad' }]) {
    const layout = validateWaLayout(snapshot);
    assert.equal(layout.canAnalyze, false);
    assert.equal(layout.ready, false);
    assert.equal(layout.participantCount, 0);
    assert.equal(layout.standardTemplateSatisfied, false);
    for (const key of ['memberIds', 'poolMemberIds', 'groups']) assert.deepEqual(layout[key], []);
    const result = analyzeWa(snapshot, null, { includeGroupCommunication: true });
    assert.equal(result.status, 'layout_not_ready');
    assert.equal(result.communication, undefined);
    assert.equal(result.groupCommunication, undefined);
  }
});

test('malformed prepared entries, containers, duplicates and quality are structured not_ready', () => {
  const { snapshot, prepared } = fixture({ pool: 1 });
  for (const invalid of [null, 'bad', {}, [null], ['bad'], [...prepared, null], [...prepared, { memberId: '' }],
    [...prepared, prepared[0]], [...prepared, { memberId: 'm10' }, { memberId: 'm10' }]]) {
    const result = analyzeWa(snapshot, invalid);
    assert.equal(result.status, 'not_ready');
    assert.equal(result.communication, undefined);
  }
  for (const quality of [null, 'single_chart', [], { mode: 'unknown' }, { mode: 'interval' }]) {
    const input = structuredClone(prepared); input[0].chartQuality = quality;
    assert.equal(analyzeWa(snapshot, input).status, 'not_ready');
  }
  for (const confidence of ['unknown', 'not_recorded', 'estimated', 'exact', undefined]) {
    const input = structuredClone(prepared); input[0].birthTimeConfidence = confidence;
    const result = analyzeWa(snapshot, input);
    assert.equal(result.status, 'ready');
    assert.equal(result.uncertainty.uncertainMemberIds.includes('m00'), confidence !== 'exact');
  }
  const input = structuredClone(prepared); input[0].birthTimeConfidence = 'confident';
  assert.equal(analyzeWa(snapshot, input).status, 'not_ready');
  const empty = fixture({ size: 0, groupSizes: [0, 0, 0], layoutMode: 'observation' });
  assert.equal(analyzeWa(empty.snapshot, []).status, 'not_ready');
});

test('group scopes isolate Alpha and pool; opt-in leaves global/Penta results exactly unchanged', () => {
  const { snapshot, prepared } = fixture({ pool: 1 });
  prepared[0].chart = chart([45]); prepared[1].chart = chart([21]);
  prepared.push({ memberId: 'm10', chart: chart([25, 51]), chartQuality: { mode: 'interval' } });
  const plain = analyzeWa(snapshot, prepared);
  const result = analyzeWa(snapshot, prepared, { includeGroupCommunication: true });
  const { groupCommunication, ...rest } = result;
  assert.deepEqual(rest, plain);
  assert.equal(groupCommunication.sourceScope, 'supplied_chart_activations');
  assert.equal(groupCommunication.officialMechanics, false);
  for (const group of groupCommunication.groups) {
    assert.equal(group.scope, 'group_members_only');
    assert.equal(group.withAlpha.scope, 'group_union_manual_alpha');
    assert.deepEqual(group.pairs.map(pair => pair.channelId), WA_PAIRS.map(pair => pair.channelId));
    assert.equal(group.memberIds.includes('m00'), false);
    assert.equal(group.withAlpha.memberIds.filter(id => id === 'm00').length, 1);
    assert.equal(group.withAlpha.memberIds.includes('m10'), false);
    assert.equal(group.withAlpha.pairs[1].status, 'absent');
  }
  assert.equal(groupCommunication.groups[0].pairs[0].status, 'hanging');
  assert.equal(groupCommunication.groups[0].withAlpha.pairs[0].status, 'crossMemberOnly');
});

test('empty observation group has structural empty pairs and never a formed Penta', () => {
  const { snapshot, prepared } = fixture({ size: 1, groupSizes: [0, 0, 0], layoutMode: 'observation' });
  prepared[0].chart = chart([21, 45]);
  const result = analyzeWa(snapshot, prepared, { includeGroupCommunication: true });
  assert.equal(result.status, 'ready');
  for (const group of result.groupCommunication.groups) {
    assert.deepEqual(group.memberIds, []);
    assert.equal(group.pairs.every(pair => pair.status === 'absent'), true);
    assert.equal(group.withAlpha.pairs[0].activationCount, 26);
  }
  assert.equal(result.pentas.every(group => group.result === null && group.status === 'outside_standard_template'), true);
});

test('group union generically deduplicates Alpha even though admission still prohibits overlap', async () => {
  // Exercise the same implementation through an isolated validation seam; production policy stays closed.
  const source = readFileSync(new URL('src/lib/wa/analysis.js', root), 'utf8')
    .replace("import { validateWaLayout } from './model.js';", `const validateWaLayout = snapshot => ({ready:true,valid:true,issues:[],memberIds:[...new Set([snapshot.alphaId,...snapshot.pentas.flatMap(g=>g.memberIds)])].sort(),poolMemberIds:[]});`);
  const generic = await import(dataModule(resolveImports(source, 'src/lib/wa/analysis.js')));
  const { snapshot, prepared } = fixture({ layoutMode: 'observation' });
  snapshot.alphaId = 'm01'; prepared[1].chart = chart([21, 45]);
  assert.equal(analyzeWa(snapshot, prepared).status, 'layout_not_ready');
  const result = generic.analyzeWa(snapshot, prepared, { includeGroupCommunication: true });
  const group = result.groupCommunication.groups[0];
  assert.deepEqual(group.memberIds, group.withAlpha.memberIds);
  assert.deepEqual(group.pairs, group.withAlpha.pairs);
  assert.equal(group.withAlpha.pairs[0].activationCount, 26);
});

test('manual fields clone only when supplied and never change computed coverage or layout', () => {
  const { snapshot, prepared } = fixture();
  const plain = analyzeWa(snapshot, prepared);
  snapshot.schema = 'wa-refs-v2';
  snapshot.consultation = { assignment: 'manual', origin: 'manual', specificProblem: 'handoff',
    businessAreas: [{ pentaId: 'g0', workScope: '', demand: '', requiredSkills: ['notes'] }],
    gapIntents: [{ id: 'intent', pentaId: 'g0', theme: 'communication', stage: 'wish_list', note: '' }], keyAllyIds: ['m01'] };
  snapshot.manualCommunicationEdges = [{ edgeId: 'edge', fromMemberId: 'm00', toMemberId: 'm01', assignment: 'manual', sourceRef: 'unverified' }];
  snapshot.manualMetadata = { powerBases: [{ memberId: 'm00', label: 'Unknown composition', assignment: 'manual' }] };
  const original = structuredClone(snapshot);
  const result = analyzeWa(deepFreeze(snapshot), deepFreeze(prepared));
  assert.equal(result.status, 'ready');
  const { consultation, manualCommunication, ...rest } = result;
  assert.deepEqual(rest, plain);
  assert.deepEqual(consultation, snapshot.consultation);
  assert.deepEqual(manualCommunication.edges, snapshot.manualCommunicationEdges);
  assert.equal(manualCommunication.affectsCoverage, false);
  assert.equal(manualCommunication.sourceVerification, 'not_performed');
  assert.equal(manualCommunication.mechanicalActivation, false);
  consultation.businessAreas[0].requiredSkills.push('edited'); manualCommunication.edges[0].sourceRef = 'edited';
  assert.deepEqual(snapshot, original);
  assert.equal(result.capabilities.automaticPowerBases.supported, false);
  assert.equal(Object.hasOwn(result, 'powerBaseScore'), false);
  assert.equal(Object.hasOwn(result, 'compositions'), false);
  assert.deepEqual(diffWa(plain, result), diffWa(plain, plain));
  assert.deepEqual(analyzeWa(snapshot, prepared, { includeGroupCommunication: true }).groupCommunication,
    analyzeWa(fixture().snapshot, prepared, { includeGroupCommunication: true }).groupCommunication);
});

test('invalid manual fields fail model admission before any chart extraction or derived output', () => {
  for (const manual of [
    { consultation: { assignment: 'automatic', origin: 'manual' } },
    { manualCommunicationEdges: [{ edgeId: 'edge', fromMemberId: 'm00', toMemberId: 'm10', assignment: 'manual' }] }
  ]) {
    const { snapshot, prepared } = fixture({ pool: 1 }); Object.assign(snapshot, { schema: 'wa-refs-v2' }, manual);
    Object.defineProperty(prepared[0], 'chart', { get() { throw new Error('must not read charts after invalid admission'); } });
    const result = analyzeWa(snapshot, prepared, { includeGroupCommunication: true });
    assert.equal(result.status, 'layout_not_ready');
    assert.equal(result.communication, undefined);
    assert.equal(result.groupCommunication, undefined);
    assert.equal(result.consultation, undefined);
    assert.equal(result.manualCommunication, undefined);
  }
});

test('explicit empty optional manual objects are preserved without extra computed defaults', () => {
  const { snapshot, prepared } = fixture();
  const plain = analyzeWa(snapshot, prepared);
  snapshot.schema = 'wa-refs-v2';
  snapshot.consultation = { assignment: 'manual', origin: 'manual' };
  snapshot.manualCommunicationEdges = [];
  const result = analyzeWa(snapshot, prepared);
  assert.equal(result.status, 'ready');
  const { consultation, manualCommunication, ...rest } = result;
  assert.deepEqual(rest, plain);
  assert.deepEqual(consultation, snapshot.consultation);
  assert.deepEqual(manualCommunication.edges, []);
});

test('trace precisely identifies line/planet/side edits even when aggregate member diff is empty', () => {
  const { snapshot, prepared } = fixture(); prepared[0].chart = chart([21]);
  const before = analyzeWa(snapshot, prepared);
  prepared[0].chart.gates.design.moon.line = 3;
  const after = analyzeWa(snapshot, prepared);
  assert.deepEqual(diffWa(before, after).memberChanges, []);
  const trace = diffWa(before, after, { includeTrace: true }).contributionTrace;
  assert.equal(trace.status, 'ready');
  assert.equal(trace.performanceCausality, false);
  assert.deepEqual(trace.activations.removed, [{ memberId: 'm00', side: 'design', planet: 'moon', gate: 21, line: 1 }]);
  assert.deepEqual(trace.activations.added, [{ memberId: 'm00', side: 'design', planet: 'moon', gate: 21, line: 3 }]);
  assert.deepEqual(trace.gates[0].activationCount, { from: 26, to: 26, delta: 0 });
  assert.deepEqual(trace.gates[0].contributors, { added: [], removed: [] });
  assert.deepEqual(trace.gates[0].presence, { from: 'present', to: 'present' });
  assert.equal(trace.gates[0].members[0].memberId, 'm00');
  assert.equal(trace.pairEndpoints.length, 1);
  assert.equal(trace.pairEndpoints[0].channelId, '21-45');
  trace.activations.added[0].line = 6;
  assert.equal(diffWa(before, after, { includeTrace: true }).contributionTrace.activations.added[0].line, 3);
});

test('trace preserves side and planet identity when equal-count contributions exchange source positions', () => {
  const { snapshot, prepared } = fixture();
  prepared[0].chart.gates.personality.sun = { gate: 21, line: 2, planet: 'sun' };
  const before = analyzeWa(snapshot, prepared);
  prepared[0].chart.gates.personality.sun = { gate: 4, line: 1, planet: 'sun' };
  prepared[0].chart.gates.design.earth = { gate: 21, line: 2, planet: 'earth' };
  const after = analyzeWa(snapshot, prepared);
  assert.deepEqual(diffWa(before, after).memberChanges, []);
  const trace = diffWa(before, after, { includeTrace: true }).contributionTrace;
  assert.deepEqual(trace.activations.added, [
    { memberId: 'm00', side: 'personality', planet: 'sun', gate: 4, line: 1 },
    { memberId: 'm00', side: 'design', planet: 'earth', gate: 21, line: 2 }
  ]);
  assert.deepEqual(trace.activations.removed, [
    { memberId: 'm00', side: 'personality', planet: 'sun', gate: 21, line: 2 },
    { memberId: 'm00', side: 'design', planet: 'earth', gate: 4, line: 1 }
  ]);
  assert.equal(trace.gates.every(gate => gate.activationCount.delta === 0 && gate.contributorCount.delta === 0), true);
});

test('prepared identity errors preflight before reading participant charts', () => {
  const { snapshot, prepared } = fixture();
  Object.defineProperty(prepared[0], 'chart', { get() { throw new Error('must not extract a chart after identity failure'); } });
  const result = analyzeWa(snapshot, [...prepared, prepared[0]]);
  assert.equal(result.status, 'not_ready');
  assert.deepEqual(result.issues, [{ code: 'DUPLICATE_PREPARED_MEMBER', memberId: 'm00' }]);
});

test('trace includes all supplied chart gates, removal/member gates, counts and endpoint presence transitions', () => {
  const { snapshot, prepared } = fixture({ layoutMode: 'observation' });
  prepared[0].chart = chart([21]); prepared[1].chart = chart([45]);
  const before = analyzeWa(snapshot, prepared);
  const moved = moveWaMember(snapshot, 'm01', null);
  prepared[0].chart = chart([63]);
  const after = analyzeWa(moved, prepared);
  const diff = diffWa(before, after, { includeTrace: true });
  assert.deepEqual(diff.participants.removed, ['m01']);
  const trace = diff.contributionTrace;
  assert.equal(trace.activations.added.length, 26);
  assert.equal(trace.activations.removed.length, 52);
  assert.deepEqual(trace.gates.map(gate => gate.gate), [21, 45, 63]);
  assert.deepEqual(trace.gates[0].presence, { from: 'present', to: 'absent' });
  assert.deepEqual(trace.gates[1].contributors, { added: [], removed: ['m01'] });
  assert.deepEqual(trace.gates[2].activationCount, { from: 0, to: 26, delta: 26 });
  assert.deepEqual(trace.pairEndpoints[0].status, { from: 'crossMemberOnly', to: 'absent' });
  assert.deepEqual(trace.pairEndpoints[0].endpoints[1].holders.removed, ['m01']);
  const reverse = diffWa(after, before, { includeTrace: true });
  assert.deepEqual(reverse.participants.added, ['m01']);
  assert.deepEqual(reverse.contributionTrace.activations.added, trace.activations.removed);
  assert.deepEqual(reverse.contributionTrace.activations.removed, trace.activations.added);
  const unavailable = diffWa(structuredClone(before), structuredClone(after), { includeTrace: true }).contributionTrace;
  assert.equal(unavailable.status, 'not_available');
  assert.equal(unavailable.reason, 'ANALYZE_RESULTS_REQUIRED');
  assert.equal(Object.hasOwn(unavailable, 'activations'), false);
});

test('source reordering is deterministic, frozen inputs safe, and group moves do not invent input causality', () => {
  const { snapshot, prepared } = fixture({ layoutMode: 'observation' });
  prepared[1].chart = chart([21]); prepared[4].chart = chart([45]);
  const beforeInput = structuredClone({ snapshot, prepared });
  const before = analyzeWa(deepFreeze(snapshot), deepFreeze(prepared), { includeGroupCommunication: true });
  const reorder = structuredClone(beforeInput);
  reorder.snapshot.members.reverse(); reorder.snapshot.pentas.reverse(); reorder.prepared.reverse();
  reorder.snapshot.pentas.forEach(group => group.memberIds.reverse());
  reorder.prepared.forEach(member => {
    for (const side of ['personality', 'design']) member.chart.gates[side] = Object.fromEntries(Object.entries(member.chart.gates[side]).reverse());
  });
  const same = analyzeWa(reorder.snapshot, reorder.prepared, { includeGroupCommunication: true });
  assert.deepEqual(same, before);
  assert.deepEqual(diffWa(before, same, { includeTrace: true }).contributionTrace.activations, { added: [], removed: [] });
  const moved = analyzeWa(moveWaMember(snapshot, 'm01', { pentaId: 'g1' }), prepared, { includeGroupCommunication: true });
  const change = diffWa(before, moved, { includeTrace: true });
  assert.equal(change.reassignments.length, 1);
  assert.deepEqual(change.communication.pairs, []);
  assert.deepEqual(change.contributionTrace.activations, { added: [], removed: [] });
  assert.notDeepEqual(before.groupCommunication, moved.groupCommunication);
  assert.deepEqual({ snapshot, prepared }, beforeInput);
});
