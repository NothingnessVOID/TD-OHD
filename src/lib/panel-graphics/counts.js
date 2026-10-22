/**
 * Counting for the right column. One exit, so the panel and the export can
 * never disagree about how many channels exist.
 *
 * Three facts about the chart object this module exists to enforce:
 *
 * 1. `circuitAnalysis` carries a leftover `integration` key whose `.channels`
 *    is always 0 (those channels are already counted under `individual`), plus a
 *    `dominant` object. Iterating the whole object would draw an empty segment
 *    or double-count. Only the three real groups are read, by name.
 * 2. "the three segments add up to channels.length" is not enough of a check:
 *    a mis-keyed group still sums correctly. Every group is compared against a
 *    recount from `channelCircuit`, one group at a time.
 * 3. Ties are real (Individual 1 / Tribal 2 / Collective 2 happens). The key
 *    order of two different code paths used to decide the winner, so the two
 *    panels could name different dominant circuits on the same chart. A tie now
 *    returns every group that shares the maximum.
 */
import { channelCircuit } from '../circuit-topology.js';
import { PLANET_ORDER } from '../planet-reference.js';
import { records } from './activations.js';

/** The only circuit groups that own channels. `integration` is a sub-circuit. */
export const CIRCUIT_GROUP_KEYS = Object.freeze(['individual', 'collective', 'tribal']);

/**
 * Per-group channel counts, recounted from the chart's own channel list.
 * Returns `[{ key, count }]` in group order, always exactly three entries.
 */
export function circuitCounts(chart) {
  const counted = { individual: 0, collective: 0, tribal: 0 };
  for (const channel of chart?.channels || []) counted[channelCircuit(channel).group] += 1;
  const analysis = chart?.circuitAnalysis;
  if (analysis) {
    for (const key of CIRCUIT_GROUP_KEYS) {
      const reported = analysis[key]?.channels;
      if (typeof reported === 'number' && reported !== counted[key]) {
        throw new Error(`Circuit count mismatch for ${key}: analysis says ${reported}, channels recount to ${counted[key]}`);
      }
    }
  }
  return CIRCUIT_GROUP_KEYS.map(key => ({ key, count: counted[key] }));
}

/** The circuit group of one channel; the only per-channel taxonomy read. */
export function channelGroup(channel) {
  return channelCircuit(channel).group;
}

/**
 * The chart's channels bucketed by circuit group, in group order. The display
 * layer reads its groups here instead of calling channelCircuit itself, so the
 * taxonomy keeps exactly one consumer in the panel code.
 */
export function channelsByGroup(chart) {
  const buckets = { individual: [], collective: [], tribal: [] };
  for (const channel of chart?.channels || []) buckets[channelCircuit(channel).group].push(channel);
  return buckets;
}

/**
 * Every group sharing the highest count. Empty array when there is no channel
 * at all (Reflector), which the caller renders as an explicit empty state.
 */
export function dominantCircuits(chart) {
  const groups = circuitCounts(chart);
  const max = Math.max(...groups.map(group => group.count));
  if (!max) return [];
  return groups.filter(group => group.count === max);
}

/** Unique activated gates. `chart.gates.all` is already de-duplicated. */
export function gateCount(chart) {
  return chart?.gates?.all?.length || 0;
}

/** Non-empty activation records across both sides (13 planets × 2). */
export function activationCount(chart) {
  let count = 0;
  for (const side of ['design', 'personality']) {
    for (const planet of PLANET_ORDER) if (chart?.gates?.[side]?.[planet]) count += 1;
  }
  return count;
}

/**
 * Where each activated gate comes from: both sides, design only, personality
 * only. The gate grid and the pill list both read this, so the caption and the
 * pills can never disagree.
 */
export function gateSourceCounts(chart, list = records(chart)) {
  const design = new Set();
  const personality = new Set();
  for (const record of list) {
    if (record.side === 'design') design.add(record.gate);
    else personality.add(record.gate);
  }
  const all = [...new Set([...design, ...personality])].sort((a, b) => a - b);
  return {
    all,
    both: all.filter(gate => design.has(gate) && personality.has(gate)),
    onlyDesign: all.filter(gate => design.has(gate) && !personality.has(gate)),
    onlyPersonality: all.filter(gate => personality.has(gate) && !design.has(gate)),
    total: all.length
  };
}

/** Rows in the planet table — read from the catalog, never hard-coded. */
export function planetRows() {
  return PLANET_ORDER.length;
}

/** Denominator for "N / M activations": 13 planets on each of the two sides. */
export function activationSlots() {
  return PLANET_ORDER.length * 2;
}

/** Defined / undefined / open centre counts as the three row segments read them. */
export function centerStateCounts(chart) {
  return {
    defined: chart?.centers?.definedNames?.length || 0,
    undefined: chart?.centers?.undefinedNames?.length || 0,
    open: chart?.centers?.openNames?.length || 0
  };
}
