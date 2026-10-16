import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWa, diffWa, WA_PAIRS } from '../src/lib/wa/analysis.js';
import { moveWaMember } from '../src/lib/wa/model.js';
import { analyzePentaStructure } from '../src/lib/human-design/penta-structure.js';
import { chart, fixture } from './helpers/wa-fixtures.js';

for (const [status, patterns] of [
  ['absent', []], ['hanging', [[21]]], ['selfComplete', [[21, 45]]],
  ['crossMemberOnly', [[21], [45]]], ['both', [[21, 45], [21]]]
]) test(`Wa pair ${status} preserves endpoint provenance`, () => {
  const { snapshot, prepared } = fixture();
  patterns.forEach((gates, i) => { prepared[i].chart = chart(gates); });
  const result = analyzeWa(snapshot, prepared);
  assert.equal(result.status, 'ready');
  const pair = result.communication.pairs[0];
  assert.equal(pair.status, status);
  assert.equal(pair.contributorCount, patterns.length);
  assert.equal(pair.activationCount, patterns.length * 26);
  assert.equal(pair.gateRecords.reduce((n, gate) => n + gate.activationCount, 0), pair.activationCount);
  for (const cross of pair.complementaryMemberPairs) assert.notEqual(cross.firstMemberId, cross.secondMemberId);
  if (status === 'hanging') assert.equal(pair.gateRecords[0].holders[0].activationCount, 26);
});

test('only assigned participants contribute; stale gates.all/channels cannot override full activations', () => {
  const { snapshot, prepared } = fixture({ pool: 2 });
  prepared[0].chart.gates.all = [21, 45];
  prepared[0].chart.channels = [{ gates: [21, 45] }];
  prepared.push({ memberId: 'm10', chart: chart([21, 45]), chartQuality: { mode: 'interval' } });
  const result = analyzeWa(snapshot, prepared);
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.poolMemberIds, ['m10', 'm11']);
  assert.equal(result.communication.pairs[0].status, 'absent');
  assert.deepEqual(result.members[0].activeChannelIds, []);
  const assigned = moveWaMember(snapshot, 'm10', { pentaId: 'g0' });
  assert.equal(analyzeWa(assigned, prepared).status, 'not_ready');
  prepared.at(-1).chartQuality.mode = 'single_chart';
  assert.equal(analyzeWa(assigned, prepared).communication.pairs[0].status, 'selfComplete');
});

test('all 13x2 planetary entries, lines, planet keys and input quality are validated', () => {
  for (const mutate of [
    m => { delete m.chart.gates.design.sun; }, m => { m.chart.gates.personality.sun.gate = 65; },
    m => { m.chart.gates.design.sun.line = 0; }, m => { m.chart.gates.design.sun.planet = 'moon'; },
    m => { m.chart.gates.design.extra = { gate: 21, line: 1 }; }, m => { m.chart = null; },
    m => { m.chartQuality = { mode: 'interval' }; }, m => { m.timeUnknown = 'yes'; }
  ]) {
    const { snapshot, prepared } = fixture(); mutate(prepared[0]);
    const result = analyzeWa(snapshot, prepared);
    assert.equal(result.status, 'not_ready');
    assert.equal(result.communication, undefined);
    assert.equal(result.pentas, undefined);
  }
  const { snapshot, prepared } = fixture();
  assert.equal(analyzeWa(snapshot, prepared.slice(1)).status, 'not_ready');
  assert.equal(analyzeWa(snapshot, [...prepared, prepared[0]]).status, 'not_ready');
  snapshot.alphaId = null;
  assert.equal(analyzeWa(snapshot, prepared).status, 'layout_not_ready');
});

test('existing Penta calculation reused unchanged; observation nonstandard groups do not claim a Penta', () => {
  const { snapshot, prepared } = fixture();
  prepared[1].chart = chart([21, 45, 1]);
  const result = analyzeWa(snapshot, prepared);
  assert.deepEqual(result.pentas[0].result, analyzePentaStructure(prepared.slice(1, 4)));
  assert.equal(result.pentas[0].result.channels.find(channel => channel.channelId === '1-8').status, 'absent');
  const observation = fixture({ size: 9, groupSizes: [2, 3, 3], layoutMode: 'observation' });
  const observed = analyzeWa(observation.snapshot, observation.prepared);
  assert.equal(observed.status, 'ready');
  assert.equal(observed.pentas[0].status, 'outside_standard_template');
  assert.equal(observed.pentas[0].result, null);
  assert.equal(observed.pentas[1].status, 'ready');
});

