import { CHANNELS } from '../../lib/human-design/catalog.js';

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

/**
 * Natal definition split, for charts whose natal definition is a single island.
 *
 * A split exists only when the birth-chart-plus-transit overlay contains a
 * complete channel component sharing no center with the natal island. Hanging
 * gates never form a component, so they are not a split. The natal chart itself
 * is never rewritten: this describes the overlay only.
 */
export function splitState(natal, activeGates, channels = CHANNELS) {
  const islands = natalIslands(natal, channels);
  if (islands.length !== 1) return { applicable: false, islands, natalCenters: [], newIslands: [], split: false };
  const natalCenters = new Set(islands[0]);
  const active = new Set(activeGates);
  const newIslands = components(channels.filter(channel => channel.gates.every(gate => active.has(gate))))
    .filter(group => group.every(center => !natalCenters.has(center)))
    .sort((a, b) => a[0].localeCompare(b[0]));
  return { applicable: true, islands, natalCenters: [...natalCenters], newIslands,
    split: newIslands.length > 0 };
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
