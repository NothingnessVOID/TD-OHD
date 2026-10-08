import { renderChannelCircuitBadges } from '../lib/channel-badges.js';
import { saveTemporaryBirth } from '../lib/temporary-birth.js';
/**
 * Connection view — how two designs interact. Person A is the current
 * chart; Person B comes from saved people or a quick manual entry.
 */

import { openDetailDialog, closeDetailDialog } from '../lib/detail-dialog.js';
import { compareHumanDesign } from '../lib/human-design/connection.js';
import { analyzeConnectionStructure } from '../lib/human-design/connection-structure.js';
import { GATES, CHANNELS } from '../lib/human-design/catalog.js';
import { renderBodygraph } from '../bodygraph.js';
import { computeChart } from '../lib/chartdata.js';
import { listPeople, birthFromPerson, getSharedGuest } from '../lib/people.js';
import { reportSaveFailure } from '../lib/local-store.js';
import { createPlaceSearch } from '../lib/placesearch.js';
import { esc } from '../lib/format.js';
import { typeName, authorityName, centerName, graphCenter, gateName, channelName, profileName } from '../lib/vocabulary.js';
import { contentText } from '../lib/content.js';
import { t } from '../lib/i18n.js';
import { getCurrentChart } from './chart.js';


let placeB = null;
let lastComparison = null;

export function rerenderConnectionGraphs() {
  if (lastComparison && lastComparison[1] === getCurrentChart()) {
    renderConnectionContent(...lastComparison);
  }
}

export function setupConnectionView() {
  document.getElementById('conn-calculate').addEventListener('click', runComparison);
  placeB = createPlaceSearch(document.getElementById('conn-place'), {
    placeholder: 'Birth place (resolves the timezone)',
    getDateTime: () => ({
      date: document.getElementById('conn-date').value,
      time: document.getElementById('conn-time').value
    })
  });
  for (const id of ['conn-date', 'conn-time']) document.getElementById(id).addEventListener('change', placeB.updateDateTime);
}

/** Refresh the saved-people picker each time the view opens. */
export function renderConnectionView() {
  const select = document.getElementById('conn-person');
  const previousValue = select.value;
  const hadOptions = select.options.length > 0;
  const people = listPeople();
  const current = getCurrentChart();
  const options = people
    .filter(p => p.id !== current?.birth?.id)
    .map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
    .join('');
  // A chart they arrived at via a share link stays comparable (P1-11).
  const guest = getSharedGuest();
  const guestOpt = guest?.name && guest?.birthDate && guest.id !== current?.birth?.id
    ? `<option value="__guest">${esc(guest.name)} ${t('(shared chart)')}</option>` : '';
  select.innerHTML = `<option value="">${t('— enter birth data below —')}</option>${guestOpt}${options}`;
  if (hadOptions && [...select.options].some(option => option.value === previousValue)) select.value = previousValue;
  document.getElementById('conn-manual').classList.toggle('hidden', !!select.value);
  select.onchange = () => {
    document.getElementById('conn-manual').classList.toggle('hidden', !!select.value);
  };
}

/** Dyad loop: select the shared/invited person and run the comparison. */
export function compareWithGuest() {
  renderConnectionView();
  const select = document.getElementById('conn-person');
  if (!select || ![...select.options].some(o => o.value === '__guest')) return;
  select.value = '__guest';
  document.getElementById('conn-manual')?.classList.add('hidden');
  runComparison();
}

