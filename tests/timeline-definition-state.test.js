import test from 'node:test';
import assert from 'node:assert/strict';
import { definitionState, natalIslands } from '../src/features/transit-timeline/bridge.js';
import { stateAt, catalog, DEFINITION_STATE_VERSION } from '../src/features/transit-timeline/graph-provider.js';
import { queryTimeline } from '../src/features/transit-timeline/conditions.js';
import { MINUTE, calculateTimeline } from '../src/features/transit-timeline/core.js';
import { timelineFromAnnual } from '../src/features/transit-timeline/annual-timeline.js';
import { TRANSIT_POINTS } from '../src/features/transit-timeline/annual-events.js';
import { createTimelineClient } from '../src/features/transit-timeline/client.js';
import { definitionChanged, definitionBarMarkup, DEFINITION_TICK_PX } from '../src/features/transit-timeline/definition-bars.js';

// Synthetic graph: a-b, c-d, e-f, g-h are four islands; x, y, z bridge them.
const channels = [
  { gates: [1, 2], centers: ['a', 'b'] }, { gates: [3, 4], centers: ['c', 'd'] },
  { gates: [5, 6], centers: ['e', 'f'] }, { gates: [7, 8], centers: ['g', 'h'] },
  { gates: [2, 9], centers: ['b', 'x'] }, { gates: [9, 3], centers: ['x', 'c'] },
  { gates: [4, 12], centers: ['d', 'y'] }, { gates: [12, 5], centers: ['y', 'e'] },
  { gates: [10, 11], centers: ['q', 'r'] }
];
const natal = gates => ({ gates: { all: gates }, centers: { definedNames: [] } });
const count = (birth, extra) => definitionState(birth, extra, channels).count;

test('two → one and two → three', () => {
  const two = natal([1, 2, 3, 4]);
  assert.equal(count(two, []), 2);
  assert.equal(count(two, [9]), 1, 'bridge through x merges both islands');
  assert.equal(count(two, [10, 11]), 3, 'detached complete channel adds an island');
});

test('three → two and three → four', () => {
  const three = natal([1, 2, 3, 4, 5, 6]);
  assert.equal(count(three, []), 3);
  assert.equal(count(three, [9]), 2);
  assert.equal(count(three, [10, 11]), 4);
  // Merge and new island at once keep the final count: 3 - 1 + 1.
  assert.equal(count(three, [9, 10, 11]), 3);
  assert.equal(definitionState(three, [9, 10, 11], channels).changed.length, 2,
    'same count, different topology: changed components remain available');
});

test('one → two through a free island; hanging gates never form an island', () => {
  const one = natal([1, 2]);
  assert.equal(count(one, [3]), 1, 'hanging gate');
  assert.equal(count(one, [3, 4]), 2);
  assert.equal(count(one, [9, 3, 4]), 1, 'attached through bridge');
});

test('no definition: zero islands and transit-only definitions', () => {
  const empty = natal([]);
  assert.equal(count(empty, []), 0);
  assert.equal(count(empty, [1]), 0);
  assert.equal(count(empty, [1, 2]), 1);
  assert.equal(natalIslands(empty, channels).length, 0);
});

test('stateAt emits the final state with real catalog and honours the planet filter', () => {
  // 1-8 (G, Throat) and 59-6 (Sacral, Solar Plexus): two islands.
  const birth = { gates: { all: [1, 8, 59, 6] }, centers: { definedNames: [] } };
  assert.equal(stateAt(birth, {}, 'overlay').get('definition:state'), '2');
  // 17-62 adds Ajna to the Throat island: still two.
  const sky = { sun: { gate: 17, line: 1 }, earth: { gate: 62, line: 1 } };
  assert.equal(stateAt(birth, sky, 'overlay').get('definition:state'), '2');
  // 34-20 (Sacral, Throat) joins both natal islands: two → one.
  const joined = { sun: { gate: 34, line: 1 }, earth: { gate: 20, line: 1 } };
  assert.equal(stateAt(birth, joined, 'overlay').get('definition:state'), '1');
  assert.equal(stateAt(birth, joined, 'overlay').get('bridge:natal'), '[[1,2]]', 'bridge detail contract retained');
  // 58-18 (Root, Spleen) is a free island: two → three, without any bridge.
  const free = { sun: { gate: 58, line: 1 }, earth: { gate: 18, line: 1 } };
  assert.equal(stateAt(birth, free, 'overlay').get('definition:state'), '3');
  assert.equal(stateAt(birth, free, 'overlay').get('bridge:natal'), undefined);
  const one = { gates: { all: [10, 34] }, centers: { definedNames: [] } };
  const detached = { sun: { gate: 17, line: 1 }, earth: { gate: 62, line: 1 } };
  assert.equal(stateAt(one, detached, 'overlay').get('definition:state'), '2');
  assert.equal(stateAt(one, detached, 'overlay', 'sun').get('definition:state'), '1',
    'one planet cannot complete a channel alone');
  assert.equal(stateAt(one, detached, 'transit-only').get('definition:state'), '2',
    'definition describes birth + transits in both display modes');
  assert.equal(stateAt({ gates: { all: [] }, centers: { definedNames: [] } }, {}, 'overlay').get('definition:state'), undefined,
    'zero definition has no state interval');
  assert.ok(catalog().some(row => row.key === 'definition:state' && row.kind === 'definition'));
  assert.ok(catalog().some(row => row.key === 'bridge:natal'), 'bridge row contract retained');
});

