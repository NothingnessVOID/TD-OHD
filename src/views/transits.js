/**
 * Transits view — today's (or any date's) planetary weather over the
 * natal chart, with the transit gates ringed on a bodygraph.
 */

import { transitExportSnapshot } from '../lib/chart-data-export.js';
import { sharpProvider } from '../lib/chart-engine/sharp-provider.js';
import { analyzeTransitActivations } from '../lib/transit-analysis.js';
import { renderBodygraph, PLANET_ORDER, PLANET_GLYPHS } from '../bodygraph.js';
import { getLocaleResources } from '../lib/i18n.js';
import { formatTransitOffset } from '../lib/transit-time.js';
import { mountTransitTimeControl } from '../lib/transit-time-control.js';
import { buildTransitGraph } from '../lib/transit-graph.js';
import { renderTransitSummary, highlightTransitRows } from './transit-presentation.js';
import { planetName } from '../lib/vocabulary.js';
import { calculateLineFixings, calculateTransitLineFixings } from '../features/transit-timeline/line-fixing.js';
import { graphPanelMarkup, renderGraphColumns } from '../features/transit-timeline/graph-window.js';
import { translator } from '../features/transit-timeline/messages.js';

import { getCurrentChart, showTransitDetail, refreshTransitDetail } from './chart.js';

let transitDetailContext = null;
let lastTransitResult = null;
let requestSequence = 0;
// The shared time control (lib/transit-time-control.js) owns the date, time,
// timezone, Now and DST widgets. It keeps the historical `transit-*` element ids.
let timeControl = null;

/**
 * The moment the page should read, or null when the wall time is not resolvable.
 * `renderTransits()` reads the resolved moment — date, time and the UTC offset the
 * DST rule picked — instead of the DOM, so the resolution rule stays in the
 * control and the view never re-derives it.
 */
function currentSelection() {
  return timeControl?.getResolved() || null;
}

export function invalidateTransits() {
  ++requestSequence;
  transitDetailContext = null;
  lastTransitResult = null;
  document.getElementById('transit-bodygraph')?.replaceChildren();
  document.getElementById('transit-content')?.replaceChildren();
}
/** Only the successfully rendered moment; cleared as soon as a new request starts. */
export function getCurrentTransitExportData() {
  if (!lastTransitResult || lastTransitResult.chart !== getCurrentChart()?.chart) return null;
  return transitExportSnapshot(lastTransitResult.overlay.transitGates, lastTransitResult);
}
const graphLabels = () => {
  const translate = translator(getLocaleResources().timeline.messages);
  return Object.fromEntries(['selected', 'legend', 'natal', 'transit', 'completed', 'both', 'design', 'personality'].map(key => [key, translate(key)]));
};
const mountGraphPanel = () => {
  const locale = getLocaleResources().timeline.locale;
  document.getElementById('transit-stage').innerHTML = graphPanelMarkup({ labels: graphLabels(), locale, graphId: 'transit-bodygraph' });
};

export function setupTransitView() {
  mountGraphPanel();
  timeControl?.destroy();
  timeControl = mountTransitTimeControl({
    host: document.getElementById('transit-time-host'),
    // Historical prefix: existing e2e checks select `#transit-date` and friends.
    idPrefix: 'transit',
    // The transit-only mode belongs to this page; the Sleep chart mounts the
    // same control with the toggle off.
    showModeToggle: true,
    onModeToggle: () => renderTransits(),
    onChange: () => renderTransits()
  });
  document.getElementById('transits-view').addEventListener('click', event => {
    const planet = event.target.closest('.tl-planet[data-gate], .tl-birth-value[data-gate]');
    if (planet?.dataset.gate && transitDetailContext) showTransitDetail('planet', {
      source: planet.dataset.side || 'transit',
      planet: planet.dataset.birthPlanet || planet.dataset.planet,
    }, transitDetailContext);
    const button = event.target.closest('[data-transit-detail]');
    if (button && transitDetailContext) {
      const kind = button.dataset.transitDetail;
      showTransitDetail(kind, kind === 'gate' ? Number(button.dataset.id) : button.dataset.id, transitDetailContext);
    }

  });
  const previewDetail = event => {
    if (event.pointerType === 'touch') return;
    const button = event.target.closest('[data-transit-detail]');
    if (button) {
      const kind = button.dataset.transitDetail;
      transitDetailContext?.api?.highlightSelection({ kind, id: kind === 'gate' ? Number(button.dataset.id) : button.dataset.id });
      return;
    }
    const planet = event.target.closest('.tl-planet[data-gate], .tl-birth-value[data-gate]');
    if (planet?.dataset.gate) transitDetailContext?.api?.highlightSelection({ kind: 'gate', id: Number(planet.dataset.gate) });
  };
  const clearPreview = event => {
    const button = event.target.closest('[data-transit-detail], .tl-planet[data-gate], .tl-birth-value[data-gate]');
    if (button && !button.contains(event.relatedTarget)) transitDetailContext?.api?.highlightSelection(null);
  };
  const view = document.getElementById('transits-view');
  view.addEventListener('pointerover', previewDetail);
  view.addEventListener('focusin', previewDetail);
  view.addEventListener('pointerout', clearPreview);
  view.addEventListener('focusout', clearPreview);
}

