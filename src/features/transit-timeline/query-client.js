/** Query jobs are disposable; cancel terminates the worker and rejects stale results. */
export function createTimelineQueryClient() {
  let active = null;
  function cancel() {
    if (!active) return;
    active.worker.terminate();
    active.reject(new DOMException('Query cancelled', 'AbortError'));
    active = null;
  }
  return {
    cancel, dispose: cancel,
    query(request) {
      cancel();
      return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./query.worker.js', import.meta.url), { type: 'module' });
        active = { worker, reject };
        const finish = () => { worker.terminate(); if (active?.worker === worker) active = null; };
        worker.onerror = event => { finish(); reject(new Error(event.message)); };
        worker.onmessage = ({ data }) => {
          finish();
          if (data.type === 'error') reject(new Error(data.message));
          else resolve(data.result);
        };
        worker.postMessage(request);
      });
    }
  };
}
