import { renderChannelCircuitBadges } from '../lib/channel-badges.js';
import { renderGateDetailHeading, renderChannelDetailHeading, renderDetailNavigation } from '../lib/object-detail-heading.js';
/**
 * Chart view — bodygraph + foundation + tabbed detail panels.
 */

import {
  GATES,
  CHANNELS,
  LINE_NAMES
} from '../lib/human-design/catalog.js';
import { GATE_DESCRIPTIONS, CHANNEL_DESCRIPTIONS, contentText, crossName, geneKeyTerm } from '../lib/content.js';
import { centerReading, centerInsights, channelsForGate, channelById } from '../lib/reference-content.js';
import { t, formatDisplay, countLabel, getLocale } from '../lib/i18n.js';
import {
  typeName, strategy, notSelf, signature, authorityName, profileName,
  definitionName, centerName, gateName, channelName, circuitName,
  planetName, lineName, variable, cognition, hexagramName
} from '../lib/vocabulary.js';


const humanList = items => formatDisplay('list', items);

import { authorityNames } from '../lib/human-design/identities.js';
const authorityLabel = chart => authorityName(authorityNames[chart.calculation?.authority?.id ?? chart.authority?.id] ?? chart.authority.name);
import { foundationSummary } from '../lib/knowledge/foundation-summary.js';
import { getKnowledgeSummary } from '../lib/knowledge/registry.js';
import { chartKnowledgeQuery } from '../lib/knowledge/access.js';
import { openKnowledgeDetail } from '../lib/knowledge/detail-controller.js';
import { variableDirection, variableArrows } from '../lib/variable-arrows.js';
import { calculateLineFixings } from '../features/transit-timeline/line-fixing.js';
import { renderBodygraph, PLANET_ORDER, PLANET_GLYPHS } from '../bodygraph.js';
import { TRANSIT_SOURCE_LABELS } from '../lib/transit-graph.js';
import { openDetailDialog, closeDetailDialog, prepareDetailDialog, fitDetailSheetHeight } from '../lib/detail-dialog.js';
import { decorateBodygraphDetail } from '../lib/bodygraph-detail-layout.js';
import { esc, formatBirth } from '../lib/format.js';
import { channelCircuit } from '../lib/circuit-topology.js';
import { renderPlanetReading } from '../lib/planet-reference.js';
import { renderSharedGateReading, renderSharedChannelReading, bindSharedObjectDetails } from '../lib/shared-object-details.js';
import { PHONE_MAX_WIDTH } from '../lib/breakpoints.js';
import { mountInsight, refreshInsight, insightBack, remeasureInsight } from '../features/chart-insight/controller.js';
import '../features/chart-insight/messages.js';

let current = null; // { birth, chart, geneKeys }
let bodygraphApi = null;
let detailHistory = []; // stack of { kind, id } for modal back-navigation
let currentDetail = null;
let detailContext = null;
let disposeSharedDetails = null;
const detailGraph = () => detailContext?.api || bodygraphApi;

const TYPE_COLORS = {
  'Generator': 'var(--generator)',
  'Manifesting Generator': 'var(--manifesting-generator)',
  'Manifestor': 'var(--manifestor)',
  'Projector': 'var(--projector)',
  'Reflector': 'var(--reflector)'
};

export function refreshChartLanguage() {
  if (!current) return;
  const detail = document.getElementById('gate-detail');
  const open = currentDetail && !detail.classList.contains('hidden');
  const selected = open ? { ...currentDetail } : null;
  const history = detailHistory.map(item => ({ ...item }));
  const lens = currentLens;
  const context = detailContext;
  // A language change is not a close action: preserve feature-owned timing state.
  renderChartView(current, { preserveOtherDialog: true });
  // The insight dashboard keeps its own level and filters; re-render in place.
  refreshInsight(document.getElementById('chart-insight'));
  if (selected) {
    detailHistory = history;
    currentLens = lens;
    detailContext = context;
    if (selected.kind === 'planet') showPlanetDetail(selected, false);
    else if (selected.kind === 'gate') showGateDetail(selected.id, false, selected.source);
    else if (selected.kind === 'channel') showTransitChannelDetail(selected.id, false);
    else showCenterDetail(selected.id, false);
  }
}

const NATAL_STAGE_WIDTH = 510;
const NATAL_STAGE_HEIGHT = 774;
const NATAL_ASPECT = 883.41 / 1341.4;
let natalFitObserver = null;

/** Drop the natal sizing observers; safe to call when nothing was armed. */
export function teardownNatalFit() {
  natalFitObserver?.disconnect();
  natalFitObserver = null;
}

function ensureNatalStage(container) {
  const graph = container.matches('.bg-root') ? container : container.querySelector('.bg-root');
  const grid = graph?.querySelector('.bg-grid');
  if (!graph || !grid) return null;
  let shell = graph.querySelector('.bg-stage-shell');
  let stage = shell?.querySelector('.bg-stage');
  if (stage?.contains(grid)) return { shell, stage, grid };
  shell = document.createElement('div');
  shell.className = 'bg-stage-shell';
  stage = document.createElement('div');
  stage.className = 'bg-stage';
  grid.replaceWith(shell);
  shell.appendChild(stage);
  stage.appendChild(grid);
  return { shell, stage, grid };
}

