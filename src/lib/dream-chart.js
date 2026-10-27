/**
 * DreamRave (sleep chart) calculation.
 *
 * The waking chart derives its Design side from the Sun 88 degrees before birth.
 * The sleeping design keeps the Personality side exactly as it is at birth and
 * replaces the Design side with a lunar one: the moment the Moon stood 88
 * degrees earlier on its own arc, roughly six and a half days before birth.
 * Only the fifteen dream gates exist in that graph, so every activation is
 * filtered through the dream topology before it is displayed.
 *
 * The engine exposes no lunar-arc solver, so the instant is found here with a
 * Newton iteration over the same transit snapshot call the Transits view uses.
 * Both sides read longitude from one ephemeris, which keeps the solve
 * self-consistent regardless of the engine's internal time scale.
 */

import { sharpProvider } from './chart-engine/sharp-provider.js';
import { DREAM_CHANNELS, DREAM_GATES, DREAM_REALMS, DREAM_REALM_ORDER, dreamRealmOf, isDreamGate } from './human-design/dream-topology.js';

export const DREAM_LUNAR_ARC = 88;
/** Mean lunar motion; only seeds the iteration, the ephemeris does the work. */
const MEAN_LUNAR_RATE_PER_DAY = 13.176358;
const MS_PER_DAY = 86_400_000;
/** ~0.4 milliarcsecond, far below ephemeris and gate-boundary precision. */
const SOLVE_TOLERANCE_DEG = 1e-7;
const SOLVE_MAX_STEPS = 40;

const wrap360 = value => ((value % 360) + 360) % 360;
/** Signed shortest difference, in (-180, 180]. */
const signedDelta = (from, to) => ((from - to + 540) % 360) - 180;

const defaultSnapshotAt = instant => sharpProvider.calculateTransitSnapshot(instant);

/**
 * Solve for the instant whose Moon longitude sits `arc` degrees behind
 * `natalMoonLongitude`. Returns the instant and the snapshot taken there, so the
 * caller does not pay for a second ephemeris pass.
 *
 * @param {object} options
 * @param {number} options.birthUtc - birth instant, UTC milliseconds
 * @param {number} options.natalMoonLongitude - Moon longitude at birth, degrees
 * @param {number} [options.arc] - lunar arc to walk back, degrees
 * @param {(instant:number)=>Promise<object>} [options.snapshotAt] - activation snapshot for one instant; injectable for tests
 * @returns {Promise<{instant:number, snapshot:object, steps:number, residualDegrees:number}>}
 */
export async function solveLunarArcInstant({ birthUtc, natalMoonLongitude, arc = DREAM_LUNAR_ARC, snapshotAt = defaultSnapshotAt }) {
  if (!Number.isFinite(birthUtc)) throw new RangeError('Dream chart needs a resolved birth instant');
  if (!Number.isFinite(natalMoonLongitude)) throw new RangeError('Dream chart needs the natal Moon longitude');
  const target = wrap360(natalMoonLongitude - arc);
  let instant = birthUtc - (arc / MEAN_LUNAR_RATE_PER_DAY) * MS_PER_DAY;
  let residual = Infinity;
  let snapshot = null;
  let calls = 0;
  for (let steps = 0; steps < SOLVE_MAX_STEPS; ++steps) {
    snapshot = await snapshotAt(instant);
    ++calls;
    const longitude = snapshot?.moon?.longitude;
    if (!Number.isFinite(longitude)) throw new Error('Lunar arc solve needs a Moon longitude in the snapshot');
    residual = signedDelta(longitude, target);
    if (Math.abs(residual) <= SOLVE_TOLERANCE_DEG) break;
    // The local rate is unknown, so step with the mean rate; the correction
    // shrinks by at least an order of magnitude on every pass.
    instant -= (residual / MEAN_LUNAR_RATE_PER_DAY) * MS_PER_DAY;
  }
  if (Math.abs(residual) > 1e-4) {
    throw new Error(`Lunar arc solve did not converge (residual ${residual.toExponential(2)}°)`);
  }
  // Counted from the ephemeris calls, not the loop index, so the exhausted-loop
  // path reports the real number instead of one past it.
  return { instant, snapshot, steps: calls, residualDegrees: residual };
}

/** The three channels that define the Sacral in the sleep design. */
const SACRAL_DREAM_CHANNELS = Object.freeze(['5-15', '27-50', '42-53']);
/** Sacral to G to Throat. */
const SACRAL_TO_THROAT = Object.freeze(['5-15', '1-8']);
/** Root to Spleen to Throat; the Spleen only bridges here. */
const ROOT_TO_THROAT = Object.freeze(['28-38', '20-57']);

