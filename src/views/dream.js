/**
 * Dream view — the DreamRave (sleep chart) page.
 *
 * Sits beside Timeline, Team and Organization as a top-level page. The sleeping
 * design always renders with the current transit overlaid (no separate transit
 * view is needed for it), and its three night fields — Light Field, Earth Plane,
 * Demon Realm — are listed under the graph with every activation, its dream gate
 * name, its dream line theme and the planets that carry it.
 *
 * The overlay's moment comes from the shared time control
 * (`lib/transit-time-control.js`), the same component the Transits page mounts:
 * date, time, timezone, Now and the DST fold choice behave identically on both
 * pages. A changed moment re-solves nothing but the overlay — the lunar arc is
 * handed back to `computeDreamChart()` as `design`.
 *
 * The transit term is the shared UI key `"Transit"` (`t('Transit')`), not a
 * sleep-chart wording of its own: the page and the Transits page name the same
 * activations the same way, and renaming the term happens in the locale file
 * once. See `transitTerm()`.
 *
 * Gates, centres and channels open a sleep-chart detail sheet built by
 * `lib/dream-detail.js`. That module reuses the shared dialog shell, headings and
 * interpretive readings, but owns its activation data: the waking sheet in
 * `views/chart.js` reads that module's own current chart for the design side, so
 * handing it the sleeping graph would have shown the waking design activations
 * (Sun −88°) instead of the sleep design's (Moon −88°). AGENTS.md §6 requires the
 * data context to be explicit. The prose stays the waking reading, per the
 * teaching that the sleeping chart is described with the waking descriptions.
 *
 * Comparison mode is chosen on this page: the toolbar button opens the shared
 * person picker, the chosen person's waking chart is computed here, and both
 * sleeping designs then share one graph, coloured by who carries each gate, with
 * no transit overlaid. It states structural facts only, and it keeps the same
 * graph shell and the same activation columns as the single design — each slot
 * carries one person's design and personality columns instead of one column.
 *
 * Calculation: lib/dream-chart.js. Topology: human-design/dream-topology.js.
 * Graph: the shared renderer, narrowed with the dream topology. Vocabulary:
 * lib/dream-vocabulary.js, so the sleeping names never touch the waking ones.
 */

import { renderBodygraph, PLANET_ORDER, PLANET_GLYPHS, BODYGRAPH_PAD } from '../bodygraph.js';
import { computeDreamChart, dreamGraphChart, buildDreamTransitGraph } from '../lib/dream-chart.js';
import {
  DREAM_TOPOLOGY, DREAM_REALMS, DREAM_REALM_ORDER, DREAM_CHANNELS, DREAM_VIEW_BOX, dreamRealmOf
} from '../lib/human-design/dream-topology.js';
import { analyzeConnectionStructure } from '../lib/human-design/connection-structure.js';
import { createDreamDetail } from '../lib/dream-detail.js';
import { compositePalette } from '../lib/skin-registry.js';
import { dreamGateName, dreamLineTheme, dreamRealmName, dreamTypeName } from '../lib/dream-vocabulary.js';
import { typeName, planetName, channelName, centerName } from '../lib/vocabulary.js';
import { t, formatDisplay, setMessage } from '../lib/i18n.js';
import { getCurrentChart } from './chart.js';
import { getPerson, birthFromPerson } from '../lib/people.js';
import { computeChart } from '../lib/chartdata.js';
import { openPersonPicker } from '../lib/person-picker.js';
import { graphShellMarkup, observeGraphShell } from '../lib/graph-shell.js';
import { mountTransitTimeControl } from '../lib/transit-time-control.js';
import { esc } from '../lib/format.js';
import '../styles/dream.css';

let lastDream = null;          // cached model, keyed by the waking chart it came from
let lastComparison = null;     // { a, b, labelB } cached comparison models
let pendingComparison = null;  // { chart, label } chosen on this page
let comparisonBusy = false;    // a picker selection is still being computed
let requestSequence = 0;
let shellDispose = null;
// The shared transit time control (lib/transit-time-control.js). One instance for
// the page: the overlay is the only thing it drives, and the two-person composite
// has no overlay at all, so the control is hidden while one is shown.
let timeControl = null;
// One detail context for the whole page: it carries the dream model and the
// transit model the panels read, and a redraw keeps the same reference so an
// open sheet survives a language or skin change.
let detailContext = null;
// The sleep-chart detail controller. Recreated per render, because it closes
// over that render's dream model and graph API.
let detail = null;

/** Width/height of the drawn graph, padding included, so the shell sizes the canvas exactly. */
const DREAM_GRAPH_ASPECT = (DREAM_VIEW_BOX.w + BODYGRAPH_PAD * 2) / (DREAM_VIEW_BOX.h + BODYGRAPH_PAD * 2);

export function invalidateDream() {
  ++requestSequence;
  lastDream = null;
  lastComparison = null;
  // A different person invalidates the chosen comparison; otherwise the sleep
  // chart would keep showing the previous pair.
  pendingComparison = null;
  updateCompareButton();
  detail?.close();
  detail = null;
  detailContext = null;
  shellDispose?.disconnect();
  shellDispose = null;
  document.getElementById('dream-content')?.replaceChildren();
}

