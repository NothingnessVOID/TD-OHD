import '../styles/penta-matrix.css';
import { esc } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { gateName, hexagramName, planetName, channelName } from '../lib/vocabulary.js';
import { prepareDetailDialog, openDetailDialog, closeDetailDialog, fitDetailSheetHeight } from '../lib/detail-dialog.js';

const states = { absent: 'Not covered', selfComplete: 'One member covers both gates', crossMemberOnly: 'Covered across members', both: 'Covered individually and across members' };
const center = { throat: 'Throat', g: 'G Center', sacral: 'Sacral' };
const point = cell => ({ x: 55 + cell.column * 105, y: 57 + cell.row * 98 });
const label = (key, args) => esc(t(key, args));
const identity = (id, people) => { const index = people.findIndex(person => person.memberId === id); return index < 0 ? esc(id) : `${index + 1} · ${esc(people[index].displayName)}`; };

/** Render an existing Phase 1A result. No topology or coverage is calculated here. */
export function createPentaMatrix(container, { result, people, groupLabel }) {
  let selected = null;
  const dialog = document.createElement('div');
  dialog.className = 'gate-detail hidden penta-detail';
  container.append(dialog);
  const memberIndex = id => people.findIndex(person => person.memberId === id) + 1;
  const noMembers = () => label('No Penta contributors');
  const memberTags = ids => ids.map(id => `<span class="penta-member-tag penta-member-${memberIndex(id)}" data-source-id="${esc(id)}">${memberIndex(id)}</span>`).join('');
  const channelText = channel => t(states[channel.status]);
  const symbols = { absent: '–', selfComplete: '●', crossMemberOnly: '×', both: '◎' };
  const stateLegend = () => `<div class="penta-state-legend" aria-label="${label('Channel states')}">${Object.entries(states).map(([state, key]) => `<span><b class="penta-state-symbol penta-${state}" aria-hidden="true">${symbols[state]}</b>${label(key)}</span>`).join('')}</div>`;
  function legend() {
    return `<div class="penta-legend" aria-label="${label('Penta members')}"><button type="button" class="penta-all" aria-pressed="${selected === null}">${label('Show all')}</button>${people.map((person, i) => `<button type="button" class="penta-member penta-member-${i + 1}" data-member-id="${esc(person.memberId)}" aria-pressed="${selected === person.memberId}"><span class="penta-member-tag">${i + 1}</span>${esc(person.displayName)}</button>`).join('')}</div>`;
  }
  function svg() {
    const gates = new Map(result.gates.map(g => [g.gate, g]));
    const channels = result.channels.map(ch => {
      const start = point(gates.get(ch.gates[0]));
      const end = point(gates.get(ch.gates[1]));
      // A transparent hit stroke keeps even absent channels usable on touch and keyboard.
      return `<g class="penta-edge penta-${ch.status}" data-channel="${esc(ch.channelId)}"><line x1="${start.x}" y1="${start.y + 29}" x2="${end.x}" y2="${end.y - 29}"/><circle class="penta-edge-symbol" cx="${start.x}" cy="${(start.y + end.y) / 2}" r="9"/><text class="penta-edge-letter" x="${start.x}" y="${(start.y + end.y) / 2 + 4}" text-anchor="middle">${symbols[ch.status]}</text><line class="penta-hit" x1="${start.x}" y1="${start.y + 29}" x2="${end.x}" y2="${end.y - 29}"/><title>${esc(ch.gates.join('–'))} · ${esc(channelText(ch))}</title></g>`;
    }).join('');
    const nodes = result.gates.map(gate => {
      const { x, y } = point(gate);
      const badges = gate.memberIds.map((id, index) => `<g class="penta-native-member penta-member-${memberIndex(id)}" data-source-id="${esc(id)}" transform="translate(${(index - (gate.memberIds.length - 1) / 2) * 15} 20)"><circle r="7.5"/><text y="3.5" text-anchor="middle">${memberIndex(id)}</text></g>`).join('');
      return `<g class="penta-gate penta-${gate.status}${selected && gate.memberIds.includes(selected) ? ' penta-highlight' : ''}" data-gate="${gate.gate}" transform="translate(${x} ${y})"><rect x="-42" y="-32" width="84" height="64" rx="9"/><text class="penta-number" text-anchor="middle" y="-5">${gate.gate}</text>${badges}<title>${label('Gate {gate}', { gate: gate.gate })} · ${label(gate.status === 'present' ? 'Activated' : 'Inactive')}</title></g>`;
    }).join('');
    // Buttons are outside the SVG to ensure consistent keyboard activation and focus rings across browsers.
    const overlay = result.gates.map(gate => { const { x, y } = point(gate); return `<button type="button" class="penta-gate-hit" data-gate="${gate.gate}" style="left:${x / 320 * 100}%;top:${y / 410 * 100}%" aria-label="${label('Gate {gate}', { gate: gate.gate })} · ${esc(hexagramName(gate.gate))} · ${label(gate.status === 'present' ? 'Activated' : 'Inactive')}"></button>`; }).join('');
    const edgeButtons = result.channels.map(ch => { const a = point(gates.get(ch.gates[0])), b = point(gates.get(ch.gates[1])); return `<button type="button" class="penta-channel-hit" data-channel="${esc(ch.channelId)}" style="left:${a.x / 320 * 100}%;top:${(a.y + b.y) / 820 * 100}%" aria-label="${label('Channel')} ${esc(ch.gates.join('–'))} · ${esc(channelText(ch))}"></button>`; }).join('');
    return `<div class="penta-canvas"><svg viewBox="0 0 320 410" role="img" aria-label="${label('Penta matrix')}"><g class="penta-lines">${channels}</g><g class="penta-nodes">${nodes}</g></svg>${edgeButtons}${overlay}</div>`;
  }
  function detail(html, title) {
    prepareDetailDialog(dialog, 'penta');
    dialog.innerHTML = `<div class="gate-detail-card"><div class="gate-detail-nav"><span class="gate-detail-handle" aria-hidden="true"></span><button type="button" class="gate-detail-close" aria-label="${label('Close')}">×</button></div><div class="gate-detail-body">${html}</div></div>`;
    openDetailDialog(dialog, null, { owner: 'penta', label: title });
    fitDetailSheetHeight(dialog.querySelector('.gate-detail-card'));
  }
  function showGate(gate) {
    const names = gate.memberIds.map(id => identity(id, people)).join(' · ') || noMembers();
    const rows = gate.activations.map(a => `<li>${identity(a.memberId, people)} · ${label(a.side === 'design' ? 'Design' : 'Personality')} · ${esc(planetName(a.planet))} · ${label('Gate {gate}', { gate: a.gate })}.${a.line}</li>`).join('');
    const title = `${t('Gate {gate}', { gate: gate.gate })} · ${hexagramName(gate.gate)}`;
    detail(`<h3>${esc(title)}</h3><p>${esc(gateName(gate.gate))} · ${label(center[gate.center])}</p><p>${label('Contributors')}: ${gate.contributorCount} · ${names}</p><ul>${rows}</ul>`, title);
  }
  function showChannel(ch) {
    const title = `${t('Channel')} ${ch.gates.join('–')} · ${channelName(ch.channelId)}`;
    const ends = ch.gates.map(gate => `<li>${label('Gate {gate}', { gate })}: ${(ch.holdersByGate[gate] || []).map(id => identity(id, people)).join(' · ') || noMembers()}</li>`).join('');
    const pairs = ch.complementaryMemberPairs.map(pair => `<li>${identity(pair.upperMemberId, people)} (${ch.gates[0]}) + ${identity(pair.lowerMemberId, people)} (${ch.gates[1]})</li>`).join('');
    detail(`<h3>${esc(title)}</h3><p>${esc(channelText(ch))}</p><ul>${ends}</ul><p>${label('Self complete members')}: ${ch.selfCompleteMemberIds.map(id => identity(id, people)).join(' · ') || noMembers()}</p><p>${label('Complementary member pairs')}</p><ul>${pairs || `<li>${noMembers()}</li>`}</ul><p>${label('Missing gates')}: ${ch.missingGates.join(', ') || label('None')}</p>`, title);
  }
  function render() {
    const canvas = container.querySelector('.penta-render');
    canvas.innerHTML = `<h3>${esc(groupLabel)}</h3>${legend()}${svg()}${stateLegend()}<p class="penta-caption">${label('Penta matrix layout is a TD-OHD display arrangement.')}</p><div class="team-summary"><p>${label('Gates covered: {count} / 12', { count: result.summary.presentGateCount })}</p><p>${label('Channels covered: {count} / 6', { count: result.summary.coveredChannelCount })}</p></div><div class="team-channels">${result.channels.map(ch => `<button type="button" class="team-channel penta-${ch.status}" data-channel="${esc(ch.channelId)}"><strong>${esc(ch.gates.join('–'))} · ${esc(channelName(ch.channelId))}</strong><span class="penta-channel-state"><b aria-hidden="true">${symbols[ch.status]}</b>${esc(channelText(ch))}</span></button>`).join('')}</div>`;
    canvas.classList.toggle('penta-filtered', !!selected);
    canvas.querySelectorAll('[data-source-id]').forEach(tag => tag.classList.toggle('penta-dimmed', !!selected && tag.dataset.sourceId !== selected));
  }
  container.insertAdjacentHTML('afterbegin', '<div class="penta-render"></div>');
  const handleClick = event => {
    const target = event.target.closest('button');
    if (!target || !container.contains(target)) return;
    if (target.classList.contains('penta-all')) { selected = null; render(); container.querySelector('.penta-all')?.focus(); }
    else if (target.classList.contains('penta-member')) { selected = target.dataset.memberId; render(); [...container.querySelectorAll('.penta-member')].find(button => button.dataset.memberId === selected)?.focus(); }
    else if (target.dataset.gate) showGate(result.gates.find(g => g.gate === Number(target.dataset.gate)));
    else if (target.dataset.channel) showChannel(result.channels.find(ch => ch.channelId === target.dataset.channel));
  };
  container.addEventListener('click', handleClick);
  render();
  return { get highlightedMemberId() { return selected; }, setHighlightedMemberId(id) { selected = people.some(p => p.memberId === id) ? id : null; render(); }, refreshLanguage: render, dispose() { container.removeEventListener('click', handleClick); if (!dialog.classList.contains('hidden')) closeDetailDialog(); container.replaceChildren(); } };
}
