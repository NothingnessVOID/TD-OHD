/** Public, discrete transit events. Times are UTC epoch milliseconds. */
export const ANNUAL_FORMAT = 1;
export const ANNUAL_SCAN_STEP = 60_000;
export const ANNUAL_TOLERANCE = 1_000;
export const TRANSIT_POINTS = Object.freeze([
  'sun', 'earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter',
  'saturn', 'uranus', 'neptune', 'pluto', 'northNode', 'southNode'
]);

export function discreteState(snapshot) {
  return Object.fromEntries(TRANSIT_POINTS.map(point => {
    const value = snapshot[point];
    if (!Number.isInteger(value?.gate) || !Number.isInteger(value?.line)) {
      throw new Error(`Invalid activation for ${point}`);
    }
    return [point, [value.gate, value.line]];
  }));
}

export function sameActivation(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

const indexedEvents = new WeakMap();
function byPoint(data) {
  let groups = indexedEvents.get(data);
  if (!groups) {
    groups = TRANSIT_POINTS.map(() => []);
    for (const event of data.events) groups[event[1]].push(event);
    indexedEvents.set(data, groups);
  }
  return groups;
}

/** Scan each point, refine each changed gate/line, and group simultaneous events. */
export function generateAnnualEvents({ year, snapshot, onProgress = () => {} }) {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new RangeError('Invalid UTC year');
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const initial = discreteState(snapshot(start));
  const changes = [];
  let previous = initial;
  let previousTime = start;
  const total = (end - start) / ANNUAL_SCAN_STEP;
  for (let step = 1; step <= total; step++) {
    const time = start + step * ANNUAL_SCAN_STEP;
    const current = discreteState(snapshot(time));
    for (const point of TRANSIT_POINTS) {
      if (sameActivation(previous[point], current[point])) continue;
      let lo = previousTime;
      let hi = time;
      const from = previous[point];
      while (hi - lo > ANNUAL_TOLERANCE) {
        const mid = Math.floor((lo + hi) / 2 / ANNUAL_TOLERANCE) * ANNUAL_TOLERANCE;
        if (mid <= lo) break;
        if (sameActivation(discreteState(snapshot(mid))[point], from)) lo = mid;
        else hi = mid;
      }
      if (hi < end) {
        const to = discreteState(snapshot(hi))[point];
        changes.push([hi, TRANSIT_POINTS.indexOf(point), from[0], from[1], to[0], to[1]]);
      }
    }
    previous = current;
    previousTime = time;
    if (step % 10000 === 0 || step === total) onProgress(step / total);
  }
  changes.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { format: ANNUAL_FORMAT, year, start, end, pointOrder: TRANSIT_POINTS,
    scanStepMs: ANNUAL_SCAN_STEP, boundaryToleranceMs: ANNUAL_TOLERANCE,
    initial, events: changes };
}

/** Async provider adaptation of the same minute scan and second boundary refinement. */
export async function generateAnnualEventsAsync({ year, snapshot, onProgress = () => {} }) {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new RangeError('Invalid UTC year');
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const initial = discreteState(await snapshot(start));
  const changes = [];
  let previous = initial;
  let previousTime = start;
  const total = (end - start) / ANNUAL_SCAN_STEP;
  for (let step = 1; step <= total; step++) {
    const time = start + step * ANNUAL_SCAN_STEP;
    const current = discreteState(await snapshot(time));
    for (const point of TRANSIT_POINTS) {
      if (sameActivation(previous[point], current[point])) continue;
      let lo = previousTime;
      let hi = time;
      const from = previous[point];
      while (hi - lo > ANNUAL_TOLERANCE) {
        const mid = Math.floor((lo + hi) / 2 / ANNUAL_TOLERANCE) * ANNUAL_TOLERANCE;
        if (mid <= lo) break;
        if (sameActivation(discreteState(await snapshot(mid))[point], from)) lo = mid;
        else hi = mid;
      }
      if (hi < end) {
        const to = discreteState(await snapshot(hi))[point];
        changes.push([hi, TRANSIT_POINTS.indexOf(point), from[0], from[1], to[0], to[1]]);
      }
    }
    previous = current;
    previousTime = time;
    if (step % 10000 === 0 || step === total) onProgress(step / total);
  }
  changes.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { format: ANNUAL_FORMAT, year, start, end, pointOrder: TRANSIT_POINTS,
    scanStepMs: ANNUAL_SCAN_STEP, boundaryToleranceMs: ANNUAL_TOLERANCE,
    initial, events: changes };
}

export function replayAnnual(data, instant) {
  if (instant < data.start || instant >= data.end) throw new RangeError('Instant outside UTC year');
  const state = Object.fromEntries(TRANSIT_POINTS.map(point => [point, [...data.initial[point]]]));
  // Each point owns its state. Applying all changes at a timestamp before graph
  // derivation avoids zero-duration intermediate channel/center states.
  const groups = byPoint(data);
  for (let index = 0; index < TRANSIT_POINTS.length; index++) {
    const events = groups[index];
    let lo = 0; let hi = events.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (events[mid][0] <= instant) lo = mid + 1;
      else hi = mid;
    }
    if (lo) {
      const event = events[lo - 1];
      state[TRANSIT_POINTS[index]] = [event[4], event[5]];
    }
  }
  return state;
}

export function verifyAnnualStructure(data) {
  if (data.format !== ANNUAL_FORMAT || data.start !== Date.UTC(data.year, 0, 1) ||
      data.end !== Date.UTC(data.year + 1, 0, 1) ||
      JSON.stringify(data.pointOrder) !== JSON.stringify(TRANSIT_POINTS)) throw new Error('Invalid annual header');
  const state = discreteState(Object.fromEntries(TRANSIT_POINTS.map(point =>
    [point, { gate: data.initial[point]?.[0], line: data.initial[point]?.[1] }])));
  let lastTime = data.start;
  let lastPoint = -1;
  for (const event of data.events) {
    if (!Array.isArray(event) || event.length !== 6) throw new Error('Invalid event record');
    const [time, index, fromGate, fromLine, toGate, toLine] = event;
    if (!Number.isInteger(time) || time < data.start || time >= data.end ||
        !Number.isInteger(index) || index < 0 || index >= TRANSIT_POINTS.length ||
        time < lastTime || (time === lastTime && index <= lastPoint)) throw new Error('Invalid event ordering');
    const point = TRANSIT_POINTS[index];
    if (!sameActivation(state[point], [fromGate, fromLine]) ||
        sameActivation([fromGate, fromLine], [toGate, toLine])) throw new Error(`Broken transition for ${point}`);
    state[point] = [toGate, toLine];
    lastTime = time;
    lastPoint = index;
  }
  return state;
}
