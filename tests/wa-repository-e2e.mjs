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

  await page.evaluate(async () => {
    const { createWaDraft, updateWaAnnotations } = await import('/src/lib/wa/model.js');
    const { createWaRepository } = await import('/src/lib/wa/repository.js');
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const openV1 = name => new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('heads', { keyPath: 'organizationId' });
        const revisions = request.result.createObjectStore('revisions', { keyPath: ['organizationId', 'revisionId'] });
        revisions.createIndex('organizationId', 'organizationId', { unique: false });
        revisions.createIndex('organizationRevision', ['organizationId', 'revision'], { unique: true });
      };
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const name = 'wa-legacy-v1-test';
    const legacy = { ...createWaDraft({ organizationId: 'legacy-synthetic', title: 'legacy untouched' }),
      revision: 1, revisionId: 'legacy-r1', savedAt: '2025-10-01T10:30:00+08:00' };
    const old = await openV1(name);
    await new Promise((resolve, reject) => {
      const tx = old.transaction(['heads', 'revisions'], 'readwrite');
      tx.objectStore('heads').put(legacy); tx.objectStore('revisions').add(legacy);
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
    });
    // Exercise the old app's versionchange close contract.
    let versionChanged = false;
    old.onversionchange = () => { versionChanged = true; old.close(); };
    const repo = createWaRepository({ databaseName: name });
    check(JSON.stringify(await repo.get(legacy.organizationId)) === JSON.stringify(legacy), 'Upgrade altered legacy head');
    check(versionChanged, 'Old connection did not receive versionchange');
    check(JSON.stringify((await repo.history(legacy.organizationId))[0]) === JSON.stringify(legacy), 'Upgrade altered legacy history');
    const edited = await repo.save({ ...legacy, title: 'v1 edit remains v1' }, { expectedRevision: 1 });
    check(edited.schema === 'wa-refs-v1', 'v1 edit forced schema upgrade');
    const annotated = updateWaAnnotations(edited, { consultation: { assignment: 'manual', origin: 'manual', specificProblem: 'keep human text' }, manualCommunicationEdges: [] });
    const third = await repo.save(annotated, { expectedRevision: 2 });
    const fourth = await repo.save({ ...third, title: 'edited v2' }, { expectedRevision: 3 });
    const restored = await repo.restore(legacy.organizationId, third.revisionId, { expectedRevision: 4 });
    check(restored.schema === 'wa-refs-v2' && restored.consultation.specificProblem === 'keep human text', 'Restore lost v2 annotations');
    check(restored.parentRevisionId === fourth.revisionId, 'Restore broke revision chain');
    const restoreLegacy = await repo.restore(legacy.organizationId, legacy.revisionId, { expectedRevision: 5 });
    check(restoreLegacy.schema === 'wa-refs-v1' && !Object.hasOwn(restoreLegacy, 'consultation'), 'Legacy restore invented annotations');
    const backup = await repo.exportOrganization(legacy.organizationId);
    check(backup.revisions.length === 6 && backup.annotations.revisions.length === 6, 'Incomplete organization export');
    check(backup.annotations.revisions[2].annotations.consultation.specificProblem === 'keep human text', 'Historical annotations lost from export');
    check(JSON.stringify(backup.revisions[0]) === JSON.stringify(legacy), 'Old history was mutated');
    let code;
    try { await repo.exportV1Organization(legacy.organizationId); } catch (error) { code = error.code; }
    check(code === 'ANNOTATION_DOWNGRADE_CONFIRMATION_REQUIRED', 'History downgrade lacked confirmation');
    const v1 = await repo.exportV1Organization(legacy.organizationId, { confirmAnnotationRemoval: true });
    check(v1.revisions.every(row => row.schema === 'wa-refs-v1' && !Object.hasOwn(row, 'consultation')), 'Invalid v1 backup');
    check(v1.annotations.revisions[2].annotations.consultation.specificProblem === 'keep human text', 'Downgrade did not preserve annotation sidecar');
    check(JSON.stringify(await repo.exportOrganization(legacy.organizationId)) === JSON.stringify(backup), 'Export mutated storage');
    let oldError;
    try { const db = await openV1(name); db.close(); } catch (error) { oldError = error.name; }
    check(oldError === 'VersionError', 'Old client was not fenced');

    // A stubborn old tab blocks upgrade; rejection must not upgrade later in the background.
    const blockedName = 'wa-legacy-blocked-test';
    const blocker = await openV1(blockedName);
    const blockedRepo = createWaRepository({ databaseName: blockedName });
    let blockedCode;
    try { await blockedRepo.list(); } catch (error) { blockedCode = error.code; }
    check(blockedCode === 'STORAGE_BLOCKED', 'Blocked upgrade must reject explicitly');
    blocker.close();
    // IndexedDB processes this open after the prior pending upgrade: successful v1 proves abort.
    const stillV1 = await openV1(blockedName);
    check(stillV1.version === 1, 'Rejected blocked request upgraded in background');
    stillV1.close();
    await blockedRepo.list(); // explicit retry may now upgrade
    for (const dbName of [name, blockedName]) await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName); request.onsuccess = resolve; request.onerror = () => reject(request.error);
    });
  });
  console.log('PASS seeded legacy v1 head/history load-edit-save-restore, v2 annotations, complete export, explicit downgrade, old-client fence, blocked-upgrade rollback');

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
