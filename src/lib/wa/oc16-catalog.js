// User-supplied reference classification. Structural grouping only; no Powerbase inference.
// OC16 scope: six departments / 32 organizing channels / 64 unique gates.
// The 32 channels are a partition: every gate 1–64 appears exactly once, so gate identity stays global.
// Display order is presentation only. Inside each department the nine organizing-axis channels come
// first (textbook relative order kept), then the remaining channels (textbook relative order kept).
// Roles are explicit: department primary (core), personnel 44–26, or support. Re-ordering never
// reassigns a primary channel, and the axis is a separate membership list rather than "one core per department".

/** Explicit department primaries. Values are the stable ascending channel ids. */
const PRIMARY_CHANNEL_IDS = Object.freeze(['21-45', '25-51', '2-14', '6-59', '27-50', '3-60']);
const PRIMARY = new Set(PRIMARY_CHANNEL_IDS);
/** Personnel 44–26 sits under management with its own role, not as a generic support channel. */
const PERSONNEL = new Set(['26-44']);

/** Nine organizing-axis channels: upper Alpha voices, middle labour lines, lower format energies. */
const AXIS_SPECS = Object.freeze([
  Object.freeze({ tier: 'upper', displayGates: Object.freeze([7, 31]) }),
  Object.freeze({ tier: 'upper', displayGates: Object.freeze([1, 8]) }),
  Object.freeze({ tier: 'upper', displayGates: Object.freeze([13, 33]) }),
  Object.freeze({ tier: 'middle', displayGates: Object.freeze([5, 15]) }),
  Object.freeze({ tier: 'middle', displayGates: Object.freeze([2, 14]) }),
  Object.freeze({ tier: 'middle', displayGates: Object.freeze([29, 46]) }),
  Object.freeze({ tier: 'lower', displayGates: Object.freeze([9, 52]) }),
  Object.freeze({ tier: 'lower', displayGates: Object.freeze([3, 60]) }),
  Object.freeze({ tier: 'lower', displayGates: Object.freeze([42, 53]) })
]);

/**
 * Textbook composition per department. `pairs` keeps the supplied display order of the two gates.
 * management 5 / competition 2 / direction 4 / interaction 8 / logic 8 / innovation 5 = 32.
 */
const DEPARTMENT_SPECS = Object.freeze([
  Object.freeze({ id: 'management', primaryChannelId: '21-45',
    pairs: Object.freeze([[45, 21], [54, 32], [44, 26], [19, 49], [37, 40]]) }),
  Object.freeze({ id: 'competition', primaryChannelId: '25-51',
    pairs: Object.freeze([[51, 25], [10, 34]]) }),
  Object.freeze({ id: 'direction', primaryChannelId: '2-14',
    pairs: Object.freeze([[14, 2], [61, 24], [43, 23], [8, 1]]) }),
  Object.freeze({ id: 'interaction', primaryChannelId: '6-59',
    pairs: Object.freeze([[59, 6], [64, 47], [11, 56], [35, 36], [30, 41], [53, 42], [29, 46], [13, 33]]) }),
  Object.freeze({ id: 'logic', primaryChannelId: '27-50',
    pairs: Object.freeze([[27, 50], [63, 4], [17, 62], [48, 16], [18, 58], [9, 52], [5, 15], [7, 31]]) }),
  Object.freeze({ id: 'innovation', primaryChannelId: '3-60',
    pairs: Object.freeze([[3, 60], [38, 28], [57, 20], [39, 55], [22, 12]]) })
]);

const ascending = values => [...values].sort((a, b) => a - b);
const channelIdOf = gates => ascending(gates).join('-');

const axisTier = new Map(AXIS_SPECS.map(({ tier, displayGates }) => [channelIdOf(displayGates), tier]));

const pairRecord = (displayGates, departmentId) => {
  const gates = Object.freeze(ascending(displayGates));
  const channelId = gates.join('-');
  return Object.freeze({
    channelId, gates, displayGates: Object.freeze([...displayGates]), departmentId,
    role: PRIMARY.has(channelId) ? 'core' : PERSONNEL.has(channelId) ? 'personnel' : 'support',
    axisTier: axisTier.get(channelId) ?? null
  });
};

/** One shared pair object per channel; the axis and the departments reference the same frozen record. */
const PAIRS = new Map();
for (const spec of DEPARTMENT_SPECS) {
  for (const displayGates of spec.pairs) {
    const pair = pairRecord(displayGates, spec.id);
    PAIRS.set(pair.channelId, pair);
  }
}

export const OC16_DEPARTMENTS = Object.freeze(DEPARTMENT_SPECS.map(spec => {
  const textbook = spec.pairs.map(displayGates => PAIRS.get(channelIdOf(displayGates)));
  const rows = [...textbook.filter(pair => pair.axisTier), ...textbook.filter(pair => !pair.axisTier)];
  return Object.freeze({ id: spec.id, nameKey: `OC16 ${spec.id}`, primaryChannelId: spec.primaryChannelId,
    displayPairs: Object.freeze(rows.map(pair => pair.displayGates)), pairs: Object.freeze(rows) });
}));

/** Left-column reading order: upper 3 → middle 3 → lower 3.
 * Each entry carries its own endpoint display order (the axis reading order), while the pair object
 * stays the single stable catalog record used by analysis, statistics and detail links. */
export const OC16_AXIS = Object.freeze(AXIS_SPECS.map(({ tier, displayGates }) => {
  const channelId = channelIdOf(displayGates);
  return Object.freeze({ tier, channelId, displayGates: Object.freeze([...displayGates]), pair: PAIRS.get(channelId) });
}));

export const OC16_PAIR_TOTAL = PAIRS.size;
/** Unique gates across all 32 channels (each gate belongs to exactly one channel). */
export const OC16_GATE_TOTAL = new Set([...PAIRS.values()].flatMap(pair => pair.gates)).size;
export const OC16_AXIS_PAIR_TOTAL = OC16_AXIS.length;
export const OC16_AXIS_GATE_TOTAL = new Set(OC16_AXIS.flatMap(row => row.pair.gates)).size;
export const OC16_PRIMARY_CHANNEL_IDS = PRIMARY_CHANNEL_IDS;

/** Stable ascending catalog lookup. Legacy reading-package aliases are resolved by org-role-readings. */
export function oc16Pair(channelId) {
  return typeof channelId === 'string' ? PAIRS.get(channelId) ?? null : null;
}

export function oc16Department(id) {
  return OC16_DEPARTMENTS.find(department => department.id === id) ?? null;
}

const PAIR_BY_GATE = new Map([...PAIRS.values()].flatMap(pair => pair.gates.map(gate => [gate, pair])));

/** Every gate belongs to exactly one catalog channel. */
export function oc16PairForGate(gate) {
  return PAIR_BY_GATE.get(Number(gate)) ?? null;
}

/** Four pillars (overview): department primary 45–21 plus 人事 44–26 (replaces the old four single-gate pillars). */
export const WA_MANAGEMENT_MECHANISM = Object.freeze([
  Object.freeze({ id: 'management', channelId: '21-45',
    displayGates: Object.freeze([45, 21]), nameKey: 'OC16 management' }),
  Object.freeze({ id: 'personnel', channelId: '26-44',
    displayGates: Object.freeze([44, 26]), nameKey: 'OC16 personnel' })
]);
