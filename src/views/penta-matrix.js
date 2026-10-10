import '../styles/penta-matrix.css';
import '../lib/penta-reading-messages.js';
import { esc } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { gateName, hexagramName, planetName, channelName } from '../lib/vocabulary.js';
import { prepareDetailDialog, openDetailDialog, closeDetailDialog, fitDetailSheetHeight } from '../lib/detail-dialog.js';
import { getKnowledgeEntry, getKnowledgeSummary, getKnowledgeDetail } from '../lib/knowledge/registry.js';
import './team-messages.js';

const states = { absent: 'Not covered', selfComplete: 'One member covers both gates', crossMemberOnly: 'Covered across members', both: 'Covered individually and across members' };
const symbols = { absent: '–', selfComplete: '●', crossMemberOnly: '×', both: '◎' };
const point = cell => ({ x: 55 + cell.column * 105, y: 57 + cell.row * 98 });
const label = (key, args) => esc(t(key, args));
const query = objectId => ({ domain: 'human-design', objectType: 'penta', objectId });

/** Presentation only: calculations, topology and provenance stay in Phase 1A. */
export function createPentaMatrix(container, {
  result, people, groupLabel, analysisContainer = container, detailAdapter = null,
  initialSelection = null, onMemberFocusChange = null
}) {
  let selected = null;
  let selectedTarget = initialSelection ? { ...initialSelection, id: String(initialSelection.id) } : null;
  let hoverTarget = null;
  let currentDetail = null;
  let detailHistory = [];
  let disposeDialog = null;
  let disposed = false;
  const analysis = document.createElement('div');
  analysis.className = 'penta-analysis';
  analysisContainer.append(analysis);
  const graph = document.createElement('div');
  graph.className = 'penta-render';
  container.prepend(graph);
  // The real site-wide sheet is a body-level sibling, never a nested panel.
  const dialog = document.createElement('div');
  dialog.className = 'gate-detail hidden penta-detail';
  document.body.append(dialog);

  const memberIndex = id => people.findIndex(person => person.memberId === id) + 1;
  const person = id => people.find(item => item.memberId === id);
  const memberName = id => person(id)?.displayName || String(id);
  const memberBadge = id => `<span class="penta-member-tag penta-member-${memberIndex(id)}">${memberIndex(id) || '·'}</span>`;
  const identity = id => `${memberBadge(id)}<span>${esc(memberName(id))}</span>${person(id)?.timeUnknown ? `<span class="penta-estimate-mark" title="${label('Team estimated time')}">≈</span>` : ''}`;
  const names = ids => ids.length ? people.filter(p => ids.includes(p.memberId)).map(p => `<span class="penta-person-inline" data-source-id="${esc(p.memberId)}">${identity(p.memberId)}</span>`).join(' ') : label('No Penta contributors');
  const gateFor = id => result.gates.find(gate => gate.gate === Number(id));
  const channelFor = id => result.channels.find(channel => [channel.channelId, channel.gates.join('-'), [...channel.gates].reverse().join('-')].includes(String(id)));
  const ctx = { result, people, groupLabel };
  const detailContext = () => ({ ...ctx,
    onGateSelect: id => showDetail('gate', id),
    onChannelSelect: id => showDetail('channel', id),
    onBack: goBack
  });
  const scrollHost = () => analysisContainer.closest('.team-results') || analysisContainer;
  function qualifiedSummary(id) {
    const entry = getKnowledgeEntry(query(id));
    if (entry?.properties?.evidence?.status !== 'verified') return '';
    if (/^(gate|channel):/.test(id) && entry.properties.interpretationStatus !== 'verified') return '';
    const value = getKnowledgeSummary(query(id));
    return value?.content ? `<p class="penta-context-note">${esc(value.content)}</p>` : '';
  }
  function activationGroups(gate) {
    if (!gate.activations.length) return `<p class="penta-muted">${label('No Penta contributors')}</p>`;
    const ids = [...new Set([...people.map(p => p.memberId), ...gate.activations.map(a => a.memberId)])];
    return `<div class="penta-activation-groups">${ids.map(id => {
      const rows = gate.activations.filter(a => a.memberId === id);
      if (!rows.length) return '';
      return `<div class="penta-activation-person" data-source-id="${esc(id)}"><div class="penta-person-inline">${identity(id)}</div><div class="penta-activation-records">${rows.map(a => `<span>${label(a.side === 'design' ? 'Design' : 'Personality')} · ${esc(planetName(a.planet))} <b>${a.gate}.${a.line}</b></span>`).join('')}</div></div>`;
    }).join('')}</div>`;
  }
  function detailButton(kind, id) {
    return `<button type="button" class="penta-open-detail" data-open-kind="${kind}" data-open-id="${esc(id)}">${label('Penta open details')} <span aria-hidden="true">↗</span></button>`;
  }
  function gateSummary(gate) {
    return `<article tabindex="-1" class="penta-analysis-card penta-gate-reading" data-detail-kind="gate" data-detail-id="${gate.gate}"><header class="penta-item-heading"><button type="button" class="penta-object-title" data-open-kind="gate" data-open-id="${gate.gate}">${label('Gate {gate}', { gate: gate.gate })}<span>${esc(gateName(gate.gate))} · ${esc(hexagramName(gate.gate))}</span></button><span class="penta-state-text">${label(gate.status === 'present' ? 'Activated' : 'Inactive')}</span></header>${activationGroups(gate)}${qualifiedSummary(`gate:${gate.gate}`)}${detailButton('gate', gate.gate)}</article>`;
  }
  function channelSummary(channel) {
    const complete = channel.selfCompleteMemberIds || [];
    const pairs = channel.complementaryMemberPairs || [];
    return `<article tabindex="-1" class="penta-analysis-card penta-channel-reading" data-detail-kind="channel" data-detail-id="${esc(channel.channelId)}"><header class="penta-item-heading"><button type="button" class="penta-object-title" data-open-kind="channel" data-open-id="${esc(channel.channelId)}">${esc(channel.channelId.replace('-', '–'))}<span>${esc(channelName(channel.channelId))}</span></button><span class="penta-state-text"><b aria-hidden="true">${symbols[channel.status]}</b> ${label(states[channel.status])}</span></header><dl class="penta-channel-holders">${channel.gates.map(gate => `<div><dt>${label('Gate {gate}', { gate })}</dt><dd>${names(channel.holdersByGate[gate] || [])}</dd></div>`).join('')}</dl>${complete.length ? `<p class="penta-relation"><strong>${label('Self complete members')}</strong> ${names(complete)}</p>` : ''}${pairs.length ? `<div class="penta-relation"><strong>${label('Complementary member pairs')}</strong><ul>${pairs.map(pair => `<li><span>${identity(pair.upperMemberId)}</span> <span aria-hidden="true">↔</span> <span>${identity(pair.lowerMemberId)}</span></li>`).join('')}</ul></div>` : ''}${channel.missingGates.length ? `<p class="penta-muted">${label('Missing gates')}: ${esc(channel.missingGates.join(' · '))}</p>` : ''}${qualifiedSummary(`channel:${channel.channelId}`)}${detailButton('channel', channel.channelId)}</article>`;
  }
  function renderAnalysis() {
    const estimated = people.filter(p => p.timeUnknown).map(p => p.displayName);
    const channelGroup = (title, ids) => `<div class="penta-reading-subgroup"><h4 class="penta-subheading">${label(title)}</h4>${ids.map(id => channelFor(id)).filter(Boolean).map(channelSummary).join('')}</div>`;
    const gateGroups = [['throat', 'Penta gate order throat'], ['g', 'Penta gate order g'], ['sacral', 'Penta gate order sacral']];
    const background = ['introduction', 'powerColumn', 'contexts'].map(id => {
      const summary = qualifiedSummary(id);
      if (!summary) return '';
      const entry = getKnowledgeEntry(query(id));
      return `<article class="penta-background-note" data-detail-kind="knowledge" data-detail-id="${id}" tabindex="-1"><h4>${esc(entry.name)}</h4>${summary}<button type="button" class="penta-open-detail" data-open-kind="knowledge" data-open-id="${id}">${label('Penta open reading')} ↗</button></article>`;
    }).join('');
    analysis.innerHTML = `<section class="penta-overview penta-reading-section"><div class="penta-reading-heading"><h2>${label('Penta reading title')}</h2><p>${esc(groupLabel)} · ${people.length}</p></div><dl class="penta-overview-stats"><div><dt>${label('Penta reading members')}</dt><dd>${people.length}</dd></div><div><dt>${label('Penta reading gates covered')}</dt><dd>${result.summary.presentGateCount}<small> / 12</small></dd></div><div><dt>${label('Penta reading channels covered')}</dt><dd>${result.summary.coveredChannelCount}<small> / 6</small></dd></div></dl>${estimated.length ? `<p class="penta-estimate-note">≈ ${label('Penta noon notice', { names: estimated.join('、') })}</p>` : ''}</section><section class="penta-reading-section"><h3>${label('Penta reading channels')}</h3>${channelGroup('Penta upper group', ['7-31', '1-8', '13-33'])}${channelGroup('Penta lower group', ['5-15', '2-14', '29-46'])}</section><section class="penta-reading-section"><h3>${label('Penta reading gates')}</h3>${gateGroups.map(([center, title]) => `<div class="penta-reading-subgroup"><h4 class="penta-subheading">${label(title)}</h4>${result.gates.filter(gate => gate.center === center).sort((a,b) => a.row-b.row || a.column-b.column).map(gateSummary).join('')}</div>`).join('')}</section><section class="penta-reading-section"><h3>${label('Penta reading contributions')}</h3>${people.map(p => `<article class="penta-contribution-row" data-source-id="${esc(p.memberId)}"><h4 class="penta-person-inline">${identity(p.memberId)}</h4><div>${result.gates.filter(gate => gate.memberIds.includes(p.memberId)).map(gate => `<button type="button" class="penta-gate-reference" data-select-kind="gate" data-select-id="${gate.gate}">${gate.gate}</button>`).join('') || `<span class="penta-muted">${label('No Penta contributors')}</span>`}</div></article>`).join('')}</section>${background ? `<section class="penta-reading-section"><h3>${label('Penta reading background')}</h3>${background}</section>` : ''}`;
  }
  function renderGraph() {
    const gates = new Map(result.gates.map(gate => [gate.gate, gate]));
    const lines = result.channels.map(channel => {
      const start = point(gates.get(channel.gates[0])), end = point(gates.get(channel.gates[1]));
      return `<g class="penta-edge penta-${channel.status}" data-channel="${esc(channel.channelId)}" data-select-kind="channel" data-select-id="${esc(channel.channelId)}"><line x1="${start.x}" y1="${start.y+29}" x2="${end.x}" y2="${end.y-29}"/><circle class="penta-edge-symbol" cx="${start.x}" cy="${(start.y+end.y)/2}" r="9"/><text class="penta-edge-letter" x="${start.x}" y="${(start.y+end.y)/2+4}" text-anchor="middle">${symbols[channel.status]}</text><line class="penta-hit" x1="${start.x}" y1="${start.y+29}" x2="${end.x}" y2="${end.y-29}"/><title>${esc(channel.channelId)} · ${label(states[channel.status])}</title></g>`;
    }).join('');
    const nodes = result.gates.map(gate => {
      const { x, y } = point(gate);
      const badges = people.filter(p => gate.memberIds.includes(p.memberId)).map((p,index,all) => `<g class="penta-native-member penta-member-${memberIndex(p.memberId)}" data-source-id="${esc(p.memberId)}" transform="translate(${(index-(all.length-1)/2)*15} 20)"><circle r="7.5"/><text y="3.5" text-anchor="middle">${memberIndex(p.memberId)}</text></g>`).join('');
      return `<g class="penta-gate penta-${gate.status}" data-gate="${gate.gate}" data-select-kind="gate" data-select-id="${gate.gate}" transform="translate(${x} ${y})"><rect x="-42" y="-32" width="84" height="64" rx="9"/><text class="penta-number" text-anchor="middle" y="-5">${gate.gate}</text>${badges}<title>${label('Gate {gate}', { gate: gate.gate })} · ${esc(hexagramName(gate.gate))}</title></g>`;
    }).join('');
    const gateButtons = result.gates.map(gate => { const p=point(gate); return `<button type="button" class="penta-gate-hit" data-select-kind="gate" data-select-id="${gate.gate}" data-gate="${gate.gate}" style="left:${p.x/320*100}%;top:${p.y/410*100}%" aria-pressed="false" aria-label="${label('Gate {gate}', { gate: gate.gate })} · ${esc(hexagramName(gate.gate))}"></button>`; }).join('');
    const channelButtons = result.channels.map(channel => { const a=point(gates.get(channel.gates[0])), b=point(gates.get(channel.gates[1])); return `<button type="button" class="penta-channel-hit" data-select-kind="channel" data-select-id="${esc(channel.channelId)}" data-channel="${esc(channel.channelId)}" style="left:${a.x/320*100}%;top:${(a.y+b.y)/820*100}%" aria-pressed="false" aria-label="${label('Channel')} ${esc(channel.channelId)} · ${label(states[channel.status])}"></button>`; }).join('');
    graph.innerHTML = `<div class="penta-figure-space"><div class="penta-canvas"><svg viewBox="0 0 320 410" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label('Penta matrix')}"><g class="penta-lines">${lines}</g><g class="penta-nodes">${nodes}</g></svg>${gateButtons}${channelButtons}</div></div><div class="penta-figure-footer"><div class="penta-state-legend" aria-label="${label('Channel states')}">${Object.entries(states).map(([state, name]) => `<span><b class="penta-state-symbol penta-${state}" aria-hidden="true">${symbols[state]}</b>${label(name)}</span>`).join('')}</div></div>`;
  }
  function applyHighlights() {
    const target = hoverTarget || selectedTarget;
    const channel = target?.kind === 'channel' ? channelFor(target.id) : null;
    const gateIds = new Set(channel?.gates || (target?.kind === 'gate' ? [Number(target.id)] : []));
    graph.querySelectorAll('.penta-gate').forEach(node => {
      const gate = gateFor(node.dataset.gate);
      node.classList.toggle('penta-selected-target', gateIds.has(gate.gate));
      node.classList.toggle('penta-highlight', !!selected && gate.memberIds.includes(selected));
      node.classList.toggle('penta-member-muted', !!selected && gate.memberIds.length > 0 && !gate.memberIds.includes(selected));
    });
    graph.querySelectorAll('.penta-edge').forEach(node => {
      const item = channelFor(node.dataset.channel);
      node.classList.toggle('penta-selected-target', target?.kind === 'channel' && item.channelId === channel?.channelId);
      node.classList.toggle('penta-member-muted', !!selected && !item.gates.some(gate => item.holdersByGate[gate]?.includes(selected)));
    });
    graph.querySelectorAll('button[data-select-kind]').forEach(button => button.setAttribute('aria-pressed', String(selectedTarget?.kind === button.dataset.selectKind && selectedTarget.id === button.dataset.selectId)));
    analysis.querySelectorAll('[data-detail-kind]').forEach(node => node.classList.toggle('penta-active-detail', selectedTarget?.kind === node.dataset.detailKind && selectedTarget.id === node.dataset.detailId));
    for (const root of [graph, analysis]) root.querySelectorAll('[data-source-id]').forEach(node => node.classList.toggle('penta-dimmed', !!selected && node.dataset.sourceId !== selected));
  }
  function selectObject(kind, id, { scroll = true, focus = false } = {}) {
    const item = kind === 'gate' ? gateFor(id) : kind === 'channel' ? channelFor(id) : getKnowledgeEntry(query(id));
    if (!item) return;
    selectedTarget = { kind, id: String(kind === 'channel' ? item.channelId : id) };
    applyHighlights();
    const target = [...analysis.querySelectorAll('[data-detail-kind]')].find(node => node.dataset.detailKind === kind && node.dataset.detailId === selectedTarget.id);
    if (!target) return;
    if (focus) target.focus({ preventScroll: true });
    if (!scroll) return;
    const host = scrollHost();
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (['auto','scroll'].includes(getComputedStyle(host).overflowY) && host.scrollHeight > host.clientHeight) {
      host.scrollTo({ top: host.scrollTop + target.getBoundingClientRect().top - host.getBoundingClientRect().top - 12, behavior });
    } else target.scrollIntoView({ block: 'start', behavior });
  }
  function knowledgeBody(id) {
    const entry = getKnowledgeEntry(query(id));
    if (!entry || entry.properties?.evidence?.status !== 'verified') return '';
    const content = getKnowledgeDetail(query(id)) || getKnowledgeSummary(query(id));
    return `<div class="detail-label">Penta</div><div class="detail-name">${esc(entry.name)}</div>${content?.content ? `<p class="gate-detail-desc">${esc(content.content)}</p>` : ''}`;
  }
  function showDetail(kind, id, pushHistory = true) {
    if (disposed) return;
    const record = kind === 'gate' ? gateFor(id) : kind === 'channel' ? channelFor(id) : getKnowledgeEntry(query(id));
    if (!record) return;
    const canonicalId = String(kind === 'channel' ? record.channelId : id);
    const target = { kind, id: canonicalId };
    if (pushHistory && currentDetail && (currentDetail.kind !== kind || currentDetail.id !== canonicalId)) detailHistory.push(currentDetail);
    currentDetail = target;
    selectObject(kind, canonicalId, { scroll: false });
    disposeDialog?.(); disposeDialog = null;
    prepareDetailDialog(dialog, 'penta');
    const context = detailContext();
    const title = kind === 'gate' ? `${t('Gate {gate}', { gate: record.gate })} · ${hexagramName(record.gate)}` : kind === 'channel' ? `${t('Channel')} ${record.channelId} · ${channelName(record.channelId)}` : record.name;
    const html = kind === 'knowledge' ? knowledgeBody(id) : detailAdapter?.[kind] ? detailAdapter[kind](record, context) : (kind === 'gate' ? gateSummary(record) : channelSummary(record));
    dialog.innerHTML = `<div class="gate-detail-card"><div class="gate-detail-nav"><span class="gate-detail-handle" aria-hidden="true"></span><div class="gate-detail-nav-buttons">${detailHistory.length ? `<button type="button" class="gate-detail-back" data-penta-back>← ${label('Back')}</button>` : '<span></span>'}<button type="button" class="gate-detail-close" title="${label('Close')}" aria-label="${label('Close')}">×</button></div></div><div class="gate-detail-body">${html}</div></div>`;
    const bound = detailAdapter?.bind?.(dialog, context);
    if (typeof bound === 'function') disposeDialog = bound;
    dialog.querySelector('[data-penta-back]')?.addEventListener('click', goBack);
    openDetailDialog(dialog, () => { disposeDialog?.(); disposeDialog = null; currentDetail = null; detailHistory = []; }, { owner: 'penta', label: title });
    fitDetailSheetHeight(dialog.querySelector('.gate-detail-card'));
  }
  function goBack() { const previous = detailHistory.pop(); if (previous) showDetail(previous.kind, previous.id, false); }
  function setMember(id) {
    selected = people.some(p => p.memberId === id) ? id : null;
    applyHighlights();
    onMemberFocusChange?.(selected);
  }
  function handleClick(event) {
    const button = event.target.closest('button');
    if (button?.hasAttribute('data-clear-member')) { setMember(null); return; }
    if (button?.dataset.openKind) { showDetail(button.dataset.openKind, button.dataset.openId); return; }
    if (button?.dataset.selectKind) { selectObject(button.dataset.selectKind, button.dataset.selectId, { focus: event.detail === 0 }); return; }
    const hit = event.target.closest('[data-select-kind]');
    if (hit && graph.contains(hit)) { selectObject(hit.dataset.selectKind, hit.dataset.selectId); return; }
    const row = event.target.closest('.penta-analysis-card');
    if (row && analysis.contains(row)) selectObject(row.dataset.detailKind, row.dataset.detailId, { scroll: false });
  }
  function handleHover(event) {
    const target = event.target.closest('[data-select-kind], .penta-analysis-card');
    hoverTarget = target ? { kind: target.dataset.selectKind || target.dataset.detailKind, id: target.dataset.selectId || target.dataset.detailId } : null;
    applyHighlights();
  }
  function endHover() { hoverTarget = null; applyHighlights(); }
  function render() {
    const host = scrollHost(), top = host.scrollTop;
    renderAnalysis(); renderGraph(); applyHighlights();
    host.scrollTop = top;
  }
  for (const root of [graph, analysis]) {
    root.addEventListener('click', handleClick);
    root.addEventListener('mouseover', handleHover);
    root.addEventListener('mouseleave', endHover);
  }
  render();
  return {
    get highlightedMemberId() { return selected; },
    get selection() { return selectedTarget ? { ...selectedTarget } : null; },
    setHighlightedMemberId: setMember,
    selectObject,
    openGateDetail: id => showDetail('gate', id),
    openChannelDetail: id => showDetail('channel', id),
    closeDetail() { if (!dialog.classList.contains('hidden')) closeDetailDialog(); },
    refreshLanguage() { const open = currentDetail ? { ...currentDetail } : null; render(); if (open) showDetail(open.kind, open.id, false); },
    dispose() {
      disposed = true;
      if (!dialog.classList.contains('hidden')) closeDetailDialog();
      disposeDialog?.(); disposeDialog = null;
      for (const root of [graph, analysis]) { root.removeEventListener('click', handleClick); root.removeEventListener('mouseover', handleHover); root.removeEventListener('mouseleave', endHover); }
      dialog.remove(); analysis.remove(); graph.remove();
    }
  };
}
