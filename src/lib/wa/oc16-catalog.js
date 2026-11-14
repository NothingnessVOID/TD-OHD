// User-supplied reference classification. Structural grouping only; no Powerbase inference.
// OC16 scope: six departments / 32 organizing channels / 64 unique gates.
// The 32 channels are a partition: every gate 1–64 appears exactly once, so gate identity stays global.
// Display order is presentation only. Inside each department the nine organizing-axis channels come
// first (textbook relative order kept), then the remaining channels (textbook relative order kept).
// Endpoint order is not a per-column choice: both ends of every channel read in the site catalog's own
// CHANNELS.gates order (src/lib/human-design/catalog.js), the same order the public reference uses.
// Roles are explicit: department primary (core), personnel 44–26, or support. Re-ordering never
// reassigns a primary channel, and the axis is a separate membership list rather than "one core per department".
import { CHANNELS } from '../human-design/catalog.js';

/** Explicit department primaries. Values are the stable ascending channel ids. */
const PRIMARY_CHANNEL_IDS = Object.freeze(['21-45', '25-51', '2-14', '6-59', '27-50', '3-60']);
const PRIMARY = new Set(PRIMARY_CHANNEL_IDS);
/** Personnel 44–26 sits under management with its own role, not as a generic support channel. */
const PERSONNEL = new Set(['26-44']);

/** Site catalog endpoint order, keyed by the stable ascending channel id. */
const CATALOG_GATES = new Map(CHANNELS.map(channel => [channel.gates.join('-'), Object.freeze([...channel.gates])]));

/** Nine organizing-axis channels: upper Alpha voices, middle labour lines, lower format energies. */
const AXIS_SPECS = Object.freeze([
  Object.freeze({ tier: 'upper', channelIds: Object.freeze(['7-31', '1-8', '13-33']) }),
  Object.freeze({ tier: 'middle', channelIds: Object.freeze(['5-15', '2-14', '29-46']) }),
  Object.freeze({ tier: 'lower', channelIds: Object.freeze(['9-52', '3-60', '42-53']) })
]);

/**
 * Textbook composition per department. `channels` keeps the supplied row order of the channels.
 * management 5 / competition 2 / direction 4 / interaction 8 / logic 8 / innovation 5 = 32.
 */
const DEPARTMENT_SPECS = Object.freeze([
  Object.freeze({ id: 'management', primaryChannelId: '21-45',
    channels: Object.freeze(['21-45', '32-54', '26-44', '19-49', '37-40']) }),
  Object.freeze({ id: 'competition', primaryChannelId: '25-51',
    channels: Object.freeze(['25-51', '10-34']) }),
  Object.freeze({ id: 'direction', primaryChannelId: '2-14',
    channels: Object.freeze(['2-14', '24-61', '23-43', '1-8']) }),
  Object.freeze({ id: 'interaction', primaryChannelId: '6-59',
    channels: Object.freeze(['6-59', '47-64', '11-56', '35-36', '30-41', '42-53', '29-46', '13-33']) }),
  Object.freeze({ id: 'logic', primaryChannelId: '27-50',
    channels: Object.freeze(['27-50', '4-63', '17-62', '16-48', '18-58', '9-52', '5-15', '7-31']) }),
  Object.freeze({ id: 'innovation', primaryChannelId: '3-60',
    channels: Object.freeze(['3-60', '28-38', '20-57', '39-55', '12-22']) })
]);

const ascending = values => [...values].sort((a, b) => a - b);

const axisTier = new Map(AXIS_SPECS.flatMap(({ tier, channelIds }) => channelIds.map(id => [id, tier])));

const pairRecord = (channelId, departmentId) => {
  const gates = Object.freeze(ascending(channelId.split('-').map(Number)));
  return Object.freeze({
    channelId, gates, displayGates: CATALOG_GATES.get(channelId) ?? gates, departmentId,
    role: PRIMARY.has(channelId) ? 'core' : PERSONNEL.has(channelId) ? 'personnel' : 'support',
    axisTier: axisTier.get(channelId) ?? null
  });
};

/** One shared pair object per channel; the axis and the departments reference the same frozen record. */
const PAIRS = new Map();
for (const spec of DEPARTMENT_SPECS) {
  for (const channelId of spec.channels) {
    PAIRS.set(channelId, pairRecord(channelId, spec.id));
  }
}

export const OC16_DEPARTMENTS = Object.freeze(DEPARTMENT_SPECS.map(spec => {
  const textbook = spec.channels.map(channelId => PAIRS.get(channelId));
  const rows = [...textbook.filter(pair => pair.axisTier), ...textbook.filter(pair => !pair.axisTier)];
  return Object.freeze({ id: spec.id, nameKey: `OC16 ${spec.id}`, primaryChannelId: spec.primaryChannelId,
    displayPairs: Object.freeze(rows.map(pair => pair.displayGates)), pairs: Object.freeze(rows) });
}));

/** Left-column reading order: upper 3 → middle 3 → lower 3.
 * Each entry points at the single stable catalog record, so its endpoints follow the catalog order too. */
export const OC16_AXIS = Object.freeze(AXIS_SPECS.flatMap(({ tier, channelIds }) => channelIds.map(channelId => {
  const pair = PAIRS.get(channelId);
  return Object.freeze({ tier, channelId, displayGates: pair.displayGates, pair });
})));

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

/** Legacy analysis output kept for existing consumers: department primary 45–21 plus 人事 44–26.
 * No longer rendered on the organization page; the overview no longer shows a pillar block. */
export const WA_MANAGEMENT_MECHANISM = Object.freeze([
  Object.freeze({ id: 'management', channelId: '21-45',
    displayGates: PAIRS.get('21-45').displayGates, nameKey: 'OC16 management' }),
  Object.freeze({ id: 'personnel', channelId: '26-44',
    displayGates: PAIRS.get('26-44').displayGates, nameKey: 'OC16 personnel' })
]);
