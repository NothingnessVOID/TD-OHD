import { TRANSIT_POINTS, replayAnnual } from './annual-events.js';

const activationObjects = state => Object.fromEntries(TRANSIT_POINTS.map(point =>
  [point, { gate: state[point][0], line: state[point][1] }]));

/** Derive graph intervals from a verified annual index. No ephemeris calls. */
export function timelineFromAnnual({ start, end, natal, mode, years, catalog, stateAt }) {
  const ordered = [...years].sort((a, b) => a.start - b.start);
  if (!ordered.length || ordered[0].start > start || ordered.at(-1).end < end) {
    throw new Error('Annual data does not cover the requested range');
  }
  const rows = catalog.map(row => ({ ...row, intervals: [] }));
  const byKey = new Map(rows.map(row => [row.key, row]));
  const open = new Map();
  const events = [];
  const gateEvents = [];
  const gateChanges = [];
  let current = null;
  const apply = (time, state) => {
    const next = stateAt(natal, activationObjects(state), mode);
    for (const [key, interval] of open) if (next.get(key) !== interval.source) {
      interval.end = time;
      byKey.get(key).intervals.push(interval);
      open.delete(key);
    }
    for (const [key, source] of next) if (!open.has(key) && byKey.has(key)) {
      open.set(key, { start: time, source, clippedStart: time === start });
    }
  };
  for (const data of ordered) {
    if (data.end <= start || data.start >= end) continue;
    if (current === null) {
      current = replayAnnual(data, start);
      apply(start, current);
    } else {
      // A year split is a storage boundary, not a change. Cross-check continuity.
      for (const point of TRANSIT_POINTS) if (current[point][0] !== data.initial[point][0] ||
        current[point][1] !== data.initial[point][1]) throw new Error('Annual seam mismatch');
    }
    let index = 0;
    while (index < data.events.length) {
      const time = data.events[index][0];
      if (time < start) { index++; continue; }
      if (time >= end) break;
      let gateChanged = false;
      const changedGates = new Set();
      while (index < data.events.length && data.events[index][0] === time) {
        const event = data.events[index++];
        current[TRANSIT_POINTS[event[1]]] = [event[4], event[5]];
        gateChanged ||= event[2] !== event[4];
        if (event[2] !== event[4]) { changedGates.add(event[2]); changedGates.add(event[4]); }
      }
      apply(time, current);
      events.push(time);
      if (gateChanged) {
        gateEvents.push(time);
        gateChanges.push({ time, gates: [...changedGates].sort((a, b) => a - b) });
      }
    }
    // Keep the final state for seam verification, even if the visible range
    // started or ended inside this annual file.
    if (data.end < end) current = replayAnnual(data, data.end - 1);
  }
  const finalStates = stateAt(natal, activationObjects(current), mode);
  for (const [key, interval] of open) byKey.get(key).intervals.push({ ...interval, end,
    clippedEnd: finalStates.get(key) === interval.source });
  return { start, end, rows, events, gateEvents, gateChanges, source: 'annual' };
}