const result = { start: 0, end: 100, rows: [
  { key: 'definition:state', intervals: [{ start: 0, end: 20, source: '2' }, { start: 20, end: 40, source: '1' },
    { start: 40, end: 70, source: '2' }, { start: 70, end: 100, source: '3' }] },
  { key: 'gate:14', intervals: [{ start: 10, end: 50, source: 'transit' }] },
  { key: 'channel:3-60', intervals: [{ start: 60, end: 80, source: 'transit' }] },
  { key: 'center:g', intervals: [{ start: 0, end: 100, source: 'natal' }] },
  { key: 'line:14.2', intervals: [{ start: 30, end: 35, source: 'transit' }] }
] };
const spans = value => value.intervals.map(i => [i.start, i.end]);
const definition = (id, state = 'active') => ({ kind: 'definition', ids: [id], state });

test('definition query covers the natal-equal state and AND/OR with every kind', () => {
  assert.deepEqual(spans(queryTimeline(result, [definition('2')])), [[0, 20], [40, 70]],
    'natal-equal state is queryable even though it draws no bar');
  assert.deepEqual(spans(queryTimeline(result, [definition('2', 'inactive')])), [[20, 40], [70, 100]]);
  assert.deepEqual(spans(queryTimeline(result, [definition('4')])), []);
  assert.deepEqual(spans(queryTimeline(result, [definition('1'), { kind: 'gate', ids: [14], state: 'active' }])), [[20, 40]]);
  assert.deepEqual(spans(queryTimeline(result, [definition('3'), { kind: 'channel', ids: ['60-3'], state: 'active' }])), [[70, 80]]);
  assert.deepEqual(spans(queryTimeline(result, [definition('1'), { kind: 'line', ids: ['14.2'], state: 'active' }])), [[30, 35]]);
  assert.deepEqual(spans(queryTimeline(result, [definition('1'), { kind: 'center', ids: ['g'], state: 'active' }])), [[20, 40]]);
  assert.deepEqual(spans(queryTimeline(result, [definition('1'), definition('3')], { combine: 'any' })), [[20, 40], [70, 100]]);
  assert.deepEqual(spans(queryTimeline(result, [definition('1'), { kind: 'channel', ids: ['3-60'], state: 'active' }], { combine: 'any' })),
    [[20, 40], [60, 80]]);
  assert.throws(() => queryTimeline(result, [definition('5')]), /Invalid condition/);
  assert.throws(() => queryTimeline(result, [{ kind: 'definition', ids: ['1', '2'], state: 'active' }]), /Invalid condition/);
  const legacy = { start: 0, end: 10, rows: [{ key: 'gate:14', intervals: [] }] };
  assert.throws(() => queryTimeline(legacy, [definition('1')]), /recalculate/, 'old results without the row are rejected');
});

test('query and track share one calculation: intervals equal the row intervals', () => {
  const birth = { gates: { all: [10, 34] }, centers: { definedNames: [] } };
  const idle = { sun: { gate: 1, line: 1 }, earth: { gate: 2, line: 1 } };
  const detached = { sun: { gate: 17, line: 1 }, earth: { gate: 62, line: 1 } };
  const snaps = { 0: idle, 60_000: detached, 120_000: idle, 180_000: idle };
  const times = Object.keys(snaps).map(Number);
  const calculated = calculateTimeline({ start: 0, end: 180_000,
    snapshot: time => snaps[times.filter(t => t <= time).at(-1)],
    states: activations => stateAt(birth, activations, 'overlay'), catalog: catalog(), scanStep: MINUTE, tolerance: 1000 });
  const row = calculated.rows.find(item => item.key === 'definition:state');
  assert.deepEqual(row.intervals.map(i => [i.start, i.end, i.source]), [[0, 60_000, '1'], [60_000, 120_000, '2'], [120_000, 180_000, '1']]);
  assert.deepEqual(spans(queryTimeline(calculated, [definition('2')])), [[60_000, 120_000]]);
  assert.deepEqual(spans(queryTimeline(calculated, [definition('1')])), [[0, 60_000], [120_000, 180_000]]);
  assert.equal(definitionChanged(row.intervals[0], 1), false, 'natal-equal interval draws no bar');
  assert.equal(definitionChanged(row.intervals[1], 1), true);
});

