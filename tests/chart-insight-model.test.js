/**
 * Chart insight model — minimal real fixture checks.
 *
 * These assert the derivations the dashboard depends on, using one synthetic
 * chart object shaped exactly like the Sharp adapter output. No birth records,
 * no browser, no knowledge prose.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInsightModel, channelCandidates, canonicalChannel, gateMap, centerBreakdown
} from '../src/features/chart-insight/model.js';

const PLANETS = ['sun', 'earth', 'northNode', 'southNode', 'moon', 'mercury',
  'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

/** Build a per-side activation record from a compact { planet: gate } map. */
function side(entries) {
  const record = {};
  for (const planet of PLANETS) {
    const gate = entries[planet];
    record[planet] = gate ? { gate, line: 1, color: 1, tone: 1, base: 1 } : { gate: 0, line: 0 };
  }
  return record;
}

/** A chart with 10-34 and 20-57 complete, plus a hanging gate and shared gates. */
function fixture() {
  const design = side({ sun: 34, earth: 20, moon: 57, northNode: 10, southNode: 1, mercury: 1, venus: 34 });
  const personality = side({ sun: 10, earth: 57, moon: 20, northNode: 34, southNode: 2, mercury: 10, venus: 1 });
  const channels = [
    { gates: [10, 34] },
    { gates: [20, 57] }
  ];
  const gatesAll = [...new Set([...Object.values(design), ...Object.values(personality)]
    .map(item => item.gate).filter(Boolean))];
  return {
    gates: { design, personality, all: gatesAll },
    channels,
    centers: {
      defined: [{ key: 'g' }, { key: 'sacral' }],
      undefined: [{ key: 'throat' }],
      open: [{ key: 'head' }, { key: 'ajna' }, { key: 'heart' }, { key: 'spleen' }, { key: 'solar' }, { key: 'root' }],
      definedNames: ['g', 'sacral'],
      undefinedNames: ['throat'],
      openNames: ['head', 'ajna', 'heart', 'spleen', 'solar', 'root']
    },
    type: { id: 'generator', name: 'Generator' },
    authority: { id: 'sacral', name: 'Sacral Authority' },
    profile: { id: '1/3', numbers: '1/3' },
    definition: 'Single Definition',
    incarnationCross: {
      rawId: 'RightAngleCrossOfTension4', angle: 'right', angleName: 'Right Angle',
      name: 'Tension 4', fullName: 'Right Angle Cross of Tension 4 (38/39 | 48/21)',
      gates: [38, 39, 48, 21], gateNames: ['The Fighter', 'Provocation', 'Depth', 'The Hunter']
    },
    variable: {
      notation: 'PRLD',
      determination: { name: 'Sound', direction: 'right', color: 5, tone: 4, base: 2, valueId: 'sound' },
      environment: { name: 'Caves', direction: 'right', color: 1, tone: 5, base: 3, valueId: 'caves' },
      motivation: { name: 'Need', direction: 'right', color: 4, tone: 5, base: 3, valueId: 'need' },
      perspective: { name: 'Probability', direction: 'left', color: 5, tone: 1, base: 5, valueId: 'probability' }
    },
    positions: { design: { date: '1959-10-05' }, personality: { date: '1960-01-01' } }
  };
}

test('canonical channel classification comes from circuit-topology corrections', () => {
  assert.equal(canonicalChannel('10-34').subcircuit, 'centering');
  assert.equal(canonicalChannel('10-34').group, 'individual');
  assert.equal(canonicalChannel('20-57').subcircuit, 'knowing');
  assert.equal(canonicalChannel('20-57').group, 'individual');
  // Uncorrected channels still classify through the same single source.
  assert.equal(canonicalChannel('1-8').subcircuit, 'knowing');
  assert.equal(canonicalChannel('99-100'), null);
});

test('a gate activated by several planets is one map entry, both sides kept apart', () => {
  const cells = gateMap(fixture());
  assert.equal(cells.length, 64);
  const gate34 = cells.find(cell => cell.gate === 34);
  assert.equal(gate34.source, 'both');
  assert.equal(gate34.design, true);
  assert.equal(gate34.personality, true);
  const gate20 = cells.find(cell => cell.gate === 20);
  assert.equal(gate20.source, 'both');
  const gate57 = cells.find(cell => cell.gate === 57);
  assert.equal(gate57.source, 'both');
  // Gate 2 exists only on the personality side.
  assert.equal(cells.find(cell => cell.gate === 2).source, 'personality');
  // A gate no activation touches stays inactive.
  assert.equal(cells.find(cell => cell.gate === 55).source, 'inactive');
});