function armNatalFit() {
  teardownNatalFit();
  const container = document.getElementById('bodygraph-container');
  const column = container?.closest('.chart-column');
  const stageParts = container && ensureNatalStage(container);
  if (!container || !column || !stageParts) return;
  const { shell, stage, grid } = stageParts;

  const apply = () => {
    if (!shell.isConnected || document.getElementById('chart-view')?.classList.contains('hidden') || !container.getClientRects().length) return;
    const viewport = window.visualViewport?.height ?? document.documentElement.clientHeight;
    const columnStyle = getComputedStyle(column);
    const stickyTop = parseFloat(columnStyle.top) || 0;
    const cs = getComputedStyle(container);
    const verticalInsets = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
      + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0) + 12;
    const availableHeight = Math.max(1, viewport - stickyTop - verticalInsets);
    const phoneLayout = window.matchMedia('(max-width: 640px)').matches;
    const availableWidth = Math.max(1, container.clientWidth
      - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0));
    const planetColumns = [...container.querySelectorAll('.bg-stage .bg-planets')];
    const arrowRows = [...container.querySelectorAll('.bg-stage .bg-variable-row')];
    const tight = availableHeight < 620 || availableWidth < 420;
    const planetGap = tight ? 0 : 1;
    const planetPadding = tight ? 0 : 2;
    const rowPitch = tight ? 21 : 23.5;
    const planetWidthFit = tight ? 76 : 88;
    const arrowWidth = tight ? 54 : 68;
    container.style.setProperty('--bg-planet-gap', `${planetGap}px`);
    container.style.setProperty('--bg-planet-padding', `${planetPadding}px`);
    container.style.setProperty('--bg-planet-pitch', `${rowPitch}px`);
    container.style.setProperty('--bg-planet-width', `${planetWidthFit}px`);
    container.style.setProperty('--bg-arrow-width', `${arrowWidth}px`);
    const fontMetric = document.createElement('span');
    fontMetric.textContent = 'M';
    fontMetric.style.cssText = 'position:absolute;visibility:hidden;font-size:10px;line-height:normal';
    stage.appendChild(fontMetric);
    const rowHeight = parseFloat(getComputedStyle(fontMetric).lineHeight) || 12;
    fontMetric.remove();
    const planetHeight = Math.max(...planetColumns.map(node => node.scrollHeight), 0);
    const arrowTop = [14, 80];
    const arrowBottom = arrowRows.reduce((max, row, i) => Math.max(max, arrowTop[i] + row.scrollHeight + 4), 0);
    const desiredCardWidth = Math.min(availableWidth, NATAL_STAGE_WIDTH);
    const heightFitWidth = Math.min(desiredCardWidth, availableHeight * NATAL_ASPECT);
    const widthCandidates = phoneLayout
      ? [heightFitWidth]
      : [...new Set([heightFitWidth, desiredCardWidth, desiredCardWidth * .95, desiredCardWidth * .9])];
    let chosen = null;
    for (const widthFactor of widthCandidates) {
      const svgWidth = widthFactor;
      const svgHeight = svgWidth / NATAL_ASPECT;
      // The stage follows the card content width. Planet columns anchor to its
      // outer edges while the independently fitted SVG stays centred inside.
      const stageWidth = availableWidth;
      const stageHeight = Math.max(svgHeight, planetHeight, arrowBottom);
      const requiredScale = Math.min(1, availableWidth / stageWidth, availableHeight / stageHeight);
      const candidate = { svgWidth, svgHeight, stageWidth, stageHeight, requiredScale };
      if (!chosen || requiredScale > chosen.requiredScale
        || (requiredScale === chosen.requiredScale && svgWidth > chosen.svgWidth)) chosen = candidate;
      if (requiredScale >= .999) break;
    }
    const scale = chosen.requiredScale;
    const frameWidth = chosen.stageWidth * scale;
    const frameHeight = chosen.stageHeight * scale;
    const svgWidth = chosen.svgWidth;
    const svgHeight = chosen.svgHeight;
    container.style.setProperty('--bg-stage-base-width', `${chosen.stageWidth}px`);
    container.style.setProperty('--bg-stage-base-height', `${chosen.stageHeight}px`);
    container.style.setProperty('--bg-svg-width', `${svgWidth}px`);
    container.style.setProperty('--bg-svg-height', `${svgHeight}px`);
    container.style.setProperty('--bg-planet-width', `${planetWidthFit}px`);
    container.style.setProperty('--bg-stage-scale', String(scale));
    container.style.setProperty('--bg-stage-width', `${frameWidth}px`);
    container.style.setProperty('--bg-stage-height', `${frameHeight}px`);
  };

  apply();
  const hidden = () => document.getElementById('chart-view')?.classList.contains('hidden') || !container.getClientRects().length;
  const guarded = () => { if (!hidden()) apply(); };
  window.addEventListener('resize', guarded);
  window.visualViewport?.addEventListener('resize', guarded);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(guarded) : null;
  if (observer) {
    observer.observe(container);
    const chartLayout = container.closest('.chart-layout');
    if (chartLayout) observer.observe(chartLayout);
  }
  natalFitObserver = {
    disconnect: () => {
      window.removeEventListener('resize', guarded);
      window.visualViewport?.removeEventListener('resize', guarded);
      observer?.disconnect();
    }
  };
}

export function renderChartView(data, { preserveOtherDialog = false } = {}) {
  if (!preserveOtherDialog) closeDetailDialog();
  current = data;
  const { birth, chart } = data;

  document.getElementById('birth-entry').classList.add('hidden');
  document.getElementById('chart-view').classList.remove('hidden');

  // --- Type banner ---
  const banner = document.getElementById('type-banner');
  const who = birth.name ? `${esc(birth.name)} — ` : '';
  const birthLine = [
    formatBirth(birth.birthDate, birth.timeUnknown ? null : birth.birthTime),
    birth.location?.name
  ].filter(Boolean).join(' · ');

  banner.innerHTML = `
    <div class="type-name">${who.replace(' — ', '')}</div>
    <div><span class="type-badge">${esc(typeName(chart.type.name))}</span></div>
    <div class="type-detail">${esc(chart.profile.numbers)} ${esc(profileName(chart.profile.numbers))} · ${esc(authorityLabel(chart))} · ${esc(definitionName(chart.definition))}</div>
    <div class="type-birthline">${esc(birthLine)}${birth.timeUnknown ? ` · <em>${t('time unknown — chart uses noon')}</em>` : ''}</div>
    <div class="type-strategy">${t('Strategy:')} ${esc(strategy(chart.type.name))}</div>
    <p class="type-plain">${esc(foundationSummary(chart, 'type', 'hero'))}</p>
  `;
  // --- Bodygraph ---
  rerenderBodygraph();

  // --- Insight dashboard (replaces the old foundation cards + tabs) ---
  renderInsight(chart, data.sensitivity, birth, data.geneKeys);
  // After the graph and the banner exist, size the natal graph to the height it
  // actually has. Runs once per render and on banner/viewport changes only.
  armNatalFit();
}

