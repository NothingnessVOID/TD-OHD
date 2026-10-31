/**
 * Interactive Bodygraph Renderer
 *
 * Renders the canonical Human Design bodygraph:
 * - Design and Personality planet columns flanking the graph
 * - Per-gate half-channel coloring from Human Design skin tokens
 * - Nine independently skinnable center colors
 * - Hover highlights + tooltips, click-through to gate detail
 * - Optional transit-gate overlay
 *
 * Geometry from hdkit (MIT), maintained as local static SVG data.
 */

import { GATE_PATHS, CENTER_SHAPES, GATE_CIRCLE_POSITIONS } from './lib/human-design/bodygraph-geometry.js';
import { GATES, CHANNELS } from './lib/human-design/catalog.js';
import { analyzeConnectionStructure } from './lib/human-design/connection-structure.js';
import { calculateLineFixings } from './features/transit-timeline/line-fixing.js';
import { renderVariableArrowRow } from './lib/variable-arrows.js';
import './styles/variable-arrows.css';
import { TRANSIT_SOURCE_LABELS } from './lib/transit-graph.js';
import { getCenterPalette } from './lib/center-palette-registry.js';
import { getTransitSourceMode } from './lib/skin-registry.js';
import { readableColor, candidateColor, resolveRGB, contrastRatio, mixRGB, rgbCSS } from './lib/source-contrast.js';
import { PLANET_ORDER, PLANET_GLYPHS } from './lib/planet-reference.js';
export { PLANET_ORDER, PLANET_GLYPHS, PLANET_NAMES } from './lib/planet-reference.js';
import { INTEGRATION_SPAN, INTEGRATION_JOINED_PATHS, INTEGRATION_LOWER_BEND_PATHS, integrationSpanGates } from './lib/bodygraph-integration.js';

/** Padding the renderer adds around the viewBox on every side. Hosts that size a
 * canvas to the graph need it to derive the drawn aspect ratio. */
export const BODYGRAPH_PAD = 16;

let graphSequence = 0;
import { t, formatDisplay } from './lib/i18n.js';
import { typeName, authorityName, centerName, gateName, channelName, planetName, hexagramName, graphCenter } from './lib/vocabulary.js';


const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, ns = null) {
  const node = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.setAttribute('class', value);
    else node.setAttribute(key, value);
  }
  return node;
}
const svgEl = (tag, attrs) => el(tag, attrs, SVG_NS);

const CENTER_KEYS = ['head', 'ajna', 'throat', 'g', 'heart', 'spleen', 'solar', 'sacral', 'root'];

/**
 * A topology narrows what the graph draws without changing what anything means.
 * Gate numbers, channel pairs and centre keys stay the catalog's stable IDs, so
 * a reduced graph (the sleep design) shares this renderer, its skin tokens, its
 * highlight machinery and its transit overlay instead of forking them.
 *
 * `gates` and `pathGates` are null for the full chart: every gate is drawn, and
 * every gate keeps the half-channel path that reaches its waking partner.
 */
const CENTER_REVEAL_ORDER = ['Head', 'Ajna', 'Throat', 'G', 'Ego', 'Spleen', 'SolarPlexus', 'Sacral', 'Root'];
const STANDARD_TOPOLOGY = Object.freeze({
  id: 'standard',
  viewBox: Object.freeze({ x: 0, y: 0, w: 851.41, h: 1309.4 }),
  centerOrder: Object.freeze(CENTER_REVEAL_ORDER),
  gates: null,
  pathGates: null,
  pathOverrides: null,
  rotate: 0
});

// CSS owns all palette and visual-parameter values. A skin only needs to
// provide tokens; the renderer never has to know its actual color format.
const skinToken = (style, name) => style.getPropertyValue(name).trim();
const centerColors = (style) => Object.fromEntries(CENTER_KEYS.map(key => [key, {
  edge: skinToken(style, `--hd-center-${key}`),
  core: skinToken(style, `--hd-center-${key}-core`),
  on: skinToken(style, `--hd-center-${key}-on`)
}]));

const SHAPE_KEY_MAP = {
  Head: 'head', Ajna: 'ajna', Throat: 'throat',
  G: 'g', Ego: 'heart', Sacral: 'sacral',
  Spleen: 'spleen', SolarPlexus: 'solar', Root: 'root'
};

const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const displayCenter = graphCenter;
const displayGate = gateName;
const displayChannel = channel => channelName(channel.gates);
const displayPlanet = planetName;

// gate -> [channels containing it]
const GATE_CHANNELS = {};
for (const ch of CHANNELS) {
  for (const g of ch.gates) {
    (GATE_CHANNELS[g] = GATE_CHANNELS[g] || []).push(ch);
  }
}

function palette(style) {
  const read = name => skinToken(style, name);
  return {
    personality: read('--hd-personality'),
    personalityOn: read('--hd-personality-on'),
    design: read('--hd-design'),
    designOn: read('--hd-design-on'),
    bothOn: read('--hd-both-on'),
    transit: read('--hd-transit'),
    transitOn: read('--hd-transit-on'),
    transitSoft: read('--hd-transit-soft'),
    overlayNatal: read('--hd-overlay-natal'),
    overlayNatalOn: read('--hd-overlay-natal-on'),
    transitHatchOpacity: read('--hd-transit-hatch-opacity'),
    transitRingWidth: read('--hd-transit-ring-width'),
    inactive: read('--hd-inactive'),
    inactiveOn: read('--hd-inactive-on'),
    inactiveChannelOpacity: read('--hd-inactive-channel-opacity'),
    inactiveCircleOpacity: read('--hd-gate-circle-opacity'),
    undefinedCenter: read('--hd-undefined-center'),
    centerStroke: read('--hd-center-stroke'),
    centerStrokeWidth: read('--hd-center-stroke-width'),
    gateNumberSize: read('--hd-gate-number-size'),
    gateNumberBaselineOffset: Number.parseFloat(read('--hd-gate-number-baseline-offset')),
    gateActiveWeight: read('--hd-gate-active-weight'),
    gateInactiveWeight: read('--hd-gate-inactive-weight'),
    connectionAOn: read('--hd-connection-a-on'),
    connectionBOn: read('--hd-connection-b-on'),
    connectionBothOn: read('--hd-connection-both-on'),
    connectionBridgedOn: read('--hd-connection-bridged-on')
  };
}

/**
 * Render a bodygraph into `container`.
 *
 * @param {HTMLElement} container
 * @param {object} chart - calculateHumanDesign() result
 * @param {object} [opts]
 * @param {boolean} [opts.compact] - mini graph: no columns, no tooltips, no animation
 * @param {boolean} [opts.planetColumns] - set false to hide columns but keep interactivity
 * @param {boolean} [opts.animate] - reveal animation (default true unless compact)
 * @param {function} [opts.onGateClick] - (gateNum) => void
 * @param {function} [opts.onHighlight] - ({gates, centers, selection}|null) => void; `gates`/`centers` are the lit
 *   relation, `selection` is the chosen object (`{kind:'gate'|'center', id}` or `{kind:'gates'|'targets', gates, centers}`)
 * @param {Iterable<number>} [opts.transitGates] - gates to ring with transit overlay
 * @param {object} [opts.topology] - reduced graph topology; defaults to the full nine-centre chart
 * @param {string} [opts.ariaLabel] - override the generated graph summary
 * @returns {{ highlightGate: (g: number|null) => void }}
 */
