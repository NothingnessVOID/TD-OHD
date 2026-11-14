/**
 * DreamRave (sleep chart) topology.
 *
 * The sleeping design keeps five of the nine centres and fifteen of the
 * sixty-four gates. Its six channels are a subset of the waking channel
 * catalogue, so structural identity stays shared with catalog.js: gate numbers,
 * channel pairs and centre keys are the same stable IDs everywhere, and only the
 * display vocabulary differs (see the `dream*` functions in each locale provider).
 *
 * Three of the fifteen gates carry no channel in the sleep design. They are the
 * portals of the three night fields and are drawn floating, without the waking
 * half-channel path that would otherwise dangle toward a removed centre.
 *
 * Provenance: Ra Uru Hu, DreamRave / Night Forces. Topology cross-checked against
 * jovianarchive.com "Understanding Dreams with Human Design" and two independent
 * DreamRave gate lists. Terms recorded in THIRD_PARTY_NOTICES.md.
 */

import { CHANNELS } from './catalog.js';

/** Centres that stay online while asleep, in the standard bodygraph key space. */
export const DREAM_CENTER_KEYS = Object.freeze(['throat', 'g', 'spleen', 'sacral', 'root']);

/** Centre reveal order, using the geometry shape keys. Top-to-bottom as drawn. */
export const DREAM_CENTER_ORDER = Object.freeze(['Throat', 'G', 'Spleen', 'Sacral', 'Root']);

/** The three night programming fields, each entered through one portal gate. */
export const DREAM_REALMS = Object.freeze({
  // Personality crystal: programming of the conscious side.
  light: Object.freeze({ id: 'light', portal: 62, gates: Object.freeze([62, 20, 57, 8, 1]) }),
  // Collective field of waking humanity: homogenization.
  earth: Object.freeze({ id: 'earth', portal: 12, gates: Object.freeze([12, 27, 50, 5, 15]) }),
  // Design crystal: programming of the unconscious body.
  demon: Object.freeze({ id: 'demon', portal: 19, gates: Object.freeze([19, 53, 42, 38, 28]) })
});

export const DREAM_REALM_ORDER = Object.freeze(['light', 'earth', 'demon']);

/** gate -> realm id. Built once; the three realms partition the fifteen gates. */
export const DREAM_REALM_OF_GATE = Object.freeze(Object.fromEntries(
  DREAM_REALM_ORDER.flatMap(realm => DREAM_REALMS[realm].gates.map(gate => [gate, realm]))
));

export const DREAM_PORTAL_GATES = Object.freeze(DREAM_REALM_ORDER.map(realm => DREAM_REALMS[realm].portal));

/** The fifteen sleep gates, sorted for stable display and comparison. */
export const DREAM_GATES = Object.freeze(
  Object.keys(DREAM_REALM_OF_GATE).map(Number).sort((a, b) => a - b)
);

const DREAM_GATE_SET = new Set(DREAM_GATES);
const PORTAL_SET = new Set(DREAM_PORTAL_GATES);

/**
 * Portals keep a stub instead of their full waking half-channel.
 *
 * Each portal's waking channel reaches a centre the sleep design removes
 * (12 to 22 and 19 to 49 in the Solar Plexus, 62 to 17 in the Ajna), so the
 * full path would hang ~286 and ~157 units out over empty space. The stub keeps
 * the original direction and the catalog's 17.4-unit bar width and is cut to
 * the length gate 62's own path already has, leaving just a mouth off the gate.
 *
 * Gate 62 needs no override: its waking path is already 51.2 units long.
 * Derived by `node dev/measure-dream-viewbox.mjs` from the static geometry.
 */
export const DREAM_PORTAL_STUB_LENGTH = 51.2;
export const DREAM_PORTAL_STUBS = Object.freeze({
  12: 'M504.91,506.85L478.12,463.22L493.25,454.63L520.04,498.26Z',
  19: 'M534.55,1174.88L494,1206.14L485.49,1191L526.04,1159.74Z'
});

/**
 * Channels that can complete in the sleep design. Reuses the waking channel
 * objects, so `centers`, `name` and circuit metadata stay single-sourced.
 */
export const DREAM_CHANNELS = Object.freeze(
  CHANNELS.filter(channel => channel.gates.every(gate => DREAM_GATE_SET.has(gate)))
);

const DREAM_CHANNEL_KEYS = new Set(DREAM_CHANNELS.map(channel => channel.gates.join('-')));

/**
 * Gates that draw a half-channel path. Every dream gate does: the twelve
 * channelled gates draw their waking path, and the three portals draw a stub
 * (two of them overridden above, gate 62 already short enough).
 */
export const DREAM_PATH_GATES = Object.freeze([...DREAM_GATES]);

export const dreamRealmOf = gate => DREAM_REALM_OF_GATE[gate] || null;
export const isDreamGate = gate => DREAM_GATE_SET.has(gate);
export const isDreamPortal = gate => PORTAL_SET.has(gate);
export const dreamChannelKey = channel => channel.gates.join('-');
export const isDreamChannelKey = key => DREAM_CHANNEL_KEYS.has(key);

/**
 * Measured extent of the geometry this graph actually draws: the five centre
 * shapes, all fifteen half-channel paths (portals truncated to their stubs),
 * both integration span segments (20-57 is a dream channel) and every gate
 * circle at its largest ring. Reproduce with `node dev/measure-dream-viewbox.mjs`.
 *
 * The graph is drawn rotated, so this is the post-rotation box: the upright
 * content measures 8.25 350.14 526.3 946.13, and the renderer adds its own
 * 16-unit padding on every side before rotating.
 */
export const DREAM_VIEW_BOX = Object.freeze({ x: -217.67, y: 544.05, w: 978.13, h: 558.3 });

/**
 * The sleep graph is read sideways: the whole waking layout is turned a quarter
 * turn clockwise, so the Throat sits at the right and the Root at the left.
 * Rotation is about the centre of the padded upright viewBox; gate numbers are
 * counter-rotated by the renderer so they stay upright and readable.
 */
export const DREAM_ROTATION = 90;
export const DREAM_ROTATION_CENTER = Object.freeze({ x: 271.4, y: 823.205 });

/**
 * The `topology` option accepted by renderBodygraph(). Anything the graph must
 * not draw is simply absent; gates, channels and centres keep their waking IDs.
 */
export const DREAM_TOPOLOGY = Object.freeze({
  id: 'dream',
  viewBox: DREAM_VIEW_BOX,
  centerOrder: DREAM_CENTER_ORDER,
  gates: DREAM_GATE_SET,
  pathGates: new Set(DREAM_PATH_GATES),
  pathOverrides: DREAM_PORTAL_STUBS,
  rotate: DREAM_ROTATION,
  rotateCenter: DREAM_ROTATION_CENTER
});
