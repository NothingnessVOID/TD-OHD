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
import { CENTER_KEYS } from '../lib/center-palette-registry.js';
import { centerGlyph, componentIndexByCenter } from '../lib/panel-graphics/center-glyph.js';
import { authorityIcon } from '../lib/panel-graphics/authority-icons.js';
import { definitionIslands } from '../lib/panel-graphics/definition-islands.js';
import { circuitCounts, dominantCircuits, centerStateCounts, channelsByGroup, channelGroup, gateSourceCounts, activationSlots } from '../lib/panel-graphics/counts.js';
import { projections as activationProjections, fixingCounts } from '../lib/panel-graphics/activations.js';
import { channelTube, hangingTube, emptyTube } from '../lib/panel-graphics/channel-tube.js';
import { segbar, lineLadder, gateGrid, microBar, fixingBadge } from '../lib/panel-graphics/primitives.js';
import { crossQuad, geneKeysLadder } from '../lib/panel-graphics/cross-quad.js';
import { variableQuad } from '../lib/panel-graphics/variable-quad.js';
import { renderPlanetReading } from '../lib/planet-reference.js';
import { renderSharedGateReading, renderSharedChannelReading, bindSharedObjectDetails } from '../lib/shared-object-details.js';
import { PHONE_MAX_WIDTH, PHONE_MEDIA_QUERY } from '../lib/breakpoints.js';
import { graphFitBudget, observeGraphFit } from '../lib/graph-fit.js';

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
  const tab = document.querySelector('.panel-tab.active')?.dataset.panel || 'centers';
  const detail = document.getElementById('gate-detail');
  const open = currentDetail && !detail.classList.contains('hidden');
  const selected = open ? { ...currentDetail } : null;
  const history = detailHistory.map(item => ({ ...item }));
  const lens = currentLens;
  const context = detailContext;
  // A language change is not a close action: preserve feature-owned timing state.
  renderChartView(current, { preserveOtherDialog: true });
  document.querySelectorAll('.panel-tab').forEach(button => button.classList.toggle('active', button.dataset.panel === tab));
  renderPanelContent(tab);
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
  const stageParts = container && ensureNatalStage(container);
  if (!container || !container.closest('.chart-column') || !stageParts) return;
  const { shell, stage, grid } = stageParts;

  // What is left of the sticky column after its own padding and border is the
  // same question every graph surface asks; `graphFitBudget` answers it once.
  // The natal chart has always used this budget whether or not the column is
  // pinned, because its stage is what gives the column its height.
  const apply = () => {
    if (!shell.isConnected) return;
    const cs = getComputedStyle(container);
    const verticalInsets = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
      + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0) + 12;
    const budget = graphFitBudget(container, { fitHeight: true, chrome: verticalInsets });
    const availableHeight = Math.max(1, budget.availableHeight ?? 1);
    const availableWidth = budget.availableWidth;
    const phoneLayout = window.matchMedia(PHONE_MEDIA_QUERY).matches;
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

  natalFitObserver = observeGraphFit(container, apply, {
    fitHeight: true,
    shouldApply: () => !document.getElementById('chart-view')?.classList.contains('hidden'),
    alsoObserve: [container.closest('.chart-layout')]
  });
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

  // --- Foundation + default tab ---
  renderFoundation(chart, data.sensitivity, birth);
  const activeTab = document.querySelector('.panel-tab.active');
  renderPanelContent(activeTab ? activeTab.dataset.panel : 'centers');
  // After the graph and the banner exist, size the natal graph to the height it
  // actually has. Runs once per render and on banner/viewport changes only.
  armNatalFit();
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
      .querySelectorAll(`#panel-content [data-gate="${g}"], #foundation-panel [data-gate="${g}"], #gate-detail [data-gate="${g}"]`)
      .forEach(el => el.classList.add('row-lit'));
  }
  for (const ck of sel.centers || []) {
    document
      .querySelectorAll(`#panel-content [data-center="${ck}"], #gate-detail [data-center="${ck}"]`)
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
  // Sheet column v2: the banner keeps the ritual, the right column becomes an
  // app-like card feed — Profile hero, Authority with its own glyph, Definition,
  // Circuit donut, Cross axis and the four Variable arrows, each card opening
  // the same Knowledge detail as before.
  const summaries = {
    type: foundationSummary(chart, 'type'),
    authority: foundationSummary(chart, 'authority'),
    profile: foundationSummary(chart, 'profile')
  };
  panel.innerHTML = renderFoundationCards(chart, summaries, birth, reliabilityHtml);
  wireKnowledgeTargets(panel, chart);
}

