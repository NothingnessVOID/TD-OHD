import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS } from '../src/lib/human-design/catalog.js';
import { CENTER_SHAPES } from '../src/lib/human-design/bodygraph-geometry.js';
import { channelCircuit } from '../src/lib/circuit-topology.js';
import { circuitCounts, dominantCircuits, gateCount, activationCount, planetRows, centerStateCounts } from '../src/lib/panel-graphics/counts.js';
import { pathBounds } from '../src/lib/panel-graphics/primitives.js';
import { PLANET_ORDER } from '../src/lib/planet-reference.js';

const channel = key => CHANNELS.find(item => item.gates.join('-') === key);

/** A chart object shaped like the adapter output, plus the leftovers it carries. */
function chart(channelKeys = ['1-8', '7-31', '6-59']) {
  const channels = channelKeys.map(channel);
  const gates = [...new Set(channels.flatMap(item => item.gates))];
  // What sharp-contract actually emits: three real groups, an always-zero
  // integration key, and a `dominant` object.
  const circuitAnalysis = {
    individual: { channels: 0, names: [] },
    collective: { channels: 0, names: [] },
    tribal: { channels: 0, names: [] },
    integration: { channels: 0, names: [] },
    dominant: null
  };
  for (const item of channels) circuitAnalysis[channelCircuit(item).group].channels += 1;
  return {
    channels,
    gates: { all: gates, design: {}, personality: {} },
    centers: { definedNames: [], undefinedNames: [], openNames: [] },
    circuitAnalysis
  };
}

test('circuit counts read exactly the three channel-owning groups', () => {
  const counts = circuitCounts(chart(['1-8', '7-31', '6-59', '2-14']));
  assert.deepEqual(counts.map(group => group.key), ['individual', 'collective', 'tribal']);
  assert.deepEqual(counts.map(group => group.count), [2, 1, 1]);
  // The residual integration key and the dominant object must never appear.
  for (const group of counts) assert.ok(!['integration', 'dominant'].includes(group.key));
});

test('a group is compared against channelCircuit, so a total that still adds up cannot hide a mis-key', () => {
  const broken = chart(['1-8', '7-31', '6-59']);
  // Same total as the real chart, wrong bucket: 3 channels, individual 0.
  broken.circuitAnalysis = {
    individual: { channels: 0 }, collective: { channels: 2 }, tribal: { channels: 1 },
    integration: { channels: 0 }, dominant: null
  };
  assert.throws(() => circuitCounts(broken), /Circuit count mismatch for individual/);
});

test('a tie returns every group at the maximum instead of picking by key order', () => {
  const tied = chart(['7-31', '6-59']);
  const dominants = dominantCircuits(tied);
  assert.equal(dominants.length, 2);
  assert.deepEqual(dominants.map(group => group.key).sort(), ['collective', 'tribal']);
  assert.ok(dominants.every(group => group.count === 1));
});

test('no channels is an empty dominant list, not a fabricated one', () => {
  assert.deepEqual(dominantCircuits(chart([])), []);
});

test('gate, activation, row and centre counts come from the data', () => {
  const sample = chart(['1-8']);
  assert.equal(gateCount(sample), new Set([1, 8]).size);
  assert.equal(planetRows(), PLANET_ORDER.length);
  const full = chart(['1-8']);
  for (const side of ['design', 'personality']) {
    full.gates[side] = Object.fromEntries(PLANET_ORDER.map(planet => [planet, { gate: 1, line: 1 }]));
  }
  assert.equal(activationCount(full), PLANET_ORDER.length * 2);
  assert.deepEqual(centerStateCounts({ centers: { definedNames: ['a', 'b'], undefinedNames: ['c'], openNames: [] } }),
    { defined: 2, undefined: 1, open: 0 });
});

test('every centre silhouette yields a finite square bounding box', () => {
  for (const [key, shape] of Object.entries(CENTER_SHAPES)) {
    const box = pathBounds(shape.path);
    assert.ok(Number.isFinite(box.width) && box.width > 0, key);
    assert.ok(Number.isFinite(box.height) && box.height > 0, key);
    // All paths live in the bodygraph's 883 × 1341 frame.
    assert.ok(box.minX > -5 && box.maxX < 890, key);
    assert.ok(box.minY > -5 && box.maxY < 1350, key);
  }
});
