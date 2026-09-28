/**
 * Transits view — today's (or any date's) planetary weather over the
 * natal chart, with the transit gates ringed on a bodygraph.
 */

import { calculateHDTransits, calculateTransitGates } from 'natalengine';
import { renderBodygraph, PLANET_ORDER, PLANET_GLYPHS } from '../bodygraph.js';
import { esc } from '../lib/format.js';
import { t, setMessage } from '../lib/i18n.js';
import { transitInstants, engineTransitArguments, formatTransitOffset } from '../lib/transit-time.js';
import { buildTransitGraph } from '../lib/transit-graph.js';
import { renderTransitLegend, renderTransitSummary, highlightTransitRows } from './transit-presentation.js';
import { planetName } from '../lib/vocabulary.js';

import { getCurrentChart, showTransitDetail, refreshTransitDetail } from './chart.js';

let transitDetailContext = null;
let lastTransitResult = null;

export function setupTransitView() {
  document.getElementById('transits-view').addEventListener('click', event => {
    const button = event.target.closest('[data-transit-detail]');
    if (button && transitDetailContext) {
      const kind = button.dataset.transitDetail;
      showTransitDetail(kind, kind === 'gate' ? Number(button.dataset.id) : button.dataset.id, transitDetailContext);
    }

  });
  const previewDetail = event => {
    if (event.pointerType === 'touch') return;
    const button = event.target.closest('[data-transit-detail]');
    if (!button) return;
    const kind = button.dataset.transitDetail;
    transitDetailContext?.api?.highlightSelection({ kind, id: kind === 'gate' ? Number(button.dataset.id) : button.dataset.id });
  };
  const clearPreview = event => {
    const button = event.target.closest('[data-transit-detail]');
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
  delete status.dataset.i18n;
  status.textContent = `${date} · ${time} · ${zone} (${formatTransitOffset(selected.offset)}) · ${new Date(selected.instant).toISOString().replace('.000Z', 'Z')}`;
  const [transitDate, engineOffset] = engineTransitArguments(selected.instant);

  const overlay = calculateHDTransits(current.chart, transitDate, engineOffset);
  const transitGates = Object.values(calculateTransitGates(transitDate, engineOffset)?.gates || {})
    .filter(Boolean)
    .map(g => g.gate);

  const mode = document.getElementById('transit-only-toggle').getAttribute('aria-pressed') === 'true' ? 'transit-only' : 'overlay';
  const model = buildTransitGraph(current.chart, overlay.transitGates, mode);
  lastTransitResult = { chart: current.chart, overlay, transitGates, model, mode };
  drawTransitResult(lastTransitResult);
}

// A language change redraws cached results, without resolving the selected
// wall-clock time again or changing the user's DST-fold choice.
export function refreshTransitLanguage() {
  if (lastTransitResult?.chart !== getCurrentChart()?.chart) return;
  if (lastTransitResult) drawTransitResult(lastTransitResult, true);
}

function drawTransitResult({ chart, overlay, transitGates, model, mode }, preserveDetail = false) {
  renderTransitLegend(mode);

  // Bodygraph colored by activation source
  const graphContainer = document.getElementById('transit-bodygraph');
  if (graphContainer) {
    const context = preserveDetail && transitDetailContext
      ? transitDetailContext : { transitGates: overlay.transitGates, mode, model };
    transitDetailContext = context;
    context.api = renderBodygraph(graphContainer, chart, {
      planetColumns: true,
      animate: false,
      transitGates,
      transitModel: model,
      onGateClick: gate => showTransitDetail('gate', gate, context),
      onCenterClick: center => showTransitDetail('center', center, context),
      onHighlight: highlightTransitRows
    });
    const grid = graphContainer.querySelector('.bg-grid');
    if (grid) {
      const design = grid.querySelector('.bg-planets-design');
      const personality = grid.querySelector('.bg-planets-personality');
      const pair = document.createElement('div');
      pair.className = 'transit-birth-pair';
      const head = document.createElement('div');
      head.className = 'transit-birth-head';
      head.append(design.querySelector('.bg-planets-head'), document.createElement('span'), personality.querySelector('.bg-planets-head'));
      pair.append(head);
      const designRows = [...design.querySelectorAll('.bg-planet-row')];
      const personalityRows = [...personality.querySelectorAll('.bg-planet-row')];
      designRows.forEach((designRow, index) => {
        const personalityRow = personalityRows[index];
        const glyph = designRow.querySelector('.bg-planet-glyph');
        personalityRow.querySelector('.bg-planet-glyph')?.remove();
        const row = document.createElement('div');
        row.className = 'transit-birth-row';
        designRow.classList.add('transit-birth-value', 'bg-planets-design');
        personalityRow.classList.add('transit-birth-value', 'bg-planets-personality');
        row.append(designRow, glyph, personalityRow);
        pair.append(row);
      });
      design.remove();
      personality.remove();
      grid.append(pair);
      const transitColumn = document.createElement('div');
      transitColumn.className = 'bg-planets transit-planet-column';
      transitColumn.innerHTML = `<div class="bg-planets-head">${esc(t('Transits'))}</div>` + PLANET_ORDER.map(planet => {
        const activation = overlay.transitGates?.[planet];
        return `<button type="button" class="bg-planet-row" data-transit-planet="${planet}" ${activation ? `data-gate="${activation.gate}"` : ''} title="${esc(planetName(planet))}"><span class="bg-planet-glyph">${PLANET_GLYPHS[planet]}</span><span class="bg-planet-act">${activation ? `${activation.gate}.${activation.line}` : '—'}</span></button>`;
      }).join('');
      grid.prepend(transitColumn);
      transitColumn.querySelectorAll('[data-gate]').forEach(row => {
        row.addEventListener('click', () => showTransitDetail('gate', Number(row.dataset.gate), context));
        row.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') context.api.highlightSelection({ kind: 'gate', id: Number(row.dataset.gate) }); });
        row.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') context.api.highlightSelection(null); });
      });
    }
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