/** Reliability wording for the dashboard: one short sentence plus optional detail. */
function reliabilityMeta(sensitivity, birth) {
  if (birth?.timeUnknown) return { timeUnknown: true };
  if (!sensitivity) return null;
  const solid = sensitivity.shifts.length === 0;
  if (solid) {
    return {
      reliabilityShort: t('Solid chart — even if your birth time were off by 15 minutes, nothing here would change.')
    };
  }
  const detail = humanList(sensitivity.shifts.map(item => formatDisplay('sensitivity', item)));
  return {
    reliabilityShort: t('Your chart is solid. One fine detail — your {detail} — sits right on a line, so it is the only thing a birth time off by 15+ minutes could nudge.', { detail }),
    reliabilityDetail: t('Everything else holds no matter what. If your time came from a birth certificate, even that is settled.')
  };
}

/** Mounts the right-column dashboard and wires it to chart feature functions. */
function renderInsight(chart, sensitivity, birth, geneKeys = null) {
  const host = document.getElementById('chart-insight');
  if (!host) return;
  // The same chart keeps its level and filters across a locale or skin refresh;
  // a different chart (another person) starts again at the overview.
  const identity = chartIdentity(chart);
  const preserveLevel = host.dataset.ciIdentity === identity;
  host.dataset.ciIdentity = identity;
  mountInsight(host, {
    chart,
    geneKeys,
    meta: reliabilityMeta(sensitivity, birth),
    fixings: calculateLineFixings(chart),
    preserveLevel,
    handlers: {
      onGate: gate => showGateDetail(gate),
      onHoverGate: gate => bodygraphApi?.highlightGate?.(gate ?? null),
      onChannel: key => showTransitChannelDetail(key),
      // A channel lights both of its endpoints; that is one selection, not two.
      onHoverChannel: key => bodygraphApi?.highlightSelection?.(key ? { kind: 'channel', id: key } : null),
      onPlanet: ({ side, planet }) => showPlanetDetail({ source: side, planet }),
      onCenter: center => showCenterDetail(center),
      onVariable: kind => {
        const query = chartKnowledgeQuery(chart, 'variable', kind);
        if (query) openKnowledgeDetail(query, { variable: chart.variable[kind] });
      },
      onReadObject: kind => {
        const query = chartKnowledgeQuery(chart, kind);
        if (!query) return;
        openKnowledgeDetail(query, query.objectType === 'definition'
          ? { definitionComponents: chart.definitionComponents } : null);
      }
    }
  });
}

/** Stable identity for "is this the same chart" checks across re-renders. */
function chartIdentity(chart) {
  return [
    chart?.type?.id ?? '',
    chart?.profile?.id ?? '',
    chart?.authority?.id ?? '',
    chart?.definition ?? '',
    (chart?.gates?.all ?? []).join(','),
    (chart?.channels ?? []).map(channel => channel.gates.join('-')).join(','),
    chart?.incarnationCross?.rawId ?? ''
  ].join('|');
}

export function refreshNatalFit() {
  if (!current) return;
  armNatalFit();
}

export function rerenderBodygraph(transitGates = null) {
  if (!current) return;
  const container = document.getElementById('bodygraph-container');
  bodygraphApi = renderBodygraph(container, current.chart, {
    animate: false,
    onGateClick: (gate, source) => source
      ? showPlanetDetail({ source: source.side, planet: source.planet, activation: current.chart.gates[source.side]?.[source.planet] })
      : showGateDetail(gate),
    onCenterClick: showCenterDetail,
    onHighlight: highlightPanelRows,
    transitGates: transitGates || undefined
  });
  // Every redraw replaces the wrap element, so the height-derived size has to
  // be re-applied to the new node (the old one is gone with its property).
  armNatalFit();
  return bodygraphApi;
}

// Reverse direction of the bodygraph's relational highlight: when a gate/center
// lights up on the graph, light the matching rows in the data panels so the
// chart and the lists read as one focused object.
function highlightPanelRows(sel) {
  document.querySelectorAll('.row-lit').forEach(el => el.classList.remove('row-lit'));
  if (!sel) return;
  for (const g of sel.gates || []) {
    document
      .querySelectorAll(`#chart-insight [data-ci-gate="${g}"], #gate-detail [data-gate="${g}"]`)
      .forEach(el => el.classList.add('row-lit'));
  }
  for (const ck of sel.centers || []) {
    document
      .querySelectorAll(`#chart-insight [data-ci-center="${ck}"], #gate-detail [data-center="${ck}"]`)
      .forEach(el => el.classList.add('row-lit'));
  }
}

// Forward direction: hovering a data row lights its gate(s) on the bodygraph.
// Mouse/pen only — on touch the tap opens the detail (which pins the selection).
function wireRowHover(el, gateNum) {
  el.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    detailGraph()?.highlightGate?.(gateNum);
    if (el.classList.contains('foundation-clickable')) {
      el.parentElement?.querySelectorAll('.foundation-clickable.row-lit').forEach(node => {
        if (node !== el) node.classList.remove('row-lit');
      });
    }
  });
  el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') detailGraph()?.highlightGate?.(null); });
}