test('annual replay derives definition rows from the unchanged annual format', () => {
  const birth = { gates: { all: [10, 34] }, centers: { definedNames: [] } };
  const start = Date.UTC(2026, 0, 1);
  const initial = Object.fromEntries(TRANSIT_POINTS.map(point => [point, [1, 1]]));
  const index = point => TRANSIT_POINTS.indexOf(point);
  const data = { format: 1, year: 2026, start, end: Date.UTC(2027, 0, 1), initial, events: [
    [start + 60_000, index('sun'), 1, 1, 17, 1], [start + 60_000, index('earth'), 1, 1, 62, 1],
    [start + 120_000, index('sun'), 17, 1, 1, 1]] };
  const out = timelineFromAnnual({ start, end: start + 180_000, natal: birth, mode: 'overlay', years: [data], catalog: catalog(),
    stateAt: (n, a, m) => stateAt(n, a, m, 'all') });
  assert.deepEqual(out.rows.find(row => row.key === 'definition:state').intervals.map(i => [i.start - start, i.end - start, i.source]),
    [[0, 60_000, '1'], [60_000, 120_000, '2'], [120_000, 180_000, '1']]);
  const sunOnly = timelineFromAnnual({ start, end: start + 180_000, natal: birth, mode: 'overlay', years: [data], catalog: catalog(),
    stateAt: (n, a, m) => stateAt(n, a, m, 'sun') });
  assert.deepEqual(sunOnly.rows.find(row => row.key === 'definition:state').intervals.map(i => i.source), ['1'],
    'planet filter applies to annual replay');
});

test('derived-result cache key is versioned so pre-feature results are not reused', async () => {
  assert.ok(Number.isInteger(DEFINITION_STATE_VERSION) && DEFINITION_STATE_VERSION >= 1);
  const posted = [];
  const workerFactory = () => {
    const worker = { terminate() {}, postMessage(message) {
      posted.push(message);
      queueMicrotask(() => worker.onmessage({ data: { type: 'result', result: { start: message.start, end: message.end, rows: [] } } }));
    } };
    return worker;
  };
  const client = createTimelineClient({ workerFactory,
    annualLoader: { loadRange: async (start, end) => [{ start, end, data: { unavailable: 'x' } }], clear() {}, cachedYears: () => [] } });
  const request = { start: 0, end: 1000, natal: { gates: { all: [] } }, mode: 'overlay', planet: 'all' };
  await client.calculate(request);
  await client.calculate(request);
  assert.equal(posted.length, 1, 'same request reuses the versioned cache');
  assert.equal('rowsVersion' in posted[0], false, 'worker request shape is unchanged');
});

test('narrow intervals keep true geometry and only widen the hit target', () => {
  const esc = value => String(value);
  const title = 'Single Definition · 10:00 → 11:00';
  const wide = definitionBarMarkup({ index: 0, count: '1', left: 10, width: 20, widthPx: 200, label: '1', title, esc });
  assert.match(wide, /left:10%;width:20%/);
  assert.match(wide, /<span>1<\/span>/, 'the visible label is the bare count');
  // The tooltip already carries the full name, so the accessible label must use
  // it verbatim instead of prepending the name a second time.
  assert.ok(wide.includes(`aria-label="${title}"`), 'accessible label reuses the tooltip verbatim');
  assert.equal(wide.match(/Single Definition/g).length, 2, 'full name appears once per attribute');
  const tick = definitionBarMarkup({ index: 1, count: '3', left: 50, width: 0.01, widthPx: 0.4, label: '3', title: 'Triple Split · 10:00 → 10:01', esc });
  assert.match(tick, /tl-definition-tick/);
  assert.match(tick, /left:50%;width:0\.01%/, 'true geometry, no minimum-width inflation');
  assert.match(tick, /<span><\/span>/, 'a tick paints no label');
  assert.match(tick, /aria-label="Triple Split · 10:00 → 10:01"/);
  assert.ok(DEFINITION_TICK_PX > 0);
});