/**
 * Compare with a second person, chosen on this page.
 *
 * Person B's waking chart is computed here from their saved birth data, so the
 * comparison is keyed to a stable person id rather than to a chart handed over
 * by another view. A cached comparison belongs to the pair that produced it, so
 * choosing someone else drops it before the new pair is solved.
 */
function setDreamComparison({ chart, label }) {
  // The pair is only meaningful against the chart it was chosen from, so the
  // current chart travels with it: switching to another person on the page
  // header leaves a comparison that no longer describes what is on screen.
  pendingComparison = { chart, label, forChart: getCurrentChart()?.chart || null };
  lastComparison = null;
  updateCompareButton();
}

/** True when the pending comparison still belongs to the loaded chart. */
function comparisonMatches(current) {
  return !!pendingComparison && pendingComparison.forChart === current.chart;
}

function clearDreamComparison() {
  pendingComparison = null;
  lastComparison = null;
  updateCompareButton();
}

/** The toolbar button names the current state: pick a second person, or swap them. */
function updateCompareButton() {
  const button = document.getElementById('dream-compare');
  if (!button) return;
  setMessage(button, pendingComparison ? 'Change the other person' : 'Compare with another person');
}

export function setupDreamView() {
  timeControl?.destroy();
  timeControl = mountTransitTimeControl({
    host: document.getElementById('dream-time-host'),
    // Own prefix, so the ids never collide with the Transits page's `transit-*`
    // ones while both controls exist in the document.
    idPrefix: 'dream-transit',
    // No transit-only mode here: the sleep design is always the base body.
    showModeToggle: false,
    onChange: selection => {
      // A null selection means the wall time does not resolve (DST gap or bad
      // zone); the control already says so, and redrawing would show "now".
      if (selection && !pendingComparison) renderDreamView();
    }
  });
  document.getElementById('dream-compare')?.addEventListener('click', chooseComparisonPerson);
  setTransitSubtitle();
  updateCompareButton();
}

/**
 * The page subtitle names the overlay with the shared term. `setMessage` stores
 * the parameters, so `translatePage()` re-renders this line on a language change
 * like every other marked node.
 */
function setTransitSubtitle() {
  setMessage(document.getElementById('dream-subtitle'),
    'The five-centre design you sleep in, with {transit} always overlaid.',
    { transit: transitTerm() });
}

/** The moment the overlay is read at; undefined lets computeDreamChart use "now". */
function selectedTransitInstant() {
  const instant = timeControl?.getInstant();
  return Number.isFinite(instant) ? instant : undefined;
}

/** The composite carries no overlay, so its time control must not invite a change. */
function setTimeControlVisible(visible) {
  const host = document.getElementById('dream-time-host');
  if (host) host.hidden = !visible;
}

/**
 * The loaded person's stable id. `getCurrentChart()` returns the same `birth`
 * object main.js computed the chart from, and that object carries the person id
 * for a saved person; a shared guest or a manually entered chart has none, which
 * leaves the picker showing everyone.
 */
function currentPersonId() {
  return getCurrentChart()?.birth?.id || null;
}

function chooseComparisonPerson() {
  const currentId = currentPersonId();
  openPersonPicker({
    title: t('Compare with another person'),
    multiple: false,
    exclude: currentId ? [currentId] : [],
    // Single selection commits on the row click, so the dialog closes and the
    // toolbar status takes over: no second dialog opens for a slow or failing
    // solve, and a failure is reported where the rest of the page reports one.
    onCommit: ids => { startComparison(ids?.[0]); },
    onCancel: () => {}
  });
}

/** Person B's waking chart, then the pair's sleep charts, with a status while they solve. */
async function startComparison(personId) {
  if (comparisonBusy) return;
  const status = document.getElementById('dream-status');
  const person = personId ? getPerson(personId) : null;
  if (!person) {
    setMessage(status, 'That person is no longer in your saved charts.');
    return;
  }
  comparisonBusy = true;
  try {
    setMessage(status, 'Computing both sleep charts…');
    // A missing or incomplete birth record fails here, before the sleep charts
    // are even attempted; the message names the reason and stays in the toolbar.
    const { chart } = await computeChart(birthFromPerson(person));
    setDreamComparison({ chart, label: person.name });
    await renderDreamView();
  } catch (error) {
    setMessage(status, 'Sleep chart calculation failed: {error}', { error: error.message });
  } finally {
    comparisonBusy = false;
  }
}

/**
 * Empty the toolbar status line.
 *
 * `setMessage()` records the source key on the node so `translatePage()` can
 * re-render it; emptying the children alone leaves that key behind, and the next
 * language change writes the old message back into an otherwise finished page.
 * Clearing the key with the text is what makes the line actually go away.
 */
function clearStatus(status) {
  if (!status) return;
  delete status.dataset.i18n;
  status.replaceChildren();
}

