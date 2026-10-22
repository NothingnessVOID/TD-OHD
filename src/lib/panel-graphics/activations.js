/**
 * Activation records: the single source both data tabs project from.
 *
 * `chart.gates.design` / `.personality` are maps of planet → { gate, line,
 * color, tone, base }. The gates tab needs them grouped by gate, the planets tab
 * by planet. If each tab walked `chart.gates` on its own, a later "compact per
 * gate" step could flatten two records that share a gate but sit on different
 * lines (Design Sun 12.3 and Personality Moon 12.3 are not the same reading),
 * and the two tabs would start disagreeing about the line or the fixing.
 *
 * So: one flat list here, two pure projections over it, and the line fixing is
 * resolved once per record while the list is built. Nothing is merged.
 */
import { calculateLineFixings } from '../../features/transit-timeline/line-fixing.js';
import { PLANET_ORDER } from '../planet-reference.js';

export const ACTIVATION_SIDES = Object.freeze(['design', 'personality']);

const planetOrder = new Map(PLANET_ORDER.map((planet, index) => [planet, index]));

/**
 * Flat, deterministic list of the chart's activations.
 * @returns {{ side: 'design'|'personality', planet: string, gate: number, line: number,
 *             color: number|null, tone: number|null, base: number|null,
 *             fixing: 'exalted'|'detriment'|'juxtaposed'|'none'|'unknown' }[]}
 */
export function records(chart) {
  // One calculation for the whole list: a record never resolves its own fixing.
  const fixings = calculateLineFixings(chart);
  const out = [];
  for (const side of ACTIVATION_SIDES) {
    const entries = Object.entries(chart?.gates?.[side] || {})
      .filter(([, activation]) => Number.isInteger(activation?.gate));
    entries.sort((a, b) =>
      (planetOrder.get(a[0]) ?? Number.MAX_SAFE_INTEGER) - (planetOrder.get(b[0]) ?? Number.MAX_SAFE_INTEGER) ||
      a[0].localeCompare(b[0]));
    for (const [planet, activation] of entries) {
      out.push({
        side,
        planet,
        gate: activation.gate,
        line: activation.line,
        color: Number.isInteger(activation.color) ? activation.color : null,
        tone: Number.isInteger(activation.tone) ? activation.tone : null,
        base: Number.isInteger(activation.base) ? activation.base : null,
        fixing: fixings?.[side]?.[planet]?.natalState ?? 'unknown'
      });
    }
  }
  return out;
}

/**
 * Gate → its activation records. A gate with four activations keeps all four;
 * nothing is collapsed to one line.
 * @returns {Map<number, object[]>}
 */
export function byGate(chart) {
  const grouped = new Map();
  for (const record of records(chart)) {
    if (!grouped.has(record.gate)) grouped.set(record.gate, []);
    grouped.get(record.gate).push(record);
  }
  return grouped;
}

/**
 * Planet → its two sides, so a planet row reads one record per side.
 * @returns {Map<string, { design: object|null, personality: object|null }>}
 */
export function byPlanet(chart) {
  const grouped = new Map();
  for (const record of records(chart)) {
    if (!grouped.has(record.planet)) grouped.set(record.planet, { design: null, personality: null });
    grouped.get(record.planet)[record.side] = record;
  }
  return grouped;
}

/** Fixing states that count toward a denominator. `unknown` never does. */
export const KNOWN_FIXING_STATES = Object.freeze(['exalted', 'detriment', 'juxtaposed', 'none']);

/** How many records carry each fixing state, unknown counted separately. */
export function fixingCounts(list = []) {
  const counts = { exalted: 0, detriment: 0, juxtaposed: 0, none: 0, unknown: 0 };
  for (const record of list) {
    const state = Object.hasOwn(counts, record.fixing) ? record.fixing : 'unknown';
    counts[state] += 1;
  }
  return counts;
}
