import { DAY, MINUTE, centeredWindow, intervalAt } from './core.js';
import { translator } from './messages.js';
import { displayTime, wallTime, formatDuration } from './time.js';
import { calendarRuler } from './ruler.js';
import { RANGE_OPTIONS, presetWindow } from './presets.js';
import { createTimelineClient } from './client.js';
import { queryTimeline } from './conditions.js';
import { natalIslands } from './bridge.js';
import { catalog } from './provider.js';
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
            value += ['tl-row-active', 'tl-row-lit', 'tl-row-hover'].filter(name => node.classList.contains(name)).map(name => ` ${name}`).join('');
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
  const events = new AbortController();
  let selected = Math.floor(Date.now() / 1000) * 1000;
  let preset = '7';
  let rangeAnchor = selected;
  let zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  let timelineRange = presetWindow(selected, preset, zone, host.resolveTime);
  let span = timelineRange.end - timelineRange.start;
  let windowRange = { ...timelineRange };
  let mode = 'overlay';
  let planet = 'all';
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
  const expandedGates = new Set();
  let navigationTimer = 0;
  let navigationGeneration = 0;
  let navigationGates = new Set();
  let queryResult = null;
  let queryConditions = null;
  let queryIndex = -1;
  let boundsZone = '';
  let limits;
  const $ = selector => root.querySelector(selector);
  const listen = (node, type, fn, options = {}) => node.addEventListener(type, fn, { ...options, signal: events.signal });
  const format = (instant, compact = false) => displayTime(instant, zone, locale, compact);
  const button = (action, text, title = text) => `<button type="button" data-action="${action}" title="${esc(title)}" aria-label="${esc(title)}">${esc(text)}</button>`;
  const targetCatalog = catalog();
  const targetChoices = kind => targetCatalog.filter(item => item.kind === kind);
  const targetLabel = item => item.kind === 'line' ? `${item.id} · ${item.name}` : name(item);
  const targetSearchText = item => `${item.id} ${item.name} ${targetLabel(item)} ${item.kind === 'channel' ? item.id.split('-').reverse().join('-') : ''}`
    .toLocaleLowerCase().replace(/[‐‑‒–—―−]/g, '-');
  function renderTargetOptions(row) {
    const kind = row.querySelector('[data-condition="kind"]').value;
    const search = row.querySelector('[data-condition="target-search"]').value.trim().toLocaleLowerCase()
      .replace(/[‐‑‒–—―−]/g, '-');
    const matches = targetChoices(kind).filter(item => targetSearchText(item).includes(search));
    row.querySelector('.tl-target-options').innerHTML = matches.slice(0, search ? 80 : 40).map(item =>
      `<label class="tl-target-option"><input type="radio" name="target-${row.dataset.conditionId}" data-target-id="${esc(String(item.id))}" ${row.selectedTarget === String(item.id) ? 'checked' : ''}><span>${esc(targetLabel(item))}</span></label>`).join('');
    setText(row.querySelector('.tl-target-count'), `${Math.min(matches.length, search ? 80 : 40)} / ${matches.length}`);
  }
  function renderTargetPicker(row) {
    const kind = row.querySelector('[data-condition="kind"]').value;
    const picker = row.querySelector('.tl-target-picker');
    picker.hidden = kind === 'bridge';
    if (kind === 'bridge') return;
    const toggle = picker.querySelector('[data-action="toggle-targets"]');
    const selected = targetChoices(kind).find(item => String(item.id) === row.selectedTarget);
    setText(toggle, `${selected ? targetLabel(selected) : t('conditionTargets')} ▾`);
    toggle.setAttribute('aria-label', t('conditionTargets'));
    renderTargetOptions(row);
  }
  let conditionSequence = 0;
  function addConditionRow() {
    const row = document.createElement('div');
    row.className = 'tl-condition-row';
    row.dataset.conditionId = String(++conditionSequence);
    row.innerHTML = `<select data-condition="kind" aria-label="${esc(t('conditionKind'))}">${[
      ['bridge','bridge'], ['center','center'], ['channel','channel'], ['gate','gate'], ['line','gateLine']
    ].map(([value,key]) => `<option value="${value}">${esc(t(key))}</option>`).join('')}</select>
      <div class="tl-target-picker" data-condition="ids">
        <button type="button" data-action="toggle-targets" aria-expanded="false" aria-label="${esc(t('conditionTargets'))}"></button>
        <div class="tl-target-popover" hidden>
          <input type="search" data-condition="target-search" placeholder="${esc(t('searchTargets'))}" aria-label="${esc(t('searchTargets'))}" autocomplete="off">
          <div class="tl-target-options" role="group" aria-label="${esc(t('conditionTargets'))}"></div>
          <span class="tl-target-count"></span>
        </div>
      </div>
      <select data-condition="state" aria-label="${esc(t('conditionState'))}"><option value="active">${esc(t('activeState'))}</option><option value="inactive">${esc(t('inactiveState'))}</option></select>
      ${button('remove-condition', '×', t('removeCondition'))}`;
    row.querySelector('[data-condition="kind"]').value = 'gate';
    row.selectedTarget = null;
    $('.tl-condition-rows').append(row);
    renderTargetPicker(row);
    syncBridgeControls();
  }
  function syncBridgeControls() {
    root.querySelectorAll('.tl-condition-row').forEach(row => {
      const kind = row.querySelector('[data-condition="kind"]');
      kind.querySelector('option[value="bridge"]').disabled = mode === 'transit-only';
      if (mode === 'transit-only' && kind.value === 'bridge') {
        kind.value = 'gate'; row.selectedTarget = null; renderTargetPicker(row);
      }
      const bridge = kind.value === 'bridge';
      const state = row.querySelector('[data-condition="state"]');
      state.hidden = bridge;
      if (bridge) state.value = 'active';
    });
  }
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
      <span class="tl-zone">${esc(t('zone'))} <output data-field="zone"></output></span>
      ${button('now', t('now'))}
      <label>${esc(t('mode'))}<select data-field="mode"><option value="overlay">${esc(t('overlay'))}</option><option value="transit-only">${esc(t('sky'))}</option></select></label>
      <div class="tl-event-nav">${button('previous-gate', '←', t('previous'))}${button('next-gate', '→', t('next'))}<span class="tl-event-status" role="status"></span></div>
    </div>
    <details class="tl-advanced"><summary>${esc(t('advanced'))}</summary>
      <label>${esc(t('planets'))}<select data-field="planet"><option value="all">${esc(t('all'))}</option>${host.planets.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label>
      <div class="tl-query-head"><strong>${esc(t('conditions'))}</strong><select data-field="combine" aria-label="${esc(t('combine'))}"><option value="all">${esc(t('allConditions'))}</option><option value="any">${esc(t('anyCondition'))}</option></select></div>
      <div class="tl-condition-rows"></div>
      <div class="tl-query-actions">${button('add-condition', t('addCondition'))}${button('run-query', t('runQuery'))}</div>
      <div class="tl-query-status" role="status"></div><div class="tl-query-results"></div>
    </details>
    <div class="tl-time-error" role="status"></div>
    <label class="tl-fold" hidden>${esc(t('chooseOffset'))}<select data-field="fold"></select></label>
    <div class="tl-workspace"><div class="tl-stage">
      <button type="button" class="tl-mobile-exit" data-action="mobile-exit" aria-label="${esc(t('openNavigation'))}" title="${esc(t('openNavigation'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
      <div class="tl-graph-panel">
        <div class="tl-selected"><output class="tl-moment" aria-label="${esc(t('selected'))}"><span class="tl-moment-date"></span><span class="tl-moment-time"></span></output></div>
        <details class="tl-legend-disclosure"><summary>${esc(t('legend'))}</summary><div class="tl-legend">${['natal','transit','completed','both'].map(source => `<span data-source="${source}"><i></i>${esc(t(source))}</span>`).join('')}</div></details>
        <div class="tl-graph bodygraph-container"></div>
        <div class="tl-planet-column tl-transit-column bg-planets"><div class="bg-planets-head">${esc(t('transit'))}</div><div class="tl-planets" data-planets="transit"></div></div>
        <div class="tl-planet-column tl-birth-column"><div class="tl-birth-head${locale.startsWith('en') ? ' tl-birth-head-en' : ''}"><span class="bg-planets-design"><span class="bg-planets-head">${esc(t('design'))}</span></span><span aria-hidden="true"></span><span class="bg-planets-personality"><span class="bg-planets-head">${esc(t('personality'))}</span></span></div><div class="tl-birth-planets"></div></div>
      </div>
      <button type="button" class="tl-mobile-controls-trigger" data-action="mobile-controls" aria-controls="tl-mobile-controls" aria-expanded="false" aria-label="${esc(t('mobileControls'))}" title="${esc(t('mobileControls'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="11" cy="17" r="2" fill="currentColor" stroke="none"/></svg></button>
      <div class="tl-mobile-range"></div>
      <div class="tl-mobile-event-nav">${button('previous-gate', '←', t('previous'))}${button('next-gate', '→', t('next'))}</div>
      <div class="tl-mobile-controls-panel" id="tl-mobile-controls" hidden></div>
    </div>
    <div class="tl-explorer"><section class="tl-tracks-panel" aria-label="${esc(t('tracks'))}">
      <div class="tl-table" aria-busy="true" tabindex="0" role="region" aria-label="${esc(t('scrub'))}" aria-describedby="tl-gesture-help" title="${esc(t('timelineHelp'))}">
        <div class="tl-panel-header">
          <label class="tl-kind"><span class="tl-sr-only">${esc(t('filter'))}</span><select data-field="kind" aria-label="${esc(t('filter'))}" title="${esc(t('filter'))}">${[['all','all'],['center','centersShort'],['channel','channels'],['gate','gates']].map(([value,key]) => `<option value="${value}">${esc(t(key))}</option>`).join('')}</select></label>
          <div class="tl-compact-controls">
            <label class="tl-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="m12 12 5 5"/></svg><input type="search" data-field="search" placeholder="${esc(t('searchShort'))}" aria-label="${esc(t('search'))}" title="${esc(t('search'))}"></label>
            <select data-field="span" aria-label="${esc(t('zoom'))}" title="${esc(t('zoom'))}">${rangeOptions.map(([value,key]) => `<option value="${value}" ${value === '7' ? 'selected' : ''}>${esc(t(key))}</option>`).join('')}</select>
            <button type="button" class="tl-changes" data-field="changes" data-action="changes" aria-pressed="false" aria-label="${esc(t('onlyChanges'))}" title="${esc(t('onlyChanges'))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 14h5V6h6v8h5"/></svg><span>${esc(t('changesShort'))}</span></button>
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
        ${button('retry', t('retry'))}
      </div>
    </div></section></div></div>`;

  const mobileLayout = window.matchMedia('(max-width: 740px)');
  addConditionRow();
  const toolbar = $('.tl-toolbar');
  const advanced = $('.tl-advanced');
  const kindControl = $('.tl-kind');
  const compactControls = $('.tl-compact-controls');
  const controlPanel = $('.tl-mobile-controls-panel');
  const toolbarAnchor = document.createComment('timeline toolbar home');
  const advancedAnchor = document.createComment('timeline advanced home');
  const kindAnchor = document.createComment('timeline filter home');
  const compactAnchor = document.createComment('timeline compact controls home');
  const spanControl = $('[data-field="span"]');
  const spanAnchor = document.createComment('timeline range home');
  toolbar.before(toolbarAnchor);
  advanced.before(advancedAnchor);
  kindControl.before(kindAnchor);
  compactControls.before(compactAnchor);
  spanControl.before(spanAnchor);
  function showMobileControls(open) {
    controlPanel.hidden = !open;
    $('.tl-mobile-controls-trigger').setAttribute('aria-expanded', String(open));
  }
  function placeControls() {
    showMobileControls(false);
    if (mobileLayout.matches) {
      $('.tl-mobile-range').append(spanControl);
      controlPanel.append(toolbar, advanced, compactControls, kindControl);
    }
    else {
      toolbarAnchor.after(toolbar);
      advancedAnchor.after(advanced);
      kindAnchor.after(kindControl);
      compactAnchor.after(compactControls);
      spanAnchor.after(spanControl);
    }
  }
  listen(mobileLayout, 'change', placeControls);
  placeControls();

  $('[data-action="retry"]').hidden = true;
  $('[data-field="zone"]').value = zone;
  $('[data-field="zone"]').textContent = zone;

  function syncClock() {
    const wall = wallTime(selected, zone);
    $('[data-field="zone"]').textContent = zone;
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

  function scrollRowInsideTable(row) {
    if (!row) return;
    const table = $('.tl-table');
    const target = table.scrollTop + row.getBoundingClientRect().top - table.getBoundingClientRect().top - (table.clientHeight - row.offsetHeight) / 2;
    table.scrollTo({ top: Math.max(0, target), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  function highlight(selection, className = 'tl-row-lit') {
    const gates = new Set(selection?.gates || []);
    const centers = new Set(selection?.centers || []);
    const channels = new Set(selection?.channels || []);
    const lines = new Set(selection?.lines || []);
    root.querySelectorAll('.tl-row').forEach(node => {
      const [kind, id] = node.dataset.key.split(':');
      const lit = kind === 'gate' ? gates.has(Number(id)) : kind === 'line' ? lines.has(id) || gates.has(Number(id.split('.')[0]))
        : kind === 'center' ? centers.has(id) : channels.has(id);
      node.classList.toggle(className, Boolean(selection && lit));
    });
  }

  function paintNavigationGates() {
    root.querySelectorAll('.tl-graph .bg-gate[data-gate]').forEach(node => {
      node.classList.toggle('tl-navigation-gate', navigationGates.has(Number(node.dataset.gate)));
    });
  }

  function renderQueryResults() {
    const intervals = queryResult?.intervals || [];
    if (!intervals.length) { $('.tl-query-results').replaceChildren(); return; }
    const compact = instant => {
      const wall = wallTime(instant, zone);
      return `${wall.date.slice(5)} ${wall.time.slice(0, 5)}`;
    };
    const first = Math.floor(Math.max(0, queryIndex) / 3) * 3;
    $('.tl-query-results').innerHTML = `<div class="tl-query-navigation">
      <button type="button" data-action="previous-match" ${queryIndex <= 0 ? 'disabled' : ''} aria-label="${esc(t('previousMatch'))}">← ${esc(t('previousMatch'))}</button>
      <span>${queryIndex + 1} / ${intervals.length}</span>
      <button type="button" data-action="next-match" ${queryIndex >= intervals.length - 1 ? 'disabled' : ''} aria-label="${esc(t('nextMatch'))}">${esc(t('nextMatch'))} →</button></div>
      <div class="tl-query-page">${intervals.slice(first, first + 3).map((interval, offset) => {
        const index = first + offset;
        return `<button type="button" class="tl-query-interval${index === queryIndex ? ' active' : ''}" data-query-interval="${index}" title="${esc(format(interval.start))} → ${esc(format(interval.end))}">
          <strong>${index + 1}</strong><span>${esc(compact(interval.start))} → ${esc(compact(interval.end))}</span><small>${esc(formatDuration(interval.end - interval.start, t))}</small></button>`;
      }).join('')}</div>`;
  }

  function selectQueryInterval(index) {
    const interval = queryResult?.intervals[index];
    if (!interval) return;
    queryIndex = index;
    renderQueryResults();
    const targets = (queryConditions || []).filter(condition => condition.kind !== 'bridge' && condition.ids?.length);
    const targetKeys = targets.map(condition => `${condition.kind}:${condition.ids[0]}`);
    const lead = targets[0];
    if (lead?.kind === 'line') expandedGates.add(Number(lead.ids[0].split('.')[0]));
    if (lead) {
      $('[data-field="kind"]').value = lead.kind === 'line' ? 'gate' : lead.kind;
      $('[data-field="search"]').value = '';
      renderRows();
    }
    selectTime(interval.start, { centerView: true });
    const gates = new Set(); const centers = new Set(); const channels = new Set(); const lines = new Set();
    for (const condition of targets) {
      const id = condition.ids[0];
      if (condition.kind === 'gate') gates.add(Number(id));
      if (condition.kind === 'line') { gates.add(Number(id.split('.')[0])); lines.add(id); }
      if (condition.kind === 'channel') { channels.add(id); id.split('-').forEach(gate => gates.add(Number(gate))); }
      if (condition.kind === 'center') centers.add(id);
    }
    if (interval.bridgeGroup) {
      try {
        const islands = natalIslands(host.identity(chart.chart));
        for (const island of JSON.parse(interval.bridgeGroup).flat()) for (const center of islands[island - 1] || []) centers.add(center);
      } catch { /* Ignore invalid display metadata. */ }
      if (!lead && centers.size) {
        $('[data-field="kind"]').value = 'center';
        $('[data-field="search"]').value = '';
        renderRows();
      }
    }
    const visual = { gates: [...gates], centers: [...centers], channels: [...channels], lines: [...lines] };
    const currentNavigation = ++navigationGeneration;
    clearTimeout(navigationTimer);
    navigationGates.clear();
    paintNavigationGates();
    highlight(visual);
    requestAnimationFrame(() => {
      if (currentNavigation !== navigationGeneration) return;
      const row = targetKeys.map(key => root.querySelector(`.tl-row[data-key="${key}"]`)).find(Boolean)
        || [...centers].map(id => root.querySelector(`.tl-row[data-key="center:${id}"]`)).find(Boolean);
      scrollRowInsideTable(row);
      if (gates.size || centers.size) context?.api?.highlightSelection({ kind: 'targets', gates: visual.gates, centers: visual.centers });
      navigationTimer = setTimeout(() => {
        if (currentNavigation !== navigationGeneration) return;
        context?.api?.highlightSelection(null); highlight(null);
      }, 1800);
    });
  }

  function renderMoment() {
    frame = 0;
    if (!active || !chart) return;
    const full = snapshotInstant === selected && snapshotActivations
      ? snapshotActivations : host.snapshot(selected);
    snapshotInstant = selected;
    snapshotActivations = full;
    const activations = planet === 'all' ? full : { [planet]: full[planet] };
    const model = host.buildModel(chart.chart, activations, mode);
    context ||= {};
    Object.assign(context, { transitGates: activations, mode, model, decorateDetail, onDetailClose: clearTimingState });
    const fixings = host.lineFixings?.(chart.chart, activations);
    const nextGraphKey = `${mode}:${[...model.transitGates].sort((a, b) => a - b).join(',')}`;
    if (graphChart !== chart.chart || graphKey !== nextGraphKey || !context.api) {
      context.api = host.renderGraph($('.tl-graph'), chart.chart, context,
        selection => highlight(selection, 'tl-row-hover'));
      graphChart = chart.chart;
      graphKey = nextGraphKey;
      if (hoverSelection) context.api?.highlightSelection(hoverSelection);
    }
    paintNavigationGates();
    // Keep the birth columns fixed; only the left transit column follows time.
    if (!$('.tl-planets').children.length) {
      $('.tl-planets').innerHTML = host.planets.map(planet => `<button type="button" class="tl-planet bg-planet-row" data-planet="${planet.id}" title="${esc(planet.name)}"><span class="bg-planet-glyph" aria-hidden="true">${esc(planet.glyph)}</span><strong class="bg-planet-act"></strong><span class="tl-fixing-mark" aria-hidden="true"></span></button>`).join('');
      $('.tl-birth-planets').innerHTML = host.planets.map(planet => `<div class="tl-birth-row"><button type="button" class="tl-birth-value bg-planet-row bg-planets-design" data-birth-planet="${planet.id}" data-side="design"><span class="tl-fixing-mark" aria-hidden="true"></span><span class="bg-planet-act"></span></button><span class="bg-planet-glyph tl-birth-glyph" aria-hidden="true">${esc(planet.glyph)}</span><button type="button" class="tl-birth-value bg-planet-row bg-planets-personality" data-birth-planet="${planet.id}" data-side="personality"><span class="bg-planet-act"></span><span class="tl-fixing-mark" aria-hidden="true"></span></button></div>`).join('');
    }
    root.querySelectorAll('[data-planet]').forEach(node => {
      const value = activations[node.dataset.planet];
      const planet = host.planets.find(planet => planet.id === node.dataset.planet);
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
  }

  function renderFixing(node, state, baseTitle, scope) {
    const mark = node.querySelector('.tl-fixing-mark');
    mark.dataset.state = state || '';
    setText(mark, ({ exalted: '▲', detriment: '▼', juxtaposed: '▲▼', unknown: '?' })[state] || '');
    node.title = state ? `${baseTitle} · ${scope} · ${t(`fixing_${state}`)}` : baseTitle;
    node.setAttribute('aria-label', node.title);
  }

  function selectTime(instant, { recenter = false, centerView = false } = {}) {
    if (!recenter && (!result || calculating)) return;
    const range = recenter ? bounds() : result;
    const nextSelected = Math.max(range.start, Math.min(range.end - 1000, Math.round(instant / 1000) * 1000));
    if (!recenter && !centerView && nextSelected === selected) return;
    selected = nextSelected;
    host.closeDetail(); closeTiming();
    $('.tl-time-error').textContent = '';
    $('.tl-fold').hidden = true;
    if (recenter) {
      rangeAnchor = selected;
      timelineRange = boundRange(presetWindow(rangeAnchor, preset, zone, host.resolveTime));
      windowRange = { ...timelineRange };
      span = windowRange.end - windowRange.start;
      selected = Math.max(windowRange.start, Math.min(windowRange.end - 1000, selected));
      calculate();
    } else if (centerView || selected < windowRange.start || selected >= windowRange.end) {
      windowRange = clampWindow(centeredWindow(selected, span), result);
      renderRows();
    }
    syncClock();
    if (!frame) frame = requestAnimationFrame(renderMoment);
  }

  function rowSymbol(row) {
    if (row.kind === 'line') return `<span class="tl-line-symbol">.${row.line}</span>`;
    if (row.kind === 'gate') return `<span class="tl-gate-symbol">${row.id}</span>`;
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
    // Keep the row roster fixed for the completed calculation. Only bars are
    // clipped to the moving viewport, so empty tracks retain their position.
    const rows = result.rows.filter(row => row.kind !== 'bridge' && row.intervals.length > 0 && (kind === 'all' || row.kind === kind || (kind === 'gate' && row.kind === 'line'))
      && (row.kind !== 'line' || expandedGates.has(row.gate) || (query && row.id.includes(query)))
      && (!query || `${name(row)} ${t(row.kind)}`.toLocaleLowerCase(locale).includes(query) ||
        (row.kind === 'gate' && result.rows.some(line => line.kind === 'line' && line.gate === row.id && line.id.includes(query))))
      && (!changesOnly || row.intervals.some(interval => (interval.start > result.start && interval.start < result.end) || (interval.end > result.start && interval.end < result.end))));
    reconcile($('.tl-rows'), rows.length ? rows.map(row => `<div class="tl-row${row.kind === 'line' ? ' tl-line-row' : ''}" data-key="${row.key}">
      <div class="tl-row-label">${row.kind === 'gate' ? `<button type="button" class="tl-gate-expand" data-action="expand-gate" data-gate="${row.id}" aria-expanded="${expandedGates.has(row.id)}" aria-label="${esc(name(row))}">${expandedGates.has(row.id) ? '▾' : '▸'}</button>` : ''}<button type="button" class="tl-row-name" data-row="${row.key}" title="${esc(name(row))}" aria-label="${esc(name(row))}">${rowSymbol(row)}</button></div>
      <div class="tl-track">${bands}${grid}${row.intervals.map((interval, index) => {
        const visible = clipInterval(interval, windowRange);
        if (!visible) return '';
        const title = `${name(row)} · ${t(interval.source)} · ${interval.clippedStart ? t('before') : format(interval.start)} → ${interval.clippedEnd ? t('after') : format(interval.end)}`;
        return `<button type="button" class="tl-bar ${visible.clippedStart ? 'tl-clipped-start' : ''} ${visible.clippedEnd ? 'tl-clipped-end' : ''}" data-source="${interval.source}" data-key="${row.key}" data-interval="${index}" style="left:${ratioAt(windowRange, visible.start) * 100}%;width:${(visible.end - visible.start) / span * 100}%" title="${esc(title)}" aria-label="${esc(title)}"><span>${esc(name(row))}</span></button>`;
      }).join('')}</div></div>`).join('') : `<p class="tl-empty">${esc(t('noRows'))}</p>`);
    $('.tl-table').scrollTop = scroll;
    if (sync) syncClock();
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
    host.closeDetail(); closeTiming();
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

  function jumpGate(direction) {
    if (!result || calculating) { setText($('.tl-event-status'), t('loadingTitle')); return; }
    const gateStarts = new Map();
    for (const row of result.rows.filter(item => item.kind === 'gate')) {
      for (const interval of row.intervals) {
        if (interval.start <= result.start || interval.source === 'natal') continue;
        const entry = gateStarts.get(interval.start) || new Set();
        entry.add(Number(row.id));
        gateStarts.set(interval.start, entry);
      }
    }
    const candidates = (result.gateChanges || []).filter(change =>
      (direction > 0 ? change.time > selected : change.time < selected) &&
      (planet === 'all' || !change.planets || change.planets.includes(planet)) && gateStarts.has(change.time))
      .map(change => {
        const gates = [...gateStarts.get(change.time)];
        if (planet === 'all') return { ...change, gates };
        const before = host.snapshot(change.time - 1000)?.[planet];
        const after = host.snapshot(change.time)?.[planet];
        return { ...change, gates: after?.gate !== before?.gate ? gates.filter(gate => gate === after?.gate) : [] };
      }).filter(change => change.gates.length);
    const change = direction > 0 ? candidates[0] : candidates.at(-1);
    if (!change) { setText($('.tl-event-status'), t('noNextGate')); return; }
    const currentNavigation = ++navigationGeneration;
    clearTimeout(navigationTimer);
    navigationGates.clear();
    paintNavigationGates();
    highlight(null);
    setText($('.tl-event-status'), '');
    let visibleRows = new Set([...root.querySelectorAll('.tl-row')].map(node => node.dataset.key));
    if (!change.gates.some(gate => visibleRows.has(`gate:${gate}`))) {
      $('[data-field="kind"]').value = 'gate';
      $('[data-field="search"]').value = '';
      renderRows();
      visibleRows = new Set([...root.querySelectorAll('.tl-row')].map(node => node.dataset.key));
    }
    const target = change.gates.find(gate => visibleRows.has(`gate:${gate}`));
    selectTime(change.time, { centerView: true });
    requestAnimationFrame(() => {
      if (currentNavigation !== navigationGeneration) return;
      if (target != null) {
        const row = [...root.querySelectorAll('.tl-row')].find(node => node.dataset.key === `gate:${target}`);
        scrollRowInsideTable(row);
      }
      navigationGates = new Set(change.gates);
      highlight({ gates: change.gates });
      paintNavigationGates();
      navigationTimer = setTimeout(() => {
        if (currentNavigation !== navigationGeneration) return;
        navigationGates.clear();
        paintNavigationGates();
        highlight(null);
      }, 2400);
    });
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
    stopDrag();
    const token = ++generation;
    calculating = true;
    queryResult = null; $('.tl-query-results').replaceChildren();
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
    // Presets own the complete calculation; zoom and pan only change windowRange.
    requestedRange = { ...timelineRange };
    try {
      const calculated = await client.calculate({ ...requestedRange, natal: host.identity(chart.chart), mode, planet }, progress => {
        if (token === generation) renderProgress(progress);
      });
      if (token !== generation || !active) return;
      result = calculated;
      calculating = false;
      setText($('.tl-event-status'), calculated.source === 'mixed' ? t('fallbackNotice') : '');
      $('.tl-calculation').hidden = true;
      $('.tl-table').setAttribute('aria-busy', 'false');
      requestedRange = null;
      renderRows();

    } catch (error) {
      if (error.name === 'AbortError' || token !== generation) return;
      calculating = false;
      $('.tl-calculation').dataset.state = 'error';
      $('.tl-load-status').textContent = t('error');
      $('.tl-table').setAttribute('aria-busy', 'false');
      $('[data-action="retry"]').hidden = false;
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

    const row = pendingDetail?.row?.kind === 'line' && selection.kind === 'gate' &&
      pendingDetail.row.gate === Number(selection.id) ? pendingDetail.row
      : result?.rows.find(item => item.kind === selection.kind && String(item.id) === String(selection.id));
    const interval = row && (pendingDetail?.row === row ? pendingDetail.interval : intervalAt(row, selected));
    // Birth definitions are persistent; only temporary transit participation has timing.
    if (!interval || interval.source === 'natal') return;
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
    pendingDetail = { row, interval };
    root.querySelector(`.tl-bar[data-key="${row.key}"][data-interval="${index}"]`)?.setAttribute('aria-pressed', 'true');
    host.showDetail(row.kind === 'line' ? 'gate' : row.kind, row.kind === 'line' ? row.gate : row.id, context);
  }

  function clockChanged() {
    try {
      const matches = host.resolveTime($('[data-field="date"]').value, $('[data-field="time"]').value, zone);
      if (!matches.length) throw new Error('gap');
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
  listen($('[data-field="span"]'), 'change', event => {
    if (!rangeOptions.some(([value]) => value === event.target.value)) return;
    preset = event.target.value;
    selectTime(selected, { recenter: true });
  });
  listen($('[data-field="mode"]'), 'change', event => {
    mode = event.target.value;
    syncBridgeControls();
    host.closeDetail(); calculate(); renderMoment();
  });
  listen($('[data-field="planet"]'), 'change', event => {
    planet = event.target.value;
    host.closeDetail(); calculate(); renderMoment();
  });
  listen($('.tl-advanced'), 'input', event => {
    if (!event.target.closest('.tl-condition-row, [data-field="combine"]')) return;
    queryResult = null; $('.tl-query-results').replaceChildren();
    setText($('.tl-query-status'), '');
    if (event.target.matches('[data-condition="target-search"]')) renderTargetOptions(event.target.closest('.tl-condition-row'));
  });
  listen($('.tl-advanced'), 'change', event => {
    const row = event.target.closest('.tl-condition-row');
    if (!row) return;
    if (event.target.matches('[data-condition="kind"]')) {
      row.selectedTarget = null;
      row.querySelector('[data-condition="target-search"]').value = '';
      row.querySelector('.tl-target-popover').hidden = true;
      row.querySelector('[data-action="toggle-targets"]').setAttribute('aria-expanded', 'false');
      renderTargetPicker(row);
      syncBridgeControls();
    }
    if (event.target.matches('[data-target-id]')) {
      row.selectedTarget = event.target.checked ? event.target.dataset.targetId : null;
      renderTargetPicker(row);
      row.querySelector('.tl-target-popover').hidden = true;
      row.querySelector('[data-action="toggle-targets"]').setAttribute('aria-expanded', 'false');
    }
  });
  for (const field of ['kind','search']) listen($(`[data-field="${field}"]`), 'input', () => { closeTiming(); renderRows(); });
  listen($('.tl-table'), 'keydown', event => {
    if (event.target !== $('.tl-table')) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      selectTime(selected + (event.key === 'ArrowUp' ? 1 : -1) * MINUTE * (event.shiftKey ? 60 : 1));
    } else if (['+','=','-','_'].includes(event.key)) {
      event.preventDefault(); zoom(['+','='].includes(event.key) ? 2 : .5);
    }
  });
  listen(document, 'keydown', event => {
    if (!active || !chart || root.classList.contains('hidden') ||
        !['ArrowLeft', 'ArrowRight'].includes(event.key) || event.defaultPrevented ||
        event.altKey || event.ctrlKey || event.metaKey) return;
    if (!document.querySelector('#gate-detail')?.classList.contains('hidden')) return;
    const target = event.target instanceof Element ? event.target : document.activeElement;
    if (target?.closest('input, textarea, select, [contenteditable], [role="combobox"], [role="textbox"], [role="spinbutton"]')) return;
    event.preventDefault();
    jumpGate(event.key === 'ArrowRight' ? 1 : -1);
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
    if (action === 'toggle-targets') {
      const picker = event.target.closest('.tl-target-picker');
      const popover = picker.querySelector('.tl-target-popover');
      root.querySelectorAll('.tl-target-popover').forEach(node => { if (node !== popover) node.hidden = true; });
      popover.hidden = !popover.hidden;
      picker.querySelector('[data-action="toggle-targets"]').setAttribute('aria-expanded', String(!popover.hidden));
      if (!popover.hidden) picker.querySelector('[data-condition="target-search"]').focus();
      return;
    }
    if (action === 'remove-target') {
      const row = event.target.closest('.tl-condition-row');
      row.selectedTarget = null;
      renderTargetPicker(row);
      queryResult = null; $('.tl-query-results').replaceChildren();
      return;
    }
    if (action === 'mobile-exit') { showMobileControls(false); document.getElementById('mobile-menu-toggle')?.click(); return; }
    if (action === 'mobile-controls') { showMobileControls(controlPanel.hidden); return; }
    if (!controlPanel.hidden && !controlPanel.contains(event.target)) showMobileControls(false);
    if (action === 'now') selectTime(Date.now(), { recenter: true });
    if (action === 'previous-gate' || action === 'next-gate') jumpGate(action === 'next-gate' ? 1 : -1);
    if (action === 'expand-gate') {
      const gate = Number(event.target.closest('[data-gate]').dataset.gate);
      if (expandedGates.has(gate)) expandedGates.delete(gate); else expandedGates.add(gate);
      renderRows();
    }
    if (action === 'add-condition') addConditionRow();
    if (action === 'remove-condition') {
      event.target.closest('.tl-condition-row').remove();
      queryResult = null; $('.tl-query-results').replaceChildren();
    }
    if (action === 'run-query') {
      try {
        const conditions = [...root.querySelectorAll('.tl-condition-row')].map(row => ({
          kind: row.querySelector('[data-condition="kind"]').value,
          ids: row.selectedTarget ? [row.selectedTarget] : [],
          state: row.querySelector('[data-condition="state"]').value
        }));
        queryResult = queryTimeline(result, conditions, {
          combine: $('[data-field="combine"]').value, mode,
          natalIslandCount: natalIslands(host.identity(chart.chart)).length,
          catalog: targetCatalog
        });
        queryConditions = conditions;
        setText($('.tl-query-status'), queryResult.empty ? t('noMatches') : queryResult.fullRange ? t('fullRange') :
          t('matchCount', { count: queryResult.intervals.length }));
        queryIndex = queryResult.intervals.length ? 0 : -1;
        renderQueryResults();
      } catch (error) { queryResult = null; queryConditions = null; $('.tl-query-results').replaceChildren(); setText($('.tl-query-status'), error.message); }
    }
    const queryButton = event.target.closest('[data-query-interval]');
    if (queryButton) selectQueryInterval(Number(queryButton.dataset.queryInterval));
    if (action === 'previous-match' || action === 'next-match') selectQueryInterval(queryIndex + (action === 'next-match' ? 1 : -1));
    if (action === 'changes') {
      const toggle = $('[data-field="changes"]');
      toggle.setAttribute('aria-pressed', String(toggle.getAttribute('aria-pressed') !== 'true'));
      closeTiming(); renderRows();
    }
    if (action === 'retry') calculate();
    const bar = event.target.closest('[data-interval]');
    if (bar && result) {
      const row = result.rows.find(item => item.key === bar.dataset.key);
      openTiming(row, row.intervals[Number(bar.dataset.interval)], Number(bar.dataset.interval));
    }
    const rowButton = event.target.closest('[data-row]');
    if (rowButton && context) {
      const row = result?.rows.find(item => item.key === rowButton.dataset.row);
      if (row) host.showDetail(row.kind === 'line' ? 'gate' : row.kind,
        row.kind === 'line' ? row.gate : row.id, context);
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
    for (const [field, key] of [['date','date'], ['time','time'], ['zone','zone'], ['mode','mode'], ['planet','planets']]) fieldLabel(field, key);
    for (const [action, key] of [['now','now'], ['retry','retry']]) {
      const button = $(`[data-action="${action}"]`);
      setText(button, t(key));
      button.title = t(key);
      button.setAttribute('aria-label', t(key));
    }
    for (const [action, key] of [['previous-gate','previous'], ['next-gate','next']]) {
      root.querySelectorAll(`[data-action="${action}"]`).forEach(node => {
        node.title = t(key); node.setAttribute('aria-label', t(key));
      });
    }
    put('.tl-advanced summary', 'advanced');
    put('.tl-query-head strong', 'conditions');
    for (const [action, key] of [['add-condition','addCondition'], ['run-query','runQuery']]) {
      const node = $(`[data-action="${action}"]`);
      setText(node, t(key)); node.title = t(key); node.setAttribute('aria-label', t(key));
    }
    setText($('[data-field="planet"] option[value="all"]'), t('all'));
    for (const item of host.planets) setText($(`[data-field="planet"] option[value="${item.id}"]`), item.name);
    for (const [value, key] of [['all','allConditions'],['any','anyCondition']]) setText($(`[data-field="combine"] option[value="${value}"]`), t(key));
    root.querySelectorAll('.tl-condition-row').forEach(row => {
      for (const [value, key] of [['gate','gate'],['line','gateLine'],['channel','channel'],['center','center'],['bridge','bridge']])
        setText(row.querySelector(`[data-condition="kind"] option[value="${value}"]`), t(key));
      setText(row.querySelector('[data-condition="state"] option[value="active"]'), t('activeState'));
      setText(row.querySelector('[data-condition="state"] option[value="inactive"]'), t('inactiveState'));
      row.querySelector('[data-action="remove-condition"]').setAttribute('aria-label', t('removeCondition'));
      row.querySelector('[data-condition="target-search"]').setAttribute('placeholder', t('searchTargets'));
      row.querySelector('[data-condition="target-search"]').setAttribute('aria-label', t('searchTargets'));
      renderTargetPicker(row);
    });
    if (queryResult) renderQueryResults();
    for (const [value, key] of [['overlay','overlay'], ['transit-only','sky']])
      setText($(`[data-field="mode"] option[value="${value}"]`), t(key));
    const foldLabel = $('.tl-fold').firstChild;
    if (foldLabel.nodeType === Node.TEXT_NODE) foldLabel.textContent = t('chooseOffset');
    const foldPlaceholder = $('[data-field="fold"] option[value=""]');
    if (foldPlaceholder) setText(foldPlaceholder, t('chooseOffset'));
    if (timeError) {
      const key = ['fold','gap','invalid'].find(candidate => timeError === previous(candidate));
      if (key) put('.tl-time-error', key);
    }
    if (eventStatus === previous('fallbackNotice') || eventStatus === previous('noNextGate')) {
      setText($('.tl-event-status'), t(eventStatus === previous('fallbackNotice') ? 'fallbackNotice' : 'noNextGate'));
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
      attr('[data-field="span"]', attribute, 'zoom');
      attr('[data-field="changes"]', attribute, 'onlyChanges');
    }
    attr('[data-field="search"]', 'placeholder', 'searchShort');
    for (const [value, key] of [['all','all'], ['center','centersShort'], ['channel','channels'], ['gate','gates']])
      setText($(`[data-field="kind"] option[value="${value}"]`), t(key));
    for (const [value, key] of rangeOptions)
      setText($(`[data-field="span"] option[value="${value}"]`), t(key));
    put('.tl-changes span', 'changesShort');
    for (const action of ['mobile-controls','mobile-exit']) {
      const key = action === 'mobile-controls' ? 'mobileControls' : 'openNavigation';
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
    refresh() { if (active) { graphKey = ''; renderMoment(); } },
    setLanguage,
    destroy() { clearTimeout(navigationTimer); deactivate(); client.dispose(); sizing.disconnect(); events.abort(); root.replaceChildren(); root.classList.remove('tl', 'tl-no-chart'); }
  };
}
