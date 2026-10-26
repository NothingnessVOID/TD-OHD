import test from 'node:test';
import assert from 'node:assert/strict';
import { MINUTE, calculateTimeline } from '../src/features/transit-timeline/core.js';
import { stateAt, catalog } from '../src/features/transit-timeline/graph-provider.js';

// One natal island: 10-34 defines G + Sacral. Sun and Earth complete 17-62
// (Ajna + Throat) while both gates are present; 57-20 would attach to the natal
// island through Throat instead, so it never counts as a new island here.
const birth = { gates: { all: [10, 34] }, centers: { definedNames: ['g', 'sacral'] } };
const rows = catalog();
const splitRow = result => result.rows.find(row => row.key === 'bridge:natal');
const spans = result => (splitRow(result)?.intervals || []).map(i => [i.start, i.end, i.source]);

function timeline(snapshots) {
  const times = Object.keys(snapshots).map(Number).sort((a, b) => a - b);
  return calculateTimeline({
    start: times[0], end: times.at(-1),
    snapshot: time => snapshots[times.filter(t => t <= time).at(-1)],
    states: activations => stateAt(birth, activations, 'overlay'),
    catalog: rows, scanStep: MINUTE, tolerance: 1000,
  });
}

const idle = { sun: { gate: 1, line: 1 }, earth: { gate: 2, line: 1 } };
const detached = { sun: { gate: 17, line: 1 }, earth: { gate: 62, line: 1 } };
const attached = { sun: { gate: 57, line: 1 }, earth: { gate: 20, line: 1 } };

test('a new detached island opens and closes an exact split interval', () => {
  const result = timeline({ 0: idle, 60_000: detached, 120_000: idle });
  assert.deepEqual(spans(result), [[60_000, 120_000, JSON.stringify([['ajna', 'throat']])]]);
});

test('no new island means no split interval at all', () => {
  const result = timeline({ 0: idle, 60_000: { ...idle, moon: { gate: 17, line: 1 } } });
  assert.deepEqual(spans(result), []);
});

test('a new island that later attaches to the natal island ends the split', () => {
  const result = timeline({ 0: idle, 60_000: detached, 120_000: attached });
  assert.deepEqual(spans(result).map(([start, end]) => [start, end]), [[60_000, 120_000]]);
});

test('two simultaneous new islands report both and stay one interval', () => {
  const both = { sun: { gate: 17, line: 1 }, earth: { gate: 62, line: 1 },
    moon: { gate: 19, line: 1 }, mars: { gate: 49, line: 1 } };
  const result = timeline({ 0: idle, 60_000: both, 120_000: idle });
  assert.deepEqual(spans(result), [[60_000, 120_000, JSON.stringify([['ajna', 'throat'], ['root', 'solar']])]]);
});

test('a split already active at the window start is clipped, not invented', () => {
  const result = timeline({ 0: detached, 60_000: idle });
  assert.deepEqual(spans(result), [[0, 60_000, JSON.stringify([['ajna', 'throat']])]]);
  assert.equal(splitRow(result).intervals[0].clippedStart, true);
});

test('a two-island chart keeps bridge groups instead of split center lists', () => {
  const twoIslands = { gates: { all: [10, 34, 57, 20] }, centers: { definedNames: ['g', 'sacral', 'spleen', 'throat'] } };
  const result = calculateTimeline({
    start: 0, end: 2 * MINUTE,
    snapshot: time => time < 60_000 ? idle : { sun: { gate: 20, line: 1 }, earth: { gate: 57, line: 1 } },
    states: activations => stateAt(twoIslands, activations, 'overlay'),
    catalog: rows, scanStep: MINUTE, tolerance: 1000,
  });
  const row = splitRow(result);
  assert.ok(row, 'bridge row exists');
  for (const interval of row.intervals) {
    for (const group of JSON.parse(interval.source)) {
      assert.equal(typeof group[0], 'number', 'bridge groups hold natal island numbers');
    }
  }
});
