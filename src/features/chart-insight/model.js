/**
 * Chart insight model — pure derivations for the right-column dashboard.
 *
 * This module reads the already-computed chart object and returns plain data.
 * It never touches the DOM, never reads a locale, and never calls a knowledge
 * lookup. Rendering, translation and detail navigation belong to view.js and
 * chart.js.
 *
 * Circuit classification is imported from lib/circuit-topology.js, which is the
 * single source for the product taxonomy. Nothing here re-declares groups or
 * corrections.
 */
import { CHANNELS, CENTERS, GATES } from '../../lib/human-design/catalog.js';
import { CIRCUIT_GROUPS, channelCircuit } from '../../lib/circuit-topology.js';

/**
 * Every catalog channel with its canonical classification.
 *
 * `channelCircuit` takes a channel object and returns `{ group, circuit }`, where
 * `circuit` is the subcircuit id. It also owns the 10-34 / 20-57 corrections, so
 * the engine catalog's own `circuit` field is never consulted here.
 */
export const CANONICAL_CHANNELS = Object.freeze(CHANNELS.map(channel => {
  const { group, circuit } = channelCircuit(channel);
  return Object.freeze({
    key: channel.gates.join('-'),
    gates: Object.freeze([...channel.gates]),
    name: channel.name,
    theme: channel.theme,
    centers: Object.freeze([...channel.centers]),
    subcircuit: circuit,
    group
  });
}));

const channelByKey = new Map(CANONICAL_CHANNELS.map(channel => [channel.key, channel]));

/** Canonical classification for one channel key, or null when the channel is unknown. */
export function canonicalChannel(key) {
  return channelByKey.get(key) ?? null;
}

/** Gate -> { design: Set, personality: Set } for the two birth sides only. */
function sideActivation(chart) {
  const map = new Map();
  for (const side of ['design', 'personality']) {
    for (const activation of Object.values(chart?.gates?.[side] ?? {})) {
      const gate = Number(activation?.gate);
      if (!Number.isInteger(gate) || gate < 1 || gate > 64) continue;
      const entry = map.get(gate) ?? { design: new Set(), personality: new Set() };
      entry[side].add(activation.planet ?? '');
      map.set(gate, entry);
    }
  }
  return map;
}

/**
 * Per-gate birth state. `source` is the only colour axis: design, personality,
 * both, or inactive. Circuit membership is never folded into this value.
 *
 * Activation comes from the per-side records, so a gate is only marked active
 * when a real design or personality activation exists for it.
 */
export function gateMap(chart) {
  const active = sideActivation(chart);
  const gates = [];
  for (let gate = 1; gate <= 64; gate += 1) {
    const sides = active.get(gate);
    const design = Boolean(sides?.design.size);
    const personality = Boolean(sides?.personality.size);
    gates.push({
      gate,
      design,
      personality,
      source: design && personality ? 'both' : design ? 'design' : personality ? 'personality' : 'inactive',
      center: GATES[String(gate)]?.center ?? null,
      groups: [...new Set(
        CANONICAL_CHANNELS.filter(channel => channel.gates.includes(gate)).map(channel => channel.group)
      )]
    });
  }
  return gates;
}

/**
 * Channel candidates across all 36 catalog channels.
 *
 * A channel counts as complete only when the chart itself lists it in
 * `chart.channels`, matched by its canonical gate key. That keeps this module
 * agreeing with the engine's own definition channel set. `activeGates` still
 * counts the two endpoints from `chart.gates.all`, which is what decides the
 * single-ended candidates.
 */
export function channelCandidates(chart) {
  const active = new Set((chart?.gates?.all ?? []).map(Number));
  const completeKeys = new Set((chart?.channels ?? []).map(channel => channel.gates.join('-')));
  return CANONICAL_CHANNELS.map(channel => {
    const activeGates = channel.gates.filter(gate => active.has(gate)).length;
    const complete = completeKeys.has(channel.key);
    return {
      ...channel,
      activeGates,
      complete,
      status: complete ? 'complete' : activeGates === 1 ? 'single' : 'inactive'
    };
  });
}

