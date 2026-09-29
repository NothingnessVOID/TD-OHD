/**
 * Transits view — today's (or any date's) planetary weather over the
 * natal chart, with the transit gates ringed on a bodygraph.
 */

import { calculateHDTransits } from 'natalengine';
import { renderBodygraph, PLANET_ORDER, PLANET_GLYPHS } from '../bodygraph.js';
import { setMessage, getLocaleResources } from '../lib/i18n.js';
import { transitInstants, engineTransitArguments, formatTransitOffset } from '../lib/transit-time.js';
import { buildTransitGraph } from '../lib/transit-graph.js';
import { renderTransitSummary, highlightTransitRows } from './transit-presentation.js';
import { planetName } from '../lib/vocabulary.js';
import { calculateLineFixings, calculateTransitLineFixings } from '../features/transit-timeline/line-fixing.js';
import { graphPanelMarkup, renderGraphColumns } from '../features/transit-timeline/graph-window.js';
import { translator } from '../features/transit-timeline/messages.js';

import { getCurrentChart, showTransitDetail, refreshTransitDetail } from './chart.js';

let transitDetailContext = null;
let lastTransitResult = null;
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
  const modeButton = document.getElementById('transit-only-toggle');
  modeButton.addEventListener('click', () => {
    modeButton.setAttribute('aria-pressed', String(modeButton.getAttribute('aria-pressed') !== 'true'));
    renderTransits();
  });
  const dateInput = document.getElementById('transit-date');
  const timeInput = document.getElementById('transit-time');
  const zoneInput = document.getElementById('transit-timezone');
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const setNow = () => {
    const now = new Date();
    const zone = zoneInput.value || localZone || 'UTC';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(now).map(part => [part.type, part.value]));
    dateInput.value = `${parts.year}-${parts.month}-${parts.day}`;
    timeInput.value = `${parts.hour}:${parts.minute}:${parts.second}`;
    zoneInput.value = zone;
    zoneInput.textContent = zone;
    renderTransits();
  };
  zoneInput.value = localZone || 'UTC';
  zoneInput.textContent = zoneInput.value;
  setNow();

  dateInput.addEventListener('change', renderTransits);
  timeInput.addEventListener('change', renderTransits);
  document.getElementById('transit-choice').addEventListener('change', renderTransits);
  document.getElementById('transit-now').addEventListener('click', setNow);
}

export function renderTransits() {
  const current = getCurrentChart();
  if (!current) return;
  transitDetailContext = null;
  lastTransitResult = null;
  const date = document.getElementById('transit-date').value;
  let time = document.getElementById('transit-time').value;
  if (time.length === 5) time += ':00';
  const zone = document.getElementById('transit-timezone').value.trim();
  const status = document.getElementById('transit-status');
  const choiceLabel = document.getElementById('transit-choice-label');
  const choice = document.getElementById('transit-choice');
  let matches;
  try {
    matches = transitInstants(date, time, zone);
    if (!matches.length) throw new Error('This local time does not exist in that timezone. Choose another time.');
  } catch (error) {
    status.classList.remove('tl-sr-only');
    setMessage(status, error instanceof RangeError ? 'Enter a valid IANA timezone.' : error.message);
    choiceLabel.hidden = true;
    document.getElementById('transit-bodygraph').replaceChildren();
    document.getElementById('transit-content').replaceChildren();
    return;
  }


  const selected = matches.find(m => String(m.instant) === choice.value) || matches[0];
  choiceLabel.hidden = matches.length < 2;
  choice.innerHTML = matches.map(m => `<option value="${m.instant}">${formatTransitOffset(m.offset)} (${new Date(m.instant).toISOString()})</option>`).join('');
  choice.value = String(selected.instant);
  status.classList.add('tl-sr-only');
  delete status.dataset.i18n;
  status.textContent = `${date} · ${time} · ${zone} (${formatTransitOffset(selected.offset)}) · ${new Date(selected.instant).toISOString().replace('.000Z', 'Z')}`;
  const [transitDate, engineOffset] = engineTransitArguments(selected.instant);

  const overlay = calculateHDTransits(current.chart, transitDate, engineOffset);
  const mode = document.getElementById('transit-only-toggle').getAttribute('aria-pressed') === 'true' ? 'transit-only' : 'overlay';
  const model = buildTransitGraph(current.chart, overlay.transitGates, mode);
  lastTransitResult = { chart: current.chart, overlay, model, mode, date, time, offset: selected.offset };
  drawTransitResult(lastTransitResult);
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
  const mode = document.getElementById('transit-only-toggle').getAttribute('aria-pressed') === 'true' ? 'transit-only' : 'overlay';
  renderTransitSummary(overlay, buildTransitGraph(current.chart, overlay.transitGates, mode),
    document.getElementById('transit-status')?.textContent || `${date} · 12:00 UTC`);

}
