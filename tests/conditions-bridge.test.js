import test from 'node:test';
import assert from 'node:assert/strict';
import { natalIslands, bridgeState } from '../src/features/transit-timeline/bridge.js';
import { queryTimeline } from '../src/features/transit-timeline/conditions.js';

const channels = [
  { gates: [1, 2], centers: ['a', 'b'] },
  { gates: [3, 4], centers: ['c', 'd'] },
  { gates: [5, 6], centers: ['e', 'f'] },
  { gates: [7, 8], centers: ['g', 'h'] },
  { gates: [2, 9], centers: ['b', 'x'] },
  { gates: [9, 3], centers: ['x', 'c'] },
  { gates: [4, 12], centers: ['d', 'y'] },
  { gates: [12, 5], centers: ['y', 'e'] },
  { gates: [6, 13], centers: ['f', 'z'] },
  { gates: [13, 7], centers: ['z', 'g'] },
  { gates: [10, 11], centers: ['q', 'r'] }
];
const natal = gates => ({ gates: { all: gates }, centers: { definedNames: [] } });

test('two, three and four fixed natal islands bridge through new intermediate centers', () => {
  const two = natal([1,2,3,4]);
  const three = natal([1,2,3,4,5,6]);
  const four = natal([1,2,3,4,5,6,7,8]);
  assert.equal(natalIslands(two, channels).length, 2);
  assert.equal(natalIslands(three, channels).length, 3);
  assert.equal(natalIslands(four, channels).length, 4);
  assert.deepEqual(bridgeState(two, [...two.gates.all, 9], channels).connected, [[1,2]]);
  assert.deepEqual(bridgeState(three, [...three.gates.all, 9], channels).connected, [[1,2]]);
  assert.deepEqual(bridgeState(three, [...three.gates.all, 9], channels).complete, false);
  assert.deepEqual(bridgeState(three, [...three.gates.all, 9, 12], channels).connected, [[1,2,3]]);
  assert.equal(bridgeState(three, [...three.gates.all, 9, 12], channels).complete, true);
  assert.deepEqual(bridgeState(three, [...three.gates.all, 9, 10, 11], channels).connected, [[1,2]]);
  assert.equal(bridgeState(three, [...three.gates.all, 9], channels).islands.length, 3);
  assert.equal(bridgeState(four, [...four.gates.all, 9], channels).islands.length, 4);
  assert.deepEqual(bridgeState(four, [...four.gates.all, 9, 12, 13], channels).connected, [[1,2,3,4]]);
  assert.equal(bridgeState(natal([1,2]), [1,2,3,4,9], channels).applicable, false);
});

test('condition rows combine any selections and all/any across rows with complements', () => {
  const result = { start: 0, end: 40, rows: [
    { key: 'gate:14', intervals: [{ start: 0, end: 20, source: 'natal' }] },
    { key: 'gate:29', intervals: [{ start: 10, end: 30, source: 'transit' }] },
    { key: 'gate:30', intervals: [] },
    { key: 'channel:3-60', intervals: [{ start: 10, end: 20, source: 'transit' }] },
    { key: 'bridge:natal', intervals: [{ start: 15, end: 25, source: '[[1,2]]' },
      { start: 25, end: 35, source: '[[1,2,3]]' }] }
  ] };
  const gate14 = { kind: 'gate', ids: [14], state: 'active' };
  const gate29 = { kind: 'gate', ids: [29], state: 'active' };
  assert.deepEqual(queryTimeline(result, [gate14, gate29]).intervals.map(i => [i.start,i.end]), [[10,20]]);
  assert.deepEqual(queryTimeline(result, [gate14, gate29], { combine: 'any' }).intervals.map(i => [i.start,i.end]), [[0,30]]);
  assert.deepEqual(queryTimeline(result, [{ kind: 'gate', ids: [14, 29], state: 'inactive' }]).intervals.map(i => [i.start,i.end]),
    [[0,10],[20,40]], 'one inactive target is enough even while the other target is active');
  assert.deepEqual(queryTimeline(result, [{ kind: 'gate', ids: [30], state: 'inactive' }]).intervals.map(i => [i.start,i.end]), [[0,40]]);
  assert.deepEqual(queryTimeline(result, [{ kind: 'channel', ids: ['60-3'], state: 'active' }]).intervals.map(i => [i.start,i.end]), [[10,20]]);
  assert.deepEqual(queryTimeline(result, [{ kind: 'bridge', state: 'active' }], { natalIslandCount: 3 }).intervals.map(i => [i.start,i.end]), [[15,25],[25,35]]);
  assert.deepEqual(queryTimeline(result, [{ kind: 'bridge', state: 'inactive' }], { natalIslandCount: 3 }).intervals.map(i => [i.start,i.end]), [[0,15],[35,40]]);
  assert.throws(() => queryTimeline(result, [{ kind: 'bridge', state: 'active' }], { natalIslandCount: 3, mode: 'transit-only' }));
  assert.throws(() => queryTimeline(result, []));
  assert.throws(() => queryTimeline(result, [{ kind: 'gate', ids: [999], state: 'active' }]));
  assert.throws(() => queryTimeline(null, [gate14]), /unavailable/);
  const noMatch = queryTimeline(result, [gate14, { kind: 'gate', ids: [30], state: 'active' }]);
  assert.equal(noMatch.empty, true);
  assert.deepEqual(noMatch.intervals, []);
});

test('parallel connecting paths keep a single complete fixed-island group', () => {
  const parallel = [...channels,
    { gates: [2, 14], centers: ['b', 'w'] },
    { gates: [14, 3], centers: ['w', 'c'] }];
  const two = natal([1, 2, 3, 4]);
  assert.equal(natalIslands(two, parallel).length, 2);
  assert.deepEqual(bridgeState(two, [1, 2, 3, 4, 9, 14], parallel).connected, [[1, 2]]);
  assert.equal(bridgeState(two, [1, 2, 3, 4, 9, 14], parallel).complete, true);
});
