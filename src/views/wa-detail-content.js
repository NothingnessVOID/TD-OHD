import '../lib/wa/oc16-messages.js';
import '../lib/wa/detail-messages.js';
import '../lib/wa/ui-messages.js';
import { renderWaMemberMarker } from '../lib/wa/member-markers.js';
import { getLocale, t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { hexagramName, planetName } from '../lib/vocabulary.js';
import { renderProse } from '../lib/knowledge/detail-renderer.js';
import { GATE_DESCRIPTIONS } from '../lib/content.js';
import { readWaReadingExcerpt } from '../lib/wa/reading-presentation.js';
import { orgChannelBody, orgChannelCopy, orgChannelName, orgGateBody, orgGateCopy, orgGateName } from '../lib/wa/org-role-readings.js';
import { OC16_DEPARTMENTS, oc16Department, oc16Pair, oc16PairForGate } from '../lib/wa/oc16-catalog.js';
import { waStateText } from './wa-diagram.js';
const statuses = new Set(['absent', 'hanging', 'selfComplete', 'crossMemberOnly', 'both']);
const text = (key,params) => esc(t(key,params));
const roleLabel = role => role === 'core' ? 'OC16 core' : role === 'personnel' ? 'OC16 personnel' : 'OC16 support';
const unknown = () => text('OC16 unknown');
const displayName = (id, nameOf) => esc(nameOf(id) || id);
const person = (id, nameOf, markerOf=()=>null, businessOf=()=>false) => `<span class="wa-person-ref">${renderWaMemberMarker(markerOf(id),{name:nameOf(id)})}<span class="wa-detail-member" data-wa-member="${esc(id)}">${displayName(id, nameOf)}</span>${businessOf(id)?`<button type="button" class="wa-person-business" data-wa-member-business="${esc(id)}">${text('MB member button')}</button>`:''}</span>`;
const names = (ids, nameOf, emptyKey = 'OC16 inactive', markerOf=()=>null, businessOf=()=>false) => Array.isArray(ids)
  ? ids.map(id => person(id, nameOf, markerOf, businessOf)).join(' ') || text(emptyKey) : unknown();
export function waChannelTitle(channelId) {
  // One channel, one name: the organization page reads the unified channel vocabulary in every
  // column. Department positioning stays in department copy rather than becoming a channel title.
  return orgChannelName(channelId);
}
/** Status pill uses left-diagram language (已贯通 / 差一端 / …); no Penta barbell icon. */
const stateHtml = value => {
  const state = statuses.has(value?.status) ? value.status : 'unknown';
  return `<span class="wa-detail-state" data-wa-state="${state}"><span class="wa-detail-state-mark" aria-hidden="true"></span><span class="wa-detail-state-label">${esc(waStateText(state))}</span></span>`;
};
const gateLabel = gate => `<strong>${gate}</strong> · ${esc(orgGateName(gate))} · ${esc(hexagramName(gate))}`;
/** Organization-page gate heading: org role primary, classical hexagram secondary. */
function renderOrgGateDetailHeading(gate) {
  const id = Number(gate);
  const zh = getLocale().startsWith('zh');
  return `<div class="detail-label">${esc(t('Gate {gate}', { gate: id }))}</div>
    <div class="detail-name">${esc(orgGateName(id))} <span class="detail-hexagram">${zh ? '（' : '('}${esc(hexagramName(id))}${zh ? '）' : ')'}</span></div>`;
}

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

const paragraphs = value => (typeof value === 'string' ? value.split(/\n{2,}/).map(part => part.trim()).filter(Boolean) : []);
const prose = value => paragraphs(value).map(part => `<p>${esc(part)}</p>`).join('');

/** Organization channel body: integrated copy first, existing department-positioning copy second,
 * shared Wa channel excerpt last. Each layer is separate; nothing from different sources is shown
 * side by side and no layer is labelled as official / plain / source. */
export function renderOrgChannelReading(channelId) {
  const pair = oc16Pair(channelId);
  if (!pair) return '';
  const body = orgChannelBody(pair.channelId);
  if (body) {
    const rest = prose([body.application, body.organizationRole].filter(Boolean).join('\n\n'));
    return `<article class="wa-org-reading" data-wa-org-reading="channel" data-wa-org-body="integrated" data-wa-channel="${esc(pair.channelId)}" data-wa-department="${esc(pair.departmentId)}">${body.intro?`<p class="wa-org-intro">${esc(body.intro)}</p>`:''}${rest?`<div class="knowledge-body" data-wa-prose="org-detail">${rest}</div>`:''}</article>`;
  }
  const copy = orgChannelCopy(pair.channelId);
  if (copy) {
    const roleBlock = copy.role
      ? `<div class="knowledge-summary-callout" data-wa-org-role><div class="knowledge-summary-label">${text('Wa org role label')}</div><p class="knowledge-summary knowledge-summary-text">${esc(copy.role)}</p></div>`
      : '';
    const gates = copy.gateLines.map(line =>
      `<p class="wa-org-gate-line" data-wa-org-gate="${line.gate}"><strong>${line.gate}</strong><span class="wa-org-gate-role">${getLocale()==='en'?` (${esc(line.role)})`: `（${esc(line.role)}）`}</span>${getLocale()==='en'?': ': '：'}${esc(line.body)}</p>`
    ).join('');
    return `<article class="wa-org-reading" data-wa-org-reading="channel" data-wa-org-body="department" data-wa-channel="${esc(copy.channelId)}" data-wa-department="${esc(copy.departmentId || '')}"><p class="wa-org-intro">${esc(copy.intro)}</p>${roleBlock}<div class="knowledge-body wa-org-gate-lines" data-wa-prose="org-detail">${gates}</div></article>`;
  }
  const excerpt = readWaReadingExcerpt(pair.channelId, getLocale());
  if (!excerpt) return '';
  return `<article class="wa-org-reading" data-wa-org-reading="channel" data-wa-shared-knowledge="wa" data-wa-channel="${esc(pair.channelId)}">${excerpt.summary===null?'':`<div class="knowledge-summary-callout" data-wa-prose="summary">${renderProse({content:excerpt.summary})}</div>`}<div class="knowledge-body" data-wa-prose="detail">${renderProse({content:excerpt.detail})}</div></article>`;
}

/** Gate body: integrated organization copy first, existing organization copy second, then the shared
 * gate description (keynote + description). Only catalog gates qualify. No lens switcher, no six lines. */
export function renderOrgGateReading(gate) {
  const id = Number(gate);
  if (!oc16PairForGate(id)) return '';
  const body = orgGateBody(id);
  if (body) {
    const roleBlock = body.role
      ? `<div class="knowledge-summary-callout" data-wa-org-role><div class="knowledge-summary-label">${text('Wa org gate role')}</div><p class="knowledge-summary knowledge-summary-text">${esc(body.role)}</p></div>`
      : '';
    return `<article class="wa-org-reading" data-wa-org-reading="gate" data-wa-org-body="integrated" data-wa-gate="${id}">${roleBlock}<div class="knowledge-body" data-wa-prose="org-detail">${prose([body.intro, body.application].filter(Boolean).join('\n\n'))}</div></article>`;
  }
  const copy = orgGateCopy(id);
  if (copy) {
    return `<article class="wa-org-reading" data-wa-org-reading="gate" data-wa-org-body="organization" data-wa-gate="${copy.gate}"><div class="knowledge-summary-callout" data-wa-org-role><div class="knowledge-summary-label">${text('Wa org gate role')}</div><p class="knowledge-summary knowledge-summary-text">${esc(copy.role)}</p></div><div class="knowledge-body" data-wa-prose="org-detail"><p>${esc(copy.body)}</p></div></article>`;
  }
  const shared = GATE_DESCRIPTIONS[id];
  const keynote = typeof shared?.keynote === 'string' ? shared.keynote : '';
  const description = typeof shared?.description === 'string' ? shared.description : '';
  if (!keynote && !description) return '';
  return `<article class="wa-org-reading" data-wa-org-reading="gate" data-wa-shared-knowledge="gate" data-wa-gate="${id}"><div class="knowledge-body" data-wa-prose="org-detail">${keynote?`<p>${esc(keynote)}</p>`:''}${description?`<p>${esc(description)}</p>`:''}</div></article>`;
}
/** Birth-chart / knowledge jump-card pattern: navigate instead of nesting department reading. */
const jumpCard = (attrs, title, action) =>
  `<button type="button" class="knowledge-jump-card wa-jump-card" ${attrs}><span class="wa-jump-card-copy"><span class="wa-jump-card-title">${title}</span><span class="wa-jump-card-action">${action}</span></span><span aria-hidden="true">→</span></button>`;

function relatedJumps(items) {
  if (!items.length) return '';
  return `<section class="wa-detail-related"><h3>${text('Wa detail related')}</h3><nav class="wa-detail-jumps" data-wa-related-jumps>${items.join('')}</nav></section>`;
}

/** Every catalog channel shows its own reading under the people block — all 32, not only the six primaries. */
function channelOwnReading(pair) {
  const reading = renderOrgChannelReading(pair.channelId);
  if (!reading) return '';
  return `<section class="wa-detail-reading" data-wa-knowledge="wa-org" data-wa-content-id="${pair.channelId}" data-wa-reading-for="${pair.channelId}"><h3>${text('Wa org channel reading')}</h3>${reading}</section>`;
}

/** Department jumps always target the explicit primary channel, never a positional first row. */
function departmentJump(pair, readingFor) {
  const department = oc16Department(pair.departmentId);
  if (!department) return '';
  return jumpCard(
    `data-wa-department="${pair.departmentId}" data-wa-knowledge="wa-department" data-wa-content-id="${department.primaryChannelId}" data-wa-reading-for="${readingFor}"`,
    text('Wa UI department reading'),
    `${text(`OC16 ${pair.departmentId}`)} · ${text('Wa jump open department')}`
  );
}

function pairRelated(pair) {
  const gates = pair.displayGates.map(gate => jumpCard(
    `data-wa-gate="${gate}"`,
    gateLabel(gate),
    text('Wa jump open gate')
  ));
  // Core sheet is merged with the department sheet — no circular dept jump.
  if (pair.role === 'core') return relatedJumps(gates);
  const department = departmentJump(pair, pair.channelId);
  return relatedJumps([...department ? [department] : [], ...gates]);
}

function gateRelated(pair, gate) {
  if (pair.role === 'core') {
    // One jump: merged department ≡ primary channel sheet.
    const department = oc16Department(pair.departmentId);
    if (!department) return '';
    return relatedJumps([
      jumpCard(
        `data-wa-department="${pair.departmentId}" data-wa-knowledge="wa-org" data-wa-content-id="${department.primaryChannelId}" data-wa-reading-for="gate:${gate}"`,
        `<strong>${pair.displayGates.join('–')}</strong> · ${esc(waChannelTitle(pair.channelId))} · ${text(`OC16 ${pair.departmentId}`)}`,
        text('Wa jump open department')
      )
    ]);
  }
  const department = departmentJump(pair, `gate:${gate}`);
  return relatedJumps([
    jumpCard(
      `data-wa-pair="${pair.channelId}"`,
      `<strong>${pair.displayGates.join('–')}</strong> · ${esc(waChannelTitle(pair.channelId))} · ${text(roleLabel(pair.role))}`,
      text('Wa jump open channel')
    ),
    ...department ? [department] : []
  ]);
}

/** Pure HTML only. Each method takes one fresh snapshot from the host's current scope. */
export function createWaDetailRenderer({ getResult, nameOf = id => id, markerOf=()=>null, businessOf=()=>false }) {
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
    return `<div class="wa-detail-endpoint" data-wa-endpoint="${gate}" data-wa-covered="${Array.isArray(ids) ? ids.length > 0 : 'unknown'}">${side?`<div class="wa-endpoint-side">${text(`Wa UI ${side} gate`)}</div>`:''}<div class="wa-detail-gate-label">${label}</div><div class="wa-detail-members">${names(ids, nameOf,'OC16 inactive',markerOf,businessOf)}</div></div>`;
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
      `<article class="wa-detail-pair-row" data-pair-row="${pair.channelId}"><header class="wa-detail-row-heading"><button type="button" class="wa-detail-link" data-wa-pair="${pair.channelId}"><strong>${pair.displayGates.join('–')}</strong></button><span>${text(roleLabel(pair.role))}</span>${stateHtml(ctx.pairs.get(pair.channelId))}</header><div class="wa-detail-endpoints">${pair.displayGates.map(gate => `<div class="wa-detail-endpoint-cell">${gateActivationColumn(gate, ctx.pairs.get(pair.channelId)?.holdersByGate?.[gate], ctx)}</div>`).join('')}</div></article>`
    ).join('')}</div>`;
  }
  /** Self-complete members only — cross-member who-pairs-with-whom lists were removed as redundant. */
  function selfCompleteBlock(record) {
    return `<section class="wa-detail-self-complete"><h3>${text('OC16 covered by one')}</h3><div data-wa-self-complete>${names(record?.selfCompleteMemberIds, nameOf, 'Wa detail none', markerOf, businessOf)}</div></section>`;
  }
  function channelCard(pair,ctx) {
    const record=ctx.pairs.get(pair.channelId);
    const ids=Array.isArray(record?.contributorIds)?record.contributorIds:Array.isArray(record?.gateRecords)&&record.gateRecords.every(row=>Array.isArray(row.memberIds))?[...new Set(record.gateRecords.flatMap(row=>row.memberIds))]:null;
    const count=record?.contributorCount??(ids?ids.length:'—');
    return `<article class="wa-channel-card" data-pair-row="${pair.channelId}" data-participant-count="${count}"><header><button type="button" class="wa-channel-open" data-wa-pair="${pair.channelId}"><span class="wa-channel-kind">${text(roleLabel(pair.role))}</span><strong>${pair.displayGates.join('–')} <span>${esc(waChannelTitle(pair.channelId))}</span></strong></button><span class="wa-channel-status" data-wa-state="${record?.status||'unknown'}">${text(!record?'OC16 unknown':['selfComplete','crossMemberOnly','both'].includes(record.status)?'Wa UI complete channel':'Wa UI incomplete channel')}</span></header>${endpoints(pair,ctx)}<footer><span class="wa-channel-people-count">${text('Wa UI participants count',{count})}</span><div class="wa-channel-people" data-channel-participants>${names(ids,nameOf,'Wa UI no participants',markerOf)}</div><button type="button" class="wa-link-button" data-wa-pair="${pair.channelId}">${text('OC16 inspect')} ↗</button></footer></article>`;
  }
  function mergedDeptCore(department) {
    const core = oc16Pair(department.primaryChannelId);
    if (!core) return '';
    const ctx = context();
    const record = ctx.pairs.get(core.channelId);
    const value = ctx.result?.departments?.find(row => row.id === department.id);
    const count = v => Number.isInteger(v) && v >= 0 ? v : '—';
    const flat = `<div class="wa-detail-endpoints">${core.displayGates.map(gate => gateActivationColumn(gate, record?.holdersByGate?.[gate], ctx)).join('')}</div>`;
    // Support rows are the remaining 26 channels (primary excluded by id, never by position).
    const support = { ...department, pairs: department.pairs.filter(pair => pair.channelId !== core.channelId) };
    const supportHeading = support.pairs.every(pair => pair.role === 'personnel')
      ? 'OC16 personnel' : 'OC16 support';
    const supportRows = support.pairs.length
      ? `<section class="wa-detail-support-pairs" data-wa-support-pairs><h3>${text(supportHeading)}</h3>${pairRows(support, ctx)}</section>`
      : '';
    // Organization reading for the merged department ≡ primary channel sheet.
    const rolePhrase = text(`OC16 org role ${department.id}`);
    const readingBody = renderOrgChannelReading(core.channelId);
    const reading = readingBody
      ? `<section class="wa-detail-reading" data-wa-knowledge="wa-org" data-wa-content-id="${core.channelId}" data-wa-reading-for="${department.id}" data-wa-merged-dept="${department.id}"><h3>${text('Wa org channel reading')}</h3>${readingBody}</section>`
      : '';
    const related = pairRelated(core);
    return `<section class="wa-detail-content" data-wa-detail="department" data-wa-detail-id="${department.id}" data-wa-core-pair="${core.channelId}"><header class="wa-detail-heading"><h2>${text(department.nameKey)}</h2><p class="wa-detail-note"><span class="wa-channel-number">${core.displayGates.join('–')}</span><span class="wa-channel-reading-title">${esc(waChannelTitle(core.channelId))}</span></p><p class="wa-detail-role">${rolePhrase}</p></header>${stateHtml(record)}<dl class="wa-detail-metrics"><div><dt>${text('OC16 gate coverage')}</dt><dd data-wa-gate-count="${count(value?.gateCount)}">${count(value?.gateCount)} / ${department.pairs.length * 2}</dd></div><div><dt>${text('OC16 pair coverage')}</dt><dd data-wa-pair-count="${count(value?.pairCount)}">${count(value?.pairCount)} / ${department.pairs.length}</dd></div></dl>${value ? '' : `<p class="wa-detail-note">${unknown()}</p>`}${selfCompleteBlock(record)}${flat}<div class="wa-detail-divider" aria-hidden="true"></div>${reading}${supportRows}${related}</section>`;
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
    /** Department ≡ primary Wa channel (same wa.communication.* content). One sheet. */
    renderDepartment(id) {
      const department = oc16Department(id);
      if (!department) return '';
      return mergedDeptCore(department);
    },
    renderPair(channelId) {
      const pair = oc16Pair(channelId);
      if (!pair) return '';
      if (pair.role === 'core') {
        const department = oc16Department(pair.departmentId);
        return department ? mergedDeptCore(department) : '';
      }
      const ctx = context(), record = ctx.pairs.get(pair.channelId);
      const flat = `<div class="wa-detail-endpoints">${pair.displayGates.map(gate => gateActivationColumn(gate, record?.holdersByGate?.[gate], ctx)).join('')}</div>`;
      const note = `<p class="wa-detail-note"><button type="button" class="wa-detail-link" data-wa-department="${pair.departmentId}">${text(`OC16 ${pair.departmentId}`)}</button></p>`;
      const reading = channelOwnReading(pair);
      return `<section class="wa-detail-content" data-wa-detail="pair" data-wa-detail-id="${pair.channelId}"><header class="wa-detail-heading"><h2><span class="wa-channel-number">${pair.displayGates.join('–')}</span><span class="wa-channel-reading-title">${esc(waChannelTitle(pair.channelId))}</span></h2>${note}</header>${stateHtml(record)}${selfCompleteBlock(record)}${flat}<div class="wa-detail-divider" aria-hidden="true"></div>${reading}${pairRelated(pair)}</section>`;
    },
    renderGate(input) {
      const gate = Number(input), pair = oc16PairForGate(gate);
      if (!pair) return '';
      const ctx = context(), record = ctx.gates.get(gate);
      const state = Array.isArray(record?.memberIds) ? record.memberIds.length ? 'active' : 'inactive' : 'unknown';
      const gateReading = renderOrgGateReading(gate);
      const orgReading = gateReading
        ? `<section class="wa-detail-reading" data-wa-knowledge="wa-org" data-wa-content-id="${pair.channelId}" data-wa-reading-for="gate:${gate}"><h3>${text('Wa org gate reading')}</h3>${gateReading}</section>`
        : '';
      return `<section class="wa-detail-content" data-wa-detail="gate" data-wa-detail-id="${gate}"><header class="wa-detail-heading">${renderOrgGateDetailHeading(gate)}</header><p class="wa-detail-state" data-wa-gate-state="${state}">${text(`OC16 ${state}`)}</p>${orgReading}<div class="wa-detail-divider" aria-hidden="true"></div><section class="wa-detail-activations-block"><h3>${text('OC16 activation sources')}</h3>${renderActivationRows(record?.activations, { nameOf, markerOf })}</section>${gateRelated(pair, gate)}</section>`;
    }
  });
}