function renderFoundationCards(chart, summaries, birth, reliabilityHtml) {
  const numbers = String(chart.profile?.numbers || '');
  const [personalityLine, designLine] = numbers.split('/').map(Number);
  const components = chart.definitionComponents || [];
  const bandStates = centerStateCounts(chart);
  const authorityId = chart.calculation?.authority?.id ?? chart.authority?.id ?? null;
  const anchor = AUTHORITY_CENTER[authorityId] ?? null;
  const groups = circuitCounts(chart);
  const dominants = dominantCircuits(chart);
  const dominantText = !dominants.length
    ? t('No dominant circuit')
    : dominants.length > 1
      ? t('Tied for most: {names} — {count} channels each', {
        names: formatDisplay('list', dominants.map(group => circuitName(group.key))),
        count: dominants[0].count
      })
      : formatDisplay('circuitSummary', circuitName(dominants[0].key), countLabel(dominants[0].count, '{count} channel', '{count} channels'));
  const cross = chart.incarnationCross;
  const angleShort = { right: 'RA', left: 'LA', juxtaposition: 'JX' }[cross?.angle] || '';
  const crossGates = cross?.gates || [];
  const arms = variableArrows(chart.variable);

  // Circuit pills (official colour coding): one dot per circuit, count and
  // name beside it; the dominant circuit(s) get an ink ring. Tied dominants
  // all keep the ring, so nothing has to be arbitrarily picked.
  const order = ['individual', 'collective', 'tribal'];
  const circuitPills = order.map(key => {
    const count = groups.find(group => group.key === key)?.count || 0;
    const dom = dominants.some(group => group.key === key);
    return `<span class="pc-pill" data-circuit="${key}"${dom ? ' data-dominant="true"' : ''}><i aria-hidden="true"></i><b>${count}</b><em>${esc(circuitName(key))}</em></span>`;
  }).join('');

  const crossGrid = `
    <div class="pg-cross-axis-grid">
      <span></span><span class="pg-cross-rail-label">${esc(t('Personality'))}</span><span class="pg-cross-rail-label">${esc(t('Design'))}</span>
      <span class="pg-cross-rail-label">${esc(planetName('sun'))}</span>
      <div class="pg-cross-mini pg-cross-mini--rail" data-angle="${esc(cross?.angle || '')}" aria-hidden="true">
        ${[0, 2, 1, 3].map(index => `<span class="pg-cross-cell" data-gate="${crossGates[index] ?? ''}" data-side="${index < 2 ? 'personality' : 'design'}">${esc(String(crossGates[index] ?? '—'))}</span>`).join('')}
      </div>
      <span class="pg-cross-rail-label pg-cross-earth">${esc(planetName('earth'))}</span>
    </div>`;

  const variableRow = VARIABLE_ROW.map(({ source, key }) => {
    const item = arms.find(arm => arm.key === key);
    const label = t(VARIABLE_LABEL[key]);
    const dir = item?.direction === 'left' ? 'left' : item?.direction === 'right' ? 'right' : 'none';
    return `<span class="pc-var-slot" data-knowledge-variable="${key}" data-source="${source}" data-dir="${dir}" title="${esc(label)}"><span class="pc-var-arrow-b" aria-hidden="true"></span><span class="pc-var-name">${esc(label)}</span></span>`;
  }).join('');

  return `
    ${reliabilityHtml}
    <div class="pc-feed">
      <div class="pc-card pc-card--profile" data-knowledge-object="profile" title="${esc(summaries.profile || '')}">
        <div class="pc-card-label">${esc(t('Profile'))}</div>
        <div class="pc-profile-main">
          <div class="pc-profile-number">${numbers.split('/').map(esc).join('<i>/</i>')}</div>
          <div class="pc-profile-ladders">${lineLadder({ line: personalityLine, state: 'personality', label: t('Personality') })}${lineLadder({ line: designLine, state: 'design', label: t('Design') })}</div>
        </div>
        <div class="pc-profile-name">${esc(profileName(numbers))}</div>
        ${summaries.profile ? `<p class="pc-card-note">${esc(summaries.profile)}</p>` : ''}
      </div>

      <div class="pc-pair">
        <div class="pc-card pc-card--authority" data-knowledge-object="authority" title="${esc(summaries.authority || '')}">
          <div class="pc-card-label">${esc(t('Authority'))}</div>
          <div class="pc-authority-icon" data-authority="${esc(authorityId || '')}">${authorityIcon(authorityId)}</div>
          <div class="pc-card-value">${esc(authorityLabel(chart))}${anchor ? ` · ${esc(centerName(anchor))}` : ''}</div>
          ${summaries.authority ? `<p class="pc-card-note">${esc(summaries.authority)}</p>` : `<p class="pc-card-note">${esc(t('No single centre anchors this authority'))}</p>`}
        </div>
        <div class="pc-card pc-card--definition" data-knowledge-object="definition">
          <div class="pc-card-label">${esc(t('Definition'))}</div>
          <div class="pc-card-value pc-definition-value">${esc(definitionName(chart.definition))}</div>
          <p class="pc-card-note">${esc(countLabel(components.length, '{count} island', '{count} islands'))} · ${esc(t('{centres} defined centres · {channels} channels', { centres: bandStates.defined, channels: chart.channels?.length || 0 }))}</p>
        </div>
      </div>

      <div class="pc-pair">
        <div class="pc-card pc-card--circuit">
          <div class="pc-card-label">${esc(t('Dominant Circuit'))}</div>
          <div class="pc-circuit-main">
            <div class="pc-circuit-pills">${circuitPills}</div>
            <div class="pc-circuit-copy">
              <div class="pc-card-value" title="${esc(dominantText)}">${esc(dominantText)}</div>
            </div>
          </div>
        </div>
        <div class="pc-card pc-card--cross">
          <div class="pc-card-label">${esc(t('Incarnation Cross'))}</div>
          <div class="pc-cross-grid">${crossGrid}</div>
          <div class="pc-card-value" data-knowledge-object="cross" title="${esc(crossName(cross) || t('None'))}">${esc(crossName(cross) || t('None'))}</div>
          <p class="pc-card-note">${esc(angleShort)} · ${esc(t('Gates'))} ${esc(crossGates.join(' / ') || '—')}</p>
        </div>
      </div>

      <div class="pc-card pc-card--variable">
        <div class="pc-var-head">
          <span class="pc-card-label">${esc(t('Variable'))}</span>
          ${chart.variable?.notation ? `<span class="pc-var-notation" title="${esc(t('Standard notation:'))}">${esc(chart.variable.notation)}</span>` : ''}
        </div>
        <div class="pc-var-arrows">${variableRow}</div>
      </div>
    </div>
  `;
}


// The identity band holds Type, Strategy, Signature / Not-Self, Authority and
// Definition. Everything in it is drawn from the chart contract; the only
// drawing decision is which end of the range the Strategy arc curves toward.
const STRATEGY_ARC = {
  // Wait to respond: the arc gathers inward.
  generator: 'M5 23C10 10 20 10 25 23',
  // Wait to respond, then inform: both directions at once.
  manifestingGenerator: 'M15 5v9M9 11l6-7 6 7M15 25v-9M9 19l6 7 6-7',
  // Inform: the arc opens outward.
  manifestor: 'M5 20C10 5 20 5 25 20M15 3v4M7 7l2 3M23 7l-2 3',
  // Wait for invitation: one directed line.
  projector: 'M4 15h17M15 8l7 7-7 7',
  // Wait a lunar cycle: a closed cycle.
  reflector: 'M15 4a11 11 0 1 0 0 22 11 11 0 1 0 0-22'
};

// Which centre carries each authority. Mental and Lunar authorities are outer
// authorities with no single centre, so the nine-dot track stays empty there.
const AUTHORITY_CENTER = {
  emotional: 'solar', sacral: 'sacral', splenic: 'spleen',
  egoManifested: 'heart', egoProjected: 'heart', selfProjected: 'g',
  mental: null, lunar: null
};