/** `"a-b"`, `[a, b]` and the catalogue's own order all collapse to one key. */
function channelTypeKey(gates) {
  const pair = typeof gates === 'string' ? gates.split('-') : gates;
  return pair.map(Number).sort((a, b) => a - b).join('-');
}

/**
 * Sleep types, judged by the dream channels that complete rather than by the
 * centres they light up.
 *
 * The teacher's material defines the five sleep types mechanically, by channel:
 * no dream channel at all is a Dream Reflector (over 67% of people); a defined
 * Sacral is a Dream Generator; a Sacral open with no motor reaching the Throat
 * is a Dream Projector; the Root reaching the Throat through the Spleen
 * (28-38 + 20-57) with the Sacral open is a Dream Manifestor; and a motor
 * reaching the Throat with the Sacral defined is a Dream Manifesting Generator.
 *
 * The dream topology keeps five centres, so the Throat is only reachable from
 * the G centre (1-8) or the Spleen (20-57), and the Spleen is a bridge, not a
 * motor. Two motor-to-Throat paths therefore exist: Sacral - G - Throat
 * (5-15 + 1-8) and Root - Spleen - Throat (28-38 + 20-57). The teacher's own
 * sentence settles the case both paths are complete: "a motor (Sacral or Root)
 * connected to the Throat, with the Sacral defined" is a Manifesting Generator,
 * so a defined Sacral always wins over the Root-only path.
 *
 * @param {Iterable<object|string>} completedChannels - the dream channels that
 *   complete in this sleep design: catalogue channel objects (`{ gates }`) or
 *   `"a-b"` keys, in either gate order
 * @returns {'reflector'|'generator'|'projector'|'manifestor'|'manifestingGenerator'}
 */
export function dreamTypeOf(completedChannels) {
  const complete = new Set();
  for (const item of completedChannels || []) {
    if (typeof item === 'string') complete.add(channelTypeKey(item));
    else if (item?.gates) complete.add(channelTypeKey(item.gates));
  }
  if (!complete.size) return 'reflector';
  const has = key => complete.has(key);
  const sacralDefined = SACRAL_DREAM_CHANNELS.some(has);
  const motorToThroat = SACRAL_TO_THROAT.every(has) || ROOT_TO_THROAT.every(has);
  // Sacral first: a defined Sacral with a motor reaching the Throat is the
  // Manifesting Generator even when the Root is what actually reaches it.
  if (sacralDefined) return motorToThroat ? 'manifestingGenerator' : 'generator';
  // Sacral open: only the Root path can still manifest.
  if (ROOT_TO_THROAT.every(has)) return 'manifestor';
  return 'projector';
}

const DREAM_TYPE_NAMES = {
  generator: 'Generator',
  projector: 'Projector',
  reflector: 'Reflector',
  manifestor: 'Manifestor',
  // The waking chart spells this one out; the sleep chart keeps the same words
  // so `typeName()` in the display vocabulary still resolves it.
  manifestingGenerator: 'Manifesting Generator'
};
export const dreamTypeName = id => DREAM_TYPE_NAMES[id] || id;

/** Keep only the dream gates, preserving the engine's planet keys and lines. */
function filterDreamActivations(activations) {
  const kept = {};
  for (const [planet, value] of Object.entries(activations || {})) {
    if (value && isDreamGate(value.gate)) kept[planet] = value;
  }
  return kept;
}

const gatesByNumber = activations => {
  const map = new Map();
  for (const [planet, value] of Object.entries(activations)) {
    if (!map.has(value.gate)) map.set(value.gate, []);
    map.get(value.gate).push({ planet, line: value.line, color: value.color, tone: value.tone, base: value.base });
  }
  return map;
};

/**
 * Build the sleep design from an already-computed waking chart.
 *
 * @param {object} chart - adaptSharpChart() result (currentData.chart)
 * @param {object} [options]
 * @param {number} [options.transitInstant] - moment for the always-on night sky overlay; omit for "now"
 * @param {boolean} [options.transit] - pass false to skip the night sky entirely (comparison mode)
 * @param {object} [options.design] - a previously solved lunar arc ({instant, snapshot, ...}) to reuse
 * @param {(instant:number)=>Promise<object>} [options.snapshotAt] - activation snapshot for one instant; injectable for tests
 * @returns {Promise<object>} dream chart model
 */
