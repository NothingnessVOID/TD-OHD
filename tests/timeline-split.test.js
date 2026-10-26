import test from 'node:test';
import assert from 'node:assert/strict';
import { splitState } from '../src/features/transit-timeline/bridge.js';
import { stateAt } from '../src/features/transit-timeline/graph-provider.js';

// Two disjoint two-center channels plus a path that would join them.
const channels = [
  { gates: [1, 2], centers: ['a', 'b'] },
  { gates: [3, 4], centers: ['c', 'd'] },
  { gates: [2, 5], centers: ['b', 'e'] },
  { gates: [5, 3], centers: ['e', 'c'] },
  { gates: [6, 7], centers: ['a', 'b'] },
  { gates: [8, 9], centers: ['f', 'g'] },
];
const natal = gates => ({ gates: { all: gates }, centers: { definedNames: [] } });
const combined = (birth, extra) => new Set([...birth.gates.all, ...extra]);
const oneIsland = natal([1, 2]);

test('a hanging gate alone is not a split', () => {
  const result = splitState(oneIsland, combined(oneIsland, [3]), channels);
  assert.equal(result.applicable, true);
  assert.equal(result.split, false);
  assert.deepEqual(result.newIslands, []);
});

test('a detached complete channel is a split and never touches the natal island', () => {
  const result = splitState(oneIsland, combined(oneIsland, [3, 4]), channels);
  assert.equal(result.split, true);
  assert.deepEqual(result.newIslands, [['c', 'd']]);
  assert.deepEqual(result.natalCenters, ['a', 'b']);
  // The natal chart is unchanged: only the overlay gains an island.
  assert.deepEqual(oneIsland.gates.all, [1, 2]);
});

test('a channel that attaches to the natal island is not a split', () => {
  const result = splitState(oneIsland, combined(oneIsland, [2, 5]), channels);
  assert.equal(result.split, false);
  assert.deepEqual(result.newIslands, []);
});

test('two new detached islands are both reported', () => {
  const result = splitState(oneIsland, new Set([1, 2, 3, 4, 8, 9]), channels);
  assert.equal(result.split, true);
  assert.deepEqual(result.newIslands, [['c', 'd'], ['f', 'g']]);
});

test('multi-island natal charts keep the bridge semantics and are not split', () => {
  const twoIslands = natal([1, 2, 3, 4]);
  const result = splitState(twoIslands, combined(twoIslands, [3, 4]), channels);
  assert.equal(result.applicable, false);
  assert.equal(result.split, false);
  assert.deepEqual(result.newIslands, []);
});

test('no natal definition has no split row', () => {
  const empty = natal([]);
  const result = splitState(empty, new Set([3, 4]), channels);
  assert.equal(result.applicable, false);
  assert.equal(result.split, false);
});

test('stateAt emits the split row for a one-island chart only', () => {
  // Real catalog gates: 10-34 defines G + Sacral, one island.
  const birth = { gates: { all: [10, 34] }, centers: { definedNames: ['g', 'sacral'] } };
  const detached = { sun: { gate: 17, line: 1 }, earth: { gate: 62, line: 1 } };
  assert.equal(stateAt(birth, detached, 'overlay').get('bridge:natal'), JSON.stringify([['ajna', 'throat']]));

  const hanging = { sun: { gate: 17, line: 1 } };
  assert.equal(stateAt(birth, hanging, 'overlay').get('bridge:natal'), undefined);

  const attached = { sun: { gate: 57, line: 1 }, earth: { gate: 20, line: 1 } };
  assert.equal(stateAt(birth, attached, 'overlay').get('bridge:natal'), undefined);
});

test('a two-island chart still reports bridging groups, not split islands', () => {
  // 10-34 (G, Sacral) and 57-20 (Spleen, Throat) are two fixed islands.
  const birth = { gates: { all: [10, 34, 57, 20] }, centers: { definedNames: ['g', 'sacral', 'spleen', 'throat'] } };
  const joined = { sun: { gate: 20, line: 1 }, earth: { gate: 10, line: 1 }, moon: { gate: 34, line: 1 } };
  const row = stateAt(birth, joined, 'overlay').get('bridge:natal');
  assert.ok(row === undefined || row.startsWith('[['), 'bridge row keeps natal island numbers');
});