/**
 * Render the sleep chart for the current person.
 *
 * The overlay is part of this chart by design, so opening the page always
 * re-reads it at the moment the time control shows. The lunar arc solve depends
 * only on the birth data, so it is solved once and handed back as `design`:
 * moving the time control therefore costs one ephemeris snapshot, not the whole
 * Newton iteration.
 *
 * @param {object} [options]
 * @param {boolean} [options.refresh] - also re-solve the lunar arc from scratch
 */
export async function renderDreamView({ refresh = false } = {}) {
  const content = document.getElementById('dream-content');
  const status = document.getElementById('dream-status');
  if (!content) return;
  const current = getCurrentChart();
  if (!current) { content.replaceChildren(); return; }

  // A comparison chosen for a different person is stale, not reusable.
  if (pendingComparison && !comparisonMatches(current)) clearDreamComparison();

  if (pendingComparison) {
    setTimeControlVisible(false);
    if (!refresh && lastComparison) { drawComparison({ content, current, ...lastComparison }); return; }
    await renderComparison({ content, status, current, comparison: pendingComparison });
    return;
  }
  setTimeControlVisible(true);

  const request = ++requestSequence;
  const transitInstant = selectedTransitInstant();
  const cached = !refresh && lastDream?.natalChart === current.chart ? lastDream : null;
  // Same person and same moment: the drawn model is still exactly right.
  if (cached && cached.transitInstant === transitInstant) {
    clearStatus(status);
    drawDream(cached, content);
    return;
  }
  try {
    if (!cached) setMessage(status, 'Computing the sleep chart…');
    const dream = await computeDreamChart(current.chart,
      cached ? { design: cached.solve, transitInstant } : { transitInstant });
    if (request !== requestSequence || current.chart !== getCurrentChart()?.chart) return;
    dream.natalChart = current.chart;
    dream.transitInstant = transitInstant;
    lastDream = dream;
    clearStatus(status);
    drawDream(dream, content);
  } catch (error) {
    if (request !== requestSequence) return;
    setMessage(status, 'Sleep chart calculation failed: {error}', { error: error.message });
    content.replaceChildren();
  }
}

async function renderComparison({ content, status, current, comparison }) {
  const request = ++requestSequence;
  try {
    setMessage(status, 'Computing both sleep charts…');
    // Comparison follows the original dream design: both sleeping designs share
    // one composite body, and no transit is overlaid.
    const [a, b] = await Promise.all([
      computeDreamChart(current.chart, { transit: false }),
      computeDreamChart(comparison.chart, { transit: false })
    ]);
    if (request !== requestSequence) return;
    lastComparison = { a, b, labelB: comparison.label };
    clearStatus(status);
    drawComparison({ content, current, ...lastComparison });
  } catch (error) {
    if (request !== requestSequence) return;
    setMessage(status, 'Sleep chart calculation failed: {error}', { error: error.message });
  }
}

/** Language and skin changes redraw from the cached model without recomputing. */
export function refreshDreamLanguage() {
  const content = document.getElementById('dream-content');
  const current = getCurrentChart();
  if (!content || !current) return;
  // `translatePage()` re-renders this line from the parameters stored with it,
  // and that parameter is the previous language's word for the overlay, so the
  // subtitle is rewritten here with the new one.
  setTransitSubtitle();
  if (pendingComparison && lastComparison && comparisonMatches(current)) {
    setTimeControlVisible(false);
    drawComparison({ content, current, ...lastComparison });
    // The composite redraw re-uses the same sheet controller, so an open card
    // must be repainted from it as the single-design path does.
    detail?.refresh();
    return;
  }
  setTimeControlVisible(true);
  if (lastDream?.natalChart !== current.chart) return;
  drawDream(lastDream, content);
  // The redraw replaced the graph API on the same context object; an open sheet
  // re-renders from it, keeping its selection, lens and navigation history.
  detail?.refresh();
}

// ==========================================
// Helpers
// ==========================================

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  if (text != null) node.textContent = text;
  return node;
}

/**
 * The transit term, read from the one shared UI key ("Transit", owned by the
 * locale files' ui-transits.json) instead of a sleep-chart copy: renaming it to
 * another word happens there once and every page follows. The sleep chart used
 * to call the same overlay "Night sky", which split the vocabulary between two
 * pages describing the same activations.
 */
const transitTerm = () => t('Transit');

/** Browser-locale formatting: a view never branches on the interface language. */
const dateTimeText = iso => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
const dateText = iso => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));

const TYPE_COLORS = {
  generator: 'var(--generator)',
  projector: 'var(--projector)',
  reflector: 'var(--reflector)',
  Generator: 'var(--generator)',
  'Manifesting Generator': 'var(--manifesting-generator)',
  Manifestor: 'var(--manifestor)',
  Projector: 'var(--projector)',
  Reflector: 'var(--reflector)'
};

const typeChip = (name, color) =>
  `<span class="dream-type-chip" style="background:${color}">${esc(name)}</span>`;

// ==========================================
// Shared detail sheet
// ==========================================

/**
 * The context this page threads through its panels, plus the detail controller
 * built from it.
 *
 * `model` is the dream transit model; the night-field channel rows read its
 * `channelSource()` for their four states, which `buildTransitGraph()` defines
 * identically for a waking overlay. `dream` carries the sleeping activations
 * themselves, and is what the detail sheet reads — never the waking chart.
 */
