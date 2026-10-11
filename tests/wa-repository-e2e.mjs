/** Self-contained real Chromium IndexedDB verification. No running app or real people needed.
 * node tests/wa-repository-e2e.mjs; CHROME_PATH / CHROME_CHANNEL optionally select a browser.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)),
  server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
server.middlewares.use('/__wa-storage-test', (_request, response) => {
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html><head><title>Wa IndexedDB test</title></head><body>Isolated synthetic storage verification</body></html>');
});
let browser;
try {
  await server.listen();
  const executablePath = process.env.CHROME_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ].find(existsSync);
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : { channel: process.env.CHROME_CHANNEL || 'chromium' }) });
  const context = await browser.newContext();
  const page = await context.newPage();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/__wa-storage-test`;
  await page.goto(url);
  const databaseName = `wa-test-${Date.now()}`;
  const created = await page.evaluate(async databaseName => {
    const { createWaDraft, createWaMember } = await import('/src/lib/wa/model.js');
    const { createWaRepository } = await import('/src/lib/wa/repository.js');
    const repo = createWaRepository({ databaseName });
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    localStorage.setItem('ohd-teams-v1', 'unchanged-team-sentinel');
    check((await repo.list()).length === 0, 'Empty list');
    check(await repo.get('missing') === null, 'Missing get');
    check((await repo.history('missing')).length === 0, 'Missing history');
    const draft = createWaDraft({ organizationId: 'synthetic-browser-wa', title: 'original' });
    draft.members.push(createWaMember({ personId: 'synthetic-person', memberId: 'synthetic-member', labelSnapshot: 'Synthetic' }));
    const original = JSON.stringify(draft);
    const first = await repo.save(draft, { expectedRevision: 0 });
    check(first.revision === 1 && first.parentRevisionId === null, 'Create revision');
    check(JSON.stringify(draft) === original, 'Save mutated input');
    const second = await repo.save({ ...first, title: 'second' }, { expectedRevision: 1 });
    check(second.revision === 2 && second.parentRevisionId === first.revisionId, 'Parent chain');
    let conflict;
    const edits = { ...first, title: 'retained local edits' };
    try { await repo.save(edits, { expectedRevision: 1 }); } catch (error) { conflict = error; }
    check(conflict?.code === 'REVISION_CONFLICT' && conflict.actualRevision === 2, 'Stale save conflict');
    check(edits.title === 'retained local edits', 'Conflict erased local edits');
    check((await repo.history(first.organizationId)).length === 2, 'Conflict appended history');
    const restored = await repo.restore(first.organizationId, first.revisionId, { expectedRevision: 2 });
    check(restored.revision === 3 && restored.title === 'original', 'Restore is a new revision');
    check(restored.parentRevisionId === second.revisionId && restored.revisionId !== first.revisionId, 'Restore chain');
    check(JSON.stringify((await repo.history(first.organizationId)).at(-1)) === JSON.stringify(first), 'Restore changed old history');
    const collisionRepo = createWaRepository({ databaseName, uuid: () => first.revisionId });
    let failed;
    try { await collisionRepo.save({ ...restored, title: 'must roll back' }, { expectedRevision: 3 }); } catch (error) { failed = error; }
    check(failed?.code === 'STORAGE_TRANSACTION_FAILED', 'Expected immutable revision collision');
    check((await repo.get(first.organizationId)).revision === 3, 'Append failure still updated head');
    check((await repo.history(first.organizationId)).length === 3, 'Append failure changed history');
    try { await repo.restore(first.organizationId, first.revisionId, { expectedRevision: 2 }); } catch (error) { failed = error; }
    check(failed?.code === 'REVISION_CONFLICT', 'Stale restore must conflict');
    check(localStorage.getItem('ohd-teams-v1') === 'unchanged-team-sentinel', 'Existing Team key changed');
    return { first, restored };
  }, databaseName);
  console.log('PASS real IndexedDB save/get/list/history/restore, CAS, immutable collision rollback, refs and Team isolation');

  const otherPage = await context.newPage();
  await otherPage.goto(url);
  const writes = await Promise.all([page, otherPage].map((tab, index) => tab.evaluate(async ({ databaseName, input, index }) => {
    const { createWaRepository } = await import('/src/lib/wa/repository.js');
    try {
      const saved = await createWaRepository({ databaseName }).save({ ...input, title: `race-${index}` }, { expectedRevision: input.revision });
      return { ok: true, saved };
    } catch (error) { return { ok: false, code: error.code }; }
  }, { databaseName, input: created.restored, index })));
  assert.equal(writes.filter(write => write.ok).length, 1, 'Two tabs must not both win the same CAS');
  assert.equal(writes.find(write => !write.ok).code, 'REVISION_CONFLICT');
  console.log('PASS simultaneous independent-tab CAS has exactly one winner');

  await page.reload();
  const persisted = await page.evaluate(async ({ databaseName, id }) => {
    const { createWaRepository } = await import('/src/lib/wa/repository.js');
    const repo = createWaRepository({ databaseName });
    return { head: await repo.get(id), history: await repo.history(id), list: await repo.list() };
  }, { databaseName, id: created.first.organizationId });
  assert.equal(persisted.head.revision, 4);
  assert.deepEqual(persisted.history.map(row => row.revision), [4, 3, 2, 1]);
  assert.deepEqual(persisted.list, [persisted.head]);
  assert.deepEqual(persisted.history.at(-1), created.first);
  assert.deepEqual(Object.keys(persisted.head.members[0]).sort(), ['labelSnapshot', 'memberId', 'personId']);
  console.log('PASS page reload retains immutable history and references-only snapshots');

  await page.evaluate(databaseName => new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Test database cleanup blocked'));
  }), databaseName);
} finally {
  await browser?.close();
  await server.close();
}