function wireCenterHover(el, centerKey) {
  el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') bodygraphApi?.highlightCenter?.(centerKey); });
  el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') bodygraphApi?.highlightCenter?.(null); });
}

function renderFoundation(chart, sensitivity = null, birth = null) {
  const panel = document.getElementById('foundation-panel');

  let reliabilityHtml = '';
  // The MOST consequential caveat: a noon-guess chart can be genuinely
  // wrong about Type/Authority/Profile — say so calmly and prominently.
  if (birth?.timeUnknown) {
    reliabilityHtml = `
      <div class="reliability reliability-caution">
        <span class="reliability-dot"></span>
        <span>${t('No birth time — this chart is a best guess using noon. Your <strong>Type, Authority and Profile</strong> can change with the real time, so treat this as a starting point until you find it (birth certificates and baby books are the usual sources).')}</span>
      </div>`;
  }
  if (sensitivity && !birth?.timeUnknown) {
    const solid = sensitivity.shifts.length === 0;
    // Lead with reassurance and what to do — never alarm. (A founder-flagged
    // copy fix: the old wording read as a warning about the chart itself.)
    reliabilityHtml = solid
      ? `
      <div class="reliability reliability-solid">
        <span class="reliability-dot"></span>
        <span>${t('Solid chart — even if your birth time were off by 15 minutes, nothing here would change.')}</span>
      </div>`
      : `
      <div class="reliability reliability-info">
        <span class="reliability-dot"></span>
        <span>${t("Your chart is solid. One fine detail — your <strong>{detail}</strong> — sits right on a line, so it's the only thing a birth time off by 15+ minutes could nudge. Everything else holds no matter what. If your time came from a birth certificate, even that is settled.", { detail: esc(humanList(sensitivity.shifts.map(item => formatDisplay('sensitivity', item)))) })}</span>
      </div>`;
  }
  const crossDisplay = chart.incarnationCross
    ? crossName(chart.incarnationCross)
    : 'Unknown';
  const crossParts = crossDisplay.match(/^(.*?)([（(][^（）()]*[）)])$/s);
  const crossDisplayHtml = crossParts
    ? `${esc(crossParts[1].trim())}<br>${esc(crossParts[2])}`
    : esc(crossDisplay);
  const circuitCounts = { individual: 0, collective: 0, tribal: 0 };
  for (const channel of chart.channels || []) circuitCounts[channelCircuit(channel).group]++;
  const [dominantName, dominantCount] = Object.entries(circuitCounts).sort((a, b) => b[1] - a[1])[0];
  const circuitDominant = dominantCount ? { name: dominantName, channelCount: dominantCount } : null;
  const circuitText = circuitDominant
    ? formatDisplay('circuitSummary', circuitName(circuitDominant.name), countLabel(circuitDominant.channelCount, '{count} channel', '{count} channels'))
    : t('None');

  panel.innerHTML = `
    <div class="panel-title">${t('Foundation')}</div>
    ${reliabilityHtml}
    <div class="foundation-grid">
      <div class="foundation-item" data-knowledge-object="type">
        <div class="label">${t('Type')}</div>
        <div class="value">${esc(typeName(chart.type.name))}</div>
        <div class="detail">${esc(foundationSummary(chart, 'type'))}</div>
      </div>
      <div class="foundation-item" data-knowledge-object="strategy">
        <div class="label">${t('Strategy')}</div>
        <div class="value">${esc(strategy(chart.type.name))}</div>
        <div class="detail">${t('Signature:')} ${esc(signature(chart.type.name))} · ${t('Not-Self:')} ${esc(notSelf(chart.type.name))}</div>
      </div>
      <div class="foundation-item" data-knowledge-object="authority">
        <div class="label">${t('Authority')}</div>
        <div class="value">${esc(authorityLabel(chart))}</div>
        <div class="detail">${esc(foundationSummary(chart, 'authority'))}</div>
      </div>
      <div class="foundation-item" data-knowledge-object="profile">
        <div class="label">${t('Profile')}</div>
        <div class="value">${esc(chart.profile.numbers)} ${esc(profileName(chart.profile.numbers))}</div>
        <div class="detail">${esc(foundationSummary(chart, 'profile'))}</div>
      </div>
      <div class="foundation-item" data-knowledge-object="definition">
        <div class="label">${t('Definition')}</div>
        <div class="value">${esc(definitionName(chart.definition))}</div>
        <div class="detail">${countLabel(chart.centers.definedNames.length, '{count} defined center', '{count} defined centers')}, ${countLabel(chart.channels.length, '{count} channel', '{count} channels')}</div>
      </div>
      <div class="foundation-item">
        <div class="label">${t('Dominant Circuit')}</div>
        <div class="value">${esc(circuitText)}</div>
        <div class="detail">${circuitDominant ? esc(contentText(circuitDominant.theme || '')) : t('No defined channels')}</div>
      </div>
      <div class="foundation-item" data-knowledge-object="cross">
        <div class="label">${t('Incarnation Cross')}</div>
        <div class="value">${crossDisplayHtml}</div>
        <div class="detail">${t('Gates')} ${chart.incarnationCross?.gates?.join(' / ') || '—'}</div>
      </div>
      <div class="foundation-item foundation-variable-card">
        <div class="label">${t('Variable')}</div>
        ${chart.variable?.notation ? `<div class="foundation-variable-notation">${esc(t('Standard notation:'))} ${esc(chart.variable.notation)}</div>` : ''}
        <div class="value foundation-variable-arrows">${[
          { source: 'personality', label: 'Personality', keys: ['motivation', 'perspective'] },
          { source: 'design', label: 'Design', keys: ['determination', 'environment'] }
        ].map(group => `<div class="foundation-variable-group" data-source="${group.source}">
          <div class="foundation-variable-heading">${esc(t(group.label))}</div>
          <div class="foundation-variable-pair">${group.keys.map(key => {
            const item = variableArrows(chart.variable).find(item => item.key === key);
            const label = { motivation: 'Motivation', perspective: 'Perspective', determination: 'Determination', environment: 'Environment' }[key];
            return `<div class="foundation-variable-slot" data-knowledge-variable="${key}"><span data-variable="${key}" data-source="${group.source}" aria-label="${esc(t(label))}">${item ? (item.direction === 'left' ? 'L' : 'R') : '—'}</span><div class="foundation-variable-caption" title="${esc(t(label))}">${esc(t(label))}</div></div>`;
          }).join('')}</div>
        </div>`).join('')}</div>
      </div>
    </div>
  `;
  wireKnowledgeTargets(panel, chart);
}

