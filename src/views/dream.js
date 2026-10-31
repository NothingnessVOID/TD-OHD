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
 * `lib/dream-detail.js`. That module reuses the shared dialog lifecycle and
 * navigation, but owns its activation data and its reading text: the waking sheet
 * in `views/chart.js` reads that module's own current chart for the design side,
 * so handing it the sleeping graph would have shown the waking design activations
 * (Sun −88°) instead of the sleep design's (Moon −88°). AGENTS.md §6 requires the
 * data context to be explicit. Each sheet carries one layer only: gate, channel
 * and line sheets print the dream reading, and the waking reading is not mixed
 * into them. The type strip is the one place both layers meet, and it keeps them
 * apart as two buttons — `waking` opens the waking type's own reading, `dream`
 * opens the teacher's sleep-type reading.
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
import { computeDreamChart, dreamGraphChart, buildDreamTransitGraph, buildCompositeRealms } from '../lib/dream-chart.js';
import {
  DREAM_TOPOLOGY, DREAM_REALMS, DREAM_REALM_ORDER, DREAM_CHANNELS, DREAM_VIEW_BOX, dreamRealmOf
} from '../lib/human-design/dream-topology.js';
import { analyzeConnectionStructure } from '../lib/human-design/connection-structure.js';
import { createDreamDetail } from '../lib/dream-detail.js';
import { compositePalette } from '../lib/skin-registry.js';
import {
  dreamGateName, dreamLineTheme, dreamRealmName, dreamTypeName, dreamTypeReading,
  dreamChannelName, dreamSideMeaning, dreamConditioning
} from '../lib/dream-vocabulary.js';
import { typeName, planetName, centerName } from '../lib/vocabulary.js';
import { t, formatDisplay, setMessage } from '../lib/i18n.js';
import { getCurrentChart } from './chart.js';
import { getPerson, birthFromPerson, onPeopleChange } from '../lib/people.js';
import { calculationIdentity } from '../lib/person-input.js';
import { computeChart } from '../lib/chartdata.js';
import { openPersonPicker } from '../lib/person-picker.js';
import { graphShellMarkup, observeGraphShell } from '../lib/graph-shell.js';
import { mountTransitTimeControl } from '../lib/transit-time-control.js';
import { esc } from '../lib/format.js';
import '../styles/dream.css';

let lastDream = null;          // cached model, keyed by the waking chart it came from
let lastComparison = null;     // { a, b, labelB } cached comparison models
let pendingComparison = null;  // the pair chosen on this page; see setDreamComparison()
let comparisonBusy = false;    // a picker selection is still being computed
let requestSequence = 0;       // overlay solves: one counter per render
// Comparison requests are numbered separately from the overlay's. A person pick
// awaits twice (B's waking chart, then both sleeping ones), so it needs its own
// generation: invalidating the page, leaving the composite, or a change to either
// person must evict it without disturbing the overlay solve's numbering.
let comparisonSequence = 0;
let shellDispose = null;
// The people-store subscription that guards person B, released on remount like the
// time control: a second listener would answer every change twice, once for a page
// state nobody can see any more.
let peopleOff = null;
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
  // chart would keep showing the previous pair. The pick's own solves go with it.
  evictComparison();
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
 * Evict every comparison solve in flight, and release its busy flag with it.
 *
 * Whoever bumps the counter owns the flag afterwards. A bare invalidation starts
 * no new solve, so it has to clear the flag itself — otherwise the next pick would
 * be refused by a request that no longer exists.
 */
function evictComparison() {
  ++comparisonSequence;
  comparisonBusy = false;
}

/**
 * Stop the single-design solve from landing, because the composite is taking the page.
 *
 * The two kinds of solve are numbered by different counters, so bumping the comparison
 * counter says nothing about a single solve already in flight. The guard in
 * `renderDreamView()` checks `pendingComparison` as well and that is what actually
 * decides the outcome; bumping here is the same statement made where the page changes
 * hands, so a single solve started after this point cannot be mistaken for one that
 * belongs to the composite. It does not draw anything and it starts no solve.
 */
function evictSingleDesign() {
  ++requestSequence;
}

/**
 * The loaded chart an action was started from.
 *
 * `getCurrentChart()` hands back the same `chart` object main.js solved, and that
 * object is the page's existing "same chart" test (`comparisonMatches()`,
 * `lastDream.natalChart`). The saved id travels alongside it so a saved person is
 * named and re-checked as themselves rather than as "whatever object is loaded".
 */
function currentIdentity() {
  const current = getCurrentChart();
  return current ? { personId: current.birth?.id || null, chart: current.chart } : null;
}

/** Whether `origin` is still the chart on screen; a solve started for another one must not land. */
function sameMainPerson(origin) {
  if (!origin) return false;
  const current = getCurrentChart();
  return !!current && current.chart === origin.chart && (current.birth?.id || null) === origin.personId;
}

/**
 * Bind the picked pair to the identities it was started from.
 *
 * Person B's waking chart is solved asynchronously from their saved birth data, so
 * "the main person" at the moment this runs is not necessarily the one the reader
 * picked B against: `origin` is captured before the first await and travels here
 * instead of being read again afterwards. B is kept as a saved id plus the birth
 * fingerprint their chart was solved from, so a later delete or edit is
 * recognisable as a change to *this* pair instead of leaving a stale composite
 * under a current name. A cached comparison belongs to the pair that produced it,
 * so choosing someone else drops it before the new pair is solved.
 */
function setDreamComparison({ personId, label, fingerprint, chart, origin }) {
  evictSingleDesign();
  pairFrom({ personId, label, fingerprint, chart, origin });
}

