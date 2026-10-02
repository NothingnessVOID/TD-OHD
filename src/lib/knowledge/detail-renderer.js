import { getKnowledgeEntry } from './registry.js';
import { resolveKnowledgeText } from './terms.js';
import { t } from '../i18n.js';
import { typeName } from '../vocabulary.js';
import { TYPES } from '../human-design/catalog.js';
import { esc } from '../format.js';
const geometryLabel = {rightAngle:'Right Angle',juxtaposition:'Juxtaposition',leftAngle:'Left Angle'};
function structuredFacts(entry) {
  const p=entry.properties, facts=[];
  if(entry.objectType==='type') {
    facts.push([t('Family'),typeName(TYPES[p.family]?.name)], [t('Taxonomy'),t(p.taxonomy==='subtype'?'Subtype':'Type identity')], [t('Strategy'),p.strategy],[t('Signature'),p.signature],[t('Not-Self Theme'),p.notSelf]);
  }
  if(entry.objectType==='profile')facts.push([t('Geometry'),t(geometryLabel[p.geometry])]);
  if(entry.objectType==='definition')facts.push([t('Taxonomy'),t(p.taxonomy==='state'?'State':'Type identity')],[t('Component count'),p.componentCount]);
  if(entry.objectType==='variable')facts.push([t('Color'),p.color]);
  if(entry.objectType==='cross'&&p.angle)facts.push([t('Angle'),t({right:'Right Angle',left:'Left Angle',juxtaposition:'Juxtaposition'}[p.angle]??p.angle)]);
  if(entry.objectType==='cross'&&p.gates)facts.push([t('Gates'),p.gates.join(' / ')]);
  return facts.length?`<section class="knowledge-facts"><h3>${esc(t('Structured Facts'))}</h3><dl>${facts.map(([label,value])=>`<dt>${esc(label)}</dt><dd>${esc(String(value??''))}</dd>`).join('')}</dl></section>`:'';
}
function paragraphs(slot) {
  if(!slot)return `<p class="knowledge-missing">${esc(t('Content unavailable.'))}</p>`;
  return (slot.template??slot.content).split(/\n\n+/).map(text=>`<p>${slot.template?resolveKnowledgeText(text,{rich:true}):esc(text)}</p>`).join('');
}
/** One knowledge body for every future surface. Context is escaped and kept outside it. */
export function renderKnowledgeDetail(query, {contextText=''}={}) {
  const entry=getKnowledgeEntry(query);
  if(!entry)return `<p class="knowledge-missing">${esc(t('Content unavailable.'))}</p>`;
  const shared=entry.objectType==='cross'&&entry.objectId!=='introduction'?getKnowledgeEntry({objectType:'cross',objectId:'introduction'}):null;
  return `${contextText?`<aside class="knowledge-context">${esc(contextText)}</aside>`:''}<article class="knowledge-detail" data-knowledge-id="${esc(entry.id)}" data-version="${entry.version}"><h2>${esc(entry.name)}</h2>${entry.summary?`<p class="knowledge-summary">${esc(entry.summary.content)}</p>`:''}${structuredFacts(entry)}<section class="knowledge-body"><h3>${esc(t('Detail'))}</h3>${shared?`<h4>${esc(t('Shared Cross introduction'))}</h4>${paragraphs(shared.detail)}<p class="knowledge-missing">${esc(t('Specific Cross detail is unavailable.'))}</p>`:paragraphs(entry.detail)}</section></article>`;
}
