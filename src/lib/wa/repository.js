import { assertWaSnapshot } from './model.js';
import { createUuid } from '../uuid.js';

export const WA_DATABASE_NAME = 'ohd-wa-refs-v1';
export const WA_DATABASE_VERSION = 1;
export class WaRepositoryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'WaRepositoryError';
    this.code = code;
    Object.assign(this, details);
  }
}
const fail = (code, message, details) => { throw new WaRepositoryError(code, message, details); };
const idRequired = id => {
  if (typeof id !== 'string' || !id.trim()) fail('INVALID_ID', 'A nonempty id is required.');
};
const expectedRequired = expected => {
  if (!Number.isSafeInteger(expected) || expected < 0) fail('EXPECTED_REVISION_REQUIRED', 'Pass the last observed revision, or 0 to create.');
};
const snapshotCopy = input => structuredClone(assertWaSnapshot(input));

/** A distinct IndexedDB database. Factory injection supports isolated real-browser tests. */
export function createWaRepository({ indexedDB: factory, databaseName = WA_DATABASE_NAME,
  uuid = createUuid, now = () => new Date().toISOString() } = {}) {
  function open() {
    return new Promise((resolve, reject) => {
      let request;
      try {
        const provider = factory ?? globalThis.indexedDB;
        if (!provider?.open) fail('STORAGE_UNAVAILABLE', 'IndexedDB is unavailable.');
        request = provider.open(databaseName, WA_DATABASE_VERSION);
      } catch (error) { reject(error instanceof WaRepositoryError ? error : new WaRepositoryError('STORAGE_UNAVAILABLE', error.message)); return; }
      let blocked = false;
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('heads', { keyPath: 'organizationId' });
        const revisions = db.createObjectStore('revisions', { keyPath: ['organizationId', 'revisionId'] });
        revisions.createIndex('organizationId', 'organizationId', { unique: false });
        revisions.createIndex('organizationRevision', ['organizationId', 'revision'], { unique: true });
      };
      request.onblocked = () => { blocked = true; reject(new WaRepositoryError('STORAGE_BLOCKED', 'Close other outdated Wa database connections.')); };
      request.onerror = () => reject(new WaRepositoryError('STORAGE_OPEN_FAILED', request.error?.message ?? 'Cannot open Wa database.'));
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) { db.close(); return; }
        db.onversionchange = () => db.close();
        resolve(db);
      };
    });
  }

  async function transaction(mode, operation) {
    const db = await open();
    return new Promise((resolve, reject) => {
      let tx;
      let result;
      let failure;
      try { tx = db.transaction(['heads', 'revisions'], mode); }
      catch (error) { db.close(); reject(new WaRepositoryError('STORAGE_UNAVAILABLE', error.message)); return; }
      const abort = error => { failure = error; tx.abort(); };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onabort = () => { db.close(); reject(failure ?? new WaRepositoryError('STORAGE_TRANSACTION_FAILED', tx.error?.message ?? 'Wa transaction aborted.')); };
      // The transaction abort handler settles errors after rollback, never before commit.
      const watch = (request, fn) => {
        request.onsuccess = () => { try { fn(request.result); } catch (error) { abort(error); } };
      };
      try { operation(tx, watch, value => { result = value; }); }
      catch (error) { abort(error); }
    });
  }

  async function list() {
    return transaction('readonly', (tx, watch, done) => watch(tx.objectStore('heads').getAll(), rows => {
      done(rows.map(snapshotCopy).sort((a, b) => b.savedAt.localeCompare(a.savedAt) || a.organizationId.localeCompare(b.organizationId)));
    }));
  }
  async function get(organizationId) {
    idRequired(organizationId);
    return transaction('readonly', (tx, watch, done) => watch(tx.objectStore('heads').get(organizationId), row => done(row ? snapshotCopy(row) : null)));
  }
  async function history(organizationId) {
    idRequired(organizationId);
    return transaction('readonly', (tx, watch, done) => watch(tx.objectStore('revisions').index('organizationId').getAll(organizationId), rows => {
      done(rows.map(snapshotCopy).sort((a, b) => b.revision - a.revision));
    }));
  }
  function append(tx, head, draft, expectedRevision, done) {
    if (head) assertWaSnapshot(head);
    const actualRevision = head?.revision ?? 0;
    if (actualRevision !== expectedRevision) fail('REVISION_CONFLICT', 'Wa changed since it was loaded; local edits were preserved.', {
      expectedRevision, actualRevision, currentSnapshot: head ? structuredClone(head) : null
    });
    if (actualRevision === Number.MAX_SAFE_INTEGER) fail('REVISION_LIMIT', 'Revision limit reached.');
    const saved = snapshotCopy({ ...draft, revision: actualRevision + 1, revisionId: uuid(),
      parentRevisionId: head?.revisionId ?? null, savedAt: now() });
    // add (not put) guarantees a revision collision cannot overwrite historical snapshots.
    tx.objectStore('revisions').add(saved);
    tx.objectStore('heads').put(saved);
    done(saved);
  }
  async function save(input, { expectedRevision } = {}) {
    expectedRequired(expectedRevision);
    const draft = snapshotCopy(input); // capture before the first await; never mutate caller edits
    if (draft.revision !== expectedRevision) fail('REVISION_CONFLICT', 'Draft revision differs from expectedRevision.', {
      expectedRevision, actualRevision: draft.revision
    });
    return transaction('readwrite', (tx, watch, done) => watch(tx.objectStore('heads').get(draft.organizationId), head => {
      if (head && (draft.revisionId !== head.revisionId || draft.parentRevisionId !== head.parentRevisionId)) {
        fail('REVISION_CONFLICT', 'Draft revision identity differs from the stored head.', {
          expectedRevision, actualRevision: head.revision, currentSnapshot: structuredClone(head)
        });
      }
      append(tx, head, draft, expectedRevision, done);
    }));
  }
  async function restore(organizationId, revisionId, { expectedRevision } = {}) {
    idRequired(organizationId);
    idRequired(revisionId);
    expectedRequired(expectedRevision);
    return transaction('readwrite', (tx, watch, done) => watch(tx.objectStore('heads').get(organizationId), head => {
      if (!head) fail('NOT_FOUND', 'Wa organization does not exist.');
      watch(tx.objectStore('revisions').get([organizationId, revisionId]), previous => {
        if (!previous) fail('REVISION_NOT_FOUND', 'Wa revision does not exist.');
        append(tx, head, snapshotCopy(previous), expectedRevision, done);
      });
    }));
  }
  return Object.freeze({ list, get, history, save, restore });
}
const defaultRepository = createWaRepository();
export const listWaOrganizations = () => defaultRepository.list();
export const getWaOrganization = id => defaultRepository.get(id);
export const listWaRevisions = id => defaultRepository.history(id);
export const saveWaOrganization = (input, options) => defaultRepository.save(input, options);
export const restoreWaRevision = (id, revisionId, options) => defaultRepository.restore(id, revisionId, options);