function renderFoundationBand(chart, summaries = {}) {
  const typeId = chart.type?.id || 'generator';
  const arc = STRATEGY_ARC[typeId] || STRATEGY_ARC.generator;
  const authorityId = chart.calculation?.authority?.id ?? chart.authority?.id ?? null;
  const anchor = AUTHORITY_CENTER[authorityId] ?? null;
  const components = chart.definitionComponents || [];
  const bandStates = centerStateCounts(chart);
  const track = CENTER_KEYS.map(key =>
    `<span class="pg-authority-dot" data-center="${key}"${key === anchor ? ' data-anchor="true"' : ''}></span>`).join('');
  return `
    <div class="panel-foundation-band" data-panel-fact="type">
      <div class="pg-strategy-arc" aria-hidden="true">
        <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="${arc}"/></svg>
      </div>
      <div class="pg-identity" data-knowledge-object="type" title="${esc(summaries.type || '')}">
        <div class="pg-type-name">${esc(typeName(chart.type.name))}</div>
        <div class="pg-strategy-line"><span class="pg-band-label">${t('Strategy')}</span>${esc(strategy(chart.type.name))}</div>
        <div class="pg-signals">
          <span class="pg-signal" data-signal="signature"><span class="pg-signal-dot" aria-hidden="true"></span><span class="pg-signal-label">${t('Signature')}</span>${esc(signature(chart.type.name))}</span>
          <span class="pg-signal" data-signal="notself"><span class="pg-signal-dot" aria-hidden="true"></span><span class="pg-signal-label">${t('Not-Self Theme')}</span>${esc(notSelf(chart.type.name))}</span>
        </div>
        ${summaries.type ? `<p class="pg-band-explain">${esc(summaries.type)}</p>` : ''}
      </div>
      <div class="pg-band-stats">
        <div class="pg-band-row" data-panel-fact="authority" data-knowledge-object="authority" title="${esc(summaries.authority || '')}">
          <span class="pg-band-label">${t('Authority')}</span>
          <span class="pg-band-main">
            <span class="pg-band-value">${esc(authorityLabel(chart))}${anchor ? ` · ${esc(centerName(anchor))}` : ''}</span>
            <span class="pg-band-graphic"><span class="pg-authority-track" role="img" aria-label="${esc(anchor ? `${t('Authority centre')}: ${centerName(anchor)}` : t('No single centre anchors this authority'))}">${track}</span></span>
          </span>
          ${summaries.authority ? `<p class="pg-band-explain">${esc(summaries.authority)}</p>` : ''}
          ${anchor ? '' : `<p class="pg-band-explain">${esc(t('No single centre anchors this authority'))}</p>`}
        </div>
        <div class="pg-band-row" data-panel-fact="definition" data-knowledge-object="definition">
          <span class="pg-band-label">${t('Definition')}</span>
          <span class="pg-band-main">
            <span class="pg-band-value">${esc(definitionName(chart.definition))}</span>
            <span class="pg-band-graphic">${definitionIslands(components)}</span>
          </span>
          <p class="pg-band-explain">${esc(countLabel(components.length, '{count} island', '{count} islands'))} · ${esc(t('{centres} defined centres · {channels} channels', { centres: bandStates.defined, channels: chart.channels?.length || 0 }))}</p>
        </div>
      </div>
    </div>`;
}

// The fact rail holds the four facts that read as numbers: Profile, Dominant
// Circuit, Incarnation Cross, Variable. Each graphic sits next to its own text.
// Variable keeps the pre-graphic grouping: Motivation and Perspective belong to
// Personality, Determination and Environment to Design.
const VARIABLE_LABEL = {
  determination: 'Determination', motivation: 'Motivation',
  environment: 'Environment', perspective: 'Perspective'
};
const VARIABLE_GROUPS = [
  { source: 'personality', label: 'Personality', keys: ['motivation', 'perspective'] },
  { source: 'design', label: 'Design', keys: ['determination', 'environment'] }
];
// Sheet column v2: one row of four chunky B-style arrows, personality pair first.
const VARIABLE_ROW = [
  { source: 'personality', key: 'motivation' },
  { source: 'personality', key: 'perspective' },
  { source: 'design', key: 'determination' },
  { source: 'design', key: 'environment' }
];