function wireKnowledgeTargets(container, chart) {
  container.querySelectorAll('[data-knowledge-object], [data-knowledge-variable]').forEach(target => {
    const kind = target.dataset.knowledgeVariable;
    const query = chartKnowledgeQuery(chart, kind ? 'variable' : target.dataset.knowledgeObject, kind);
    if (!query) return;
    target.setAttribute('role', 'button');
    target.tabIndex = 0;
    target.classList.add('knowledge-trigger');
    const open = () => { target.focus({ preventScroll: true }); openKnowledgeDetail(query, kind ? { variable: chart.variable[kind] } : query.objectType === 'definition' ? { definitionComponents: chart.definitionComponents } : null); };
    target.addEventListener('click', open);
    target.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault(); open();
    });
  });
}

// ==========================================
// Gate detail (from bodygraph / list clicks)
// ==========================================
let currentLens = 'hd';

function gateActiveLines(gateNum, chart) {
  const s = new Set();
  for (const g of Object.values(chart.gates.design)) if (g?.gate === gateNum) s.add(g.line);
  for (const g of Object.values(chart.gates.personality)) if (g?.gate === gateNum) s.add(g.line);
  return [...s].sort((a, b) => a - b);
}

/** The interpretive body of the gate card, in the currently selected tradition. */
function renderLens(gateNum) {
  const chart = current.chart;
  const lines = [...new Set([
    ...gateActiveLines(gateNum, chart),
    ...Object.values(detailContext?.transitGates || {}).filter(g => g?.gate === gateNum).map(g => g.line)
  ])].sort((a, b) => a - b);
  return renderSharedGateReading(gateNum, { lens: currentLens, activeLines: lines, selectedLine: null, contentId: 'lens-content', lensAttribute: 'data-lens' });
}

function resetDetail() {
  disposeSharedDetails?.();
  disposeSharedDetails = null;
  detailGraph()?.setPinned?.(null);
  detailHistory = [];
  currentDetail = null;
  detailContext?.onDetailClose?.();
  detailContext = null;
}

export function showTransitDetail(kind, id, context) {
  closeDetailDialog();
  detailContext = context;
  if (kind === 'planet') showPlanetDetail(id);
  else if (kind === 'gate') showGateDetail(id);
  else if (kind === 'channel') showTransitChannelDetail(id);
  else showCenterDetail(id);
}

// A locale redraw keeps the selected detail, lens and navigation history.
// The controller updates the same context object with the new graph API first.
export function refreshTransitDetail(context) {
  if (!currentDetail || detailContext !== context) return;
  const { kind, id } = currentDetail;
  if (kind === 'planet') showPlanetDetail(currentDetail, false);
  else if (kind === 'gate') showGateDetail(id, false, currentDetail.source);
  else if (kind === 'channel') showTransitChannelDetail(id, false);
  else showCenterDetail(id, false);
}

function showTransitChannelDetail(id, pushHistory = true) {
  prepareDetailDialog(document.getElementById('gate-detail'));
  const model = detailContext?.model;
  const channel = channelById(id);
  if (!channel || !current) return;
  id = channel.gates.join('-');
  if (pushHistory && currentDetail) detailHistory.push(currentDetail);
  currentDetail = { kind: 'channel', id };
  const active = (model?.channels || current.chart.channels).some(ch => ch.gates.join('-') === id);
  const source = model && active ? model.channelSource(channel) : active ? 'defined' : 'inactive';
  const detail = document.getElementById('gate-detail');
  detail.innerHTML = `<div class="gate-detail-card"><div class="gate-detail-nav">${detailNav()}</div>
    <div class="gate-detail-body">
      ${renderChannelDetailHeading(id)}
      <span class="circuit-badge transit-source-badge ${source}">${t(model ? active ? TRANSIT_SOURCE_LABELS[source] : 'No complete channel in this view' : active ? 'Defined' : 'Not defined in this view')}</span>
      <p class="gate-detail-desc">${t(active ? 'Both gates are active, so the full channel is connected in this view.' : 'A full channel needs both gates. At least one is inactive in this view.')}</p>
      ${renderSharedChannelReading(id)}
      <div class="transit-channel-gates chart-channel-gates">${channel.gates.map(g => `<button type="button" class="transit-detail-link" data-channel-gate="${g}">
        <span class="transit-detail-gate"><span class="detail-label">${t('Gate {gate}', { gate: g })}</span>${model?.transitGates.has(g) ? `<span class="circuit-badge transit-source-badge">${t('Transit')}</span>` : model?.gateSource(g) === 'inactive' ? `<span class="circuit-badge transit-source-badge inactive">${t('Inactive')}</span>` : ''}</span>
        <span class="detail-name">${esc(gateName(g))}</span>
        <span class="transit-detail-action">${t('View gate details')}</span>
      </button>`).join('')}</div>
      ${model ? `<p class="lens-note">${t('Transit additions do not change your birth chart.')}</p>` : ''}
    </div></div>`;
  decorateBodygraphDetail(detail, currentDetail, current.chart, detailContext);
  openDetailDialog(detail, resetDetail);
  fitDetailSheetHeight(detail.querySelector('.gate-detail-card'));
  detailGraph()?.setPinned?.({ kind: 'channel', id });
  detail.querySelector('.gate-detail-back')?.addEventListener('click', goBack);
  detail.querySelectorAll('[data-channel-gate]').forEach(button => button.addEventListener('click', () => showGateDetail(Number(button.dataset.channelGate))));
}