export async function computeDreamChart(chart, options = {}) {
  const natalMoon = chart?.positions?.personality?.moon;
  const birthUtcIso = chart?.raw?.birthUtc;
  if (!natalMoon || !birthUtcIso) throw new Error('Dream chart needs a computed birth chart');
  const birthUtc = Date.parse(birthUtcIso);
  const snapshotAt = options.snapshotAt || defaultSnapshotAt;

  // The lunar arc depends only on the birth data, so a caller that already
  // solved it can pass it back and pay only for the night sky.
  const design = options.design || await solveLunarArcInstant({
    birthUtc,
    natalMoonLongitude: natalMoon.longitude,
    snapshotAt
  });
  const designActivations = filterDreamActivations(design.snapshot);
  const personalityActivations = filterDreamActivations(chart.gates?.personality);

  const personality = gatesByNumber(personalityActivations);
  const designGates = gatesByNumber(designActivations);
  const activeGates = new Set([...personality.keys(), ...designGates.keys()]);
  const channels = DREAM_CHANNELS.filter(channel => channel.gates.every(gate => activeGates.has(gate)));
  const definedCenters = new Set(channels.flatMap(channel => channel.centers));
  // The teacher's definitions are per channel, not per centre: the same five
  // defined centres can be a Generator or a Manifesting Generator depending on
  // which motor actually reaches the Throat.
  const typeId = dreamTypeOf(channels);

  const wantsTransit = options.transit !== false;
  const transitInstant = options.transitInstant ?? Date.now();
  const transitSnapshot = wantsTransit ? await snapshotAt(transitInstant) : null;
  const transitActivations = filterDreamActivations(transitSnapshot);
  const transitGates = new Set(Object.values(transitActivations).map(value => value.gate));
  const transitByNumber = gatesByNumber(transitActivations);
  const transitChannels = DREAM_CHANNELS.filter(channel =>
    channel.gates.every(gate => activeGates.has(gate) || transitGates.has(gate)));
  const transitDefinedCenters = new Set(transitChannels.flatMap(channel => channel.centers));

  return {
    contractVersion: 'dream-v1',
    lunarArc: DREAM_LUNAR_ARC,
    natalMoonLongitude: natalMoon.longitude,
    // Kept on the model so a later call can reuse the solve instead of
    // re-walking the lunar arc for the same birth data.
    solve: design,
    designMoment: {
      utc: design.instant,
      iso: new Date(design.instant).toISOString(),
      daysBeforeBirth: (birthUtc - design.instant) / MS_PER_DAY,
      solveSteps: design.steps,
      residualDegrees: design.residualDegrees
    },
    gates: {
      personality: personalityActivations,
      design: designActivations,
      transit: transitActivations,
      byNumber: { personality, design: designGates, transit: transitByNumber },
      all: [...activeGates].sort((a, b) => a - b),
      everyDreamGate: DREAM_GATES
    },
    channels,
    centers: {
      definedNames: [...definedCenters].sort(),
      defined: definedCenters
    },
    type: { id: typeId, name: dreamTypeName(typeId) },
    wakingType: { id: chart.calculation?.type?.id || null, name: chart.type?.name || null },
    transit: wantsTransit ? {
      instant: transitInstant,
      iso: new Date(transitInstant).toISOString(),
      gates: transitGates,
      channels: transitChannels,
      definedCenters: transitDefinedCenters,
      // Night sky over the sleeping design: both sources are always shown.
      mode: 'overlay'
    } : null,
    realms: DREAM_REALM_ORDER.map(realm => buildRealm(realm, { personality, design: designGates, transitGates, transitActivations, activeGates })),
    // Comparison mode renders the sleeping design on its own, so the night sky
    // is absent rather than empty; views check this before offering it.
    hasTransit: wantsTransit,
    source: { personalityDate: chart.positions?.personality?.date || null, designSolarArc: chart.meta?.designSolarArc ?? 88 }
  };
}

function buildRealm(realmId, { personality, design, transitGates, transitActivations, activeGates }) {
  const realm = DREAM_REALMS[realmId];
  const transitByGate = new Map();
  for (const [planet, value] of Object.entries(transitActivations)) {
    if (!transitByGate.has(value.gate)) transitByGate.set(value.gate, []);
    transitByGate.get(value.gate).push({ planet, line: value.line });
  }
  const rows = realm.gates
    .map(gate => ({
      gate,
      portal: gate === realm.portal,
      realm: realmId,
      activated: activeGates.has(gate),
      transitActivated: transitGates.has(gate),
      personality: personality.get(gate) || [],
      design: design.get(gate) || [],
      transit: transitByGate.get(gate) || []
    }))
    .filter(row => row.activated || row.transitActivated || row.portal);
  return { id: realmId, portal: realm.portal, gates: realm.gates, rows };
}

/**
 * Shape the dream model into the contract renderBodygraph() already consumes,
 * so the shared renderer needs no dream-specific branching.
 */