test('design and personality halves complete a channel together', () => {
  const candidates = channelCandidates(fixture());
  assert.equal(candidates.length, 36);
  const byKey = key => candidates.find(channel => channel.key === key);
  // 10 is design+personality, 34 is design+personality: complete.
  assert.equal(byKey('10-34').status, 'complete');
  assert.equal(byKey('20-57').status, 'complete');
  // 1 is active but 8 is not: single-ended, and not listed by the engine.
  assert.equal(byKey('1-8').status, 'single');
  assert.equal(byKey('1-8').activeGates, 1);
  // Neither end active.
  assert.equal(byKey('3-60').status, 'inactive');
  assert.equal(byKey('3-60').activeGates, 0);
  assert.equal(candidates.filter(channel => channel.complete).length, 2);
  assert.equal(candidates.filter(channel => channel.status === 'single').length, 2);
});

test('a chart with no channels still reports all nine centers', () => {
  const chart = fixture();
  chart.channels = [];
  chart.gates.all = [38];
  chart.centers = {
    defined: [],
    undefined: [],
    open: ['head', 'ajna', 'throat', 'g', 'heart', 'spleen', 'solar', 'sacral', 'root'].map(key => ({ key })),
    definedNames: [], undefinedNames: [],
    openNames: ['head', 'ajna', 'throat', 'g', 'heart', 'spleen', 'solar', 'sacral', 'root']
  };
  const centers = centerBreakdown(chart);
  assert.equal(centers.total, 9);
  assert.equal(centers.centers.length, 9);
  assert.equal(centers.definedCount, 0);
  assert.equal(centers.openCount, 9);
  const candidates = channelCandidates(chart);
  assert.equal(candidates.filter(channel => channel.complete).length, 0);
});

test('overview totals separate design, personality and both-side gates', () => {
  const model = buildInsightModel(fixture());
  const { totals } = model;
  assert.equal(totals.activeGates, totals.designGates + totals.personalityGates + totals.bothGates);
  assert.equal(totals.bothGates, 5); // 34, 20, 57, 10, 1
  assert.equal(totals.personalityGates, 1); // gate 2 only
  assert.equal(totals.designGates, 0);
  assert.equal(totals.completeChannels, 2);
  assert.equal(totals.definedCenters, 2);
  // Planet counts are real activation counts, never a 26/26 score.
  assert.equal(model.planets.designCount, 7);
  assert.equal(model.planets.personalityCount, 7);
  assert.equal(model.planets.totalPlanets, 13);
});

test('variable keeps each arrow direction with its own side', () => {
  const { variable } = buildInsightModel(fixture());
  assert.equal(variable.arrows.length, 4);
  assert.deepEqual(variable.arrows.map(arrow => [arrow.kind, arrow.side, arrow.direction]), [
    ['determination', 'design', 'right'],
    ['environment', 'design', 'right'],
    ['motivation', 'personality', 'right'],
    ['perspective', 'personality', 'left']
  ]);
});

test('cross carries its four gates and passes gene keys through untouched', () => {
  const geneKeys = {
    activationSequence: {
      lifeWork: { key: 38, line: 1, keyLine: '38.1', shadow: 'Struggle', gift: 'Perseverance', siddhi: 'Honour' },
      evolution: { key: 39, line: 1, keyLine: '39.1', shadow: 'Provocation', gift: 'Dynamism', siddhi: 'Liberation' },
      radiance: { key: 48, line: 3, keyLine: '48.3', shadow: 'Inadequacy', gift: 'Resourcefulness', siddhi: 'Wisdom' },
      purpose: { key: 21, line: 3, keyLine: '21.3', shadow: 'Control', gift: 'Authority', siddhi: 'Valour' }
    }
  };
  const model = buildInsightModel(fixture(), { geneKeys });
  assert.deepEqual(model.cross.gates, [38, 39, 48, 21]);
  assert.equal(model.cross.quarterGate, 10); // Personality Sun
  assert.equal(model.cross.geneKeys.lifeWork.keyLine, '38.1');
  // Without gene keys the field is null, never invented.
  assert.equal(buildInsightModel(fixture()).cross.geneKeys, null);
});
