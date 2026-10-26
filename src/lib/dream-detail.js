/**
 * Sleep-chart detail sheets.
 *
 * Reuses the shared dialog shell, headings and interpretive readings, but owns
 * its activation data. The waking detail path in views/chart.js reads that
 * module's own current chart, so reusing it here would answer a question about
 * the sleeping design with the waking chart's activations; AGENTS.md §6 requires
 * the data context to be explicit instead. The interpretive prose still comes
 * from the shared waking content, which is what the DreamRave teaching asks for.
 *
 * Composite (two-person) mode swaps the three-source activation block for
 * ownership, using the same gateOwner/channelDynamic the shared renderer already
 * exposes, so no second colour vocabulary is invented here.
 */

import { openDetailDialog, closeDetailDialog, prepareDetailDialog, fitDetailSheetHeight } from './detail-dialog.js';
import { renderGateDetailHeading, renderChannelDetailHeading, renderDetailNavigation } from './object-detail-heading.js';
import { renderSharedGateReading, renderSharedChannelReading, bindSharedObjectDetails } from './shared-object-details.js';
import { DREAM_CHANNELS, dreamRealmOf, isDreamPortal } from './human-design/dream-topology.js';
import { GATES } from './human-design/catalog.js';
import { dreamGateName, dreamLineTheme, dreamRealmName, dreamTypeName } from './dream-vocabulary.js';
import { centerName, channelName, planetName } from './vocabulary.js';
import { PLANET_GLYPHS } from './planet-reference.js';
import { t, formatDisplay } from './i18n.js';
import { esc } from './format.js';

/** The three activation sources of a single sleep design, in display order. */
const SOURCES = [
  { key: 'personality', label: 'Awake personality' },
  { key: 'design', label: 'Sleep design' },
  { key: 'transit', label: 'Night sky' }
];

const gateCenter = gate => GATES[gate]?.center;

/**
 * The sleep wording for the four channel states `channelSource()` returns.
 * `TRANSIT_SOURCE_LABELS` says "Birth chart", which is the waking chart's own
 * claim; the same four structural states in a sleep design are described here.
 */
const SLEEP_CHANNEL_STATUS = {
  natal: 'Complete in the sleep design',
  completed: 'Completed by the night sky',
  transit: 'Night sky only',
  inactive: 'Not complete in the sleep design'
};
const bothStatus = complete => complete ? 'Complete across both sleep designs' : 'Not complete across both sleep designs';

const chip = (source, gate) => `<span class="dream-planet-chip"><i aria-hidden="true">${PLANET_GLYPHS[source.planet] || ''}</i>${esc(planetName(source.planet))} ${gate}.${source.line}</span>`;

function sourceRows(activations, gate) {
  const rows = SOURCES
    .map(({ key, label }) => ({ key, label, list: activations[key] || [] }))
    .filter(row => row.list.length);
  if (!rows.length) return `<p class="dream-detail-empty">${esc(t('No activation in the sleep design.'))}</p>`;
  return `<div class="dream-detail-sources">${rows.map(row => `
    <div class="dream-detail-source dream-detail-source-${row.key}">
      <span class="dream-detail-source-label">${esc(t(row.label))}</span>
      <span class="dream-detail-source-planets">${row.list.map(item => chip(item, gate)).join('')}</span>
    </div>`).join('')}</div>`;
}

/** Lines that are live in this sleep design, across all three sources. */
function activeLines(activations) {
  const lines = new Set();
  for (const { key } of SOURCES) for (const item of activations[key] || []) if (item.line) lines.add(item.line);
  return [...lines].sort((a, b) => a - b);
}

function lineThemeRow(lines) {
  if (!lines.length) return '';
  return `<div class="dream-detail-lines">${lines.map(line =>
    `<span class="dream-detail-line"><span class="dream-detail-line-no">${esc(t('Line {line}', { line }))}</span>
      <span class="dream-detail-line-theme">${esc(dreamLineTheme(line))}</span></span>`).join('')}</div>`;
}

