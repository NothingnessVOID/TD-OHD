import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS } from '../src/lib/human-design/catalog.js';
import { analyzeConnectionStructure } from '../src/lib/human-design/connection-structure.js';
import { compareHumanDesign } from '../src/lib/human-design/connection.js';

const chart = gates => ({ gates: { all: gates } });
const names = items => items.map(item => typeof item === 'string' ? item : item.channel);

test('derives channels, centers and created facts from gate topology', () => {
  const result = analyzeConnectionStructure(chart([59]), chart([6]));
  assert.deepEqual(result.composite.channels.map(item => item.channel), ['Intimacy']);
  assert.deepEqual(result.composite.centers, ['sacral', 'solar']);
  assert.equal(result.composite.createdChannelCount, 1);
  assert.equal(result.centerStates.filter(center => center.created).length, 2);
  assert.equal(result.formulas.definedCount, 2);
  assert.equal(result.formulas.undefinedCount, 7);
  assert.equal(result.formulas.expression, '2–7');
  assert.equal(result.formulas.createdCenterCount, 2);
  assert.equal(result.formulas.createdChannels.length, 1);
  assert.equal(result.centerStates.filter(center => center.status === 'open').length, 7);
  assert.equal(result.centerStates.filter(center => center.status === 'undefined').length, 0);
  assert.equal(result.centerStates.length, result.formulas.definedCount + result.formulas.undefinedCount);
  assert.equal(result.formulas.createdCenterCount, result.centerStates.filter(center => center.created).length);
  assert.equal(result.centerStates.filter(center => center.created).every(center => center.channels[0].gates.length === 2), true);
  assert.equal(result.bridging.personA.status, 'not-applicable');
  assert.equal(result.bridging.personB.status, 'not-applicable');
  assert.equal(result.sources.completeChannels, 'CHANNELS');
});

test('A regions can be completely bridged through composite-only channels and centers', () => {
  const result = analyzeConnectionStructure(chart([1, 8, 59, 6]), chart([20, 34]));
  assert.equal(result.bridging.personA.status, 'complete');
  assert.equal(result.bridging.personA.originalRegionCount, 2);
  assert.equal(result.bridging.personA.bridgedRegionCount, 1);
  assert.ok(result.bridging.personA.witnesses.length > 0);
  assert.ok(result.bridging.personA.witnesses[0].channels.some(channel => channel.gateSources && Object.values(channel.gateSources).includes('partner')));
  assert.equal(result.connections.electromagnetic.length, 0);
});

test('electromagnetic completion is independent of an unbridged A topology', () => {
  const result = analyzeConnectionStructure(chart([1, 8, 59, 6, 13]), chart([33]));
  assert.deepEqual(names(result.connections.electromagnetic), ['The Prodigal']);
  assert.equal(result.bridging.personA.status, 'none');
  assert.equal(result.bridging.personA.bridgedRegionCount, 0);
});

test('partially bridges when two of three original regions map together', () => {
  const result = analyzeConnectionStructure(chart([1, 8, 59, 6, 18, 58]), chart([20, 34]));
  assert.equal(result.bridging.personA.status, 'partial');
  assert.equal(result.bridging.personA.originalRegionCount, 3);
  assert.equal(result.bridging.personA.bridgedRegionCount, 1);
  assert.equal(result.bridging.personA.witnesses.length, 1);
});

test('A/B exchange preserves composite topology and swaps directional facts and witness sources', () => {
  const a = chart([1, 8, 59, 6, 18, 58]);
  const b = chart([20, 34]);
  const ab = analyzeConnectionStructure(a, b);
  const ba = analyzeConnectionStructure(b, a);
  assert.deepEqual(ab.composite, ba.composite);
  assert.deepEqual(ab.channelClasses, ba.channelClasses);
  assert.equal(ab.bridging.personA.status, ba.bridging.personB.status);
  assert.equal(ab.bridging.personB.status, ba.bridging.personA.status);
  assert.deepEqual(ab.connections.electromagnetic.map(item => [item.channel, item.gateA, item.gateB]), ba.connections.electromagnetic.map(item => [item.channel, item.gateB, item.gateA]));
  const witnessA = ab.bridging.personA.witnesses.flatMap(witness => witness.channels);
  const witnessB = ba.bridging.personB.witnesses.flatMap(witness => witness.channels);
  assert.deepEqual(witnessA.map(item => item.channel), witnessB.map(item => item.channel));
  for (const channel of witnessA) {
    const reversed = witnessB.find(item => item.channel === channel.channel);
    assert.deepEqual(reversed.gateSources, channel.gateSources);
  }
});

