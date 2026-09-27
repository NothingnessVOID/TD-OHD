import { normalizeObservation, restoreObservationRecords } from './observation-record.js';
import { localApi } from './local-store.js';

// Compile-time boundary: the public static build does not ship the local API.
const desktop = import.meta.env.VITE_OHD_LOCAL === 'true';
const api = localApi;

const NAME = 'td-ohd-observations';
const STORE = 'records';

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction(mode, work) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Observation transaction aborted.'));
      try { result = work(tx.objectStore(STORE)); }
      catch (error) { tx.abort(); reject(error); }
    });
  } finally { db.close(); }
}

const fromRequest = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function webList() {
  const db = await database();
  try {
    const tx = db.transaction(STORE, 'readonly');
    return await fromRequest(tx.objectStore(STORE).getAll());
  } finally { db.close(); }
}

export function createObservationStore() {
  return {
    async list() {
      const records = desktop ? (await api('observations')).records : await webList();
      return records.map(normalizeObservation).sort((a, b) => b.observedAt.localeCompare(a.observedAt) || a.id.localeCompare(b.id));
    },
    async save(record) {
      const clean = normalizeObservation(record);
      if (desktop) return api('observations', { method: 'PUT', body: JSON.stringify(clean) });
      await transaction('readwrite', store => store.put(clean));
      return { record: clean, backupWarning: false };
    },
    async delete(id) {
      if (desktop) await api('observations/' + encodeURIComponent(id), { method: 'DELETE' });
      else await transaction('readwrite', store => store.delete(id));
    },
    async restore(backup) {
      if (desktop) return api('observations/import', { method: 'POST', body: JSON.stringify(backup) });
      // The preview is repeated at commit time to avoid overwriting another tab's edit.
      const db = await database();
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          const store = tx.objectStore(STORE);
          let result;
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error || new Error('Observation restore aborted.'));
          tx.oncomplete = () => resolve({ counts: result.counts, backupWarning: false });
          const request = store.getAll();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            try {
              result = restoreObservationRecords(request.result, backup);
              for (const item of result.records) store.add(item);
            } catch (error) { tx.abort(); reject(error); }
          };
        });
      } finally { db.close(); }
    }
  };
}
