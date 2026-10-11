import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaDraft } from '../src/lib/wa/model.js';
import { createWaRepository, saveWaOrganization } from '../src/lib/wa/repository.js';

test('repository requires explicit CAS and validates before opening storage', async () => {
  let opens = 0;
  const repo = createWaRepository({ indexedDB: { open() { opens++; throw new Error('Unexpected open'); } } });
  const draft = createWaDraft();
  await assert.rejects(repo.save(draft), { code: 'EXPECTED_REVISION_REQUIRED' });
  await assert.rejects(repo.save({ ...draft, chart: {} }, { expectedRevision: 0 }), { code: 'INVALID_SNAPSHOT' });
  await assert.rejects(repo.save(draft, { expectedRevision: 1 }), { code: 'REVISION_CONFLICT' });
  await assert.rejects(repo.restore('id', 'r', {}), { code: 'EXPECTED_REVISION_REQUIRED' });
  assert.equal(opens, 0);
});

test('storage failure is explicit and preserves the caller draft', async () => {
  const draft = createWaDraft();
  const before = structuredClone(draft);
  const repo = createWaRepository({ indexedDB: { open() { throw new Error('Access denied'); } } });
  await assert.rejects(repo.save(draft, { expectedRevision: 0 }), { code: 'STORAGE_UNAVAILABLE' });
  assert.deepEqual(draft, before);
  assert.equal(typeof saveWaOrganization, 'function');
});

// Atomicity, CAS races, persistence and immutable restore are tested against actual
// Chromium IndexedDB in wa-repository-e2e.mjs, rather than a synchronous Node fake.