export async function renderTransits() {
  const request = ++requestSequence;
  const current = getCurrentChart();
  transitDetailContext = null;
  lastTransitResult = null;
  if (!current) return;
  const selection = currentSelection();
  // The control has already reported a gap or an invalid zone in its own status
  // line; the page shows nothing rather than a stale overlay.
  if (!selection) {
    document.getElementById('transit-bodygraph')?.replaceChildren();
    document.getElementById('transit-content')?.replaceChildren();
    return;
  }
  const { date, time, offset } = selection;
  const instant = timeControl.getInstant();
  const mode = timeControl.isTransitOnly() ? 'transit-only' : 'overlay';
  let activations;
  try {
    activations = await sharpProvider.calculateTransitSnapshot(instant);
  } catch (error) {
    if (request !== requestSequence) return;
    timeControl.reportError(error.message);
    return;
  }
  if (request !== requestSequence || current.chart !== getCurrentChart()?.chart) return;
  const activeGates = [...new Set(Object.values(activations).map(value => value.gate))];
  const overlay = analyzeTransitActivations(current.chart, { date: new Date(instant).toISOString(),
    gates: activations, activeGates, activeGateCount: activeGates.length });
  const model = buildTransitGraph(current.chart, overlay.transitGates, mode);
  const rendered = { chart: current.chart, overlay, model, mode, date, time, offset };
  drawTransitResult(rendered);
  lastTransitResult = rendered;
}

// A language change redraws cached results, without resolving the selected
// wall-clock time again or changing the user's DST-fold choice.
export function refreshTransitLanguage() {
  if (lastTransitResult?.chart !== getCurrentChart()?.chart) return;
  if (lastTransitResult) { mountGraphPanel(); drawTransitResult(lastTransitResult, true); }
}

function drawTransitResult({ chart, overlay, model, mode, date, time, offset }, preserveDetail = false) {
  const stage = document.getElementById('transit-stage');
  const graphContainer = document.getElementById('transit-bodygraph');
  if (graphContainer) {
    const context = preserveDetail && transitDetailContext
      ? transitDetailContext : { transitGates: overlay.transitGates, mode, model };
    transitDetailContext = context;
    context.api = renderBodygraph(graphContainer, chart, {
      planetColumns: false,
      animate: false,
      touchPreview: true,
      transitGates: model.transitGates,
      transitModel: model,
      onGateClick: gate => showTransitDetail('gate', gate, context),
      onCenterClick: center => showTransitDetail('center', center, context),
      onHighlight: highlightTransitRows
    });
    const translate = translator(getLocaleResources().timeline.messages);
    const planets = PLANET_ORDER.map(id => ({ id, name: planetName(id), glyph: PLANET_GLYPHS[id] }));
    renderGraphColumns({ root: stage, chart, activations: overlay.transitGates, mode, planets,
      fixings: { birth: calculateLineFixings(chart, overlay.transitGates), transit: calculateTransitLineFixings(chart, overlay.transitGates) },
      translate });
    stage.querySelector('.tl-moment-date').textContent = date;
    stage.querySelector('.tl-moment-time').textContent = `${time} ${formatTransitOffset(offset)}`;
  }

  renderTransitSummary(overlay, model);
  if (preserveDetail && transitDetailContext) refreshTransitDetail(transitDetailContext);
}

export function renderTransitContent(overlay, date = null) {
  const current = getCurrentChart();
  const mode = timeControl?.isTransitOnly() ? 'transit-only' : 'overlay';
  renderTransitSummary(overlay, buildTransitGraph(current.chart, overlay.transitGates, mode),
    document.getElementById('transit-status')?.textContent || `${date} · 12:00 UTC`);

}
