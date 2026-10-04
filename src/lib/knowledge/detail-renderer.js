import { getKnowledgeEntry, getKnowledgeEntryById } from './registry.js';
import { resolveKnowledgeText } from './terms.js';
import { t } from '../i18n.js';
import { variableDirection } from '../variable-arrows.js';
import { esc } from '../format.js';

const categoryLabels = {
  type: 'Type', authority: 'Authority', profile: 'Profile',
  definition: 'Definition', cross: 'Incarnation Cross', cognition: 'Cognition'
};
const variableLabels = {
  determination: 'Determination', environment: 'Environment',
  perspective: 'Perspective', motivation: 'Motivation'
};
const profileLabels = {
  rightAngle: 'Right Angle · Personal destiny',
  juxtaposition: 'Juxtaposition · Fixed destiny',
  leftAngle: 'Left Angle · Transpersonal destiny'
};
const angleLabels = { right: 'Right Angle', left: 'Left Angle', juxtaposition: 'Juxtaposition' };

function header(entry) {
  const kind = entry.properties.kind;
  const label = entry.objectType === 'variable' ? variableLabels[kind] : categoryLabels[entry.objectType];
  const name = entry.objectType === 'profile' ? `${entry.objectId} ${entry.name}` : entry.name;
  return `<div class="detail-label">${esc(t(label))}</div><h2 class="detail-name">${esc(name)}</h2>`;
}

// Properties remain complete in the registry. Each object explicitly chooses its public display.
function coreInformation(entry) {
  const p = entry.properties;
  if (entry.objectType === 'type') {
    const facts = [['Strategy', p.strategy], ['Signature', p.signature], ['Not-Self Theme', p.notSelf]];
    return `<dl class="knowledge-type-properties">${facts.map(([label, value]) => `<dt>${esc(t(label))}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
  }
  if (entry.objectType === 'profile') return `<p class="knowledge-secondary">${esc(t(profileLabels[p.geometry]))}</p>`;
  if (entry.objectType === 'cross' && (p.angle || p.gates)) {
    return `<p class="knowledge-secondary knowledge-cross-meta">${[p.angle && esc(t(angleLabels[p.angle])), p.gates && `${esc(t('Gates'))} ${esc(p.gates.join(' / '))}`].filter(Boolean).join(' · ')}</p>`;
  }
  return '';
}

function chartContext(entry, slot) {
  if (entry.objectType !== 'variable' || !slot) return '';
  const direction = variableDirection(slot);
  const directionText = direction ? `${direction === 'left' ? '←' : '→'} ${t(direction === 'left' ? 'Left — focused' : 'Right — receptive')}` : '';
  return `<aside class="knowledge-context">${directionText ? `<div class="knowledge-direction">${esc(directionText)}</div>` : ''}<div class="knowledge-substructure">${esc(t('Color {color} · Tone {tone} · Base {base}', slot))}</div></aside>`;
}

function paragraphs(slot) {
  if (!slot) return `<p class="knowledge-missing">${esc(t('Content unavailable.'))}</p>`;
  return (slot.template ?? slot.content).split(/\n\n+/).map(text => `<p>${slot.template ? resolveKnowledgeText(text, { rich: true }) : esc(text)}</p>`).join('');
}

/** One public article for Modal and Library; chart context never changes Knowledge content. */
export function renderKnowledgeDetail(query, { variableContext = null, contextText = '' } = {}) {
  const entry = typeof query === 'string' ? getKnowledgeEntryById(query) : getKnowledgeEntry(query);
  if (!entry) return `<p class="knowledge-missing">${esc(t('Content unavailable.'))}</p>`;
  const shared = entry.objectType === 'cross' && entry.objectId !== 'introduction'
    ? getKnowledgeEntry({ objectType: 'cross', objectId: 'introduction' }) : null;
  const source = entry.objectType === 'variable'
    ? (['determination', 'environment'].includes(entry.properties.kind) ? 'design' : 'personality') : null;
  return `<article class="knowledge-detail" data-knowledge-id="${esc(entry.id)}" data-object-type="${esc(entry.objectType)}"${source ? ` data-source="${source}"` : ''}>${header(entry)}${entry.summary ? `<p class="knowledge-summary">${esc(entry.summary.content)}</p>` : ''}${coreInformation(entry)}${chartContext(entry, variableContext)}${contextText ? `<aside class="knowledge-context">${esc(contextText)}</aside>` : ''}<section class="knowledge-body">${paragraphs(shared?.detail ?? entry.detail)}</section></article>`;
}