/** Bind an already-built pair (a rename keeps every part except the label). */
function pairFrom({ personId, label, fingerprint, chart, origin }) {
  const previous = pendingComparison;
  const samePair = previous
    && previous.personId === (personId || null)
    && previous.fingerprint === fingerprint
    && previous.chart === chart
    && previous.forChart === origin.chart
    && previous.forPersonId === origin.personId;
  pendingComparison = {
    personId: personId || null,
    label,
    // `calculationIdentity()` of B's birth fields: what their chart was solved
    // from, not what their record says later.
    fingerprint,
    chart,
    // The main chart *and* person the pair was chosen from: switching to another
    // person on the page header leaves a comparison that no longer describes what
    // is on screen.
    forChart: origin.chart,
    forPersonId: origin.personId
  };
  // A cached composite belongs to the pair that produced it. A rename of the same
  // pair keeps it — the sleeping charts did not change, only the name beside them.
  if (samePair && lastComparison) lastComparison = { ...lastComparison, labelB: label };
  else lastComparison = null;
  updateCompareButton();
}

/** True when the pending comparison still belongs to the loaded chart and person. */
function comparisonMatches(current) {
  if (!pendingComparison || !current) return false;
  return pendingComparison.forChart === current.chart
    && pendingComparison.forPersonId === (current.birth?.id || null);
}

function clearDreamComparison() {
  // Leaving the composite cancels a pick that is still solving, so the abandoned
  // request cannot put the pair back on screen after the reader walked away.
  evictComparison();
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
    onChange: () => {
      // The control is hidden while the composite is shown: that page has no
      // overlay, so a change here is a change to a chart nobody is looking at.
      if (pendingComparison) return;
      // Every change reaches the render, valid or not: `renderDreamView()` evicts the
      // solve in flight on both paths, so an invalid moment also invalidates the
      // older valid request instead of letting it land afterwards.
      renderDreamView();
    }
  });
  document.getElementById('dream-compare')?.addEventListener('click', chooseComparisonPerson);
  document.getElementById('dream-compare-exit')?.addEventListener('click', () => {
    clearDreamComparison();
    renderDreamView({ refresh: true });
  });
  // Person B is watched here rather than in main.js: the composite is this page's
  // own state, so the page that owns the pair is the one that must notice it going
  // stale. `main.js` only follows the *main* person, and a change to B never moved
  // a chart there, so nothing else would have invalidated this pair.
  peopleOff?.();
  peopleOff = onPeopleChange(onComparisonPersonChange);
  setTransitSubtitle();
  updateCompareButton();
}

/**
 * Follow person B for as long as a composite names them.
 *
 * Deleting B, or editing the birth fields their chart was solved from, makes the
 * pair describe nobody: the old code kept both sleeping charts on screen under the
 * current name, which is the "one person's composite shown as another's" failure.
 * Two answers are possible — drop the pair, or re-solve it from the new record — and
 * dropping is the one that cannot show a chart the reader did not ask for. A rename
 * alone keeps the pair, because the chart it was solved from is unchanged; only the
 * label is refreshed. Any other person's change is ignored here.
 *
 * Nothing is done when no composite names B, so the listener costs a map lookup per
 * save instead of a redraw.
 */
function onComparisonPersonChange(change) {
  const pair = pendingComparison;
  if (!pair?.personId || change.personId !== pair.personId) return;
  // A change to the loaded person belongs to main.js, which invalidates and reloads
  // this whole page for it. Handling it here as well would redraw the sleep chart of
  // the person being replaced, and fight the reload for the same content.
  if (change.personId === currentPersonId()) return;
  const after = change.after;
  if (!after) {
    // B was deleted: the sleeping charts on screen belong to a person who is gone.
    dropPair({ deleted: true });
    return;
  }
  if (calculationIdentity(birthFromPerson(after)) !== pair.fingerprint) {
    // Their birth data moved under the solved chart: re-solving is a new pick, and
    // silently redrawing a different pair is worse than asking for one.
    dropPair({ deleted: false });
    return;
  }
  if (after.name !== pair.label) {
    // Presentation only: same birth data, so the same pair under a new name.
    pairFrom({
      ...pair,
      label: after.name,
      origin: { chart: pair.forChart, personId: pair.forPersonId }
    });
    renderDreamView();
  }
}

/**
 * Discard the pair and put the reader's own sleep chart back, then say why.
 *
 * The explanation is written *after* the redraw: a successful single-design render
 * clears the status line as part of its own bookkeeping, so a message written first
 * would be wiped by the very redraw that replaced the composite.
 *
 * @param {{deleted: boolean}} lost - which change took the pair away
 */
