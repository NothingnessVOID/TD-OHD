import { calculateTimeline } from './core.js';
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

self.onmessage = async ({ data }) => {
  try {
    // The ephemeris code is needed only for missing or invalid annual data.
    const fallbackSnapshot = data.segments.some(segment => segment.data.unavailable)
      ? (await import('./snapshot.js')).snapshot : null;
    const parts = data.segments.map((segment, index) => {
      const options = { start: segment.start, end: segment.end,
        natal: data.natal, mode: data.mode, planet: data.planet, catalog: catalog(),
        stateAt: (natal, activations, mode) => stateAt(natal, activations, mode, data.planet) };
      const result = !segment.data.unavailable
        ? timelineFromAnnual({ ...options, years: [segment.data] })
        : calculateTimeline({ start: segment.start, end: segment.end, snapshot: fallbackSnapshot, catalog: options.catalog, planet: data.planet,
          states: activations => stateAt(data.natal, activations, data.mode, data.planet),
          onProgress: progress => self.postMessage({ type: 'progress', progress: (index + progress) / data.segments.length }) });
      self.postMessage({ type: 'progress', progress: (index + 1) / data.segments.length });
      return result;
    });
    self.postMessage({ type: 'result', result: mergeSegments(parts, data.start, data.end) });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};