test('conditional uncertainty and unsupported future rules are explicit, individual channels never borrow endpoints', () => {
  const { snapshot, prepared } = fixture();
  prepared[0].chart = chart([21]); prepared[1].chart = chart([45]);
  prepared[0].timeUnknown = true;
  prepared[1].birthTimeConfidence = 'estimated';
  prepared[2].birthTimeConfidence = 'not_recorded';
  const result = analyzeWa(snapshot, prepared);
  assert.equal(result.uncertainty.certaintyMode, 'single_chart_conditional');
  assert.deepEqual(result.uncertainty.estimatedMemberIds, ['m00', 'm01']);
  assert.deepEqual(result.uncertainty.uncertainMemberIds, prepared.map(member => member.memberId));
  prepared[3].birthTimeConfidence = 'exact';
  assert.equal(analyzeWa(snapshot, prepared).uncertainty.uncertainMemberIds.includes('m03'), false);
  assert.equal(result.members.some(member => member.activeChannelIds.includes('21-45')), false);
  for (const key of ['automaticAlpha', 'formalGap', 'triggering', 'automaticPowerBases', 'ranking', 'formation', 'intervalCertainty']) {
    assert.equal(result.capabilities[key].supported, false);
    assert.equal(typeof result.capabilities[key].reason, 'string');
  }
  assert.deepEqual(WA_PAIRS.map(pair => pair.channelId), ['21-45', '25-51', '2-14', '3-60', '6-59', '27-50']);
});

test('diff and schematic remain stable under reordering and renaming; move changes groups while global union stays constant', () => {
  const { snapshot, prepared } = fixture();
  snapshot.layoutMode = 'observation';
  prepared[1].chart = chart([21]); prepared[4].chart = chart([45]);
  const before = analyzeWa(snapshot, prepared);
  const reordered = structuredClone(snapshot);
  reordered.members.reverse(); reordered.pentas.reverse();
  reordered.pentas.forEach(group => { group.memberIds.reverse(); group.title = 'Renamed'; });
  const same = analyzeWa(reordered, [...prepared].reverse());
  assert.deepEqual(same.layout, before.layout);
  assert.deepEqual(same.layoutValidation, before.layoutValidation);
  assert.deepEqual(diffWa(before, same).pentas, []);
  assert.deepEqual(diffWa(before, same).communication.pairs, []);
  const moved = analyzeWa(moveWaMember(snapshot, 'm01', { pentaId: 'g1' }), prepared);
  const diff = diffWa(before, moved);
  assert.deepEqual(diff.communication.pairs, []);
  assert.equal(diff.reassignments.length, 1);
  assert.deepEqual(diff.reassignments[0], { memberId: 'm01', from: { kind: 'penta', pentaId: 'g0' }, to: { kind: 'penta', pentaId: 'g1' } });
  assert.equal(diff.pentas.length, 2);
  assert.equal(diffWa(before, { ...moved, organizationId: 'other' }).status, 'invalid');
  assert.equal(diffWa(before, { status: 'not_ready' }).status, 'not_ready');
});

test('individual derived changes outside Penta and Wa endpoints are included in diff', () => {
  const { snapshot, prepared } = fixture();
  const before = analyzeWa(snapshot, prepared);
  prepared[0].chart = chart([4, 63]);
  const next = analyzeWa(snapshot, prepared);
  const diff = diffWa(before, next);
  assert.deepEqual(diff.communication.pairs, []);
  assert.deepEqual(diff.pentas, []);
  assert.equal(diff.memberChanges.length, 1);
  assert.equal(diff.memberChanges[0].memberId, 'm00');
  assert.deepEqual(diff.memberChanges[0].gateIds, { added: [63], removed: [] });
  assert.deepEqual(diff.memberChanges[0].activeChannelIds, { added: ['4-63'], removed: [] });
  assert.notDeepEqual(diff.memberChanges[0].before.gateContributions, diff.memberChanges[0].after.gateContributions);
});
