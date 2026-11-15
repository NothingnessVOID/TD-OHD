// Wa detail frames for one member's own business analysis.
// Pure HTML only: the host owns the detail stack, dialog lifecycle and data scope.
// Nothing here reads storage, a PeopleStore or an organization composite.
import { CHANNELS, TYPES } from '../lib/human-design/catalog.js';
import { definitionIds, definitionNames } from '../lib/human-design/identities.js';
import { channelCircuit } from '../lib/circuit-topology.js';
import { circuitGroupName, circuitName, definitionName, typeName } from '../lib/vocabulary.js';
import { renderWaMemberMarker } from '../lib/wa/member-markers.js';
import { orgChannelName } from '../lib/wa/org-role-readings.js';
import { readOrgChannelBody } from '../lib/wa/org-reading-content.js';
import { renderSharedChannelReading } from '../lib/shared-object-details.js';
import { getLocale, t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { careerCopy, definitionCopy, environmentCopyName, stepCopy, circuitCopy,
  integrationChannelCopy } from '../lib/member-business/content.js';
import { MB_ENVIRONMENT_IDS } from '../lib/member-business/environments.js';
import '../lib/member-business/messages.js';
import '../lib/wa/oc16-messages.js';

const text = (key, params) => esc(t(key, params));
const paragraphs = value => (typeof value === 'string' ? value.split(/\n{2,}/).map(part => part.trim()).filter(Boolean) : []);
const prose = value => paragraphs(value).map(part => `<p class="wa-mb-body">${esc(part)}</p>`).join('');
const dash = channelId => esc(channelId.split('-').join('–'));
const CIRCUIT_ORDER = Object.freeze(['integration', 'individual', 'collective', 'tribal']);
const RAW_DEFINITION_BY_ID = Object.fromEntries(Object.entries(definitionIds).map(([raw, id]) => [id, raw]));
const TYPE_DISPLAY_NAME = Object.fromEntries(Object.entries(TYPES).map(([id, data]) => [id, data.name]));
/** Content step keys differ from the rule kind only for the OC16 step. */
const STEP_CONTENT_KEY = Object.freeze({ oc16: 'organization' });

/** Integration channels are their own circuit group; every other channel keeps its catalog group. */
function circuitGroupOf(channelId) {
  const gates = channelId.split('-').map(Number);
  if (gates.length !== 2 || gates.some(gate => !Number.isInteger(gate))) return null;
  try {
    const { group, circuit } = channelCircuit({ gates });
    return circuit === 'integration' ? 'integration' : group;
  } catch {
    return null;
  }
}

const definitionLabel = definitionId => definitionName(definitionNames[RAW_DEFINITION_BY_ID[definitionId]] ?? definitionId);
const typeLabel = typeId => typeName(TYPE_DISPLAY_NAME[typeId] ?? typeId);
const isIntegrationChannel = channelId => circuitGroupOf(channelId) === 'integration';

/** Channel display name: the four integration channels carry their textbook short name from the new
 *  content file; the 32 organization channels keep the one shared organization channel name. */
function channelDisplayName(channelId, locale) {
  if (isIntegrationChannel(channelId)) return integrationChannelCopy(channelId, locale)?.name
    ?? channelId.split('-').join('–');
  return orgChannelName(channelId);
}

/** Reading body: 32 channels reuse the organization integrated copy (intro + application);
 *  the four integration channels use the new member-business copy. */
function channelBody(channelId, locale) {
  if (isIntegrationChannel(channelId)) {
    const copy = integrationChannelCopy(channelId, locale);
    return [copy?.intro, copy?.application].filter(Boolean).join('\n\n');
  }
  const body = readOrgChannelBody(channelId, locale);
  return [body?.intro, body?.application].filter(Boolean).join('\n\n');
}

const placementLabel = placement => placement?.kind === 'alpha'
  ? text('MB placement alpha')
  : esc(placement?.title || '');

function headerButtons(index, count) {
  const disabled = (blocked) => blocked ? ' disabled' : '';
  return `<div class="wa-mb-nav" data-wa-mb-nav>
    <button type="button" class="btn-secondary wa-mb-nav-button" data-wa-member-step="prev" data-focus="mb-prev"${disabled(index <= 0)}>‹ ${text('MB prev')}</button>
    <span class="wa-mb-position" aria-hidden="true">${index + 1} / ${count}</span>
    <button type="button" class="btn-secondary wa-mb-nav-button" data-wa-member-step="next" data-focus="mb-next"${disabled(index >= count - 1)}>${text('MB next')} ›</button>
  </div>`;
}

/** Member list frame. Every assigned member is listed; the organization scope never filters it. */
export function renderMemberBusinessList({ members = [], analysisOf, markerOf, nameOf, placementOf }) {
  const locale = getLocale();
  const rows = members.map(member => {
    const analysis = analysisOf(member.memberId);
    const career = analysis?.status === 'ready' && analysis.careerId ? careerCopy(analysis.careerId, locale) : null;
    const name = nameOf(member.memberId) || member.displayName || member.memberId;
    return `<li><button type="button" class="wa-mb-row" data-wa-member-open="${esc(member.memberId)}" data-focus="mb-member-${esc(member.memberId)}">
      ${renderWaMemberMarker(markerOf(member.memberId), { name })}
      <span class="wa-mb-row-name">${esc(name)}</span>
      <span class="wa-mb-row-place">${placementLabel(placementOf(member.memberId))}</span>
      <span class="wa-mb-row-career">${career?.name ? esc(career.name) : text('MB insufficient')}</span>
    </button></li>`;
  }).join('');
  return `<section class="wa-mb" data-wa-mb="members">
    <header class="wa-mb-head"><h2>${text('MB members title')}</h2></header>
    <p class="wa-mb-note">${text('MB members note')}</p>
    ${rows ? `<ul class="wa-mb-list">${rows}</ul>` : `<p class="wa-mb-note">${text('MB list empty')}</p>`}
  </section>`;
}

function careerBlock(analysis, locale) {
  const career = analysis?.careerId ? careerCopy(analysis.careerId, locale) : null;
  const head = `<h3>${text('MB career')}</h3>`;
  if (!career) return `<section class="wa-mb-block" data-wa-mb-block="career">${head}<p class="wa-mb-missing">${text('MB insufficient field', { field: t('MB career') })}</p></section>`;
  return `<section class="wa-mb-block" data-wa-mb-block="career" data-wa-mb-career="${esc(analysis.careerId)}">${head}
    <p class="wa-mb-value">${esc(career.name)}</p>
    <p class="wa-mb-meta">${text('MB type line', { type: esc(typeLabel(analysis.typeId)) })}</p>
    ${prose(career.body)}
  </section>`;
}

function definitionBlock(analysis, locale) {
  const copy = analysis?.definitionId ? definitionCopy(analysis.definitionId, locale) : null;
  const head = `<h3>${text('MB definition')}</h3>`;
  if (!copy) return `<section class="wa-mb-block" data-wa-mb-block="definition">${head}<p class="wa-mb-missing">${text('MB insufficient field', { field: t('MB definition') })}</p></section>`;
  return `<section class="wa-mb-block" data-wa-mb-block="definition" data-wa-mb-definition="${esc(analysis.definitionId)}">${head}
    <p class="wa-mb-value">${esc(copy.name)}</p>
    <p class="wa-mb-meta">${text('MB definition line', { definition: esc(definitionLabel(analysis.definitionId)) })}</p>
    ${prose(copy.body)}
  </section>`;
}

const envName = (environmentId, locale) => environmentCopyName(environmentId, locale) ?? environmentId;

function stepFactLine(kind, facts, locale) {
  switch (kind) {
    case 'definition':
      // Display vocabulary only: internal definition ids never reach the sheet.
      return facts?.definitionId ? esc(definitionLabel(facts.definitionId)) : '—';
    case 'aura':
      return facts?.typeId ? esc(typeLabel(facts.typeId)) : '—';
    case 'integration':
      return facts?.channelIds?.length ? facts.channelIds.map(dash).join(' · ') : '—';
    case 'penta':
      return `${esc(t('MB penta gates', { active: facts?.activeGateCount ?? 0, total: facts?.gateTotal ?? 0 }))}${
        facts?.channelIds?.length ? ` · ${facts.channelIds.map(dash).join(' · ')}` : ''}`;
    case 'oc16': {
      const tiers = ['upper', 'middle', 'lower']
        .map(tier => ({
          tier,
          channelIds: facts?.tiers?.[tier]?.channelIds ?? []
        }))
        .filter(row => row.channelIds.length)
        .map(row => `${text(`OC16 axis ${row.tier}`)}：${row.channelIds.map(dash).join(' · ')}`);
      const tribal = facts?.tribalChannelIds?.length ? facts.tribalChannelIds.map(dash).join(' · ') : '';
      const parts = [...tiers, tribal].filter(Boolean);
      return parts.length ? parts.join(' ｜ ') : '—';
    }
    default:
      return '—';
  }
}

function stepModeLine(step, locale) {
  const supported = step.points.filter(item => item.level === 'supported');
  const caution = step.points.filter(item => item.level === 'caution');
  const names = [...new Set([...supported, ...caution].map(item => envName(item.environmentId, locale)))];
  if (!names.length) return text('MB step no basis');
  const notes = [];
  if (supported.some(item => item.scope === 'execution')) notes.push(text('MB solo execution'));
  if (caution.some(item => item.reason === 'tribalBoundary')) notes.push(text('MB tribal scope'));
  return `${names.map(name => esc(name)).join(' · ')}${notes.length ? `<span class="wa-mb-step-note">${notes.join(' · ')}</span>` : ''}`;
}

function screeningHtml(analysis, screening, locale) {
  if (screening?.status !== 'ready') {
    return `<section class="wa-mb-block" data-wa-mb-block="environments"><h3>${text('MB environments')}</h3><p class="wa-mb-missing">${text('MB insufficient field', { field: t('MB environments') })}</p></section>`;
  }
  const stepIndex = new Map(screening.steps.map(step => [step.step, step]));
  const pentaStep = stepIndex.get(4), integrationStep = stepIndex.get(3), oc16Step = stepIndex.get(5);
  const rows = [];
  for (const environmentId of MB_ENVIRONMENT_IDS) {
    const record = screening.environments.find(item => item.environmentId === environmentId);
    const supportedBy = record?.supportedBy ?? [];
    const cautionBy = record?.cautionBy ?? [];
    // Penta keeps its gate count visible as a fact even without a complete channel.
    if (!supportedBy.length && !cautionBy.length && environmentId !== 'penta') continue;
    const status = supportedBy.length ? 'supported' : cautionBy.length ? 'caution' : 'none';
    const tags = [];
    if (supportedBy.length) tags.push(environmentId === 'penta'
      ? `${text('MB penta basis')} · ${text('MB basis steps', { steps: supportedBy.join('、') })}`
      : `${text('MB supported tag')} · ${text('MB basis steps', { steps: supportedBy.join('、') })}`);
    if (cautionBy.length) tags.push(`${text('MB caution tag')} · ${text('MB basis steps', { steps: cautionBy.join('、') })}`);
    const details = [];
    if (environmentId === 'solo' && integrationStep?.points.some(item => item.environmentId === 'solo' && item.scope === 'execution')) {
      details.push(text('MB solo execution'));
    }
    if (environmentId === 'penta') {
      details.push(text('MB penta gates', { active: pentaStep?.facts?.activeGateCount ?? 0, total: pentaStep?.facts?.gateTotal ?? 0 }));
      if (pentaStep?.facts?.channelIds?.length) details.push(pentaStep.facts.channelIds.map(dash).join(' · '));
      if (!supportedBy.length) tags.push(text('MB penta no complete'));
    }
    if (environmentId === 'organization') {
      if (oc16Step?.facts?.axisChannelIds?.length) details.push(oc16Step.facts.axisChannelIds.map(dash).join(' · '));
      if (cautionBy.includes(5)) details.push(text('MB tribal scope'));
    }
    rows.push(`<li class="wa-mb-env" data-wa-mb-env="${esc(environmentId)}" data-status="${status}">
      <span class="wa-mb-env-name">${esc(envName(environmentId, locale))}</span>
      <span class="wa-mb-env-tags">${tags.map(tag => `<span class="wa-mb-tag">${tag}</span>`).join('')}</span>
      ${details.length ? `<span class="wa-mb-env-detail">${details.join(' ｜ ')}</span>` : ''}
    </li>`);
  }
  const hidden = MB_ENVIRONMENT_IDS.filter(id => !rows.some(row => row.includes(`data-wa-mb-env="${id}"`)));
  const steps = screening.steps.map(step => {
    const copy = stepCopy(STEP_CONTENT_KEY[step.kind] ?? step.kind, locale);
    return `<li class="wa-mb-step-row" data-wa-mb-step="${step.step}" data-kind="${esc(step.kind)}">
      <h4><span class="wa-mb-step-number">${step.step}</span>${esc(copy?.name ?? step.kind)}</h4>
      <p class="wa-mb-step-line"><span class="wa-mb-step-label">${text('MB step facts')}</span><span>${stepFactLine(step.kind, step.facts, locale)}</span></p>
      <p class="wa-mb-step-line"><span class="wa-mb-step-label">${text('MB step mode')}</span><span>${stepModeLine(step, locale)}</span></p>
      ${copy?.body ? `<p class="wa-mb-step-line"><span class="wa-mb-step-label">${text('MB step understanding')}</span><span>${esc(copy.body)}</span></p>` : ''}
      ${copy?.note && step.facts?.tribalChannelIds?.length ? `<p class="wa-mb-caution">${esc(copy.note)}</p>` : ''}
    </li>`;
  }).join('');
  return `<section class="wa-mb-block" data-wa-mb-block="environments"><h3>${text('MB environments')}</h3>
    <p class="wa-mb-note">${text('MB env note')}</p>
    <ul class="wa-mb-env-list">${rows.join('')}</ul>
    ${hidden.length ? `<p class="wa-mb-env-other">${text('MB other environments')}</p>` : ''}
    <details class="wa-mb-screening" data-wa-mb-screening>
      <summary>${text('MB screening')}</summary>
      <ol class="wa-mb-step-list">${steps}</ol>
    </details>
  </section>`;
}

function strengthsHtml(analysis, locale) {
  const head = `<h3>${text('MB strengths')}</h3>`;
  const channelIds = Array.isArray(analysis?.channelIds) ? analysis.channelIds : [];
  if (!channelIds.length) {
    return `<section class="wa-mb-block" data-wa-mb-block="strengths">${head}<p class="wa-mb-note" data-wa-mb-no-channels>${text('MB no channels')}</p></section>`;
  }
  const grouped = new Map(CIRCUIT_ORDER.map(group => [group, []]));
  for (const channelId of channelIds) {
    const group = circuitGroupOf(channelId);
    if (group && grouped.has(group)) grouped.get(group).push(channelId);
  }
  const groups = [...grouped].filter(([, ids]) => ids.length).map(([group, ids]) => {
    const body = circuitCopy(group, locale);
    const items = ids.map(channelId => {
      const name = channelDisplayName(channelId, locale);
      const link = isIntegrationChannel(channelId)
        ? `<button type="button" class="wa-detail-link wa-mb-channel-open" data-wa-business-channel="${esc(channelId)}">${dash(channelId)} · ${esc(name)}</button>`
        : `<button type="button" class="wa-detail-link wa-mb-channel-open" data-wa-pair="${esc(channelId)}">${dash(channelId)} · ${esc(name)}</button>`;
      const action = isIntegrationChannel(channelId) ? '' : `<span class="wa-mb-channel-action">${text('MB view org channel')}</span>`;
      return `<li class="wa-mb-channel" data-wa-mb-channel="${esc(channelId)}">${link}${action}${prose(channelBody(channelId, locale))}</li>`;
    }).join('');
    return `<section class="wa-mb-circuit" data-wa-mb-circuit="${esc(group)}">
      <h4>${esc(circuitGroupName(group))}</h4>
      ${body?.body ? `<p class="wa-mb-circuit-body">${esc(body.body)}</p>` : ''}
      <ul class="wa-mb-channel-list">${items}</ul>
    </section>`;
  }).join('');
  return `<section class="wa-mb-block" data-wa-mb-block="strengths">${head}
    <p class="wa-mb-note">${text('MB strengths note')}</p>${groups}</section>`;
}

/** One member's frame: career type, information processing, work environments, business strengths. */
export function renderMemberBusinessFrame({ member, analysis, screening, markerOf, nameOf, placementOf, index = 0, count = 1 }) {
  const locale = getLocale();
  const ready = analysis?.status === 'ready';
  const name = nameOf(member.memberId) || member.displayName || member.memberId;
  const estimated = analysis?.timeUnknown === true || analysis?.birthTimeConfidence === 'estimated'
    || member.timeUnknown === true || member.birthTimeConfidence === 'estimated';
  return `<section class="wa-mb" data-wa-mb="member" data-wa-mb-member="${esc(member.memberId)}">
    <header class="wa-mb-head">
      <div class="wa-mb-identity">${renderWaMemberMarker(markerOf(member.memberId), { name })}<h2>${esc(name)}</h2><span class="wa-mb-place">${placementLabel(placementOf(member.memberId))}</span></div>
      ${headerButtons(index, count)}
    </header>
    <p class="wa-mb-note">${text('MB scope note')}</p>
    ${estimated ? `<p class="wa-mb-estimate" data-wa-mb-estimated>${text('MB estimated note')}</p>` : ''}
    ${ready ? '' : `<p class="wa-mb-missing" data-wa-mb-insufficient>${text('MB insufficient')}</p>`}
    ${ready ? `${careerBlock(analysis, locale)}${definitionBlock(analysis, locale)}${screeningHtml(analysis, screening, locale)}${strengthsHtml(analysis, locale)}` : ''}
  </section>`;
}

/** One channel of the four integration channels: new member-business copy, then the same shared
 *  channel reading every other page uses. Never presented as an organization result. */
export function renderMemberBusinessChannel({ channelId }) {
  const locale = getLocale();
  const copy = integrationChannelCopy(channelId, locale);
  const catalog = CHANNELS.find(channel => [...channel.gates].sort((a, b) => a - b).join('-') === channelId);
  const shared = renderSharedChannelReading(channelId);
  return `<section class="wa-mb" data-wa-mb="channel" data-wa-mb-channel-sheet="${esc(channelId)}">
    <header class="wa-mb-head"><h2><span class="wa-channel-number">${dash(channelId)}</span><span class="wa-channel-reading-title">${esc(copy?.name ?? channelId)}</span></h2></header>
    <p class="wa-mb-meta">${text('MB channel sheet')}${catalog && circuitGroupOf(channelId) ? ` · ${esc(circuitName(channelCircuit({ gates: [...catalog.gates] }).circuit))}` : ''}</p>
    ${prose([copy?.intro, copy?.application].filter(Boolean).join('\n\n'))}
    <div class="wa-detail-divider" aria-hidden="true"></div>
    <section class="wa-mb-shared" data-wa-mb-shared>${shared}</section>
  </section>`;
}
