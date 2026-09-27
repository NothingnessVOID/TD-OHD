import test from 'node:test';
import assert from 'node:assert/strict';
import { bridgePath, queryTimeline } from '../src/features/transit-timeline/query.js';

const natal = { gates: { all: [47, 64, 3, 60] },
  centers: { definedNames: ['head', 'ajna', 'sacral', 'root'] } };
const interval = (start, end, source = 'transit') => ({ start, end, source });
const row = (kind, id, intervals) => ({ kind, id, key: `${kind}:${id}`, intervals });

test('bridging follows an actual connected channel path between natal islands', () => {
  assert.equal(bridgePath(natal, ['47-64', '3-60', '23-43']), null,
    'one extra channel cannot bridge disconnected natal groups');
  assert.deepEqual(bridgePath(natal, ['47-64', '3-60', '23-43', '20-34']),
    ['23-43', '20-34']);
  assert.equal(bridgePath({ gates: { all: [47, 64] }, centers: { definedNames: ['head', 'ajna'] } },
    ['47-64', '23-43']), null, 'a single natal island has nothing to bridge');
});

test('bridge search begins only when the final connecting channel appears', () => {
  const result = { start: 0, end: 100, rows: [
    row('channel', '47-64', [interval(0, 100, 'natal')]),
    row('channel', '3-60', [interval(0, 100, 'natal')]),
    row('channel', '23-43', [interval(10, 80)]),
    row('channel', '20-34', [interval(20, 50)]),
  ] };
  assert.deepEqual(queryTimeline({ result, natal, condition: 'bridge' }).matches,
    [{ start: 20, end: 50, path: ['23-43', '20-34'] }]);
});

test('condition queries use activation intervals and preserve their evidence', () => {
  const result = { start: 0, end: 100, rows: [
    row('channel', '3-60', [interval(0, 100, 'natal')]),
    row('channel', '20-34', [interval(10, 50, 'completed')]),
    row('center', 'throat', [interval(20, 45)]),
    row('line', '14.2', [interval(30, 40), interval(60, 70, 'both')]),
  ] };
  assert.deepEqual(queryTimeline({ result, natal, condition: 'channel', id: '20-34' }).matches,
    [{ ...interval(10, 50, 'completed'), key: 'channel:20-34', id: '20-34' }]);
  assert.deepEqual(queryTimeline({ result, natal, condition: 'center', id: 'throat' }).matches,
    [{ ...interval(20, 45), key: 'center:throat', id: 'throat' }]);
  assert.deepEqual(queryTimeline({ result, natal, condition: 'line', id: '14.2' }).matches,
    [{ ...interval(30, 40), key: 'line:14.2', id: '14.2' },
      { ...interval(60, 70, 'both'), key: 'line:14.2', id: '14.2' }]);
  assert.deepEqual(queryTimeline({ result, natal, condition: 'bridge' }).matches, []);
  assert.deepEqual(queryTimeline({ result, natal: { gates: { all: [47, 64] }, centers: { definedNames: ['head', 'ajna'] } }, condition: 'bridge' }),
    { reason: 'noSplit', matches: [] });
});
