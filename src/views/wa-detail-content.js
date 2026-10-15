import '../lib/wa/oc16-messages.js';
import '../lib/wa/detail-messages.js';
import '../lib/wa/ui-messages.js';
import { renderWaMemberMarker } from '../lib/wa/member-markers.js';
import { getLocale, t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { gateName, hexagramName, planetName, channelName } from '../lib/vocabulary.js';
import { renderGateDetailHeading } from '../lib/object-detail-heading.js';
import { renderProse } from '../lib/knowledge/detail-renderer.js';
import { readWaContent } from '../lib/wa/content.js';
import { readWaReadingExcerpt } from '../lib/wa/reading-presentation.js';
import { OC16_DEPARTMENTS } from '../lib/wa/oc16-catalog.js';
import { waStateText, waStateSymbol } from './wa-diagram.js';

const pairs = OC16_DEPARTMENTS.flatMap(department => department.pairs);
const statuses = new Set(['absent', 'hanging', 'selfComplete', 'crossMemberOnly', 'both']);
const text = (key,params) => esc(t(key,params));
const unknown = () => text('OC16 unknown');
const displayName = (id, nameOf) => esc(nameOf(id) || id);
const person = (id, nameOf, markerOf=()=>null) => `<span class="wa-person-ref">${renderWaMemberMarker(markerOf(id),{name:nameOf(id)})}<span class="wa-detail-member" data-wa-member="${esc(id)}">${displayName(id, nameOf)}</span></span>`;
const names = (ids, nameOf, emptyKey = 'OC16 inactive', markerOf=()=>null) => Array.isArray(ids)
  ? ids.map(id => person(id, nameOf, markerOf)).join(' ') || text(emptyKey) : unknown();
export function waChannelTitle(channelId) {
  const pair=pairs.find(pair=>pair.channelId===channelId);if(!pair)return '';
  if(pair.role!=='core')return channelName(channelId);
  const entry=readWaContent(channelId,getLocale());if(!entry)return t(`OC16 ${pair.departmentId}`);
  const prefix=entry.packageId.replace('-','–')+' ';
  const title=entry.name.startsWith(prefix)?entry.name.slice(prefix.length):entry.name;
  return getLocale()==='en'?title:title.split('｜').at(-1);
}
const stateHtml = value => {
  const state = statuses.has(value?.status) ? value.status : 'unknown';
  return `<span class="wa-detail-state" data-wa-state="${state}">${waStateSymbol(state)}<span>${esc(waStateText(state))}</span></span>`;
};
const gateLabel = gate => `<strong>${gate}</strong> · ${esc(gateName(gate))} · ${esc(hexagramName(gate))}`;
const fold = (label, body, attributes = '') => `<details class="wa-detail-fold" ${attributes}><summary tabindex="0">${text(label)}</summary>${body}</details>`;

/** Shared by inline rows, department, pair and gate details. Preserve every source row, including duplicates. */
export function renderActivationRows(activations, { nameOf = id => id, markerOf=()=>null } = {}) {
  if (!Array.isArray(activations)) return `<p class="wa-detail-note">${unknown()}</p>`;
  const groups = new Map();
  for (const activation of activations) {
    if (!groups.has(activation.memberId)) groups.set(activation.memberId, []);
    groups.get(activation.memberId).push(activation);
  }
  return `<div class="wa-detail-activations" data-wa-activations>${[...groups].map(([id, records]) =>
    `<section class="wa-detail-activation-member" data-wa-activation-member="${esc(id)}"><div class="wa-activation-heading">${renderWaMemberMarker(markerOf(id),{name:nameOf(id)})}<h4>${displayName(id, nameOf)}</h4></div><ul>${records.map(a => {
      const side = ['personality', 'design'].includes(a.side) ? a.side : 'unknown';
      return `<li class="wa-detail-activation" data-wa-member="${esc(a.memberId)}" data-activation-side="${esc(a.side)}" data-activation-planet="${esc(a.planet)}" data-activation-gate="${esc(a.gate)}" data-activation-line="${esc(a.line)}"><span class="wa-detail-source" data-wa-side="${side}">${text(side === 'unknown' ? 'Wa detail unknown source' : `OC16 ${side}`)}</span><span>${esc(planetName(a.planet))}</span><strong>${esc(a.gate ?? '—')}.${esc(a.line ?? '—')}</strong></li>`;
    }).join('')}</ul></section>`).join('') || `<p class="wa-detail-note">${text('OC16 inactive')}</p>`}</div>`;
}

export function renderWaReading(id) {
  const excerpt=readWaReadingExcerpt(id,getLocale());if(!excerpt)return `<p>${text('Wa detail unavailable')}</p>`;
  const entry=excerpt.source;
  return `<article data-wa-reading-id="${esc(entry.id)}" data-wa-package-id="${esc(entry.packageId)}" data-wa-source-refs="${esc(entry.sourceRefs.join(' '))}" data-wa-display-map="${excerpt.presentationVersion}" data-wa-paragraphs="${excerpt.paragraphIndexes.join(',')}"><h3>${esc(entry.name)}</h3>${excerpt.summary===null?'':`<div class="knowledge-summary-callout" data-wa-prose="summary">${renderProse({content:excerpt.summary})}</div>`}<div class="knowledge-body" data-wa-prose="detail">${renderProse({content:excerpt.detail})}</div></article>`;
}
function pairReading(pair,gate=null) {
  const core=OC16_DEPARTMENTS.find(department=>department.id===pair.departmentId).pairs[0];
  const own=pair.role==='core'&&gate===null;
  return fold(own?'Wa UI channel reading':'Wa UI department reading',renderWaReading(core.channelId),
    `data-wa-knowledge="${own?'wa':'wa-department'}" data-wa-content-id="${core.channelId}" data-wa-reading-for="${gate===null?pair.channelId:`gate:${gate}`}"`);
}

/** Pure HTML only. Each method takes one fresh snapshot from the host's current scope. */
export function createWaDetailRenderer({ getResult, nameOf = id => id, markerOf=()=>null }) {
  function context() {
    const candidate = getResult();
    const result = ['ready', 'empty'].includes(candidate?.status) ? candidate : null;
    return {
      result,
      gates: new Map((result?.gateRecords || []).map(record => [record.gate, record])),
      pairs: new Map((result?.pairs || []).map(record => [record.channelId, record]))
    };
  }
  function endpoint(gate, ids, { link = true, side = null } = {}) {
    const label = link ? `<button type="button" class="wa-detail-link" data-wa-gate="${gate}">${gateLabel(gate)}</button>` : gateLabel(gate);
    return `<div class="wa-detail-endpoint" data-wa-endpoint="${gate}" data-wa-covered="${Array.isArray(ids) ? ids.length > 0 : 'unknown'}">${side?`<div class="wa-endpoint-side">${text(`Wa UI ${side} gate`)}</div>`:''}<div class="wa-detail-gate-label">${label}</div><div class="wa-detail-members">${names(ids, nameOf,'OC16 inactive',markerOf)}</div></div>`;
  }
  function endpoints(pair, ctx, options) {
    const record = ctx.pairs.get(pair.channelId);
    return `<div class="wa-detail-endpoints">${pair.displayGates.map((gate,index) => endpoint(gate, record?.holdersByGate?.[gate], {...options,side:index?'right':'left'})).join('')}</div>`;
  }
  /** Department rows: gate title + always-visible activations (no card chrome, no expand). */
  function gateActivationColumn(gate, ids, ctx) {
    const record = ctx.gates.get(gate);
    const covered = Array.isArray(ids) ? ids.length > 0 : 'unknown';
    const label = `<button type="button" class="wa-detail-link" data-wa-gate="${gate}">${gateLabel(gate)}</button>`;
    let body;
    if (Array.isArray(record?.memberIds) && record.memberIds.length === 0) {
      body = `<div class="wa-detail-members"><span class="wa-detail-note">${text('OC16 inactive')}</span></div>`;
    } else if (!Array.isArray(record?.activations)) {
      body = `<div class="wa-detail-members"><span class="wa-detail-note">${unknown()}</span></div>`;
    } else {
      // One name line then its activation lines — no separate chip list above.
      body = renderActivationRows(record.activations, { nameOf, markerOf });
    }
    return `<div class="wa-detail-endpoint wa-detail-endpoint--flat" data-wa-endpoint="${gate}" data-wa-covered="${covered}" data-wa-gate-activations="${gate}"><div class="wa-detail-gate-label">${label}</div>${body}</div>`;
  }
  function pairRows(department, ctx, { compact = false } = {}) {
    if (!department?.pairs) return '';
    return `<div class="wa-detail-pair-rows${compact ? ' wa-detail-compact' : ''}">${department.pairs.map(pair =>
      `<article class="wa-detail-pair-row" data-pair-row="${pair.channelId}"><header class="wa-detail-row-heading"><button type="button" class="wa-detail-link" data-wa-pair="${pair.channelId}"><strong>${pair.displayGates.join('–')}</strong></button><span>${text(pair.role === 'core' ? 'OC16 core' : 'OC16 support')}</span>${stateHtml(ctx.pairs.get(pair.channelId))}</header><div class="wa-detail-endpoints">${pair.displayGates.map(gate => `<div class="wa-detail-endpoint-cell">${gateActivationColumn(gate, ctx.pairs.get(pair.channelId)?.holdersByGate?.[gate], ctx)}</div>`).join('')}</div></article>`
    ).join('')}</div>`;
  }
  function relationships(pair, record) {
    // first/second belong to canonical result gates, never to the visual left/right positions.
    const groups = new Map();
    for (const combination of record?.complementaryMemberPairs || []) {
      const membersByGate = new Map([[record.gates[0], combination.firstMemberId], [record.gates[1], combination.secondMemberId]]);
      const left = membersByGate.get(pair.displayGates[0]), right = membersByGate.get(pair.displayGates[1]);
      if (!groups.has(left)) groups.set(left, []);
      groups.get(left).push(right);
    }
    const combinations = groups.size ? `<p class="wa-detail-note">${pair.displayGates.join(' ↔ ')}</p><ul class="wa-detail-combinations">${[...groups].map(([left, rights]) => `<li data-wa-combination-left="${esc(left)}" data-wa-left-gate="${pair.displayGates[0]}" data-wa-right-gate="${pair.displayGates[1]}"><span><small>${pair.displayGates[0]}</small> ${person(left, nameOf, markerOf)}</span> <span aria-hidden="true">↔</span> <span><small>${pair.displayGates[1]}</small> ${rights.map(right => `<span data-wa-combination-right="${esc(right)}">${person(right, nameOf, markerOf)}</span>`).join(' ')}</span></li>`).join('')}</ul>`
      : `<p>${Array.isArray(record?.complementaryMemberPairs) ? text('Wa detail none') : unknown()}</p>`;
    return `<section class="wa-detail-relationships"><h3>${text('Wa detail relationships')}</h3><h4>${text('OC16 covered by one')}</h4><div data-wa-self-complete>${names(record?.selfCompleteMemberIds, nameOf, 'Wa detail none', markerOf)}</div><h4>${text('Wa detail combinations')}</h4>${combinations}</section>`;
  }
  function channelCard(pair,ctx) {
    const record=ctx.pairs.get(pair.channelId);
    const ids=Array.isArray(record?.contributorIds)?record.contributorIds:Array.isArray(record?.gateRecords)&&record.gateRecords.every(row=>Array.isArray(row.memberIds))?[...new Set(record.gateRecords.flatMap(row=>row.memberIds))]:null;
    const count=record?.contributorCount??(ids?ids.length:'—');
    return `<article class="wa-channel-card" data-pair-row="${pair.channelId}" data-participant-count="${count}"><header><button type="button" class="wa-channel-open" data-wa-pair="${pair.channelId}"><span class="wa-channel-kind">${text(pair.role==='core'?'OC16 core':'OC16 support')}</span><strong>${pair.displayGates.join('–')} <span>${esc(waChannelTitle(pair.channelId))}</span></strong></button><span class="wa-channel-status" data-wa-state="${record?.status||'unknown'}">${text(!record?'OC16 unknown':['selfComplete','crossMemberOnly','both'].includes(record.status)?'Wa UI complete channel':'Wa UI incomplete channel')}</span></header>${endpoints(pair,ctx)}<footer><span class="wa-channel-people-count">${text('Wa UI participants count',{count})}</span><div class="wa-channel-people" data-channel-participants>${names(ids,nameOf,'Wa UI no participants',markerOf)}</div><button type="button" class="wa-link-button" data-wa-pair="${pair.channelId}">${text('OC16 inspect')} ↗</button></footer></article>`;
  }
  return Object.freeze({
    renderChannelCards(department,{kind='all'}={}) {
      const catalog=OC16_DEPARTMENTS.find(row=>row.id===(typeof department==='string'?department:department?.id));
      if(!catalog)return '';
      const ctx=context();return catalog.pairs.filter(pair=>kind==='core'?pair.role==='core':kind==='other'?pair.role!=='core':true).map(pair=>channelCard(pair,ctx)).join('');
    },
    renderPairRows(department, options = {}) {
      const catalog = typeof department === 'string' ? OC16_DEPARTMENTS.find(row => row.id === department)
        : OC16_DEPARTMENTS.find(row => row.id === department?.id);
      return pairRows(catalog, context(), options);
    },
    renderDepartment(id) {
      const department = OC16_DEPARTMENTS.find(row => row.id === id);
      if (!department) return '';
      const ctx = context(), value = ctx.result?.departments?.find(row => row.id === id);
      const count = value => Number.isInteger(value) && value >= 0 ? value : '—';
      return `<section class="wa-detail-content" data-wa-detail="department" data-wa-detail-id="${department.id}"><h2>${text(department.nameKey)}</h2><dl class="wa-detail-metrics"><div><dt>${text('OC16 gate coverage')}</dt><dd data-wa-gate-count="${count(value?.gateCount)}">${count(value?.gateCount)} / ${department.pairs.length * 2}</dd></div><div><dt>${text('OC16 pair coverage')}</dt><dd data-wa-pair-count="${count(value?.pairCount)}">${count(value?.pairCount)} / ${department.pairs.length}</dd></div></dl>${value ? '' : `<p class="wa-detail-note">${unknown()}</p>`}${pairRows(department, ctx)}${fold('Wa UI department reading',renderWaReading(department.pairs[0].channelId),`data-wa-knowledge="wa-department" data-wa-content-id="${department.pairs[0].channelId}" data-wa-reading-for="${department.id}"`)}</section>`;
    },
    renderPair(channelId) {
      const pair = pairs.find(row => row.channelId === channelId);
      if (!pair) return '';
      const ctx = context(), record = ctx.pairs.get(channelId);
      // Flat endpoints match department rows: no bordered gate cards; activations always visible.
      const flat = `<div class="wa-detail-endpoints">${pair.displayGates.map(gate => gateActivationColumn(gate, record?.holdersByGate?.[gate], ctx)).join('')}</div>`;
      return `<section class="wa-detail-content" data-wa-detail="pair" data-wa-detail-id="${pair.channelId}"><h2><span class="wa-channel-number">${pair.displayGates.join('–')}</span><span class="wa-channel-reading-title">${esc(waChannelTitle(pair.channelId))}</span></h2><p class="wa-detail-note">${text(`OC16 ${pair.departmentId}`)} · ${text(pair.role === 'core' ? 'OC16 core' : 'OC16 support')}</p>${stateHtml(record)}${flat}${relationships(pair, record)}${pairReading(pair)}</section>`;
    },
    renderGate(input) {
      const gate = Number(input), pair = pairs.find(row => row.gates.includes(gate));
      if (!pair) return '';
      const ctx = context(), record = ctx.gates.get(gate);
      const state = Array.isArray(record?.memberIds) ? record.memberIds.length ? 'active' : 'inactive' : 'unknown';
      return `<section class="wa-detail-content" data-wa-detail="gate" data-wa-detail-id="${gate}"><header>${renderGateDetailHeading(gate)}</header><p class="wa-detail-state" data-wa-gate-state="${state}">${text(`OC16 ${state}`)}</p><section><h3>${text('OC16 activation sources')}</h3>${renderActivationRows(record?.activations, { nameOf, markerOf })}</section><section class="wa-detail-related"><h3>${text('Wa detail related')}</h3><button type="button" class="wa-detail-link" data-wa-pair="${pair.channelId}">${pair.displayGates.join('–')} · ${text(pair.role === 'core' ? 'OC16 core' : 'OC16 support')}</button><span> · </span><button type="button" class="wa-detail-link" data-wa-department="${pair.departmentId}">${text(`OC16 ${pair.departmentId}`)}</button></section>${pairReading(pair,gate)}</section>`;
    }
  });
}
