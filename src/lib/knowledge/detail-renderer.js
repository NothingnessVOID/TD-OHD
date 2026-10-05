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
  if (entry.objectType === 'type' && !entry.detail?.presentation) {
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
  if (!slot) return '';
  return (slot.template ?? slot.content).split(/\n\n+/).map(text => text.startsWith('### ') ? `<h3>${esc(text.slice(4))}</h3>` : `<p>${slot.template ? resolveKnowledgeText(text, { rich: true }).replaceAll('\n','<br>') : esc(text).replaceAll('\n','<br>')}</p>`).join('');
}


// Semantic ranges point into the sole locale body, without copying prose or matching visible headings.
function structuredBody(slot, variableContext) {
  const presentation = slot?.presentation;
  if (!presentation) return paragraphs(slot);
  const text = slot.template ?? slot.content;
  const range = value => text.slice(value.start, value.end);
  const prose = value => range(value).split(/\n\n+/).map(p => `<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('');
  if (presentation.kind === 'type') {
    const f = presentation.fields;
    return `<section class="knowledge-section"><h3>${esc(t('Strategy'))}</h3><p class="knowledge-value">${esc(range(f.strategyValue))}</p>${prose(f.strategyDetail)}</section><section class="knowledge-section"><h3>${esc(t('Aura'))}</h3><p class="knowledge-value">${esc(range(f.auraKeywords))}</p>${prose(f.auraDetail)}</section><dl class="knowledge-type-properties"><dt>${esc(t('Signature'))}</dt><dd>${esc(range(f.signature))}</dd><dt>${esc(t('Not-Self Theme'))}</dt><dd>${esc(range(f.notSelf))}</dd></dl>`;
  }
  const tone = Number(variableContext?.tone);
  const selected = tone >= 1 && tone <= 3 ? 'tone1to3' : tone >= 4 && tone <= 6 ? 'tone4to6' : null;
  return presentation.sections.map(section => `<section class="knowledge-section" data-section="${section.id}">${section.title ? `<h3>${esc(section.title)}${selected === section.id ? `<span class="knowledge-yours">${esc(t('Yours'))}</span>` : ''}</h3>` : ''}${prose(section)}</section>`).join('');
}

/** One public article for Modal and Library; chart context never changes Knowledge content. */
export function renderKnowledgeDetail(query, { variableContext = null, contextText = '' } = {}) {
  const entry = typeof query === 'string' ? getKnowledgeEntryById(query) : getKnowledgeEntry(query);
  if (!entry) return `<p class="knowledge-missing">${esc(t('Content unavailable.'))}</p>`;
  const shared = entry.objectType === 'cross' && entry.objectId !== 'introduction'
    ? getKnowledgeEntry({ objectType: 'cross', objectId: 'introduction' }) : null;
  const source = entry.objectType === 'variable'
    ? (['determination', 'environment'].includes(entry.properties.kind) ? 'design' : 'personality') : null;
  return `<article class="knowledge-detail" data-knowledge-id="${esc(entry.id)}" data-object-type="${esc(entry.objectType)}"${source ? ` data-source="${source}"` : ''}>${header(entry)}${entry.summary ? `<p class="knowledge-summary">${esc(entry.summary.content)}</p>` : ''}${coreInformation(entry)}${chartContext(entry, variableContext)}${contextText ? `<aside class="knowledge-context">${esc(contextText)}</aside>` : ''}<section class="knowledge-body">${structuredBody(shared?.detail ?? entry.detail, variableContext)}</section></article>`;
}