function goBack() {
  const prev = detailHistory.pop();
  if (!prev) return closeDetailDialog();
  if (prev.kind === 'knowledge') {
    openKnowledgeDetail(prev.query, prev.context);
    document.querySelector(`#gate-detail [data-activation="${prev.activation}"]`)?.focus({ preventScroll: true });
  }
  else if (prev.kind === 'planet') showPlanetDetail(prev, false);
  else if (prev.kind === 'gate') showGateDetail(prev.id, false, prev.source);
  else if (prev.kind === 'channel') showTransitChannelDetail(prev.id, false);
  else showCenterDetail(prev.id, false);
}

// Thin Knowledge → Gate bridge. Release the Knowledge owner before building BodyGraph history.
window.addEventListener('ohd-open-knowledge-gate', event => {
  const { gate, source, returnKnowledge } = event.detail || {};
  if (!current || !Number.isInteger(gate) || gate < 1 || gate > 64 || !returnKnowledge) return;
  prepareDetailDialog(document.getElementById('gate-detail'));
  detailHistory = [{ kind: 'knowledge', ...returnKnowledge }];
  showGateDetail(gate, false, source);
});

function detailNav() {
  return renderDetailNavigation({ canGoBack: detailHistory.length > 0 });
}


/** A planetary point is a separate detail from the gate it currently activates. */
export function showPlanetDetail({ source, planet, activation } = {}, pushHistory = true) {
  prepareDetailDialog(document.getElementById('gate-detail'));
  if (!current || !['design', 'personality', 'transit'].includes(source) || !planet) return;
  const resolved = source === 'transit'
    ? detailContext?.transitGates?.[planet]
    : current.chart.gates[source]?.[planet];
  activation = resolved || activation;
  if (!activation?.gate || !activation?.line) return;
  if (pushHistory && currentDetail) detailHistory.push(currentDetail);
  currentDetail = { kind: 'planet', id: planet, source, planet, activation };
  const detail = document.getElementById('gate-detail');
  const prevH = !detail.classList.contains('hidden') && window.innerWidth <= PHONE_MAX_WIDTH
    ? detail.querySelector('.gate-detail-card')?.offsetHeight ?? null : null;
  const sourceLabel = t(source === 'transit' ? 'Transit' : source === 'design' ? 'Design' : 'Personality');
  const pointName = planetName(planet);
  const gateLine = formatDisplay('planetGateLine', activation.gate,
    hexagramName(activation.gate), activation.line);
  const substructure = ['color', 'tone', 'base'].every(key => Number.isFinite(activation[key]))
    ? `<dl class="planet-detail-substructure">${t('Color {color} · Tone {tone} · Base {base}',
        { color: '', tone: '', base: '' }).split('·').map((label, index) => {
        const value = activation[['color', 'tone', 'base'][index]];
        return `<div class="planet-detail-substructure-item"><dt>${esc(label.trim())}</dt><dd>${esc(value)}</dd></div>`;
      }).join('')}</dl>` : '';
  detail.innerHTML = `<div class="gate-detail-card planet-detail-card"><div class="gate-detail-nav">${detailNav()}</div>
    <div class="gate-detail-body" data-detail-kind="planet" data-planet="${esc(planet)}" data-source="${esc(source)}">
      <div class="detail-label">${esc(sourceLabel)} · ${esc(t('Planetary Activations'))}</div>
      <div class="detail-name planet-detail-title"><span class="planet-detail-glyph" aria-hidden="true">${esc(PLANET_GLYPHS[planet] || '')}</span><span class="planet-detail-name">${esc(pointName)}</span></div>
      ${renderPlanetReading(planet, getLocale())}
      <section class="planet-activation"><div class="planet-activation-label">${esc(t('Current activation'))}</div>
      <button type="button" class="transit-detail-link planet-detail-gate" data-planet-gate="${activation.gate}"
        aria-label="${esc(gateLine)}">
        <strong>${esc(gateLine)}</strong>
        <span class="transit-detail-action">${esc(t('View gate details'))}<span aria-hidden="true"> ↗</span></span>
      </button>${substructure}</section>
    </div></div>`;
  decorateBodygraphDetail(detail, currentDetail, current.chart, detailContext);
  openDetailDialog(detail, resetDetail);
  fitDetailSheetHeight(detail.querySelector('.gate-detail-card'), prevH);
  detailGraph()?.setPinned?.({ kind: 'gate', id: activation.gate });
  detail.querySelector('.gate-detail-back')?.addEventListener('click', goBack);
  detail.querySelector('[data-planet-gate]')?.addEventListener('click', () => showGateDetail(activation.gate, true,
    source === 'transit' ? null : { side: source, planet, line: activation.line }));
  detail.querySelector('.gate-detail-close')?.focus({ preventScroll: true });
}

