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
import { renderGateDetailHeading } from '../lib/object-detail-heading.js';
import { renderSharedGateReading, renderSharedChannelReading, bindSharedObjectDetails } from '../lib/shared-object-details.js';
import { renderProse } from '../lib/knowledge/detail-renderer.js';
import { gateName, hexagramName, planetName } from '../lib/vocabulary.js';
import { readWaContent, listWaContent } from '../lib/wa/content.js';
import { createWaDraft, assertWaSnapshot, validateWaLayout, WA_ROLES } from '../lib/wa/model.js';
import { createWaRepository } from '../lib/wa/repository.js';
import { OC16_DEPARTMENTS, WA_PILLARS } from '../lib/wa/oc16-catalog.js';
import { prepareWaPreview, analyzeOC16 } from '../lib/wa/oc16-analysis.js';
import { openWaComposer } from './wa-composer.js';
import { renderWaDiagram, renderWaLegend, waStateText, waStateSymbol, WA_PILLAR_LABELS } from './wa-diagram.js';

const clone = value => structuredClone(value);
const text = (key, params) => esc(t(key, params));
const pairs = OC16_DEPARTMENTS.flatMap(department => department.pairs);
const LAST_ORGANIZATION = 'ohd-wa-last-organization-v1';
const percentage = value => `${Number(value.toFixed(1))}%`;

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
  let prepared = [], result = analyzeOC16(draft, []), selectedGroup = null, includeAlpha = true;
  let notice = '', errorText = '', composer = null, layerClose = null, composing = false, deferredRender = false, configExpanded = null;
  let selected = null, detailOpen = false, detailStack = [], detailFocus = null;
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
  const scopeName = () => selectedGroup ? `${groupName(draft.pentas.find(group => group.pentaId === selectedGroup))}${includeAlpha ? ' + Alpha' : ''}` : t('OC16 all');
  const hasAnnotations = () => ['consultation','manualCommunicationEdges','manualMetadata'].some(key => Object.hasOwn(draft,key));
  const retainedPool = () => validateWaLayout(draft).poolMemberIds.length;
  const remember = id => { try { storage?.setItem(LAST_ORGANIZATION,id); } catch { notice='OC16 remember failed'; errorText=''; } };
  const closeReading = () => { if (detailOpen) closeDetailDialog(); };
  const fail = error => { notice=/conflict|revision/i.test(error?.code || '')?'Wa save conflict':'Wa data error'; errorText=error?.message || ''; };
  const stateHtml = pair => `<span class="wa-state">${waStateSymbol(pair?.status)}<span>${esc(waStateText(pair?.status))}</span></span>`;
  const tags = ids => `<div class="wa-contributor-list">${ids.map(id=>`<span class="wa-person-tag">${esc(nameOf(id))}</span>`).join('')}</div>`;

  function configurationHtml() {
    const alpha = draft.alphaId ? nameOf(draft.alphaId) : t('OC16 no alpha');
    return `<section class="panel wa-configuration" aria-label="${text('OC16 edit members')}"><div class="wa-config-top"><label class="wa-title-field"><span>${text('Organization title')}</span><input data-title data-focus="title" maxlength="300" value="${esc(draft.title)}" placeholder="${text('Wa organization')}"></label><span class="wa-draft-status">${text(dirty?'Unsaved changes':'Wa draft')} · r${draft.revision}</span></div><details class="wa-config-details" ${window.innerWidth>600||configExpanded===true?'open':''}><summary>${text('OC16 configuration')} · ${validateWaLayout(draft).memberIds.length} ${text('OC16 participants')}<span>${esc(alpha)}</span></summary><div class="wa-config-grid"><section class="wa-config-card"><h2>${text('OC16 alpha')}</h2><p class="wa-config-names"><strong>${esc(alpha)}</strong></p><div class="wa-config-actions"><button class="wa-link-button" data-compose="alpha" data-focus="alpha">${text('OC16 choose alpha')}</button></div></section>${draft.pentas.map(group=>`<section class="wa-config-card"><h2>${esc(groupName(group))}<small>${group.memberIds.length} / 3–5</small></h2><p class="wa-config-names">${group.memberIds.length?`<strong>${group.memberIds.map(id=>esc(nameOf(id))).join(' · ')}</strong>`:text('OC16 empty group')}</p><div class="wa-config-actions"><button class="wa-link-button" data-compose="${esc(group.pentaId)}" data-focus="people-${esc(group.pentaId)}">${text('OC16 choose people')}</button><button class="wa-link-button" data-import="${esc(group.pentaId)}" data-focus="import-${esc(group.pentaId)}">${text('OC16 import Penta')}</button></div></section>`).join('')}</div></details></section>`;
  }
  function overviewHtml() {
    const layout = validateWaLayout(draft), ready = known();
    return `<section class="panel"><div class="wa-panel-heading"><h2>${text('OC16 overview')}</h2><span class="wa-state-badge">${text(layout.standardTemplateSatisfied?'OC16 standard':'OC16 preview')}</span></div><p class="wa-state-note">${text(layout.standardTemplateSatisfied?'OC16 standard note':'OC16 preview note')}</p><dl class="wa-overview-stats"><div><dt>${text('OC16 participants')}</dt><dd>${ready?result.memberIds.length:'—'}</dd></div><div><dt>${text('OC16 gate coverage')}</dt><dd data-oc16-gates>${ready?result.gateCount:'—'} <small>/ 64</small></dd></div><div><dt>${text('OC16 pair coverage')}</dt><dd data-oc16-pairs>${ready?result.pairCount:'—'} <small>/ 32</small></dd></div></dl><p class="wa-small-note">${text('OC16 statistics note')}</p>${result?.coreWa?.uncertainty?.estimatedMemberIds.length?`<p class="wa-small-note">≈ ${text('OC16 uncertain')}</p>`:''}</section>`;
  }
  function pillarsHtml() {
    return `<section class="panel"><h2>${text('OC16 pillars')}</h2><div class="wa-pillars">${WA_PILLARS.map(pillar=>`<button class="wa-pillar" data-wa-gate="${pillar.gate}" data-focus="pillar-${pillar.gate}" data-covered="${known()?covered(pillar.gate):'unknown'}"><span class="wa-pillar-number">${pillar.gate}</span><span><strong>${text(`OC16 ${pillar.id}`)}</strong><small>${esc(hexagramName(pillar.gate))}</small><small>${known()?text(covered(pillar.gate)?'OC16 active':'OC16 inactive'):text('OC16 unknown')}</small></span></button>`).join('')}</div></section>`;
  }
  function metric(label, count, total, percent) {
    return `<div>${text(label)}<div class="wa-metric-value"><strong>${known()?`${count} / ${total}`:`— / ${total}`}</strong><small>${known()?percentage(percent):'—'}</small></div><span class="wa-meter"><i style="width:${known()?percent:0}%"></i></span></div>`;
  }
  function pairRows(department) {
    return `<div class="wa-pair-list">${department.pairs.map(pair=>`<div class="wa-pair-row" data-pair-row="${pair.channelId}"><div class="wa-pair-title"><button class="wa-pair-button" data-wa-pair="${pair.channelId}">${waStateSymbol(measuredPair(pair.channelId)?.status)}<strong>${pair.displayGates.join('–')}</strong></button><span class="wa-pair-kind">${text(pair.role==='core'?'OC16 core':'OC16 support')}</span></div><div class="wa-pair-gates">${pair.displayGates.map(gate=>`<button class="wa-gate-button ${covered(gate)?'is-covered':''}" data-wa-gate="${gate}"><strong>${gate}</strong><span>${esc(gateName(gate))} · ${esc(hexagramName(gate))}</span></button>`).join('')}</div><p class="wa-small-note">${esc(waStateText(measuredPair(pair.channelId)?.status))}</p></div>`).join('')}</div>`;
  }
  function departmentHtml(department) {
    const summary = known() ? result.departments.find(row=>row.id===department.id) : null;
    const core = department.pairs[0], open=expanded.has(department.id);
    return `<article class="wa-department-card" data-department-card="${department.id}" data-gate-count="${summary?.gateCount??'unknown'}" data-pair-count="${summary?.pairCount??'unknown'}"><button class="wa-department-head" data-department-toggle="${department.id}" data-focus="department-${department.id}" aria-expanded="${open}" aria-controls="wa-department-${department.id}"><span class="wa-department-title"><strong>${text(`OC16 ${department.id}`)}${getLocale()==='en'?'':`<small>${department.id.charAt(0).toUpperCase()+department.id.slice(1)}</small>`}</strong><span aria-hidden="true">${open?'−':'+'}</span></span><span class="wa-department-sub">${text('OC16 core')} · ${core.displayGates.join('–')} ${stateHtml(measuredPair(core.channelId))}</span><span class="wa-metrics">${metric('OC16 gate coverage',summary?.gateCount,department.pairs.length*2,summary?.gatePercentage)}${metric('OC16 pair coverage',summary?.pairCount,department.pairs.length,summary?.pairPercentage)}</span></button><div id="wa-department-${department.id}" class="wa-department-detail" ${open?'':'hidden'}>${pairRows(department)}<p class="wa-small-note">${text('OC16 contributed by')}</p>${summary?.contributorIds.length?tags(summary.contributorIds):`<p class="wa-small-note">${text(known()?'OC16 no department contributions':'OC16 unknown')}</p>`}<button class="wa-link-button" data-wa-department="${department.id}">${text('OC16 open department')}</button></div></article>`;
  }
  function selectedHtml() {
    let label='';
    if(selected?.type==='gate')label=`${selected.id} · ${gateName(selected.id)} · ${hexagramName(selected.id)}`;
    if(selected?.type==='pair')label=pairs.find(pair=>pair.channelId===selected.id)?.displayGates.join('–');
    if(selected?.type==='department')label=t(`OC16 ${selected.id}`);
    return `<section class="panel"><h2>${text('OC16 selected detail')}</h2>${label?`<div class="wa-selected"><p>${esc(label)}</p><button class="wa-link-button" data-reopen-detail>${text('OC16 inspect')}</button></div>`:`<p class="wa-small-note">${text('OC16 selected hint')}</p>`}</section>`;
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
    container.innerHTML=`<div class="wa-page" data-wa-page><header class="wa-header"><div><h1>${text('Organization · Wa')}</h1><p>${text('OC16 organization subtitle')}</p></div><div class="wa-actions"><button class="btn-secondary" data-action="new" data-focus="new" ${saving?'disabled':''}>${text('New organization')}</button><button class="btn-secondary" data-action="open" data-focus="open" ${saving?'disabled':''}>${text('OC16 open')}</button><button class="btn-secondary" data-action="edit" data-focus="edit" ${saving?'disabled':''}>${text('OC16 edit members')}</button><button class="btn-primary" data-action="save" data-focus="save" ${saving?'disabled':''}>${text('Save')}</button></div></header>${configurationHtml()}<p class="wa-notice" aria-live="polite" role="status">${notice?text(notice):''}${errorText?` ${esc(errorText)}`:''}</p>${calloutHtml()}<div class="wa-workspace" aria-busy="${busy}"><aside class="wa-graph-column"><section class="panel wa-graph-panel"><div class="wa-panel-heading"><h2>${text('OC16 graph title')}</h2><span class="wa-kicker">WA / OC16</span></div><div class="wa-scope-control"><label>${text('OC16 scope')}<select data-scope data-focus="scope"><option value="">${text('OC16 all')}</option>${draft.pentas.map(group=>`<option value="${esc(group.pentaId)}" ${group.pentaId===selectedGroup?'selected':''}>${esc(groupName(group))}</option>`).join('')}</select></label>${selectedGroup?`<label><input type="checkbox" data-include-alpha ${includeAlpha?'checked':''}>${text('OC16 with alpha')}</label>`:''}</div><figure class="wa-figure"><div data-wa-diagram>${renderWaDiagram(OC16_DEPARTMENTS,busy?null:result,selected)}</div><figcaption>${text('OC16 graph caption')}</figcaption></figure>${renderWaLegend()}</section></aside><main class="wa-results">${overviewHtml()}${pillarsHtml()}<section class="panel"><h2>${text('OC16 departments')}</h2><p class="wa-small-note">${text('OC16 groups vs departments')}</p><div class="wa-department-list">${OC16_DEPARTMENTS.map(departmentHtml).join('')}</div><p class="wa-small-note">${text('OC16 support note')}</p></section>${selectedHtml()}<section class="panel"><button class="wa-link-button" data-action="knowledge">${text('OC16 explore readings')} ↗</button><p class="wa-small-note">${text('OC16 origin note')}</p>${retainedPool()?`<p class="wa-small-note">${text('OC16 retained pool',{count:retainedPool()})}</p>`:''}${hasAnnotations()?`<p class="wa-small-note">${text('OC16 retained annotations')}</p>`:''}</section></main></div></div>`;
    const configDetails=container.querySelector('.wa-config-details');
    configDetails.querySelector('summary').addEventListener('click',()=>{configExpanded=!configDetails.open;});
    if(focus){const replacement=[...container.querySelectorAll('[data-focus]')].find(node=>node.dataset.focus===focus);replacement?.focus({preventScroll:true});if(start!=null&&replacement?.setSelectionRange)replacement.setSelectionRange(start,end);}
  }

  function refreshScope() {
    result=analyzeOC16(draft,prepared,{pentaId:selectedGroup,includeAlpha:selectedGroup?includeAlpha:true});
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
    dirty=false;notice='';errorText='';selectedGroup=null;includeAlpha=true;expanded.clear();remember(draft.organizationId);schedule();
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

  function contributionHtml(gate) {
    const record=measuredGate(gate);
    if(!record)return `<p class="wa-small-note">${text('OC16 unknown')}</p>`;
    if(!record.memberIds.length)return `<p class="wa-small-note">${text('OC16 no contributions')}</p>`;
    return record.memberIds.map(id=>`<section class="wa-activation-person"><strong>${esc(nameOf(id))}</strong><div class="wa-activation-records">${record.activations.filter(activation=>activation.memberId===id).map(activation=>`<span>${text(`OC16 ${activation.side}`)} · ${esc(planetName(activation.planet))} <b>${activation.gate}.${activation.line}</b></span>`).join('')}</div></section>`).join('');
  }
  function readingHtml(id) {
    const entry=readWaContent(id,getLocale());
    return entry?`<h2>${esc(entry.name)}</h2><div class="knowledge-summary-callout">${renderProse({content:entry.summary})}</div><div class="knowledge-body">${renderProse({content:entry.detail})}</div>`:`<p>${text('Wa reading unavailable')}</p>`;
  }
  function detailBody(item) {
    if(item.type==='library')return `<h2>${text('OC16 explore readings')}</h2><div class="wa-reading-list">${listWaContent(getLocale()).map(entry=>`<button class="btn-secondary" data-wa-reading="${esc(entry.objectId)}">${esc(entry.name)}</button>`).join('')}</div>`;
    if(item.type==='reading')return readingHtml(item.id);
    if(item.type==='department'){
      const department=OC16_DEPARTMENTS.find(department=>department.id===item.id);
      const value=known()?result.departments.find(row=>row.id===item.id):null;
      return `<h2>${text(`OC16 ${department.id}`)}</h2><p class="wa-small-note">${text('OC16 support note')}</p>${pairRows(department)}<h3>${text('OC16 contributed by')}</h3>${value?.contributorIds.length?tags(value.contributorIds):text(known()?'OC16 no department contributions':'OC16 unknown')}`;
    }
    if(item.type==='pair'){
      const pair=pairs.find(pair=>pair.channelId===item.id),value=measuredPair(item.id);
      return `<div class="detail-label">${text(`OC16 ${pair.departmentId}`)} · ${text(pair.role==='core'?'OC16 core':'OC16 support')}</div><h2>${pair.displayGates.join('–')}</h2>${stateHtml(value)}<p class="wa-small-note">${text('OC16 collective note')}</p>${pairRows({pairs:[pair]})}${value?.selfCompleteMemberIds.length?`<h3>${text('OC16 covered by one')}</h3>${tags(value.selfCompleteMemberIds)}`:''}${pair.displayGates.map(gate=>`<h3><button class="wa-link-button" data-wa-gate="${gate}">${gate} · ${esc(gateName(gate))} · ${esc(hexagramName(gate))}</button></h3>${contributionHtml(gate)}`).join('')}<h3>${text('OC16 reference')}</h3>${pair.role==='core'?readingHtml(pair.channelId):renderSharedChannelReading(pair.channelId)}`;
    }
    const gate=item.id,pair=pairs.find(pair=>pair.gates.includes(gate));
    const record=measuredGate(gate);
    return `${renderGateDetailHeading(gate)}${WA_PILLAR_LABELS[gate]?`<p class="wa-state-badge">${text('OC16 pillar')} · ${text(`OC16 ${WA_PILLAR_LABELS[gate]}`)}</p>`:''}<p class="wa-small-note">${text(`OC16 ${pair.departmentId}`)} · <button class="wa-link-button" data-wa-pair="${pair.channelId}">${pair.displayGates.join('–')} ${text(pair.role==='core'?'OC16 core':'OC16 support')}</button></p><h3>${text('OC16 activation sources')}</h3>${contributionHtml(gate)}<h3>${text('OC16 reference')}</h3>${renderSharedGateReading(gate,{activeLines:[...new Set(record?.activations.map(activation=>activation.line)||[])]})}`;
  }
  function showDetail(item,push=true) {
    if(!detailOpen){detailStack=[];detailFocus=document.activeElement;}
    if(push)detailStack.push(item);
    if(['gate','pair','department'].includes(item.type))selected=item;
    prepareDetailDialog(detail,'wa');
    detail.innerHTML=`<section class="modal wa-reading-sheet"><nav class="gate-detail-nav"><button class="btn-secondary" data-wa-back ${detailStack.length<2?'hidden':''}>${text('Back')}</button><span class="wa-kicker">WA / OC16 · ${esc(scopeName())}</span><button class="ui-icon-button gate-detail-close" aria-label="${text('Close')}">×</button></nav><div class="gate-detail-body">${detailBody(item)}</div></section>`;
    detailOpen=true;
    openDetailDialog(detail,()=>{detailOpen=false;detailStack=[];render();if(detailFocus?.isConnected)detailFocus.focus({preventScroll:true});else if(selected){const attr=selected.type==='gate'?'data-wa-gate':selected.type==='pair'?'data-wa-pair':'data-wa-department';[...container.querySelectorAll(`[${attr}]`)].find(node=>node.getAttribute(attr)===String(selected.id))?.focus({preventScroll:true});}},{owner:'wa',label:item.type==='gate'?`${item.id} ${gateName(item.id)}`:t('Organization · Wa')});
    fitDetailSheetHeight(detail.querySelector('.wa-reading-sheet'));
  }
  const unbindDetails=bindSharedObjectDetails(detail,{onGateSelect:gate=>showDetail({type:'gate',id:gate}),onChannelSelect:id=>{if(pairs.some(pair=>pair.channelId===id))showDetail({type:'pair',id});},onLensChange:()=>fitDetailSheetHeight(detail.querySelector('.wa-reading-sheet'))});
  function detailClick(event) {
    const node=event.target.closest('button');if(!node)return;
    if(node.hasAttribute('data-wa-back')){detailStack.pop();showDetail(detailStack.at(-1),false);}
    else if(node.dataset.waGate)showDetail({type:'gate',id:Number(node.dataset.waGate)});
    else if(node.dataset.waPair)showDetail({type:'pair',id:node.dataset.waPair});
    else if(node.dataset.waReading)showDetail({type:'reading',id:node.dataset.waReading});
  }
  async function click(event) {
    const node=event.target.closest('button,[role="button"]');if(!node||!container.contains(node))return;
    try {
      if(node.dataset.waGate){showDetail({type:'gate',id:Number(node.dataset.waGate)});return;}
      if(node.dataset.waPair){showDetail({type:'pair',id:node.dataset.waPair});return;}
      if(node.dataset.waDepartment){showDetail({type:'department',id:node.dataset.waDepartment});return;}
      if(node.hasAttribute('data-reopen-detail')&&selected){showDetail(selected);return;}
      if(node.dataset.departmentToggle){const id=node.dataset.departmentToggle;expanded.has(id)?expanded.delete(id):expanded.add(id);selected={type:'department',id};render();return;}
      if(node.dataset.compose){compose(node.dataset.compose);return;}
      if(node.dataset.import){compose(node.dataset.import,'import');return;}
      switch(node.dataset.action){
        case 'edit':compose();break;
        case 'save':await save();break;
        case 'open':await archives();break;
        case 'retry':schedule();break;
        case 'knowledge':showDetail({type:'library'});break;
        case 'new':{const current=version;if(!dirty||await confirmOperation(t('Wa discard changes?'))){if(!disposed&&current===version){operation++;version++;draft=createWaDraft();dirty=false;notice='';errorText='';selectedGroup=null;includeAlpha=true;expanded.clear();try{storage?.removeItem(LAST_ORGANIZATION);}catch{}schedule();}}break;}
      }
    }catch(error){if(!disposed){fail(error);render();}}
  }
  function change(event) {
    if(event.target.hasAttribute('data-scope')){selectedGroup=event.target.value||null;closeReading();selected=null;if(prepared)refreshScope();else render();}
    if(event.target.hasAttribute('data-include-alpha')){includeAlpha=event.target.checked;closeReading();selected=null;if(prepared)refreshScope();else render();}
  }
  function input(event) {
    if(event.target.hasAttribute('data-title')){draft.title=event.target.value;version++;dirty=true;container.querySelector('.wa-draft-status').textContent=`${t('Unsaved changes')} · r${draft.revision}`;}
  }
  function keyboard(event) {
    if(['Enter',' '].includes(event.key)&&event.target.matches('g[role="button"]')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  }
  const compositionStart=()=>{composing=true;};
  const compositionEnd=()=>{composing=false;if(deferredRender){deferredRender=false;render();}};
  container.addEventListener('click',click);container.addEventListener('change',change);container.addEventListener('input',input);container.addEventListener('keydown',keyboard);
  container.addEventListener('compositionstart',compositionStart);container.addEventListener('compositionend',compositionEnd);detail.addEventListener('click',detailClick);
  const unsubscribe=people.subscribe?.(()=>{if(!disposed)schedule();});
  const compactViewport=window.matchMedia('(max-width:600px)'), resize=()=>render();
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
  return {render,refreshLanguage(){composer?.close();layerClose?.();closeReading();render();},dispose(){if(disposed)return;disposed=true;generation++;operation++;saveGeneration++;clearTimeout(timer);unsubscribe?.();compactViewport.removeEventListener('change',resize);composer?.close();layerClose?.();closeReading();unbindDetails();detail.remove();container.removeEventListener('click',click);container.removeEventListener('change',change);container.removeEventListener('input',input);container.removeEventListener('keydown',keyboard);container.removeEventListener('compositionstart',compositionStart);container.removeEventListener('compositionend',compositionEnd);container.replaceChildren();}};
}