async function runComparison() {
  const current = getCurrentChart();
  if (!current) return;

  const select = document.getElementById('conn-person');
  let birthB = null;
  let defaultName = false;

  if (select.value === '__guest') {
    birthB = getSharedGuest();
  } else if (select.value) {
    const person = listPeople().find(p => p.id === select.value);
    if (person) birthB = birthFromPerson(person);
  } else {
    const date = document.getElementById('conn-date').value;
    if (!date) return;
    const time = document.getElementById('conn-time').value;
    if (!time) { document.getElementById('conn-time').focus(); return; }
    const loc = placeB?.getBirthLocation(date, time);
    if (!loc) { placeB?.flagMissing(); return; } // no silent UTC=0
    const enteredName = document.getElementById('conn-name').value.trim();
    defaultName = !enteredName;
    birthB = {
      name: enteredName || 'Person B',
      birthDate: date,
      birthTime: time,
      timezone: loc.timezone,
      location: loc.lat != null ? loc : null
    };
  }
  if (!birthB) return;

  let b;
  try { b = await computeChart(birthB); }
  catch (error) {
    document.getElementById('connection-content').innerHTML = `<p class="panel-intro">${esc(error.message)}</p>`;
    return;
  }
  b.defaultDisplayName = defaultName;
  const comparison = compareHumanDesign(current.chart, b.chart);
  if (!select.value && !defaultName) {
    try { saveTemporaryBirth(birthB); } catch (e) { reportSaveFailure(e); }
  }
  renderConnectionContent(comparison, current, b);
}

export function refreshConnectionLanguage() {
  renderConnectionView();
  if (lastComparison && lastComparison[1] === getCurrentChart()) {
    const [comparison, a, b] = lastComparison;
    renderConnectionContent(comparison, a, b, { languageOnly: true });
  }
}

// Relationship colors are separate from personality/design/transit sources.
function compositePalette() {
  const style = getComputedStyle(document.documentElement);
  return {
    a: style.getPropertyValue('--hd-connection-a').trim(),
    b: style.getPropertyValue('--hd-connection-b').trim(),
    bridged: style.getPropertyValue('--hd-connection-bridged').trim()
  };
}

const DYN_LABEL = {
  electromagnetic: 'Electromagnetic', companionship: 'Companionship',
  compromise: 'Compromise', dominance: 'Dominance'
};
const DYN_BLURB = {
  electromagnetic: 'The listed gate contributions complete this channel in the composite.',
  companionship: 'Both people have both gates of this channel.',
  compromise: 'One person has both gates; the other contributes one gate.',
  dominance: 'One person has both gates; the other contributes neither gate.'
};

// The four ways two charts share channels — explained, with the circuit each
// connection runs through (individual / tribal / collective / integration).
const CONN_TYPES = [
  ['electromagnetic', 'Electromagnetic', 'var(--electromagnetic)', 'Each person contributes one gate; together the channel is complete.'],
  ['companionship', 'Companionship', 'var(--hd-circuit-integration)', 'Both people have the complete channel.'],
  ['compromise', 'Compromise', 'var(--hd-circuit-collective)', 'One person has the complete channel and the other contributes one of its gates.'],
  ['dominance', 'Dominance', 'var(--text-tertiary)', 'One person has the complete channel and the other has neither gate.']
];