function renderFoundationFacts(chart, summaries = {}) {
  const numbers = String(chart.profile?.numbers || '');
  const [personalityLine, designLine] = numbers.split('/').map(Number);
  const groups = circuitCounts(chart);
  const dominants = dominantCircuits(chart);
  const dominantText = !dominants.length
    ? t('No dominant circuit')
    : dominants.length > 1
      ? t('Tied for most: {names} — {count} channels each', {
        names: formatDisplay('list', dominants.map(group => circuitName(group.key))),
        count: dominants[0].count
      })
      : formatDisplay('circuitSummary', circuitName(dominants[0].key), countLabel(dominants[0].count, '{count} channel', '{count} channels'));
  const circuitSegbar = segbar(
    groups.map(group => ({ key: group.key, count: group.count })),
    { label: t('Complete channel count distribution') });
  const cross = chart.incarnationCross;
  const angleShort = { right: 'RA', left: 'LA', juxtaposition: 'JX' }[cross?.angle] || '';
  const arms = variableArrows(chart.variable);
  const crossGates = cross?.gates || [];
  return `
    <div class="panel-fact-rail">
      <div class="panel-fact panel-fact--hero" data-panel-fact="profile" data-knowledge-object="profile" title="${esc(summaries.profile || '')}">
        <div class="pg-hero-anchor">
          <div class="panel-fact-label">${t('Profile')}</div>
          <div class="pg-hero-number">${numbers.split('/').map(esc).join('<i class="pg-hero-slash">/</i>')}</div>
          <span class="pg-profile-lines">${lineLadder({ line: personalityLine, state: 'personality', label: t('Personality') })}${lineLadder({ line: designLine, state: 'design', label: t('Design') })}</span>
        </div>
        <div class="pg-hero-copy">
          <div class="pg-hero-name">${esc(profileName(numbers))}</div>
          ${summaries.profile ? `<div class="panel-fact-note pg-fact-summary pg-hero-desc">${esc(summaries.profile)}</div>` : ''}
        </div>
        <button type="button" class="panel-fact-toggle" aria-expanded="false" aria-label="${esc(t('Show details'))}">⋯</button>
      </div>
      <div class="panel-fact-duo">
      <div class="panel-fact panel-fact--circuit" data-panel-fact="circuit">
        <div class="panel-fact-label">${t('Dominant Circuit')}</div>
        <div class="panel-fact-graphic pg-segbar--rail">${circuitSegbar}</div>
        <div class="pg-segbar-legend">${groups.map(group => `<span data-circuit="${esc(group.key)}">${esc(circuitName(group.key))} · ${group.count}</span>`).join('')}</div>
        <div class="panel-fact-value" title="${esc(dominantText)}">${esc(dominantText)}</div>
        <div class="panel-fact-note">${t('Complete channel count distribution')} · ${t('Counted by channel · adds up')}</div>
        <button type="button" class="panel-fact-toggle" aria-expanded="false" aria-label="${esc(t('Show details'))}">⋯</button>
      </div>
      <div class="panel-fact panel-fact--cross" data-panel-fact="cross">
        <div class="panel-fact-label">${t('Incarnation Cross')}</div>
        <div class="panel-fact-graphic">
          <div class="pg-cross-axis-grid">
            <span></span><span class="pg-cross-rail-label">${t('Personality')}</span><span class="pg-cross-rail-label">${t('Design')}</span>
            <span class="pg-cross-rail-label">${esc(planetName('sun'))}</span>
            <div class="pg-cross-mini pg-cross-mini--rail" data-angle="${esc(cross?.angle || '')}" aria-hidden="true">
              ${[0, 2, 1, 3].map(index => `<span class="pg-cross-cell" data-gate="${crossGates[index] ?? ''}" data-side="${index < 2 ? 'personality' : 'design'}">${esc(String(crossGates[index] ?? '—'))}</span>`).join('')}
            </div>
            <span class="pg-cross-rail-label pg-cross-earth">${esc(planetName('earth'))}</span>
          </div>
        </div>
        <button type="button" class="panel-fact-value" data-knowledge-object="cross" title="${esc(crossName(cross) || t('None'))}">${esc(crossName(cross) || t('None'))}</button>
        <div class="panel-fact-note">${esc(angleShort)} · ${esc(t('Gates'))} ${(cross?.gates || []).join(' / ') || '—'}</div>
        <button type="button" class="panel-fact-toggle" aria-expanded="false" aria-label="${esc(t('Show details'))}">⋯</button>
      </div>
      </div>
      <div class="panel-fact panel-fact--strip" data-panel-fact="variable">
        <div class="pg-var-notation-block">
          <div class="panel-fact-label">${t('Variable')}</div>
          <span class="pg-var-notation" title="${esc(t('Standard notation:'))}">${esc(chart.variable?.notation || '—')}</span>
        </div>
        <div class="pg-var-groups">
          ${VARIABLE_GROUPS.map(group => `
            <div class="pg-var-group" data-source="${group.source}">
              <span class="pg-var-group-head">${esc(t(group.label))}</span>
              ${group.keys.map(key => {
                const direction = arms.find(arm => arm.key === key)?.direction;
                const name = t(VARIABLE_LABEL[key]);
                return `<span class="pg-var-slot" data-knowledge-variable="${key}" data-source="${group.source}" title="${esc(name)}" aria-label="${esc(name)} ${direction === 'left' ? '←' : direction === 'right' ? '→' : '—'}"><span class="pg-var-dial pg-var-dir" aria-hidden="true">${direction ? `<span class="pg-var-dial-tri" data-dir="${direction}"></span>` : '—'}</span><span>${esc(name)}</span></span>`;
              }).join('')}
            </div>`).join('')}
        </div>
        <button type="button" class="panel-fact-toggle" aria-expanded="false" aria-label="${esc(t('Show details'))}">⋯</button>
      </div>
    </div>`;
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
    // Rows contain their own label/value spans: a click anywhere inside the
    // trigger opens the detail, but nested controls (buttons, links, inputs)
    // stay their own controls and never activate the row behind them.
    const startedHere = event => target.contains(event.target)
      && !event.target.closest('button, a, input, select, .panel-fact-toggle');
    target.addEventListener('click', event => { if (startedHere(event)) open(); });
    target.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (!startedHere(event)) return;
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

// ==========================================
// Panel tabs
// ==========================================
export function setupPanelTabs() {
  const tabs = document.querySelectorAll('.panel-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderPanelContent(tab.dataset.panel);
    });
  });
}

export function renderPanelContent(panel) {
  if (!current) return;
  const container = document.getElementById('panel-content');
  // Graphics panels own their own one-column flow; the two-up card grid on
  // .panel-content belongs to the list panels that still use it.
  container.classList.toggle('panel-flow', ['centers', 'channels', 'gates', 'planets', 'cross', 'variable'].includes(panel));
  // Leak guard (§10): drop the previous panel's nodes before rebuilding, so
  // listeners attached to them die with them instead of being held by a closure.
  container.replaceChildren();
  switch (panel) {
    case 'centers': renderCentersPanel(container); break;
    case 'channels': renderChannelsPanel(container); break;
    case 'gates': renderGatesPanel(container); break;
    case 'planets': renderPlanetsPanel(container); break;
    case 'variable': renderVariablePanel(container); break;
    case 'cross': renderCrossPanel(container); break;
  }
}