function dreamDetailContext(dream) {
  const context = detailContext || {};
  context.dream = dream;
  context.transitGates = dream.gates.transit || {};
  context.mode = 'overlay';
  context.model = buildDreamTransitGraph(dream);
  detailContext = context;
  // The controller outlives a redraw: a language or skin change hands it the new
  // model, so the sheet the dialog owns keeps its place in the document, its
  // selection and its history instead of being replaced under an open card.
  if (detail) detail.update({ dream, model: context.model, composite: null, a: null, b: null });
  else detail = createDreamDetail({ dream, model: context.model });
  return context;
}

const openGate = gate => detail?.showGate(gate);
const openChannel = id => detail?.showChannel(id);
const openCenter = center => detail?.showCenter(center);

// ==========================================
// Single sleep design
// ==========================================

function drawDream(dream, content) {
  content.replaceChildren();
  content.appendChild(typeStrip(dream));

  const context = dreamDetailContext(dream);
  const { shell, api } = dreamGraphShell(dream, { overlay: true, context });
  // The sheet pins its selection through this API, and a language redraw must
  // hand it the graph that is actually on screen.
  context.api = api;
  detail.update({ api });
  content.appendChild(shell);
  // The shell measures itself, so it must be in the document before fitting.
  shellDispose?.disconnect();
  shellDispose = observeGraphShell(shell, { aspect: DREAM_GRAPH_ASPECT, idealWidth: 720 });

  const realms = el('div', { class: 'dream-realms' });
  for (const realmId of DREAM_REALM_ORDER) realms.appendChild(realmPanel(dream, realmId, { overlay: true, context, api }));
  content.appendChild(realms);
  content.appendChild(provenanceNote(dream));
  // The sheet lives inside this page's content, as the relationship composite's
  // does. The redraw re-appends the same element the controller always owned, so
  // an open card is never detached from the dialog that is tracking it.
  content.appendChild(detail.element);
}

function typeStrip(dream) {
  const waking = dream.wakingType?.name ? typeName(dream.wakingType.name) : '—';
  const sleeping = dreamTypeName(dream.type.id);
  const centers = formatDisplay('separated', dream.centers.definedNames.map(centerName), 'centers');
  const channels = formatDisplay('separated',
    dream.channels.map(channel => `${channel.gates.join('-')} ${channelName(channel.gates)}`), 'channels');
  const strip = el('div', { class: 'dream-type-strip' });
  strip.innerHTML = `
    <div class="dream-type-flow">
      <span class="dream-type-pair">
        <span class="dream-type-label">${esc(t('Awake'))}</span>
        ${typeChip(waking, TYPE_COLORS[dream.wakingType?.name] || 'var(--hd-inactive)')}
      </span>
      <span class="dream-type-arrow" aria-hidden="true">→</span>
      <span class="dream-type-pair">
        <span class="dream-type-label">${esc(t('Asleep'))}</span>
        ${typeChip(sleeping, TYPE_COLORS[dream.type.id] || 'var(--hd-inactive)')}
      </span>
    </div>
    <div class="dream-type-facts">
      <span class="dream-fact">${esc(t('Sleep type: {type}', { type: sleeping }))}</span>
      <span class="dream-fact">${esc(dream.centers.definedNames.length
        ? t('Defined in sleep: {centers}', { centers })
        : t('Nothing defined in sleep'))}</span>
      ${dream.channels.length ? `<span class="dream-fact">${esc(t('Complete dream channels: {channels}', { channels }))}</span>` : ''}
    </div>
    ${dream.hasTransit ? `<div class="dream-type-facts"><span class="dream-fact">${esc(
      t('{transit} at {moment} is overlaid.', { transit: transitTerm(), moment: dateTimeText(dream.transit.iso) }))}</span></div>` : ''}`;
  return strip;
}

// ==========================================
// Graph + compact activation columns
// ==========================================

const planetRows = activations => PLANET_ORDER
  .map(planet => [planet, activations?.[planet]])
  .filter(([, activation]) => activation)
  .map(([planet, activation]) => ({ planet, activation }));

/**
 * One activation column: the planets of one side of one sleeping design.
 *
 * `side` keeps its meaning (`design` / `personality`) and drives the CSS class
 * and the heading; `owner` only prefixes that heading, so the composite can put
 * one person's two columns into a slot without a second column component. Both
 * paths call this function — that is the point: the composite differs from the
 * single design in which parts it fills, not in what it is made of.
 *
 * @param {'design'|'personality'} side - which half of the sleeping design
 * @param {object} activations - planet → { gate, line } map for that half
 * @param {string|null} when - the date that half was taken from
 * @param {string} [owner] - optional person label, e.g. the composite's person A
 */
