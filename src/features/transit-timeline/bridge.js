import { CHANNELS } from 'natalengine';

function components(channels) {
  const graph = new Map();
  for (const channel of channels) {
    const [a, b] = channel.centers;
    if (!graph.has(a)) graph.set(a, new Set());
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(a).add(b); graph.get(b).add(a);
  }
  const visited = new Set();
  const groups = [];
  for (const center of [...graph.keys()].sort()) {
    if (visited.has(center)) continue;
    const group = [];
    const pending = [center]; visited.add(center);
    while (pending.length) {
      const item = pending.pop(); group.push(item);
      for (const next of graph.get(item) || []) if (!visited.has(next)) {
        visited.add(next); pending.push(next);
      }
    }
    groups.push(group.sort());
  }
  return groups.sort((a, b) => a[0].localeCompare(b[0]));
}

export function natalIslands(natal, channels = CHANNELS) {
  const gates = new Set(natal.gates.all);
  return components(channels.filter(channel => channel.gates.every(gate => gates.has(gate))));
}

/** Each connected group merges its fixed natal islands into one island. */
export function bridgedIslandCount(natalCount, connected) {
  return natalCount - connected.reduce((merged, group) => merged + Math.max(0, new Set(group).size - 1), 0);
}

/** Connected groups refer to fixed natal island numbers, not transient islands. */
export function bridgeState(natal, activeGates, channels = CHANNELS) {
  const islands = natalIslands(natal, channels);
  if (islands.length < 2) return { applicable: false, islands, connected: [] };
  const active = new Set(activeGates);
  const combined = components(channels.filter(channel => channel.gates.every(gate => active.has(gate))));
  const connected = combined.map(group => islands.map((island, index) => island.some(center => group.includes(center)) ? index + 1 : null)
    .filter(Boolean)).filter(group => group.length > 1).sort((a, b) => a[0] - b[0]);
  return { applicable: true, islands, connected,
    complete: connected.some(group => group.length === islands.length) };
}