function renderCentersPanel(container) {
  const { chart } = current;
  const counts = centerStateCounts(chart);
  const components = chart.definitionComponents || [];
  const groupIndex = componentIndexByCenter(components);
  const statusLabel = status => t(status === 'defined' ? 'Defined' : status === 'undefined' ? 'Undefined' : 'Open');
  const statusSegments = [
    { key: 'defined', count: counts.defined },
    { key: 'undefined', count: counts.undefined },
    { key: 'open', count: counts.open }
  ];
  const meaningFor = (c, status) => contentText(status === 'defined'
    ? (c.definedMeaning || c.pressure)
    : status === 'undefined' ? c.undefinedMeaning : c.openMeaning);
  // One line, cut at the first sentence break. The full reading keeps its own
  // expandable block below the row, so nothing is dropped by the shortening.
  const oneLine = text => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const first = clean.split(/[。；;]/)[0];
    return first.length > 24 ? first.slice(0, 24) + '…' : first;
  };
  const row = (c, status) => {
    const detailId = `pg-center-detail-${c.key}`;
    const meaning = meaningFor(c, status);
    return `
    <div class="panel-center-row" data-center="${c.key}" data-state="${status}" data-group="${groupIndex.get(c.key) || ''}">
      ${centerGlyph(c.key, { state: status, group: status === 'defined' ? (groupIndex.get(c.key) || 0) : 0 })}
      <button type="button" class="panel-center-main" aria-label="${esc(formatDisplay('centerAria', centerName(c.key), status, statusLabel(status)))}">
        <span class="panel-center-name">${esc(centerName(c.key))}</span>
        <span class="panel-center-line">${esc(oneLine(meaning))}</span>
      </button>
      <span class="panel-center-state" data-state="${status}" aria-hidden="true"></span>
      <button type="button" class="panel-center-more" aria-expanded="false" aria-controls="${detailId}" aria-label="${esc(t('Show details'))}">＋</button>
      <div class="panel-center-detail" id="${detailId}" hidden>
        <p>${esc(meaning)}</p>
        ${c.notSelfQuestion ? `<p class="center-notself">${esc(contentText(c.notSelfQuestion))}</p>` : ''}
      </div>
    </div>`;
  };
  const group = (key, label, centers) => centers.length ? `
    <div class="pg-center-group" data-group="${key}">
      <div class="pg-group-head">${label}</div>
      ${centers.map(c => row(c, key)).join('')}
    </div>` : '';

  container.innerHTML = `
    <div class="panel-title">${t('Centers')}</div>
    <div class="pg-center-counts">
      ${segbar(statusSegments, { label: t('Centers') })}
      <div class="pg-counts-legend">
        <span data-legend="defined"><i aria-hidden="true"></i>${t('Defined')} ${counts.defined}</span>
        <span data-legend="undefined"><i aria-hidden="true"></i>${t('Undefined')} ${counts.undefined}</span>
        <span data-legend="open"><i aria-hidden="true"></i>${t('Open')} ${counts.open}</span>
      </div>
    </div>
    <p class="panel-intro">${t("Defined centers are consistent energy you radiate. Undefined and open centers are where you take in — and amplify — the energy around you; they're your deepest learning. Click any center to see it on your body.")}</p>
    ${group('defined', t('Defined'), chart.centers.defined)}
    ${group('undefined', t('Undefined'), chart.centers.undefined)}
    ${group('open', t('Open'), chart.centers.open)}
  `;
  // Leak discipline: only nodes inserted by this render are wired, never
  // document or window.
  container.querySelectorAll('.panel-center-row[data-center]').forEach(el => {
    const key = el.dataset.center;
    el.querySelector('.panel-center-main')?.addEventListener('click', () => showCenterDetail(key));
    const more = el.querySelector('.panel-center-more');
    const detail = el.querySelector('.panel-center-detail');
    more?.addEventListener('click', () => {
      const open = more.getAttribute('aria-expanded') !== 'true';
      more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? '－' : '＋';
      more.setAttribute('aria-label', t(open ? 'Hide details' : 'Show details'));
      detail.hidden = !open;
    });
    wireCenterHover(el, key);
  });
}

function renderChannelsPanel(container) {
  const { chart } = current;
  const activeSet = new Set(chart.gates.all);
  const groups = channelsByGroup(chart);
  const counts = circuitCounts(chart);
  const dominants = dominantCircuits(chart);
  const total = chart.channels.length;

  // Hanging gates: for every channel where exactly one gate is active, the
  // active gate hangs toward the absent partner. Gates in several channels
  // (10, 20, 34, 57) hang toward several partners at once.
  const hangingMap = new Map();
  for (const ch of CHANNELS) {
    const [a, b] = ch.gates;
    if (activeSet.has(a) && !activeSet.has(b)) (hangingMap.get(a) || hangingMap.set(a, []).get(a)).push({ partner: b, circuit: channelGroup(ch) });
    if (activeSet.has(b) && !activeSet.has(a)) (hangingMap.get(b) || hangingMap.set(b, []).get(b)).push({ partner: a, circuit: channelGroup(ch) });
  }
  const hanging = [...hangingMap.entries()]
    .map(([gate, partners]) => ({ gate, partners: partners.sort((x, y) => x.partner - y.partner) }))
    .sort((x, y) => x.gate - y.gate);

  const dominantText = !dominants.length
    ? t('No dominant circuit')
    : dominants.length > 1
      ? t('Tied for most: {names} — {count} channels each', {
        names: formatDisplay('list', dominants.map(group => circuitName(group.key))),
        count: dominants[0].count
      })
      : formatDisplay('circuitSummary', circuitName(dominants[0].key), countLabel(dominants[0].count, '{count} channel', '{count} channels'));

  const channelRow = channel => {
    const key = `${channel.gates[0]}-${channel.gates[1]}`;
    const desc = CHANNEL_DESCRIPTIONS[key];
    const group = channelGroup(channel);
    const centersTitle = formatDisplay('channelCenters', channel.centers, channel.centers.map(centerName));
    return `
      <div class="panel-channel-row" data-gate="${channel.gates[0]}" data-circuit="${group}" data-expanded="false">
        <button type="button" class="panel-channel-main" aria-expanded="false">
          <span class="panel-channel-tube">${channelTube(channel, activeSet, group, `${key} ${channelName(channel.gates)}`)}</span>
          <span class="panel-channel-text">
            <span class="panel-channel-name">${esc(channelName(channel.gates))} ${formatDisplay('parentheses', key)}</span>
            <span class="panel-channel-meta">
              <span class="panel-channel-theme">${esc(contentText(channel.theme))}</span>
              ${renderChannelCircuitBadges(channel)}
            </span>
          </span>
        </button>
        <div class="panel-channel-detail" hidden title="${esc(centersTitle)}">
          <p class="panel-channel-centers">${esc(contentText(channel.theme))} · ${esc(centersTitle)}</p>
          ${desc ? `<p>${esc(desc.description)}</p><p><em>${esc(desc.whenDefined)}</em></p>` : ''}
        </div>
      </div>`;
  };

  const groupSection = ({ key, count }) => {
    if (!count) return '';
    return `
      <div class="pg-channel-group" data-group="${key}">
        <div class="pg-channel-group-head">
          <span class="pg-channel-group-name">${esc(circuitName(key))}</span>
        </div>
        ${groups[key].map(channelRow).join('')}
      </div>`;
  };

  const hangingRow = ({ gate, partners }) => {
    const first = partners[0];
    const labels = partners.map(item => item.partner).join(' · ');
    return `
      <button type="button" class="panel-hanging-row" data-gate="${gate}" aria-label="${esc(`${t('Gate {gate}', { gate })} → ${labels}`)}">
        <span class="panel-hanging-tube">${hangingTube(gate, first.partner, activeSet, first.circuit, labels)}</span>
        <span class="panel-hanging-gate">${t('Gate {gate}', { gate })}</span>
        <span class="panel-hanging-arrow" aria-hidden="true">→</span>
        <span class="panel-hanging-partner">${labels}</span>
      </button>`;
  };

  const emptyState = `
    <div class="pg-channel-empty">
      <div class="pg-channel-empty-tube" >${emptyTube('individual', t('No complete channels in this chart'))}</div>
      <div>
        <div class="pg-channel-empty-title">${t('No complete channels in this chart')}</div>
        <p class="panel-intro">${t('No defined channels — as a Reflector, all of your gates are "hanging" gates that complete through the people and transits around you.')}</p>
      </div>
    </div>`;

  container.innerHTML = `
    <div class="panel-title">${t('Channels ({count} defined)', { count: total })}</div>
    <p class="pg-panel-note">${t('Natal · counted by channel · adds up')}</p>
    ${total ? `
    <div class="pg-channel-summary">
      ${segbar(counts.map(group => ({ key: group.key, count: group.count })), { label: t('Complete channel count distribution') })}
      <div class="pg-counts-legend">
        ${counts.map(group => `<span data-legend="${group.key}"><i aria-hidden="true"></i>${esc(circuitName(group.key))}</span>`).join('')}
      </div>
      <p class="pg-panel-note">${t('Complete channel count distribution')}</p>
      <p class="pg-channel-dominant">${t('Dominant Circuit')}: ${dominantText}</p>
    </div>
    ${counts.map(groupSection).join('')}` : `
    <div class="pg-channel-summary">
      ${segbar(counts.map(group => ({ key: group.key, count: group.count })), { label: t('Complete channel count distribution') })}
      <p class="pg-panel-note">${t('Complete channel count distribution')}</p>
    </div>
    ${emptyState}`}
    ${hanging.length ? `
      <div class="panel-title pg-hanging-title">${t('Hanging Gates ({count})', { count: hanging.length })}</div>
      <p class="panel-intro">${t("Active gates waiting for their harmonic partner — you're drawn to people who carry the other half.")}</p>
      <div class="pg-hanging-list">
        ${hanging.map(hangingRow).join('')}
      </div>
    ` : ''}
  `;
  // Only the nodes this render created are wired; no document/window listeners.
  container.querySelectorAll('.panel-channel-row').forEach(row => {
    const toggle = () => {
      const detail = row.querySelector('.panel-channel-detail');
      const open = row.dataset.expanded !== 'true';
      row.dataset.expanded = String(open);
      row.querySelector('.panel-channel-main')?.setAttribute('aria-expanded', String(open));
      if (detail) detail.hidden = !open;
    };
    row.querySelector('.panel-channel-main')?.addEventListener('click', toggle);
    wireRowHover(row, parseInt(row.dataset.gate));
  });
  container.querySelectorAll('.panel-hanging-row[data-gate]').forEach(row => {
    row.addEventListener('click', () => showGateDetail(parseInt(row.dataset.gate)));
    wireRowHover(row, parseInt(row.dataset.gate));
  });
}