/**
 * Circuit groups with their own channel and gate counts.
 *
 * `channels` counts complete channels in the chart for that group, so group
 * totals sum to chart.channels.length. `gates` counts distinct active endpoints
 * among the group's own channels; one gate can belong to several subcircuits, so
 * these gate counts deliberately do not sum to the whole-chart gate total.
 */
export function circuitBreakdown(chart) {
  const candidates = channelCandidates(chart);
  const active = new Set((chart?.gates?.all ?? []).map(Number));
  return Object.keys(CIRCUIT_GROUPS).map(group => {
    const members = candidates.filter(channel => channel.group === group);
    const complete = members.filter(channel => channel.status === 'complete');
    const single = members.filter(channel => channel.status === 'single');
    const subcircuits = CIRCUIT_GROUPS[group].map(subcircuit => {
      const own = members.filter(channel => channel.subcircuit === subcircuit);
      const ownGates = new Set(own.flatMap(channel => channel.gates));
      return {
        id: subcircuit,
        total: own.length,
        complete: own.filter(channel => channel.status === 'complete').length,
        single: own.filter(channel => channel.status === 'single').length,
        activeGates: [...ownGates].filter(gate => active.has(gate)).length,
        channels: own
      };
    });
    const gates = new Set(members.flatMap(channel => channel.gates));
    return {
      group,
      total: members.length,
      complete: complete.length,
      single: single.length,
      activeGates: [...gates].filter(gate => active.has(gate)).length,
      totalGates: gates.size,
      subcircuits,
      channels: members
    };
  });
}

/**
 * Center definition split for the nine centers.
 *
 * `chart.centers.defined / undefined / open` are the real arrays; `centerStates`
 * is a keyed object (not a list) and is only used as a fallback for the status of
 * a center that is missing from those arrays.
 */
export function centerBreakdown(chart) {
  const names = list => (list ?? []).map(entry => (typeof entry === 'string' ? entry : entry?.key)).filter(Boolean);
  const definedNames = names(chart?.centers?.defined);
  const undefinedNames = names(chart?.centers?.undefined);
  const openNames = names(chart?.centers?.open);
  const statusByName = new Map();
  for (const [key, value] of Object.entries(chart?.centerStates ?? {})) {
    statusByName.set(key, value?.defined ? 'defined' : 'undefined');
  }
  const centers = Object.keys(CENTERS).map(center => {
    if (definedNames.includes(center)) return { center, status: 'defined' };
    if (openNames.includes(center)) return { center, status: 'open' };
    if (undefinedNames.includes(center)) return { center, status: 'undefined' };
    // Last resort: a center present only in centerStates.
    return { center, status: statusByName.get(center) === 'defined' ? 'defined' : 'undefined' };
  });
  return {
    total: 9,
    defined: definedNames,
    undefined: undefinedNames,
    open: openNames,
    definedCount: centers.filter(center => center.status === 'defined').length,
    undefinedCount: centers.filter(center => center.status === 'undefined').length,
    openCount: centers.filter(center => center.status === 'open').length,
    centers
  };
}

const PLANET_ORDER = Object.freeze([
  'sun', 'earth', 'northNode', 'southNode', 'moon', 'mercury',
  'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
]);

/**
 * Planet activation counts. Only real activations are counted, so the maximum is
 * 13 per side. A neutral fixing is reported as neutral; it is never relabelled
 * as unknown.
 */
export function planetBreakdown(chart) {
  const rows = PLANET_ORDER.map(planet => {
    const design = chart?.gates?.design?.[planet] ?? null;
    const personality = chart?.gates?.personality?.[planet] ?? null;
    return { planet, design, personality };
  });
  return {
    planets: rows,
    totalPlanets: PLANET_ORDER.length,
    designCount: rows.filter(row => row.design?.gate).length,
    personalityCount: rows.filter(row => row.personality?.gate).length,
    designDate: chart?.positions?.design?.date ?? null,
    personalityDate: chart?.positions?.personality?.date ?? null
  };
}

