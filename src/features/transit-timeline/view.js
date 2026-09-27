import { DAY, MINUTE, centeredWindow, intervalAt, adjacentEvent } from './core.js';
import { translator } from './messages.js';
import { displayTime, wallTime, formatDuration } from './time.js';
import { calendarRuler } from './ruler.js';
import { RANGE_OPTIONS, presetWindow } from './presets.js';
import { createTimelineClient } from './client.js';
import { createTimelineQueryClient } from './query-client.js';
import { LINE_FIXING_PLANETS } from './line-fixing-data.js';
import { TIMELINE_RULE_VERSION } from './version.js';
import { panWindow, panTimeline, instantAt, ratioAt, clipInterval, clampWindow, zoomWindow } from './viewport.js';
import './timeline.css';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };

// Keep hovered/focused rows and intervals alive while their positions change.
function reconcile(parent, markup) {
  const template = document.createElement('template');
  template.innerHTML = markup;
  const key = (node, index) => `${node.tagName}:${node.getAttribute('class')?.split(' ')[0] || ''}:${node.dataset.key || node.dataset.date || node.dataset.instant || index}:${node.dataset.interval || ''}`;
  function updateChildren(target, source) {
    const existing = new Map([...target.children].map((node, index) => [key(node, index), node]));
    const retained = new Set();
    [...source.children].forEach((next, index) => {
      let node = existing.get(key(next, index));
      if (!node) node = next;
      else {
        for (const attr of [...node.attributes]) {
          if (!next.hasAttribute(attr.name) && !['aria-pressed', 'data-active-source'].includes(attr.name)) node.removeAttribute(attr.name);
        }
        for (const attr of next.attributes) {
          let value = attr.value;
          if (attr.name === 'class' && node.classList.contains('tl-row')) {
            value += ['tl-row-active', 'tl-row-lit'].filter(name => node.classList.contains(name)).map(name => ` ${name}`).join('');
          }
          if (node.getAttribute(attr.name) !== value) node.setAttribute(attr.name, value);
        }
        if (next.children.length) updateChildren(node, next);
        else if (node.textContent !== next.textContent) node.textContent = next.textContent;
      }
      retained.add(node);
      if (target.children[index] !== node) target.insertBefore(node, target.children[index] || null);
    });
    for (const node of [...target.children]) if (!retained.has(node)) node.remove();
  }
  updateChildren(parent, template.content);
}

/**
 * A removable view. Host provides chart/calculation/detail adapters; messages
 * and label provide copy/terminology, CSS custom properties provide appearance.
 * No language pack, skin, storage or application router is imported here.
 */
