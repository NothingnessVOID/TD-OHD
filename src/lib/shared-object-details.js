import { gateReading, channelReading, channelsForGate, channelById } from './reference-content.js';
import { renderGateLensSwitch } from './gate-lenses.js';
import { getKnowledgeEntry } from './knowledge/registry.js';
import { pentaPackage, PENTA_CONTENT_SOURCE } from './knowledge/content/penta.js';
import { gateName, channelName, planetName } from './vocabulary.js';
import { renderKnowledgeArticle, renderProse } from './knowledge/detail-renderer.js';
import './penta-reading-messages.js';
import { renderGateDetailHeading, renderChannelDetailHeading, renderDetailNavigation } from './object-detail-heading.js';
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

const gateLink = gate => `<button type="button" class="transit-detail-link" data-shared-gate-select="${gate}"><span class="transit-detail-gate"><strong>${text('Gate {gate}', { gate })} · ${esc(gateName(gate))}</strong></span><span class="transit-detail-action">${text('View gate details')}</span></button>`;
const channelLinks = gate => `<h3>${text('Related channels')}</h3><div class="reference-links">${channelsForGate(gate).map(ch => `<button type="button" class="reference-link" data-shared-channel-select="${ch.gates.join('-')}">${ch.gates.join('–')} · ${esc(channelName(ch.gates))}</button>`).join('')}</div>`;
const query = objectId => ({ domain: 'human-design', objectType: 'penta', objectId });

/** Editorial acceptance is explicit; it never upgrades evidence to verified. */
export function pentaReadingEntry(objectId) {
  const entry = getKnowledgeEntry(query(objectId));
  if (!entry || entry.reviewStatus !== 'reviewed') return null;
  const p = entry.properties;
  const reviewed = slot => slot?.reviewStatus === 'reviewed' && Boolean(slot.content?.trim());
  const editorial = p.interpretationStatus === 'editorial-reviewed'
    && p.contentPackage === pentaPackage.contentPackage && p.contentVersion === pentaPackage.contentVersion
    && p.editorialReview?.status === 'complete' && p.editorialReview.actor === pentaPackage.editorialReview.actor
    && Array.isArray(p.sourceRefs) && p.sourceRefs.length > 0
    && p.sourceRefs.every(ref => typeof ref.sourceId === 'string' && Object.hasOwn(pentaPackage.sourceRegistry, ref.sourceId)
      && typeof ref.locator === 'string' && Boolean(ref.locator.trim())
      && typeof (ref.scope ?? ref.use) === 'string' && Boolean((ref.scope ?? ref.use).trim()))
    && [entry.summary, entry.detail].every(slot => reviewed(slot) && slot.sourceId === PENTA_CONTENT_SOURCE && slot.evidenceStatus === 'editorial-reviewed')
    && entry.summary.content.trim() !== entry.detail.content.trim();
  const verified = p.evidence?.status === 'verified'
    && (!/^(gate|channel):/.test(objectId) || p.interpretationStatus === 'verified');
  if (!editorial && !verified) return null;
  const accepted = slot => reviewed(slot) && (editorial || slot.evidenceStatus === 'verified');
  return { ...entry, summary: accepted(entry.summary) ? entry.summary : null, detail: accepted(entry.detail) ? entry.detail : null };
}
const pentaProse = renderProse;
export function renderPentaSummary(objectId) {
  const entry = pentaReadingEntry(objectId);
  return entry?.summary ? `<div class="penta-context-note" data-penta-summary>${pentaProse(entry.summary)}</div>` : '';
}
export function renderPentaReading(objectId) {
  const entry = pentaReadingEntry(objectId);
  if (!entry || (!entry.summary && !entry.detail)) return '';
  return `<section data-penta-specific>${renderKnowledgeArticle(entry)}</section>`;
}
const specificReading = renderPentaReading;
function member(id, ctx) {
  const person = (ctx.people || []).find(item => item.memberId === id);
  const index = person?.displayIndex || (ctx.people || []).findIndex(item => item.memberId === id) + 1;
  return `<span class="penta-member-identity"><span class="penta-member-tag penta-member-${index}">${index || '·'}</span><span>${esc(person?.displayName || id)}</span>${person?.timeUnknown ? ` <small class="shared-detail-estimated">(${text('Estimated at noon')})</small>` : ''}</span>`;
}
function activations(record, ctx) {
  const groups = new Map();
  for (const activation of record.activations || []) {
    if (!groups.has(activation.memberId)) groups.set(activation.memberId, []);
    groups.get(activation.memberId).push(activation);
  }
  const rows = [...groups].map(([id, entries]) => `<div class="penta-member-${(ctx.people || []).find(p => p.memberId === id)?.displayIndex || (ctx.people || []).findIndex(p => p.memberId === id) + 1}" data-penta-member="${esc(id)}"><h4>${member(id, ctx)}</h4><ul>${entries.map(a => {
    const side = a.side === 'design' ? 'design' : 'personality';
    return `<li><span data-activation-side="${side}">${side === 'design' ? 'D' : 'P'} (${text(side === 'design' ? 'Design' : 'Personality')})</span> · ${esc(planetName(a.planet))} · ${esc(a.gate)}.${esc(a.line)}</li>`;
  }).join('')}</ul></div>`).join('');
  return `<section data-penta-activations><h3>${text('Penta group activations')}</h3>${ctx.groupLabel ? `<p>${esc(ctx.groupLabel)}</p>` : ''}${rows || `<p>${text('No Penta contributors')}</p>`}</section>`;
}
const states = { absent: 'Not covered', selfComplete: 'One member covers both gates', crossMemberOnly: 'Covered across members', both: 'Covered individually and across members' };

