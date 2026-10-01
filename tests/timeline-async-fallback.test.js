import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTimeline, calculateTimelineAsync, MINUTE } from '../src/features/transit-timeline/core.js';
import { createTimelineClient } from '../src/features/transit-timeline/client.js';

const catalog = [10, 20, 30, 40].map(id => ({ key: `gate:${id}`, kind: 'gate', id }));
const sky = time => ({ sun: { gate: time < 10_000 ? 10 : 20, line: 1 }, moon: { gate: time < 20_000 ? 30 : 40, line: 1 } });
const states = activations => new Map(Object.values(activations).map(value => [`gate:${value.gate}`, 'transit']));
const options = { start: 0, end: MINUTE * 5, catalog, states, snapshot: sky };

test('async fallback preserves separately refined crossings and complete sync result', async () => {
  let batches = 0;
  const result = await calculateTimelineAsync({ ...options,
    snapshot: async instant => sky(instant),
    snapshotBatch: async instants => { batches++; await Promise.resolve(); return instants.map(sky); },
    batchSize: 2,
  });
  assert.deepEqual(result, calculateTimeline(options));
  assert.deepEqual(result.events, [10_000, 20_000]);
  assert.equal(batches, 3);
});

test('coarse scans cross the engine boundary in bounded batches, not once per minute', async () => {
  const constant = () => ({ sun: { gate: 10, line: 1 } });
  const batchSizes = [];
  let singles = 0;
  await calculateTimelineAsync({ ...options, end: MINUTE * 4100,
    snapshot: async instant => { singles++; return constant(instant); },
    snapshotBatch: async instants => { batchSizes.push(instants.length); return instants.map(constant); },
  });
  assert.equal(batchSizes.length, 65);
  assert.ok(batchSizes.slice(0, -1).every(size => size === 64));
  assert.equal(batchSizes.at(-1), 4);
  assert.equal(singles, 1);
});

test('async fallback preserves filtered gate navigation and exclusive end boundaries', async () => {
  const filtered = { ...options, planet: 'moon', scanStep: 10_000 };
  assert.deepEqual(await calculateTimelineAsync({ ...filtered, snapshot: async time => sky(time) }), calculateTimeline(filtered));
  const boundary = time => ({ sun: { gate: time < MINUTE ? 10 : 20, line: 1 } });
  const result = await calculateTimelineAsync({ ...options, end: MINUTE, snapshot: async time => boundary(time) });
  assert.deepEqual(result.events, []);
});

test('async fallback rejects malformed batch data and propagates engine errors', async () => {
  await assert.rejects(calculateTimelineAsync({ ...options, snapshotBatch: async () => [] }), /Invalid snapshot batch response/);
  await assert.rejects(calculateTimelineAsync({ ...options, snapshot: async () => { throw new Error('Swiss files unavailable'); } }), /Swiss files unavailable/);
  await assert.rejects(calculateTimelineAsync({ ...options, batchSize: 2049 }), /Invalid snapshot batch size/);
});

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
class FakeWorker {
  posted = [];
  terminated = false;
  postMessage(message) { this.posted.push(message); }
  terminate() { this.terminated = true; }
  emit(data) { this.onmessage({ data }); }
}
const loader = { loadRange: async () => [{ start: 0, end: MINUTE, data: { unavailable: true } }], clear() {}, cachedYears: () => [] };

test('fallback worker requests use the client runtime and keep result caching', async () => {
  const worker = new FakeWorker();
  const batches = [];
  const client = createTimelineClient({ annualLoader: loader, workerFactory: () => worker,
    batchSnapshot: async instants => { batches.push(instants); return instants.map(sky); } });
  const request = { start: 0, end: MINUTE };
  const pending = client.calculate(request);
  await tick();
  worker.emit({ type: 'snapshotBatch', id: 1, instants: [0, 30_000] });
  await tick();
  await tick();
  assert.deepEqual(batches, [[0, 30_000]]);
  assert.deepEqual(worker.posted.at(-1), { type: 'snapshotBatchResult', id: 1, snapshots: [sky(0), sky(30_000)] });
  const result = { rows: [], events: [] };
  worker.emit({ type: 'result', result });
  assert.equal(await pending, result);
  assert.equal(await client.calculate(request), result);
  assert.equal(worker.terminated, true);
  client.dispose();
});

test('cancelled fallback snapshots never post to a terminated or replacement worker', async () => {
  const worker = new FakeWorker();
  let release;
  const batch = new Promise(resolve => { release = resolve; });
  const client = createTimelineClient({ annualLoader: loader, workerFactory: () => worker, batchSnapshot: () => batch });
  const pending = client.calculate({ start: 0, end: MINUTE });
  const rejected = assert.rejects(pending, error => error.name === 'AbortError');
  await tick();
  worker.emit({ type: 'snapshotBatch', id: 7, instants: [0] });
  client.cancel();
  release([sky(0)]);
  await tick();
  await rejected;
  assert.equal(worker.terminated, true);
  assert.equal(worker.posted.length, 1);
  client.dispose();
});