function renderGatesPanel(container) {
  const { chart } = current;
  // One construction: the record list and both projections come from the same
  // fixing pass, so this panel never resolves a line fixing twice.
  const { list: activations, byGate: gateMap } = activationProjections(chart);
  const sources = gateSourceCounts(chart, activations);
  const sourceOf = gate => sources.both.includes(gate) ? 'both'
    : sources.onlyDesign.includes(gate) ? 'design'
    : sources.onlyPersonality.includes(gate) ? 'personality' : 'none';
  const sourceLabel = { both: t('Both sides'), design: t('Design'), personality: t('Personality'), none: t('None') };
  const sideLabel = { design: t('Design'), personality: t('Personality') };
  const cells = Array.from({ length: 64 }, (_, index) => ({ gate: index + 1, state: sourceOf(index + 1) }));
  const summary = t('{gates} gates · {both} both · {design} design · {personality} personality', {
    gates: sources.total,
    both: sources.both.length,
    design: sources.onlyDesign.length,
    personality: sources.onlyPersonality.length
  });
  const activationTotal = activations.length;

  const pill = gate => {
    const list = gateMap.get(gate) || [];
    const lines = [...new Set(list.map(record => record.line))].sort((a, b) => a - b);
    const source = sourceOf(gate);
    const desc = GATE_DESCRIPTIONS[gate];
    const name = desc?.keynote || GATES[gate]?.name || '';
    // Every activation keeps its own side, planet and line as visible text. The
    // record list is not collapsed: the pre-graphic panel showed them inline, and
    // hiding them behind a toggle would trade a hard constraint for tidiness.
    const acts = list.map(record => `
        <span class="act-${record.side}"><span class="pg-gate-act-side">${esc(sideLabel[record.side])}</span>${PLANET_GLYPHS[record.planet] ?? ''} ${esc(planetName(record.planet))} ${gate}.${record.line}</span>`).join('');
    const ariaPlanets = list
      .map(record => `${sideLabel[record.side]} ${planetName(record.planet)} ${gate}.${record.line}`)
      .join(' · ');
    return `
      <div class="panel-gate-row" data-gate="${gate}" data-source="${source}">
        <button type="button" class="panel-gate-pill" data-gate="${gate}" data-source="${source}"
          title="${esc(`${t('Gate {gate}: {name}', { gate, name })} · ${sourceLabel[source]}`)}"
          aria-label="${esc(`${t('Gate {gate}: {name}', { gate, name })} — ${sourceLabel[source]} — ${ariaPlanets}`)}">
          <span class="panel-gate-number">${gate}</span>
          <span class="panel-gate-name">${esc(name)}</span>
          ${lineLadder({ lines, orientation: 'horizontal', label: lines.map(line => t('Line {line}', { line })).join(' ') })}
          <span class="panel-gate-lines">${lines.map(line => `· ${line}`).join(' ')}</span>
        </button>
        <div class="panel-gate-acts">${acts}</div>
      </div>`;
  };

  container.innerHTML = `
    <div class="panel-title">${t('{gates} gates ({activations} activations)', { gates: sources.total, activations: activationTotal })}</div>
    <p class="pg-panel-note">${t('Counted by gate · de-duplicated within')}</p>
    <div class="pg-gate-overview">
      <div class="pg-gate-grid-head"><span>${esc(summary)}</span></div>
      ${gateGrid(cells, {
        label: summary,
        title: cell => `${t('Gate {gate}', { gate: cell.gate })} · ${sourceLabel[cell.state]}`
      })}
      <p class="pg-panel-note">${t('Blank = not activated')}</p>
    </div>
    <p class="panel-intro"><span class="act-design">${t('Design')}</span> ${t('(unconscious, body)')} · <span class="act-personality">${t('Personality')}</span> ${t('(conscious, mind). Click a gate for detail.')}</p>
    <div class="pg-gate-list">
      ${sources.all.map(pill).join('')}
    </div>
  `;
  // The grid is presentational: hover previews on the graph and lights the pill,
  // the pill stays the only click target (8 × 8 px is not a tap target).
  container.querySelectorAll('.pg-gate-cell[data-gate]').forEach(cell => {
    const gate = parseInt(cell.dataset.gate);
    cell.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      bodygraphApi?.highlightGate?.(gate);
    });
    cell.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'touch') bodygraphApi?.highlightGate?.(null);
    });
  });
  container.querySelectorAll('.panel-gate-row[data-gate]').forEach(row => {
    row.querySelector('.panel-gate-pill')
      ?.addEventListener('click', () => showGateDetail(parseInt(row.dataset.gate)));
    wireRowHover(row, parseInt(row.dataset.gate));
  });
}