async function dropPair(lost) {
  clearDreamComparison();
  await renderDreamView({ refresh: true });
  setMessage(document.getElementById('dream-status'), lost.deleted
    ? 'That person is no longer in your saved charts.'
    : 'The other person\u2019s birth data changed, so the comparison was cleared. Pick them again to compare.');
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

/**
 * Report an unresolvable wall time on the page itself instead of redrawing "now".
 *
 * The control already prints why the widgets do not resolve, but its status is an
 * `tl-sr-only` line: a sighted reader who typed a DST gap saw the page keep the old
 * overlay with no visible explanation, and on re-entry the overlay silently became
 * the current sky. This puts an explicit state where the chart would be, so the page
 * never shows an overlay the reader did not ask for and never leaves a blank area
 * where one was. Nothing is solved until a valid moment comes back, and the sheet and
 * shell observers are released here exactly as `invalidateDream()` releases them.
 */
function drawInvalidMoment(content) {
  clearStatus(document.getElementById('dream-status'));
  detail?.close();
  detail = null;
  detailContext = null;
  shellDispose?.disconnect();
  shellDispose = null;
  const notice = el('p', { class: 'dream-moment-invalid', role: 'status' });
  notice.textContent = invalidMomentText();
  content.replaceChildren(notice);
}

/** The one wording for an unresolvable moment, read through `t()` in the live language. */
const invalidMomentText = () => t(
  'That moment does not exist in this timezone, so there is no {transit} overlay. Pick a valid time.',
  { transit: transitTerm() });

/**
 * The moment the overlay is read at.
 *
 * `{ instant }` when the time control resolves, `{ invalid: true }` when the wall
 * time does not (a DST gap, or a bad zone), and `{ instant: undefined }` only while
 * there is no control at all. The three cases are kept apart on purpose: the old
 * `Number.isFinite(instant) ? instant : undefined` collapsed "the reader chose an
 * impossible time" into "nobody has chosen", and `computeDreamChart()` answers that
 * with `Date.now()` — so an invalid pick silently became the current moment. That
 * also made an invalid-then-valid pair indistinguishable, because both solved at
 * "now" and the cached model looked reusable.
 *
 * @returns {{instant: number}|{invalid: true}|{instant: undefined}}
 */
function selectedTransitMoment() {
  if (!timeControl) return { instant: undefined };
  const instant = timeControl.getInstant();
  return Number.isFinite(instant) ? { instant } : { invalid: true };
}

/** The composite carries no overlay, so its time control must not invite a change. */
function setTimeControlVisible(visible) {
  const host = document.getElementById('dream-time-host');
  if (host) host.hidden = !visible;
}

/**
 * The way back to the single sleep chart.
 *
 * It is a static toolbar button rather than one appended to the composite's
 * content, so it sits beside the entry that opened the composite instead of at
 * the end of a page that can run several screens long. Its label is static, so
 * `data-i18n` alone keeps it translated; only its visibility is dynamic.
 */
function setExitVisible(visible) {
  const exit = document.getElementById('dream-compare-exit');
  if (exit) exit.hidden = !visible;
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
  // Everything this pick is judged against is read *before* the first await: which
  // main chart it belongs to, and which birth data B's chart is solved from. Reading
  // either afterwards is what let a pick made against B bind to a later C.
  const origin = currentIdentity();
  const fingerprint = calculationIdentity(birthFromPerson(person));
  const request = ++comparisonSequence;
  comparisonBusy = true;
  // Once the pair is committed the composite solve owns the page, and a second pick
  // is allowed to supersede it; until then this request is the only one allowed in.
  let handedOver = false;
  try {
    setMessage(status, 'Computing both sleep charts…');
    // A missing or incomplete birth record fails here, before the sleep charts
    // are even attempted; the message names the reason and stays in the toolbar.
    const { chart } = await computeChart(birthFromPerson(person));
    // Wasted work rather than wasted screen: the reader changed the main person,
    // left the page, or picked again while B's chart was solving.
    if (request !== comparisonSequence || !sameMainPerson(origin)) return;
    // B can also leave the library while their own chart is solving. Nothing owns
    // the pair yet at that point, so `onComparisonPersonChange()` cannot answer —
    // it only follows a pair that exists. Left alone, the pick would commit a pair
    // whose person is already gone and freeze the page on "Computing…". The birth
    // fingerprint is re-read too, because an edit during the solve makes the chart
    // that just arrived describe data the reader no longer has.
    const saved = person.id ? getPerson(person.id) : null;
    if (person.id && (!saved || calculationIdentity(birthFromPerson(saved)) !== fingerprint)) {
      setMessage(status, saved
        ? 'The other person’s birth data changed before their sleep chart finished. Pick them again to compare.'
        : 'That person is no longer in your saved charts.');
      return;
    }
    handedOver = true;
    comparisonBusy = false;
    setDreamComparison({ personId: person.id, label: person.name, fingerprint, chart, origin });
    await renderDreamView();
  } catch (error) {
    if (request !== comparisonSequence) return;
    setMessage(status, 'Sleep chart calculation failed: {error}', { error: error.message });
  } finally {
    // Only the newest request may release the flag; a superseded one must not reset
    // the state of the pick that replaced it.
    if (!handedOver && request === comparisonSequence) comparisonBusy = false;
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
  if (!current) { content.replaceChildren(); setExitVisible(false); return; }

  // A comparison chosen for a different chart or person is stale, not reusable.
  if (pendingComparison && !comparisonMatches(current)) clearDreamComparison();

  if (pendingComparison) {
    setTimeControlVisible(false);
    setExitVisible(true);
    if (!refresh && lastComparison && samePairIsCurrent(pendingComparison)) {
      drawComparison({ content, current, ...lastComparison });
      return;
    }
    await renderComparison({ content, status, current, comparison: pendingComparison });
    return;
  }
  setTimeControlVisible(true);
  setExitVisible(false);

  const moment = selectedTransitMoment();
  if (moment.invalid) {
    // Re-entering the page (a view switch, a language change, a returning redraw)
    // must not turn an impossible moment into "now": nothing is solved, and the
    // page says what is missing instead of showing the current sky.
    ++requestSequence;
    drawInvalidMoment(content);
    return;
  }
  const transitInstant = moment.instant;
  const request = ++requestSequence;
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
    // The overlay and the composite are numbered by different counters, so this
    // solve's own counter does NOT move when a pair is opened: opening a composite
    // leaves the moment unchanged, which is exactly the state this request is for.
    // Without the `pendingComparison` check a slow single solve therefore landed on
    // top of a composite that had already drawn — the counter was still current, the
    // chart it belonged to was not. Both counters are read together for that reason.
    if (request !== requestSequence || pendingComparison) return;
    if (current.chart !== getCurrentChart()?.chart) return;
    dream.natalChart = current.chart;
    dream.transitInstant = transitInstant;
    lastDream = dream;
    clearStatus(status);
    drawDream(dream, content);
  } catch (error) {
    // A failure that arrives after the reader opened a composite is equally stale:
    // reporting it would blame the composite for a single-design solve.
    if (request !== requestSequence || pendingComparison) return;
    setMessage(status, 'Sleep chart calculation failed: {error}', { error: error.message });
    content.replaceChildren();
  }
}

/**
 * Solve both sleeping designs for the pending pair.
 *
 * Comparison numbering is its own generation, and the pair itself is re-validated
 * after the await: a request can outlive its own validity when B is deleted or
 * edited, or when the main person changes, without anything having bumped the
 * counter. Drawing a composite whose A or B no longer exists is the failure this
 * guards against, so the check is on the pair identity, not just the counter.
 */
async function renderComparison({ content, status, current, comparison }) {
  const request = ++comparisonSequence;
  try {
    setMessage(status, 'Computing both sleep charts…');
    // Comparison follows the original dream design: both sleeping designs share
    // one composite body, and no transit is overlaid.
    const [a, b] = await Promise.all([
      computeDreamChart(current.chart, { transit: false }),
      computeDreamChart(comparison.chart, { transit: false })
    ]);
    if (request !== comparisonSequence) return;
    if (pendingComparison !== comparison || !samePairIsCurrent(comparison)) return;
    lastComparison = { a, b, labelB: comparison.label };
    clearStatus(status);
    drawComparison({ content, current, ...lastComparison });
  } catch (error) {
    if (request !== comparisonSequence) return;
    setMessage(status, 'Sleep chart calculation failed: {error}', { error: error.message });
  }
}

/**
 * Whether the pair's two people are still the two the page is showing.
 *
 * It reads `getCurrentChart()` itself instead of trusting the caller's `current`.
 * The caller's copy is the chart it *started* from, so comparing that against
 * `comparison.forChart` was always true and the main-person check was dead code: a
 * switch of the loaded person was only ever caught by the pair being cleared
 * somewhere else first. Reading the live chart makes this the last-resort guard it
 * reads like, and it stays cheap (one getter plus a saved-person lookup).
 *
 * B is re-read from the store as well: a deleted B, or one whose birth fields moved
 * under the solved chart, makes the pair describe nobody even if nothing has
 * bumped a counter yet.
 */
function samePairIsCurrent(comparison) {
  const live = getCurrentChart();
  if (!live) return false;
  if (live.chart !== comparison.forChart) return false;
  if ((live.birth?.id || null) !== comparison.forPersonId) return false;
  if (!comparison.personId) return true;
  const person = getPerson(comparison.personId);
  if (!person) return false;
  return calculationIdentity(birthFromPerson(person)) === comparison.fingerprint;
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
  if (pendingComparison && lastComparison && comparisonMatches(current)
    && samePairIsCurrent(pendingComparison)) {
    setTimeControlVisible(false);
    drawComparison({ content, current, ...lastComparison });
    // The composite redraw re-uses the same sheet controller, so an open card
    // must be repainted from it as the single-design path does.
    detail?.refresh();
    return;
  }
  setTimeControlVisible(true);
  if (selectedTransitMoment().invalid) { drawInvalidMoment(content); return; }
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

/**
 * One chip of the type comparison.
 *
 * A button, not a badge: each half of the comparison opens its own reading in the
 * shared sheet, so the strip stays a one-line comparison instead of carrying two
 * long readings below it. `side` (`waking` / `dream`) is the sheet's selection id.
 */
const typeChip = (side, name, color) =>
  `<button type="button" class="dream-type-chip" data-dream-type-open="${side}"
    aria-label="${esc(t(side === 'waking' ? 'Open the waking type reading' : 'Open the dream type reading'))}"
    style="background:${color}">${esc(name)}</button>`;

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
/** The type strip's two chips: `waking` or `dream`, each its own reading. */
const openType = (side, owner = null) => detail?.showType(side, owner);

// ==========================================
// Single sleep design
// ==========================================

function drawDream(dream, content) {
  content.replaceChildren();
  content.appendChild(typeStrip(dream));
  content.appendChild(frameNote());

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

/**
 * The two sentences the sleep chart is read with: what the red and black halves
 * mean in a dream, and what "fixed" and "conditioning" mean for its shape.
 *
 * They are page frame, not per-gate content, so they sit once, above the three
 * night fields, and never repeat inside a sheet. Each line is composed from the
 * locale's own fragment, so no sentence is assembled from translated words here.
 */
function frameNote() {
  const sides = [['design', 'Design'], ['personality', 'Personality']]
    .map(([side, label]) => {
      const meaning = dreamSideMeaning(side);
      return meaning ? `<li><span class="dream-frame-key">${esc(t(label))}</span>${esc(meaning)}</li>` : '';
    }).filter(Boolean).join('');
  const conditioning = [['natal', 'The chart itself'], ['external', 'Transits and partners']]
    .map(([kind, label]) => {
      const meaning = dreamConditioning(kind);
      return meaning ? `<li><span class="dream-frame-key">${esc(t(label))}</span>${esc(meaning)}</li>` : '';
    }).filter(Boolean).join('');
  if (!sides && !conditioning) return '';
  const note = el('div', { class: 'dream-frame-note' });
  note.innerHTML = `
    ${sides ? `<ul class="dream-frame-list" data-dream-frame="sides">${sides}</ul>` : ''}
    ${conditioning ? `<ul class="dream-frame-list" data-dream-frame="sources">${conditioning}</ul>` : ''}`;
  return note;
}

function typeStrip(dream) {
  const waking = dream.wakingType?.name ? typeName(dream.wakingType.name) : '—';
  const sleeping = dreamTypeName(dream.type.id);
  const centers = formatDisplay('separated', dream.centers.definedNames.map(centerName), 'centers');
  const channels = formatDisplay('separated',
    dream.channels.map(channel => `${channel.gates.join('-')} ${sleepChannelName(channel)}`), 'channels');
  const strip = el('div', { class: 'dream-type-strip' });
  strip.innerHTML = `
    <div class="dream-type-flow">
      <span class="dream-type-pair">
        <span class="dream-type-label">${esc(t('Awake'))}</span>
        ${typeChip('waking', waking, TYPE_COLORS[dream.wakingType?.name] || 'var(--hd-inactive)')}
      </span>
      <span class="dream-type-arrow" aria-hidden="true">→</span>
      <span class="dream-type-pair">
        <span class="dream-type-label">${esc(t('Asleep'))}</span>
        ${typeChip('dream', sleeping, TYPE_COLORS[dream.type.id] || 'var(--hd-inactive)')}
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
  // Both halves of the comparison open the sheet; the reading itself lives there
  // so the strip keeps one line per type.
  for (const chip of strip.querySelectorAll('[data-dream-type-open]')) {
    chip.addEventListener('click', () => openType(chip.dataset.dreamTypeOpen));
  }
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
    // The graph's own tooltip and per-gate labels use the sleep names, not the
    // waking catalogue's. The option is ignored by a renderer that does not know
    // it, so this page stays correct while the two changes land separately.
    naming: dreamNaming,
    ...(overlay && dream.hasTransit ? { transitModel: buildDreamTransitGraph(dream) } : {}),
    // The graph's highlight flows back into this page's own rows (see
    // `dreamHighlightRows()`), so hovering or pinning a gate reads as one object
    // in the graph and in the lists, exactly as the birth chart does.
    onHighlight: dreamHighlightRows,
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

/**
 * The dream name of one of the six dream channels.
 *
 * The sleep design keeps its own channel vocabulary (the teaching calls 1-8 the
 * Inspiration channel, not the waking catalogue's name for it), so every sleep-chart
 * surface that prints a channel name asks here instead of `channelName()`. That
 * keeps the waking name for the waking pages, which `channelName()` still owns
 * untouched.
 */
const sleepChannelName = channel => dreamChannelName(channel.gates) || channel.gates.join('-');

/**
 * The sleep vocabulary handed to the shared renderer (`opts.naming`).
 *
 * The renderer owns the formatting and the gate pair; this object only answers
 * "what is this object called at night". `gateTooltip` replaces the name part of
 * the tooltip title outright, so the waking hexagram never appears next to a dream
 * gate name, and `channelTooltip` returns the bare dream name because the renderer
 * appends the gates itself. Centres are omitted on purpose: the shared default is
 * already the right wording and there is no dream name for a centre.
 *
 * One object for both modes, so a gate or a channel reads the same in the single
 * design and in the composite.
 */
const dreamNaming = {
  gate: dreamGateName,
  gateTooltip: dreamGateName,
  channelTooltip: channel => dreamChannelName(channel.gates) || channel.gates.join('-')
};

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
        channels: formatDisplay('separated', dream.channels.map(c => `${c.gates.join('-')} ${sleepChannelName(c)}`), 'channels')
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

/**
 * The object a highlight is *about*, as opposed to the set of objects the graph
 * lights with it. The renderer sends both: `gates`/`centers` are the lit relation
 * (a gate also lights the other gate of its defined channel) and `selection` is
 * the object the reader chose.
 */
function targetOf(selection) {
  if (!selection) return null;
  if (selection.kind === 'gate') return { kind: 'gate', gate: Number(selection.id) };
  if (selection.kind === 'channel') return { kind: 'channel', id: selection.id };
  if (selection.kind === 'center') return { kind: 'center', center: selection.id };
  return null;
}

/**
 * The gates a direct target actually covers in the lists.
 *
 * A gate covers itself; a channel covers its two gates, because they are the
 * channel; a centre covers the gates inside it, and the renderer's set for a
 * centre is already exactly those gates (no channel partner is added to a centre).
 */
function targetGates(target, sel) {
  if (target?.kind === 'gate') return new Set([target.gate]);
  if (target?.kind === 'channel') {
    const channel = DREAM_CHANNELS.find(item => item.gates.join('-') === target.id);
    return new Set(channel?.gates || []);
  }
  return new Set(sel?.gates || []);
}

/**
 * The reverse direction of the graph's highlight: when the graph reports a gate (a
 * hover, a touch preview, or the gate pinned behind an open sheet), light the row
 * that object is, so the graph and the data read as one control.
 *
 * The rows follow `sel.selection` — the object the reader chose — and never the lit
 * relation beside it. The night fields are one card per activation, so lighting the
 * relation lit the channel partner's card as a second selection and made an
 * unrelated gate look chosen. The graph itself keeps its full relational highlight:
 * this callback only reads `gates`/`centers`, it never changes them.
 *
 * One callback for both modes: a gate means the same row whether one sleeping design
 * or two are on screen.
 */
function dreamHighlightRows(sel) {
  for (const node of document.querySelectorAll('#dream-content .row-lit')) node.classList.remove('row-lit');
  if (!sel) return;
  const target = targetOf(sel.selection);
  if (!target) return;
  const gates = targetGates(target, sel);
  if (!gates.size) return;
  for (const node of document.querySelectorAll('#dream-content .dream-column-row[data-gate], #dream-content .dream-realm-row[data-gate]')) {
    node.classList.toggle('row-lit', gates.has(Number(node.dataset.gate)));
  }
  // A channel row is lit when the channel itself is the target. A gate hover does
  // not light the channel rows it happens to belong to: the pair is the channel's
  // object, not the gate's.
  if (target.kind === 'channel') {
    document.querySelector(`#dream-content .dream-channel-open[data-channel="${target.id}"]`)?.classList.add('row-lit');
  }
}

/**
 * The activation columns and the night-field cards are the page's other ways into
 * a gate.
 *
 * Every card's own button is the single control here: it carries the click, the
 * Enter/Space activation and the focus ring, and its stretched hit area covers the
 * card (styles/dream.css). A second click handler on the row would fire the same
 * sheet twice, and a `role="button"` wrapper around a real button would give one
 * control two identities.
 */
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
 * which `buildTransitGraph()` defines identically for a waking overlay. A status
 * entry names the label key and the badge/edge variant; `owner` is set only by
 * tables whose states are told apart by a person (the composite), so the single
 * design's four entries stay exactly as they were.
 */
const CHANNEL_STATUS = {
  natal: { label: 'Complete in the sleep design', variant: 'natal' },
  completed: { label: 'Completed by {transit}', variant: 'completed' },
  transit: { label: '{transit} only', variant: 'transit' },
  inactive: { label: 'Not connected', variant: 'inactive' }
};

function channelStatusOf(channel, model) {
  const key = channel.gates.join('-');
  if (!model.channels.some(item => item.gates.join('-') === key)) return 'inactive';
  return model.channelSource(channel);
}

const channelStatusBadge = (entry, params) =>
  `<span class="dream-channel-status dream-channel-status-${entry.variant}">${esc(t(entry.label, params))}</span>`;

/**
 * The composite's channel vocabulary: who completes the channel, rather than
 * whether the night sky does. The variants reuse the single design's four badge
 * classes, so no new visual state is invented; `owner` adds the person colour on
 * top of the variant, exactly as `realmRow()` lets an owner recolour a source.
 */
const COMPOSITE_CHANNEL_STATUS = {
  both: { label: 'Complete across both sleep designs', variant: 'natal', owner: 'both' },
  a: { label: '{name} completes it', variant: 'natal', owner: 'a' },
  b: { label: '{name} completes it', variant: 'natal', owner: 'b' },
  halved: { label: 'Defined only together', variant: 'completed', owner: 'both' },
  inactive: { label: 'Not connected', variant: 'inactive' }
};

/**
 * Classify all six dream channels for a pair once, so the three night fields and
 * the fact block cannot disagree about a channel.
 *
 * A channel the composite completes is complete for both people, for one of
 * them, or only with one gate from each. A channel the composite does not
 * complete is inactive: had either person completed it alone, both of its gates
 * would be in the composite and it would appear in `structure.composite.channels`.
 *
 * @returns {Map<string, {status: string, split: string}>} keyed `gate1-gate2`
 */
function compositeChannelStates(chartA, chartB, structure, labelA, labelB) {
  const aGates = new Set(chartA.gates.all);
  const bGates = new Set(chartB.gates.all);
  const together = new Set(structure.composite.channels.map(channel => channel.gates.join('-')));
  const states = new Map();
  for (const channel of DREAM_CHANNELS) {
    const key = channel.gates.join('-');
    if (!together.has(key)) { states.set(key, { status: 'inactive', split: '' }); continue; }
    const [left, right] = channel.gates;
    const aFull = aGates.has(left) && aGates.has(right);
    const bFull = bGates.has(left) && bGates.has(right);
    const status = aFull && bFull ? 'both' : aFull ? 'a' : bFull ? 'b' : 'halved';
    // Only a halved channel needs the detail of who contributes which gate. The
    // separator comes from the shared formatter, as `compositeSourceGroups()`
    // does, so one page never carries two separator conventions.
    const split = status === 'halved'
      ? [
        `${labelA}: ${channel.gates.filter(gate => aGates.has(gate)).join(' · ')}`,
        `${labelB}: ${channel.gates.filter(gate => bGates.has(gate)).join(' · ')}`
      ].join(formatDisplay('separator', 'label'))
      : '';
    states.set(key, { status, split });
  }
  return states;
}

const channelGateNames = channel => channel.gates
  .map(gate => `${gate} ${esc(dreamGateName(gate))}`).join(' · ');

/**
 * One channel row.
 *
 * `status` is either a status key (the single design) or `{ status, params, note }`
 * for tables that need a per-row parameter or an extra line (the composite names
 * the person there). `table` and `params` come from the panel, so a caller picks
 * its own vocabulary without this function knowing which page it is on.
 */
function channelButton(channel, status, { table = CHANNEL_STATUS, params = {} } = {}) {
  const key = channel.gates.join('-');
  const info = typeof status === 'string' ? { status } : status;
  const entry = table[info.status] || table.inactive;
  const vars = { transit: transitTerm(), ...params, ...(info.params || {}) };
  const button = el('button', {
    type: 'button',
    class: `dream-channel-open dream-channel-open-${entry.variant}${entry.owner ? ` dream-channel-owner-${entry.owner}` : ''}`,
    'data-channel': key,
    'aria-label': `${t('Channel {channel}', { channel: key })} · ${sleepChannelName(channel)} · ${t(entry.label, vars)}`
  });
  button.innerHTML = `
    <span class="dream-channel-head">
      <span class="dream-channel-gates">${key.replace('-', '–')}</span>
      <span class="dream-channel-name">${esc(sleepChannelName(channel))}</span>
      ${channelStatusBadge(entry, vars)}
    </span>
    <span class="dream-channel-named">${channelGateNames(channel)}</span>
    ${info.note ? `<span class="dream-channel-split">${esc(info.note)}</span>` : ''}`;
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
  { key: 'personality', label: 'Sleep personality' },
  { key: 'design', label: 'Sleep design' },
  // The overlay source is named by the shared term, not by a page-local label.
  { key: 'transit', label: 'Transit' }
];

/** The single design's three activation sources, as row groups. */
const wakingSourceGroups = row => SOURCE_ORDER
  .filter(({ key }) => row[key]?.length)
  .map(({ key, label }) => ({ key, label: t(label), entries: row[key] }));

/**
 * The composite's row groups: one per person, per half of their sleeping design.
 *
 * `key` stays the half, so the solid/dashed rule keeps carrying that cue, and
 * `owner` supplies the person colour. A single design separates its three
 * sources by colour; two people need colour for the person and the rule for the
 * half, which is what the existing `--dream-source` plus `border-left-style`
 * split already expresses. The label joins with the site's own separator rather
 * than a private one, as `activationColumn()` does.
 */
function compositeSourceGroups(row, labelA, labelB) {
  const sep = formatDisplay('separator', 'label');
  return (row.sources || []).map(source => ({
    key: source.side,
    owner: source.person,
    label: `${source.person === 'a' ? labelA : labelB}${sep}${t(source.label)}`,
    entries: source.entries
  }));
}

/**
 * One night field.
 *
 * The panel component is shared by both modes: what a two-person composite
 * changes is which parts it is given, never the panel itself. A single design
 * passed nothing here and keeps its three activation sources and its overlay
 * channel states; the composite passes its own row groups (grouped by owner)
 * and its own channel states (grouped by who completes the channel), because
 * AGENTS.md §6 makes the data context explicit instead of letting the panel
 * reach for a model that belongs to only one of the two modes.
 *
 * @param {object} model - anything with `.realms` in the `computeDreamChart()` shape
 * @param {string} realmId - `light` / `earth` / `demon`
 * @param {object} [options]
 * @param {boolean} [options.overlay] - whether the night sky can add rows
 * @param {object} [options.context] - the single design's detail context, whose
 *   `model` is the overlay this panel reads its channel states from
 * @param {object} [options.api] - graph API, for channel hover
 * @param {(row:object)=>object[]} [options.groups] - row → activation groups
 * @param {string} [options.emptyKey] - what an empty field says
 * @param {(channel:object)=>object|string} [options.channelStatus] - channel → status
 * @param {object} [options.channelStatusTable] - the vocabulary of those statuses
 * @param {object} [options.channelParams] - extra `t()` parameters for that vocabulary
 */
function realmPanel(model, realmId, options = {}) {
  const {
    overlay = true,
    context = null,
    api,
    groups = null,
    emptyKey = 'No activations in this field tonight.',
    channelStatus = null,
    channelStatusTable = CHANNEL_STATUS,
    channelParams = {}
  } = options;
  const realmData = model.realms.find(item => item.id === realmId);
  const panel = el('section', { class: `dream-realm dream-realm-${realmId}`, 'data-realm': realmId });
  panel.appendChild(el('h3', { class: 'dream-realm-title', text: dreamRealmName(realmId) }));

  // A field's portal is a card like every other activation — same head, same
  // source blocks, same sheet — and it is always printed: the portal is the
  // field's own way in even on a night it carries no planet. Its reading lives in
  // the sheet (`lib/dream-detail.js`), so the panel no longer repeats it in a
  // second, collapsible copy that a reader had to open and then read twice.
  const rows = realmData?.rows || [];
  const portalRow = rows.find(row => row.portal) || null;
  const activeRows = rows.filter(row => !row.portal && (row.activated || (overlay && row.transitActivated)));
  const cards = el('ul', { class: 'dream-realm-rows' });
  for (const row of [portalRow, ...activeRows].filter(Boolean)) {
    cards.appendChild(realmRow(row, groups ? groups(row) : wakingSourceGroups(row), {
      portal: !!row.portal,
      // Only a portal is redrawn between its two states; an activated row exists
      // only when it is active. Either person opening the portal opens it.
      active: row.activated || row.transitActivated
    }));
  }
  panel.appendChild(cards);
  if (!activeRows.length) panel.appendChild(el('p', { class: 'dream-realm-empty', text: t(emptyKey) }));
  bindGateDetails(cards);
  // The other half of the two-way link: the same gesture the graph sends the rows
  // now also travels from these rows to the graph, so a gate can be found from
  // either side. One helper for both modes, as `bindRowHover()` already is. The
  // card's own button is the hover target: its stretched hit area covers the card.
  if (api) bindRowHover(cards, '.dream-row-open[data-gate]', api);

  // A portal is a gate without a channel, so its field can hold no channel at all.
  const channels = realmChannels(realmId);
  if (channels.length) {
    const statusOf = channelStatus || (channel => channelStatusOf(channel, context.model));
    const block = el('div', { class: 'dream-realm-channels' });
    block.appendChild(el('h4', { class: 'dream-channels-title', text: t('Sleep channels') }));
    const list = el('ul', { class: 'dream-channel-list' });
    for (const channel of channels) {
      const item = el('li', { class: 'dream-channel-row' });
      item.appendChild(channelButton(channel, statusOf(channel), { table: channelStatusTable, params: channelParams }));
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

/**
 * One activated dream gate, or a field's portal.
 *
 * `groups` is the list of activation groups to print under it, each
 * `{ key, label, entries, accent?, owner? }`. A single design passes its three
 * sources; the composite passes one group per person and per half of their
 * sleeping design, so the same markup shows two sets of planets under one gate.
 * `key` (`personality` / `design` / `transit`) keeps the existing rule-style
 * class, which is the colour-blind cue; `accent` is only ever a resolved Skin
 * token handed in by the caller, never a literal here.
 *
 * A portal is the same card with its field's own edge and tag: it is a gate, so it
 * lists its planets the same way on a night it carries one, and an empty source
 * list on a night it does not.
 */
function realmRow(row, groups, { portal = false, active = false } = {}) {
  const allEntries = (groups || []).flatMap(group => group.entries || []);
  const line = allEntries.find(entry => entry.line)?.line;
  const theme = line ? dreamLineTheme(line) : '';
  const chips = (groups || [])
    .filter(group => group.entries?.length)
    .map(group => `<div class="dream-row-source dream-row-source-${group.key}${group.owner ? ` dream-row-source-owner-${group.owner}` : ''}"${group.accent ? ` style="--dream-source:${group.accent}"` : ''}>
        <span class="dream-row-source-label">${esc(group.label)}</span>
        <span class="dream-row-planets">${group.entries.map(source =>
          `<span class="dream-planet-chip"><i aria-hidden="true">${PLANET_GLYPHS[source.planet] || ''}</i>${esc(planetName(source.planet))}${source.line ? ` ${row.gate}.${source.line}` : ''}</span>`).join('')}</span>
      </div>`)
    .join('');
  return rowElement(row, line, theme, chips, { portal, active });
}

/**
 * The card itself: one head (number, dream name, theme) and the source blocks.
 *
 * The head's number is the card's only control — a real button, so click, Enter,
 * Space and the focus ring come from the browser, and `styles/dream.css` stretches
 * its hit area over the whole card. Nothing wraps it in a `role="button"` and no
 * second handler sits on the row, so one gesture opens one sheet.
 */
function rowElement(row, line, theme, chips, { portal = false, active = false } = {}) {
  const item = el('li', {
    class: `dream-realm-row${portal ? ' dream-realm-portal' : ''}${portal && active ? ' dream-portal-active' : ''}`,
    'data-gate': row.gate
  });
  item.innerHTML = `
    <div class="dream-row-head">
      <button type="button" class="dream-row-open" data-gate="${row.gate}"
        aria-label="${esc(t('Gate {gate}', { gate: row.gate }))}">${row.gate}${line ? `.${line}` : ''}</button>
      <span class="dream-row-name">${esc(dreamGateName(row.gate))}${theme ? ` <span class="dream-row-theme">· ${esc(theme)}</span>` : ''}</span>
      ${portal ? `<span class="dream-portal-tag">${esc(t('Portal of this field'))}</span>` : ''}
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
    // Same touch contract as the single design: a drag never opens a sheet, a tap
    // previews, and a second tap opens. Without this the composite answered a
    // touch on a gate as a click, so a pan across the graph opened a card.
    touchPreview: true,
    ariaLabel: t('Combined sleep chart bodygraph for {a} and {b}, coloured by whose sleeping design carries each gate.',
      { a: labelA, b: labelB }),
    // Same naming object as the single design: one vocabulary for both modes.
    naming: dreamNaming,
    composite: {
      chartA, chartB, structure, labelA, labelB,
      colorA: palette.a, colorB: palette.b, colorBridged: palette.bridged
    },
    // One callback for both modes, so a gate means the same row in either view.
    onHighlight: dreamHighlightRows,
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

  // The three night fields, below the graph exactly where the single design puts
  // them: the same panel component given the composite's own parts. Rows group by
  // who carries the gate instead of by activation source, and channel states say
  // who completes the channel instead of whether the night sky does. There is no
  // overlay here, so `overlay: false` keeps a transit-only row from appearing.
  const compositeRealms = buildCompositeRealms(a, b);
  const channelStates = compositeChannelStates(chartA, chartB, structure, labelA, labelB);
  const realms = el('div', { class: 'dream-realms' });
  for (const realmId of DREAM_REALM_ORDER) {
    realms.appendChild(realmPanel(compositeRealms, realmId, {
      overlay: false,
      api: compositeApi,
      groups: row => compositeSourceGroups(row, labelA, labelB),
      emptyKey: 'Neither sleep design activates this field.',
      channelStatusTable: COMPOSITE_CHANNEL_STATUS,
      channelStatus: channel => {
        const state = channelStates.get(channel.gates.join('-')) || { status: 'inactive', split: '' };
        return {
          status: state.status,
          params: { name: state.status === 'a' ? labelA : state.status === 'b' ? labelB : '' },
          note: state.split
        };
      }
    }));
  }
  content.appendChild(realms);
  content.appendChild(comparisonFacts({ a, b, labelA, labelB, structure }));
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
 * Structural facts, then each person's waking/sleep type pair as buttons.
 *
 * The dream channels belong to the three night fields above this block, which list
 * every channel of a field with its ownership state and, for a channel completed
 * from one gate each, who contributes which gate; repeating them here would put
 * two channel lists on one page. Nothing is scored or ranked.
 *
 * The type readings themselves open in the shared sheet, one per person and half:
 * the same sheet the single design's type strip uses, so there is one type-reading
 * surface instead of a collapsed block here and a card elsewhere. `owner` (`a` /
 * `b`) travels with the selection, so neither person's reading can be shown under
 * the other's name.
 */
function comparisonFacts({ a, b, labelA, labelB, structure }) {
  const section = el('section', { class: 'dream-compare-facts' });
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

  // Type entries: every person's waking and sleep types are buttons here too, in the
  // same 清醒 / 梦境 comparison the single design's strip uses. The reading opens in
  // the shared sheet *with the owner*, so it always describes that person and never
  // whatever chart happens to be loaded (AGENTS.md §6).
  for (const [owner, label, model] of [['a', labelA, a], ['b', labelB, b]]) {
    const row = el('div', { class: 'dream-compare-type-row', 'data-owner': owner });
    row.appendChild(el('span', { class: 'dream-compare-type-person', text: label }));
    row.appendChild(typeEntry(owner, 'waking', model));
    row.appendChild(typeEntry(owner, 'dream', model));
    section.appendChild(row);
  }
  return section;
}

/**
 * One half of one person's type comparison, as a chip button.
 *
 * The type names are plain names and the label says which half this is, exactly as
 * on the single design's strip — the difference is only that this chip also carries
 * `data-owner`, which is what keeps two people's readings apart. A half the source
 * does not cover renders as a plain chip instead of a button into an empty card.
 *
 * @param {'a'|'b'} owner
 * @param {'waking'|'dream'} side
 * @param {object} model - that person's sleep model
 */
function typeEntry(owner, side, model) {
  const pair = el('span', { class: 'dream-type-pair' });
  pair.appendChild(el('span', { class: 'dream-type-label', text: t(side === 'waking' ? 'Awake' : 'Asleep') }));
  const wakingName = model.wakingType?.name || null;
  const name = side === 'waking'
    ? (wakingName ? typeName(wakingName) : null)
    : dreamTypeName(model.type.id);
  const available = side === 'waking' ? !!wakingName : !!dreamTypeReading(model.type.id);
  if (!name || !available) {
    pair.appendChild(el('span', { class: 'dream-type-chip dream-type-chip-empty', text: '—' }));
    return pair;
  }
  const color = side === 'waking'
    ? TYPE_COLORS[wakingName] || 'var(--hd-inactive)'
    : TYPE_COLORS[model.type.id] || 'var(--hd-inactive)';
  const chip = el('button', {
    type: 'button',
    class: 'dream-type-chip',
    'data-dream-type-open': side,
    'data-owner': owner,
    'aria-label': t(side === 'waking' ? 'Open the waking type reading' : 'Open the dream type reading'),
    style: `background:${color}`
  }, name);
  chip.addEventListener('click', () => openType(side, owner));
  pair.appendChild(chip);
  return pair;
}