function activationColumn(side, activations, when, owner = '') {
  const heading = side === 'design' ? 'Sleep design' : 'Sleep personality';
  const label = owner
    // The site's own separator convention (`formatDisplay('separator')`), so the
    // heading punctuates like every other composed label instead of inventing a
    // private join and a locale key for it.
    ? `${owner}${formatDisplay('separator', 'label')}${t(heading)}`
    : t(heading);
  const column = el('section', {
    class: `dream-column dream-column-${side}`,
    'aria-label': label,
    ...(owner ? { 'data-owner': owner } : {})
  });
  column.appendChild(el('div', { class: 'dream-column-head', text: label }));
  if (when) column.appendChild(el('div', { class: 'dream-column-date', text: when }));
  const rows = planetRows(activations);
  if (!rows.length) {
    column.appendChild(el('div', { class: 'dream-column-empty', text: t('No dream-gate activations') }));
    return column;
  }
  for (const { planet, activation } of rows) {
    const row = el('button', {
      class: `dream-column-row dream-column-row-${side}`,
      type: 'button',
      'data-gate': activation.gate,
      'aria-label': t('{planet} activates gate {gate}, line {line}',
        { planet: planetName(planet), gate: activation.gate, line: activation.line })
    });
    row.appendChild(el('span', { class: 'dream-column-glyph', 'aria-hidden': 'true', text: PLANET_GLYPHS[planet] || '' }));
    row.appendChild(el('span', { class: 'dream-column-act', text: `${activation.gate}.${activation.line}` }));
    row.appendChild(el('span', { class: 'dream-column-planet', text: planetName(planet) }));
    column.appendChild(row);
  }
  return column;
}

/** The date the personality side was taken from, as the columns print it. */
const personalityWhen = dream => dream.source.personalityDate
  ? dateText(new Date(`${dream.source.personalityDate}T12:00:00Z`).toISOString())
  : null;

/**
 * Put one sleeping design's columns into a shell slot.
 *
 * A single design has one column per slot and keeps its exact previous markup; a
 * two-person composite stacks that person's design and personality columns in
 * the same slot, which is why the wrapper only exists for more than one column.
 * The slot's content width is read from its first child, so the wrapper declares
 * the same `--ohd-slot-content-width` a bare column does (styles/dream.css).
 */
function fillSlot(shell, slot, columns) {
  const host = shell.querySelector(`[data-slot="${slot}"]`);
  if (!host) return;
  if (columns.length === 1) { host.appendChild(columns[0]); return; }
  const group = el('div', { class: 'dream-columns' });
  for (const column of columns) group.appendChild(column);
  host.appendChild(group);
}

function dreamGraphShell(dream, { overlay }) {
  const shell = el('div', { class: 'dream-shell' });
  shell.innerHTML = graphShellMarkup({ className: 'dream-graph-shell' });
  const graphHost = el('div', { class: 'dream-graph', id: 'dream-bodygraph' });
  shell.querySelector('.ohd-graph-canvas').appendChild(graphHost);

  const api = renderBodygraph(graphHost, dreamGraphChart(dream), {
    topology: DREAM_TOPOLOGY,
    planetColumns: false,
    animate: false,
    touchPreview: true,
    ariaLabel: dreamAriaLabel(dream),
    ...(overlay && dream.hasTransit ? { transitModel: buildDreamTransitGraph(dream) } : {}),
    // A gate or a centre opens the shared detail sheet, which pins its own
    // selection, so the graph keeps no pinned state here.
    onGateClick: gate => openGate(gate),
    onCenterClick: center => openCenter(center)
  });

  fillSlot(shell, 'left', [activationColumn('design', dream.gates.design, dateText(dream.designMoment.iso))]);
  fillSlot(shell, 'right', [activationColumn('personality', dream.gates.personality, personalityWhen(dream))]);

  bindRowHover(shell, '.dream-column-row[data-gate]', api);
  bindGateDetails(shell);
  return { shell, api };
}

function dreamAriaLabel(dream) {
  const centers = formatDisplay('separated', dream.centers.definedNames.map(centerName), 'centers');
  return [
    t('Sleep chart bodygraph: five centers, fifteen gates.'),
    t('Sleep type: {type}', { type: dreamTypeName(dream.type.id) }),
    dream.centers.definedNames.length
      ? t('Defined in sleep: {centers}', { centers })
      : t('Nothing defined in sleep'),
    dream.channels.length
      ? t('Complete dream channels: {channels}', {
        channels: formatDisplay('separated', dream.channels.map(c => `${c.gates.join('-')} ${channelName(c.gates)}`), 'channels')
      })
      : ''
  ].filter(Boolean).join(' ');
}

/** Hovering or focusing a data row lights the matching object in the graph. */
function bindRowHover(root, selector, api) {
  for (const row of root.querySelectorAll(selector)) {
    const gate = Number(row.dataset.gate);
    row.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') api.highlightGate(gate); });
    row.addEventListener('focus', () => api.highlightGate(gate));
    row.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') api.highlightGate(null); });
    row.addEventListener('blur', () => api.highlightGate(null));
  }
}

/** The activation columns and the night-field rows are the page's other ways into a gate. */
function bindGateDetails(root, selector = '.dream-column-row[data-gate], .dream-row-open[data-gate]') {
  for (const row of root.querySelectorAll(selector)) {
    row.addEventListener('click', () => openGate(Number(row.dataset.gate)));
  }
}

