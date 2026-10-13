import '../styles/wa.css';
import '../lib/wa/messages.js';
import '../lib/wa/oc16-messages.js';
import { listPeople, getPerson, onPeopleChange } from '../lib/people.js';
import { listTeams } from '../lib/team-repository.js';
import { computeChart } from '../lib/chartdata.js';
import { effectiveTeamBirth } from './team-birth.js';
import { getLocale, t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { openOperationDialog, confirmOperation } from '../lib/operation-dialog.js';
import { openDetailDialog, closeDetailDialog, prepareDetailDialog, fitDetailSheetHeight } from '../lib/detail-dialog.js';
import { bindSharedObjectDetails } from '../lib/shared-object-details.js';
import { createWaDetailRenderer } from './wa-detail-content.js';
import '../styles/wa-details.css';
import { renderProse } from '../lib/knowledge/detail-renderer.js';
import { gateName, hexagramName } from '../lib/vocabulary.js';
import { readWaContent, listWaContent } from '../lib/wa/content.js';
import { createWaDraft, assertWaSnapshot, validateWaLayout, WA_ROLES } from '../lib/wa/model.js';
import { createWaRepository } from '../lib/wa/repository.js';
import { OC16_DEPARTMENTS, WA_PILLARS } from '../lib/wa/oc16-catalog.js';
import { prepareWaPreview, analyzeOC16 } from '../lib/wa/oc16-analysis.js';
import { resolveWaViewScope, hasScopedWaEstimate } from '../lib/wa/view-scope.js';
import { openWaComposer } from './wa-composer.js';
import { renderWaDiagram, renderWaLegend, waStateText } from './wa-diagram.js';

const clone = value => structuredClone(value);
const text = (key, params) => esc(t(key, params));
const pairs = OC16_DEPARTMENTS.flatMap(department => department.pairs);
const LAST_ORGANIZATION = 'ohd-wa-last-organization-v1';

/** Instance-owned refs configuration + runtime-only OC16 presentation. */
export function mountWa(container, options = {}) {
  if (!container) throw new TypeError('Wa requires a container.');
  const people = options.peopleStore || { list:listPeople, get:getPerson, subscribe:onPeopleChange };
  const calculate = options.computeChart || computeChart;
  const repository = options.repository || createWaRepository();
  const teams = options.listTeams || listTeams;
  const storage = options.storage === undefined ? (() => { try { return globalThis.localStorage; } catch { return null; } })() : options.storage;
  let draft = createWaDraft(), dirty = false, saving = false, disposed = false, busy = false;
  let version = 0, generation = 0, operation = 0, saveGeneration = 0, timer = null;
  let prepared = [], result = analyzeOC16(draft, []), selectedGroup = null, includeAlpha = false;
  let notice = '', errorText = '', composer = null, layerClose = null, composing = false, deferredRender = false, configExpanded = null;
  let selected = null, detailOpen = false, detailStack = [], detailOrigin = null;
  const expanded = new Set(), annotationRecovery = [];
  const detail = document.createElement('div');
  detail.className = 'modal-overlay hidden wa-detail';
  document.body.append(detail);
  const members = () => new Map(draft.members.map(member => [member.memberId, member]));
  const nameOf = id => { const member = members().get(id); return member ? people.get(member.personId)?.name || member.labelSnapshot : ''; };
  const groupName = group => group.title || `Penta ${String.fromCharCode(65 + WA_ROLES.indexOf(group.role))}`;
  const known = () => !busy && ['ready','empty'].includes(result?.status);
  const measuredPair = id => known() ? result.pairs.find(pair => pair.channelId === id) : null;
  const measuredGate = gate => known() ? result.gateRecords.find(record => record.gate === gate) : null;
  const covered = gate => Boolean(measuredGate(gate)?.memberIds.length);
  const viewScope = () => resolveWaViewScope(draft,{pentaId:selectedGroup,includeAlpha});
  const scopeName = () => selectedGroup ? `${groupName(draft.pentas.find(group => group.pentaId === selectedGroup))}${viewScope().includeAlpha ? ' + Alpha' : ''}` : t('OC16 all');
  const scopeLabel = () => t('OC16 scope count',{scope:scopeName(),count:viewScope().memberCount});
  const retainedPool = () => validateWaLayout(draft).poolMemberIds.length;
  const remember = id => { try { storage?.setItem(LAST_ORGANIZATION,id); } catch { notice='OC16 remember failed'; errorText=''; } };
  const closeReading = () => { if (detailOpen) closeDetailDialog(); };
  const fail = error => { notice=/conflict|revision/i.test(error?.code || '')?'Wa save conflict':'Wa data error'; errorText=error?.message || ''; };
  const details=createWaDetailRenderer({getResult:()=>known()?result:null,nameOf});

  const chips = ids => `<span class="wa-chip-list">${ids.map(id=>`<span class="wa-chip">${esc(nameOf(id))}</span>`).join('')}</span>`;
  const groupSizeState = count => count === 0 ? 'empty' : count >= 3 && count <= 5 ? 'ok' : 'warn';
  function headerHtml() {
    return `<header class="wa-header"><div class="wa-header-text"><h1>${text('Organization · Wa')}</h1><p>${text('OC16 organization subtitle')}</p></div><div class="wa-actions"><span class="wa-draft-status" data-dirty="${dirty}">${text(dirty?'Unsaved changes':'Wa draft')} · r${draft.revision}</span><button class="btn-secondary" data-action="new" data-focus="new" ${saving?'disabled':''}>${text('New organization')}</button><button class="btn-secondary" data-action="open" data-focus="open" ${saving?'disabled':''}>${text('OC16 open')}</button><button class="btn-primary" data-action="save" data-focus="save" ${saving?'disabled':''}>${text('Save')}</button></div></header>`;
  }
  function configurationHtml() {
    const alpha = draft.alphaId ? nameOf(draft.alphaId) : t('OC16 no alpha');
    const alphaCard = `<section class="wa-config-card is-alpha"><header><h2>${text('OC16 alpha')}</h2></header><div class="wa-config-names">${draft.alphaId?chips([draft.alphaId]):`<span class="wa-config-empty">${esc(alpha)}</span>`}</div><div class="wa-config-actions"><button class="wa-link-button" data-compose="alpha" data-focus="alpha">${text('OC16 choose alpha')}</button></div></section>`;
    const groupCard = group => {
      const count = group.memberIds.length, state = groupSizeState(count);
      return `<section class="wa-config-card"><header><h2>${esc(groupName(group))}</h2><span class="wa-count-badge" data-state="${state}" ${state==='warn'?`title="${text('OC16 group size')}"`:''}>${count} / 3–5</span></header><div class="wa-config-names">${count?chips(group.memberIds):`<span class="wa-config-empty">${text('OC16 empty group')}</span>`}</div><div class="wa-config-actions"><button class="wa-link-button" data-compose="${esc(group.pentaId)}" data-focus="people-${esc(group.pentaId)}">${text('OC16 choose people')}</button><button class="wa-link-button" data-import="${esc(group.pentaId)}" data-focus="import-${esc(group.pentaId)}">${text('OC16 import Penta')}</button></div></section>`;
    };
    return `<section class="panel wa-configuration" aria-label="${text('OC16 configuration')}"><div class="wa-config-top"><label class="wa-title-field"><span>${text('Organization title')}</span><input data-title data-focus="title" maxlength="300" value="${esc(draft.title)}" placeholder="${text('Wa organization')}"></label><button class="btn-secondary wa-config-edit" data-action="edit" data-focus="edit" ${saving?'disabled':''}>${text('OC16 edit members')}</button></div><details class="wa-config-details" ${window.innerWidth>600||configExpanded===true?'open':''}><summary>${text('OC16 configuration')} · ${validateWaLayout(draft).memberIds.length} ${text('OC16 participants')}<span>${esc(alpha)}</span></summary><div class="wa-config-grid">${alphaCard}${draft.pentas.map(groupCard).join('')}</div></details></section>`;
  }
  function scopeBarHtml() {
    if (!validateWaLayout(draft).memberIds.length) return `<p class="wa-scope-label" data-scope-label role="status" hidden>${esc(scopeLabel())}</p>`;
    const option = (id, label) => {
      const active = (selectedGroup || '') === id;
      return `<button type="button" class="wa-segment" data-scope-option="${esc(id)}" data-focus="scope-${esc(id)}" aria-pressed="${active}">${esc(label)}</button>`;
    };
    return `<section class="wa-scope-bar" aria-label="${text('OC16 scope')}"><span class="wa-scope-title">${text('OC16 scope')}</span><div class="wa-segmented" role="group" aria-label="${text('OC16 scope')}">${option('',t('OC16 all'))}${draft.pentas.map(group=>option(group.pentaId,groupName(group))).join('')}</div>${selectedGroup?`<label class="wa-alpha-toggle"><input type="checkbox" data-include-alpha data-focus="include-alpha" ${includeAlpha&&draft.alphaId?'checked':''} ${draft.alphaId?'':'disabled'}>${text('OC16 with alpha')}</label>`:''}<p class="wa-scope-label" data-scope-label role="status">${esc(scopeLabel())}</p></section>`;
  }
  function stat(label, value, total, percent, attribute = '') {
    const ready = known();
    return `<div><dt>${text(label)}</dt><dd ${attribute}>${ready?value:'—'}${total?` <small>/ ${total}</small>`:''}</dd>${total?`<span class="wa-meter" aria-hidden="true"><i style="width:${ready?percent:0}%"></i></span>`:''}</div>`;
  }
  function pillarsHtml() {
    return `<h3 class="wa-subheading">${text('OC16 pillars')}</h3><div class="wa-pillars">${WA_PILLARS.map(pillar=>`<button class="wa-pillar" data-wa-gate="${pillar.gate}" data-focus="pillar-${pillar.gate}" data-covered="${known()?covered(pillar.gate):'unknown'}"><span class="wa-pillar-number">${pillar.gate}</span><span class="wa-pillar-text"><strong>${text(`OC16 ${pillar.id}`)}</strong><small>${esc(hexagramName(pillar.gate))}</small><small class="wa-pillar-state">${known()?text(covered(pillar.gate)?'OC16 active':'OC16 inactive'):text('OC16 unknown')}</small></span></button>`).join('')}</div>`;
  }
  function gapsHtml() {
    if (!known() || !result.memberIds.length) return '';
    const rows = OC16_DEPARTMENTS.map(department => ({ department, gates:department.pairs.flatMap(pair => pair.displayGates).filter(gate => !covered(gate)) })).filter(row => row.gates.length);
    const missing = rows.reduce((sum, row) => sum + row.gates.length, 0);
    const body = rows.length ? `<div class="wa-gap-rows">${rows.map(({department,gates})=>`<div class="wa-gap-row"><span class="wa-gap-department">${text(`OC16 ${department.id}`)}</span><span class="wa-gap-list">${gates.map(gate=>`<button type="button" class="wa-gap-chip" data-wa-gate="${gate}" data-focus="gap-${gate}" title="${esc(`${gate} · ${gateName(gate)}`)}"><b>${gate}</b><span>${esc(gateName(gate))}</span></button>`).join('')}</span></div>`).join('')}</div><p class="wa-small-note">${text('OC16 gaps hint')}</p>` : `<p class="wa-gap-none">${text('OC16 gaps none')}</p>`;
    return `<h3 class="wa-subheading">${text('OC16 gaps')}${missing?`<small>${text('OC16 gaps count',{count:missing})}</small>`:''}</h3>${body}`;
  }
  function overviewHtml() {
    const layout = validateWaLayout(draft), ready = known();
    return `<section class="panel wa-overview"><div class="wa-panel-heading"><h2>${text('OC16 overview')}</h2>${selectedGroup?'':`<span class="wa-state-badge" data-standard="${layout.standardTemplateSatisfied}">${text(layout.standardTemplateSatisfied?'OC16 standard':'OC16 preview')}</span>`}</div>${!selectedGroup&&!layout.standardTemplateSatisfied?`<p class="wa-state-note">${text('OC16 preview note')}</p>`:''}<dl class="wa-overview-stats">${stat('OC16 participants',ready?result.memberIds.length:0)}${stat('OC16 gate coverage',ready?result.gateCount:0,64,ready?result.gatePercentage:0,'data-oc16-gates')}${stat('OC16 pair coverage',ready?result.pairCount:0,32,ready?result.pairPercentage:0,'data-oc16-pairs')}</dl>${hasScopedWaEstimate(known()?result:null)?`<p class="wa-small-note" data-wa-uncertainty>≈ ${text('OC16 uncertain')}</p>`:''}${pillarsHtml()}${gapsHtml()}</section>`;
  }
  const pairRows=department=>details.renderPairRows(department,{compact:true});
  function pairToken(pair) {
    const state = known() ? measuredPair(pair.channelId)?.status || 'absent' : 'unknown';
    const label = `${pair.displayGates.join('–')} · ${t(pair.role==='core'?'OC16 core':'OC16 support')} · ${waStateText(state)}`;
    return `<button type="button" class="wa-pair-token ${pair.role==='core'?'is-core':''}" data-wa-pair="${pair.channelId}" data-state="${state}" aria-label="${esc(label)}" title="${esc(label)}">${pair.displayGates.map(gate=>`<span class="wa-pair-end" data-covered="${known()?covered(gate):'unknown'}">${gate}</span>`).join('<span class="wa-pair-bridge" aria-hidden="true"></span>')}</button>`;
  }
  function departmentHtml(department) {
    const summary = known() ? result.departments.find(row=>row.id===department.id) : null;
    const open = expanded.has(department.id), gates = department.pairs.length*2;
    const value = count => summary ? count : '—';
    return `<article class="wa-department-card" data-department-card="${department.id}" data-gate-count="${summary?.gateCount??'unknown'}" data-pair-count="${summary?.pairCount??'unknown'}" data-complete="${Boolean(summary&&summary.gateCount===gates)}"><button class="wa-department-head" data-department-toggle="${department.id}" data-focus="department-${department.id}" aria-expanded="${open}" aria-controls="wa-department-${department.id}"><span class="wa-department-name"><strong>${text(`OC16 ${department.id}`)}</strong>${getLocale()==='en'?'':`<small>${department.id.charAt(0).toUpperCase()+department.id.slice(1)}</small>`}</span><span class="wa-department-score"><span><b>${value(summary?.gateCount)}</b>/${gates} ${text('OC16 gates unit')}</span><span><b>${value(summary?.pairCount)}</b>/${department.pairs.length} ${text('OC16 pairs unit')}</span></span><span class="wa-department-toggle-text">${text(open?'OC16 hide members':'OC16 show members')}<span class="wa-chevron" aria-hidden="true"></span></span></button><span class="wa-meter" aria-hidden="true"><i style="width:${summary?summary.gatePercentage:0}%"></i></span><div class="wa-pair-strip">${department.pairs.map(pairToken).join('')}</div><div id="wa-department-${department.id}" class="wa-department-detail" ${open?'':'hidden'}>${pairRows(department)}<button class="wa-link-button" data-wa-department="${department.id}">${text('OC16 open department')} →</button></div></article>`;
  }
  function departmentsHtml() {
    return `<section class="panel wa-departments"><div class="wa-panel-heading"><h2>${text('OC16 departments')}</h2><span class="wa-strip-legend" aria-hidden="true"><span><i class="wa-pair-end" data-covered="true"></i>${text('OC16 active')}</span><span><i class="wa-pair-end" data-covered="false"></i>${text('OC16 inactive')}</span><span><i class="wa-pair-token is-core"></i>${text('OC16 core')}</span></span></div><div class="wa-department-list">${OC16_DEPARTMENTS.map(departmentHtml).join('')}</div></section>`;
  }
  function graphHtml() {
    return `<section class="panel wa-graph-panel"><div class="wa-panel-heading"><h2>${text('OC16 graph title')}</h2></div><figure class="wa-figure"><div data-wa-diagram>${renderWaDiagram(OC16_DEPARTMENTS,busy?null:result,selected)}</div><figcaption>${text('OC16 graph caption')}</figcaption></figure>${renderWaLegend()}<div data-wa-selection-summary>${details.renderSelected(selected)}</div></section>`;
  }
  function errorIssuesHtml() {
    const keys={MISSING_PERSON_REFERENCE:'Missing reference',PERSON_LOOKUP_FAILED:'Missing reference',INVALID_BIRTH:'OC16 invalid birth',INVALID_TIME_UNKNOWN:'OC16 invalid birth',CHART_CALCULATION_FAILED:'Chart calculation failed',INVALID_PROVIDER_RESULT:'Invalid chart provider result'};
    return `<ul class="wa-errors">${(result?.issues||[]).map(issue=>`<li>${issue.memberId?`<strong>${esc(nameOf(issue.memberId)||issue.memberId)}</strong> · `:''}${text(keys[issue.code]||'Wa data error')} <small>(${esc(issue.code)})</small></li>`).join('')}</ul>`;
  }
  function calloutHtml() {
    if(busy)return `<div class="wa-empty-callout" role="status">${text('OC16 loading')}</div>`;
    if(result?.status==='not_ready')return `<section class="wa-empty-callout wa-error" role="alert"><h2>${text('OC16 unavailable')}</h2><p>${text('OC16 error note')}</p>${errorIssuesHtml()}<button class="btn-secondary" data-action="edit">${text('OC16 edit members')}</button> <button class="btn-secondary" data-action="retry">${text('OC16 retry')}</button></section>`;
    if(!validateWaLayout(draft).memberIds.length)return `<section class="wa-empty-callout"><h2>${text('OC16 empty title')}</h2><p>${text('OC16 empty note')}</p><button class="btn-primary" data-action="edit">${text('OC16 choose people')}</button></section>`;
    return '';
  }
  function render() {
    if(disposed)return;
    if(composing){deferredRender=true;return;}
    const active=container.contains(document.activeElement)?document.activeElement:null;
    const focus=active?.dataset.focus, start=active?.selectionStart, end=active?.selectionEnd;
    container.innerHTML=`<div class="wa-page" data-wa-page>${headerHtml()}${configurationHtml()}<p class="wa-notice" aria-live="polite" role="status">${notice?text(notice):''}${errorText?` ${esc(errorText)}`:''}</p>${scopeBarHtml()}${calloutHtml()}<div class="wa-workspace" aria-busy="${busy}"><aside class="wa-graph-column">${graphHtml()}</aside><main class="wa-results">${overviewHtml()}${departmentsHtml()}<footer class="wa-results-footer"><button class="wa-link-button" data-action="knowledge">${text('OC16 explore readings')} ↗</button>${retainedPool()?`<p class="wa-small-note">${text('OC16 retained pool',{count:retainedPool()})}</p>`:''}</footer></main></div></div>`;
    const configDetails=container.querySelector('.wa-config-details');
    configDetails.querySelector('summary').addEventListener('click',()=>{configExpanded=!configDetails.open;});
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
  function compose(target=null,mode='people') {
    composer?.close();closeReading();operation++;
    const original=draft,identity=JSON.stringify(draft),inputVersion=version;
    composer=openWaComposer({snapshot:draft,peopleStore:people,listTeams:teams,target,mode,quickCommit:target!==null,
      validate:()=>!disposed&&!saving&&draft===original&&version===inputVersion&&JSON.stringify(draft)===identity,
      onCommit:(next,context)=>{if(!context.isCurrent())return false;assertWaSnapshot(next);annotationRecovery.push(...clone(context.annotationChanges).map(change=>({organizationId:next.organizationId,...change})));draft=clone(next);version++;dirty=true;notice=context.annotationChanges.length?'OC16 recovery retained':'';errorText='';if(!draft.pentas.some(group=>group.pentaId===selectedGroup))selectedGroup=null;schedule();return true;},
      onClose:()=>{composer=null;}
    });
  }
  function load(snapshot) {
    assertWaSnapshot(snapshot);operation++;version++;composer?.close();layerClose?.();draft=clone(snapshot);
    dirty=false;notice='';errorText='';selectedGroup=null;includeAlpha=false;expanded.clear();remember(draft.organizationId);schedule();
  }
  async function save() {
    if(saving)return;
    operation++; // A user save supersedes any pending last-organization autoload.
    const snapshot=clone(draft),inputVersion=version,token=++saveGeneration;
    saving=true;notice='';errorText='';render();
    try {
      const saved=await repository.save(snapshot,{expectedRevision:snapshot.revision});
      if(disposed||token!==saveGeneration)return;
      if(draft.organizationId===snapshot.organizationId){
        if(version===inputVersion){draft=clone(saved);dirty=false;}else for(const key of ['revision','revisionId','parentRevisionId','savedAt'])draft[key]=saved[key];
        notice='Wa saved';remember(saved.organizationId);
      }
    }catch(error){if(!disposed&&token===saveGeneration)fail(error);}
    finally {if(!disposed&&token===saveGeneration){saving=false;render();}}
  }
  function layer(title,body,onClose=null) {
    layerClose?.();
    const opened=openOperationDialog({content:`<section class="modal wa-archive-dialog" aria-label="${text(title)}"><header><h2>${text(title)}</h2><button class="ui-icon-button" data-close aria-label="${text('Close')}">×</button></header>${body}<p class="wa-layer-error" role="alert"></p></section>`,onClose:()=>{if(layerClose===opened.close)layerClose=null;onClose?.();}});
    layerClose=opened.close;return opened;
  }
  async function archives() {
    closeReading();const token=++operation,inputVersion=version;
    try {
      const saved=await repository.list();if(disposed||token!==operation||inputVersion!==version)return;
      const {root,close}=layer('Saved organizations',`<p class="wa-small-note">${text('OC16 origin note')}</p><button class="btn-secondary" data-backup-draft>${text('OC16 export draft')}</button><div class="wa-archive-list">${saved.map(item=>`<section class="wa-archive-row"><button data-open-org="${esc(item.organizationId)}">${esc(item.title||t('Wa organization'))}<small>${validateWaLayout(item).memberIds.length} ${text('OC16 participants')} · r${item.revision}</small></button><button data-history-org="${esc(item.organizationId)}">${text('Revision history')}</button><button data-backup-org="${esc(item.organizationId)}">${text('Export backup')}</button></section>`).join('')||`<p>${text('OC16 empty saved')}</p>`}</div>`);
      root.addEventListener('click',async event=>{
        const button=event.target.closest('button');if(!button)return;
        if(button.hasAttribute('data-backup-draft')){try{await exportDraft();}catch(error){if(root.isConnected)root.querySelector('.wa-layer-error').textContent=error?.message||t('Wa data error');}return;}
        const id=button.dataset.openOrg||button.dataset.historyOrg||button.dataset.backupOrg;if(!id)return;
        try {
          if(button.dataset.backupOrg){await exportBackup(id);return;}
          if(button.dataset.historyOrg){await history(saved.find(item=>item.organizationId===id),token);return;}
          if(dirty&&!await confirmOperation(t('Wa discard changes?')))return;
          if(disposed||!root.isConnected||token!==operation||version!==inputVersion)return;
          const loaded=await repository.get(id);
          if(disposed||!root.isConnected||token!==operation||version!==inputVersion)return;
          if(!loaded)throw Error(t('Missing reference'));close();load(loaded);
        }catch(error){if(root.isConnected&&token===operation)root.querySelector('.wa-layer-error').textContent=error?.message||t('Wa data error');}
      });
    }catch(error){if(!disposed&&token===operation&&inputVersion===version){fail(error);render();}}
  }
  async function history(head,token) {
    const inputVersion=version,versions=await repository.history(head.organizationId);
    if(disposed||token!==operation||inputVersion!==version)return;
    const {root,close}=layer('Revision history',`<p class="wa-small-note">${text('Wa restore note')}</p><div class="wa-archive-list">${versions.map(item=>`<button data-restore="${esc(item.revisionId)}">r${item.revision} · ${esc(item.title||t('Wa organization'))}<small>${esc(item.savedAt)}</small></button>`).join('')}</div>`);
    root.addEventListener('click',async event=>{
      const button=event.target.closest('[data-restore]');if(!button||button.disabled)return;
      const previous=versions.find(item=>item.revisionId===button.dataset.restore);
      try {
        if(!await confirmOperation(t('OC16 restore warning')))return;
        if(disposed||!root.isConnected||token!==operation||inputVersion!==version)return;
        button.disabled=true;
        const restored=await repository.restore(head.organizationId,previous.revisionId,{expectedRevision:head.revision});
        if(disposed||!root.isConnected||token!==operation||inputVersion!==version)return;
        close();load(restored);notice='Wa restored';render();
      }catch(error){if(root.isConnected&&token===operation){root.querySelector('.wa-layer-error').textContent=error?.message||t('Wa data error');button.disabled=false;}}
    });
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

  function readingHtml(id) {
    const entry=readWaContent(id,getLocale());
    return entry?`<h2>${esc(entry.name)}</h2><div class="knowledge-summary-callout">${renderProse({content:entry.summary})}</div><div class="knowledge-body">${renderProse({content:entry.detail})}</div>`:`<p>${text('Wa reading unavailable')}</p>`;
  }
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
    container.querySelectorAll('.wa-diagram-gate').forEach(node=>{const active=selected?.type==='gate'&&String(selected.id)===node.dataset.waGate;node.classList.toggle('is-selected',active);node.setAttribute('aria-pressed',String(active));});
    const summary=container.querySelector('[data-wa-selection-summary]');if(summary)summary.innerHTML=details.renderSelected(selected);
  }
  function detailClosed() {
    detailOpen=false;detailStack=[];
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
    detail.innerHTML=`<section class="modal wa-reading-sheet"><nav class="gate-detail-nav"><button class="btn-secondary" data-wa-back ${detailStack.length<2?'hidden':''}>${text('Back')}</button><span class="wa-kicker">WA / OC16 · ${esc(scopeLabel())}</span><button class="ui-icon-button gate-detail-close" aria-label="${text('Close')}">×</button></nav><div class="gate-detail-body">${detailBody(item)}</div></section>`;
    detail.querySelectorAll('details').forEach((node,index)=>{node.open=frame.openDetails.includes(index);});
    detailOpen=true;
    openDetailDialog(detail,detailClosed,{owner:'wa',label:item.type==='gate'?`${item.id} ${gateName(item.id)}`:t('Organization · Wa')});
    if(frame.lens)[...detail.querySelectorAll('[data-shared-lens]')].find(node=>node.dataset.sharedLens===frame.lens)?.click();
    fitDetailSheetHeight(detail.querySelector('.wa-reading-sheet'));
    if(!push)findFocus(frame.focus,detail)?.focus({preventScroll:true});
    detail.querySelector('.gate-detail-body').scrollTop=frame.scrollTop;
  }
  const unbindDetails=bindSharedObjectDetails(detail,{onGateSelect:gate=>showDetail({type:'gate',id:gate}),onChannelSelect:id=>{if(pairs.some(pair=>pair.channelId===id))showDetail({type:'pair',id});},onLensChange:()=>fitDetailSheetHeight(detail.querySelector('.wa-reading-sheet'))});
  function detailClick(event) {
    const node=event.target.closest('button');if(!node)return;
    if(node.hasAttribute('data-wa-back')){if(detailStack.length<2)return;detailStack.pop();showDetail(detailStack.at(-1).item,false);}
    else if(node.dataset.waGate)showDetail({type:'gate',id:Number(node.dataset.waGate)});
    else if(node.dataset.waPair)showDetail({type:'pair',id:node.dataset.waPair});
    else if(node.dataset.waReading)showDetail({type:'reading',id:node.dataset.waReading});
    else if(node.dataset.waDepartment)showDetail({type:'department',id:node.dataset.waDepartment});
  }
  async function click(event) {
    const node=event.target.closest('button,[role="button"]');if(!node||!container.contains(node))return;
    try {
      if(node.hasAttribute('data-scope-option')){const next=node.dataset.scopeOption||null;if(next===selectedGroup)return;closeReading();selectedGroup=next;includeAlpha=false;selected=null;if(prepared)refreshScope();else render();return;}
      if(node.dataset.waGate){node.focus({preventScroll:true});showDetail({type:'gate',id:Number(node.dataset.waGate)});return;}
      if(node.dataset.waPair){node.focus({preventScroll:true});showDetail({type:'pair',id:node.dataset.waPair});return;}
      if(node.dataset.waDepartment){showDetail({type:'department',id:node.dataset.waDepartment});return;}
      if(node.dataset.departmentToggle){const id=node.dataset.departmentToggle;expanded.has(id)?expanded.delete(id):expanded.add(id);selected={type:'department',id};render();return;}
      if(node.dataset.compose){compose(node.dataset.compose);return;}
      if(node.dataset.import){compose(node.dataset.import,'import');return;}
      switch(node.dataset.action){
        case 'edit':compose();break;
        case 'save':await save();break;
        case 'open':await archives();break;
        case 'retry':schedule();break;
        case 'knowledge':showDetail({type:'library'});break;
        case 'new':{const current=version;if(!dirty||await confirmOperation(t('Wa discard changes?'))){if(!disposed&&current===version){operation++;version++;draft=createWaDraft();dirty=false;notice='';errorText='';selectedGroup=null;includeAlpha=false;expanded.clear();try{storage?.removeItem(LAST_ORGANIZATION);}catch{}schedule();}}break;}
      }
    }catch(error){if(!disposed){fail(error);render();}}
  }
  function change(event) {
    if(event.target.hasAttribute('data-include-alpha')){includeAlpha=event.target.checked;closeReading();selected=null;if(prepared)refreshScope();else render();}
  }
  function input(event) {
    if(event.target.hasAttribute('data-title')){draft.title=event.target.value;version++;dirty=true;const status=container.querySelector('.wa-draft-status');status.textContent=`${t('Unsaved changes')} · r${draft.revision}`;status.dataset.dirty='true';}
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
  render();
  // Only the saved organization ID is remembered. Never cache charts, births or drafts here.
  if(options.restoreLast!==false){
    const token=operation,inputVersion=version;
    Promise.resolve().then(async()=>{let id;try{id=storage?.getItem(LAST_ORGANIZATION);}catch(error){if(!disposed&&token===operation&&version===inputVersion){fail(error);render();}return;}if(!id)return;
      try{const snapshot=await repository.get(id);if(disposed||token!==operation||version!==inputVersion)return;if(snapshot)load(snapshot);else{notice='Missing reference';render();}}
      catch(error){if(!disposed&&token===operation&&version===inputVersion){fail(error);render();}}
    });
  }
  return {render,refreshLanguage(){composer?.close();layerClose?.();closeReading();render();},dispose(){if(disposed)return;disposed=true;generation++;operation++;saveGeneration++;clearTimeout(timer);unsubscribe?.();compactViewport.removeEventListener('change',resize);composer?.close();layerClose?.();closeReading();unbindDetails();detail.removeEventListener('toggle',detailToggle,true);detail.remove();container.removeEventListener('click',click);container.removeEventListener('change',change);container.removeEventListener('input',input);container.removeEventListener('keydown',keyboard);container.removeEventListener('compositionstart',compositionStart);container.removeEventListener('compositionend',compositionEnd);container.replaceChildren();}};
}
