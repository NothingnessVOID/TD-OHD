import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { GATES, CHANNELS } from '../src/lib/human-design/catalog.js';
import { calculateGeneKeys } from '../src/lib/gene-keys.js';
import { compareHumanDesign } from '../src/lib/human-design/connection.js';
import { analyzePenta } from '../src/lib/human-design/penta.js';
import { channelCircuit } from '../src/lib/circuit-topology.js';
import { analyzeTransitActivations } from '../src/lib/transit-analysis.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/derived-parity.json', import.meta.url), 'utf8'));
const canonical = object => JSON.stringify(object, (_key, value) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
const fullOutputHash = output => createHash('sha256').update(canonical(output)).digest('hex');
const activationMap = tuples => Object.fromEntries(tuples.map(([gate, line], index) =>
  [fixtures.points[index], { gate, line }]));
const charts = fixtures.charts.map(input => {
  const channels = CHANNELS.filter(channel => channel.gates.every(gate => input.gates.includes(gate)));
  return {
    type: { name: input.type }, authority: { name: input.authority }, profile: { numbers: input.profile },
    gates: { all: input.gates, personality: activationMap(input.personality), design: activationMap(input.design) },
    channels, centers: { definedNames: [...new Set(channels.flatMap(channel => channel.centers))] },
    definition: 'Single Definition',
  };
});

function calculate({ kind, input }) {
  if (kind === 'connection') return compareHumanDesign(charts[input[0]], charts[input[1]]);
  if (kind === 'geneKeys') return calculateGeneKeys(charts[input]);
  if (kind === 'penta') return analyzePenta(input.charts.map(index => charts[index]), input.names);
  assert.equal(kind, 'transit');
  const gates = Object.fromEntries(Object.entries(activationMap(input.activations)).map(([point, value]) =>
    [point, { ...value, longitude: 0, gateName: GATES[value.gate].name, center: GATES[value.gate].center }]));
  const activeGates = [...new Set(Object.values(gates).map(value => value.gate))];
  const result = analyzeTransitActivations(charts[input.chart], {
    date: 'synthetic-activation-fixture', gates, activeGates, activeGateCount: activeGates.length,
  });
  // Phase 2 intentionally unifies circuit classification; every other output retains its v1 hash.
  for (const completion of result.channelCompletions) {
    const channel = CHANNELS.find(c => c.gates.join('-') === completion.gates.join('-'));
    assert.equal(completion.circuit, channelCircuit(channel).group);
    completion.circuit = channel.circuit; // Project only this approved change for the historical hash.
  }
  return result;
}

// Connection Phase 1 deliberately replaces interpretive output with structural facts.
// Preserve the captured inputs and independently verify topology for all 64 cases;
// the unrelated derived engines retain their historical full-output hashes.
test('connection retains four classifications and correct center topology across 64 captured inputs', () => {
  const cases = fixtures.cases.filter(fixture => fixture.kind === 'connection');
  assert.equal(cases.length, 64);
  for (const fixture of cases) {
    const [a, b] = fixture.input.map(index => charts[index]);
    const result = calculate(fixture);
    const union = new Set([...a.gates.all, ...b.gates.all]);
    const channels = CHANNELS.filter(channel => channel.gates.every(gate => union.has(gate)));
    const centers = [...new Set(channels.flatMap(channel => channel.centers))].sort();
    assert.deepEqual([...result.connectionChart.compositeCenters].sort(), centers, fixture.case);
    assert.equal(result.connectionChart.compositeChannelCount, channels.length, fixture.case);
    for (const channel of channels) {
      const aCount = channel.gates.filter(gate => a.gates.all.includes(gate)).length;
      const bCount = channel.gates.filter(gate => b.gates.all.includes(gate)).length;
      const category = aCount === 2 && bCount === 2 ? 'companionship'
        : Math.max(aCount, bCount) === 2 ? (Math.min(aCount, bCount) === 1 ? 'compromise' : 'dominance')
        : 'electromagnetic';
      assert.ok(result.connectionChart.connections[category].some(item => item.channel === channel.name), `${fixture.case}: ${channel.name}`);
    }
    assert.equal(result.connectionChart.summary.total, channels.length, fixture.case);
    assert.equal(result.centerDynamics.filter(center => center.compositeDefined).length, centers.length);
    assert.equal(result.centerDynamics.filter(center => center.created).length,
      centers.filter(center => !a.centers.definedNames.includes(center) && !b.centers.definedNames.includes(center)).length);
    assert.equal(result.profileHarmony, undefined);
  }
});

for (const [kind, count] of [['penta', 32], ['geneKeys', 64], ['transit', 64]]) {
  test(`${kind} full output retains ${count} captured synthetic contract hashes`, () => {
    const cases = fixtures.cases.filter(fixture => fixture.kind === kind);
    assert.equal(cases.length, count);
    for (const fixture of cases) assert.equal(fullOutputHash(calculate(fixture)), fixture.expectedSha256, fixture.case);
  });
}