// ==========================================
// Sleep channels
// ==========================================

/**
 * The renderer treats a click on a channel path as a click on its gate, so a
 * channel is reached from the page instead of the graph: one row per dream
 * channel, grouped by the field it belongs to, opening the same shared sheet the
 * gate detail links to.
 *
 * The four states come straight from the dream transit model's `channelSource()`,
 * which `buildTransitGraph()` defines identically for a waking overlay.
 */
const CHANNEL_STATUS = {
  natal: ['Complete in the sleep design', 'natal'],
  completed: ['Completed by {transit}', 'completed'],
  transit: ['{transit} only', 'transit'],
  inactive: ['Not complete in the sleep design', 'inactive']
};

function channelStatusOf(channel, model) {
  const key = channel.gates.join('-');
  if (!model.channels.some(item => item.gates.join('-') === key)) return 'inactive';
  return model.channelSource(channel);
}

const channelStatusBadge = status => {
  const [label, variant] = CHANNEL_STATUS[status];
  return `<span class="dream-channel-status dream-channel-status-${variant}">${esc(t(label, { transit: transitTerm() }))}</span>`;
};

const channelGateNames = channel => channel.gates
  .map(gate => `${gate} ${esc(dreamGateName(gate))}`).join(' · ');

function channelButton(channel, status) {
  const key = channel.gates.join('-');
  const button = el('button', {
    type: 'button',
    class: `dream-channel-open dream-channel-open-${CHANNEL_STATUS[status][1]}`,
    'data-channel': key,
    'aria-label': `${t('Channel {channel}', { channel: key })} · ${channelName(channel.gates)} · ${t(CHANNEL_STATUS[status][0], { transit: transitTerm() })}`
  });
  button.innerHTML = `
    <span class="dream-channel-head">
      <span class="dream-channel-gates">${key.replace('-', '–')}</span>
      <span class="dream-channel-name">${esc(channelName(channel.gates))}</span>
      ${channelStatusBadge(status)}
    </span>
    <span class="dream-channel-named">${channelGateNames(channel)}</span>`;
  button.addEventListener('click', () => openChannel(key));
  return button;
}

/** The dream channels of one night field. Each of the six sits wholly inside one. */
function realmChannels(realmId) {
  return DREAM_CHANNELS.filter(channel => channel.gates.every(gate => dreamRealmOf(gate) === realmId));
}

// ==========================================
// Night field panels
// ==========================================

const SOURCE_ORDER = [
  { key: 'personality', label: 'Awake personality' },
  { key: 'design', label: 'Sleep design' },
  // The overlay source is named by the shared term, not by a page-local label.
  { key: 'transit', label: 'Transit' }
];

function realmPanel(dream, realmId, { overlay, context, api }) {
  const realm = DREAM_REALMS[realmId];
  const realmData = dream.realms.find(item => item.id === realmId);
  const panel = el('section', { class: `dream-realm dream-realm-${realmId}`, 'data-realm': realmId });
  panel.appendChild(el('h3', { class: 'dream-realm-title', text: dreamRealmName(realmId) }));

  const portal = el('div', { class: 'dream-realm-portal' });
  portal.innerHTML = `<span class="dream-portal-gate">${realm.portal}</span>
    <span class="dream-portal-name">${esc(dreamGateName(realm.portal))}</span>
    <span class="dream-portal-tag">${esc(t('Portal of this field'))}</span>`;
  const portalRow = realmData?.rows.find(row => row.portal);
  if (portalRow?.activated || portalRow?.transitActivated) portal.classList.add('dream-portal-active');
  panel.appendChild(portal);

  const rows = (realmData?.rows || [])
    .filter(row => !row.portal && (row.activated || (overlay && row.transitActivated)));
  if (!rows.length) {
    panel.appendChild(el('p', { class: 'dream-realm-empty', text: t('No activations in this field tonight.') }));
  } else {
    const list = el('ul', { class: 'dream-realm-rows' });
    for (const row of rows) list.appendChild(realmRow(row));
    panel.appendChild(list);
    bindGateDetails(list);
  }

  // A portal is a gate without a channel, so its field can hold no channel at all.
  const channels = realmChannels(realmId);
  if (channels.length) {
    const block = el('div', { class: 'dream-realm-channels' });
    block.appendChild(el('h4', { class: 'dream-channels-title', text: t('Sleep channels') }));
    const list = el('ul', { class: 'dream-channel-list' });
    for (const channel of channels) {
      const item = el('li', { class: 'dream-channel-row' });
      item.appendChild(channelButton(channel, channelStatusOf(channel, context.model)));
      list.appendChild(item);
    }
    block.appendChild(list);
    panel.appendChild(block);
    bindChannelHover(block, api);
  }
  return panel;
}

/** Hovering a channel row lights both of its gates and its two centres. */
function bindChannelHover(root, api) {
  for (const button of root.querySelectorAll('.dream-channel-open')) {
    const id = button.dataset.channel;
    if (!id) continue;
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') api.highlightSelection({ kind: 'channel', id }); });
    button.addEventListener('focus', () => api.highlightSelection({ kind: 'channel', id }));
    button.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') api.highlightSelection(null); });
    button.addEventListener('blur', () => api.highlightSelection(null));
  }
}

