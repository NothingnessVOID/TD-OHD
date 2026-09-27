import { createAnnualLoader } from './annual-loader.js';

/** Public annual cache outlives per-request workers; derived results are bounded. */
export function createTimelineClient() {
  const cache = new Map();
  const annual = createAnnualLoader();
  let active = null;
  function cancel() {
    if (!active) return;
    active.worker?.terminate();
    active.reject(new DOMException('Calculation cancelled', 'AbortError'));
    active = null;
  }
  return {
    cancel,
    dispose() { cancel(); cache.clear(); annual.clear(); },
    cachedYears: () => annual.cachedYears(),
    calculate(request, onProgress) {
      cancel();
      const key = JSON.stringify(request);
      if (cache.has(key)) return Promise.resolve(cache.get(key));
      return new Promise((resolve, reject) => {
        const task = { reject, worker: null };
        active = task;
        (async () => {
          const segments = await annual.loadRange(request.start, request.end);
          if (active !== task) return;
          onProgress?.(0.1);
          const worker = new Worker(new URL('./timeline.worker.js', import.meta.url), { type: 'module' });
          task.worker = worker;
          const finish = () => { worker.terminate(); if (active === task) active = null; };
          worker.onerror = event => { finish(); reject(new Error(event.message)); };
          worker.onmessage = ({ data }) => {
            if (active !== task) return;
            if (data.type === 'progress') { onProgress?.(0.1 + data.progress * 0.9); return; }
            finish();
            if (data.type === 'error') { reject(new Error(data.message)); return; }
            cache.set(key, data.result);
            if (cache.size > 4) cache.delete(cache.keys().next().value);
            resolve(data.result);
          };
          worker.postMessage({ ...request, segments });
        })().catch(error => {
          if (active === task) { active = null; reject(error); }
        });
      });
    }
  };
}
