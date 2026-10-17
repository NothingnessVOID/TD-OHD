import '../styles/wa.css';
import '../lib/wa/messages.js';
import '../lib/wa/oc16-messages.js';
import '../lib/wa/ui-messages.js';
import '../styles/wa-members.css';
import { createWaMemberMarkers, renderWaMemberMarker } from '../lib/wa/member-markers.js';
import { listPeople, getPerson, onPeopleChange } from '../lib/people.js';
import { listTeams } from '../lib/team-repository.js';
import { computeChart } from '../lib/chartdata.js';
import { effectiveTeamBirth } from './team-birth.js';
import { getLocale, t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { openOperationDialog, confirmOperation, renderDialogHeader } from '../lib/operation-dialog.js';
import { openDetailDialog, closeDetailDialog, prepareDetailDialog, fitDetailSheetHeight } from '../lib/detail-dialog.js';
import { bindSharedObjectDetails } from '../lib/shared-object-details.js';
import { createWaDetailRenderer, renderWaReading, waChannelTitle } from './wa-detail-content.js';
import { renderDetailNavigation } from '../lib/object-detail-heading.js';
import '../styles/wa-details.css';
import { gateName, hexagramName } from '../lib/vocabulary.js';
import { listWaContent } from '../lib/wa/content.js';
import { createWaDraft, assertWaSnapshot, validateWaLayout, WA_ROLES } from '../lib/wa/model.js';
import { createWaRepository } from '../lib/wa/repository.js';
import { OC16_DEPARTMENTS, WA_MANAGEMENT_MECHANISM, OC16_GATE_TOTAL, OC16_PAIR_TOTAL } from '../lib/wa/oc16-catalog.js';
import { prepareWaPreview, analyzeOC16 } from '../lib/wa/oc16-analysis.js';
import { resolveWaViewScope, hasScopedWaEstimate } from '../lib/wa/view-scope.js';
import { openWaMemberPicker, prepareWaSelectionChange } from './wa-composer.js';
import { renderWaDiagram } from './wa-diagram.js';

const clone = value => structuredClone(value);
const text = (key, params) => esc(t(key, params));
const pairs = OC16_DEPARTMENTS.flatMap(department => department.pairs);
const LAST_ORGANIZATION = 'ohd-wa-last-organization-v1';
export const SHOW_NAMES_PREF = 'ohd-wa-ui-show-member-names-v1';

/** Instance-owned refs configuration + runtime-only OC16 presentation. */
export function mountWa(container, options = {}) {
  if (!container) throw new TypeError('Wa requires a container.');
  const people = options.peopleStore || { list:listPeople, get:getPerson, subscribe:onPeopleChange };
  const calculate = options.computeChart || computeChart;
  const repository = options.repository || createWaRepository();
  const teams = options.listTeams || listTeams;
  const storage = options.storage === undefined ? (() => { try { return globalThis.localStorage; } catch { return null; } })() : options.storage;
  let draft = createWaDraft(), dirty = false, saving = false, disposed = false, busy = false;
  let version = 0, generation = 0, operation = 0, saveGeneration = 0, timer = null, autoSaveTimer = null;
  let prepared = [], result = analyzeOC16(draft, []), selectedGroup = null, includeAlpha = false;
  let notice = '', errorText = '', composer = null, layerClose = null, composing = false, deferredRender = false, configExpanded = true;
  let selected = null, detailOpen = false, detailStack = [], detailOrigin = null;
  let graphResizeObserver=null,stickyFrame=0;
  let focusMember = null;
  let showNames = (() => { try { return storage?.getItem(SHOW_NAMES_PREF) === '1'; } catch { return false; } })();
  const collapsed = new Set(), annotationRecovery = [];
  const detail = document.createElement('div');
  detail.className = 'gate-detail hidden wa-detail';
  document.body.append(detail);
  const members = () => new Map(draft.members.map(member => [member.memberId, member]));
  let markerRefs=null,markerMap=null;
  const markers=()=>{if(markerRefs!==draft.members){markerRefs=draft.members;markerMap=createWaMemberMarkers(draft.members);}return markerMap;};
  const nameOf = id => { const member = members().get(id); return member ? people.get(member.personId)?.name || member.labelSnapshot : ''; };
  const groupName = group => group.title || `Penta ${String.fromCharCode(65 + WA_ROLES.indexOf(group.role))}`;
  const known = () => !busy && ['ready','empty'].includes(result?.status);
  const measuredGate = gate => known() ? result.gateRecords.find(record => record.gate === gate) : null;
  const covered = gate => Boolean(measuredGate(gate)?.memberIds.length);
  const viewScope = () => resolveWaViewScope(draft,{pentaId:selectedGroup,includeAlpha});
  const scopeName = () => selectedGroup ? `${groupName(draft.pentas.find(group => group.pentaId === selectedGroup))}${viewScope().includeAlpha ? ' + Alpha' : ''}` : t('OC16 all');
  const scopeLabel = () => t('OC16 scope count',{scope:scopeName(),count:viewScope().memberCount});
  const retainedPool = () => validateWaLayout(draft).poolMemberIds.length;
  const remember = id => { try { storage?.setItem(LAST_ORGANIZATION,id); } catch { notice='OC16 remember failed'; errorText=''; } };
  const closeReading = () => { if (detailOpen) closeDetailDialog(); };
  const fail = error => { notice=/conflict|revision/i.test(error?.code || '')?'Wa save conflict':'Wa data error'; errorText=error?.message || ''; };
  const details=createWaDetailRenderer({getResult:()=>known()?result:null,nameOf,markerOf:id=>markers().get(id)});

  const markerHtml = id => renderWaMemberMarker(markers().get(id),{name:nameOf(id)});
  const groupSizeState = count => count === 0 ? 'empty' : count >= 3 && count <= 5 ? 'ok' : 'warn';
  const groupLetter = group => String.fromCharCode(65 + WA_ROLES.indexOf(group.role));
  function memberChip(id,alpha=false) {
    return `<li class="wa-member-chip" data-wa-member-chip="${esc(id)}">${markerHtml(id)}<span class="wa-member-chip-name">${esc(nameOf(id))}</span><button class="wa-member-remove" ${alpha?'data-clear-alpha':`data-remove-wa="${esc(id)}"`} data-focus="remove-${esc(id)}" aria-label="${alpha?text('Wa UI clear alpha'):text('Wa UI remove member',{name:nameOf(id)})}" ${saving?'disabled':''}>×</button></li>`;
  }
  function headerHtml() {
    return `<header class="wa-header"><div class="wa-header-text"><h1>${text('Organization · Wa')}</h1><p>${text('OC16 organization subtitle')}</p></div><div class="wa-actions"><span class="wa-draft-status" data-dirty="${dirty}">${text(dirty?'Unsaved changes':'Wa draft')} · r${draft.revision}</span><button class="btn-secondary" data-action="new" data-focus="new" ${saving?'disabled':''}>${text('New organization')}</button><button class="btn-secondary" data-action="open" data-focus="open" ${saving?'disabled':''}>${text('OC16 open')}</button><button class="btn-primary" data-action="save" data-focus="save" ${saving?'disabled':''}>${text('Save')}</button></div></header>`;
  }
  function configSummary() {
    const alpha = draft.alphaId ? `<span class="wa-summary-item">${markerHtml(draft.alphaId)}${esc(nameOf(draft.alphaId))}</span>` : `<span class="wa-summary-item is-empty">${text('OC16 no alpha')}</span>`;
    return `<span class="wa-summary-label">${text('Wa config people',{count:validateWaLayout(draft).memberIds.length})}</span><span class="wa-summary-items"><span class="wa-summary-key">Alpha</span>${alpha}${draft.pentas.map(group=>`<span class="wa-summary-key">${esc(groupName(group))}</span><span class="wa-summary-item">${text('OC16 people',{count:group.memberIds.length})}</span>`).join('')}</span><span class="wa-summary-toggle">${text(configExpanded?'Wa config collapse':'Wa config expand')}<span class="wa-chevron" aria-hidden="true"></span></span>`;
  }
  function configurationHtml() {
    const alphaCard = `<section class="wa-config-card is-alpha" data-wa-target="alpha"><header><h2>${text('OC16 alpha')}</h2></header><ul class="wa-member-chips">${draft.alphaId?memberChip(draft.alphaId,true):''}<li><button class="wa-add-chip" data-compose="alpha" data-focus="alpha" ${saving?'disabled':''}>${text(draft.alphaId?'Wa UI replace alpha':'Wa UI choose alpha')}</button></li></ul></section>`;
    const groupCard = group => {
      const count = group.memberIds.length, state = groupSizeState(count);
      return `<section class="wa-config-card" data-wa-target="${esc(group.pentaId)}"><header><span class="wa-group-letter" aria-hidden="true">${groupLetter(group)}</span><input class="wa-group-title" aria-label="${text('Wa UI group name',{group:`Penta ${groupLetter(group)}`})}" data-group-title="${esc(group.pentaId)}" data-focus="group-${esc(group.pentaId)}" maxlength="300" value="${esc(group.title)}" placeholder="Penta ${groupLetter(group)}"><span class="wa-count-badge" data-state="${state}" ${state==='warn'?`title="${text('OC16 group size')}"`:''}>${count} / 3–5</span></header><ul class="wa-member-chips">${group.memberIds.map(id=>memberChip(id)).join('')}${count<5?`<li><button class="wa-add-chip" data-compose="${esc(group.pentaId)}" data-focus="people-${esc(group.pentaId)}" ${saving?'disabled':''}>${text('Wa UI add member')}</button></li>`:''}</ul><button class="wa-link-button wa-import-link" data-import="${esc(group.pentaId)}" data-focus="import-${esc(group.pentaId)}" ${saving?'disabled':''}>${text('OC16 import Penta')}</button></section>`;
    };
    return `<section class="panel wa-configuration" aria-label="${text('OC16 configuration')}"><div class="wa-config-top"><label class="wa-title-field"><span>${text('Organization title')}</span><input data-title data-focus="title" maxlength="300" value="${esc(draft.title)}" placeholder="${text('Wa organization')}"></label></div><details class="wa-config-details" ${configExpanded?'open':''}><summary data-focus="config-toggle">${configSummary()}</summary><div class="wa-config-grid">${alphaCard}${draft.pentas.map(groupCard).join('')}</div></details></section>`;
  }
  function scopeBarHtml() {
    if (!validateWaLayout(draft).memberIds.length) return `<p class="wa-scope-label" data-scope-label role="status" hidden>${esc(scopeLabel())}</p>`;
    const option = (id, label) => `<button type="button" class="wa-segment" data-scope-option="${esc(id)}" data-focus="scope-${esc(id)}" aria-pressed="${(selectedGroup || '') === id}">${esc(label)}</button>`;
    return `<section class="wa-scope-bar" aria-label="${text('OC16 scope')}"><span class="wa-scope-title">${text('OC16 scope')}</span><div class="wa-segmented" role="group" aria-label="${text('OC16 scope')}">${option('',t('OC16 all'))}${draft.pentas.map(group=>option(group.pentaId,groupName(group))).join('')}</div>${selectedGroup?`<label class="wa-alpha-toggle"><input type="checkbox" data-include-alpha data-focus="include-alpha" ${includeAlpha&&draft.alphaId?'checked':''} ${draft.alphaId?'':'disabled'}>${text('OC16 with alpha')}</label>`:''}<p class="wa-scope-label" data-scope-label role="status">${esc(scopeLabel())}</p></section>`;
  }
  function stat(label, value, total, percent, attribute = '') {
    const ready = known();
    return `<div><dt>${text(label)}</dt><dd ${attribute}>${ready?value:'—'}${total?` <small>/ ${total}</small>`:''}</dd>${total?`<span class="wa-meter" aria-hidden="true"><i style="width:${ready?percent:0}%"></i></span>`:''}</div>`;
  }
  function mechanismHtml() {
    // Same card chrome as before; glyph is department pairToken (circles + half-lit bridge), not split-capsule / channel-row.
    return `<h3 class="wa-subheading">${text('OC16 management mechanism')}</h3><div class="wa-pillars wa-mechanism">${WA_MANAGEMENT_MECHANISM.map(item => {
      const pair = pairs.find(row => row.channelId === item.channelId) || {
        channelId: item.channelId, displayGates: item.displayGates, departmentId: 'management',
        role: item.id === 'personnel' ? 'personnel' : 'core',
        gates: Object.freeze([...item.displayGates].sort((a, b) => a - b))
      };
      const measured = known() ? result.pairs.find(row => row.channelId === item.channelId) : null;
      const complete = Boolean(measured && measured.missingGates.length === 0);
      const state = !known() ? 'unknown' : complete ? 'complete' : measured?.status === 'hanging' ? 'partial' : 'none';
      const [leftGate, rightGate] = pair.displayGates;
      const lit = !known() ? 'unknown' : covered(leftGate) && covered(rightGate) ? 'both' : covered(leftGate) ? 'left' : covered(rightGate) ? 'right' : 'none';
      const stateLabel = state === 'complete' ? 'Wa legend active' : state === 'partial' ? 'Wa row partial' : state === 'none' ? 'Wa legend inactive' : 'OC16 unknown';
      return `<button type="button" class="wa-pillar" data-wa-pair="${pair.channelId}" data-focus="mechanism-${pair.channelId}" data-covered="${known()?complete:'unknown'}" data-row-state="${state}" data-lit="${lit}">${pairToken(pair, { tag: 'span' })}<span class="wa-pillar-text"><strong>${text(item.nameKey)}</strong><small>${esc(item.displayGates.map(gate => hexagramName(gate)).join(' · '))}</small><small class="wa-pillar-state">${text(stateLabel)}</small></span></button>`;
    }).join('')}</div>`;
  }
  function gapsHtml() {
    if (!known() || !result.memberIds.length) return '';
    const rows = OC16_DEPARTMENTS.map(department => ({ department, gates:department.pairs.flatMap(pair => pair.displayGates).filter(gate => !covered(gate)) })).filter(row => row.gates.length);
    const missing = rows.reduce((sum, row) => sum + row.gates.length, 0);
    // Hide the whole block when every gate is active — no empty "尚未激活的闸门" section.
    if (!missing) return '';
    return `<h3 class="wa-subheading">${text('OC16 gaps')}<small>${text('OC16 gaps count',{count:missing})}</small></h3><div class="wa-gap-rows">${rows.map(({department,gates})=>`<div class="wa-gap-row"><span class="wa-gap-department">${text(`OC16 ${department.id}`)}</span><span class="wa-gap-list">${gates.map(gate=>`<button type="button" class="wa-gap-chip" data-wa-gate="${gate}" data-focus="gap-${gate}"><b>${gate}</b><span>${esc(gateName(gate))}</span></button>`).join('')}</span></div>`).join('')}</div>`;
  }
  function overviewHtml() {
    const layout = validateWaLayout(draft), ready = known();
    return `<section class="panel wa-overview"><div class="wa-panel-heading"><h2>${text('Wa overview title')}</h2>${selectedGroup?'':`<span class="wa-state-badge" data-standard="${layout.standardTemplateSatisfied}">${text(layout.standardTemplateSatisfied?'OC16 standard':'OC16 preview')}</span>`}</div><dl class="wa-overview-stats">${stat('OC16 participants',ready?result.memberIds.length:0)}${stat('OC16 gate coverage',ready?result.gateCount:0,ready?result.gateTotal:OC16_GATE_TOTAL,ready?result.gatePercentage:0,'data-oc16-gates')}${stat('OC16 pair coverage',ready?result.pairCount:0,ready?result.pairTotal:OC16_PAIR_TOTAL,ready?result.pairPercentage:0,'data-oc16-pairs')}</dl>${hasScopedWaEstimate(known()?result:null)?`<p class="wa-small-note" data-wa-uncertainty>≈ ${text('OC16 uncertain')}</p>`:''}${mechanismHtml()}${gapsHtml()}</section>`;
  }
  const pairState = pair => known() ? result.pairs.find(row => row.channelId === pair.channelId)?.status || 'absent' : 'unknown';
  const holders = (pair, gate) => known() ? result.pairs.find(row => row.channelId === pair.channelId)?.holdersByGate?.[gate] || [] : null;
  const rowState = state => state === 'unknown' ? 'unknown' : ['selfComplete','crossMemberOnly','both'].includes(state) ? 'complete' : state === 'hanging' ? 'partial' : 'none';
  function pairToken(pair, { tag = 'button' } = {}) {
    const state = pairState(pair);
    const label = `${pair.displayGates.join('–')} · ${waChannelTitle(pair.channelId)} · ${t(`Wa row ${rowState(state)}`)}`;
    const [leftGate, rightGate] = pair.displayGates;
    const lit = !known() ? 'unknown' : covered(leftGate) && covered(rightGate) ? 'both' : covered(leftGate) ? 'left' : covered(rightGate) ? 'right' : 'none';
    const bridge = `<span class="wa-pair-bridge" data-lit="${lit}" aria-hidden="true">–</span>`;
    const roleClass = pair.role==='core'?'is-core':pair.role==='personnel'?'is-personnel':'';
    const ends = pair.displayGates.map(gate=>`<span class="wa-pair-end" data-covered="${known()?covered(gate):'unknown'}" data-wa-members="${esc((holders(pair,gate)||[]).join(' '))}">${gate}</span>`).join(bridge);
    if (tag === 'span') {
      return `<span class="wa-pair-token ${roleClass}" data-state="${state}" data-lit="${lit}" aria-hidden="true">${ends}</span>`;
    }
    return `<button type="button" class="wa-pair-token ${roleClass}" data-wa-pair="${pair.channelId}" data-state="${state}" data-lit="${lit}" aria-label="${esc(label)}" title="${esc(label)}">${ends}</button>`;
  }
  function channelRow(pair) {
    const state = pairState(pair), row = rowState(state);
    const gateCell = gate => {
      const ids = holders(pair, gate);
      return `<span class="wa-row-gate" data-wa-endpoint="${gate}" data-wa-covered="${ids?ids.length>0:'unknown'}"><button type="button" class="wa-row-gate-number" data-wa-gate="${gate}" title="${esc(`${gate} · ${gateName(gate)}`)}">${gate}</button><span class="wa-row-markers">${ids===null?'—':ids.length?ids.map(id=>showNames?`<span class="wa-row-member" title="${esc(nameOf(id))}">${markerHtml(id)}<span class="wa-row-member-name">${esc(nameOf(id))}</span></span>`:markerHtml(id)).join(''):`<span class="wa-row-empty">—</span>`}</span></span>`;
    };
    return `<li class="wa-channel-row ${pair.role==='core'?'is-core':pair.role==='personnel'?'is-personnel':''}" data-pair-row="${pair.channelId}" data-row-state="${row}" data-wa-state="${state}">${pairToken(pair)}<button type="button" class="wa-row-name" data-wa-pair-open="${pair.channelId}">${esc(waChannelTitle(pair.channelId))}${pair.role==='core'?`<small>${text('OC16 core')}</small>`:pair.role==='personnel'?`<small>${text('OC16 personnel')}</small>`:''}</button>${pair.displayGates.map(gateCell).join('')}<span class="wa-row-state" data-state="${row}">${text(`Wa row ${row}`)}</span></li>`;
  }
  function departmentHtml(department) {
    const summary = known() ? result.departments.find(row=>row.id===department.id) : null;
    const open = !collapsed.has(department.id), gates = department.pairs.length*2;
    const value = count => summary ? count : '—';
    return `<article class="wa-department-card" data-department-card="${department.id}" data-gate-count="${summary?.gateCount??'unknown'}" data-pair-count="${summary?.pairCount??'unknown'}" data-complete="${Boolean(summary&&summary.gateCount===gates)}"><header class="wa-department-top"><button class="wa-department-head" data-department-toggle="${department.id}" data-focus="department-${department.id}" aria-expanded="${open}" aria-controls="wa-department-${department.id}"><span class="wa-chevron" aria-hidden="true"></span><span class="wa-department-name"><strong>${text(`OC16 ${department.id}`)}</strong>${getLocale()==='en'?'':`<small>${department.id.charAt(0).toUpperCase()+department.id.slice(1)}</small>`}</span><span class="wa-department-score"><span><b>${value(summary?.gateCount)}</b>/${gates} ${text('OC16 gates unit')}</span><span><b>${value(summary?.pairCount)}</b>/${department.pairs.length} ${text('OC16 pairs unit')}</span></span></button></header><span class="wa-meter" aria-hidden="true"><i style="width:${summary?summary.gatePercentage:0}%"></i></span>${open?'':`<div class="wa-pair-strip">${department.pairs.map(pairToken).join('')}</div>`}<ul id="wa-department-${department.id}" class="wa-channel-rows" ${open?'':'hidden'}>${department.pairs.map(channelRow).join('')}</ul></article>`;
  }
  function departmentsHtml() {
    return `<section class="panel wa-departments"><div class="wa-panel-heading"><h2>${text('OC16 departments')}</h2><label class="wa-alpha-toggle wa-show-names-toggle"><input type="checkbox" data-wa-show-names data-focus="show-names" ${showNames?'checked':''}>${text('Wa UI show names')}</label><span class="wa-strip-legend" aria-hidden="true"><span><i class="wa-pair-end" data-covered="true"></i>${text('Wa legend active')}</span><span><i class="wa-pair-end" data-covered="false"></i>${text('Wa legend inactive')}</span></span></div><div class="wa-department-list">${OC16_DEPARTMENTS.map(departmentHtml).join('')}</div></section>`;
  }
  function graphHtml() {
    return `<section class="panel wa-graph-panel"><div class="wa-panel-heading"><h2>${text('OC16 graph title')}</h2></div><figure class="wa-figure"><div data-wa-diagram>${renderWaDiagram(OC16_DEPARTMENTS,busy?null:result,selected,{markers:markers(),nameOf})}</div></figure></section>`;
  }
  function applyMemberFocus() {
    const page = container.querySelector('.wa-page');if(!page)return;
    if (focusMember && !viewScope().memberIds.includes(focusMember)) focusMember = null;
    page.classList.toggle('has-member-focus', Boolean(focusMember));
    page.querySelectorAll('[data-member-focus]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.memberFocus===focusMember)));
    page.querySelectorAll('[data-wa-marker-member]').forEach(node=>node.classList.toggle('is-focus',node.dataset.waMarkerMember===focusMember));
    page.querySelectorAll('.wa-diagram-gate').forEach(node=>node.classList.toggle('is-member-gate',Boolean(focusMember)&&[...node.querySelectorAll('[data-wa-marker-member]')].some(marker=>marker.dataset.waMarkerMember===focusMember)));
    page.querySelectorAll('[data-wa-members]').forEach(node=>node.classList.toggle('is-member-gate',Boolean(focusMember)&&node.dataset.waMembers.split(' ').includes(focusMember)));
    page.querySelectorAll('.wa-channel-row').forEach(node=>node.classList.toggle('has-focus-member',Boolean(focusMember)&&Boolean(node.querySelector(`[data-wa-marker-member="${CSS.escape(focusMember)}"]`))));
  }
  function errorIssuesHtml() {
    const keys={MISSING_PERSON_REFERENCE:'Missing reference',PERSON_LOOKUP_FAILED:'Missing reference',INVALID_BIRTH:'OC16 invalid birth',INVALID_TIME_UNKNOWN:'OC16 invalid birth',CHART_CALCULATION_FAILED:'Chart calculation failed',INVALID_PROVIDER_RESULT:'Invalid chart provider result'};
    return `<ul class="wa-errors">${(result?.issues||[]).map(issue=>`<li data-wa-issue="${esc(issue.code)}">${issue.memberId?`<strong>${esc(nameOf(issue.memberId)||issue.memberId)}</strong> · `:''}${text(keys[issue.code]||'Wa data error')}</li>`).join('')}</ul>`;
  }
  function calloutHtml() {
    if(busy)return `<div class="wa-empty-callout" role="status">${text('OC16 loading')}</div>`;
    if(result?.status==='not_ready')return `<section class="wa-empty-callout wa-error" role="alert"><h2>${text('OC16 unavailable')}</h2><p>${text('OC16 error note')}</p>${errorIssuesHtml()}<button class="btn-secondary" data-action="edit">${text('OC16 edit members')}</button> <button class="btn-secondary" data-action="retry">${text('OC16 retry')}</button></section>`;
    if(!validateWaLayout(draft).memberIds.length)return `<section class="wa-empty-callout"><h2>${text('OC16 empty title')}</h2><p>${text('OC16 empty note')}</p><button class="btn-primary" data-action="edit">${text('OC16 choose people')}</button></section>`;
    return '';
  }
  function updateSticky() {
    if(disposed)return;
    const column=container.querySelector('.wa-graph-column');if(!column)return;
    const header=(document.querySelector('.header')?.getBoundingClientRect().height||56)+16;
    // Sticky under the site header; diagram is fixed size so the column needs no inner scrollbar.
    column.style.setProperty('--wa-sticky-top',`${Math.floor(header)}px`);
  }
  function queueSticky() {cancelAnimationFrame(stickyFrame);stickyFrame=requestAnimationFrame(updateSticky);}
  function render() {
    if(disposed)return;
    if(composing){deferredRender=true;return;}
    const active=container.contains(document.activeElement)?document.activeElement:null;
    const focus=active?.dataset.focus, start=active?.selectionStart, end=active?.selectionEnd;
    container.innerHTML=`<div class="wa-page" data-wa-page>${headerHtml()}${configurationHtml()}<p class="wa-notice" aria-live="polite" role="status">${notice?text(notice):''}${errorText?` ${esc(errorText)}`:''}</p>${scopeBarHtml()}${calloutHtml()}<div class="wa-workspace" aria-busy="${busy}"><aside class="wa-graph-column">${graphHtml()}</aside><main class="wa-results">${overviewHtml()}${departmentsHtml()}<footer class="wa-results-footer"><button class="wa-link-button" data-action="knowledge">${text('OC16 explore readings')} ↗</button>${retainedPool()?`<p class="wa-small-note">${text('OC16 retained pool',{count:retainedPool()})}</p>`:''}</footer></main></div></div>`;
    graphResizeObserver?.disconnect();graphResizeObserver?.observe(container.querySelector('.wa-graph-panel'));queueSticky();
    const configDetails=container.querySelector('.wa-config-details');
    configDetails.querySelector('summary').addEventListener('click',()=>{configExpanded=!configDetails.open;});
    applyMemberFocus();
    if(focus){const replacement=[...container.querySelectorAll('[data-focus]')].find(node=>node.dataset.focus===focus);replacement?.focus({preventScroll:true});if(start!=null&&replacement?.setSelectionRange)replacement.setSelectionRange(start,end);}
  }

  function refreshScope() {
    const scope=viewScope();
    result=analyzeOC16(draft,prepared,{pentaId:scope.pentaId,includeAlpha:scope.includeAlpha});
    render();
  }
  function schedule() {
    generation++;clearTimeout(timer);closeReading();prepared=null;result=null;selected=null;
    const ids=validateWaLayout(draft).memberIds;
    if(!ids.length){busy=false;prepared=[];refreshScope();return;}
    busy=true;render();const token=generation;
    timer=setTimeout(()=>runAnalysis(token),130);
  }
  async function runAnalysis(token) {
    const snapshot=clone(draft), layout=validateWaLayout(snapshot);
    const identities=new Map(layout.memberIds.map(id=>{const ref=snapshot.members.find(member=>member.memberId===id);return [ref.personId,JSON.stringify(people.get(ref.personId))];}));
    try {
      const input=await prepareWaPreview(snapshot,{getPerson:id=>people.get(id),calculateBirth:calculate,effectiveBirth:effectiveTeamBirth});
      if(disposed||token!==generation)return;
      if([...identities].some(([id,value])=>JSON.stringify(people.get(id))!==value)){schedule();return;}
      prepared=input;busy=false;refreshScope();
    }catch(error){if(disposed||token!==generation)return;busy=false;prepared=null;result={status:'not_ready',issues:[{code:'CHART_CALCULATION_FAILED',message:error?.message}]};render();}
  }
  function showConfiguration() {
    configExpanded=true;const node=container.querySelector('.wa-config-details');node.open=true;
    container.querySelector('.wa-configuration').scrollIntoView({block:'start'});
    container.querySelector('[data-compose="alpha"]')?.focus({preventScroll:true});
  }
  function acceptConfiguration(next,changes=[]) {
    assertWaSnapshot(next);annotationRecovery.push(...clone(changes).map(change=>({organizationId:next.organizationId,...change})));
    draft=clone(next);version++;dirty=true;notice=changes.length?'OC16 recovery retained':'';errorText='';
    if(!draft.pentas.some(group=>group.pentaId===selectedGroup))selectedGroup=null;queueAutoSave();schedule();
  }
  function focusTarget(target) {if(!disposed)[...container.querySelectorAll('[data-compose]')].find(node=>node.dataset.compose===target)?.focus({preventScroll:true});}
  function compose(target,mode='people') {
    if(!target)return showConfiguration();
    composer?.close();closeReading();operation++;
    const original=draft,identity=JSON.stringify(draft),inputVersion=version;
    composer=openWaMemberPicker({snapshot:draft,peopleStore:people,listTeams:teams,target,mode,
      validate:()=>!disposed&&!saving&&draft===original&&version===inputVersion&&JSON.stringify(draft)===identity,
      onCommit:(next,context)=>{if(!context.isCurrent())return false;acceptConfiguration(next,context.annotationChanges);return true;},
      onClose:()=>{composer=null;focusTarget(target);}
    });
  }
  async function removeAssignment(id) {
    const original=draft,identity=JSON.stringify(draft),inputVersion=version;
    const group=draft.pentas.find(group=>group.memberIds.includes(id));
    if(id!==draft.alphaId&&!group)return;
    const target=id===draft.alphaId?'alpha':group.pentaId;
    const patch=target==='alpha'?{alphaPersonId:null}:{groups:[{pentaId:group.pentaId,personIds:group.memberIds.filter(memberId=>memberId!==id).map(memberId=>members().get(memberId).personId)}]};
    const current=()=>!disposed&&!saving&&draft===original&&version===inputVersion&&JSON.stringify(draft)===identity;
    const edit=await prepareWaSelectionChange(original,patch,new Map(people.list().map(person=>[person.id,person])),{isCurrent:current});
    if(edit&&current()){acceptConfiguration(edit.next,edit.annotationChanges);focusTarget(target);}
  }
  function load(snapshot) {
    assertWaSnapshot(snapshot);operation++;version++;composer?.close();layerClose?.();draft=clone(snapshot);
    dirty=false;notice='';errorText='';selectedGroup=null;includeAlpha=false;collapsed.clear();focusMember=null;remember(draft.organizationId);schedule();
  }
  function escapeTitlePattern(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  async function nextOrganizationTitle() {
    const base = t('Wa organization');
    let next = 1;
    try {
      const saved = await repository.list();
      const pattern = new RegExp(`^${escapeTitlePattern(base)}\\s*(\\d+)$`);
      const numbers = [];
      for (const item of saved) {
        const title = String(item.title || '').trim();
        if (title === base) numbers.push(1);
        else {
          const match = title.match(pattern);
          if (match) numbers.push(Number(match[1]));
        }
      }
      if (numbers.length) next = Math.max(...numbers) + 1;
    } catch { /* Keep 1 when the archive cannot be read. */ }
    return `${base} ${next}`;
  }
  async function createNumberedDraft() {
    const title = await nextOrganizationTitle();
    return createWaDraft({ title });
  }
  function queueAutoSave() {
    if (disposed || !dirty) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      if (!disposed && dirty && !saving) save({ silent: true });
    }, 700);
  }
  async function save({ silent = false } = {}) {
    if(saving)return;
    clearTimeout(autoSaveTimer);
    operation++; // A user save supersedes any pending last-organization autoload.
    const snapshot=clone(draft),inputVersion=version,token=++saveGeneration;
    saving=true;notice=silent?'Wa saving':'';errorText='';render();
    try {
      const saved=await repository.save(snapshot,{expectedRevision:snapshot.revision});
      if(disposed||token!==saveGeneration)return;
      if(draft.organizationId===snapshot.organizationId){
        if(version===inputVersion){draft=clone(saved);dirty=false;}else for(const key of ['revision','revisionId','parentRevisionId','savedAt'])draft[key]=saved[key];
        notice=silent?'Wa autosaved':'Wa saved';remember(saved.organizationId);
      }
    }catch(error){if(!disposed&&token===saveGeneration)fail(error);}
    finally {if(!disposed&&token===saveGeneration){saving=false;render();}}
  }
  function layer(title,body,onClose=null) {
    layerClose?.();
    const opened=openOperationDialog({content:`<section class="modal wa-archive-dialog" aria-label="${text(title)}">${renderDialogHeader(t(title))}${body}<p class="wa-layer-error" role="alert"></p></section>`,onClose:()=>{if(layerClose===opened.close)layerClose=null;onClose?.();}});
    layerClose=opened.close;return opened;
  }
  async function archives() {
    closeReading();const token=++operation,inputVersion=version;
    try {
      const saved=await repository.list();if(disposed||token!==operation||inputVersion!==version)return;
      const {root,close}=layer('Saved organizations',`<p class="wa-small-note">${text('OC16 origin note')}</p><button class="btn-secondary" data-backup-draft>${text('OC16 export draft')}</button><div class="wa-archive-list">${saved.map(item=>`<section class="wa-archive-row"><button data-open-org="${esc(item.organizationId)}">${esc(item.title||t('Wa organization'))}<small>${validateWaLayout(item).memberIds.length} ${text('OC16 participants')} · r${item.revision}</small></button><button data-backup-org="${esc(item.organizationId)}">${text('Export backup')}</button></section>`).join('')||`<p>${text('OC16 empty saved')}</p>`}</div>`);
      root.addEventListener('click',async event=>{
        const button=event.target.closest('button');if(!button)return;
        if(button.hasAttribute('data-backup-draft')){try{await exportDraft();}catch(error){if(root.isConnected)root.querySelector('.wa-layer-error').textContent=error?.message||t('Wa data error');}return;}
        const id=button.dataset.openOrg||button.dataset.backupOrg;if(!id)return;
        try {
          if(button.dataset.backupOrg){await exportBackup(id);return;}
          if(dirty&&!await confirmOperation(t('Wa discard changes?')))return;
          if(disposed||!root.isConnected||token!==operation||version!==inputVersion)return;
          const loaded=await repository.get(id);
          if(disposed||!root.isConnected||token!==operation||version!==inputVersion)return;
          if(!loaded)throw Error(t('Missing reference'));close();load(loaded);
        }catch(error){if(root.isConnected&&token===operation)root.querySelector('.wa-layer-error').textContent=error?.message||t('Wa data error');}
      });
    }catch(error){if(!disposed&&token===operation&&inputVersion===version){fail(error);render();}}
  }
  function download(data,name) {
    if(disposed)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function exportBackup(id) {
    download(await repository.exportOrganization(id),`wa-backup-${id.replace(/[^a-zA-Z0-9_-]/g,'_')}.json`);
  }
  async function exportDraft() {
    const snapshot=clone(draft), recovery=clone(annotationRecovery);
    const saved=snapshot.revision?await repository.exportOrganization(snapshot.organizationId):null;
    download({schema:'wa-ui-backup-v2',draft:snapshot,saved,annotationRecovery:recovery},'wa-current-draft-backup.json');
  }

  const readingHtml=id=>renderWaReading(id);
  function detailBody(item) {
    if(item.type==='library')return `<h2>${text('OC16 explore readings')}</h2><div class="wa-reading-list">${listWaContent(getLocale()).map(entry=>`<button class="btn-secondary" data-wa-reading="${esc(entry.objectId)}">${esc(entry.name)}</button>`).join('')}</div>`;
    if(item.type==='reading')return readingHtml(item.id);
    if(item.type==='department')return details.renderDepartment(item.id);
    if(item.type==='pair')return details.renderPair(item.id);
    return details.renderGate(item.id);
  }
  function focusKey(node,root) {
    if(!node||!root.contains(node))return null;
    if(node.matches('summary'))return {summary:[...root.querySelectorAll('summary')].indexOf(node)};
    for(const attribute of ['data-wa-gate','data-wa-pair','data-wa-department','data-department-toggle','data-wa-reading','data-shared-lens','data-focus','data-action']){
      if(node.hasAttribute(attribute)){const value=node.getAttribute(attribute);return {attribute,value,index:[...root.querySelectorAll(`[${attribute}]`)].filter(item=>item.getAttribute(attribute)===value).indexOf(node)};}
    }
    return null;
  }
  function findFocus(key,root) {
    if(!key)return null;
    if(key.summary!==undefined)return root.querySelectorAll('summary')[key.summary];
    return [...root.querySelectorAll(`[${key.attribute}]`)].filter(node=>node.getAttribute(key.attribute)===key.value)[key.index];
  }
  function captureDetailFrame() {
    const frame=detailStack.at(-1);if(!frame)return;
    frame.scrollTop=detail.querySelector('.gate-detail-body')?.scrollTop||0;
    frame.focus=focusKey(document.activeElement,detail);
    frame.openDetails=[...detail.querySelectorAll('details')].map((node,index)=>node.open?index:null).filter(index=>index!==null);
    frame.lens=detail.querySelector('[data-shared-lens][aria-pressed="true"]')?.dataset.sharedLens;
  }
  function syncSelection() {
    container.querySelectorAll('.wa-diagram-row').forEach(row=>{
      const channel=row.querySelector('[data-wa-pair]');
      const active=selected?.type==='pair'&&selected.id===channel.dataset.waPair||selected?.type==='department'&&selected.id===row.dataset.department;
      row.classList.toggle('is-selected',Boolean(active));channel.setAttribute('aria-pressed',String(Boolean(active)));
    });
    container.querySelectorAll('.wa-diagram-gate').forEach(node=>{const active=selected?.type==='gate'&&String(selected.id)===node.dataset.waGate;node.classList.toggle('is-selected',active);node.setAttribute('aria-pressed',String(active));});container.querySelectorAll('.wa-dept-title[data-wa-department]').forEach(node=>{const active=selected?.type==='department'&&selected.id===node.dataset.waDepartment;node.classList.toggle('is-selected',active);node.setAttribute('aria-pressed',String(active));});
  }
  function detailClosed() {
    detailOpen=false;detailStack=[];selected=null;
    if(disposed)return;
    syncSelection();
    const target=detailOrigin?.node?.isConnected?detailOrigin.node:findFocus(detailOrigin?.key,container);
    target?.focus({preventScroll:true});
    if(detailOrigin)window.scrollTo(detailOrigin.x,detailOrigin.y);
    detailOrigin=null;
  }
  function showDetail(item,push=true) {
    if(!detailOpen){detailStack=[];detailOrigin={node:document.activeElement,key:focusKey(document.activeElement,container),x:window.scrollX,y:window.scrollY};}
    else if(push)captureDetailFrame();
    if(push)detailStack.push({item,scrollTop:0,focus:null,openDetails:[]});
    const frame=detailStack.at(-1);if(!frame)return;
    if(['gate','pair','department'].includes(item.type))selected=item;
    prepareDetailDialog(detail,'wa');
    detail.innerHTML=`<section class="gate-detail-card wa-reading-sheet"><nav class="gate-detail-nav">${renderDetailNavigation({canGoBack:detailStack.length>1})}</nav><div class="gate-detail-body"><p class="wa-detail-scope">Wa / OC16 · ${esc(scopeLabel())}</p>${detailBody(item)}</div></section>`;
    detail.querySelector('[data-shared-back]')?.setAttribute('data-wa-back','');
    // Back navigation restores captured fold state when any details remain; channel/dept readings are always expanded.
    if(!push)detail.querySelectorAll('details').forEach((node,index)=>{node.open=frame.openDetails.includes(index);});
    detailOpen=true;
    openDetailDialog(detail,detailClosed,{owner:'wa',label:item.type==='gate'?`${item.id} ${gateName(item.id)}`:t('Organization · Wa')});
    syncSelection();
    if(frame.lens)[...detail.querySelectorAll('[data-shared-lens]')].find(node=>node.dataset.sharedLens===frame.lens)?.click();
    fitDetailSheetHeight(detail.querySelector('.wa-reading-sheet'));
    if(!push)findFocus(frame.focus,detail)?.focus({preventScroll:true});
    detail.querySelector('.gate-detail-body').scrollTop=frame.scrollTop;
  }
  function backDetail() {if(detailStack.length<2)return;detailStack.pop();showDetail(detailStack.at(-1).item,false);}
  const unbindDetails=bindSharedObjectDetails(detail,{onBack:backDetail,onGateSelect:gate=>showDetail({type:'gate',id:gate}),onChannelSelect:id=>{if(pairs.some(pair=>pair.channelId===id))showDetail({type:'pair',id});},onLensChange:()=>fitDetailSheetHeight(detail.querySelector('.wa-reading-sheet'))});
  function detailClick(event) {
    const node=event.target.closest('button');if(!node)return;
    if(node.hasAttribute('data-shared-back'))return;
    if(node.dataset.waGate)showDetail({type:'gate',id:Number(node.dataset.waGate)});
    else if(node.dataset.waPair)showDetail({type:'pair',id:node.dataset.waPair});
    else if(node.dataset.waReading)showDetail({type:'reading',id:node.dataset.waReading});
    else if(node.dataset.waDepartment)showDetail({type:'department',id:node.dataset.waDepartment});
  }
  async function click(event) {
    const marker=event.target.closest('[data-wa-marker-member]');
    if(marker&&container.contains(marker)){
      event.preventDefault();
      focusMember=focusMember===marker.dataset.waMarkerMember?null:marker.dataset.waMarkerMember;
      applyMemberFocus();
      return;
    }
    const node=event.target.closest('button,[role="button"]');if(!node||!container.contains(node))return;
    try {
      if(node.dataset.waGate){node.focus({preventScroll:true});showDetail({type:'gate',id:Number(node.dataset.waGate)});return;}
      if(node.dataset.waPairOpen){showDetail({type:'pair',id:node.dataset.waPairOpen});return;}
      if(node.dataset.waPair){node.focus({preventScroll:true});showDetail({type:'pair',id:node.dataset.waPair});return;}
      if(node.dataset.waDepartment){showDetail({type:'department',id:node.dataset.waDepartment});return;}
      if(node.dataset.memberFocus){focusMember=focusMember===node.dataset.memberFocus?null:node.dataset.memberFocus;applyMemberFocus();return;}
      if(node.dataset.scopeOption!==undefined){closeReading();selectedGroup=node.dataset.scopeOption||null;includeAlpha=false;selected=null;if(prepared)refreshScope();else render();return;}
      if(node.dataset.departmentToggle){const id=node.dataset.departmentToggle;collapsed.has(id)?collapsed.delete(id):collapsed.add(id);render();return;}
      if(node.dataset.removeWa){await removeAssignment(node.dataset.removeWa);return;}
      if(node.hasAttribute('data-clear-alpha')){if(draft.alphaId)await removeAssignment(draft.alphaId);return;}
      if(node.dataset.compose){compose(node.dataset.compose);return;}
      if(node.dataset.import){compose(node.dataset.import,'import');return;}
      switch(node.dataset.action){
        case 'edit':showConfiguration();break;
        case 'save':await save();break;
        case 'open':await archives();break;
        case 'retry':schedule();break;
        case 'knowledge':showDetail({type:'library'});break;
        case 'new':{const current=version;if(!dirty||await confirmOperation(t('Wa discard changes?'))){if(!disposed&&current===version){const token=++operation;version++;const next=await createNumberedDraft();if(disposed||token!==operation)break;draft=next;dirty=false;notice='';errorText='';selectedGroup=null;includeAlpha=false;collapsed.clear();focusMember=null;try{storage?.removeItem(LAST_ORGANIZATION);}catch{}schedule();}}break;}
      }
    }catch(error){if(!disposed){fail(error);render();}}
  }
  function change(event) {
    if(event.target.hasAttribute('data-wa-show-names')){showNames=event.target.checked;try{storage?.setItem(SHOW_NAMES_PREF,showNames?'1':'0');}catch{}render();return;}
    if(event.target.hasAttribute('data-include-alpha')){includeAlpha=event.target.checked;closeReading();selected=null;if(prepared)refreshScope();else render();}
  }
  function markDirty() {const status=container.querySelector('.wa-draft-status');if(!status)return;status.textContent=`${t(saving?'Wa saving':'Unsaved changes')} · r${draft.revision}`;status.dataset.dirty='true';}
  function input(event) {
    if(event.target.hasAttribute('data-title')){draft.title=event.target.value;version++;dirty=true;markDirty();queueAutoSave();}
    if(event.target.hasAttribute('data-group-title')){
      const group=draft.pentas.find(group=>group.pentaId===event.target.dataset.groupTitle);group.title=event.target.value;version++;dirty=true;
      markDirty();queueAutoSave();
      const segment=[...container.querySelectorAll('[data-scope-option]')].find(node=>node.dataset.scopeOption===group.pentaId);if(segment)segment.textContent=groupName(group);
      container.querySelector('[data-scope-label]').textContent=scopeLabel();
    }
  }
  function keyboard(event) {
    if(['Enter',' '].includes(event.key)&&event.target.matches('g[role="button"]')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  }
  const detailToggle=event=>{if(detailOpen&&event.target.matches('details')&&detail.contains(event.target))fitDetailSheetHeight(detail.querySelector('.wa-reading-sheet'));};
  detail.addEventListener('toggle',detailToggle,true);
  const compositionStart=()=>{composing=true;};
  const compositionEnd=()=>{composing=false;if(deferredRender){deferredRender=false;render();}};
  container.addEventListener('click',click);container.addEventListener('change',change);container.addEventListener('input',input);container.addEventListener('keydown',keyboard);
  container.addEventListener('compositionstart',compositionStart);container.addEventListener('compositionend',compositionEnd);detail.addEventListener('click',detailClick);
  const unsubscribe=people.subscribe?.(()=>{if(!disposed)schedule();});
  const compactViewport=window.matchMedia('(max-width:600px)'), resize=()=>{render();if(detailOpen)fitDetailSheetHeight(detail.querySelector('.wa-reading-sheet'));};
  compactViewport.addEventListener('change',resize);
  graphResizeObserver=new ResizeObserver(queueSticky);window.addEventListener('resize',queueSticky);
  render();
  // Only the saved organization ID is remembered. Never cache charts, births or drafts here.
  if(options.restoreLast!==false){
    const token=operation,inputVersion=version;
    Promise.resolve().then(async()=>{let id;try{id=storage?.getItem(LAST_ORGANIZATION);}catch(error){if(!disposed&&token===operation&&version===inputVersion){fail(error);render();}return;}
      if(id){
        try{const snapshot=await repository.get(id);if(disposed||token!==operation||version!==inputVersion)return;if(snapshot){load(snapshot);return;}notice='Missing reference';render();}
        catch(error){if(!disposed&&token===operation&&version===inputVersion){fail(error);render();}return;}
      }
      if(disposed||token!==operation||version!==inputVersion||draft.title.trim())return;
      try{
        const titled=await createNumberedDraft();
        if(disposed||token!==operation||version!==inputVersion||draft.title.trim())return;
        draft=titled;render();
      }catch(error){if(!disposed&&token===operation&&version===inputVersion){fail(error);render();}}
    });
  }else if(!draft.title.trim()){
    const token=operation,inputVersion=version;
    Promise.resolve().then(async()=>{
      try{
        const titled=await createNumberedDraft();
        if(disposed||token!==operation||version!==inputVersion||draft.title.trim())return;
        draft=titled;render();
      }catch{ /* Leave the empty title if naming fails. */ }
    });
  }
  return {render,refreshLanguage(){composer?.close();layerClose?.();closeReading();render();},dispose(){if(disposed)return;disposed=true;generation++;operation++;saveGeneration++;clearTimeout(timer);clearTimeout(autoSaveTimer);cancelAnimationFrame(stickyFrame);graphResizeObserver?.disconnect();window.removeEventListener('resize',queueSticky);unsubscribe?.();compactViewport.removeEventListener('change',resize);composer?.close();layerClose?.();closeReading();unbindDetails();detail.removeEventListener('toggle',detailToggle,true);detail.remove();container.removeEventListener('click',click);container.removeEventListener('change',change);container.removeEventListener('input',input);container.removeEventListener('keydown',keyboard);container.removeEventListener('compositionstart',compositionStart);container.removeEventListener('compositionend',compositionEnd);container.replaceChildren();}};
}
