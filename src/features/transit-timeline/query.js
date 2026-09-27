import { CHANNELS } from 'natalengine';

const CHANNEL_BY_ID = new Map(CHANNELS.map(channel => [channel.gates.join('-'), channel]));

const nonBirth = interval => interval.source !== 'natal';
const normalizeResult = (range, intervals) => intervals
  .filter(interval => interval.end > interval.start)
  .map(interval => ({ ...interval, start: Math.max(range.start, interval.start),
    end: Math.min(range.end, interval.end) }))
  .filter(interval => interval.end > interval.start);

function natalGroups(natal) {
  const centers = new Set(natal?.centers?.definedNames || []);
  const gates = new Set(natal?.gates?.all || []);
  const adjacency = new Map([...centers].map(center => [center, []]));
  for (const channel of CHANNELS) {
    if (!channel.gates.every(gate => gates.has(gate))) continue;
    const [a, b] = channel.centers;
    if (adjacency.has(a) && adjacency.has(b)) {
      adjacency.get(a).push(b);
      adjacency.get(b).push(a);
    }
  }
  const groups = [];
  const visited = new Set();
  for (const center of centers) {
    if (visited.has(center)) continue;
    const group = [];
    const queue = [center];
    visited.add(center);
    for (const current of queue) {
      group.push(current);
      for (const next of adjacency.get(current) || []) if (!visited.has(next)) {
        visited.add(next); queue.push(next);
      }
    }
    groups.push(group);
  }
  return groups;
}

/** A real center-to-center path, not a count of transit gates near islands. */
export function bridgePath(natal, channelIds) {
  const groups = natalGroups(natal);
  if (groups.length < 2) return null;
  const adjacency = new Map();
  for (const id of channelIds) {
    const channel = CHANNEL_BY_ID.get(id);
    if (!channel) continue;
    const [a, b] = channel.centers;
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a).push({ to: b, id });
    adjacency.get(b).push({ to: a, id });
  }
  const owner = new Map(groups.flatMap((group, index) => group.map(center => [center, index])));
  let best = null;
  for (const group of groups) {
    const queue = group.map(center => ({ center, path: [] }));
    const visited = new Set(group);
    for (const item of queue) {
      if (best && item.path.length >= best.length) continue;
      for (const edge of adjacency.get(item.center) || []) {
        if (visited.has(edge.to)) continue;
        const path = [...item.path, edge.id];
        if (owner.has(edge.to) && owner.get(edge.to) !== owner.get(group[0])) {
          if (!best || path.length < best.length) best = path;
        } else {
          visited.add(edge.to);
          queue.push({ center: edge.to, path });
        }
      }
    }
  }
  return best;
}

function bridgeIntervals(result, natal) {
  const channels = result.rows.filter(row => row.kind === 'channel');
  const boundaries = [...new Set([result.start, result.end, ...channels.flatMap(row =>
    row.intervals.flatMap(interval => [interval.start, interval.end]))])].sort((a, b) => a - b);
  const found = [];
  for (let i = 0; i + 1 < boundaries.length; i++) {
    const start = boundaries[i], end = boundaries[i + 1];
    const active = channels.filter(row => row.intervals.some(interval => interval.start <= start && start < interval.end))
      .map(row => row.id);
    const path = bridgePath(natal, active);
    if (!path) continue;
    const previous = found.at(-1);
    if (previous?.end === start && previous.path.join('|') === path.join('|')) previous.end = end;
    else found.push({ start, end, path });
  }
  return found;
}

/** Query only the already-calculated, bounded timeline. Worker termination cancels long runs. */
export function queryTimeline({ result, natal, condition, id = '' }) {
  if (!result || !Number.isFinite(result.start) || !Number.isFinite(result.end))
    throw new RangeError('A calculated timeline is required');
  if (condition === 'bridge') {
    if (natalGroups(natal).length < 2) return { reason: 'noSplit', matches: [] };
    return { matches: bridgeIntervals(result, natal) };
  }
  const kinds = { channel: 'channel', center: 'center', line: 'line' };
  const kind = kinds[condition];
  if (!kind) throw new RangeError('Unsupported timeline query');
  const rows = result.rows.filter(row => row.kind === kind && (!id || String(row.id) === String(id)));
  const matches = rows.flatMap(row => normalizeResult(result, row.intervals.filter(nonBirth))
    .map(interval => ({ ...interval, key: row.key, id: row.id })));
  matches.sort((a, b) => a.start - b.start || String(a.key).localeCompare(String(b.key)));
  return { matches };
}
