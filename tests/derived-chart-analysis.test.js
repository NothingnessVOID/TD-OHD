import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS } from '../src/lib/human-design/catalog.js';
import { calculateGeneKeys } from '../src/lib/gene-keys.js';
import { compareHumanDesign } from '../src/lib/human-design/connection.js';
import { analyzePenta } from '../src/lib/human-design/penta.js';
import { analyzeTransitActivations } from '../src/lib/transit-analysis.js';

function chart(gates, type = 'Generator') {
  const channels = CHANNELS.filter(channel => channel.gates.every(gate => gates.includes(gate)));
  return {
    gates: { all: gates }, channels,
    centers: { definedNames: [...new Set(channels.flatMap(channel => channel.centers))] },
    type: { name: type }, authority: { name: 'Sacral Authority' },
    profile: { numbers: '1/3' }, definition: 'Single Definition',
  };
}

// These are abstract activation sets, not birth records or astronomical fixtures.
test('Connection distinguishes the four channel relationship classes without changing inputs', () => {
  const a = chart([1, 8, 2, 14, 11, 56, 13]);
  const b = chart([1, 8, 11, 33], 'Projector');
  const before = JSON.stringify([a, b]);
  const result = compareHumanDesign(a, b);
  const categories = result.connectionChart.connections;
  assert.ok(categories.companionship.some(channel => channel.gates.includes(1) && channel.gates.includes(8)));
  assert.ok(categories.dominance.some(channel => channel.gates.includes(2) && channel.gates.includes(14) && channel.dominant === 'A'));
  assert.ok(categories.compromise.some(channel => channel.gates.includes(11) && channel.gates.includes(56) && channel.partialGate === 11));
  assert.ok(categories.electromagnetic.some(channel => channel.gateA === 13 && channel.gateB === 33));
  assert.equal(result.stats.electromagneticCount, result.electromagneticPairs.length);
  assert.equal(JSON.stringify([a, b]), before);
});

test('Team analysis combines complementary activations and preserves member identities', () => {
  const a = chart([2]);
  const b = chart([14]);
  const c = chart([1, 8], 'Projector');
  const result = analyzePenta([a, b, c], ['Synthetic A', 'Synthetic B', 'Synthetic C']);
  assert.equal(result.isPenta, true);
  assert.equal(result.memberCount, 3);
  assert.equal(result.groupType, 'Manifesting Generator');
  assert.ok(result.groupChannels.some(channel => channel.gates.includes(2) && channel.gates.includes(14)));
  assert.ok(result.electromagnetics.some(link => link.personA === 'Synthetic A' && link.personB === 'Synthetic B'));
  assert.deepEqual(result.members.map(member => member.name), ['Synthetic A', 'Synthetic B', 'Synthetic C']);
  assert.equal(analyzePenta([a, b]).isPenta, false);
  assert.throws(() => analyzePenta([a]), /at least 2/);
  assert.throws(() => analyzePenta(Array(10).fill(a)), /up to 9/);
});

test('Gene Keys maps spheres to the supplied personality/design activations and lines', () => {
  const personality = { sun: { gate: 23, line: 2 }, earth: { gate: 43, line: 2 }, venus: { gate: 24, line: 4 }, mars: { gate: 20, line: 5 }, jupiter: { gate: 2, line: 6 } };
  const design = { sun: { gate: 49, line: 4 }, earth: { gate: 4, line: 4 }, moon: { gate: 3, line: 4 }, venus: { gate: 61, line: 1 }, mars: { gate: 25, line: 2 }, jupiter: { gate: 3, line: 4 } };
  const result = calculateGeneKeys({ gates: { personality, design } });
  assert.equal(result.activationSequence.lifeWork.keyLine, '23.2');
  assert.equal(result.activationSequence.radiance.keyLine, '49.4');
  assert.equal(result.venusSequence.iq.keyLine, '24.4');
  assert.equal(result.venusSequence.attraction.keyLine, '3.4');
  assert.equal(result.pearlSequence.culture.keyLine, '3.4');
  assert.deepEqual(result.core.spectrum, result.pearlSequence.vocation.spectrum);
  assert.equal(result.brand.keyLine, result.lifeWork.keyLine);
  assert.equal(result.allKeys.length, 11);
});

test('Transit overlay separates reinforced gates, hanging completions and pure transit channels', () => {
  const natal = chart([1, 8, 13, 11]);
  const gates = { sun: { gate: 33, line: 1 }, moon: { gate: 1, line: 2 }, mercury: { gate: 56, line: 3 }, venus: { gate: 2, line: 4 }, mars: { gate: 14, line: 5 } };
  const activeGates = Object.values(gates).map(activation => activation.gate);
  const before = JSON.stringify(natal);
  const result = analyzeTransitActivations(natal, { date: 'synthetic', gates, activeGates, activeGateCount: activeGates.length });
  assert.equal(result.transitDate, 'synthetic');
  assert.ok(result.channelCompletions.some(channel => channel.natalGate === 13 && channel.transitGate === 33 && channel.type === 'hanging_gate_completion'));
  assert.ok(result.channelCompletions.some(channel => channel.gates.includes(2) && channel.gates.includes(14) && channel.type === 'pure_transit'));
  assert.ok(result.reinforcedGates.some(gate => gate.gate === 1 && gate.transitPlanet === 'moon'));
  assert.equal(result.highlights.sun.completesChannel, true);
  assert.equal(result.highlights.moon.reinforcesNatal, true);
  assert.ok(result.temporarilyDefinedCenters.some(center => center.center === 'sacral'));
  assert.equal(result.stats.totalTransitGates, 5);
  assert.equal(JSON.stringify(natal), before);
});
