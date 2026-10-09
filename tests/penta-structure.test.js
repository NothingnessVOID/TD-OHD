import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptSharpChart } from '../src/lib/chart-engine/sharp-contract.js';
import { analyzePentaStructure } from '../src/lib/human-design/penta-structure.js';
import { TEAM_PLANETS, TeamStructureError } from '../src/lib/human-design/team-activation.js';

// Every test member has a full Sharp-shaped 13+13 activation contract.
function member(id, gates = [], name = 'Same name') {
  const side = () => Object.fromEntries(TEAM_PLANETS.map(planet => [planet, { gate: 64, line: 1, planet }]));
  const personality = side(), design = side();
  gates.forEach((gate, i) => {
    const planet = TEAM_PLANETS[i % TEAM_PLANETS.length];
    (i < TEAM_PLANETS.length ? personality : design)[planet] = { gate, line: i % 6 + 1, planet };
  });
  return { memberId: id, displayName: name, chart: { gates: { personality, design, all: [] } } };
}
const minimal = () => [member('A'), member('B'), member('C')];
const edge = result => result.channels[0];
const issue = (fn, code, path) => assert.throws(fn, e => e instanceof TeamStructureError && e.code === code && e.path === path);

test('3–5 members compute, 2 and 6 reject; same names and identical birth data remain distinct by ID', () => {
  for (const count of [3,4,5]) {
    const members = Array.from({ length: count }, (_, i) => member(`id-${i}`, i === 0 ? [31] : i === 1 ? [7] : []));
    const result = analyzePentaStructure(members);
    assert.equal(result.memberCount, count);
    assert.deepEqual(result.gates[0].memberIds, ['id-0']);
    assert.equal(result.channels.length, 6);
    assert.equal(edge(result).status, 'crossMemberOnly');
  }
  issue(() => analyzePentaStructure(minimal().slice(0, 2)), 'PENTA_MEMBER_COUNT', 'members');
  issue(() => analyzePentaStructure([...minimal(), member('D'), member('E'), member('F')]), 'PENTA_MEMBER_COUNT', 'members');
  issue(() => analyzePentaStructure([member('A'),member('A'),member('C')]), 'DUPLICATE_MEMBER_ID', 'members[1].memberId');
});

test('four statuses, missing one or both endpoints, endpoint-distinct pairs and no duplicates', () => {
  const cases = [
    [minimal(), 'absent', [31,7], [], []],
    [[member('A',[31]),member('B'),member('C')], 'absent', [7], [], []],
    [[member('A',[31,7]),member('B'),member('C')], 'selfComplete', [], ['A'], []],
    [[member('A',[31]),member('B',[7]),member('C')], 'crossMemberOnly', [], [], [['A','B']]],
    [[member('A',[31,7]),member('B',[31]),member('C')], 'both', [], ['A'], [['B','A']]],
    [[member('A',[31,7]),member('B',[31,7]),member('C')], 'both', [], ['A','B'], [['A','B'],['B','A']]]
  ];
  for (const [members, status, missing, self, pairs] of cases) {
    const channel = edge(analyzePentaStructure(members));
    assert.equal(channel.status, status);
    assert.deepEqual(channel.missingGates, missing);
    assert.deepEqual(channel.selfCompleteMemberIds, self);
    assert.deepEqual(channel.complementaryMemberPairs.map(p => [p.upperMemberId,p.lowerMemberId]), pairs);
    assert.ok(channel.complementaryMemberPairs.every(p => p.upperMemberId !== p.lowerMemberId));
  }
});

test('P/D source counts, absent cells, canonical directory and input order are stable without mutation', () => {
  const a = member('A', [31,31]);
  a.chart.gates.design.sun = { planet: 'sun', gate: 31, line: 6 };
  const b = member('B', [7]);
  const c = member('C');
  const original = structuredClone([a,b,c]);
  const first = analyzePentaStructure([c,b,a]);
  assert.deepEqual(first, analyzePentaStructure([a,b,c]));
  assert.deepEqual([a,b,c], original);
  assert.equal(first.modelVersion, 'penta-structure-v1');
  assert.equal(first.scope, 'penta');
  assert.equal(first.gates.length, 12);
  assert.equal(first.gates[0].gate, 31);
  assert.equal(first.gates[0].contributorCount, 1);
  assert.equal(first.gates[0].activationCount, 3);
  assert.deepEqual(first.gates[0].activations.map(a => [a.side,a.planet,a.line]), [
    ['personality','sun',1],['personality','earth',2],['design','sun',6]
  ]);
  assert.equal(first.gates.find(g => g.gate === 8).status, 'absent');
  assert.equal(first.gates.find(g => g.gate === 8).activationCount, 0);
  assert.equal(first.summary.totalActivationCount, 78);
  assert.deepEqual(first.channels.map(c => c.channelId), ['7-31','1-8','13-33','5-15','2-14','29-46']);
});

test('real anonymous Sharp contract fixture runs all 26 activations per member through structure', () => {
  const snapshot = JSON.parse(readFileSync(new URL('./fixtures/sharp-definition-components.json', import.meta.url))).samples[0];
  const chart = adaptSharpChart(snapshot.raw, { birthDate: '1960-01-01', birthTime: '00:00', timezone: 0 });
  const members = ['A','B','C'].map(memberId => ({ memberId, displayName: 'Anonymous', chart }));
  const result = analyzePentaStructure(members);
  assert.equal(result.summary.totalActivationCount, 78);
  for (const cell of result.gates) {
    const expected = ['personality','design'].flatMap(side => Object.entries(snapshot.raw[side])
      .filter(([,a]) => a.gate === cell.gate));
    assert.equal(cell.activationCount, expected.length * 3);
    assert.equal(cell.contributorCount, expected.length ? 3 : 0);
  }
  assert.deepEqual(result, analyzePentaStructure(members.toReversed()));
});

test('integration gates remain outside Penta even when all ordinary endpoints are present', () => {
  const result = analyzePentaStructure([member('A',[10,20]),member('B',[34]),member('C')]);
  assert.equal(result.summary.presentGateCount, 0);
  assert.equal(result.summary.coveredChannelCount, 0);
  assert.equal(result.summary.totalActivationCount, 78);
  assert.deepEqual(result.channels.map(channel => channel.status), Array(6).fill('absent'));
  assert.ok(result.gates.every(cell => cell.activationCount === 0));
});

test('incomplete member blocks any apparently complete team result', () => {
  const members = minimal();
  delete members[1].chart.gates.design;
  assert.throws(() => analyzePentaStructure(members), e => e instanceof TeamStructureError &&
    e.code === 'MISSING_SIDE' && e.memberId === 'B' && e.path === 'chart.gates.design');
});