// Shared channel navigation for Gate and Center details.
function renderChannelJump(channel, chart, model = null, sourceGate = null) {
  const key = channel.gates.join('-');
  const active = (model?.channels || chart.channels).some(ch => ch.gates.join('-') === key);
  const source = model && active ? model.channelSource(channel) : active ? 'defined' : 'inactive';
  const statusLabel = model
    ? t(active ? TRANSIT_SOURCE_LABELS[source] : 'No complete channel in this view')
    : t(active ? 'Defined' : 'Not defined in this view');
  const gateStatus = channel.gates.includes(sourceGate);
  const natalStatus = gateStatus && (source === 'defined' || source === 'natal');
  const statusClass = gateStatus
    ? ` tl-activation-label tl-detail-channel-status${natalStatus ? ' tl-activation-natal' : ''}` : '';
  const pairedGate = channel.gates.includes(sourceGate)
    ? channel.gates.find(gate => gate !== sourceGate) : null;
  return `
    <div class="gate-detail-channel">
      ${pairedGate == null ? '' : '<div class="gate-detail-channel-header">'}<button type="button" class="gate-link" data-channel="${key}">${t('Channel {channel}', { channel: key })} · ${esc(channelName(channel.gates))}</button>
      ${renderChannelCircuitBadges(channel)}${pairedGate == null ? '' : '</div>'}
      <span class="circuit-badge transit-source-badge ${source}${statusClass}">${natalStatus ? t('Birth activations') : statusLabel}</span>
      ${pairedGate == null ? '' : `<button type="button" class="gate-detail-paired-gate" data-paired-gate="${pairedGate}"><span><span class="gate-detail-paired-gate-label">${t('Harmonic gate:')}</span> <span class="gate-detail-paired-gate-link"><span class="gate-detail-paired-gate-number">${t('Gate {gate}', { gate: pairedGate })}</span> · <span class="gate-detail-paired-gate-name">${esc(gateName(pairedGate))}</span></span></span></button>`}
    </div>
  `;
}

export function showGateDetail(gateNum, pushHistory = true, source = null) {
  prepareDetailDialog(document.getElementById('gate-detail'));
  if (!current) return;
  if (pushHistory && currentDetail) detailHistory.push(currentDetail);
  currentDetail = { kind: 'gate', id: gateNum, source };
  const { chart } = current;
  const detail = document.getElementById('gate-detail');
  const prevH = !detail.classList.contains('hidden') && window.innerWidth <= PHONE_MAX_WIDTH
    ? detail.querySelector('.gate-detail-card')?.offsetHeight ?? null : null;
  const desc = GATE_DESCRIPTIONS[gateNum];

  const acts = [];
  const lineTag = (line) => LINE_NAMES[line]
    ? formatDisplay('lineTag', line, lineName(line))
    : '';
  for (const [planet, g] of Object.entries(chart.gates.design)) {
    if (g?.gate === gateNum) acts.push(`<span class="bg-tt-design${source?.side === 'design' && source.planet === planet ? ' selected-activation' : ''}">${PLANET_GLYPHS[planet]} ${t('Design')} ${planetName(planet)} — ${gateNum}.${g.line}${lineTag(g.line)}</span>`);
  }
  for (const [planet, g] of Object.entries(chart.gates.personality)) {
    if (g?.gate === gateNum) acts.push(`<span class="bg-tt-personality${source?.side === 'personality' && source.planet === planet ? ' selected-activation' : ''}">${PLANET_GLYPHS[planet]} ${t('Personality')} ${planetName(planet)} — ${gateNum}.${g.line}${lineTag(g.line)}</span>`);
  }

  const transitActs = Object.entries(detailContext?.transitGates || {})
    .filter(([, g]) => g?.gate === gateNum)
    .map(([planet, g]) => `<span>${PLANET_GLYPHS[planet] || ''} ${t('Transit')} ${esc(planetName(planet))} — ${gateNum}.${g.line}${lineTag(g.line)}</span>`);

  const inChannels = channelsForGate(gateNum);
  const channelHtml = inChannels.map(ch => renderChannelJump(ch, chart, detailContext?.model, gateNum)).join('');

  detail.innerHTML = `
    <div class="gate-detail-card">
      <div class="gate-detail-nav">${detailNav()}</div>
      <div class="gate-detail-body">
        ${renderGateDetailHeading(gateNum)}
        ${acts.length ? `<div class="gate-detail-acts">${acts.join('<br>')}</div>` : ''}
        ${detailContext && transitActs.length ? `<div class="gate-detail-transits">${transitActs.join('<br>')}</div>` : ''}
        ${renderLens(gateNum)}
        ${channelHtml}
      </div>
    </div>
  `;
  decorateBodygraphDetail(detail, currentDetail, current.chart, detailContext);
  openDetailDialog(detail, resetDetail);
  fitDetailSheetHeight(detail.querySelector('.gate-detail-card'), prevH);
  detailGraph()?.setPinned?.({ kind: 'gate', id: gateNum });
  detail.querySelector('.gate-detail-back')?.addEventListener('click', goBack);
  disposeSharedDetails = bindSharedObjectDetails(detail, { onLensChange: lens => { currentLens = lens; } });
  detail.querySelectorAll('[data-paired-gate]').forEach(btn => btn.addEventListener('click', () => showGateDetail(Number(btn.dataset.pairedGate))));
  detail.querySelectorAll('[data-channel]').forEach(btn => btn.addEventListener('click', () => showTransitChannelDetail(btn.dataset.channel)));
  detail.querySelector('.gate-detail-close')?.focus({ preventScroll: true });
}

// ==========================================
// Center detail (from bodygraph / centers-panel clicks)
// ==========================================
/** centerKey -> the rich center object, tagged with its defined/undefined/open status. */
function centerObjects() {
  const ce = current.chart.centers;
  const map = {};
  for (const c of ce.defined) map[c.key] = { ...c, status: 'defined' };
  for (const c of ce.undefined) map[c.key] = { ...c, status: c.status || 'undefined' };
  for (const c of ce.open) map[c.key] = { ...c, status: c.status || 'open' };
  return map;
}