function realmRow(row) {
  const item = el('li', { class: 'dream-realm-row', 'data-gate': row.gate });
  const line = row.personality[0]?.line ?? row.design[0]?.line ?? row.transit[0]?.line;
  const theme = line ? dreamLineTheme(line) : '';
  const chips = SOURCE_ORDER
    .filter(({ key }) => row[key]?.length)
    .map(({ key, label }) => `<div class="dream-row-source dream-row-source-${key}">
        <span class="dream-row-source-label">${esc(t(label))}</span>
        <span class="dream-row-planets">${row[key].map(source =>
          `<span class="dream-planet-chip"><i aria-hidden="true">${PLANET_GLYPHS[source.planet] || ''}</i>${esc(planetName(source.planet))}${source.line ? ` ${row.gate}.${source.line}` : ''}</span>`).join('')}</span>
      </div>`)
    .join('');
  item.innerHTML = `
    <div class="dream-row-head">
      <button type="button" class="dream-row-open" data-gate="${row.gate}"
        aria-label="${esc(t('Gate {gate}', { gate: row.gate }))}">${row.gate}${line ? `.${line}` : ''}</button>
      <span class="dream-row-name">${esc(dreamGateName(row.gate))}${theme ? ` <span class="dream-row-theme">· ${esc(theme)}</span>` : ''}</span>
      ${row.transitActivated && !row.activated ? `<span class="dream-row-transit-tag">${esc(transitTerm())}</span>` : ''}
    </div>
    ${chips}`;
  return item;
}

function provenanceNote(dream) {
  const note = el('p', { class: 'dream-provenance' });
  note.textContent = t('Sleep design moment: {when} — the Moon 88° of its own arc before birth, {days} days earlier.', {
    when: `${dateTimeText(dream.designMoment.iso)} UTC`,
    days: dream.designMoment.daysBeforeBirth.toFixed(1)
  });
  return note;
}

// ==========================================
// Comparison mode: one composite sleep design (chosen on this page)
// ==========================================

/**
 * Relationship ownership colours come from the shared skin registry, so the
 * sleep composite and the connection composite can never drift apart. The
 * renderer mixes these values for gate numbering, hence resolved colours rather
 * than `var(...)` references.
 */

function drawComparison({ content, current, a, b, labelB }) {
  const labelA = current?.birth?.name || t('Person A');
  const palette = compositePalette();
  const chartA = dreamGraphChart(a);
  const chartB = dreamGraphChart(b);
  // Both sleep charts are already narrowed to the dream gates, so the shared
  // structure analysis only ever meets the six dream channels: it reads
  // `gates.all` against the shared channel catalogue, and every gate either
  // partner holds is inside that topology. No dream-specific adaptor is needed.
  const structure = analyzeConnectionStructure(chartA, chartB);

  detailContext = null;
  // Two sleeping designs, one graph: the sheet reports who carries each gate
  // instead of the three activation sources, and there is no night sky to show.
  // Reusing the controller keeps one sheet element across the single/composite
  // switch, so no second dialog can end up tracking a detached card.
  const compositeContext = { composite: { labelA, labelB }, a, b, dream: null, model: null };
  if (detail) detail.update(compositeContext);
  else detail = createDreamDetail(compositeContext);
  content.replaceChildren();
  content.appendChild(el('div', { class: 'dream-compare-head',
    text: t('Sleep charts of {a} and {b}', { a: labelA, b: labelB }) }));
  content.appendChild(el('p', { class: 'dream-compare-intro',
    text: t('One body for both sleeping designs, with no {transit}: each gate is coloured by whose design carries it.',
      { transit: transitTerm() }) }));
  content.appendChild(compositeLegend(labelA, labelB, palette));

  const shell = el('div', { class: 'dream-shell', id: 'dream-composite-shell' });
  shell.innerHTML = graphShellMarkup({
    className: 'dream-graph-shell',
    graph: '<div id="dream-composite" class="dream-graph"></div>'
  });
  content.appendChild(shell);
  const compositeApi = renderBodygraph(shell.querySelector('#dream-composite'), chartA, {
    topology: DREAM_TOPOLOGY,
    planetColumns: false,
    animate: false,
    ariaLabel: t('Combined sleep chart bodygraph for {a} and {b}, coloured by whose sleeping design carries each gate.',
      { a: labelA, b: labelB }),
    composite: {
      chartA, chartB, structure, labelA, labelB,
      colorA: palette.a, colorB: palette.b, colorBridged: palette.bridged
    },
    onGateClick: gate => detail.showGate(gate),
    onCenterClick: center => detail.showCenter(center)
  });
  detail.setApi(compositeApi);
  // The composite is the single design's shell and columns with a different set
  // of parts: each slot carries one person's design and personality columns,
  // built by the same `activationColumn()`. Without this the two slots stayed
  // empty while the natal chart showed its own on both sides.
  fillSlot(shell, 'left', [
    activationColumn('design', a.gates.design, dateText(a.designMoment.iso), labelA),
    activationColumn('personality', a.gates.personality, personalityWhen(a), labelA)
  ]);
  fillSlot(shell, 'right', [
    activationColumn('design', b.gates.design, dateText(b.designMoment.iso), labelB),
    activationColumn('personality', b.gates.personality, personalityWhen(b), labelB)
  ]);
  // Hovering lights the gate, clicking opens the composite sheet: the same
  // handlers the single design binds, so the sheet answers "who carries this
  // gate" from the composite context and never from the single-person one.
  bindRowHover(shell, '.dream-column-row[data-gate]', compositeApi);
  bindGateDetails(shell);
  shellDispose?.disconnect();
  shellDispose = observeGraphShell(shell, { aspect: DREAM_GRAPH_ASPECT, idealWidth: 720 });

  content.appendChild(comparisonFacts({ a, b, labelA, labelB, chartA, chartB, structure }));

  const exit = el('button', { class: 'btn-secondary btn-small', type: 'button', id: 'dream-compare-exit', text: t('Back to my sleep chart') });
  exit.addEventListener('click', () => { clearDreamComparison(); renderDreamView({ refresh: true }); });
  content.appendChild(exit);
  content.appendChild(detail.element);
}