export function renderBodygraph(container, chart, opts = {}) {
  const graphId = ++graphSequence;
  const paint = name => `bg-${graphId}-${name}`;
  const topology = opts.topology || STANDARD_TOPOLOGY;
  // A reduced topology hides geometry; it never re-labels what stays visible.
  const inTopology = gate => !topology.gates || topology.gates.has(gate);
  const drawsChannelPath = gate => inTopology(gate) && (!topology.pathGates || topology.pathGates.has(gate));
  const interactive = !opts.compact;
  const showColumns = !opts.compact && opts.planetColumns !== false && !opts.composite;
  const animate = opts.animate !== false && !opts.compact;

  /**
   * Naming hooks.
   *
   * A reduced topology still shares the catalogue's IDs, but a host may need to call
   * those objects something else: the sleep design's channel 1-8 is its Inspiration
   * channel, not the waking catalogue's word for it. Every name the graph *speaks* asks
   * here first — the gate and centre aria labels, the tooltip titles and the channel
   * note — and an override replaces the expression that spot would otherwise print, so
   * a graph never inherits wording its topology does not have. With no `naming` the
   * defaults are the shared vocabulary, which keeps every existing host unchanged.
   *
   *   opts.naming = {
   *     gate(gate),                  // stable gate number -> plain name
   *     gateTooltip(gate),           // stable gate number -> tooltip name part only
   *     channelTooltip(channel),     // catalog channel object -> tooltip name part only
   *     center(center)               // stable centre key -> plain name
   *   }
   *
   * `gateTooltip` and `channelTooltip` return a bare name, never a formatted string: a
   * gate's tooltip part replaces `formatDisplay('gateTooltip', …)`, which is what stops
   * a sleep gate from inheriting the waking hexagram, and a channel's replaces only the
   * name inside a template that already adds the gate pair (`启发通道（1-8）`). A falsy
   * return falls back to the shared vocabulary, so a partially filled object is safe.
   */
  const naming = opts.naming || null;
  const nameOfGate = gate => naming?.gate?.(gate) || displayGate(gate);
  const nameOfCenter = center => naming?.center?.(center) || displayCenter(center);
  const nameOfGateTooltip = gate => naming?.gateTooltip?.(gate)
    || formatDisplay('gateTooltip', displayGate(gate), hexagramName(gate));
  // A channel name now comes in two shapes, because its two tooltip spots differ:
  // the single-chart note template `'{name}（{gates}）'` already appends the pair, while the
  // composite channel line does not. Feeding the formatted expression into the note printed
  // the pair twice (`接受通道（17-62）（17-62）`); the note therefore takes the bare name and the
  // line takes the formatted one. A host override is always a bare name, so both spots read
  // `启发通道（1-8）` without the host knowing which one is asking.
  const customChannelName = channel => naming?.channelTooltip?.(channel) || null;
  const nameOfChannelNote = channel => customChannelName(channel) || displayChannel(channel);
  const nameOfChannelLine = channel => formatDisplay('channelTooltip',
    customChannelName(channel) || displayChannel(channel), channel.gates.join('-'));

  // Keep the previous graph painted until the replacement SVG is complete.
  const nextGraph = document.createDocumentFragment();
  container.classList.add('bg-root');
  if (opts.compact) container.classList.add('bg-compact');

  const style = getComputedStyle(document.documentElement);
  const colors = palette(style);
  const centerPalette = centerColors(style);
  const solidCenters = getCenterPalette(document.documentElement.getAttribute('data-center-palette'))?.render === 'solid';

  // Composite (two-person) overlay: color the body by WHO brings each gate,
  // instead of by personality/design. The half-channel model makes this read
  // beautifully — a two-tone channel is an electromagnetic bond.
  const composite = opts.composite || null;
  const compositeStructure = composite?.structure || (composite ? analyzeConnectionStructure(composite.chartA, composite.chartB) : null);
  const transit = opts.transitModel || null;
  // Birth-only source hues never enter transit or relationship rendering.
  const birthOnly = !transit && !composite;
  container.dataset.sourceContext = composite ? 'composite' : transit ? 'transit' : 'birth';
  const personalityColor = birthOnly
    ? skinToken(style, '--hd-birth-personality') || colors.personality : colors.personality;
  const designColor = birthOnly
    ? skinToken(style, '--hd-birth-design') || colors.design : colors.design;
  container.style.setProperty('--bg-source-personality', personalityColor);
  container.style.setProperty('--bg-source-design', designColor);
  const textBackgrounds = ['--bg', '--bg-elevated', '--hd-graph-bg', '--hd-graph-panel-bg'].map(name => skinToken(style, name)).filter(color => color && color !== 'transparent');
  for (const [source, color] of [['personality', personalityColor], ['design', designColor]]) {
    container.style.setProperty(`--bg-source-${source}-text`, readableColor(color, textBackgrounds, skinToken(style, '--text')));
    container.style.setProperty(`--bg-source-${source}-tooltip-text`, readableColor(color, [skinToken(style, '--hd-tooltip-bg')], skinToken(style, '--text')));
  }
  // Skin controls presentation only; an ordinary birth chart always stays split.
  const transitSourceMode = transit
    ? getTransitSourceMode(document.documentElement.getAttribute('data-skin')) : 'split';
  const unifiedNatal = transit?.mode === 'overlay' && transitSourceMode === 'unified-natal';
  container.dataset.transitSourceMode = transitSourceMode;
  // SVG presentation attributes inherit the same theme tokens as the legend and badges.
  const transitColor = colors.transit;

  const personalityGates = new Map(); // gate -> [{planet, line}]
  const designGates = new Map();
  const addActivation = (map, planet, g) => {
    if (!g) return;
    if (!map.has(g.gate)) map.set(g.gate, []);
    map.get(g.gate).push({ planet, line: g.line });
  };
  if (!composite) {
    for (const [planet, g] of Object.entries(chart.gates?.personality || {})) addActivation(personalityGates, planet, g);
    for (const [planet, g] of Object.entries(chart.gates?.design || {})) addActivation(designGates, planet, g);
  }

  let aGates = null, bGates = null, gateOwner = null, centerOwner = null, channelDynamic = null;
  if (composite) {
    aGates = new Set(composite.chartA.gates.all);
    bGates = new Set(composite.chartB.gates.all);
    gateOwner = (g) => { const a = aGates.has(g), b = bGates.has(g); return a && b ? 'both' : a ? 'a' : b ? 'b' : null; };
  }

  const activeGates = transit ? transit.activeGates : composite
    ? new Set([...aGates, ...bGates])
    : new Set([...personalityGates.keys(), ...designGates.keys()]);

  // Channels present across the relationship (both gates appear in either chart).
  const compChannels = composite
    ? CHANNELS.filter(ch => activeGates.has(ch.gates[0]) && activeGates.has(ch.gates[1]))
    : null;
  const renderedChannels = transit?.channels || (composite ? compChannels : chart.channels || []);
  const definedChannelKeys = transit ? new Set(renderedChannels.map(ch => ch.gates.join('-'))) : composite
    ? new Set(compChannels.map(ch => ch.gates.join('-')))
    : new Set((chart.channels || []).map(ch => ch.gates.join('-')));

  let definedCenters;
  if (composite) {
    const compCenters = new Set(compositeStructure.composite.centers);
    definedCenters = compCenters;
    const aDef = new Set(compositeStructure.individuals.personA.centers);
    const bDef = new Set(compositeStructure.individuals.personB.centers);
    centerOwner = (key) => {
      if (!compCenters.has(key)) return null;
      const a = aDef.has(key), b = bDef.has(key);
      if (a && b) return 'both';
      if (a) return 'a';
      if (b) return 'b';
      return 'bridged'; // completed together — neither has it alone
    };
    channelDynamic = (ch) => {
      const [g1, g2] = ch.gates;
      const a1 = aGates.has(g1), a2 = aGates.has(g2), b1 = bGates.has(g1), b2 = bGates.has(g2);
      const aFull = a1 && a2, bFull = b1 && b2;
      if (aFull && bFull) return 'companionship';
      if (aFull || bFull) return (aFull ? (b1 || b2) : (a1 || a2)) ? 'compromise' : 'dominance';
      if ((a1 && b2) || (a2 && b1)) return 'electromagnetic';
      return null;
    };
  } else {
    definedCenters = new Set(chart.centers?.definedNames || []);
  }
  if (transit) definedCenters = transit.definedCenters;
  const transitGates = transit?.transitGates || new Set(opts.transitGates || []);

  // ---------- SVG ----------
  const pad = BODYGRAPH_PAD;
  const chartSummary = opts.ariaLabel || (transit ? t(transit.mode === 'transit-only'
    ? 'Transit only bodygraph. Transit activations are marked separately. Channels: {channels}.'
    : 'Birth chart plus transits bodygraph. Transit activations are marked separately. Channels: {channels}.', {
      channels: renderedChannels.map(ch => ch.gates.join('-')).join(', ')
    }) : composite
    ? t('Combined Human Design bodygraph for {labelA} and {labelB}, colored by who carries each gate and channel.', {
      labelA: composite.labelA, labelB: composite.labelB
    })
    : [
    t('Human Design bodygraph.'),
    chart.type?.name ? t('Type: {type}.', { type: typeName(chart.type.name) }) : '',
    chart.profile?.numbers ? t('Profile {profile}.', { profile: chart.profile.numbers }) : '',
    chart.authority?.name ? t('{authority}.', { authority: authorityName(chart.authority.name) }) : '',
    definedCenters.size
      ? t('Defined centers: {centers}.', { centers: formatDisplay('separated', [...definedCenters].map(nameOfCenter), 'centers') })
      : t('No defined centers (Reflector).'),
    chart.channels?.length
      ? t('Active channels: {channels}.', { channels: formatDisplay('separated', chart.channels.map(c => `${c.gates.join('-')} ${displayChannel(c)}`), 'channels') })
      : ''
  ].filter(Boolean).join(' '));

  const svg = svgEl('svg', {
    class: 'bodygraph-svg',
    viewBox: `${topology.viewBox.x - pad} ${topology.viewBox.y - pad} ${topology.viewBox.w + pad * 2} ${topology.viewBox.h + pad * 2}`,
    role: 'img',
    'aria-label': chartSummary
  });

  // Stripe pattern for gates activated by both personality and design
  const defs = svgEl('defs');
  if (!unifiedNatal && transit?.mode !== 'transit-only') {
    const pattern = svgEl('pattern', {
      id: paint('stripe-both'), width: '8', height: '8',
      patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'
    });
    pattern.appendChild(svgEl('rect', { width: '8', height: '8', fill: personalityColor }));
    pattern.appendChild(svgEl('rect', { width: '4', height: '8', fill: designColor }));
    defs.appendChild(pattern);
  }

  // Core and edge are CSS-derived skin tokens, so gradients accept modern CSS
  // color formats without parsing or modifying a hex value in JavaScript.
  if (!composite && !solidCenters) {
    for (const [key, color] of Object.entries(centerPalette)) {
      const grad = svgEl('radialGradient', { id: paint(`cg-${key}`), cx: '0.5', cy: '0.36', r: '0.78' });
      grad.appendChild(svgEl('stop', { offset: '0', 'stop-color': color.core }));
      grad.appendChild(svgEl('stop', { offset: '1', 'stop-color': color.edge }));
      defs.appendChild(grad);
    }
  } else if (composite) {
    // Relationship ownership colors; ordinary Center Palette does not apply.
    const colA = composite.colorA, colB = composite.colorB;
    // Two-tone stripe for gates both people carry (companionship at gate level).
    const ab = svgEl('pattern', { id: paint('stripe-ab'), width: '8', height: '8', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    ab.appendChild(svgEl('rect', { width: '8', height: '8', fill: colA }));
    ab.appendChild(svgEl('rect', { width: '4', height: '8', fill: colB }));
    defs.appendChild(ab);
    // Both preserves two ownership colors with a hard diagonal boundary.
    const both = svgEl('linearGradient', { id: paint('cc-both'), x1: '0', y1: '0', x2: '1', y2: '1' });
    for (const [offset, color] of [['0', colA], ['0.5', colA], ['0.5', colB], ['1', colB]]) {
      both.appendChild(svgEl('stop', { offset, 'stop-color': color }));
    }
    defs.appendChild(both);
  }
  if (transit) {
    const hatch = svgEl('pattern', { id: paint('transit-center'), width: '10', height: '10', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    hatch.appendChild(svgEl('rect', { width: '4', height: '10', fill: transitColor, opacity: colors.transitHatchOpacity }));
    defs.appendChild(hatch);
  }
  svg.appendChild(defs);

  // A reduced topology may turn the whole graph: geometry then lives in one
  // rotated group, while defs, patterns and tooltips stay in page space.
  // Gate numbers counter-rotate around their own anchors, so they stay upright.
  const geoRoot = topology.rotate
    ? svgEl('g', { transform: `rotate(${topology.rotate} ${topology.rotateCenter?.x || 0} ${topology.rotateCenter?.y || 0})` })
    : svg;
  if (geoRoot !== svg) svg.appendChild(geoRoot);

  const gateFill = (gateNum) => {
    if (transit?.gateSource(gateNum) === 'transit') return transitColor;
    if (transit?.mode === 'transit-only') return colors.inactive;
    if (composite) {
      const o = gateOwner(gateNum);
      if (o === 'both') return `url(#${paint('stripe-ab')})`;
      if (o === 'a') return composite.colorA;
      if (o === 'b') return composite.colorB;
      return colors.inactive;
    }
    const p = personalityGates.has(gateNum);
    const d = designGates.has(gateNum);
    if (unifiedNatal && transit.natalGates.has(gateNum)) return colors.overlayNatal;
    if (p && d) return `url(#${paint('stripe-both')})`;
    if (p) return personalityColor;
    if (d) return designColor;
    return colors.inactive;
  };
  const gateOnColor = (gateNum) => {
    if (composite) {
      const owner = gateOwner(gateNum);
      return owner === 'a' ? colors.connectionAOn
        : owner === 'b' ? colors.connectionBOn
        : owner === 'both' ? colors.connectionBothOn : colors.inactiveOn;
    }
    if (transit?.gateSource(gateNum) === 'transit') return colors.transitOn;
    if (unifiedNatal && transit.natalGates.has(gateNum)) return colors.overlayNatalOn;
    const personality = personalityGates.has(gateNum);
    const design = designGates.has(gateNum);
    return personality && design ? colors.bothOn
      : personality ? colors.personalityOn
      : design ? colors.designOn : colors.inactiveOn;
  };
  const centerPaint = key => solidCenters ? centerPalette[key].edge : `url(#${paint(`cg-${key}`)})`;
  const centerFill = (key, defined) => {
    if (transit?.mode === 'transit-only') return defined ? centerPaint(key) : colors.undefinedCenter;
    if (composite) {
      const o = centerOwner(key);
      return o === 'both' ? `url(#${paint('cc-both')})` : o === 'a' ? composite.colorA
        : o === 'b' ? composite.colorB : o === 'bridged' ? composite.colorBridged : colors.undefinedCenter;
    }
    return defined ? centerPaint(key) : colors.undefinedCenter;
  };

  // Visual ownership only. Existing mechanic classification and calculation stay unchanged.
  //
  // A half-channel belongs to whoever carries *that gate*, not to whoever completes the
  // channel. The two differ only in a compromise: there one person owns the whole channel
  // and the other still carries one of its gates, so the half the other person also carries
  // takes both colours (exactly as its gate disc does) while the remaining half stays with
  // the completer. Deriving the half from the completed channel instead painted that shared
  // half entirely in the completer's colour, so a 20-57 completed by A with a lone 20 from B
  // showed a striped 20 disc above a solid-A 20 half-channel. `channelDynamic()` and the
  // compromise/dominance classification are untouched: this decides paint, not meaning.
  const channelHalfFill = gate => {
    if (!composite) return gateFill(gate);
    const owner = gateOwner(gate);
    return owner === 'both' ? `url(#${paint('stripe-ab')})`
      : owner === 'a' ? composite.colorA : owner === 'b' ? composite.colorB : gateFill(gate);
  };
  const inactiveGateOn = gate => {
    if (composite) return colors.inactiveOn;
    const key = GATES[gate]?.center;
    return definedCenters.has(key) ? '#111111' : colors.inactiveOn;
  };

  // Opaque center-derived circles preserve contrast without changing composite ownership.
  const inactiveGateFill = gate => {
    const key = GATES[gate]?.center;
    if (composite || !definedCenters.has(key)) return null;
    const center = centerPalette[key];
    return `color-mix(in srgb, ${center.edge} 60%, white)`;
  };

  // --- Channel paths (one per gate = half-channel) ---
  const pathGroup = svgEl('g', { class: `bg-paths${animate ? ' bg-reveal-paths' : ''}` });
  const gatePathEls = {};
  const integrationChannels = renderedChannels
    .filter(ch => ch.gates.every(g => [10, 20, 34, 57].includes(g)));
  const joinedGates = new Set(integrationChannels.flatMap(ch => ch.gates));
  const spanGates = integrationSpanGates(integrationChannels);
  const joinedPaths = joinedGates.has(34) && joinedGates.has(57) && !spanGates[0].length
    ? INTEGRATION_LOWER_BEND_PATHS : INTEGRATION_JOINED_PATHS;
  const spanEls = INTEGRATION_SPAN.map((d, i) => {
    const gates = spanGates[i];
    const first = gates.some(g => composite ? aGates.has(g) : personalityGates.has(g));
    const second = gates.some(g => composite ? bGates.has(g) : designGates.has(g));
    let fill = first && second ? `url(#${paint(composite ? 'stripe-ab' : 'stripe-both')})`
      : first ? (composite ? composite.colorA : personalityColor)
      : second ? (composite ? composite.colorB : designColor) : colors.inactive;
    if (composite) {
      // Only the gates that actually cross this shared trunk decide its colour, so a
      // neighbour's channel (10-20 beside 20-57, say) cannot bleed its ownership in.
      const fills = gates.map(channelHalfFill);
      fill = fills.includes(`url(#${paint('stripe-ab')})`) || (fills.includes(composite.colorA) && fills.includes(composite.colorB))
        ? `url(#${paint('stripe-ab')})` : fills.find(value => value !== colors.inactive) ?? colors.inactive;
    }
    if (transit) {
      const hasTransit = gates.some(g => transit.transitGates.has(g));
      const hasNatal = transit.mode !== 'transit-only' && gates.some(g => transit.natalGates.has(g));
      if (unifiedNatal && hasNatal) fill = colors.overlayNatal;
      if (hasTransit && hasNatal) {
        const mix = svgEl('pattern', { id: paint(`transit-span-${i}`), width: '10', height: '10', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
        mix.appendChild(svgEl('rect', { width: '10', height: '10', fill }));
        mix.appendChild(svgEl('rect', { width: '5', height: '10', fill: transitColor }));
        defs.appendChild(mix);
        fill = `url(#${paint(`transit-span-${i}`)})`;
      } else if (hasTransit) fill = transitColor;
    }
    const path = svgEl('path', {
      d, fill, class: 'bg-gate-path bg-integration-span',
      opacity: gates.length ? '1' : colors.inactiveChannelOpacity,
      'pointer-events': 'none'
    });
    pathGroup.appendChild(path);
    return path;
  });
  for (const [gateStr, pathData] of Object.entries(GATE_PATHS)) {
    const gateNum = parseInt(gateStr);
    // A gate with no partner in this topology would dangle toward a centre the
    // graph does not draw, so it floats as a bare circle instead.
    if (!drawsChannelPath(gateNum)) continue;
    const isActive = activeGates.has(gateNum);
    const path = svgEl('path', {
      d: joinedGates.has(gateNum) ? joinedPaths[gateNum] || pathData : topology.pathOverrides?.[gateNum] || pathData,
      fill: channelHalfFill(gateNum),
      opacity: isActive ? '1' : colors.inactiveChannelOpacity,
      'data-gate': gateNum,
      class: 'bg-gate-path'
    });
    gatePathEls[gateNum] = path;
    // Gray crossing paths must stay behind colored spans and active gates.
    if (isActive) pathGroup.appendChild(path);
    else pathGroup.prepend(path);
  }
  geoRoot.appendChild(pathGroup);

  // --- Centers (top-to-bottom order so the reveal animation flows down) ---
  const centerGroup = svgEl('g', { class: 'bg-centers' });
  const centerPathEls = {};
  topology.centerOrder.forEach((shapeKey, i) => {
    const shapeData = CENTER_SHAPES[shapeKey];
    const centerKey = SHAPE_KEY_MAP[shapeKey];
    if (!shapeData || !centerKey) return;
    const defined = definedCenters.has(centerKey);
    const transitDefined = transit && defined && (transit.mode === 'transit-only' || !transit.natalCenters.has(centerKey));
    const path = svgEl('path', {
      d: shapeData.path,
      fill: centerFill(centerKey, defined),
      'fill-opacity': transitDefined ? '0.5' : '1',
      stroke: transitDefined ? transitColor : defined ? 'none' : colors.centerStroke,
      'stroke-width': transitDefined ? Number(colors.centerStrokeWidth) + 2 : colors.centerStrokeWidth,
      'data-center': centerKey,
      ...(composite ? {
        'data-center-defined': String(defined),
        'data-center-state': compositeStructure.centerStates.find(state => state.center === centerKey).status,
        'data-center-created': String(compositeStructure.centerStates.find(state => state.center === centerKey)?.created || false),
        'data-center-owner': centerOwner(centerKey) || 'none'
      } : {}),
      class: 'bg-center'
    });
    if (animate) {
      path.classList.add('bg-reveal');
      path.style.animationDelay = `${i * 70}ms`;
    }
    if (interactive) {
      path.setAttribute('tabindex', '0');
      path.setAttribute('role', 'button');
      path.setAttribute('cursor', 'pointer');
      path.setAttribute('aria-label', t(`{center} center, ${defined ? 'defined' : 'undefined'}`, {
        center: nameOfCenter(centerKey)
      }));
      if (transit) path.setAttribute('aria-label', t('{label}, {source}', {
        label: path.getAttribute('aria-label'),
        source: t(transit.mode === 'overlay' && transit.natalCenters.has(centerKey) ? 'birth chart' : defined ? 'with transits' : 'selected view')
      }));
    }
    centerPathEls[centerKey] = path;
    centerGroup.appendChild(path);
    if (transit && defined && (transit.mode === 'transit-only' || !transit.natalCenters.has(centerKey))) {
      const hatch = svgEl('path', {
        d: shapeData.path, fill: `url(#${paint('transit-center')})`,
        class: 'bg-center-transit-hatch', 'pointer-events': 'none', 'aria-hidden': 'true'
      });
      if (animate) {
        hatch.classList.add('bg-reveal');
        hatch.style.animationDelay = `${i * 70}ms`;
      }
      centerGroup.appendChild(hatch);
    }
  });
  geoRoot.appendChild(centerGroup);

  // --- Gate circles + numbers ---
  const gateGroup = svgEl('g', { class: 'bg-gates' });
  const gateCircleEls = {};
  for (const [gateStr, c] of Object.entries(GATE_CIRCLE_POSITIONS)) {
    const gateNum = parseInt(gateStr);
    if (!inTopology(gateNum)) continue;
    const isActive = activeGates.has(gateNum);
    const fill = gateFill(gateNum);
    const inactiveFill = isActive ? null : inactiveGateFill(gateNum);

    const g = svgEl('g', { class: 'bg-gate', 'data-gate': gateNum, cursor: opts.compact ? 'default' : 'pointer' });
    if (interactive) {
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', t(`Gate {gate} — {name}, ${isActive ? 'active' : 'inactive'}`, {
        gate: gateNum, name: nameOfGate(gateNum)
      }));
      if (transit) g.setAttribute('aria-label', t('{label}, {source}', {
        label: g.getAttribute('aria-label'), source: t(TRANSIT_SOURCE_LABELS[transit.gateSource(gateNum)])
      }));
      // Invisible enlarged hit area (~44px-equivalent) so fingers can
      // actually tap a gate; the visible circle stays delicate.
      g.appendChild(svgEl('circle', {
        cx: c.cx, cy: c.cy, r: 24,
        fill: 'transparent', stroke: 'none', class: 'bg-gate-hit'
      }));
    }
    g.appendChild(svgEl('circle', {
      cx: c.cx, cy: c.cy, r: (c.r || 12.3) + 4,
      fill: isActive ? fill : (inactiveFill || colors.inactive),
      'fill-opacity': isActive || inactiveFill ? '1' : colors.inactiveCircleOpacity,
      stroke: 'none',
      class: 'bg-gate-circle'
    }));
    if (transit ? transit.gateSource(gateNum) === 'both' : transitGates.has(gateNum)) {
      g.appendChild(svgEl('circle', {
        cx: c.cx, cy: c.cy, r: (c.r || 12.3) + 8.5,
        fill: 'none', stroke: transitColor, 'stroke-width': colors.transitRingWidth,
        'stroke-dasharray': transit ? 'none' : '4 3', class: 'bg-transit-ring'
      }));
    }
    const striped = isActive && fill.startsWith('url(');
    const stripeFills = composite ? [composite.colorA, composite.colorB] : [personalityColor, designColor];
    const surface = isActive ? fill : inactiveFill || colors.inactive;
    const preferred = skinToken(style, isActive ? '--hd-gate-active-ink' : '--hd-gate-inactive-ink')
      || (isActive ? gateOnColor(gateNum) : inactiveGateOn(gateNum));
    const alternate = skinToken(style, isActive ? '--hd-gate-inactive-ink' : '--hd-gate-active-ink') || preferred;
    let numberSurfaces = striped ? stripeFills : [surface];
    if (!isActive && !inactiveFill) {
      const key = GATES[gateNum]?.center;
      const owner = composite ? centerOwner(key) : null;
      const underneath = composite && definedCenters.has(key)
        ? owner === 'both' ? [composite.colorA, composite.colorB]
          : [owner === 'a' ? composite.colorA : owner === 'b' ? composite.colorB : composite.colorBridged]
        : [colors.undefinedCenter];
      numberSurfaces = underneath.map(color => rgbCSS(mixRGB(resolveRGB(color), resolveRGB(colors.inactive), Number(colors.inactiveCircleOpacity))));
    }
    const numberColor = candidateColor(preferred, alternate, numberSurfaces);
    const needsBacking = (striped && contrastRatio(resolveRGB(stripeFills[0]), resolveRGB(stripeFills[1])) >= 3)
      || numberSurfaces.some(color => contrastRatio(resolveRGB(numberColor), resolveRGB(color)) < 4.5);
    // Only the number's local area is backed; the source stripe perimeter stays visible.
    const backing = resolveRGB(preferred).reduce((sum, n) => sum + n, 0) > 382
      ? skinToken(style, '--hd-gate-inactive-ink') : skinToken(style, '--hd-gate-active-ink');
    const backingColor = contrastRatio(resolveRGB(preferred), resolveRGB(backing)) >= 4.5
      ? backing : resolveRGB(preferred).reduce((sum, n) => sum + n, 0) > 382 ? '#211E1A' : '#FAF8F3';
    if (needsBacking) g.appendChild(svgEl('ellipse', {
      cx: c.cx, cy: c.cy, rx: 14, ry: 12.5,
      fill: backingColor, class: 'bg-gate-number-backing', 'pointer-events': 'none'
    }));
    g.appendChild(svgEl('text', {
      x: c.cx, y: c.cy,
      ...(topology.rotate ? { transform: `rotate(${-topology.rotate} ${c.cx} ${c.cy})` } : {}),
      'dominant-baseline': 'central', opacity: '1', 'fill-opacity': '1',
      'text-anchor': 'middle', 'font-size': colors.gateNumberSize,
      'font-weight': isActive ? colors.gateActiveWeight : colors.gateInactiveWeight,
      'font-family': skinToken(style, '--font'),
      fill: needsBacking ? candidateColor(preferred, alternate, [backingColor]) : numberColor,
      'data-number-background': needsBacking ? backingColor : numberSurfaces.join('|'),
      'data-number-surfaces': numberSurfaces.join('|'),
      'data-number-active': String(isActive),
      'data-number-striped': String(striped),
      stroke: 'none',
      'pointer-events': 'none',
      text: gateNum
    }));
    gateCircleEls[gateNum] = g;
    gateGroup.appendChild(g);
  }
  geoRoot.appendChild(gateGroup);

  // ---------- Highlight machinery ----------
  // A selection is a gate OR a center. Selecting a gate lights it, its channel
  // partner (when defined), and the center(s) it touches; selecting a center
  // lights the center and the active gates inside it. Everything else dims, so
  // the chart reads as one focused object. `pinned` keeps a selection lit while
  // its detail card is open; hovering previews, and pointer-out reverts to the
  // pinned selection. `opts.onHighlight({gates,centers,selection}|null)` lets the host
  // light the matching rows in the data panels (the reverse direction): `gates`/`centers`
  // are the relation the graph lit, `selection` is the object the reader chose.
  let highlighted = null; // change-detection token
  let pinned = null;       // { kind:'gate'|'center', id } | null
  const tokenOf = (sel) => sel ? `${sel.kind}:${sel.kind === 'gates' ? sel.gates.join(',')
    : sel.kind === 'targets' ? `${(sel.gates || []).join(',')}:${(sel.centers || []).join(',')}` : sel.id}` : null;

  function litFor(sel) {
    const gates = new Set();
    const centers = new Set();
    if (!sel) return { gates, centers };
    if (sel.kind === 'gate' || sel.kind === 'gates' || sel.kind === 'targets') {
      for (const gate of sel.kind === 'targets' ? sel.gates || [] : sel.kind === 'gates' ? sel.gates : [sel.id]) {
        gates.add(gate);
        for (const ch of GATE_CHANNELS[gate] || []) {
          if (definedChannelKeys.has(ch.gates.join('-'))) ch.gates.forEach(g => gates.add(g));
        }
      }
      for (const g of gates) { const ck = GATES[g]?.center; if (ck) centers.add(ck); }
      if (sel.kind === 'targets') for (const center of sel.centers || []) centers.add(center);
    } else if (sel.kind === 'channel') {
      const channel = CHANNELS.find(ch => ch.gates.join('-') === sel.id);
      channel?.gates.forEach(g => gates.add(g));
      channel?.centers.forEach(c => centers.add(c));
    } else if (sel.kind === 'center') {
      centers.add(sel.id);
      for (const g of activeGates) { if (GATES[g]?.center === sel.id) gates.add(g); }
    }
    return { gates, centers };
  }

  function renderHighlight(sel) {
    for (const node of [...Object.values(gatePathEls), ...spanEls]) node.classList.remove('bg-lit', 'bg-focus', 'bg-selected');
    for (const node of Object.values(gateCircleEls)) node.classList.remove('bg-lit', 'bg-focus');
    for (const node of Object.values(centerPathEls)) node.classList.remove('bg-lit', 'bg-focus', 'bg-selected');
    // `bg-selected` marks the gate or centre that owns the open detail card, so it can keep
    // a visible ring after the pointer leaves. It is derived from `pinned` only, never from
    // hover, and it survives the dimming that hover previews apply — so it is recomputed
    // here for every gate and every centre, which is what clears it when the card closes.
    // (A centre used to keep the class forever: the reset above did not include it.)
    const selectedGate = pinned?.kind === 'gate' ? Number(pinned.id) : null;
    for (const [gate, node] of Object.entries(gateCircleEls)) {
      const isSelected = selectedGate != null && Number(gate) === selectedGate;
      node.classList.toggle('bg-selected', isSelected);
      gatePathEls[gate]?.classList.toggle('bg-selected', isSelected);
    }
    const selectedCenter = pinned?.kind === 'center' ? pinned.id : null;
    for (const [key, node] of Object.entries(centerPathEls)) {
      node.classList.toggle('bg-selected', key === selectedCenter);
    }
    // The object under the pointer (or the keyboard) carries its own mark on the
    // shape it covers, not only a ring on its number disc. Dimming plus that ring was
    // the whole cue, and on a two-person composite — where every gate is a pale
    // ownership wash — it read as "nothing happened". Only a single object is marked:
    // a multi-gate selection (`gates`/`targets` from a host panel) keeps the plain
    // relational dimming, so the outline never rings half the chart.
    const focusGate = sel?.kind === 'gate' ? Number(sel.id) : null;
    if (focusGate != null) {
      gatePathEls[focusGate]?.classList.add('bg-focus');
      gateCircleEls[focusGate]?.classList.add('bg-focus');
    }
    if (sel?.kind === 'center') centerPathEls[sel.id]?.classList.add('bg-focus');
    if (!sel) { svg.classList.remove('bg-dimmed'); return { gates: [], centers: [] }; }
    svg.classList.add('bg-dimmed');
    const { gates, centers } = litFor(sel);
    for (const g of gates) {
      gatePathEls[g]?.classList.add('bg-lit');
      gateCircleEls[g]?.classList.add('bg-lit');
    }
    spanEls.forEach((path, i) => {
      if (spanGates[i].some(g => gates.has(g))) path.classList.add('bg-lit');
    });
    for (const ck of centers) centerPathEls[ck]?.classList.add('bg-lit');
    return { gates: [...gates], centers: [...centers] };
  }

  /** A copy of the current selection, so a host cannot mutate the renderer's state. */
  const selectionSnapshot = sel => {
    const copy = { ...sel };
    if (Array.isArray(sel.gates)) copy.gates = [...sel.gates];
    if (Array.isArray(sel.centers)) copy.centers = [...sel.centers];
    return copy;
  };

  function applySelection(sel) {
    const tok = tokenOf(sel);
    if (highlighted === tok) return;
    highlighted = tok;
    const lit = renderHighlight(sel);
    // `gates`/`centers` are the relation the graph lit, and a gate always brings its
    // defined channel partner into that relation, so a host cannot tell which object the
    // reader actually chose from them alone. `selection` carries that untouched choice
    // (kind, id, plus the arrays for a multi-object selection) beside them, copied so a
    // consumer cannot mutate the renderer's state through it. The two original fields keep
    // their exact meaning, and a cleared selection still arrives as `null`.
    opts.onHighlight?.(sel ? { ...lit, selection: selectionSnapshot(sel) } : null);
  }

  function highlightGate(gateNum) {
    applySelection(gateNum == null ? pinned : { kind: 'gate', id: gateNum });
  }
  function highlightCenter(centerKey) {
    applySelection(centerKey == null ? pinned : { kind: 'center', id: centerKey });
  }

  // Keep a selection lit independent of hover (its detail card is open).
  function setPinned(sel) {
    pinned = sel; // { kind, id } | null
    highlighted = '__force__'; // force the next call to re-render
    applySelection(pinned);
  }

  // ---------- Tooltip + events ----------
  if (interactive) {
    // `popover="manual"` puts the overlay in the browser's top layer, and that is what makes
    // it both correctly placed and life-cycle safe. See `showTooltip` for the measurements;
    // nothing else in the renderer moves it out of its graph.
    //
    // Browsers without top-layer popovers (before Chrome 114 / Safari 17 / Firefox 125) keep
    // the same element inside the same graph, and the placement is converted into the
    // containing block's own coordinates instead — see `localPlacement`. The `popover`
    // attribute is only set where it means something, so a browser that does not know it
    // never meets a user-agent rule it cannot apply.
    const supportsPopover = typeof HTMLElement.prototype.showPopover === 'function';
    const tooltip = el('div', supportsPopover
      ? { class: 'bg-tooltip', role: 'tooltip', popover: 'manual' }
      : { class: 'bg-tooltip', role: 'tooltip' });
    let tooltipVisible = false;

    const tooltipOpen = () => supportsPopover ? tooltip.matches(':popover-open') : tooltipVisible;
    // A touch screen has no hover — but Chrome still replays a compatibility `pointerover`
    // with `pointerType: "mouse"` at the point of the last tap whenever the layout under
    // that point changes. Coming back to a redrawn graph then left a preview floating with
    // no finger on the screen. The stylesheet already answers the same event by switching
    // the hover ring off under `(hover: none)`; the preview follows the ring, and touch
    // keeps its press preview.
    const canHover = () => typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover)').matches;

    function showTooltip(markup, anchor) {
      tooltip.innerHTML = markup;
      // Shown by a class in both modes, so `display` never depends on a user-agent rule.
      tooltip.classList.add('bg-tooltip-open');
      tooltipVisible = true;
      // A top-layer overlay is laid out against the viewport, so the pointer's client
      // coordinates are the right ones to place it — unlike a plain fixed descendant of
      // `.ohd-graph-canvas`, which is translated by `translateX(-50%)` to centre the
      // canvas and (with `container-type`/`contain: layout` on the shell) becomes its
      // containing block. Measured before this: the sleep chart's two-person composite
      // put the pointer at (802,606) and the overlay at (1108,907), 306px right, 301px
      // low and off the bottom of a 1000px viewport.
      //
      // The overlay never leaves the graph it belongs to, which is the whole life cycle:
      // a redraw replaces it with the rest of the graph's children, a removed graph takes
      // it away, a hidden view renders neither — and the browser closes a popover whose
      // element leaves the document. No shared registry, no observer, no listener: there
      // is nothing to prune, so nothing can accumulate. Source colours and the transit
      // source mode keep working because the element is still inside `.bg-root` in the
      // DOM, however it is painted.
      if (supportsPopover && !tooltipOpen()) tooltip.showPopover();
      positionTooltip(anchor);
    }

    function hideTooltip() {
      if (supportsPopover && tooltipOpen()) tooltip.hidePopover();
      tooltipVisible = false;
      tooltip.classList.remove('bg-tooltip-open');
    }

    function tooltipText(gateNum) {
      if (composite) return compositeGateTooltip(gateNum);
      const acts = [];
      if (transit) {
        const source = transit.gateSource(gateNum);
        const label = source === 'both'
          ? `<span class="bg-tt-source-birth">${escapeHTML(t('Birth chart'))}</span><span class="bg-tt-source-plus"> + </span><span class="bg-tt-source-transit">${escapeHTML(t('transit'))}</span>`
          : escapeHTML(t(TRANSIT_SOURCE_LABELS[source]));
        acts.push(`<span class="bg-tt-source ${source}">${label}</span>`);
      }
      for (const { planet, line } of (transit?.mode === 'transit-only' ? [] : designGates.get(gateNum) || [])) {
        acts.push(`<span class="bg-tt-design">${PLANET_GLYPHS[planet]} ${gateNum}.${line}</span>`);
      }
      for (const { planet, line } of (transit?.mode === 'transit-only' ? [] : personalityGates.get(gateNum) || [])) {
        acts.push(`<span class="bg-tt-personality">${PLANET_GLYPHS[planet]} ${gateNum}.${line}</span>`);
      }
      const channelNote = (GATE_CHANNELS[gateNum] || [])
        .filter(ch => definedChannelKeys.has(ch.gates.join('-')))
        .map(ch => escapeHTML(t('Channel of {name} ({gates})', {
          name: nameOfChannelNote(ch), gates: ch.gates.join('-')
        })))
        .join(' · ');
      const gateTitle = t('Gate {gate} — {name}', { gate: gateNum, name: nameOfGateTooltip(gateNum) });
      return `<strong>${escapeHTML(gateTitle)}</strong>` +
        (acts.length ? `<div class="bg-tt-acts">${acts.join(' ')}</div>` : '') +
        (channelNote ? `<div class="bg-tt-channel">${channelNote}</div>` : '');
    }

    function centerTooltipText(centerKey) {
      const dn = nameOfCenter(centerKey);
      const centerTitle = escapeHTML(t('{center} Center', { center: dn }));
      if (composite) {
        const o = centerOwner(centerKey);
        const txt = o === 'both' ? t('Both of you define this')
          : o === 'a' ? t('{label} defines this', { label: composite.labelA })
          : o === 'b' ? t('{label} defines this', { label: composite.labelB })
          : o === 'bridged' ? t('Newly defined in the relationship')
          : t(compositeStructure.centerStates.find(state => state.center === centerKey)?.status === 'open' ? 'Completely open' : 'Undefined');
        return `<strong>${centerTitle}</strong><div class="bg-tt-channel">${escapeHTML(txt)}</div>`;
      }
      const defined = definedCenters.has(centerKey);
      if (transit) return `<strong>${centerTitle}</strong><div class="bg-tt-channel">${escapeHTML(t(transit.mode === 'overlay' && transit.natalCenters.has(centerKey) ? 'Defined in birth chart' : defined ? 'Defined by the selected transit combination' : 'Not defined in the selected view'))}</div>`;
      const count = [...activeGates].filter(g => GATES[g]?.center === centerKey).length;
      const description = t(defined ? 'Defined — consistent energy you radiate' : 'Open — you take this energy in') +
        (count ? t(count === 1 ? ' · {count} active gate' : ' · {count} active gates', { count }) : '');
      return `<strong>${centerTitle}</strong><div class="bg-tt-channel">${escapeHTML(description)}</div>`;
    }

    function compositeGateTooltip(g) {
      const o = gateOwner(g);
      const who = o === 'both' ? `${composite.labelA} + ${composite.labelB}`
        : o === 'a' ? composite.labelA : o === 'b' ? composite.labelB : t('Neither of you');
      const dyn = (GATE_CHANNELS[g] || [])
        .map(ch => {
          const d = channelDynamic(ch);
          if (!d) return null;
          const name = nameOfChannelLine(ch);
          return escapeHTML(`${t(d)} · ${name}`);
        })
        .filter(Boolean);
      const gateTitle = t('Gate {gate} — {name}', { gate: g, name: nameOfGateTooltip(g) });
      return `<strong>${escapeHTML(gateTitle)}</strong>` +
        `<div class="bg-tt-acts">${escapeHTML(who)}</div>` +
        (dyn.length ? `<div class="bg-tt-channel">${dyn.join('<br>')}</div>` : '');
    }

    /**
     * Where `left/top` actually point, measured instead of assumed.
     *
     * Without the top layer the overlay is a fixed descendant of the graph, and the graph's
     * containing block is whatever ancestor established one — the shell's translated canvas,
     * a `container-type`/`contain` box, or the natal chart's `--bg-stage-scale`. `left/top`
     * are then expressed in that block's own coordinate space, and an ancestor *scale* maps
     * them to the viewport with the same scale. Subtracting an origin alone would therefore
     * be wrong under a scale, so two probe placements are read back and the map between the
     * two spaces is derived from them.
     */
    function localPlacement(x, y) {
      tooltip.style.left = '0px';
      tooltip.style.top = '0px';
      const origin = tooltip.getBoundingClientRect();
      tooltip.style.left = '100px';
      tooltip.style.top = '100px';
      const probe = tooltip.getBoundingClientRect();
      const scaleX = (probe.left - origin.left) / 100 || 1;
      const scaleY = (probe.top - origin.top) / 100 || 1;
      return { left: (x - origin.left) / scaleX, top: (y - origin.top) / scaleY };
    }

    function positionTooltip({ x: pointerX, y: pointerY, touch = false }) {
      // Flip near viewport edges, then clamp so the full contents stay visible. Sizes and
      // edges are read in viewport space either way — `getBoundingClientRect()` already
      // carries any ancestor scale — so the clamp is the same in both modes.
      const gap = 12, margin = 8;
      const { width, height } = tooltip.getBoundingClientRect();
      const { clientWidth, clientHeight } = document.documentElement;
      const x = pointerX + gap + width <= clientWidth - margin
        ? pointerX + gap : pointerX - width - gap;
      const y = touch ? pointerY - height - 20
        : pointerY + gap + height <= clientHeight - margin
        ? pointerY + gap : pointerY - height - gap;
      const placedX = Math.max(margin, Math.min(x, clientWidth - width - margin));
      const placedY = Math.max(margin, Math.min(y, clientHeight - height - margin));
      const local = supportsPopover ? { left: placedX, top: placedY } : localPlacement(placedX, placedY);
      tooltip.style.left = `${local.left}px`;
      tooltip.style.top = `${local.top}px`;
    }

    /** The pointer that produced an event. */
    const pointerAnchor = evt => ({ x: evt.clientX, y: evt.clientY, touch: evt.pointerType === 'touch' });
    /** An element that has keyboard focus: anchor beside its own box instead. */
    const nodeAnchor = node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.right, y: rect.top + rect.height / 2, touch: false };
    };

    svg.addEventListener('pointerover', (evt) => {
      // Touch taps fire a synthetic hover that would leave a tooltip stuck and
      // double up with the click → detail. On touch we let the tap do the work. The
      // hover capability check above also covers the compatibility event a touch device
      // gets, which arrives with `pointerType: 'mouse'`.
      if (evt.pointerType === 'touch' || !canHover()) return;
      const gateEl = evt.target.closest('[data-gate]');
      if (gateEl) {
        const gateNum = parseInt(gateEl.getAttribute('data-gate'));
        highlightGate(gateNum);
        showTooltip(tooltipText(gateNum), pointerAnchor(evt));
        return;
      }
      const centerEl = evt.target.closest('[data-center]');
      if (centerEl) {
        const key = centerEl.getAttribute('data-center');
        highlightCenter(key);
        showTooltip(centerTooltipText(key), pointerAnchor(evt));
      }
    });
    let touchStart = null;
    let touchDragged = false;
    function showTouchPreview(evt) {
      const target = document.elementFromPoint(evt.clientX, evt.clientY);
      const gateEl = target?.closest('[data-gate]');
      const centerEl = target?.closest('[data-center]');
      if (gateEl && svg.contains(gateEl)) {
        const gate = Number(gateEl.getAttribute('data-gate'));
        highlightGate(gate);
        showTooltip(tooltipText(gate), pointerAnchor(evt));
        return;
      }
      if (centerEl && svg.contains(centerEl)) {
        const center = centerEl.getAttribute('data-center');
        highlightCenter(center);
        showTooltip(centerTooltipText(center), pointerAnchor(evt));
        return;
      }
      highlightGate(null);
      hideTooltip();
    }
    if (opts.touchPreview) {
      let touchPointerId = null;
      const trackTouchPreview = evt => {
        if (evt.pointerId !== touchPointerId || !touchStart) return;
        if (Math.hypot(evt.clientX - touchStart.x, evt.clientY - touchStart.y) > 8) touchDragged = true;
        showTouchPreview(evt);
      };
      const endTouchPreview = evt => {
        if (evt.pointerId !== touchPointerId) return;
        touchStart = null;
        touchPointerId = null;
        highlightGate(null);
        hideTooltip();
        document.removeEventListener('pointermove', trackTouchPreview);
        document.removeEventListener('pointerup', endTouchPreview);
        document.removeEventListener('pointercancel', endTouchPreview);
        if (evt.type === 'pointercancel') touchDragged = false;
      };
      svg.addEventListener('pointerdown', (evt) => {
        if (evt.pointerType !== 'touch') return;
        touchStart = { x: evt.clientX, y: evt.clientY };
        touchPointerId = evt.pointerId;
        touchDragged = false;
        showTouchPreview(evt);
        document.addEventListener('pointermove', trackTouchPreview);
        document.addEventListener('pointerup', endTouchPreview);
        document.addEventListener('pointercancel', endTouchPreview);
      });
    }
    svg.addEventListener('pointermove', (evt) => {
      if (evt.pointerType !== 'touch' && canHover() && tooltipOpen()) positionTooltip(pointerAnchor(evt));
    });
    svg.addEventListener('pointerout', (evt) => {
      if (evt.pointerType === 'touch' && touchStart) return;
      const rt = evt.relatedTarget;
      const stayingOnTarget = rt && svg.contains(rt) && (rt.closest('[data-gate]') || rt.closest('[data-center]'));
      if (!stayingOnTarget) {
        highlightGate(null); // reverts to the pinned selection (or clears)
        hideTooltip();
      }
    });
    // Keyboard focus previews the same thing the pointer does, from the object's own
    // box instead of a pointer position. `:focus-visible` keeps a mouse click — which
    // also focuses the gate — from re-anchoring the overlay the pointer just placed.
    svg.addEventListener('focusin', (evt) => {
      if (!evt.target.matches?.(':focus-visible')) return;
      const gateEl = evt.target.closest('[data-gate]');
      if (gateEl) {
        const gateNum = parseInt(gateEl.getAttribute('data-gate'));
        highlightGate(gateNum);
        showTooltip(tooltipText(gateNum), nodeAnchor(gateEl));
        return;
      }
      const centerEl = evt.target.closest('[data-center]');
      if (centerEl) {
        const key = centerEl.getAttribute('data-center');
        highlightCenter(key);
        showTooltip(centerTooltipText(key), nodeAnchor(centerEl));
      }
    });
    svg.addEventListener('focusout', (evt) => {
      if (evt.relatedTarget && svg.contains(evt.relatedTarget)) return;
      highlightGate(null);
      hideTooltip();
    });
    svg.addEventListener('click', (evt) => {
      if (touchDragged && evt.pointerType === 'touch') { touchDragged = false; return; }
      const gateEl = evt.target.closest('[data-gate]');
      if (gateEl && opts.onGateClick) {
        // The card replaces the overlay, and the overlay is now in the top layer — above
        // the card — so it must not outlive the click that opened it.
        hideTooltip();
        opts.onGateClick(parseInt(gateEl.getAttribute('data-gate')));
        return;
      }
      const centerEl = evt.target.closest('[data-center]');
      if (centerEl && opts.onCenterClick) {
        hideTooltip();
        opts.onCenterClick(centerEl.getAttribute('data-center'));
      }
    });
    svg.addEventListener('keydown', (evt) => {
      // The keyboard has two dismissal-free preview paths (focus shows the overlay, Escape
      // must be able to take it back) and two activation paths that hand over to the detail
      // sheet. Escape never calls `preventDefault()`: an open detail card owns it, and this
      // handler only dismisses the graph's own overlay when there is one to dismiss.
      if (evt.key === 'Escape') {
        if (tooltipOpen()) hideTooltip();
        return;
      }
      if (evt.key !== 'Enter' && evt.key !== ' ') return;
      // The sheet replaces the overlay, and the overlay is in the top layer — above the
      // sheet — so it must not survive the key that opened the sheet. Same rule the click
      // handler follows.
      const gateEl = evt.target.closest('[data-gate]');
      if (gateEl && opts.onGateClick) {
        evt.preventDefault();
        hideTooltip();
        opts.onGateClick(parseInt(gateEl.getAttribute('data-gate')));
        return;
      }
      const centerEl = evt.target.closest('[data-center]');
      if (centerEl && opts.onCenterClick) {
        evt.preventDefault();
        hideTooltip();
        opts.onCenterClick(centerEl.getAttribute('data-center'));
      }
    });

    nextGraph.appendChild(tooltip);
  }

  // ---------- Planet columns ----------
  const natalFixings = showColumns ? calculateLineFixings(chart) : null;
  function planetColumn(side, gates, dateLabel) {
    const col = el('div', { class: `bg-planets bg-planets-${side}` });
    const title = t(side === 'design' ? 'Design' : 'Personality');
    col.appendChild(el('div', {
      class: 'bg-planets-head',
      text: title
    }));
    if (dateLabel) col.appendChild(el('div', { class: 'bg-planets-date', text: dateLabel }));
    for (const planet of PLANET_ORDER) {
      const g = gates?.[planet];
      const row = el('button', {
        class: 'bg-planet-row',
        type: 'button',
        'data-gate': g ? g.gate : '',
        title: displayPlanet(planet),
        'aria-label': g
          ? t('{title} {planet}: gate {gate} line {line}', {
            title, planet: displayPlanet(planet), gate: g.gate, line: g.line
          })
          : t('{planet}: no activation', { planet: displayPlanet(planet) })
      });
      const glyph = el('span', { class: 'bg-planet-glyph', text: PLANET_GLYPHS[planet] });
      const activation = el('span', { class: 'bg-planet-act', text: g ? `${g.gate}.${g.line}` : '—' });
      const state = natalFixings?.[side]?.[planet]?.natalState;
      const fixing = el('span', { class: 'bg-natal-fixing', 'data-state': state || '',
        'aria-hidden': 'true', text: ({ exalted: '▲', detriment: '▼', juxtaposed: '▲▼', unknown: '?' })[state] || '' });
      if (side === 'personality') row.append(fixing, activation, glyph);
      else row.append(glyph, activation, fixing);
      if (g) {
        row.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') highlightGate(g.gate); });
        row.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') highlightGate(null); });
        if (opts.onGateClick) {
          row.style.cursor = 'pointer';
          row.addEventListener('click', () => opts.onGateClick(g.gate, { side, planet, line: g.line }));
        }
      }
      col.appendChild(row);
    }
    return col;
  }

  const svgWrap = el('div', { class: 'bg-svg-wrap' });
  const graphVariable = opts.composite || opts.planetColumns === false ? null : chart.variable;
  const topArrows = renderVariableArrowRow(graphVariable, 'top', t);
  const bottomArrows = renderVariableArrowRow(graphVariable, 'bottom', t);
  if (topArrows) svgWrap.appendChild(topArrows);
  svgWrap.appendChild(svg);
  if (bottomArrows) svgWrap.appendChild(bottomArrows);

  if (showColumns) {
    const designDate = chart.positions?.design?.date || null;
    const wrap = el('div', { class: 'bg-grid' });
    wrap.appendChild(planetColumn('design', chart.gates?.design, designDate));
    wrap.appendChild(svgWrap);
    wrap.appendChild(planetColumn('personality', chart.gates?.personality, chart.positions?.personality?.date || null));
    nextGraph.appendChild(wrap);
  } else {
    nextGraph.appendChild(topArrows || bottomArrows ? svgWrap : svg);
  }
  container.replaceChildren(nextGraph);

  const api = { highlightGate, highlightCenter, highlightSelection: selection => applySelection(selection || pinned), setPinned };
  if (composite) Object.assign(api, { gateOwner, centerOwner, channelDynamic });
  return api;
}

export default renderBodygraph;
