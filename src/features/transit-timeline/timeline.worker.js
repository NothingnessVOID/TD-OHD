import { calculateTimelineAsync } from './core.js';
import { timelineFromAnnual } from './annual-timeline.js';
import { stateAt, catalog } from './graph-provider.js';

function mergeSegments(parts, start, end) {
  const rows = catalog().map(row => ({ ...row, intervals: [] }));
  const byKey = new Map(rows.map(row => [row.key, row]));
  for (const part of parts) for (const row of part.rows) {
    const output = byKey.get(row.key).intervals;
    for (const interval of row.intervals) {
      const previous = output.at(-1);
      if (previous?.end === interval.start && previous.source === interval.source) {
        previous.end = interval.end;
        previous.clippedEnd = interval.clippedEnd;
      } else output.push({ ...interval });
    }
  }
  const byTime = new Map();
  for (const part of parts) for (const change of part.gateChanges || []) {
    const entry = byTime.get(change.time) || { gates: new Set(), planets: new Set() };
    change.gates.forEach(gate => entry.gates.add(gate));
    change.planets?.forEach(planet => entry.planets.add(planet));
    byTime.set(change.time, entry);
  }
  return { start, end, rows,
    events: [...new Set(parts.flatMap(part => part.events))].sort((a, b) => a - b),
    gateEvents: [...new Set(parts.flatMap(part => part.gateEvents || part.events))].sort((a, b) => a - b),
    gateChanges: [...byTime].sort(([a], [b]) => a - b).map(([time, entry]) => ({ time,
      gates: [...entry.gates].sort((a, b) => a - b), planets: [...entry.planets].sort() })),
    source: parts.every(part => part.source === 'annual') ? 'annual' : 'mixed' };
}

let snapshotRequestId = 0;
const pendingSnapshots = new Map();
function requestSnapshots(instants) {
  return new Promise((resolve, reject) => {
    const id = ++snapshotRequestId;
    pendingSnapshots.set(id, { resolve, reject });
    self.postMessage({ type: 'snapshotBatch', id, instants });
  });
}

self.onmessage = async ({ data }) => {
  if (data.type === 'snapshotBatchResult') {
    const pending = pendingSnapshots.get(data.id);
    if (pending) {
      pendingSnapshots.delete(data.id);
      if (data.error) pending.reject(new Error(data.error));
      else pending.resolve(data.snapshots);
    }
    return;
  }
  try {
    // Missing annual data uses the main thread's already initialized browser WASM runtime.
    const parts = [];
    for (const [index, segment] of data.segments.entries()) {
      const options = { start: segment.start, end: segment.end,
        natal: data.natal, mode: data.mode, planet: data.planet, catalog: catalog(),
        stateAt: (natal, activations, mode) => stateAt(natal, activations, mode, data.planet) };
      const result = !segment.data.unavailable
        ? timelineFromAnnual({ ...options, years: [segment.data] })
        : await calculateTimelineAsync({ start: segment.start, end: segment.end, snapshot: async instant => (await requestSnapshots([instant]))[0], snapshotBatch: requestSnapshots, catalog: options.catalog, planet: data.planet,
          states: activations => stateAt(data.natal, activations, data.mode, data.planet),
          onProgress: progress => self.postMessage({ type: 'progress', progress: (index + progress) / data.segments.length }) });
      self.postMessage({ type: 'progress', progress: (index + 1) / data.segments.length });
      parts.push(result);
    }
    self.postMessage({ type: 'result', result: mergeSegments(parts, data.start, data.end) });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};