/** Reuses the relationship composite's legend markup and Skin tokens. */
function compositeLegend(labelA, labelB, palette) {
  const legend = el('div', { class: 'composite-legend' });
  legend.innerHTML = `
    <span class="lg"><i style="background:${palette.a}"></i>${esc(labelA)}</span>
    <span class="lg"><i style="background:${palette.b}"></i>${esc(labelB)}</span>
    <span class="lg"><i style="background:var(--hd-connection-both)"></i>${esc(t('Both have it'))}</span>
    <span class="lg"><i style="background:${palette.bridged}"></i>${esc(t('Defined only together'))}</span>`;
  return legend;
}

/**
 * Structural facts only: each sleeping type, the centres the pair defines
 * together, the dream channels that complete, and which of those need one gate
 * from each of them. Nothing is scored, ranked or interpreted.
 */
function comparisonFacts({ a, b, labelA, labelB, chartA, chartB, structure }) {
  const section = el('section', { class: 'dream-compare-facts' });
  const aGates = new Set(chartA.gates.all);
  const bGates = new Set(chartB.gates.all);
  const centers = structure.composite.centers;

  const facts = el('div', { class: 'dream-type-facts' });
  facts.innerHTML = [
    `<span class="dream-fact">${esc(t('Sleep type of {name}: {type}', { name: labelA, type: dreamTypeName(a.type.id) }))}</span>`,
    `<span class="dream-fact">${esc(t('Sleep type of {name}: {type}', { name: labelB, type: dreamTypeName(b.type.id) }))}</span>`,
    `<span class="dream-fact">${esc(centers.length
      ? t('Centers defined together: {centers}', { centers: formatDisplay('separated', centers.map(centerName), 'centers') })
      : t('Nothing is defined when the two sleep designs combine'))}</span>`
  ].join('');
  section.appendChild(facts);

  const complete = [];
  const halved = [];
  for (const channel of structure.composite.channels) {
    const [left, right] = channel.gates;
    const aFull = aGates.has(left) && aGates.has(right);
    const bFull = bGates.has(left) && bGates.has(right);
    if (aFull && bFull) complete.push({ channel, owner: t('Both have it') });
    else if (aFull || bFull) complete.push({ channel, owner: aFull ? labelA : labelB });
    else halved.push({
      channel,
      owner: [
        `${labelA}: ${channel.gates.filter(gate => aGates.has(gate)).join(' · ')}`,
        `${labelB}: ${channel.gates.filter(gate => bGates.has(gate)).join(' · ')}`
      ].join(' · ')
    });
  }

  const group = (titleKey, rows, variant) => {
    const block = el('div', { class: 'dream-channel-group' });
    block.appendChild(el('h3', { class: 'dream-channel-group-title', text: t(titleKey) }));
    const list = el('ul', { class: 'dream-channel-list' });
    for (const row of rows) {
      const item = el('li', { class: `dream-channel-row dream-channel-row-static dream-channel-row-${variant}` });
      item.innerHTML = `
        <div class="dream-channel-head">
          <span class="dream-channel-gates">${row.channel.gates.join('–')}</span>
          <span class="dream-channel-name">${esc(channelName(row.channel.gates))}</span>
          <span class="dream-channel-owner">${esc(row.owner)}</span>
        </div>
        <span class="dream-channel-named">${channelGateNames(row.channel)}</span>`;
      list.appendChild(item);
    }
    block.appendChild(list);
    return block;
  };

  if (complete.length) section.appendChild(group('Channels complete together', complete, 'complete'));
  if (halved.length) section.appendChild(group('Channels completed by one gate each', halved, 'halved'));
  if (!complete.length && !halved.length) {
    section.appendChild(el('p', { class: 'dream-realm-empty',
      text: t('No sleep channel completes between the two designs') }));
  }
  return section;
}
