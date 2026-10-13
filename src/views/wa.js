import '../styles/wa.css';
import '../lib/wa/messages.js';
import '../lib/wa/oc16-messages.js';
import '../lib/wa/ui-messages.js';
import '../styles/wa-members.css';
import { createWaMemberMarkers, renderWaMemberMarker, renderWaMemberLegend } from '../lib/wa/member-markers.js';
import { listPeople, getPerson, onPeopleChange } from '../lib/people.js';
import { listTeams } from '../lib/team-repository.js';
import { computeChart } from '../lib/chartdata.js';
import { effectiveTeamBirth } from './team-birth.js';
import { getLocale, t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { openOperationDialog, confirmOperation } from '../lib/operation-dialog.js';
import { openDetailDialog, closeDetailDialog, prepareDetailDialog, fitDetailSheetHeight } from '../lib/detail-dialog.js';
import { bindSharedObjectDetails } from '../lib/shared-object-details.js';
import { createWaDetailRenderer, renderWaReading } from './wa-detail-content.js';
import { renderDetailNavigation } from '../lib/object-detail-heading.js';
import '../styles/wa-details.css';
import { gateName, hexagramName } from '../lib/vocabulary.js';
import { listWaContent } from '../lib/wa/content.js';
import { createWaDraft, assertWaSnapshot, validateWaLayout, WA_ROLES } from '../lib/wa/model.js';
import { createWaRepository } from '../lib/wa/repository.js';
import { OC16_DEPARTMENTS, WA_PILLARS } from '../lib/wa/oc16-catalog.js';
import { prepareWaPreview, analyzeOC16 } from '../lib/wa/oc16-analysis.js';
import { resolveWaViewScope, hasScopedWaEstimate } from '../lib/wa/view-scope.js';
import { openWaMemberPicker, prepareWaSelectionChange } from './wa-composer.js';
import { renderWaDiagram, renderWaLegend } from './wa-diagram.js';

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
  let notice = '', errorText = '', composer = null, layerClose = null, composing = false, deferredRender = false, configExpanded = true;
  let selected = null, detailOpen = false, detailStack = [], detailOrigin = null;
  let graphResizeObserver=null,stickyFrame=0;
  const expanded = new Set(), annotationRecovery = [];
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

  function memberChip(id,alpha=false) {
    return `<li class="wa-member-chip" data-wa-member-chip="${esc(id)}">${renderWaMemberMarker(markers().get(id),{name:nameOf(id)})}<span class="wa-member-chip-name">${esc(nameOf(id))}</span><button class="wa-member-remove" ${alpha?'data-clear-alpha':`data-remove-wa="${esc(id)}"`} data-focus="remove-${esc(id)}" aria-label="${alpha?text('Wa UI clear alpha'):text('Wa UI remove member',{name:nameOf(id)})}" ${saving?'disabled':''}>×</button></li>`;
  }
  function configurationHtml() {
    return `<section class="panel wa-configuration" aria-label="${text('OC16 configuration')}"><div class="wa-config-top"><label class="wa-title-field"><span>${text('Organization title')}</span><input data-title data-focus="title" maxlength="300" value="${esc(draft.title)}" placeholder="${text('Wa organization')}"></label><div class="wa-config-save"><span class="wa-draft-status">${text(dirty?'Unsaved changes':'Wa draft')} · r${draft.revision}</span><button class="btn-primary" data-action="save" data-focus="save" ${saving?'disabled':''}>${text('Wa UI save organization')}</button></div></div><details class="wa-config-details" ${configExpanded?'open':''}><summary>${text('OC16 configuration')} · ${validateWaLayout(draft).memberIds.length} ${text('OC16 participants')}</summary><div class="wa-config-grid"><section class="wa-config-card" data-wa-target="alpha"><h2>${text('OC16 alpha')}<small>${draft.alphaId?'1':'0'} / 1</small></h2><ul class="wa-member-chips">${draft.alphaId?memberChip(draft.alphaId,true):`<li class="wa-config-empty">${text('OC16 no alpha')}</li>`}</ul><div class="wa-config-actions"><button class="btn-secondary" data-compose="alpha" data-focus="alpha" ${saving?'disabled':''}>${text(draft.alphaId?'Wa UI replace alpha':'Wa UI choose alpha')}</button></div></section>${draft.pentas.map(group=>{
      const label=`Penta ${String.fromCharCode(65+WA_ROLES.indexOf(group.role))}`;
      return `<section class="wa-config-card" data-wa-target="${esc(group.pentaId)}"><h2>${label}<small>${group.memberIds.length} / 3–5</small></h2><label class="wa-group-title"><input aria-label="${text('Wa UI group name',{group:label})}" data-group-title="${esc(group.pentaId)}" data-focus="group-${esc(group.pentaId)}" maxlength="300" value="${esc(group.title)}" placeholder="${text('Penta name')}"></label><ul class="wa-member-chips">${group.memberIds.map(id=>memberChip(id)).join('')||`<li class="wa-config-empty">${text('Wa UI empty group')}</li>`}</ul><div class="wa-config-actions"><button class="btn-secondary" data-compose="${esc(group.pentaId)}" data-focus="people-${esc(group.pentaId)}" ${saving?'disabled':''}>${text('Wa UI add member')}</button><button class="wa-link-button" data-import="${esc(group.pentaId)}" data-focus="import-${esc(group.pentaId)}" ${saving?'disabled':''}>${text('OC16 import Penta')}</button></div></section>`;
    }).join('')}</div></details></section>`;
  }
  function overviewHtml() {
    const layout = validateWaLayout(draft), ready = known();
    return `<section class="panel"><div class="wa-panel-heading"><h2>${text('OC16 overview')}</h2>${selectedGroup?'':`<span class="wa-state-badge">${text(layout.standardTemplateSatisfied?'OC16 standard':'OC16 preview')}</span>`}</div>${selectedGroup||!layout.standardTemplateSatisfied?`<p class="wa-state-note">${selectedGroup?esc(scopeLabel()):text('OC16 preview note')}</p>`:''}<dl class="wa-overview-stats"><div><dt>${text('OC16 participants')}</dt><dd>${ready?result.memberIds.length:'—'}</dd></div><div><dt>${text('OC16 gate coverage')}</dt><dd data-oc16-gates>${ready?result.gateCount:'—'} <small>/ 64</small></dd></div><div><dt>${text('OC16 pair coverage')}</dt><dd data-oc16-pairs>${ready?result.pairCount:'—'} <small>/ 32</small></dd></div></dl>${hasScopedWaEstimate(known()?result:null)?`<p class="wa-small-note" data-wa-uncertainty>≈ ${text('OC16 uncertain')}</p>`:''}</section>`;
  }
  function pillarsHtml() {
    return `<section class="panel"><h2>${text('OC16 pillars')}</h2><div class="wa-pillars">${WA_PILLARS.map(pillar=>`<button class="wa-pillar" data-wa-gate="${pillar.gate}" data-focus="pillar-${pillar.gate}" data-covered="${known()?covered(pillar.gate):'unknown'}"><span class="wa-pillar-number">${pillar.gate}</span><span><strong>${text(`OC16 ${pillar.id}`)}</strong><small>${esc(hexagramName(pillar.gate))}</small><small>${known()?text(covered(pillar.gate)?'OC16 active':'OC16 inactive'):text('OC16 unknown')}</small></span></button>`).join('')}</div></section>`;
  }
  function departmentHtml(department) {
    const summary=known()?result.departments.find(row=>row.id===department.id):null,open=expanded.has(department.id);
    return `<section class="wa-department-card" data-department-card="${department.id}" data-gate-count="${summary?.gateCount??'unknown'}" data-pair-count="${summary?.pairCount??'unknown'}"><header class="wa-department-title"><h3>${text(`OC16 ${department.id}`)}</h3><button class="wa-link-button" data-wa-department="${department.id}">${text('OC16 open department')} ↗</button></header>${details.renderChannelCards(department,{kind:'core'})}<button class="wa-more-channels" data-department-toggle="${department.id}" data-focus="department-${department.id}" aria-expanded="${open}" aria-controls="wa-department-${department.id}">${text(open?'Wa UI hide channels':'Wa UI more channels',{count:department.pairs.length-1})}<span aria-hidden="true">${open?'−':'+'}</span></button><div id="wa-department-${department.id}" class="wa-other-channels" ${open?'':'hidden'}>${details.renderChannelCards(department,{kind:'other'})}</div></section>`;
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
    const top=Math.min(header,window.innerHeight-column.getBoundingClientRect().height-16);
    column.style.setProperty('--wa-sticky-top',`${Math.floor(top)}px`);
  }
  function queueSticky() {cancelAnimationFrame(stickyFrame);stickyFrame=requestAnimationFrame(updateSticky);}
  function render() {
    if(disposed)return;
    if(composing){deferredRender=true;return;}
    const active=container.contains(document.activeElement)?document.activeElement:null;
    const focus=active?.dataset.focus, start=active?.selectionStart, end=active?.selectionEnd;
    container.innerHTML=`<div class="wa-page" data-wa-page><header class="wa-header"><div><h1>${text('Organization · Wa')}</h1><p>${text('OC16 organization subtitle')}</p></div><div class="wa-actions"><button class="btn-secondary" data-action="new" data-focus="new" ${saving?'disabled':''}>${text('New organization')}</button><button class="btn-secondary" data-action="open" data-focus="open" ${saving?'disabled':''}>${text('OC16 open')}</button></div></header>${configurationHtml()}<p class="wa-notice" aria-live="polite" role="status">${notice?text(notice):''}${errorText?` ${esc(errorText)}`:''}</p>${calloutHtml()}<div class="wa-workspace" aria-busy="${busy}"><aside class="wa-graph-column"><section class="panel wa-graph-panel"><div class="wa-panel-heading"><h2>${text('OC16 graph title')}</h2><span class="wa-kicker">WA / OC16</span></div><div class="wa-scope-control"><label>${text('OC16 scope')}<select data-scope data-focus="scope"><option value="">${text('OC16 all')}</option>${draft.pentas.map(group=>`<option value="${esc(group.pentaId)}" ${group.pentaId===selectedGroup?'selected':''}>${esc(groupName(group))}</option>`).join('')}</select></label>${selectedGroup?`<label><input type="checkbox" data-include-alpha ${includeAlpha&&draft.alphaId?'checked':''} ${draft.alphaId?'':'disabled'}>${text('OC16 with alpha')}</label>`:''}</div><p class="wa-scope-label" data-scope-label role="status">${esc(scopeLabel())}</p><figure class="wa-figure"><div data-wa-diagram>${renderWaDiagram(OC16_DEPARTMENTS,busy?null:result,selected,{markers:markers(),nameOf})}</div><figcaption>${text('OC16 graph caption')}</figcaption></figure>${renderWaLegend()}<div class="wa-graph-members"><h3>${text('Wa UI member legend')}</h3><p class="wa-small-note">${text('Wa UI marker rule')}</p>${renderWaMemberLegend(viewScope().memberIds,markers(),nameOf)}</div><div data-wa-selection-summary>${details.renderSelected(selected)}</div></section></aside><main class="wa-results">${overviewHtml()}${pillarsHtml()}<section class="panel"><h2>${text('OC16 departments')}</h2><div class="wa-department-list">${OC16_DEPARTMENTS.map(departmentHtml).join('')}</div></section><section class="panel"><button class="wa-link-button" data-action="knowledge">${text('OC16 explore readings')} ↗</button>${retainedPool()?`<p class="wa-small-note">${text('OC16 retained pool',{count:retainedPool()})}</p>`:''}</section></main></div></div>`;
    graphResizeObserver?.disconnect();graphResizeObserver?.observe(container.querySelector('.wa-graph-panel'));queueSticky();
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
  function showConfiguration() {
    configExpanded=true;const node=container.querySelector('.wa-config-details');node.open=true;
    container.querySelector('.wa-configuration').scrollIntoView({block:'start'});
    container.querySelector('[data-compose="alpha"]')?.focus({preventScroll:true});
  }
  function acceptConfiguration(next,changes=[]) {
    assertWaSnapshot(next);annotationRecovery.push(...clone(changes).map(change=>({organizationId:next.organizationId,...change})));
    draft=clone(next);version++;dirty=true;notice=changes.length?'OC16 recovery retained':'';errorText='';
    if(!draft.pentas.some(group=>group.pentaId===selectedGroup))selectedGroup=null;schedule();
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
    detail.innerHTML=`<section class="gate-detail-card wa-reading-sheet"><nav class="gate-detail-nav">${renderDetailNavigation({canGoBack:detailStack.length>1})}</nav><div class="gate-detail-body"><p class="wa-detail-scope">Wa / OC16 · ${esc(scopeLabel())}</p>${detailBody(item)}</div></section>`;
    detail.querySelector('[data-shared-back]')?.setAttribute('data-wa-back','');
    detail.querySelectorAll('details').forEach((node,index)=>{node.open=frame.openDetails.includes(index);});
    detailOpen=true;
    openDetailDialog(detail,detailClosed,{owner:'wa',label:item.type==='gate'?`${item.id} ${gateName(item.id)}`:t('Organization · Wa')});
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
    const node=event.target.closest('button,[role="button"]');if(!node||!container.contains(node))return;
    try {
      if(node.dataset.waGate){node.focus({preventScroll:true});showDetail({type:'gate',id:Number(node.dataset.waGate)});return;}
      if(node.dataset.waPair){node.focus({preventScroll:true});showDetail({type:'pair',id:node.dataset.waPair});return;}
      if(node.dataset.waDepartment){showDetail({type:'department',id:node.dataset.waDepartment});return;}
      if(node.dataset.departmentToggle){const id=node.dataset.departmentToggle;expanded.has(id)?expanded.delete(id):expanded.add(id);selected={type:'department',id};render();return;}
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
        case 'new':{const current=version;if(!dirty||await confirmOperation(t('Wa discard changes?'))){if(!disposed&&current===version){operation++;version++;draft=createWaDraft();dirty=false;notice='';errorText='';selectedGroup=null;includeAlpha=false;expanded.clear();try{storage?.removeItem(LAST_ORGANIZATION);}catch{}schedule();}}break;}
      }
    }catch(error){if(!disposed){fail(error);render();}}
  }
  function change(event) {
    if(event.target.hasAttribute('data-scope')){closeReading();selectedGroup=event.target.value||null;includeAlpha=false;selected=null;if(prepared)refreshScope();else render();}
    if(event.target.hasAttribute('data-include-alpha')){includeAlpha=event.target.checked;closeReading();selected=null;if(prepared)refreshScope();else render();}
  }
  function input(event) {
    if(event.target.hasAttribute('data-title')){draft.title=event.target.value;version++;dirty=true;container.querySelector('.wa-draft-status').textContent=`${t('Unsaved changes')} · r${draft.revision}`;}
    if(event.target.hasAttribute('data-group-title')){
      const group=draft.pentas.find(group=>group.pentaId===event.target.dataset.groupTitle);group.title=event.target.value;version++;dirty=true;
      container.querySelector('.wa-draft-status').textContent=`${t('Unsaved changes')} · r${draft.revision}`;
      [...container.querySelector('[data-scope]').options].find(option=>option.value===group.pentaId).textContent=groupName(group);
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
    Promise.resolve().then(async()=>{let id;try{id=storage?.getItem(LAST_ORGANIZATION);}catch(error){if(!disposed&&token===operation&&version===inputVersion){fail(error);render();}return;}if(!id)return;
      try{const snapshot=await repository.get(id);if(disposed||token!==operation||version!==inputVersion)return;if(snapshot)load(snapshot);else{notice='Missing reference';render();}}
      catch(error){if(!disposed&&token===operation&&version===inputVersion){fail(error);render();}}
    });
  }
  return {render,refreshLanguage(){composer?.close();layerClose?.();closeReading();render();},dispose(){if(disposed)return;disposed=true;generation++;operation++;saveGeneration++;clearTimeout(timer);cancelAnimationFrame(stickyFrame);graphResizeObserver?.disconnect();window.removeEventListener('resize',queueSticky);unsubscribe?.();compactViewport.removeEventListener('change',resize);composer?.close();layerClose?.();closeReading();unbindDetails();detail.removeEventListener('toggle',detailToggle,true);detail.remove();container.removeEventListener('click',click);container.removeEventListener('change',change);container.removeEventListener('input',input);container.removeEventListener('keydown',keyboard);container.removeEventListener('compositionstart',compositionStart);container.removeEventListener('compositionend',compositionEnd);container.replaceChildren();}};
}
