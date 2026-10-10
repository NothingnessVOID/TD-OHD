import { gateReading, channelReading, channelsForGate, channelById } from './reference-content.js';
import { renderGateLensSwitch } from './gate-lenses.js';
import { getKnowledgeEntry } from './knowledge/registry.js';
import { gateName, hexagramName, channelName, centerName, planetName } from './vocabulary.js';
import { GATES } from './human-design/catalog.js';
import { esc } from './format.js';
import { t } from './i18n.js';
import './shared-detail-messages.js';
import './knowledge/penta-messages.js';

const lenses = new Set(['hd', 'iching', 'gk', 'meridian']);
const text = (key, args) => esc(t(key, args));
const bindings = new WeakMap();

/** Reading context is explicit: no current chart, person, DOM or storage lookup. */
export function renderSharedGateReading(gate, { lens = 'hd', activeLines = [], selectedLine = null, contentId = '', lensAttribute = null } = {}) {
  const n = Number(gate);
  if (!GATES[n]) return '';
  lens = lenses.has(lens) ? lens : 'hd';
  const lines = activeLines.filter(line => Number.isInteger(line) && line >= 1 && line <= 6);
  return `<section data-shared-gate="${n}" data-active-lines="${lines.join(',')}" data-selected-line="${selectedLine ?? ''}">
    ${renderGateLensSwitch(lens, 'data-shared-lens', lensAttribute)}
    <div class="reference-reading" data-shared-reading${contentId ? ` id="${esc(contentId)}"` : ''}>${gateReading(n, lens, { activeLines: lines, selectedLine })}</div>
  </section>`;
}

export function renderSharedChannelReading(id) {
  return `<section data-shared-channel-reading>${channelReading(id)}</section>`;
}

const gateLink = gate => `<button type="button" class="reference-link" data-shared-gate-select="${gate}">${text('Gate {gate}', { gate })} · ${esc(gateName(gate))}</button>`;
const channelLinks = gate => `<h3>${text('Related channels')}</h3><div class="reference-links">${channelsForGate(gate).map(ch => `<button type="button" class="reference-link" data-shared-channel-select="${ch.gates.join('-')}">${ch.gates.join('–')} · ${esc(channelName(ch.gates))}</button>`).join('')}</div>`;
const query = objectId => ({ domain: 'human-design', objectType: 'penta', objectId });

/** Only reviewed, verified text is shown. Provenance stays in the Knowledge Layer. */
function specificReading(objectId) {
  const entry = getKnowledgeEntry(query(objectId));
  if (!entry || entry.reviewStatus !== 'reviewed' || entry.properties.evidence?.status !== 'verified') return '';
  const slots = [entry.summary, entry.detail].filter(slot => slot?.reviewStatus === 'reviewed' && slot.evidenceStatus === 'verified' && slot.content?.trim());
  if (!slots.length) return '';
  return `<section data-penta-specific><h3>${text('Penta specific reading')}</h3>${slots.map(slot => `<p>${esc(slot.content)}</p>`).join('')}</section>`;
}
function member(id, ctx) {
  const person = (ctx.people || []).find(item => item.memberId === id);
  return `${esc(person?.displayName || id)}${person?.timeUnknown ? ` <small class="shared-detail-estimated">(${text('Estimated at noon')})</small>` : ''}`;
}
function activations(record, ctx) {
  const rows = (record.activations || []).map(a => `<li>${member(a.memberId, ctx)} · ${a.side === 'design' ? 'D' : 'P'} (${text(a.side === 'design' ? 'Design' : 'Personality')}) · ${esc(planetName(a.planet))} · ${esc(a.gate)}.${esc(a.line)}</li>`).join('');
  return `<section data-penta-activations><h3>${text('Penta group activations')}</h3>${ctx.groupLabel ? `<p>${esc(ctx.groupLabel)}</p>` : ''}${rows ? `<ul>${rows}</ul>` : `<p>${text('No Penta contributors')}</p>`}</section>`;
}
const states = { absent: 'Not covered', selfComplete: 'One member covers both gates', crossMemberOnly: 'Covered across members', both: 'Covered individually and across members' };