function renderPlanetsPanel(container) {
  const { chart } = current;
  // Both tabs project the same record list, so a planet row and a gate pill can
  // never disagree about a line or a fixing state.
  const { list, byPlanet: planetMap } = activationProjections(chart);
  const fixings = fixingCounts(list);
  const total = activationSlots();
  const fixingLabel = state => t({
    exalted: 'Exalted', detriment: 'Detriment', juxtaposed: 'Juxtaposed', none: 'No polarity', unknown: 'Not computable'
  }[state] || 'Not computable');
  const ctbText = record => (record && record.color != null
    ? `${record.color}.${record.tone}.${record.base}`
    : '—');

  const activationCell = (record, side, planet) => {
    if (!record) return `<span class="panel-planet-act" data-side="${side}" data-empty="true">—</span>`;
    return `<button type="button" class="panel-planet-act" data-side="${side}" data-gate="${record.gate}"
      data-planet="${planet}" data-line="${record.line}" title="${esc(`${gateName(record.gate)} · ${t('Color · Tone · Base')} ${ctbText(record)}`)}">
      <span class="panel-planet-value">${record.gate}.${record.line}</span>
      ${fixingBadge(record.fixing, { label: `${t('Exalted')} / ${t('Detriment')} — ${fixingLabel(record.fixing)}` })}
    </button>`;
  };

  const rows = PLANET_ORDER.map(planet => {
    const sides = planetMap.get(planet) || { design: null, personality: null };
    const d = sides.design;
    const p = sides.personality;
    const overlap = d && p && d.gate === p.gate;
    return `
      <div class="panel-planet-row" data-planet="${planet}" data-expanded="false">
        <span class="pg-planet-bar" data-side="design" aria-hidden="true"></span>
        ${activationCell(d, 'design', planet)}
        <span class="panel-planet-ctb">${microBar(d?.color ?? null, { label: `c.t.b ${ctbText(d)}` })}</span>
        <button type="button" class="panel-planet-id" aria-expanded="false">
          <span class="panel-planet-glyph" aria-hidden="true">${PLANET_GLYPHS[planet]}</span>
          <span class="panel-planet-name">${esc(planetName(planet))}</span>
        </button>
        <span class="panel-planet-ctb">${microBar(p?.color ?? null, { label: `c.t.b ${ctbText(p)}` })}</span>
        ${activationCell(p, 'personality', planet)}
        <span class="pg-planet-bar" data-side="personality" aria-hidden="true"></span>
        <span class="pg-planet-overlap"${overlap ? ' data-on="true"' : ''} aria-hidden="true">${overlap ? '=' : ''}</span>
        <div class="panel-planet-detail" hidden>
          <p class="panel-planet-detail-side">
            <span>${t('Design')} c.t.b ${esc(ctbText(d))}</span>
            ${microBar(d?.color ?? null, { label: `c.t.b ${ctbText(d)}` })}
          </p>
          <p class="panel-planet-detail-side">
            <span>${t('Personality')} c.t.b ${esc(ctbText(p))}</span>
            ${microBar(p?.color ?? null, { label: `c.t.b ${ctbText(p)}` })}
          </p>
        </div>
      </div>`;
  }).join('');

  const dDate = chart.positions?.design?.date;
  container.innerHTML = `
    <div class="panel-title">${t('{actual} / {total} activations', { actual: list.length, total })}</div>
    <p class="pg-panel-note">${t('Planetary Activations')} · ${t('Color · Tone · Base')}</p>
    ${fixings.unknown ? `<p class="pg-panel-note pg-planet-unknown">${t('{count} unknown', { count: fixings.unknown })}</p>` : ''}
    <p class="panel-intro">${t('Each planet activates a gate and line. Design was calculated ~88 days before birth{date} — your unconscious, body-level themes. Personality is the moment of birth — who you know yourself to be.', { date: dDate ? esc(formatDisplay('inlineDate', dDate)) : '' })}</p>
    <div class="planet-table pg-planet-table">
      <div class="panel-planet-row panel-planet-head">
        <span class="pg-planet-bar" aria-hidden="true"></span>
        <span class="panel-planet-act act-design">${t('Design')}</span>
        <span class="panel-planet-ctb">c.t.b</span>
        <span class="panel-planet-id"><span class="panel-planet-name"></span></span>
        <span class="panel-planet-ctb">c.t.b</span>
        <span class="panel-planet-act act-personality">${t('Personality')}</span>
        <span class="pg-planet-bar" aria-hidden="true"></span>
        <span class="pg-planet-overlap" aria-hidden="true"></span>
      </div>
      ${rows}
    </div>
  `;
  container.querySelectorAll('.panel-planet-row[data-planet]').forEach(row => {
    const planet = row.dataset.planet;
    row.querySelectorAll('.panel-planet-act[data-gate]').forEach(cell => {
      const gate = parseInt(cell.dataset.gate);
      // The click reads the record the row was drawn from, so the detail cannot
      // disagree with the gate.line printed on the row.
      cell.addEventListener('click', () => {
        const record = (planetMap.get(planet) || {})[cell.dataset.side];
        if (!record) return;
        showPlanetDetail({ source: record.side, planet: record.planet, activation: record });
      });
      wireRowHover(cell, gate);
    });
    const identity = row.querySelector('.panel-planet-id');
    const detail = row.querySelector('.panel-planet-detail');
    identity?.addEventListener('click', () => {
      const open = row.dataset.expanded !== 'true';
      row.dataset.expanded = String(open);
      identity.setAttribute('aria-expanded', String(open));
      if (detail) detail.hidden = !open;
    });
  });
}

