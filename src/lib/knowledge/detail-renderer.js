import { getKnowledgeEntry, getKnowledgeEntryById } from './registry.js';
import { resolveKnowledgeText } from './terms.js';
import { t } from '../i18n.js';
import { variableDirection } from '../variable-arrows.js';
import { esc } from '../format.js';

const categoryLabels = { type:'Type', authority:'Authority', profile:'Profile', definition:'Definition', cross:'Incarnation Cross', cognition:'Cognition' };
const variableLabels = { determination:'Determination', environment:'Environment', perspective:'Perspective', motivation:'Motivation' };
const profileLabels = { rightAngle:'Right Angle · Personal destiny', juxtaposition:'Juxtaposition · Fixed destiny', leftAngle:'Left Angle · Transpersonal destiny' };
const angleLabels = { right:profileLabels.rightAngle, left:profileLabels.leftAngle, juxtaposition:profileLabels.juxtaposition };
const textOf = slot => slot?.template ?? slot?.content ?? '';
const slice = (slot, range) => textOf(slot).slice(range.start, range.end);
const badge = (text, extra='') => `<span class="knowledge-badge${extra ? ' '+extra : ''}">${esc(text)}</span>`;
const chips = values => `<div class="knowledge-chips">${values.map(value=>`<span class="knowledge-chip">${esc(value)}</span>`).join('')}</div>`;
const surface = (title, body, id='') => `<section class="knowledge-surface"${id ? ` data-section="${id}"` : ''}>${title ? `<h3>${esc(title)}</h3>` : ''}${body}</section>`;
function renderProse(slot, range=null) {
  const text=range?slice(slot,range):textOf(slot);
  return text.split(/\n\n+/).filter(part=>part.trim()).map(part=>`<p>${resolveKnowledgeText(part,{rich:true}).replaceAll('\n','<br>')}</p>`).join('');
}
function renderHeader(entry) {
  const label=entry.objectType==='variable'?variableLabels[entry.properties.kind]:categoryLabels[entry.objectType];
  const name=entry.objectType==='profile'?`${entry.objectId} ${entry.name}`:entry.name;
  return `<div class="detail-label">${esc(t(label))}</div><h2 class="detail-name">${esc(name)}</h2>`;
}
function renderSummary(entry) {
  return entry.summary?`<aside class="knowledge-summary-callout"><div class="knowledge-summary-label">${esc(t('Overview'))}</div><p class="knowledge-summary knowledge-summary-text">${esc(entry.summary.content)}</p></aside>`:'';
}
function renderMetadata(rows) {
  return `<dl class="knowledge-meta knowledge-type-properties">${rows.map(([label,value])=>`<dt>${esc(t(label))}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
}
function renderType(entry) {
  const slot=entry.detail,fields=slot?.presentation?.fields;
  if(!fields)return renderMetadata([['Strategy',entry.properties.strategy],['Signature',entry.properties.signature],['Not-Self Theme',entry.properties.notSelf]])+renderProse(slot);
  return surface(t('Strategy'),`<p class="knowledge-value">${esc(slice(slot,fields.strategyValue))}</p>${renderProse(slot,fields.strategyDetail)}`,'strategy')
    +surface(t('Aura'),chips(slice(slot,fields.auraKeywords).split('·').map(value=>value.trim()))+renderProse(slot,fields.auraDetail),'aura')
    +renderMetadata([['Signature',slice(slot,fields.signature)],['Not-Self Theme',slice(slot,fields.notSelf)]]);
}
function renderProcess(slot, block) {
  return `<section class="knowledge-process-section" data-layout="process"><p class="knowledge-process-lead">${esc(slice(slot,block.lead))}</p><div class="knowledge-process">${block.steps.map((step,index)=>`<div class="knowledge-process-step">${esc(slice(slot,step))}</div>${block.separators[index]?`<span class="knowledge-process-separator">${esc(slice(slot,block.separators[index]))}${block.separators[index].decorativeArrow?'<span aria-hidden="true">→</span>':''}</span>`:''}`).join('')}</div></section>`;
}
function renderTimeline(slot, block) {
  return `<ol class="knowledge-timeline" data-layout="timeline">${block.stages.map(stage=>`<li class="knowledge-timeline-stage"><h3>${esc(slice(slot,stage.label))}</h3>${renderProse(slot,stage.body)}</li>`).join('')}</ol>`;
}
function renderProfile(entry) {
  const slot=entry.detail,blocks=slot?.presentation?.blocks;
  return `<div class="knowledge-reading">${blocks?blocks.map(block=>block.kind==='process'?renderProcess(slot,block):block.kind==='timeline'?renderTimeline(slot,block):renderProse(slot,block)).join(''):renderProse(slot)}</div>`;
}
function renderDefinition(entry) {
  const count=entry.properties.componentCount;
  // Abstract component count only: no centers, gates, channels or inferred topology.
  const structure=Number.isInteger(count)?`<div class="knowledge-structure" data-component-count="${count}" aria-hidden="true">${count?Array.from({length:count},()=>'<span class="knowledge-island"></span>').join(''):'<span class="knowledge-empty-structure"></span>'}</div>`:'';
  return structure+`<div class="knowledge-reading">${renderProse(entry.detail)}</div>`;
}
function renderCrossActivations(entry) {
  const p=entry.properties;
  const activations=p.gates?.length===4?`<div class="knowledge-cross-activations">${p.gates.map((gate,index)=>`<div class="knowledge-activation" data-activation="${['personality-sun','personality-earth','design-sun','design-earth'][index]}"><div class="knowledge-activation-label">${esc(t(['Personality Sun','Personality Earth','Design Sun','Design Earth'][index]))}</div>${chips([t('Gate {gate}',{gate})])}</div>`).join('')}</div>`:'';
  return activations;
}
function renderCross(entry, shared) {
  const slot=shared?.detail??entry.detail;
  return (slot?.presentation?.sections?slot.presentation.sections.map(section=>surface(slice(slot,section.title),renderProse(slot,section),section.id)).join(''):`<div class="knowledge-reading">${renderProse(slot)}</div>`);
}
function renderVariable(entry, context) {
  const slot=entry.detail,sections=slot?.presentation?.sections;
  if(!sections)return renderProse(slot);
  const tone=Number(context?.tone),selected=tone>=1&&tone<=3?'tone1to3':tone>=4&&tone<=6?'tone4to6':null;
  const render=section=>{
    const branch=section.id==='tone1to3'||section.id==='tone4to6';
    return `<section class="knowledge-section${branch?' knowledge-surface knowledge-branch':section.id==='intro'?' knowledge-reading':' knowledge-surface knowledge-information'}"${branch?` data-selected="${selected===section.id}"`:''} data-section="${section.id}">${section.title?`<h3>${esc(section.title)}${selected===section.id?`<span class="knowledge-yours">${esc(t('Yours'))}</span>`:''}</h3>`:''}${renderProse(slot,section)}</section>`;
  };
  return sections.filter(s=>s.id==='intro').map(render).join('')+`<div class="knowledge-branches">${sections.filter(s=>s.id==='tone1to3'||s.id==='tone4to6').map(render).join('')}</div>`+sections.filter(s=>!['intro','tone1to3','tone4to6'].includes(s.id)).map(render).join('');
}
function renderContext(entry, slot) {
  if(entry.objectType!=='variable'||!slot)return '';
  const direction=variableDirection(slot);
  return `<aside class="knowledge-context knowledge-context-badges">${direction?badge(`${direction==='left'?'←':'→'} ${t(direction==='left'?'Left — focused':'Right — receptive')}`,'knowledge-direction'):''}${badge(t('Color {color} · Tone {tone} · Base {base}',slot),'knowledge-substructure')}</aside>`;
}
function renderGeometry(entry) {
  if(entry.objectType==='profile')return badge(entry.detail?.presentation?.geometry??t(profileLabels[entry.properties.geometry]),'knowledge-geometry');
  if(entry.objectType==='cross'&&entry.properties.angle)return `<div class="knowledge-cross-meta">${badge(t(angleLabels[entry.properties.angle]),'knowledge-geometry')}</div>`;
  return '';
}
/** One shared article renderer; object identity and explicit metadata select the visual structure. */
export function renderKnowledgeDetail(query,{variableContext=null,contextText=''}={}) {
  const entry=typeof query==='string'?getKnowledgeEntryById(query):getKnowledgeEntry(query);
  if(!entry)return `<p class="knowledge-missing">${esc(t('Content unavailable.'))}</p>`;
  const shared=entry.objectType==='cross'&&entry.objectId!=='introduction'?getKnowledgeEntry({objectType:'cross',objectId:'introduction'}):null;
  const renderers={type:()=>renderType(entry),authority:()=>`<div class="knowledge-reading">${renderProse(entry.detail)}</div>`,profile:()=>renderProfile(entry),definition:()=>renderDefinition(entry),cross:()=>renderCross(entry,shared),variable:()=>renderVariable(entry,variableContext)};
  const source=entry.objectType==='variable'?(['determination','environment'].includes(entry.properties.kind)?'design':'personality'):null;
  return `<article class="knowledge-detail" data-knowledge-id="${esc(entry.id)}" data-object-type="${esc(entry.objectType)}"${source?` data-source="${source}"`:''}>${renderHeader(entry)}${renderGeometry(entry)}${renderContext(entry,variableContext)}${contextText?`<aside class="knowledge-context">${esc(contextText)}</aside>`:''}${renderSummary(entry)}${entry.objectType==='cross'?renderCrossActivations(entry):''}<section class="knowledge-body">${renderers[entry.objectType]?.()??renderProse(entry.detail)}</section></article>`;
}
