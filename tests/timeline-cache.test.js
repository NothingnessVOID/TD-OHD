import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimelineClient } from '../src/features/transit-timeline/client.js';
import { TIMELINE_RULE_VERSION } from '../src/features/transit-timeline/version.js';
import { OBSERVATION_RULE_VERSION } from '../src/lib/observation-record.js';

test('timeline cache distinguishes event level, planet and rule version', async () => {
  assert.equal(TIMELINE_RULE_VERSION, OBSERVATION_RULE_VERSION);
  const originalWorker = globalThis.Worker;
  const workers = [];
  class FakeWorker {
    constructor() { workers.push(this); }
    postMessage(request) {
      this.request = request;
      queueMicrotask(() => this.onmessage({ data: { type: 'result', result: { request } } }));
    }
    terminate() {}
  }
  globalThis.Worker = FakeWorker;
  try {
    const client = createTimelineClient();
    const base = { start: 0, end: 60_000, eventLevel: 'gate', planet: 'all', ruleVersion: TIMELINE_RULE_VERSION };
    await client.calculate(base);
    await client.calculate(base);
    assert.equal(workers.length, 1, 'identical request reuses cache');
    await client.calculate({ ...base, eventLevel: 'line' });
    await client.calculate({ ...base, planet: 'moon' });
    await client.calculate({ ...base, ruleVersion: 'future-rules' });
    assert.equal(workers.length, 4, 'each calculation identity produces a new worker');
    client.dispose();
  } finally { globalThis.Worker = originalWorker; }
});