function renderVariablePanel(container) {
  const v = current.chart.variable;
  const quadOptions = {
    variable: v,
    slotName: slot => variable(slot)[0],
    caption: key => t({ determination: 'Determination', motivation: 'Motivation', environment: 'Environment', perspective: 'Perspective' }[key]),
    shortLabel: key => t(`Variable tag: ${key}`),
    // A null direction must not fall into the "right" branch: that would state a
    // direction the data never gave. It gets its own wording instead.
    directionLabel: direction => t(direction === 'left' ? 'Left — focused'
      : direction === 'right' ? 'Right — receptive' : 'Direction not computable')
  };
  // §12: when the whole field is missing the panel still draws the four dashed
  // corner slots. Returning prose here would bypass the empty-state graphic and
  // leave "an empty corner is information" unimplemented on the real path.
  if (!v) {
    container.innerHTML = `
      <div class="panel-title">${t('Variable')}</div>
      <p class="pg-panel-note">${t('Variable data unavailable.')}</p>
      ${variableQuad(quadOptions)}`;
    return;
  }
  const arrowSymbol = (dir) => dir === 'left' ? '←' : dir === 'right' ? '→' : '—';
  const card = (key, slot, label, sub) => {
    if (!slot) return '';
    const direction = variableDirection(slot);
    const [name] = variable(slot);
    const knowledgeSummary = slot.valueId ? getKnowledgeSummary({ domain: 'human-design', objectType: 'variable', objectId: `${key}:${slot.valueId}` }) : null;
    return `
    <div class="arrow-card" data-variable="${key}" data-knowledge-variable="${key}">
      <div class="arrow-direction" data-source="${key === 'determination' || key === 'environment' ? 'design' : 'personality'}"><span class="variable-direction-symbol">${arrowSymbol(direction)}</span> <span class="arrow-side">${t(direction === 'left' ? 'Left — focused' : direction === 'right' ? 'Right — receptive' : 'Direction not computable')}</span></div>
      <div class="arrow-label">${label}</div>
      <div class="arrow-type">${esc(name)}</div>
      <div class="arrow-desc">${esc(knowledgeSummary?.content ?? '')}</div>
      <div class="arrow-meta">${t('Color {color} · Tone {tone} · Base {base}', { color: slot.color, tone: slot.tone, base: slot.base })}</div>
      ${sub || ''}
    </div>
  `; };
  const quad = variableQuad(quadOptions);
  container.innerHTML = `
    <div class="panel-title">${t('Variable')}</div>
    <p class="panel-intro">${t('The four arrows describe how your body and mind are tuned: how to eat, where to thrive, how you see, and what moves you. Subtle, advanced territory — explore slowly.')}</p>
    ${quad}
    <div class="variable-grid">
      ${card('determination', v.determination, t('Determination'), v.determination?.cognition ? `<div class="arrow-desc" style="margin-top:8px"><strong>${t('Cognition:')}</strong> ${esc(cognition(v.determination.cognition.name))} ${v.determination.cognition.description ? `${formatDisplay('separator', 'cognition')} ${esc(contentText(v.determination.cognition.description))}` : ''}</div>` : '')}
      ${card('motivation', v.motivation, t('Motivation'))}
      ${card('environment', v.environment, t('Environment'))}
      ${card('perspective', v.perspective, t('Perspective'))}
    </div>
  `;
  wireKnowledgeTargets(container, current.chart);
}

function renderCrossPanel(container) {
  const { chart, geneKeys } = current;
  const cross = chart.incarnationCross;
  // §12: a missing cross still draws four neutral dashed palaces rather than
  // prose, so "no gate here" stays visible as a position, not as a sentence.
  if (!cross) {
    container.innerHTML = `
      <div class="panel-title">${t('Incarnation Cross')}</div>
      <p class="pg-panel-note">${t('Cross data unavailable.')}</p>
      ${crossQuad({
        gates: [],
        angle: '',
        nameFor: () => '',
        labelFor: label => t(label),
        gateLabel: gate => t('Gate {gate}', { gate }),
        angleLabel: ''
      })}`;
    return;
  }

  const quarter = GATE_DESCRIPTIONS[chart.gates.personality.sun?.gate]?.quarter;
  const angleName = contentText(cross.angleName || '');
  const quad = crossQuad({
    gates: cross.gates || [],
    angle: cross.angle,
    nameFor: gate => gateName(gate),
    labelFor: label => t(label),
    gateLabel: gate => t('Gate {gate}', { gate }),
    angleLabel: `${angleName}${quarter ? ` · ${t('Quarter of {quarter}', { quarter: contentText(quarter) })}` : ''}`
  });

  const spheres = geneKeys ? ['lifeWork', 'evolution', 'radiance', 'purpose'].flatMap(sphere => {
    const slot = geneKeys.activationSequence?.[sphere];
    if (!slot) return [];
    return [{
      id: sphere,
      key: slot.keyLine || slot.key,
      label: contentText(slot.sphere),
      words: {
        shadow: geneKeyTerm(slot.key, 'shadow', { bilingual: false }) || slot.shadow,
        gift: geneKeyTerm(slot.key, 'gift', { bilingual: false }) || slot.gift,
        siddhi: geneKeyTerm(slot.key, 'siddhi', { bilingual: false }) || slot.siddhi
      }
    }];
  }) : [];
  const ladder = spheres.length ? geneKeysLadder({
    spheres,
    tierLabel: tier => t(`Gene Keys tier: ${tier}`),
    keyLabel: key => t('Key {key}', { key })
  }) : '';

  container.innerHTML = `
    <div class="panel-title">${t('Incarnation Cross')}</div>
    <button type="button" class="panel-heading pg-cross-heading" data-knowledge-object="cross">${esc(crossName(cross))}</button>
    ${quad}
    <button type="button" class="knowledge-jump-card" data-cross-basics><span>${esc(t('Incarnation Cross Basics'))}</span><span aria-hidden="true">→</span></button>
    ${ladder ? `
      <div class="pg-gk-section">
        <div class="panel-title">${t('Gene Keys — Activation Sequence')}</div>
        <p class="panel-intro">${t("The same four positions through Richard Rudd's Shadow → Gift → Siddhi lens.")}</p>
        ${ladder}
      </div>` : ''}
  `;
  container.querySelectorAll('.pg-cross-palace[data-gate]').forEach(palace => {
    palace.addEventListener('click', () => showGateDetail(parseInt(palace.dataset.gate)));
    wireRowHover(palace, parseInt(palace.dataset.gate));
  });
  const heading = container.querySelector('.pg-cross-heading');
  heading?.addEventListener('click', () => openKnowledgeDetail(chartKnowledgeQuery(chart, 'cross')));
  container.querySelector('[data-cross-basics]').addEventListener('click', () => openKnowledgeDetail({objectType:'cross',objectId:'introduction'}));
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