export const pentaDetailAdapter = Object.freeze({
  navigation: renderDetailNavigation,
  gate(record, ctx = {}) {
    if (!record || !GATES[record.gate]) return '';
    const gate = record.gate;
    return `<header><div class="tl-detail-header tl-gate-detail-header" data-source-context="penta"><div class="tl-detail-heading">${renderGateDetailHeading(gate)}</div></div></header>
      ${activations(record, ctx)}${specificReading(`gate:${gate}`)}
      ${renderSharedGateReading(gate, { activeLines: [...new Set((record.activations || []).map(a => a.line))] })}${channelLinks(gate)}`;
  },
  channel(record, ctx = {}) {
    const channel = channelById(record?.channelId);
    if (!channel) return '';
    return `<header><div class="tl-detail-header tl-channel-detail-header" data-source-context="penta"><div class="tl-detail-heading">${renderChannelDetailHeading(record.channelId)}</div></div></header>
      <section data-penta-channel-state><span class="circuit-badge transit-source-badge">${text(states[record.status] || 'Not covered')}</span>${ctx.groupLabel ? `<p>${esc(ctx.groupLabel)}</p>` : ''}<h3>${text('Penta endpoint contributions')}</h3>
      <dl class="penta-detail-endpoints">${record.gates.map(gate => `<div><dt>${text('Gate {gate}', { gate })}</dt><dd>${(record.holdersByGate?.[gate] || []).map(id => member(id, ctx)).join(' ') || text('No Penta contributors')}</dd></div>`).join('')}</dl>
      ${(record.selfCompleteMemberIds || []).length ? `<h3>${text('Self complete members')}</h3><p>${record.selfCompleteMemberIds.map(id => member(id, ctx)).join(' ')}</p>` : ''}
      ${(record.complementaryMemberPairs || []).length ? `<h3>${text('Complementary member pairs')}</h3><ul>${record.complementaryMemberPairs.map(pair => `<li>${member(pair.upperMemberId, ctx)} ↔ ${member(pair.lowerMemberId, ctx)}</li>`).join('')}</ul>` : ''}
      ${record.missingGates?.length ? `<p>${text('Missing gates')}: ${record.missingGates.join(' · ')}</p>` : ''}</section>
      ${specificReading(`channel:${record.channelId}`)}${renderSharedChannelReading(record.channelId)}
      <h3>${text('Related gates')}</h3><div class="transit-channel-gates">${channel.gates.map(gateLink).join('')}</div>`;
  },
  knowledge(objectId, ctx = {}) {
    const entry = getKnowledgeEntry(query(objectId));
    if (!entry) return '';
    return `${ctx.groupLabel ? `<p>${esc(ctx.groupLabel)}</p>` : ''}${specificReading(objectId)}`;
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
