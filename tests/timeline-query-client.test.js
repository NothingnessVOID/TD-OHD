import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimelineQueryClient } from '../src/features/transit-timeline/query-client.js';

test('a running condition query can be cancelled without delivering stale results', async () => {
  const original = globalThis.Worker;
  const workers = [];
  class FakeWorker {
    constructor() { this.terminated = false; workers.push(this); }
    postMessage(value) { this.request = value; }
    terminate() { this.terminated = true; }
  }
  globalThis.Worker = FakeWorker;
  try {
    const client = createTimelineQueryClient();
    const first = client.query({ condition: 'bridge' });
    assert.equal(workers[0].request.condition, 'bridge');
    const second = client.query({ condition: 'line', id: '14.2' });
    await assert.rejects(first, { name: 'AbortError' });
    assert.equal(workers[0].terminated, true);
    assert.equal(workers[1].request.id, '14.2');
    client.cancel();
    await assert.rejects(second, { name: 'AbortError' });
    assert.equal(workers[1].terminated, true);
  } finally {
    globalThis.Worker = original;
  }
});