function dreamTags(gate) {
  const realm = dreamRealmOf(gate);
  return `<div class="dream-detail-tags">
    ${realm ? `<span class="dream-detail-tag dream-detail-tag-${realm}">${esc(dreamRealmName(realm))}</span>` : ''}
    <span class="dream-detail-tag dream-detail-tag-name">${esc(dreamGateName(gate))}</span>
    ${isDreamPortal(gate) ? `<span class="dream-detail-tag dream-detail-tag-portal">${esc(t('Portal'))}</span>` : ''}
  </div>`;
}

/**
 * One controller per sleep-chart render. The host owns the element's placement;
 * this module owns its content, its navigation state and its data context.
 *
 * @param {object} options
 * @param {object} options.dream - computeDreamChart() result (or null in composite mode)
 * @param {object} [options.model] - buildDreamTransitGraph() result, when the night sky is overlaid
 * @param {object} [options.composite] - { labelA, labelB } when two sleep designs share one graph
 * @param {object} [options.a] - person A's dream model, composite mode only
 * @param {object} [options.b] - person B's dream model, composite mode only
 */
export function createDreamDetail(initial = {}) {
  const element = document.createElement('div');
  element.id = 'dream-detail';
  element.className = 'gate-detail hidden';

  // The data context is replaceable: a language or skin redraw hands this same
  // controller the new model instead of building a second sheet, so the element
  // the dialog owns stays in the document and the open card survives.
  let data = { dream: null, model: null, composite: null, a: null, b: null, ...initial };
  let api = null;
  let lens = 'hd';
  let current = null;
  // Selections the reader moved through, so the sheet's Back reaches the card
  // they came from instead of being a button that does nothing.
  const history = [];

  const activationsFor = gate => ({
    personality: data.dream?.gates.byNumber.personality.get(gate) || [],
    design: data.dream?.gates.byNumber.design.get(gate) || [],
    transit: data.dream?.gates.byNumber.transit.get(gate) || []
  });

  /** Composite mode has no night sky; both sleep designs contribute lines. */
  const compositeLinesFor = gate => {
    const lines = new Set();
    for (const item of [data.a, data.b]) {
      if (!item) continue;
      for (const side of ['personality', 'design']) {
        for (const act of item.gates.byNumber[side].get(gate) || []) lines.add(act.line);
      }
    }
    return [...lines].sort((x, y) => x - y);
  };

  function paint(html, selection) {
    prepareDetailDialog(element, 'dream');
    element.innerHTML = html;
    element.classList.remove('hidden');
    api?.setPinned?.(selection);
    bindSharedObjectDetails(element, {
      onLensChange: next => { lens = next; },
      onGateSelect: gate => showGate(gate),
      onChannelSelect: id => showChannel(id),
      onBack: back
    });
    openDetailDialog(element, () => { history.length = 0; api?.setPinned?.(null); },
      { owner: 'dream', label: t('Sleep chart details') });
    // The shared sheet sizes itself to the phone viewport; a card that skipped
    // this would overflow under the nav bar on a narrow screen.
    fitDetailSheetHeight(element.querySelector('.dream-detail-card'));
  }

  /** Reopen the previous selection without pushing it back onto the stack. */
  function back() {
    const previous = history.pop();
    if (!previous) return;
    if (previous.kind === 'gate') showGate(previous.id, false);
    else if (previous.kind === 'channel') showChannel(previous.id, false);
    else showCenter(previous.id, false);
  }

  function card(attrs, body) {
    return `<div class="gate-detail-card dream-detail-card" ${attrs}>
      <div class="gate-detail-nav">${renderDetailNavigation({ canGoBack: history.length > 0 })}</div>
      <div class="gate-detail-body">${body}</div>
    </div>`;
  }

  /** Record where a step came from, unless it is the same selection again. */
  function advance(selection) {
    if (current && (current.kind !== selection.kind || current.id !== selection.id)) history.push(current);
    current = selection;
  }

  function showGate(gate, push = true) {
    if (push) advance({ kind: 'gate', id: gate }); else current = { kind: 'gate', id: gate };
    const lines = data.composite ? compositeLinesFor(gate) : activeLines(activationsFor(gate));
    // In composite mode the ownership block below already lists every channel
    // this gate completes, with the relationship dynamic; a second list driven by
    // `channelSource()` would describe the same channel as "not complete".
    const channels = data.composite ? [] : DREAM_CHANNELS.filter(channel => channel.gates.includes(gate));
    const channelBlock = channels.length ? `
      <h3 class="dream-detail-subhead">${esc(t('Dream channels of this gate'))}</h3>
      <div class="dream-detail-channels">${channels.map(channel => {
        const id = channel.gates.join('-');
        const source = data.model ? data.model.channelSource(channel)
          : data.dream?.channels.some(c => c.gates.join('-') === id) ? 'natal' : 'inactive';
        return `<button type="button" class="dream-detail-channel ${source}" data-shared-channel-select="${id}">
          <span class="dream-detail-channel-id">${esc(id)}</span>
          <span class="dream-detail-channel-name">${esc(channelName(channel.gates))}</span>
          <span class="circuit-badge transit-source-badge ${source}">${esc(t(SLEEP_CHANNEL_STATUS[source]))}</span>
        </button>`;
      }).join('')}</div>` : '';

    const body = data.composite
      ? compositeGateBody(gate)
      : `${dreamTags(gate)}
         ${sourceRows(activationsFor(gate), gate)}
         ${lineThemeRow(lines)}`;

    paint(card(`data-gate="${gate}"`, `
      ${renderGateDetailHeading(gate)}
      ${body}
      ${renderSharedGateReading(gate, { lens, activeLines: lines })}
      ${channelBlock}
    `), { kind: 'gate', id: gate });
  }

  function compositeGateBody(gate) {
    const owner = api?.gateOwner?.(gate);
    const who = owner === 'both' ? `${data.composite.labelA} + ${data.composite.labelB}`
      : owner === 'a' ? data.composite.labelA
        : owner === 'b' ? data.composite.labelB : t('Neither of you');
    const channels = DREAM_CHANNELS.filter(channel => channel.gates.includes(gate));
    const rows = channels.map(channel => {
      const dynamic = api?.channelDynamic?.(channel);
      if (!dynamic) return '';
      return `<div class="dream-detail-channel ${dynamic}">
        <span class="dream-detail-channel-id">${esc(channel.gates.join('-'))}</span>
        <span class="dream-detail-channel-name">${esc(channelName(channel.gates))}</span>
        <span class="dream-detail-channel-dyn">${esc(t(COMPOSITE_DYNAMIC_LABELS[dynamic] || dynamic))}</span>
      </div>`;
    }).filter(Boolean).join('');
    return `${dreamTags(gate)}
      <div class="dream-detail-owner">${esc(t('Carried by'))} <strong>${esc(who)}</strong></div>
      ${rows || `<p class="dream-detail-empty">${esc(t('This gate doesn’t complete a channel between you.'))}</p>`}
      ${compositeTypeRow()}`;
  }

  function compositeTypeRow() {
    const row = (label, item) => item ? `<span class="dream-detail-fact">${esc(label)} ${esc(dreamTypeName(item.type.id))}</span>` : '';
    return `<div class="dream-detail-facts">
      ${row(data.composite.labelA, data.a)}${row(data.composite.labelB, data.b)}
    </div>`;
  }

  function showChannel(id, push = true) {
    const channel = DREAM_CHANNELS.find(item => item.gates.join('-') === id);
    if (!channel) return;
    const key = channel.gates.join('-');
    if (push) advance({ kind: 'channel', id: key }); else current = { kind: 'channel', id: key };
    const source = data.model ? data.model.channelSource(channel)
      : data.dream?.channels.some(item => item.gates.join('-') === key) ? 'natal' : 'inactive';
    const statusLabel = data.composite ? bothStatus(source !== 'inactive') : SLEEP_CHANNEL_STATUS[source];
    const gateRows = channel.gates.map(gate => {
      if (data.composite) {
        const owner = api?.gateOwner?.(gate);
        const who = owner === 'both' ? `${data.composite.labelA} + ${data.composite.labelB}`
          : owner === 'a' ? data.composite.labelA : owner === 'b' ? data.composite.labelB : t('Neither of you');
        return `<div class="dream-detail-gate-row">
          <button type="button" class="dream-detail-gate-link" data-shared-gate-select="${gate}">
            <span class="dream-detail-gate-id">${gate}</span>
            <span class="dream-detail-gate-name">${esc(dreamGateName(gate))}</span>
          </button>
          <span class="dream-detail-gate-owner">${esc(who)}</span>
        </div>`;
      }
      const acts = activationsFor(gate);
      return `<div class="dream-detail-gate-row">
        <button type="button" class="dream-detail-gate-link" data-shared-gate-select="${gate}">
          <span class="dream-detail-gate-id">${gate}</span>
          <span class="dream-detail-gate-name">${esc(dreamGateName(gate))}</span>
        </button>
        ${SOURCES.filter(({ key: k }) => acts[k]?.length).map(({ key: k, label }) =>
          `<span class="dream-detail-gate-src dream-detail-source-${k}">${esc(t(label))} ${acts[k].map(item => `${item.gate}.${item.line}`).join(' ')}</span>`).join('')}
      </div>`;
    }).join('');

    paint(card(`data-channel="${key}"`, `
      ${renderChannelDetailHeading(key)}
      <span class="circuit-badge transit-source-badge ${source}">${esc(t(statusLabel))}</span>
      <div class="dream-detail-centers">${esc(formatDisplay('channelCenters', channel.centers, channel.centers.map(centerName)))}</div>
      ${gateRows}
      ${renderSharedChannelReading(key)}
    `), { kind: 'channel', id: key });
  }

  function showCenter(key, push = true) {
    if (push) advance({ kind: 'center', id: key }); else current = { kind: 'center', id: key };
    if (data.composite) {
      const owner = api?.centerOwner?.(key);
      const tag = owner === 'both' ? t('Both define') : owner === 'a' ? t('{name} defines', { name: data.composite.labelA })
        : owner === 'b' ? t('{name} defines', { name: data.composite.labelB })
          : owner === 'bridged' ? t('Newly defined in the relationship') : t('Undefined');
      paint(card(`data-center="${key}"`, `
        <div class="panel-title">${esc(t('{center} Center', { center: centerName(key) }))}</div>
        <div class="dream-detail-owner">${esc(tag)}</div>
        ${compositeTypeRow()}
      `), { kind: 'center', id: key });
      return;
    }
    const defined = data.dream.centers.defined.has(key);
    const gates = (data.dream?.gates.all || []).filter(gate => gateCenter(gate) === key);
    const gateList = gates.length
      ? `<div class="dream-detail-center-gates">${gates.map(gate => `
          <button type="button" class="dream-detail-gate-link" data-shared-gate-select="${gate}">
            <span class="dream-detail-gate-id">${gate}</span>
            <span class="dream-detail-gate-name">${esc(dreamGateName(gate))}</span>
            <span class="dream-detail-tag dream-detail-tag-${dreamRealmOf(gate)}">${esc(dreamRealmName(dreamRealmOf(gate)))}</span>
          </button>`).join('')}</div>`
      : `<p class="dream-detail-empty">${esc(t('No dream gate is active in this center.'))}</p>`;
    paint(card(`data-center="${key}"`, `
      <div class="panel-title">${esc(t('{center} Center', { center: centerName(key) }))}</div>
      <span class="circuit-badge transit-source-badge ${defined ? 'natal' : 'inactive'}">${esc(t(defined ? 'Defined in sleep' : 'Undefined in sleep'))}</span>
      <h3 class="dream-detail-subhead">${esc(t('Dream gates in this center'))}</h3>
      ${gateList}
    `), { kind: 'center', id: key });
  }

  /** Language and skin changes redraw the open sheet from the same context. */
  function refresh() {
    if (!current || element.classList.contains('hidden')) return;
    if (current.kind === 'gate') showGate(current.id, false);
    else if (current.kind === 'channel') showChannel(current.id, false);
    else showCenter(current.id, false);
  }

  return {
    element,
    setApi: next => { api = next; },
    /** Hand a redraw's model and graph API to this same sheet. */
    update: (next = {}) => {
      data = { ...data, ...next };
      if (next.api !== undefined) api = next.api;
    },
    showGate, showChannel, showCenter, refresh,
    close: () => closeDetailDialog(),
    /** Whether this controller currently owns an open card. */
    get open() { return !!current && !element.classList.contains('hidden'); }
  };
}

const COMPOSITE_DYNAMIC_LABELS = {
  electromagnetic: 'Electromagnetic',
  companionship: 'Companionship',
  compromise: 'Compromise',
  dominance: 'Dominance'
};