/** The four Variable arrows, kept in their canonical order, with their full reading data. */
export function variableBreakdown(chart) {
  const variable = chart?.variable ?? {};
  const slots = [
    { kind: 'determination', side: 'design' },
    { kind: 'environment', side: 'design' },
    { kind: 'motivation', side: 'personality' },
    { kind: 'perspective', side: 'personality' }
  ];
  return {
    notation: variable.notation ?? null,
    arrows: slots.map(({ kind, side }) => {
      const slot = variable[kind] ?? null;
      return {
        kind,
        side,
        // The raw slot is kept so the view can translate through vocabulary()
        // instead of printing the engine's English name.
        slot,
        direction: slot?.direction ?? slot?.arrow ?? null,
        name: slot?.name ?? null,
        valueId: slot?.valueId ?? null,
        color: slot?.color ?? null,
        tone: slot?.tone ?? null,
        base: slot?.base ?? null,
        cognition: slot?.cognition?.name ?? null,
        cognitionDescription: slot?.cognition?.description ?? null
      };
    })
  };
}

/**
 * Incarnation cross identity, its four gates with their positions, and quarter/theme.
 *
 * `geneKeys` is the raw Activation Sequence already computed for this chart. It is
 * passed through untouched: the Gene Keys terms are translated in the view, and no
 * prose is copied or re-derived here.
 */
export function crossBreakdown(chart, geneKeys = null) {
  const cross = chart?.incarnationCross ?? null;
  const sequence = geneKeys?.activationSequence ?? null;
  if (!cross) {
    return { name: null, fullName: null, angle: null, gates: [], rawId: null, quarterGate: null, theme: null, geneKeys: sequence, raw: null };
  }
  return {
    name: cross.name ?? null,
    fullName: cross.fullName ?? null,
    angle: cross.angleName ?? null,
    gates: [...(cross.gates ?? [])],
    gateNames: [...(cross.gateNames ?? [])],
    rawId: cross.rawId ?? null,
    // The quarter comes from the Personality Sun gate, as the previous panel read it.
    quarterGate: chart?.gates?.personality?.sun?.gate ?? null,
    theme: cross.theme ?? null,
    geneKeys: sequence,
    // Raw cross kept for the view's own crossName() translation.
    raw: cross
  };
}

/** Everything the overview needs, derived once per render. */
export function buildInsightModel(chart, { geneKeys = null } = {}) {
  if (!chart) return null;
  const gateEntries = gateMap(chart);
  return {
    gateMap: gateEntries,
    channels: channelCandidates(chart),
    circuits: circuitBreakdown(chart),
    centers: centerBreakdown(chart),
    planets: planetBreakdown(chart),
    variable: variableBreakdown(chart),
    cross: crossBreakdown(chart, geneKeys),
    identity: {
      typeId: chart.calculation?.type?.id ?? chart.type?.id ?? null,
      typeName: chart.type?.name ?? null,
      strategy: chart.type?.strategy ?? null,
      signature: chart.type?.signature ?? null,
      notSelf: chart.type?.notSelf ?? null,
      authorityId: chart.calculation?.authority?.id ?? chart.authority?.id ?? null,
      authorityName: chart.authority?.name ?? null,
      definition: chart.definition ?? null,
      profileId: chart.profile?.id ?? null,
      profileNumbers: chart.profile?.numbers ?? null,
      profileName: chart.profile?.name ?? null
    },
    totals: {
      activeGates: gateEntries.filter(entry => entry.source !== 'inactive').length,
      designGates: gateEntries.filter(entry => entry.source === 'design').length,
      personalityGates: gateEntries.filter(entry => entry.source === 'personality').length,
      bothGates: gateEntries.filter(entry => entry.source === 'both').length,
      completeChannels: channelCandidates(chart).filter(channel => channel.complete).length,
      definedCenters: centerBreakdown(chart).definedCount
    }
  };
}