export function dreamGraphChart(dream) {
  return {
    gates: {
      personality: dream.gates.personality,
      design: dream.gates.design,
      all: dream.gates.all
    },
    channels: dream.channels,
    centers: { definedNames: dream.centers.definedNames },
    type: { name: dream.type.name },
    positions: {
      personality: { date: dream.source.personalityDate },
      design: { date: dream.designMoment.iso.slice(0, 10) }
    }
  };
}

/** The two halves of a sleeping design, in the order the night fields list them. */
const SLEEP_SIDES = Object.freeze(['personality', 'design']);

const halvesOf = (model, gate) => ({
  personality: model?.gates?.byNumber?.personality?.get(gate) || [],
  design: model?.gates?.byNumber?.design?.get(gate) || []
});

/**
 * Two sleeping designs read as one set of night fields.
 *
 * The composite carries no overlay, so these rows group by owner instead of by
 * activation source: one entry per person and per half of their sleeping design,
 * which means a gate both people carry shows both sets of planets and a gate one
 * person carries in both halves shows both of that person's groups. The shape is
 * the one `computeDreamChart()` returns (`{ realms: [{ id, portal, gates, rows }] }`),
 * so `realmPanel()` reads this exactly as it reads a single design and the
 * two-person page needs no second panel component.
 *
 * `activated` stays "either person", which is what the portal highlight and the
 * row filter read; `owner` (`'a'` / `'b'` / `'both'`) is added on top for the
 * grouping. Both inputs are `computeDreamChart({ transit: false })` results, so
 * `transitActivated` is always false and no night sky can leak in.
 *
 * Pure: it reads the two models and allocates new rows, never the waking chart
 * and never `Date.now()`.
 *
 * @param {object} a - person A's sleep model
 * @param {object} b - person B's sleep model
 * @returns {{realms: object[]}} the `realms` array shape of a sleep model
 */
export function buildCompositeRealms(a, b) {
  return {
    realms: DREAM_REALM_ORDER.map(realmId => {
      const realm = DREAM_REALMS[realmId];
      const rows = realm.gates
        .map(gate => {
          const byPerson = { a: halvesOf(a, gate), b: halvesOf(b, gate) };
          const carries = person => SLEEP_SIDES.some(side => byPerson[person][side].length > 0);
          const fromA = carries('a');
          const fromB = carries('b');
          const sources = ['a', 'b'].flatMap(person => SLEEP_SIDES
            .filter(side => byPerson[person][side].length > 0)
            .map(side => ({
              person,
              side,
              key: `${person}-${side}`,
              // An i18n key, not a rendered label: the view owns `t()`.
              label: side === 'design' ? 'Sleep design' : 'Sleep personality',
              entries: byPerson[person][side].map(({ planet, line }) => ({ planet, line }))
            })));
          return {
            gate,
            portal: gate === realm.portal,
            realm: realmId,
            activated: fromA || fromB,
            transitActivated: false,
            owner: fromA && fromB ? 'both' : fromA ? 'a' : fromB ? 'b' : null,
            sources
          };
        })
        .filter(row => row.portal || row.activated);
      return { id: realmId, portal: realm.portal, gates: realm.gates, rows };
    })
  };
}

/**
 * Transit model over the dream topology. Mirrors buildTransitGraph(), but the
 * channel set is the six dream channels, so a waking channel can never light up
 * the sleeping graph.
 */
export function buildDreamTransitGraph(dream, mode = 'overlay') {
  const natalGates = new Set(dream.gates.all);
  const transitGates = dream.transit?.gates || new Set();
  const activeGates = mode === 'transit-only' ? new Set(transitGates) : new Set([...natalGates, ...transitGates]);
  const channels = DREAM_CHANNELS.filter(channel => channel.gates.every(gate => activeGates.has(gate)));
  const natalCenters = new Set(dream.centers.definedNames);
  const definedCenters = new Set(channels.flatMap(channel => channel.centers));
  const gateSource = gate => mode === 'transit-only'
    ? transitGates.has(gate) ? 'transit' : 'inactive'
    : natalGates.has(gate) ? transitGates.has(gate) ? 'both' : 'natal'
      : transitGates.has(gate) ? 'transit' : 'inactive';
  const channelSource = channel => mode === 'transit-only' ? 'transit'
    : channel.gates.every(gate => natalGates.has(gate)) ? 'natal'
      : channel.gates.every(gate => !natalGates.has(gate)) ? 'transit' : 'completed';
  return { mode, natalGates, transitGates, activeGates, channels, natalCenters, definedCenters, gateSource, channelSource };
}

/** Which dream realm a gate belongs to, exposed for views and tests. */
export { dreamRealmOf };