export function showCenterDetail(centerKey, pushHistory = true) {
  prepareDetailDialog(document.getElementById('gate-detail'));
  if (!current) return;
  if (pushHistory && currentDetail) detailHistory.push(currentDetail);
  currentDetail = { kind: 'center', id: centerKey };
  const { chart } = current;
  const c = centerObjects()[centerKey];
  if (!c) return;
  const detail = document.getElementById('gate-detail');
  const prevH = !detail.classList.contains('hidden') && window.innerWidth <= PHONE_MAX_WIDTH
    ? detail.querySelector('.gate-detail-card')?.offsetHeight ?? null : null;
  const model = detailContext?.model;
  const definedHere = model?.definedCenters.has(centerKey);
  const natalHere = model?.mode === 'overlay' && model.natalCenters.has(centerKey);
  // Gates that live in this center, active ones marked and clickable.
  const activeSet = model?.activeGates || new Set(chart.gates.all);
  const gatesIn = Object.keys(GATES).map(Number)
    .filter(g => GATES[g].center === centerKey).sort((a, b) => a - b);
  const status = model ? definedHere ? natalHere ? 'defined' : 'transit-defined' : gatesIn.some(gate => activeSet.has(gate)) ? 'undefined' : 'open' : c.status;
  const statusLabel = t(model ? natalHere ? 'Defined in birth chart' : definedHere ? model.mode === 'transit-only' ? 'Defined by transits' : 'Defined with transits' : status === 'open' ? 'Open' : 'Undefined' : status.charAt(0).toUpperCase() + status.slice(1));
  const gateChips = gatesIn.map(g =>
    `<button class="gate-chip ${activeSet.has(g) ? model?.gateSource(g) === 'transit' ? 'transit-active' : 'active' : ''}" data-gate="${g}" title="${t('Gate {gate}', { gate: g })}${GATES[g]?.name ? ' — ' + esc(gateName(g)) : ''}">${g}</button>`).join('');

  // Channels touching this center, marked defined when they're active in the chart.
  const touching = CHANNELS.filter(ch => ch.centers?.includes(centerKey));
  const channelHtml = touching.length ? `
    <div class="center-detail-section">
      <span class="cd-label">${t('Channels through here')}</span>
      <div class="center-channel-links">
        ${touching.map(ch => renderChannelJump(ch, chart, model)).join('')}
      </div>
    </div>` : '';

  detail.innerHTML = `
    <div class="gate-detail-card center-detail-card" data-center="${centerKey}">
      <div class="gate-detail-nav">${detailNav()}</div>
      <div class="gate-detail-body">
        <div class="detail-label">${esc(centerName(centerKey))}</div>
        <div class="detail-name">${esc(contentText(c.theme || c.name))}</div>
        <div class="center-detail-head">
          <span class="center-status ${status}">${statusLabel}</span>
          <span class="center-detail-theme">${t('Center theme')}: ${esc(contentText(c.theme || ''))}${c.biological ? ` · ${t('Biological association')}: ${esc(contentText(c.biological))}` : ''}</span>
        </div>
        <section class="center-reading" aria-label="${esc(t('Center reading'))}"><div class="center-reading-label">${t('Center reading')}</div>
          ${centerReading(centerKey, { status: definedHere || status === 'defined' ? 'defined' : status === 'open' ? 'open' : 'undefined', includeTheme: false })}</section>${centerInsights(centerKey)}
        ${!model && status !== 'defined' && c.notSelfQuestion ? `<p class="center-notself">${esc(contentText(c.notSelfQuestion))}</p>` : ''}
        <div class="center-detail-section">
          <span class="cd-label">${t('Gates here')}</span>
          <div class="gate-chip-row">${gateChips}</div>
        </div>
        ${channelHtml}
      </div>
    </div>
  `;
  decorateBodygraphDetail(detail, currentDetail, current.chart, detailContext);
  openDetailDialog(detail, resetDetail);
  fitDetailSheetHeight(detail.querySelector('.gate-detail-card'), prevH);
  detailGraph()?.setPinned?.({ kind: 'center', id: centerKey });
  detail.querySelector('.gate-detail-back')?.addEventListener('click', goBack);
  detail.querySelectorAll('[data-channel]').forEach(btn => btn.addEventListener('click', () => showTransitChannelDetail(btn.dataset.channel)));
  detail.querySelectorAll('.gate-chip[data-gate]').forEach(btn => {
    btn.addEventListener('click', () => showGateDetail(parseInt(btn.dataset.gate)));
    wireRowHover(btn, parseInt(btn.dataset.gate));
  });
  detail.querySelector('.gate-detail-close')?.focus({ preventScroll: true });
}

/** Release the current chart when its owning person is deleted or invalidated.
 * Storage and person selection remain the caller's responsibility.
 */
export function clearCurrentChart() {
  // Only dismiss our own sheet; other views may own the shared dialog.
  teardownNatalFit();
  const detail = document.getElementById('gate-detail');
  if (detail?.dataset.detailOwner === 'bodygraph') closeDetailDialog();
  if (currentDetail || detailContext || disposeSharedDetails) resetDetail();
  bodygraphApi?.setPinned?.(null);
  bodygraphApi?.highlightGate?.(null);
  bodygraphApi = null;
  current = null;
  currentLens = 'hd';
  detailHistory = [];
  currentDetail = null;
  detailContext = null;
  disposeSharedDetails?.();
  disposeSharedDetails = null;
}

export function getCurrentChart() {
  return current;
}