export const pentaDetailAdapter = Object.freeze({
  gate(record, ctx = {}) {
    if (!record || !GATES[record.gate]) return '';
    const gate = record.gate;
    return `<header><h2>${text('Gate {gate}', { gate })} · ${esc(gateName(gate))}</h2><p>${esc(hexagramName(gate))} · ${esc(centerName(GATES[gate].center))}</p></header>
      ${activations(record, ctx)}${specificReading(`gate:${gate}`)}
      ${renderSharedGateReading(gate, { activeLines: [...new Set((record.activations || []).map(a => a.line))] })}${channelLinks(gate)}`;
  },
  channel(record, ctx = {}) {
    const channel = channelById(record?.channelId);
    if (!channel) return '';
    return `<header><h2>${text('Channel')} ${esc(record.channelId)} · ${esc(channelName(channel.gates))}</h2></header>
      <section data-penta-channel-state><h3>${text('Penta endpoint contributions')}</h3>${ctx.groupLabel ? `<p>${esc(ctx.groupLabel)}</p>` : ''}<p>${text(states[record.status] || 'Not covered')}</p>
      <ul>${record.gates.map(gate => `<li>${text('Gate {gate}', { gate })}: ${(record.holdersByGate?.[gate] || []).map(id => member(id, ctx)).join(' · ') || text('No Penta contributors')}</li>`).join('')}</ul></section>
      ${specificReading(`channel:${record.channelId}`)}${renderSharedChannelReading(record.channelId)}
      <h3>${text('Related gates')}</h3><div class="reference-links">${channel.gates.map(gateLink).join('')}</div>`;
  },
  knowledge(objectId, ctx = {}) {
    const entry = getKnowledgeEntry(query(objectId));
    if (!entry) return '';
    return `<header><h2>${esc(entry.name)}</h2>${ctx.groupLabel ? `<p>${esc(ctx.groupLabel)}</p>` : ''}</header>${specificReading(objectId)}`;
  },
  bind: bindSharedObjectDetails
});

/** The host owns its dialog/history. Delegation survives body replacement; dispose is idempotent.
 * Escape, focus trapping/restoration and Back remain owned by detail-dialog and host navigation.
 * Optional onBack is for hosts exposing a shared back button; no second keyboard handler is installed.
 */
export function bindSharedObjectDetails(root, ctx = {}) {
  bindings.get(root)?.();
  const onClick = event => {
    const target = event.target.closest?.('button');
    if (!target || !root.contains(target)) return;
    if (target.hasAttribute('data-shared-lens')) {
      const section = target.closest('[data-shared-gate]');
      const lens = target.dataset.sharedLens;
      if (!section || !lenses.has(lens)) return;
      section.querySelectorAll('[data-shared-lens]').forEach(button => {
        const active = button.dataset.sharedLens === lens;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      const activeLines = section.dataset.activeLines.split(',').filter(Boolean).map(Number);
      const selectedLine = section.dataset.selectedLine ? Number(section.dataset.selectedLine) : null;
      section.querySelector('[data-shared-reading]').innerHTML = gateReading(Number(section.dataset.sharedGate), lens, { activeLines, selectedLine });
      ctx.onLensChange?.(lens);
    } else if (target.hasAttribute('data-shared-gate-select')) ctx.onGateSelect?.(Number(target.dataset.sharedGateSelect));
    else if (target.hasAttribute('data-shared-channel-select')) ctx.onChannelSelect?.(target.dataset.sharedChannelSelect);
    else if (target.hasAttribute('data-shared-back')) ctx.onBack?.();
  };
  root.addEventListener('click', onClick);
  const dispose = () => { root.removeEventListener('click', onClick); if (bindings.get(root) === dispose) bindings.delete(root); };
  bindings.set(root, dispose);
  return dispose;
}