export function renderConnectionContent(comparison, a, b, { languageOnly = false } = {}) {
  lastComparison = [comparison, a, b];
  const container = document.getElementById('connection-content');
  const wasExpanded = !!container.querySelector('.composite-individuals')?.open;
  const previousDetail = container.querySelector('.gate-detail:not(.hidden) .gate-detail-card');
  const openGate = previousDetail?.dataset.gate;
  const openCenter = previousDetail?.dataset.center;
  if (!languageOnly || openGate != null || openCenter != null) closeDetailDialog();
  const structure = comparison.structure || analyzeConnectionStructure(a.chart, b.chart);
  comparison.structure = structure;
  const cc = comparison.connectionChart || { connections: structure.connections, compositeType: null, compositeChannelCount: structure.composite.channelCount };
  const nameA = a.birth.name || t('You');
  const nameB = b.defaultDisplayName ? t('Person B') : (b.birth.name || t('Person B'));
  const ad = comparison.authorityDynamic || {};
  const br = comparison.bridging || {};
  const centerDynamics = comparison.centerDynamics || structure.centerStates;
  const centerRows = Array.isArray(centerDynamics) ? centerDynamics : Object.values(centerDynamics);
  const centerIndex = new Map((structure.centerStates || []).map(state => [state.center, state]));
  const centerStatus = (state, person) => person === 'A' ? state?.personA : person === 'B' ? state?.personB : state?.status || (state?.compositeDefined ? 'defined' : 'open');
  const isDefined = value => value === true || value === 'defined';
  const isCreated = state => state?.created === true;
  const bridgeA = structure.bridging?.personA || br.personA;
  const bridgeB = structure.bridging?.personB || br.personB;
  const centerFormula = structure.formulas?.expression || '—';
  const createdCount = structure.formulas?.createdCenterCount ?? 0;
  const createdChannelCount = structure.composite?.createdChannelCount ?? 0;
  const statusText = status => status === 'not-applicable' ? t('Not applicable') : status === 'complete' ? t('Fully bridged') : status === 'partial' ? t('Partially bridged') : status === 'none' ? t('Not bridged') : t('Not applicable');
  const summaryFacts = comparison.summaryFacts || comparison.summary || {};
  const summaryText = t('Center formula {formula}; Created centers {centers}; Created channels {channels}; electromagnetic channels {electromagnetic}; A bridging {statusA}; B bridging {statusB}.', {
    formula: structure.formulas?.expression || '—', centers: structure.formulas?.createdCenterCount ?? 0, channels: structure.composite?.createdChannelCount ?? 0,
    electromagnetic: summaryFacts.electromagneticCount ?? 0, statusA: statusText(bridgeA?.status), statusB: statusText(bridgeB?.status)
  });
  const circuitBadge = channel => {
    return renderChannelCircuitBadges(channel);
  };

  const connSection = ([key, label, color, blurb]) => {
    const items = cc.connections[key] || [];
    return `
      <div class="conn-section">
        <div class="conn-section-head"><span class="panel-title">${t(label)}</span><span class="conn-count">${items.length}</span></div>
        <p class="panel-intro">${t(blurb)}</p>
        ${items.length ? items.map(c => {
          const contribution = key === 'electromagnetic' ? `${nameA}: ${c.gateA} · ${nameB}: ${c.gateB}`
            : key === 'compromise' ? `${c.dominant === 'A' ? nameA : nameB}: ${t('Complete channel')} · ${c.dominant === 'A' ? nameB : nameA}: ${t('Gate {gate}', { gate: c.partialGate })}`
            : key === 'dominance' ? `${c.dominant === 'A' ? nameA : nameB}: ${t('Complete channel')} · ${c.dominant === 'A' ? nameB : nameA}: ${t('No gates')}`
            : `${nameA} + ${nameB}: ${t('Complete channel')}`;
          return `
          <div class="connection-type" style="border-left:3px solid ${color}">
            <div class="conn-channel">${esc(channelName(c.gates))} <span class="conn-gates">(${c.gates.join('–')})</span> ${circuitBadge(c)}</div>
            <div class="conn-desc">${t(DYN_BLURB[key])} ${esc(contribution)}</div>
          </div>`;
        }).join('')
        : `<div class="conn-empty">${t('No {label} channels between you.', { label: t(label).toLowerCase() })}</div>`}
      </div>`;
  };

  const cpal = compositePalette();

  container.innerHTML = `
    <div class="composite-wrap">
      <div class="panel-title">${t('Your charts combined')}</div>
      <p class="panel-intro">${t('One body, both of you — each gate colored by who brings it. A <strong>two-tone</strong> channel shows gates contributed by both people. Hover or tap any gate, channel, or center.')}</p>
      <div class="composite-legend">
        <span class="lg"><i style="background:${cpal.a}"></i>${esc(nameA)}</span>
        <span class="lg"><i style="background:${cpal.b}"></i>${esc(nameB)}</span>
        <span class="lg"><i class="lg-stripe" style="background:linear-gradient(45deg, ${cpal.a} 0 50%, ${cpal.b} 50% 100%)"></i>${t('Both have it')}</span>
        <span class="lg"><i style="background:${cpal.bridged}"></i>${t('Made together')}</span>
      </div>
      <div id="conn-composite" class="composite-graph"></div>
      <div id="conn-detail" class="gate-detail hidden"></div>
    </div>

    <details class="composite-individuals">
      <summary>${t('See each chart on its own')}</summary>
      <div class="connection-graphs">
        <div class="connection-graph">
          <div class="connection-graph-name">${esc(nameA)}</div>
          <div class="connection-graph-type">${esc(typeName(a.chart.type.name))} · ${esc(t('Connection strategy:'))} ${esc(contentText(comparison.individuals?.personA?.strategy || a.chart.type?.strategy || a.chart.strategy?.name || a.chart.strategy || ''))} · ${esc(t('Authority:'))} ${esc(authorityName(a.chart.authority?.name))} · ${esc(t('Profile:'))} ${esc(profileName(a.chart.profile?.numbers))} · ${esc(t('Definition:'))} ${esc(contentText(a.chart.definition?.name || a.chart.definition || ''))}</div>
          <div id="conn-graph-a"></div>
        </div>
        <div class="connection-graph">
          <div class="connection-graph-name">${esc(nameB)}</div>
          <div class="connection-graph-type">${esc(typeName(b.chart.type.name))} · ${esc(t('Connection strategy:'))} ${esc(contentText(comparison.individuals?.personB?.strategy || b.chart.type?.strategy || b.chart.strategy?.name || b.chart.strategy || ''))} · ${esc(t('Authority:'))} ${esc(authorityName(b.chart.authority?.name))} · ${esc(t('Profile:'))} ${esc(profileName(b.chart.profile?.numbers))} · ${esc(t('Definition:'))} ${esc(contentText(b.chart.definition?.name || b.chart.definition || ''))}</div>
          <div id="conn-graph-b"></div>
        </div>
      </div>
    </details>

    <div class="foundation-grid" style="margin-bottom:8px">
      <div class="foundation-item"><div class="label">${t('Composite-derived type')}</div><div class="value">${esc(typeName(cc.compositeType))}</div><div class="detail">${t('{count} channels combined', { count: cc.compositeChannelCount })}</div></div>
      <div class="foundation-item" data-testid="connection-center-formula" data-formula="${esc(centerFormula)}"><div class="label">${t('Center formula')}</div><div class="value">${esc(centerFormula)}</div><div class="detail">${t('{count} defined · {other} undefined', { count: structure.formulas?.definedCount ?? 0, other: structure.formulas?.undefinedCount ?? 9 })}</div></div>
      <div class="foundation-item" data-testid="connection-created-count" data-count="${createdCount}"><div class="label">${t('Created centers')}</div><div class="value">${createdCount}</div><div class="detail">${t('{count} created channels', { count: createdChannelCount })}</div></div>
    </div>

    <div class="panel-title" style="margin-top:22px">${t('Individual decision foundations')}</div>
    <p class="panel-intro">${esc(nameA)} · ${esc(authorityName(comparison.individuals?.personA?.authority || ad.authorityA || a.chart.authority?.name))} &nbsp;|&nbsp; ${esc(nameB)} · ${esc(authorityName(comparison.individuals?.personB?.authority || ad.authorityB || b.chart.authority?.name))}</p>
    <div class="panel-title">${t('Profiles')}</div>
    <p class="panel-intro">${esc(nameA)} · ${esc(profileName(a.chart.profile?.numbers))} &nbsp;|&nbsp; ${esc(nameB)} · ${esc(profileName(b.chart.profile?.numbers))}</p>

    <div class="panel-title" style="margin-top:22px">${t('The four ways your channels connect')}</div>
    ${CONN_TYPES.map(connSection).join('')}

    <div class="panel-title" style="margin-top:22px">${t('Center states')}</div>
    <p class="panel-intro">${t('Each row reports defined, undefined, or open status in person A, person B, and the composite. Created channels are listed as structural facts.')}</p>
    ${centerRows.map(c => {
      const s = centerIndex.get(c.center || c.centerName) || c;
      const created = (structure.composite.createdChannels || []).filter(channel => channel.centers.includes(s.center));
      const state = value => isDefined(value) ? t('Defined') : value === 'undefined' ? t('Undefined') : value === 'open' ? t('Completely open') : t('Open');
      return `<div class="conn-center" data-testid="connection-center-state" data-center="${esc(s.center || s.centerName)}" data-a-state="${centerStatus(s, 'A')}" data-b-state="${centerStatus(s, 'B')}" data-composite-state="${centerStatus(s, 'composite')}" data-a-defined="${isDefined(centerStatus(s, 'A'))}" data-b-defined="${isDefined(centerStatus(s, 'B'))}" data-composite-defined="${isDefined(centerStatus(s, 'composite'))}" data-created="${isCreated(s)}"><strong>${esc(centerName(s.centerName || s.center))}</strong><div>${esc(nameA)}: ${state(centerStatus(s, 'A'))} · ${esc(nameB)}: ${state(centerStatus(s, 'B'))} · ${t('Composite')}: ${state(centerStatus(s, 'composite'))}</div>${created.length ? `<div class="conn-center-theme">${t('Created channels')}: ${created.map(ch => `${esc(channelName(ch.gates))} (${ch.gates.join('–')})`).join(', ')}</div>` : ''}</div>`;
    }).join('')}

    <div class="panel-title" style="margin-top:22px">${t('Bridging by person')}</div>
    <div class="conn-center" data-testid="connection-bridging-a" data-status="${bridgeA?.status || 'n/a'}" data-original-regions="${bridgeA?.originalRegionCount ?? 0}"><strong>${esc(nameA)}</strong> · ${t('Original regions')}: ${esc(String(bridgeA?.originalRegionCount ?? t('N/A')))} · ${statusText(bridgeA?.status)}${(bridgeA?.witnesses || []).map(witness => `<div>${t('Path')}: ${witness.centers.map(center => esc(centerName(center))).join(' → ')} (${witness.channels.map(channel => `${esc(channelName(channel.gates))} ${channel.gates.join('–')}`).join(' → ')})</div>`).join('')}</div>
    <div class="conn-center" data-testid="connection-bridging-b" data-status="${bridgeB?.status || 'n/a'}" data-original-regions="${bridgeB?.originalRegionCount ?? 0}"><strong>${esc(nameB)}</strong> · ${t('Original regions')}: ${esc(String(bridgeB?.originalRegionCount ?? t('N/A')))} · ${statusText(bridgeB?.status)}${(bridgeB?.witnesses || []).map(witness => `<div>${t('Path')}: ${witness.centers.map(center => esc(centerName(center))).join(' → ')} (${witness.channels.map(channel => `${esc(channelName(channel.gates))} ${channel.gates.join('–')}`).join(' → ')})</div>`).join('')}</div>
    ${(structure.composite.createdChannels || []).length ? `<div class="panel-title">${t('Created channels')}</div><div class="pills">${structure.composite.createdChannels.map(c => `<span class="pill">${esc(channelName(c.gates))}</span>`).join('')}</div>` : ''}

    <div class="panel-title" style="margin-top:22px">${t('In a nutshell')}</div>
    <p>${esc(contentText(summaryText))}</p>
  `;
  container.querySelector('.composite-individuals').open = wasExpanded;

  // The hero: one combined bodygraph, colored by who brings each gate. Detail
  // handlers below close over `api` (assigned right after the graph renders).
  let api;
  const detail = container.querySelector('#conn-detail');
  const whoName = (owner) => owner === 'both' ? `${nameA} + ${nameB}`
    : owner === 'a' ? nameA : owner === 'b' ? nameB : t('Neither of you');

  function openDetail() {
    openDetailDialog(detail, () => api?.setPinned?.(null));
  }

  function showCompositeGate(g, scroll = true) {
    const gate = GATES[g];
    const owner = api.gateOwner(g);
    const rows = CHANNELS.filter(ch => ch.gates.includes(g)).map(ch => {
      const dyn = api.channelDynamic(ch);
      if (!dyn) return '';
      const other = ch.gates.find(x => x !== g);
      const bring = (gn, ow) => t(ow === 'both' ? '{name} both bring {gate}' : '{name} brings {gate}', {
        name: esc(whoName(ow)), gate: gn
      });
      return `
        <div class="conn-detail-channel ${dyn}">
          <div class="cdc-dyn">${t(DYN_LABEL[dyn])}</div>
          <div class="cdc-name">${esc(channelName(ch.gates))} <span class="conn-gates">(${ch.gates.join('–')})</span></div>
          <div class="cdc-bring">${bring(g, owner)} · ${bring(other, api.gateOwner(other))}</div>
          <div class="cdc-blurb">${t(DYN_BLURB[dyn])}</div>
        </div>`;
    }).filter(Boolean).join('');
    detail.innerHTML = `
      <div class="gate-detail-card" data-gate="${g}">
        <button class="gate-detail-close" title="${t('Close')}">&times;</button>
        <div class="panel-title">${t('Gate {gate}', { gate: g })}${gate?.name ? ' — ' + esc(gateName(g)) : ''}</div>
        <div class="conn-detail-who">${t('Carried by')} <strong>${esc(whoName(owner))}</strong></div>
        ${rows || `<p class="gate-detail-inactive">${t('This gate doesn’t complete a channel between you.')}</p>`}
      </div>`;
    detail.classList.remove('hidden');
    api.setPinned?.({ kind: 'gate', id: g });
    openDetail();
  }

  function showCompositeCenter(key, scroll = true) {
    const owner = api.centerOwner(key);
    const dn = graphCenter(key);
    const dyn = centerIndex.get(key) || centerRows.find(c => (c.center || c.centerName) === key || c.centerName === centerName(key));
    const tag = owner === 'both' ? t('Both define') : owner === 'a' ? t('{name} defines', { name: nameA })
      : owner === 'b' ? t('{name} defines', { name: nameB }) : owner === 'bridged' ? t('Made together') : t('Completely open');
    const displayState = value => value === 'defined' ? t('Defined') : value === 'undefined' ? t('Undefined') : value === 'open' ? t('Completely open') : t('Open');
    const createdCenterChannels = (structure.composite.createdChannels || []).filter(channel => channel.centers.includes(key));
    const txt = `${nameA}: ${displayState(centerStatus(dyn, 'A'))} · ${nameB}: ${displayState(centerStatus(dyn, 'B'))} · ${t('Composite')}: ${displayState(centerStatus(dyn, 'composite'))}. ${createdCenterChannels.length ? `${t('Created channels')}: ${createdCenterChannels.map(channel => `${channelName(channel.gates)} (${channel.gates.join('–')})`).join(', ')}` : ''}`;
    detail.innerHTML = `
      <div class="gate-detail-card center-detail-card" data-center="${key}">
        <button class="gate-detail-close" title="${t('Close')}">&times;</button>
        <div class="panel-title">${esc(t('{center} Center', { center: dn }))}</div>
        <div class="center-detail-head"><span class="conn-center-tag ${owner || 'open'}">${esc(tag)}</span></div>
        <p class="gate-detail-desc">${esc(txt)}</p>
      </div>`;
    detail.classList.remove('hidden');
    api.setPinned?.({ kind: 'center', id: key });
    openDetail();
  }

  api = renderBodygraph(container.querySelector('#conn-composite'), a.chart, {
    composite: {
      chartA: a.chart, chartB: b.chart, structure,
      colorA: cpal.a, colorB: cpal.b, colorBridged: cpal.bridged,
      labelA: nameA, labelB: nameB
    },
    onGateClick: showCompositeGate,
    onCenterClick: showCompositeCenter
  });

  renderBodygraph(container.querySelector('#conn-graph-a'), a.chart, { compact: true });
  renderBodygraph(container.querySelector('#conn-graph-b'), b.chart, { compact: true });
  if (openGate != null) showCompositeGate(Number(openGate), false);
  else if (openCenter != null) showCompositeCenter(openCenter, false);
}