test('A can be fully bridged while the composite remains split', () => {
  const result = analyzeConnectionStructure(chart([1, 8, 59, 6]), chart([20, 34, 18, 58]));
  assert.equal(result.individuals.personA.components.length, 2);
  assert.equal(result.bridging.personA.status, 'complete');
  assert.equal(result.composite.components.length, 2);
});

test('four channel classes partition all channels and reverse directional ownership', () => {
  const a = chart([1, 8, 59, 6, 13, 33, 20]);
  const b = chart([1, 8, 59, 10, 34, 20, 13]);
  const ab = analyzeConnectionStructure(a, b);
  const ba = analyzeConnectionStructure(b, a);
  assert.deepEqual(Object.keys(ab.connections), ['electromagnetic', 'companionship', 'compromise', 'dominance']);
  assert.equal(ab.summary.total, Object.values(ab.connections).flat().length);
  assert.ok(ab.summary.total <= CHANNELS.length);
  assert.deepEqual(names(ab.connections.companionship), names(ba.connections.companionship));
  assert.deepEqual(names(ab.connections.electromagnetic), names(ba.connections.electromagnetic));
  assert.deepEqual(ab.connections.dominance.map(item => [item.channel, item.dominant]), ba.connections.dominance.map(item => [item.channel, item.dominant]).map(([name, who]) => [name, who === 'A' ? 'B' : 'A']));
  assert.deepEqual(ab.connections.compromise.map(item => [item.channel, item.dominant]), ba.connections.compromise.map(item => [item.channel, item.dominant]).map(([name, who]) => [name, who === 'A' ? 'B' : 'A']));
});

test('stable channel ordering and named stats match derived facts', () => {
  const gates = [59, 6, 1, 8, 20, 34];
  const result = compareHumanDesign(chart(gates), chart([]));
  assert.deepEqual(result.structure.composite.channels.map(item => item.channel), CHANNELS.filter(channel => channel.gates.every(gate => gates.includes(gate))).map(channel => channel.name));
  assert.equal(result.stats.createdChannelCount, result.structure.composite.createdChannelCount);
  assert.equal(result.stats.electromagneticCount, result.electromagneticPairs.length);
  assert.equal(result.stats.createdCenterCount, result.structure.formulas.createdCenterCount);
  assert.equal(result.stats.definedCenterCount, result.structure.formulas.definedCount);
  assert.equal(result.stats.undefinedCenterCount, result.structure.formulas.undefinedCount);
  assert.equal(result.connectionChart.compositeType, 'Manifesting Generator');
  assert.equal(result.individuals.personA.type, null);
  assert.equal('profileHarmony' in result, false);
  assert.equal('description' in result.authorityDynamic, false);
});

test('topology ignores inconsistent derived channels and centers and accepts deeply frozen inputs', () => {
  const a = deepFreeze({ gates: { all: [1, 8] }, channels: [], centers: { definedNames: [] } });
  const b = deepFreeze({ gates: { all: [20] }, channels: [{ name: 'Intimacy' }], centers: { definedNames: ['sacral'] } });
  const result = analyzeConnectionStructure(a, b);
  assert.deepEqual(result.individuals.personA.channels, ['Inspiration']);
  assert.equal(result.composite.channels.some(channel => channel.channel === 'Inspiration'), true);
  assert.equal(result.composite.channels.some(channel => channel.channel === 'Intimacy'), false);
  assert.equal(result.centerStates.find(center => center.center === 'g').personA, 'defined');
  assert.equal(result.centerStates.find(center => center.center === 'throat').personB, 'undefined');
  assert.equal(result.centerStates.find(center => center.center === 'sacral').personB, 'open');
});

test('witness paths cross a center created by the composite', () => {
  const result = analyzeConnectionStructure(chart([1, 8, 18, 58, 2, 50]), chart([14, 27]));
  const witness = result.bridging.personA.witnesses[0];
  const created = new Set(result.centerStates.filter(center => center.created).map(center => center.center));
  assert.ok(witness.centers.some(center => created.has(center)));
});

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