export function createTransitTimeline({ root, host, messages, locale = 'en-GB', label }) {
  let t = translator(messages);
  let labeler = label;
  let name = labeler || (row => row.kind === 'center' ? row.name
    : row.kind === 'channel' ? `${row.id} · ${row.name}` : `${t('gate')} ${row.id} · ${row.name}`);
  const client = createTimelineClient();
  const queryClient = createTimelineQueryClient();
  const watchlist = new Set((() => {
    try {
      const values = JSON.parse(localStorage.getItem('td-ohd-timeline-watchlist-v1') || '[]');
      return Array.isArray(values) ? values.filter(value => typeof value === 'string' && /^(center|channel|gate|line):[\w.-]+$/.test(value)) : [];
    } catch { return []; }
  })());
  const saveWatchlist = () => {
    try { localStorage.setItem('td-ohd-timeline-watchlist-v1', JSON.stringify([...watchlist].sort())); }
    catch { /* browsing remains usable when storage is unavailable */ }
  };
  const events = new AbortController();
  let selected = Math.floor(Date.now() / 1000) * 1000;
  let preset = '7';
  let rangeAnchor = selected;
  let zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  let timelineRange = presetWindow(selected, preset, zone, host.resolveTime);
  let span = timelineRange.end - timelineRange.start;
  let windowRange = { ...timelineRange };
  let mode = 'overlay';
  let eventLevel = 'gate';
  let planetFilter = 'all';
  let active = false;
  let chart = null;
  let identity = '';
  let result = null;
  let context = null;
  let graphChart = null;
  let graphKey = '';
  let snapshotInstant;
  let snapshotActivations;
  let hoverSelection = null;
  let generation = 0;
  let frame = 0;
  let pendingDetail = null;
  let drag = null;
  let edgeFrame = 0;
  let suppressClick = false;
  let clickReset = 0;
  let calculating = false;
  let viewFrame = 0;
  let gestureScale = 1;
  let requestedRange = null;
  let queryGeneration = 0;
  let queryResult = null;
  let queryState = '';
  let compareA = null;
  let compareB = null;
  let boundsZone = '';
  let limits;
  const $ = selector => root.querySelector(selector);
  const listen = (node, type, fn, options = {}) => node.addEventListener(type, fn, { ...options, signal: events.signal });
  const format = (instant, compact = false) => displayTime(instant, zone, locale, compact);
  const button = (action, text, title = text) => `<button type="button" data-action="${action}" title="${esc(title)}" aria-label="${esc(title)}">${esc(text)}</button>`;
  function bounds() {
    if (boundsZone !== zone) {
      limits = {
        start: host.resolveTime('1800-01-01', '00:00:00', zone)[0]?.instant ?? Date.UTC(1800, 0, 1),
        end: (host.resolveTime('2200-12-31', '23:59:59', zone)[0]?.instant ?? Date.UTC(2201, 0, 1) - 1000) + 1000,
      };
      boundsZone = zone;
    }
    return limits;
  }
  function boundRange(range) {
    const duration = range.end - range.start;
    const { start: minimum, end: maximum } = bounds();
    const start = Math.max(minimum, Math.min(maximum - duration, range.start));
    return { start, end: start + duration };
  }

  root.classList.add('tl');
  const rangeOptions = RANGE_OPTIONS;
  root.innerHTML = `
    <p class="tl-empty-state" role="status">${esc(t('empty'))}</p>
    <div class="tl-heading"><h2>${esc(t('title'))}</h2><span class="tl-person"></span></div>
    <div class="tl-toolbar">
      <label>${esc(t('date'))}<input data-field="date" type="date" min="1800-01-01" max="2200-12-31"></label>
      <label>${esc(t('time'))}<input data-field="time" type="time" step="1"></label>
      <label class="tl-zone">${esc(t('zone'))}<select data-field="zone"></select></label>
      ${button('now', t('now'))}
      <div class="tl-event-nav"><button type="button" data-action="prev-event" aria-label="${esc(t('previous'))}" title="${esc(t('previous'))}">‹</button><button type="button" data-action="next-event" aria-label="${esc(t('next'))}" title="${esc(t('next'))}">›</button><span class="tl-event-status" role="status"></span></div>
      <label>${esc(t('mode'))}<select data-field="mode"><option value="overlay">${esc(t('overlay'))}</option><option value="transit-only">${esc(t('sky'))}</option></select></label>
      <label>${esc(t('planetFilter'))}<select data-field="planet"><option value="all">${esc(t('allPlanets'))}</option>${host.planets.map(planet => `<option value="${esc(planet.id)}">${esc(planet.name)}</option>`).join('')}</select></label>
    </div>
    <details class="tl-analysis"><summary>${esc(t('analysis'))}</summary><div class="tl-analysis-content">
      <div class="tl-compare-controls"><strong>${esc(t('compareTitle'))}</strong>${button('set-a', t('setA'))}${button('set-b', t('setB'))}${button('clear-ab', t('clearAB'))}</div>
      <div class="tl-compare-output" role="status"></div>
      <div class="tl-query-controls"><strong>${esc(t('conditionSearch'))}</strong>
        <select data-field="condition" aria-label="${esc(t('conditionSearch'))}"><option value="channel">${esc(t('queryChannel'))}</option><option value="center">${esc(t('queryCenter'))}</option><option value="line">${esc(t('queryLine'))}</option><option value="bridge">${esc(t('queryBridge'))}</option></select>
        <input data-field="query-id" list="tl-query-ids" placeholder="${esc(t('queryTarget'))}" aria-label="${esc(t('queryTarget'))}"><datalist id="tl-query-ids"></datalist>
        ${button('run-query', t('runQuery'))}${button('cancel-query', t('cancelQuery'))}
      </div><div class="tl-query-status" role="status"></div><div class="tl-query-results"></div>
    </div></details>
    <div class="tl-time-error" role="status"></div>
    <label class="tl-fold" hidden>${esc(t('chooseOffset'))}<select data-field="fold"></select></label>
    <div class="tl-workspace"><div class="tl-stage">
      <button type="button" class="tl-mobile-exit" data-action="mobile-exit" aria-label="${esc(t('backToChart'))}" title="${esc(t('backToChart'))}">←</button>
      <div class="tl-graph-panel">
        <div class="tl-selected"><output class="tl-moment" aria-label="${esc(t('selected'))}"><span class="tl-moment-date"></span><span class="tl-moment-time"></span></output></div>
        <details class="tl-legend-disclosure"><summary>${esc(t('legend'))}</summary><div class="tl-legend">${['natal','transit','completed','both'].map(source => `<span data-source="${source}"><i></i>${esc(t(source))}</span>`).join('')}</div></details>
        <div class="tl-graph bodygraph-container"></div>
        <div class="tl-planet-column tl-transit-column bg-planets"><div class="bg-planets-head">${esc(t('transit'))}</div><div class="tl-planets" data-planets="transit"></div></div>
        <div class="tl-planet-column tl-birth-column"><div class="tl-birth-head${locale.startsWith('en') ? ' tl-birth-head-en' : ''}"><span class="bg-planets-design"><span class="bg-planets-head">${esc(t('design'))}</span></span><span aria-hidden="true"></span><span class="bg-planets-personality"><span class="bg-planets-head">${esc(t('personality'))}</span></span></div><div class="tl-birth-planets"></div></div>
      </div>
      <button type="button" class="tl-mobile-controls-trigger" data-action="mobile-controls" aria-controls="tl-mobile-controls" aria-expanded="false" aria-label="${esc(t('mobileControls'))}" title="${esc(t('mobileControls'))}"><span aria-hidden="true">☷</span></button>
      <div class="tl-mobile-controls-panel" id="tl-mobile-controls" hidden></div>
    </div>
    <div class="tl-explorer"><section class="tl-tracks-panel" aria-label="${esc(t('tracks'))}">
      <div class="tl-table" aria-busy="true" tabindex="0" role="region" aria-label="${esc(t('scrub'))}" aria-describedby="tl-gesture-help" title="${esc(t('timelineHelp'))}">
        <div class="tl-panel-header">
          <label class="tl-kind"><span class="tl-sr-only">${esc(t('filter'))}</span><select data-field="kind" aria-label="${esc(t('filter'))}" title="${esc(t('filter'))}">${[['all','all'],['center','centersShort'],['channel','channels'],['gate','gates'],['line','lines']].map(([value,key]) => `<option value="${value}">${esc(t(key))}</option>`).join('')}</select></label>
          <div class="tl-compact-controls">
            <label class="tl-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="m12 12 5 5"/></svg><input type="search" data-field="search" placeholder="${esc(t('searchShort'))}" aria-label="${esc(t('search'))}" title="${esc(t('search'))}"></label>
            <select data-field="event-level" aria-label="${esc(t('eventLevel'))}" title="${esc(t('eventLevel'))}"><option value="gate">${esc(t('gateLevel'))}</option><option value="line">${esc(t('lineLevel'))}</option></select>
            <select data-field="span" aria-label="${esc(t('zoom'))}" title="${esc(t('zoom'))}">${rangeOptions.map(([value,key]) => `<option value="${value}" ${value === '7' ? 'selected' : ''}>${esc(t(key))}</option>`).join('')}</select>
            <button type="button" class="tl-changes" data-field="changes" data-action="changes" aria-pressed="false" aria-label="${esc(t('onlyChanges'))}" title="${esc(t('onlyChanges'))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 14h5V6h6v8h5"/></svg><span>${esc(t('changesShort'))}</span></button>
            <button type="button" class="tl-changes" data-field="inactive" data-action="inactive" aria-pressed="false" aria-label="${esc(t('showInactive'))}" title="${esc(t('showInactive'))}"><span>${esc(t('inactiveShort'))}</span></button>
            <button type="button" class="tl-changes" data-field="watch-only" data-action="watch-only" aria-pressed="false" aria-label="${esc(t('watchOnly'))}" title="${esc(t('watchOnly'))}"><span>☆</span></button>
          </div>
          <div class="tl-track tl-ticks"></div>
        </div>
        <div class="tl-rows"></div>
      </div>
      <span id="tl-gesture-help" class="tl-sr-only">${esc(t('gestures'))}</span>
    <div class="tl-calculation" data-state="loading" hidden>
      <div class="tl-calculation-card">
        <div role="status" aria-live="polite"><span class="tl-load-status"></span><strong class="tl-loading-percent tl-loading-meter">0%</strong></div>
        <progress class="tl-loading-meter" max="100" value="0" aria-label="${esc(t('loadingTitle'))}"></progress>
        <p class="tl-loading-note tl-loading-meter">${esc(t('loadingHint'))}</p>
        ${button('cancel-calculation', t('cancelCalculation'))}
        ${button('retry', t('retry'))}
      </div>
    </div></section></div></div>`;

  const mobileLayout = window.matchMedia('(max-width: 740px)');
  const toolbar = $('.tl-toolbar');
  const analysis = $('.tl-analysis');
  const kindControl = $('.tl-kind');
  const compactControls = $('.tl-compact-controls');
  const controlPanel = $('.tl-mobile-controls-panel');
  const toolbarAnchor = document.createComment('timeline toolbar home');
  const analysisAnchor = document.createComment('timeline analysis home');
  const kindAnchor = document.createComment('timeline filter home');
  const compactAnchor = document.createComment('timeline compact controls home');
  toolbar.before(toolbarAnchor);
  analysis.before(analysisAnchor);
  kindControl.before(kindAnchor);
  compactControls.before(compactAnchor);
  function showMobileControls(open) {
    controlPanel.hidden = !open;
    $('.tl-mobile-controls-trigger').setAttribute('aria-expanded', String(open));
  }
  function placeControls() {
    showMobileControls(false);
    if (mobileLayout.matches) controlPanel.append(toolbar, kindControl, compactControls, analysis);
    else {
      toolbarAnchor.after(toolbar);
      analysisAnchor.after(analysis);
      kindAnchor.after(kindControl);
      compactAnchor.after(compactControls);
    }
  }
  listen(mobileLayout, 'change', placeControls);
  placeControls();

  $('[data-action="retry"]').hidden = true;
  $('[data-action="cancel-query"]').hidden = true;
  renderComparison();
  updateQueryTargets();
  const zones = [...new Set(['UTC', zone, ...(Intl.supportedValuesOf?.('timeZone') || [])])].sort();
  $('[data-field="zone"]').innerHTML = zones.map(value => `<option>${esc(value)}</option>`).join('');
  $('[data-field="zone"]').value = zone;
  // Browsers without a timezone catalogue still accept arbitrary IANA zones.
  if (!Intl.supportedValuesOf) {
    const input = document.createElement('input');
    input.dataset.field = 'zone'; input.value = zone;
    $('[data-field="zone"]').replaceWith(input);
  }

  function syncClock() {
    const wall = wallTime(selected, zone);
    $('[data-field="date"]').value = wall.date;
    $('[data-field="time"]').value = wall.time;
    $('.tl-moment-date').textContent = wall.date;
    const offset = new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(selected).find(part => part.type === 'timeZoneName')?.value || zone;
    $('.tl-moment-time').textContent = `${wall.time} ${offset}`;
    $('.tl-moment').title = format(selected);
    $('.tl-table').dataset.selected = selected;
    $('.tl-table').dataset.start = windowRange.start;
    $('.tl-table').dataset.end = windowRange.end;
    $('.tl-table').dataset.calculatedStart = result?.start ?? '';
    $('.tl-table').dataset.calculatedEnd = result?.end ?? '';
    root.style.setProperty('--tl-cursor', `${ratioAt(windowRange, selected) * 100}%`);
    $('[data-field="span"]').value = preset;
    root.querySelectorAll('.tl-row').forEach(node => {
      const row = result?.rows.find(item => item.key === node.dataset.key);
      const interval = row && intervalAt(row, selected);
      node.classList.toggle('tl-row-active', Boolean(interval));
      if (interval) node.dataset.activeSource = interval.source;
      else delete node.dataset.activeSource;
    });
  }

  function highlight(selection) {
    const gates = new Set(selection?.gates || []);
    const centers = new Set(selection?.centers || []);
    root.querySelectorAll('.tl-row').forEach(node => {
      const [kind, id] = node.dataset.key.split(':');
      const lit = kind === 'gate' || kind === 'line' ? gates.has(Number(id.split('.')[0])) : kind === 'center' ? centers.has(id)
        : id.split('-').every(gate => gates.has(Number(gate)));
      node.classList.toggle('tl-row-lit', Boolean(selection && lit));
    });
  }

  function renderMoment() {
    frame = 0;
    if (!active || !chart) return;
    const allActivations = snapshotInstant === selected && snapshotActivations
      ? snapshotActivations : host.snapshot(selected);
    snapshotInstant = selected;
    snapshotActivations = allActivations;
    const activations = planetFilter === 'all' ? allActivations : { [planetFilter]: allActivations[planetFilter] };
    const model = host.buildModel(chart.chart, activations, mode);
    context ||= {};
    Object.assign(context, { transitGates: activations, mode, model, decorateDetail, onDetailClose: clearTimingState });
    const fixings = host.lineFixings?.(chart.chart, activations);
    const nextGraphKey = `${mode}:${planetFilter}:${[...model.transitGates].sort((a, b) => a - b).join(',')}`;
    if (graphChart !== chart.chart || graphKey !== nextGraphKey || !context.api) {
      context.api = host.renderGraph($('.tl-graph'), chart.chart, context, highlight);
      graphChart = chart.chart;
      graphKey = nextGraphKey;
      if (hoverSelection) context.api?.highlightSelection(hoverSelection);
    }
    // Keep the birth columns fixed; only the left transit column follows time.
    if (!$('.tl-planets').children.length) {
      $('.tl-planets').innerHTML = host.planets.map(planet => `<button type="button" class="tl-planet bg-planet-row" data-planet="${planet.id}" title="${esc(planet.name)}"><span class="bg-planet-glyph" aria-hidden="true">${esc(planet.glyph)}</span><strong class="bg-planet-act"></strong><span class="tl-fixing-mark" aria-hidden="true"></span></button>`).join('');
      $('.tl-birth-planets').innerHTML = host.planets.map(planet => `<div class="tl-birth-row"><button type="button" class="tl-birth-value bg-planet-row bg-planets-design" data-birth-planet="${planet.id}" data-side="design"><span class="tl-fixing-mark" aria-hidden="true"></span><span class="bg-planet-act"></span></button><span class="bg-planet-glyph tl-birth-glyph" aria-hidden="true">${esc(planet.glyph)}</span><button type="button" class="tl-birth-value bg-planet-row bg-planets-personality" data-birth-planet="${planet.id}" data-side="personality"><span class="bg-planet-act"></span><span class="tl-fixing-mark" aria-hidden="true"></span></button></div>`).join('');
    }
    root.querySelectorAll('[data-planet]').forEach(node => {
      const value = allActivations[node.dataset.planet];
      const planet = host.planets.find(planet => planet.id === node.dataset.planet);
      node.classList.toggle('tl-planet-filtered-out', planetFilter !== 'all' && node.dataset.planet !== planetFilter);
      node.dataset.gate = value?.gate ?? '';
      setText(node.querySelector('strong'), value ? `${value.gate}.${value.line}` : '—');
      const fixing = fixings?.transit[node.dataset.planet];
      const state = mode === 'transit-only' ? fixing?.transitOnlyState : fixing?.combinedState;
      const scope = mode === 'transit-only' ? t('transitFixing') : t('combinedFixing');
      renderFixing(node, state, `${t('transit')} · ${planet.name} · ${node.querySelector('strong').textContent}`, scope);
    });
    $('.tl-birth-column').hidden = mode === 'transit-only';
    root.querySelectorAll('[data-birth-planet]').forEach(node => {
      const value = chart.chart.gates[node.dataset.side]?.[node.dataset.birthPlanet];
      const planet = host.planets.find(planet => planet.id === node.dataset.birthPlanet);
      node.dataset.gate = value?.gate ?? '';
      const text = value ? `${value.gate}.${value.line}` : '—';
      setText(node.querySelector('.bg-planet-act'), text);
      const fixing = fixings?.birth[node.dataset.side]?.[node.dataset.birthPlanet];
      const scope = fixing?.temporaryChange
        ? `${t('temporaryFixing')} · ${t('natalFixing')}: ${t(`fixing_${fixing.natalState}`)}`
        : t('natalFixing');
      renderFixing(node, fixing?.transitAdjustedState, `${t(node.dataset.side)} · ${planet.name} · ${text}`, scope);
    });
    root.querySelectorAll('.tl-legend [data-source]').forEach(node => {
      node.hidden = mode === 'transit-only' && node.dataset.source !== 'transit';
    });
    if (pendingDetail?.follow) host.refreshDetail?.(context);
  }

  function renderFixing(node, state, baseTitle, scope) {
    const mark = node.querySelector('.tl-fixing-mark');
    mark.dataset.state = state || '';
    setText(mark, ({ exalted: '▲', detriment: '▼', juxtaposed: '▲▼', unknown: '?' })[state] || '');
    node.title = state ? `${baseTitle} · ${scope} · ${t(`fixing_${state}`)}` : baseTitle;
    node.setAttribute('aria-label', node.title);
  }

  function selectTime(instant, { recenter = false } = {}) {
    if (!recenter && (!result || calculating)) return;
    const range = recenter ? bounds() : result;
    const nextSelected = Math.max(range.start, Math.min(range.end - 1000, Math.round(instant / 1000) * 1000));
    if (!recenter && nextSelected === selected) return;
    selected = nextSelected;
    $('.tl-event-status').textContent = '';
    if (recenter) { host.closeDetail(); closeTiming(); }
    $('.tl-time-error').textContent = '';
    $('.tl-fold').hidden = true;
    if (recenter) {
      rangeAnchor = selected;
      timelineRange = boundRange(presetWindow(rangeAnchor, preset, zone, host.resolveTime));
      windowRange = { ...timelineRange };
      span = windowRange.end - windowRange.start;
      selected = Math.max(windowRange.start, Math.min(windowRange.end - 1000, selected));
      calculate();
    } else if (selected < windowRange.start || selected >= windowRange.end) {
      windowRange = clampWindow(centeredWindow(selected, span), result);
      renderRows();
    }
    syncClock();
    if (!frame) frame = requestAnimationFrame(renderMoment);
  }

  function rowSymbol(row) {
    if (row.kind === 'gate') return `<span class="tl-gate-symbol">${row.id}</span>`;
    if (row.kind === 'line') return `<span class="tl-line-symbol">${row.id}</span>`;
    if (row.kind === 'channel') return `<span class="tl-channel-symbol">${esc(row.id)}</span>`;
    const shapes = {
      head: '<path d="M14 3 26 24H2Z"/>', ajna: '<path d="M2 4h24L14 25Z"/>',
      throat: '<rect x="4" y="4" width="20" height="20" rx="2"/>',
      g: '<path d="m14 1 13 13-13 13L1 14Z"/>', heart: '<path d="m5 4 21 17-23 4Z"/>',
      sacral: '<rect x="4" y="4" width="20" height="20" rx="2"/>',
      spleen: '<path d="m3 2 23 20-22 4Z"/>', solar: '<path d="M25 2 2 22l22 4Z"/>',
      root: '<rect x="4" y="4" width="20" height="20" rx="2"/>',
    };
    return `<svg class="tl-center-symbol tl-center-${row.id}" viewBox="0 0 28 28" aria-hidden="true">${shapes[row.id] || ''}</svg>`;
  }

  function renderRows({ sync = true } = {}) {
    const scroll = $('.tl-table').scrollTop;
    const ruler = calendarRuler(windowRange, zone, locale, $('.tl-ticks').clientWidth);
    const dayPosition = cell => `left:${ratioAt(windowRange, cell.dayStart) * 100}%;width:${(cell.dayEnd - cell.dayStart) / span * 100}%`;
    const dayTone = cell => cell.tone ?? (Math.floor(Date.parse(`${cell.date}T00:00:00Z`) / DAY) % 2 + 2) % 2;
    const bands = ruler.cells.map(cell => `<i class="tl-day-band" data-date="${cell.date}" data-tone="${dayTone(cell)}" style="${dayPosition(cell)}" aria-hidden="true"></i>`).join('');
    const grid = ruler.boundaries.map(instant => `<i class="tl-gridline" data-instant="${instant}" style="left:${ratioAt(windowRange, instant) * 100}%" aria-hidden="true"></i>`).join('');
    reconcile($('.tl-ticks'), ruler.cells.map(cell => `<span class="tl-date-cell" data-key="${cell.dayStart}" data-date="${cell.date}" data-granularity="${cell.granularity || 'day'}" data-tone="${dayTone(cell)}" style="${dayPosition(cell)}" title="${esc(cell.title || cell.date)}"><span class="tl-date-label">${cell.showLabel ? esc(cell.label) : ''}</span></span>`).join('')
      + (ruler.labels || []).map(mark => `<span class="tl-hour-label" data-instant="${mark.instant}" style="left:${ratioAt(windowRange, mark.instant) * 100}%">${esc(mark.label)}</span>`).join(''));
    if (!result) { $('.tl-rows').replaceChildren(); return; }
    const kind = $('[data-field="kind"]').value;
    const query = $('[data-field="search"]').value.toLocaleLowerCase(locale).trim();
    const changesOnly = $('[data-field="changes"]').getAttribute('aria-pressed') === 'true';
    const showInactive = $('[data-field="inactive"]').getAttribute('aria-pressed') === 'true';
    const watchOnly = $('[data-field="watch-only"]').getAttribute('aria-pressed') === 'true';
    // Keep the row roster fixed for the completed calculation. Only bars are
    // clipped to the moving viewport, so empty tracks retain their position.
    const rows = result.rows.filter(row => (showInactive || row.intervals.length > 0) && (kind === 'all' || row.kind === kind)
      && (!watchOnly || watchlist.has(row.key))
      && (!query || `${name(row)} ${t(row.kind)}`.toLocaleLowerCase(locale).includes(query))
      && (!changesOnly || row.intervals.some(interval => (interval.start > result.start && interval.start < result.end) || (interval.end > result.start && interval.end < result.end))));
    reconcile($('.tl-rows'), rows.length ? rows.map(row => `<div class="tl-row" data-key="${row.key}">
      <button type="button" class="tl-row-name" data-row="${row.key}" title="${esc(name(row))}" aria-label="${esc(name(row))}">${rowSymbol(row)}</button>
      <div class="tl-track">${bands}${grid}${row.intervals.map((interval, index) => {
        const visible = clipInterval(interval, windowRange);
        if (!visible) return '';
        const title = `${name(row)} · ${t(interval.source)} · ${interval.clippedStart ? t('before') : format(interval.start)} → ${interval.clippedEnd ? t('after') : format(interval.end)}`;
        return `<button type="button" class="tl-bar ${visible.clippedStart ? 'tl-clipped-start' : ''} ${visible.clippedEnd ? 'tl-clipped-end' : ''}" data-source="${interval.source}" data-key="${row.key}" data-interval="${index}" style="left:${ratioAt(windowRange, visible.start) * 100}%;width:${(visible.end - visible.start) / span * 100}%" title="${esc(title)}" aria-label="${esc(title)}"><span>${esc(name(row))}</span></button>`;
      }).join('')}</div></div>`).join('') : `<p class="tl-empty">${esc(t('noRows'))}</p>`);
    $('.tl-table').scrollTop = scroll;
    if (sync) syncClock();
  }

  function renderComparison() {
    const output = $('.tl-compare-output');
    if (compareA == null || compareB == null || !result) {
      output.textContent = `${t('compareHint')} ${compareA == null ? '' : `A: ${format(compareA)}`} ${compareB == null ? '' : `B: ${format(compareB)}`}`.trim();
      return;
    }
    const activeAt = instant => new Set(result.rows.filter(row => intervalAt(row, instant)).map(row => row.key));
    const first = activeAt(compareA), second = activeAt(compareB);
    const labels = new Map(result.rows.map(row => [row.key, name(row)]));
    const added = [...second].filter(key => !first.has(key));
    const removed = [...first].filter(key => !second.has(key));
    output.innerHTML = `<p>A ${esc(format(compareA))} → B ${esc(format(compareB))}</p>
      <p>${esc(t('compareAdded'))} (${added.length}): ${added.length ? added.map(key => esc(labels.get(key))).join(' · ') : esc(t('none'))}</p>
      <p>${esc(t('compareRemoved'))} (${removed.length}): ${removed.length ? removed.map(key => esc(labels.get(key))).join(' · ') : esc(t('none'))}</p>`;
  }

  function updateQueryTargets() {
    const condition = $('[data-field="condition"]').value;
    const target = $('[data-field="query-id"]');
    target.hidden = condition === 'bridge';
    const rows = result?.rows.filter(row => row.kind === condition) || [];
    $('#tl-query-ids').innerHTML = rows.map(row => `<option value="${esc(row.id)}">${esc(name(row))}</option>`).join('');
  }

  function renderQueryResults() {
    const status = $('.tl-query-status');
    const container = $('.tl-query-results');
    status.textContent = queryState ? t(queryState, { count: queryResult?.matches?.length || 0 }) : '';
    if (!queryResult?.matches?.length) { container.replaceChildren(); return; }
    container.innerHTML = `<ol>${queryResult.matches.map((match, index) => {
      const evidence = match.path?.length ? ` · ${t('bridgePath')}: ${match.path.join(' → ')}` : '';
      const row = result?.rows.find(item => item.key === match.key);
      return `<li><button type="button" data-query-match="${index}">${esc(format(match.start))} → ${esc(format(match.end))}${row ? ` · ${esc(name(row))}` : ''}${esc(evidence)}</button></li>`;
    }).join('')}</ol>`;
  }

  async function runConditionQuery() {
    const condition = $('[data-field="condition"]').value;
    const id = $('[data-field="query-id"]').value.trim();
    if (condition === 'bridge' && mode !== 'overlay') { queryState = 'bridgeNeedsOverlay'; renderQueryResults(); return; }
    if (condition === 'line' && !id) { queryState = 'queryNeedsLine'; renderQueryResults(); return; }
    if (condition === 'line' && eventLevel !== 'line') {
      eventLevel = 'line';
      $('[data-field="event-level"]').value = 'line';
      await calculate();
    }
    if (!result || calculating) { queryState = 'queryNeedsTimeline'; renderQueryResults(); return; }
    if (condition !== 'bridge' && id && !result.rows.some(row => row.kind === condition && String(row.id) === id)) {
      queryState = 'queryInvalidTarget'; renderQueryResults(); return;
    }
    const token = ++queryGeneration;
    queryResult = null; queryState = 'queryRunning'; renderQueryResults();
    $('[data-action="cancel-query"]').hidden = false;
    try {
      const found = await queryClient.query({ result, natal: host.identity(chart.chart), condition, id });
      if (token !== queryGeneration || !active) return;
      queryResult = found;
      queryState = found.reason === 'noSplit' ? 'queryNoSplit'
        : found.matches.length ? 'queryFound' : 'queryNotFound';
      renderQueryResults();
    } catch (error) {
      if (token !== queryGeneration) return;
      queryState = error.name === 'AbortError' ? 'queryCancelled' : 'queryError';
      renderQueryResults();
    } finally {
      if (token === queryGeneration) $('[data-action="cancel-query"]').hidden = true;
    }
  }

  const coversTimeline = range => range && range.start === timelineRange.start && range.end === timelineRange.end;
  // A gesture may only explore the completed calculation. It never requests
  // more data. New dates, explicit ranges, people and modes may calculate.
  function moveViewport(range, instant = selected) {
    if (!result || calculating) return false;
    range = clampWindow(range, result);
    const nextSelected = Math.max(range.start, Math.min(range.end - 1000, Math.round(instant / 1000) * 1000));
    const rangeChanged = range.start !== windowRange.start || range.end !== windowRange.end;
    if (!rangeChanged && nextSelected === selected) return false;
    const previousSelected = selected;
    windowRange = range;
    span = range.end - range.start;
    selected = nextSelected;
    $('.tl-time-error').textContent = '';
    $('.tl-fold').hidden = true;
    syncClock();
    if (rangeChanged && !viewFrame) viewFrame = requestAnimationFrame(() => { viewFrame = 0; renderRows(); });
    if (selected !== previousSelected && !frame) frame = requestAnimationFrame(renderMoment);
    return true;
  }

  function panTime(delta) {
    if (!result || calculating) return;
    const next = panTimeline(windowRange, selected, delta, result);
    moveViewport(next.range, next.selected);
  }

  function zoom(factor, anchor = Math.max(0, Math.min(1, ratioAt(windowRange, selected)))) {
    if (!result || calculating) return;
    moveViewport(zoomWindow(windowRange, factor, anchor, { maxSpan: timelineRange.end - timelineRange.start }));
  }

  function renderProgress(value) {
    const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
    setText($('.tl-loading-percent'), `${percent}%`);
    $('.tl-calculation progress').value = percent;
  }

  async function calculate() {
    if (!active || !chart) return;
    queryGeneration++;
    queryClient.cancel();
    queryResult = null; queryState = '';
    compareA = compareB = null;
    renderQueryResults(); renderComparison();
    $('[data-action="cancel-query"]').hidden = true;
    stopDrag();
    const token = ++generation;
    calculating = true;
    result = null;
    closeTiming();
    renderRows();
    syncClock();
    $('.tl-table').setAttribute('aria-busy', 'true');
    $('.tl-calculation').hidden = false;
    $('.tl-calculation').dataset.state = 'loading';
    $('.tl-load-status').textContent = t('loadingTitle');
    renderProgress(0);
    $('[data-action="retry"]').hidden = true;
    $('[data-action="cancel-calculation"]').hidden = false;
    // Presets own the complete calculation; zoom and pan only change windowRange.
    requestedRange = { ...timelineRange };
    try {
      const calculated = await client.calculate({ ...requestedRange, natal: host.identity(chart.chart), mode, eventLevel, planet: planetFilter, ruleVersion: TIMELINE_RULE_VERSION }, progress => {
        if (token === generation) renderProgress(progress);
      });
      if (token !== generation || !active) return;
      result = calculated;
      calculating = false;
      $('.tl-calculation').hidden = true;
      $('[data-action="cancel-calculation"]').hidden = true;
      $('.tl-table').setAttribute('aria-busy', 'false');
      requestedRange = null;
      renderRows();
      updateQueryTargets();

    } catch (error) {
      if (error.name === 'AbortError' || token !== generation) return;
      calculating = false;
      $('.tl-calculation').dataset.state = 'error';
      $('.tl-load-status').textContent = t('error');
      $('.tl-table').setAttribute('aria-busy', 'false');
      $('[data-action="retry"]').hidden = false;
      $('[data-action="cancel-calculation"]').hidden = true;
    }
  }

  function clearTimingState() {
    pendingDetail = null;
    context?.api?.highlightSelection(null);
    root.querySelectorAll('.tl-bar[aria-pressed]').forEach(node => node.removeAttribute('aria-pressed'));
  }

  function closeTiming() {
    if (!pendingDetail) return;
    host.closeDetail();
    clearTimingState();
  }

  // The host calls this for each center, channel or gate, including in-sheet
  // navigation. Timing belongs to that item, never to the previously opened one.
  function decorateDetail(detail, selection) {
    const body = detail.querySelector('.gate-detail-body');
    const label = body?.querySelector('.detail-label');
    const title = body?.querySelector('.detail-name');
    if (!body || !label || !title) return;
    const header = document.createElement('div');
    header.className = 'tl-detail-header';
    const heading = document.createElement('div');
    heading.className = 'tl-detail-heading';
    body.prepend(header);
    heading.append(label, title);
    header.append(heading);

    if (selection.kind === 'gate') {
      const statuses = document.createElement('div');
      statuses.className = 'tl-detail-statuses';
      const sources = document.createElement('div');
      sources.className = 'tl-detail-activations';
      const appendGroup = (group, entries, labelKey) => {
        if (!group) return;
        const status = document.createElement('div');
        status.className = `tl-activation-label${labelKey === 'transitPlanets' ? ' tl-activation-transit' : ''}`;
        status.textContent = t(labelKey);
        statuses.append(status);
        // Preserve the host's complete activation text, including each line name.
        // Reuse its spans so future details/localization aren't silently discarded.
        const rows = [...group.querySelectorAll(':scope > span')];
        rows.forEach((node, index) => {
          const entry = entries[index];
          node.classList.add('tl-activation-row');
          if (!entry) return;
          const [planet, activation, side] = entry;
          node.dataset.activationSide = side;
          node.dataset.activationPlanet = planet;
          node.dataset.activationValue = `${activation.gate}.${activation.line}`;
          if (side === 'transit') node.classList.add('tl-activation-transit');
        });
        group.replaceChildren(...rows);
        group.classList.add('tl-detail-source');
        sources.append(group);
      };
      const natal = body.querySelector('.gate-detail-acts');
      const natalEntries = ['design', 'personality'].flatMap(side => Object.entries(chart.chart.gates[side] || {})
        .filter(([, value]) => value?.gate === Number(selection.id)).map(([planet, value]) => [planet, value, side]));
      appendGroup(natal, natalEntries, 'birthPlanets');
      const inactive = body.querySelector('.gate-detail-inactive');
      if (inactive) statuses.append(inactive);
      const transit = body.querySelector('.gate-detail-transits');
      const transitEntries = Object.entries(context?.transitGates || {})
        .filter(([, value]) => value?.gate === Number(selection.id)).map(([planet, value]) => [planet, value, 'transit']);
      if (transitEntries.length) appendGroup(transit, transitEntries, 'transitPlanets');
      else if (transit) {
        transit.querySelector('.detail-label')?.remove();
        transit.className = 'gate-detail-inactive tl-activation-transit';
        statuses.append(transit);
      }
      heading.append(statuses);
      if (sources.childElementCount) header.after(sources);
    } else {
      const summary = selection.kind === 'center' ? '.lens-note, .center-detail-head' : '.transit-source-badge';
      [...body.children].filter(node => node.matches(summary)).forEach(node => heading.append(node));
    }

    const pendingRow = pendingDetail?.row;
    const pendingMatches = pendingRow && (pendingRow.kind === selection.kind && String(pendingRow.id) === String(selection.id)
      || pendingRow.kind === 'line' && selection.kind === 'gate' && pendingRow.gate === Number(selection.id));
    const row = pendingMatches ? pendingRow
      : result?.rows.find(item => item.kind === selection.kind && String(item.id) === String(selection.id));
    if (row?.kind === 'line') label.textContent += ` · ${t('line')} ${row.line}`;
    if (row) {
      const watch = document.createElement('button');
      watch.type = 'button'; watch.className = 'tl-detail-watch';
      const updateWatch = () => {
        const selected = watchlist.has(row.key);
        watch.textContent = selected ? '★' : '☆';
        watch.title = t(selected ? 'unwatch' : 'watch');
        watch.setAttribute('aria-label', watch.title);
        watch.setAttribute('aria-pressed', String(selected));
      };
      updateWatch();
      watch.addEventListener('click', () => {
        if (watchlist.has(row.key)) watchlist.delete(row.key);
        else watchlist.add(row.key);
        saveWatchlist(); updateWatch(); renderRows();
      });
      heading.append(watch);
    }
    const interval = row && (pendingMatches && !pendingDetail.follow
      ? pendingDetail.interval : intervalAt(row, selected));
    // A followed item can become inactive. Keep its small inspector usable so
    // the reader can switch back to a fixed, full-size detail at any moment.
    if (!interval || interval.source === 'natal') {
      if (pendingMatches && pendingDetail.follow) {
        header.classList.add('tl-detail-has-timing');
        const inactive = document.createElement('aside');
        inactive.className = 'tl-detail-timing';
        inactive.textContent = t(interval ? 'natal' : 'inactiveAtTime');
        const fixed = document.createElement('button');
        fixed.type = 'button'; fixed.className = 'tl-detail-follow';
        fixed.textContent = t('followTime'); fixed.setAttribute('aria-pressed', 'true');
        fixed.addEventListener('click', () => {
          pendingDetail.follow = false;
          host.setDetailModal?.(detail, true);
          fixed.textContent = t('fixedTime');
          fixed.setAttribute('aria-pressed', 'false');
        });
        inactive.append(fixed); header.append(inactive);
      }
      return;
    }
    header.classList.add('tl-detail-has-timing');
    const timing = document.createElement('aside');
    timing.className = 'tl-detail-timing';
    timing.dataset.kind = row.kind;
    timing.dataset.id = row.id;
    timing.setAttribute('aria-label', t('timingDetails'));
    timing.innerHTML = `<div class="tl-timing-source" title="${esc(t(interval.source))}">${esc(t('timingShort'))}<span title="${esc(t('estimated'))} ${esc(t('sampling'))}" aria-label="${esc(t('estimated'))}">≈</span></div>
      <dl class="tl-timing-values"><div class="tl-timing-duration"><dt title="${esc(t('duration'))}">${esc(t('durationShort'))}</dt><dd>${esc(formatDuration(interval.end - interval.start, t))}</dd></div>
      <div class="tl-timing-boundary"><dt>${esc(t('start'))}</dt><dd title="${esc(interval.clippedStart ? t('before') : `${t('start')}: ${format(interval.start)}`)}">${esc(interval.clippedStart ? t('beforeShort') : format(interval.start, true))}</dd></div>
      <div class="tl-timing-boundary"><dt>${esc(t('end'))}</dt><dd title="${esc(interval.clippedEnd ? t('after') : `${t('end')}: ${format(interval.end)}`)}">${esc(interval.clippedEnd ? t('afterShort') : format(interval.end, true))}</dd></div></dl>`;
    if (pendingMatches) {
      const follow = document.createElement('button');
      follow.type = 'button';
      follow.className = 'tl-detail-follow';
      follow.textContent = t(pendingDetail.follow ? 'followTime' : 'fixedTime');
      follow.setAttribute('aria-pressed', String(pendingDetail.follow));
      follow.addEventListener('click', () => {
        pendingDetail.follow = !pendingDetail.follow;
        host.setDetailModal?.(detail, !pendingDetail.follow);
        follow.textContent = t(pendingDetail.follow ? 'followTime' : 'fixedTime');
        follow.setAttribute('aria-pressed', String(pendingDetail.follow));
        if (pendingDetail.follow) host.refreshDetail?.(context);
      });
      timing.append(follow);
    }
    const relevantGate = event => row.kind === 'line' || row.kind === 'gate'
      ? Number(event.from.gate) === Number(row.gate || row.id) || Number(event.to.gate) === Number(row.gate || row.id)
      : row.kind === 'channel' && row.id.split('-').some(gate => Number(gate) === event.from.gate || Number(gate) === event.to.gate);
    const sourceEvents = (result?.sourceEvents || []).filter(event => event.time >= interval.start && event.time <= interval.end && relevantGate(event));
    if (sourceEvents.length) {
      const provenance = document.createElement('div');
      provenance.className = 'tl-detail-provenance';
      const visible = sourceEvents.slice(0, 8);
      provenance.innerHTML = `<strong>${esc(t('sourceEvents'))} (${sourceEvents.length})</strong><ul>${visible.map(event => {
        const planet = host.planets.find(item => item.id === event.planet)?.name || event.planet;
        return `<li>${esc(format(event.time, true))} · ${esc(planet)} · ${esc(event.from.gate == null ? '—' : `${event.from.gate}.${event.from.line}`)} → ${esc(event.to.gate == null ? '—' : `${event.to.gate}.${event.to.line}`)}</li>`;
      }).join('')}</ul>${sourceEvents.length > visible.length ? `<small>${esc(t('moreSourceEvents', { count: sourceEvents.length - visible.length }))}</small>` : ''}`;
      timing.append(provenance);
    }
    if (row.kind === 'line') {
      const rule = LINE_FIXING_PLANETS[row.id];
      const ruleNode = document.createElement('p');
      ruleNode.className = 'tl-detail-rule';
      const planets = ids => ids.length ? ids.map(id => host.planets.find(item => item.id === id)?.name || id).join(', ') : '—';
      ruleNode.textContent = rule
        ? `${t('lineRule')}: ${t('fixing_exalted')} ${planets(rule.exalted)} · ${t('fixing_detriment')} ${planets(rule.detriment)}`
        : `${t('lineRule')}: ${t('fixing_unknown')}`;
      timing.append(ruleNode);
      const source = document.createElement('a');
      source.href = 'https://github.com/CReizner/SharpAstrology.HumanDesign/blob/5d95ece57098fd776df7f2362722c1392a6f06b6/Utility/HumanDesignUtility.cs';
      source.target = '_blank'; source.rel = 'noopener noreferrer';
      source.textContent = `${t('ruleSource')} ↗`;
      timing.append(source);
    }
    header.append(timing);
  }

  function openTiming(row, interval, index) {
    // Show chart details at a moment inside the clicked interval, so its status
    // and planet activations agree with the timing labels in the same sheet.
    host.closeDetail(); closeTiming();
    if (selected < interval.start || selected >= interval.end) {
      selectTime(Math.max(interval.start, windowRange.start));
    }
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    renderMoment();
    pendingDetail = { row, interval, follow: false };
    root.querySelector(`.tl-bar[data-key="${row.key}"][data-interval="${index}"]`)?.setAttribute('aria-pressed', 'true');
    host.showDetail(row.kind, row.id, context);
  }

  function clockChanged() {
    try {
      const zoneValue = $('[data-field="zone"]').value.trim();
      const matches = host.resolveTime($('[data-field="date"]').value, $('[data-field="time"]').value, zoneValue);
      if (!matches.length) throw new Error('gap');
      zone = zoneValue;
      if (matches.length > 1) {
        $('.tl-fold').hidden = false;
        $('[data-field="fold"]').innerHTML = `<option value="">${esc(t('chooseOffset'))}</option>` + matches.map(match => `<option value="${match.instant}">${esc(host.formatOffset(match.offset))}</option>`).join('');
        $('.tl-time-error').textContent = t('fold');
        return;
      }
      selectTime(matches[0].instant, { recenter: true });
    } catch (error) {
      $('.tl-time-error').textContent = t(error.message === 'gap' ? 'gap' : 'invalid');
      $('.tl-fold').hidden = true;
    }
  }

  listen($('[data-field="date"]'), 'change', clockChanged);
  listen($('[data-field="time"]'), 'change', clockChanged);
  listen($('[data-field="fold"]'), 'change', event => {
    if (event.target.value) selectTime(Number(event.target.value), { recenter: true });
  });
  listen($('[data-field="zone"]'), 'change', () => {
    try {
      const candidate = $('[data-field="zone"]').value.trim();
      wallTime(selected, candidate); // Validate before changing the working zone.
      const zoneChanged = zone !== candidate;
      zone = candidate;
      if (zoneChanged && preset !== '1') {
        // Calendar days and anniversaries belong to the chosen zone, not to the
        // current zoomed viewport or cursor position reached while exploring it.
        const wasFullRange = windowRange.start === timelineRange.start && windowRange.end === timelineRange.end;
        timelineRange = boundRange(presetWindow(rangeAnchor, preset, zone, host.resolveTime));
        windowRange = wasFullRange ? { ...timelineRange } : clampWindow(windowRange, timelineRange);
        span = windowRange.end - windowRange.start;
        selected = Math.max(windowRange.start, Math.min(windowRange.end - 1000, selected));
        calculate();
        renderMoment();
      }
      $('.tl-fold').hidden = true;
      $('.tl-time-error').textContent = '';
      syncClock(); renderRows();
      if (pendingDetail) openTiming(pendingDetail.row, pendingDetail.interval, pendingDetail.row.intervals.indexOf(pendingDetail.interval));
    } catch { $('.tl-time-error').textContent = t('invalid'); }
  });
  listen($('[data-field="span"]'), 'change', event => {
    if (!rangeOptions.some(([value]) => value === event.target.value)) return;
    preset = event.target.value;
    selectTime(selected, { recenter: true });
  });
  listen($('[data-field="mode"]'), 'change', event => {
    mode = event.target.value;
    host.closeDetail(); calculate(); renderMoment();
  });
  listen($('[data-field="planet"]'), 'change', event => {
    if (event.target.value !== 'all' && !host.planets.some(planet => planet.id === event.target.value)) return;
    planetFilter = event.target.value;
    host.closeDetail(); calculate(); renderMoment();
  });
  listen($('[data-field="event-level"]'), 'change', event => {
    if (!['gate', 'line'].includes(event.target.value)) return;
    eventLevel = event.target.value;
    if (eventLevel === 'gate' && $('[data-field="kind"]').value === 'line') $('[data-field="kind"]').value = 'all';
    host.closeDetail(); calculate();
  });
  listen($('[data-field="kind"]'), 'input', event => {
    if (event.target.value === 'line' && eventLevel !== 'line') {
      eventLevel = 'line';
      $('[data-field="event-level"]').value = 'line';
      host.closeDetail(); calculate();
    } else { closeTiming(); renderRows(); }
  });
  listen($('[data-field="search"]'), 'input', () => { closeTiming(); renderRows(); });
  listen($('[data-field="condition"]'), 'change', () => {
    $('[data-field="query-id"]').value = '';
    updateQueryTargets();
  });
  listen($('[data-field="query-id"]'), 'keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); runConditionQuery(); }
  });
  listen($('.tl-table'), 'keydown', event => {
    if (event.target !== $('.tl-table')) return;
    const direction = ['ArrowRight','ArrowUp'].includes(event.key) ? 1 : ['ArrowLeft','ArrowDown'].includes(event.key) ? -1 : 0;
    if (direction) {
      event.preventDefault();
      selectTime(selected + direction * MINUTE * (event.shiftKey ? 60 : 1));
    } else if (['+','=','-','_'].includes(event.key)) {
      event.preventDefault(); zoom(['+','='].includes(event.key) ? 2 : .5);
    }
  });
  listen($('.tl-table'), 'wheel', event => {
    const rect = $('.tl-ticks').getBoundingClientRect();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.width : 1;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      zoom(Math.exp(-Math.max(-100, Math.min(100, event.deltaY * unit)) * .012), Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
    } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
      event.preventDefault();
      const pixels = (event.deltaX || event.deltaY) * unit;
      panTime(pixels / rect.width * span);
    }
  }, { passive: false });
  // WebKit exposes trackpad pinches as gesture events instead of ctrl+wheel.
  listen($('.tl-table'), 'gesturestart', event => { event.preventDefault(); gestureScale = 1; });
  listen($('.tl-table'), 'gesturechange', event => {
    event.preventDefault();
    if (event.scale > 0) {
      const rect = $('.tl-ticks').getBoundingClientRect();
      zoom(event.scale / gestureScale, Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
      gestureScale = event.scale;
    }
  });
  listen($('.tl-table'), 'gestureend', event => event.preventDefault());
  listen($('.tl-table'), 'selectstart', event => {
    if (event.target.closest('.tl-track')) event.preventDefault();
  });

  listen(root, 'click', event => {
    if (suppressClick) { suppressClick = false; event.preventDefault(); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'mobile-exit') { showMobileControls(false); host.onExit?.(); return; }
    if (action === 'mobile-controls') { showMobileControls(controlPanel.hidden); return; }
    if (!controlPanel.hidden && !controlPanel.contains(event.target)) showMobileControls(false);
    if (action === 'now') selectTime(Date.now(), { recenter: true });
    if (action === 'set-a') { compareA = selected; renderComparison(); }
    if (action === 'set-b') { compareB = selected; renderComparison(); }
    if (action === 'clear-ab') { compareA = compareB = null; renderComparison(); }
    if (action === 'run-query') runConditionQuery();
    if (action === 'cancel-query') {
      queryGeneration++;
      queryClient.cancel();
      queryState = 'queryCancelled';
      $('[data-action="cancel-query"]').hidden = true;
      renderQueryResults();
    }
    if (action === 'prev-event' || action === 'next-event') {
      const instant = result && adjacentEvent(result.events, selected, action === 'next-event' ? 1 : -1);
      if (instant != null) selectTime(instant);
      else $('.tl-event-status').textContent = t('noEventInRange');
    }
    if (action === 'changes') {
      const toggle = $('[data-field="changes"]');
      toggle.setAttribute('aria-pressed', String(toggle.getAttribute('aria-pressed') !== 'true'));
      closeTiming(); renderRows();
    }
    if (action === 'inactive') {
      const toggle = $('[data-field="inactive"]');
      toggle.setAttribute('aria-pressed', String(toggle.getAttribute('aria-pressed') !== 'true'));
      closeTiming(); renderRows();
    }
    if (action === 'watch-only') {
      const toggle = $('[data-field="watch-only"]');
      toggle.setAttribute('aria-pressed', String(toggle.getAttribute('aria-pressed') !== 'true'));
      closeTiming(); renderRows();
    }
    const matchButton = event.target.closest('[data-query-match]');
    if (matchButton && queryResult && result) {
      const match = queryResult.matches[Number(matchButton.dataset.queryMatch)];
      if (match) {
        selectTime(Math.max(result.start, Math.min(result.end - 1000, match.start)));
        if (match.key) {
          const row = result.rows.find(item => item.key === match.key);
          const index = row?.intervals.findIndex(interval => interval.start <= match.start && match.start < interval.end);
          if (index >= 0) openTiming(row, row.intervals[index], index);
        }
        if (mobileLayout.matches) showMobileControls(false);
      }
    }
    if (action === 'retry') calculate();
    if (action === 'cancel-calculation') {
      generation++;
      client.cancel();
      calculating = false;
      requestedRange = null;
      $('.tl-calculation').hidden = true;
      $('.tl-table').setAttribute('aria-busy', 'false');
    }
    const bar = event.target.closest('[data-interval]');
    if (bar && result) {
      const row = result.rows.find(item => item.key === bar.dataset.key);
      openTiming(row, row.intervals[Number(bar.dataset.interval)], Number(bar.dataset.interval));
    }
    const rowButton = event.target.closest('[data-row]');
    if (rowButton && context) {
      const row = result?.rows.find(item => item.key === rowButton.dataset.row);
      if (row) {
        pendingDetail = { row, interval: intervalAt(row, selected), follow: false };
        host.showDetail(row.kind, row.id, context);
      }
    }
    const planet = event.target.closest('[data-planet], [data-birth-planet]');
    if (planet?.dataset.gate && context) host.showDetail('gate', Number(planet.dataset.gate), context);
  });

  let lastInput = 'pointer';
  listen(root, 'pointerdown', event => {
    lastInput = event.pointerType;
    if (lastInput === 'touch' && hoverSelection) {
      hoverSelection = null;
      context?.api?.highlightSelection(null);
    }
  });
  listen(root, 'keydown', event => {
    lastInput = 'keyboard';
    if (event.key === 'Escape') showMobileControls(false);
  });
  const preview = event => {
    if (event.pointerType === 'touch' || (event.type === 'focusin' && lastInput === 'touch')) return;
    const rowNode = event.target.closest('[data-row], [data-interval]');
    const row = rowNode && result?.rows.find(item => item.key === (rowNode.dataset.row || rowNode.dataset.key));
    if (row) {
      hoverSelection = { kind: row.kind, id: row.id };
      context?.api?.highlightSelection(hoverSelection);
    }
    const planet = event.target.closest('[data-planet], [data-birth-planet]');
    if (planet?.dataset.gate) {
      hoverSelection = { kind: 'gate', id: Number(planet.dataset.gate) };
      context?.api?.highlightSelection(hoverSelection);
    }
  };
  listen(root, 'pointerover', preview);
  listen(root, 'focusin', preview);
  const clear = event => {
    const target = event.target.closest('[data-row], [data-interval], [data-planet], [data-birth-planet]');
    if (target && !target.contains(event.relatedTarget)) {
      hoverSelection = null;
      context?.api?.highlightSelection(null);
    }
  };
  listen(root, 'pointerout', clear);
  listen(root, 'focusout', clear);

  function stopDrag() {
    if (edgeFrame) cancelAnimationFrame(edgeFrame);
    edgeFrame = 0;
    const previous = drag;
    drag = null;
    const table = $('.tl-table');
    if (previous && table.hasPointerCapture(previous.id)) table.releasePointerCapture(previous.id);
  }

  function dragRatio() {
    const rect = $('.tl-ticks').getBoundingClientRect();
    return Math.max(0, Math.min(1, (drag.clientX - rect.left) / rect.width));
  }

  function selectPointerTime() {
    selectTime(Math.min(windowRange.end - 1000, instantAt(windowRange, dragRatio())));
  }

  function edgeSpeed() {
    const rect = $('.tl-ticks').getBoundingClientRect();
    const edge = Math.min(32, rect.width * .08);
    const x = drag.clientX - rect.left;
    if (x < edge) return -Math.min(1, (edge - x) / edge);
    if (x > rect.width - edge) return Math.min(1, (x - rect.width + edge) / edge);
    return 0;
  }

  function panDragEdge(now) {
    edgeFrame = 0;
    if (!drag?.moved || !active || !result || calculating) return;
    const speed = edgeSpeed();
    if (!speed) return;
    if ((speed < 0 && windowRange.start <= result.start) ||
        (speed > 0 && windowRange.end >= result.end)) return;
    const elapsed = Math.min(50, now - drag.lastPan);
    drag.lastPan = now;
    const delta = speed * span * .3 * elapsed / 1000 + drag.panRemainder;
    const requested = panWindow(windowRange, delta);
    drag.panRemainder = delta - (requested.start - windowRange.start);
    const next = clampWindow(requested, result);
    // Keep the selected time under the held pointer as the date grid pans.
    moveViewport(next, instantAt(next, dragRatio()));
    edgeFrame = requestAnimationFrame(panDragEdge);
  }

  // Capture on the stable table: its rows are replaced while auto-panning.
  // On phones, lock the first touch direction for the whole gesture. Native
  // pan-y can otherwise claim a diagonal swipe after time panning has begun.
  listen($('.tl-table'), 'pointerdown', event => {
    if (!event.target.closest('.tl-track') || event.button !== 0 || !result || calculating) return;
    stopDrag();
    suppressClick = false;
    drag = { id: event.pointerId, pointerType: event.pointerType, x: event.clientX, y: event.clientY,
      clientX: event.clientX, clientY: event.clientY, axis: null,
      moved: false, bar: event.target.closest('.tl-bar'), lastPan: 0 };
  });
  listen($('.tl-table'), 'pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.pointerType === 'touch' && mobileLayout.matches) {
      const table = $('.tl-table');
      if (!drag.axis) {
        const dx = Math.abs(event.clientX - drag.x), dy = Math.abs(event.clientY - drag.y);
        if (Math.max(dx, dy) < 5) return;
        drag.axis = dx >= dy * .65 ? 'horizontal' : 'vertical';
        table.setPointerCapture(event.pointerId);
        drag.moved = true;
      }
      if (drag.axis === 'vertical') {
        table.scrollTop += drag.clientY - event.clientY;
        drag.clientY = event.clientY;
        return;
      }
      const width = $('.tl-ticks').getBoundingClientRect().width;
      if (width) panTime((drag.clientX - event.clientX) / width * span);
      drag.clientX = event.clientX;
      return;
    }
    if (!drag.moved && Math.abs(event.clientY - drag.y) > Math.abs(event.clientX - drag.x) + 5) { stopDrag(); return; }
    if (!drag.moved && Math.abs(event.clientX - drag.x) < 5) return;
    if (!drag.moved) $('.tl-table').setPointerCapture(event.pointerId);
    drag.moved = true;
    if (drag.pointerType === 'touch') {
      // A finger swipe pans the time window, like horizontal trackpad scrolling.
      // Mouse dragging keeps its existing pointer-to-time scrubbing behavior.
      const width = $('.tl-ticks').getBoundingClientRect().width;
      if (width) panTime((drag.clientX - event.clientX) / width * span);
      drag.clientX = event.clientX;
      return;
    }
    drag.clientX = event.clientX;
    selectPointerTime();
    if (edgeSpeed() && !edgeFrame) {
      drag.lastPan = performance.now();
      drag.panRemainder = 0;
      edgeFrame = requestAnimationFrame(panDragEdge);
    } else if (!edgeSpeed() && edgeFrame) {
      cancelAnimationFrame(edgeFrame); edgeFrame = 0;
    }
  });
  listen($('.tl-table'), 'pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    suppressClick = drag.moved;
    clearTimeout(clickReset);
    clickReset = setTimeout(() => { suppressClick = false; }, 0);
    drag.clientX = event.clientX;
    if ((drag.moved && drag.pointerType !== 'touch') || (!drag.moved && !drag.bar)) selectPointerTime();
    stopDrag();
  });
  listen($('.tl-table'), 'pointercancel', () => { stopDrag(); suppressClick = false; });
  listen($('.tl-table'), 'lostpointercapture', event => {
    // Touch pointers are implicitly captured by the touched track first.
    // Transferring capture to the table bubbles a loss event from that track.
    if (event.target === $('.tl-table') && drag?.id === event.pointerId) stopDrag();
  });
  listen(window, 'blur', stopDrag);
  listen(document, 'visibilitychange', () => { if (document.hidden) stopDrag(); });

  let rulerWidth = 0;
  const sizing = new ResizeObserver(() => {
    const width = $('.tl-ticks').clientWidth;
    if (width === rulerWidth) return;
    rulerWidth = width;
    // Layout changes (including translated labels) must not commit form drafts.
    if (active && width > 0 && !viewFrame) viewFrame = requestAnimationFrame(() => { viewFrame = 0; renderRows({ sync: false }); });
  });
  sizing.observe($('.tl-table'));

  function deactivate() {
    active = false;
    $('.tl-calculation').hidden = true;
    generation++;
    client.cancel();
    queryGeneration++;
    queryClient.cancel();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (viewFrame) cancelAnimationFrame(viewFrame);
    viewFrame = 0;
    requestedRange = null;
    closeTiming();
    stopDrag();
    clearTimeout(clickReset);
    suppressClick = false;
    calculating = false;
  }

  function setLanguage({ messages: nextMessages, locale: nextLocale, label: nextLabel } = {}) {
    const previous = t;
    const timeError = $('.tl-time-error').textContent;
    const loadStatus = $('.tl-load-status').textContent;
    const eventStatus = $('.tl-event-status').textContent;
    t = translator(nextMessages);
    if (nextLocale) locale = nextLocale;
    if (nextLabel !== undefined) labeler = nextLabel;
    name = labeler || (row => row.kind === 'center' ? row.name
      : row.kind === 'channel' ? `${row.id} · ${row.name}` : `${t('gate')} ${row.id} · ${row.name}`);

    const put = (selector, key) => setText($(selector), t(key));
    const attr = (selector, attribute, key) => $(selector).setAttribute(attribute, t(key));
    const fieldLabel = (field, key) => {
      const node = $(`[data-field="${field}"]`).parentElement.firstChild;
      if (node.nodeType === Node.TEXT_NODE) node.textContent = t(key);
    };
    put('.tl-empty-state', 'empty');
    put('.tl-heading h2', 'title');
    if (chart) setText($('.tl-person'), chart.birth.name || t('person'));
    for (const [field, key] of [['date','date'], ['time','time'], ['zone','zone'], ['mode','mode'], ['planet','planetFilter']]) fieldLabel(field, key);
    for (const [action, key] of [['now','now'], ['retry','retry'], ['cancel-calculation','cancelCalculation']]) {
      const button = $(`[data-action="${action}"]`);
      setText(button, t(key));
      button.title = t(key);
      button.setAttribute('aria-label', t(key));
    }
    for (const [action, key] of [['prev-event','previous'], ['next-event','next']]) {
      const button = $(`[data-action="${action}"]`);
      button.title = t(key); button.setAttribute('aria-label', t(key));
    }
    if (eventStatus === previous('noEventInRange')) put('.tl-event-status', 'noEventInRange');
    put('.tl-analysis summary', 'analysis');
    put('.tl-compare-controls strong', 'compareTitle');
    put('.tl-query-controls strong', 'conditionSearch');
    for (const [action, key] of [['set-a','setA'], ['set-b','setB'], ['clear-ab','clearAB'],
      ['run-query','runQuery'], ['cancel-query','cancelQuery']]) {
      const node = $(`[data-action="${action}"]`);
      setText(node, t(key)); node.title = t(key); node.setAttribute('aria-label', t(key));
    }
    attr('[data-field="condition"]', 'aria-label', 'conditionSearch');
    for (const [value, key] of [['channel','queryChannel'], ['center','queryCenter'],
      ['line','queryLine'], ['bridge','queryBridge']])
      setText($(`[data-field="condition"] option[value="${value}"]`), t(key));
    attr('[data-field="query-id"]', 'placeholder', 'queryTarget');
    attr('[data-field="query-id"]', 'aria-label', 'queryTarget');
    renderComparison(); renderQueryResults(); updateQueryTargets();
    for (const [value, key] of [['overlay','overlay'], ['transit-only','sky']])
      setText($(`[data-field="mode"] option[value="${value}"]`), t(key));
    setText($('[data-field="planet"] option[value="all"]'), t('allPlanets'));
    for (const planet of host.planets) setText($(`[data-field="planet"] option[value="${planet.id}"]`), planet.name);
    const foldLabel = $('.tl-fold').firstChild;
    if (foldLabel.nodeType === Node.TEXT_NODE) foldLabel.textContent = t('chooseOffset');
    const foldPlaceholder = $('[data-field="fold"] option[value=""]');
    if (foldPlaceholder) setText(foldPlaceholder, t('chooseOffset'));
    if (timeError) {
      const key = ['fold','gap','invalid'].find(candidate => timeError === previous(candidate));
      if (key) put('.tl-time-error', key);
    }
    attr('.tl-moment', 'aria-label', 'selected');
    put('.tl-legend-disclosure summary', 'legend');
    for (const source of ['natal','transit','completed','both']) {
      const item = $(`.tl-legend [data-source="${source}"]`);
      item.lastChild.textContent = t(source);
    }
    put('.tl-transit-column .bg-planets-head', 'transit');
    put('.tl-birth-head .bg-planets-design .bg-planets-head', 'design');
    put('.tl-birth-head .bg-planets-personality .bg-planets-head', 'personality');
    $('.tl-birth-head').classList.toggle('tl-birth-head-en', locale.startsWith('en'));
    attr('.tl-tracks-panel', 'aria-label', 'tracks');
    attr('.tl-table', 'aria-label', 'scrub');
    attr('.tl-table', 'title', 'timelineHelp');
    put('.tl-kind .tl-sr-only', 'filter');
    for (const attribute of ['aria-label','title']) {
      attr('[data-field="kind"]', attribute, 'filter');
      attr('[data-field="search"]', attribute, 'search');
      attr('[data-field="event-level"]', attribute, 'eventLevel');
      attr('[data-field="span"]', attribute, 'zoom');
      attr('[data-field="changes"]', attribute, 'onlyChanges');
      attr('[data-field="inactive"]', attribute, 'showInactive');
      attr('[data-field="watch-only"]', attribute, 'watchOnly');
    }
    attr('[data-field="search"]', 'placeholder', 'searchShort');
    for (const [value, key] of [['all','all'], ['center','centersShort'], ['channel','channels'], ['gate','gates'], ['line','lines']])
      setText($(`[data-field="kind"] option[value="${value}"]`), t(key));
    for (const [value, key] of [['gate','gateLevel'], ['line','lineLevel']])
      setText($(`[data-field="event-level"] option[value="${value}"]`), t(key));
    for (const [value, key] of rangeOptions)
      setText($(`[data-field="span"] option[value="${value}"]`), t(key));
    put('.tl-changes span', 'changesShort');
    put('.tl-compact-controls [data-field="inactive"] span', 'inactiveShort');
    for (const action of ['mobile-controls','mobile-exit']) {
      const key = action === 'mobile-controls' ? 'mobileControls' : 'backToChart';
      const node = $(`[data-action="${action}"]`);
      node.setAttribute('aria-label', t(key));
      node.title = t(key);
    }
    put('#tl-gesture-help', 'gestures');
    attr('.tl-calculation progress', 'aria-label', 'loadingTitle');
    put('.tl-loading-note', 'loadingHint');
    if (loadStatus) put('.tl-load-status', $('.tl-calculation').dataset.state === 'error' ? 'error' : 'loadingTitle');

    // Only display data is rebuilt. Keep the form drafts, fold choice, worker
    // result, viewport, filters, selection, and calculation lifecycle intact.
    const wall = wallTime(selected, zone);
    setText($('.tl-moment-date'), wall.date);
    const offset = new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: 'shortOffset' })
      .formatToParts(selected).find(part => part.type === 'timeZoneName')?.value || zone;
    setText($('.tl-moment-time'), `${wall.time} ${offset}`);
    $('.tl-moment').title = format(selected);
    if (viewFrame) { cancelAnimationFrame(viewFrame); viewFrame = 0; }
    // A hidden timeline has no ruler width; activate() will draw it on entry.
    if ($('.tl-ticks').clientWidth > 0) renderRows({ sync: false });
    graphKey = '';
    if (active && chart) {
      const focusedGraphItem = $('.tl-graph').contains(document.activeElement)
        ? document.activeElement.closest('.bg-gate[data-gate], .bg-center[data-center]') : null;
      const focusedKey = focusedGraphItem?.dataset.gate != null ? ['gate', focusedGraphItem.dataset.gate]
        : focusedGraphItem?.dataset.center != null ? ['center', focusedGraphItem.dataset.center] : null;
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      renderMoment();
      if (focusedKey) {
        const [kind, id] = focusedKey;
        [...$('.tl-graph').querySelectorAll(kind === 'gate' ? '.bg-gate[data-gate]' : '.bg-center[data-center]')]
          .find(node => node.dataset[kind] === id)?.focus({ preventScroll: true });
      }
      host.refreshDetail?.(context);
    }
  }

  return {
    activate() {
      chart = host.getChart();
      if (!chart) {
        deactivate();
        result = null; context = null; identity = '';
        host.closeDetail();
        root.classList.add('tl-no-chart');
        return;
      }
      root.classList.remove('tl-no-chart');
      active = true;
      const nextIdentity = JSON.stringify(host.identity(chart.chart));
      if (nextIdentity !== identity) {
        generation++;
        client.cancel(); calculating = false;
        result = null; identity = nextIdentity; closeTiming();
      }
      $('.tl-person').textContent = chart.birth.name || t('person');
      syncClock(); renderMoment();
      if (!coversTimeline(result) && !calculating) calculate();
      else { $('.tl-table').setAttribute('aria-busy', 'false'); renderRows(); }
    },
    deactivate,
    refresh() { if (active) renderMoment(); },
    observationContext() {
      if (!active || !chart) return null;
      const all = snapshotInstant === selected && snapshotActivations ? snapshotActivations : host.snapshot(selected);
      const activations = planetFilter === 'all' ? all : { [planetFilter]: all[planetFilter] };
      const model = host.buildModel(chart.chart, activations, mode);
      return {
        instantUtc: new Date(selected).toISOString(), displayZone: zone, mode, planetFilter,
        activations: Object.fromEntries(Object.entries(activations).filter(([, value]) => value?.gate && value?.line)
          .map(([planet, value]) => [planet, { gate: value.gate, line: value.line }])),
        activeGates: [...model.activeGates].map(String).sort((a, b) => Number(a) - Number(b)),
        activeChannels: model.channels.map(channel => channel.gates.join('-')).sort(),
        definedCenters: [...model.definedCenters].sort()
      };
    },
    setLanguage,
    destroy() { deactivate(); client.dispose(); queryClient.dispose(); sizing.disconnect(); events.abort(); root.replaceChildren(); root.classList.remove('tl', 'tl-no-chart'); }
  };
}
