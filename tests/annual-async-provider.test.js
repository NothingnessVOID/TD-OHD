import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAnnualEvents, generateAnnualEventsAsync, TRANSIT_POINTS,
  discreteState, replayAnnual, verifyAnnualStructure } from '../src/features/transit-timeline/annual-events.js';

// An artificial public sky with no private birth data or astronomical calculation.
// Separate point crossings share the first scan minute; a line change occurs
// in the final second and a gate change at the exclusive next-year boundary.
test('async annual provider retains year boundaries, simultaneous-point order and replay', async () => {
  const year = 2026;
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const initial = Object.fromEntries(TRANSIT_POINTS.map((point, index) => [point, { gate: index + 1, line: 1 }]));
  const first = { ...initial, sun: { gate: 40, line: 2 } };
  const second = { ...first, moon: { gate: 50, line: 3 }, mercury: { gate: 60, line: 4 } };
  const final = { ...second, venus: { ...second.venus, line: 2 } };
  const after = { ...final, mars: { gate: 64, line: 6 } };
  const at = instant => instant >= end ? after : instant >= end - 1000 ? final
    : instant >= start + 20_000 ? second : instant >= start + 10_000 ? first : initial;
  const syncProgress = [];
  const asyncProgress = [];
  const sync = generateAnnualEvents({ year, snapshot: at, onProgress: value => syncProgress.push(value) });
  const asynchronous = await generateAnnualEventsAsync({ year, snapshot: async instant => at(instant), onProgress: value => asyncProgress.push(value) });
  assert.deepEqual(asynchronous, sync);
  assert.deepEqual(asyncProgress, syncProgress);
  assert.deepEqual(asynchronous.events.map(event => event[0]), [start + 10_000, start + 20_000, start + 20_000, end - 1000]);
  assert.ok(asynchronous.events[1][1] < asynchronous.events[2][1]);
  assert.deepEqual(verifyAnnualStructure(asynchronous), discreteState(final));
  for (const instant of [start, start + 9999, start + 10_000, start + 19_999, start + 20_000, end - 1001, end - 1000, end - 1]) {
    assert.deepEqual(replayAnnual(asynchronous, instant), discreteState(at(instant)));
  }
  assert.throws(() => replayAnnual(asynchronous, end), /outside UTC year/);
});

test('async annual provider propagates unavailable ephemeris and malformed activation errors', async () => {
  await assert.rejects(generateAnnualEventsAsync({ year: 2026, snapshot: async () => { throw new Error('Swiss ephemeris unavailable'); } }), /Swiss ephemeris unavailable/);
  await assert.rejects(generateAnnualEventsAsync({ year: 2026, snapshot: async () => ({}) }), /Invalid activation/);
});
