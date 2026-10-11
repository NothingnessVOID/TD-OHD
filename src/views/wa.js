import '../styles/wa.css';
import '../lib/wa/messages.js';
import { listPeople, getPerson, onPeopleChange, birthFromPerson } from '../lib/people.js';
import { computeChart } from '../lib/chartdata.js';
import { effectiveTeamBirth } from './team-birth.js';
import { validateBirth } from '../lib/human-design/team-members.js';
import { getLocale, t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { createUuid } from '../lib/uuid.js';
import { openOperationDialog, confirmOperation } from '../lib/operation-dialog.js';
import { openDetailDialog, closeDetailDialog, prepareDetailDialog } from '../lib/detail-dialog.js';
import { renderProse } from '../lib/knowledge/detail-renderer.js';
import { readWaContent, listWaContent, WA_PAIR_IDS, waPairLabel } from '../lib/wa/content.js';
import { createWaDraft, createWaMember, moveWaMember, removeWaMember, validateWaLayout } from '../lib/wa/model.js';
import { analyzeWa, diffWa } from '../lib/wa/analysis.js';
import { createWaRepository } from '../lib/wa/repository.js';

const roles = { foundation:'Foundation', expansion:'Expansion', coordinating:'Coordinating' };
const clone = value => structuredClone(value);
const text = (key, params) => esc(t(key, params));

/** Independent, instance-owned Wa view. No chart/team store or routing ownership. */
export function mountWa(container, options = {}) {
  if (!container) throw new TypeError('Wa requires a container.');
  const people = options.peopleStore || { list:listPeople, get:getPerson, subscribe:onPeopleChange };
  const calculate = options.computeChart || computeChart;
  const analyze = options.analyzeWa || analyzeWa;
  const repository = options.repository || createWaRepository();
  let draft = createWaDraft(), dirty = false, disposed = false, generation = 0, operation = 0;
  let result = null, previousReady = null, comparison = [], currentReady = null;
  let busy = false, saving = false, notice = '', errorText = '', closeLayer = null, detailOpen = false;
  const collapsed = new Set();
  const personFor = member => people.get(member.personId);
  const nameOf = member => member ? personFor(member)?.name || member.labelSnapshot : t('No Alpha selected');
  const memberById = id => draft.members.find(member => member.memberId === id);
  const roleName = group => group.title || t(roles[group.role]);
  const destination = (snapshot, id) => snapshot.alphaId === id ? 'alpha' : snapshot.pentas.find(group => group.memberIds.includes(id))?.pentaId || '';
  const destinationName = (snapshot, id) => id === 'alpha' ? 'Alpha' : snapshot.pentas.find(group => group.pentaId === id)?.title || t(roles[snapshot.pentas.find(group => group.pentaId === id)?.role] || 'Unassigned pool');
  const detail = document.createElement('div');
  detail.className = 'wa-detail modal-overlay hidden';
  document.body.append(detail);
  const closeReading = () => { if (detailOpen) closeDetailDialog(); };
  const clearAnalysis = () => { generation++; busy = false; result = null; currentReady = null; closeReading(); };
  function changed() { clearAnalysis(); dirty = true; notice = ''; errorText = ''; render(); }
  function failure(error) {
    const conflict = /conflict|revision/i.test(error?.code || '') || /conflict/i.test(error?.name || '');
    notice = conflict ? 'Wa save conflict' : 'Wa data error';
    errorText = conflict ? '' : String(error?.message || '');
  }
  function memberRow(member) {
    const assigned = destination(draft, member.memberId), person = personFor(member);
    return `<div class="wa-member" data-member="${esc(member.memberId)}"><div class="wa-member-name"><strong>${esc(nameOf(member))}</strong>${!person ? `<small>${text('Missing reference')}</small>` : person.timeUnknown ? `<small>≈ ${text('Estimated at noon')}</small>` : ''}</div><label><span class="wa-sr-only">${text('Assignment')} ${esc(nameOf(member))}</span><select data-assign="${esc(member.memberId)}"><option value="" ${!assigned?'selected':''}>${text('Unassigned pool')}</option><option value="alpha" ${assigned==='alpha'?'selected':''}>Alpha</option>${draft.pentas.map(group=>`<option value="${esc(group.pentaId)}" ${assigned===group.pentaId?'selected':''}>${esc(roleName(group))}</option>`).join('')}</select></label><button type="button" data-remove="${esc(member.memberId)}" aria-label="${text('Remove')} ${esc(nameOf(member))}" title="${text('Remove')}">×</button></div>`;
  }
  function schematic() {
    return `<figure class="wa-schematic"><svg viewBox="0 0 660 180" role="img" aria-label="${text('Organization schematic')}"><title>${text('Organization schematic')}</title><g class="wa-schematic-edges"><path d="M330 55 V90 H110 V110 M330 90 V110 M330 90 H550 V110"/></g><rect x="230" y="10" width="200" height="45" rx="12"/><text x="330" y="39" text-anchor="middle">Alpha · ${draft.alphaId?'✓':'—'}</text>${draft.pentas.map((group,index)=>`<rect x="${10+index*220}" y="110" width="200" height="55" rx="12"/><text x="${110+index*220}" y="144" text-anchor="middle">${text(roles[group.role])} · ${group.memberIds.length}</text>`).join('')}</svg><figcaption>${text('Schematic edges show manual organization only.')}</figcaption></figure>`;
  }
  function pairRecords(value = result) { return value?.communication?.pairs || []; }
  function pairById(id, value = result) { return pairRecords(value).find(pair => pair.channelId === id); }
  function pairHolders(pair, gate) { return pair?.holdersByGate?.[gate] || []; }
  function pairCoverage(pair, id) { const gates = id.split('-'); return gates.filter(gate => pairHolders(pair, gate).length).length; }
  function resultHtml() {
    if (!result) return `<p class="wa-empty" data-wa-empty>${text('Wa empty result')}</p>`;
    return `${result.uncertainty.uncertainMemberIds.length?`<p class="wa-conditional">≈ ${text('Wa conditional result')}</p>`:''}<div class="wa-themes">${WA_PAIR_IDS.map(id=>{ const pair=pairById(id), coverage=pairCoverage(pair,id); return `<button type="button" class="wa-theme" data-pair="${id}"><span class="wa-source-label">Wa</span><strong>${esc(waPairLabel(id,getLocale()))}</strong><span>${text(coverage===2?'Both endpoints present':coverage===1?'Partial endpoint coverage':'No endpoint coverage')}</span><small>${id.split('-').map(gate=>`${gate}: ${pairHolders(pair,gate).length}`).join(' · ')}</small></button>`; }).join('')}</div><section class="wa-comparison"><h3>${text('Compared with previous ready analysis')}</h3>${previousReady ? comparison.length ? `<ul>${comparison.map(change=>`<li>${esc(changeText(change))}</li>`).join('')}</ul>` : `<p>${text('No structural changes')}</p>` : `<p>${text('First ready analysis')}</p>`}</section>`;
  }
  function changeText(change) {
    if (change.kind === 'contribution') return `${waPairLabel(change.id,getLocale())}: ${t('Contribution changed')}`;
    if (change.kind === 'group') return `${change.name}: ${t('Group structure changed')}`;
    return `${change.name}: ${t(change.kind==='move'?'Moved':change.kind==='join'?'Joined':'Left')}${change.kind==='move' ? ` · ${destinationName(change.before,change.from)} → ${destinationName(change.after,change.to)}` : ''}`;
  }
  function render() {
    if (disposed) return;
    const layout = validateWaLayout(draft), pool = draft.members.filter(member=>!destination(draft,member.memberId));
    const active = container.contains(document.activeElement) ? document.activeElement : null;
    const focus = active?.getAttribute('data-focus'), start = active?.selectionStart, end = active?.selectionEnd;
    const state = busy ? 'Wa calculating' : result ? draft.layoutMode==='observation'?'Observation ready':'Structural analysis ready' : !layout.ready?'Layout incomplete':'Wa draft';
    container.innerHTML = `<div class="wa-page" data-wa-page><header class="wa-header"><div><p class="wa-eyebrow">WA · ${text('Organization schematic')}</p><h1>${text('Wa organization')}</h1></div><div class="wa-actions"><button type="button" data-action="new">${text('New organization')}</button><button type="button" data-action="list">${text('Saved organizations')}</button><button type="button" data-action="history">${text('Revision history')}</button></div></header><p class="wa-scope">${text('Wa scope')}</p><section class="wa-panel wa-settings"><label>${text('Organization title')}<input data-title data-focus="title" maxlength="300" value="${esc(draft.title)}" placeholder="${text('Wa organization')}"></label><label>${text('Layout mode')}<select data-mode><option value="standard" ${draft.layoutMode==='standard'?'selected':''}>${text('Standard layout')}</option><option value="observation" ${draft.layoutMode==='observation'?'selected':''}>${text('Observation layout')}</option></select></label><div class="wa-save-actions"><button type="button" class="btn-primary" data-action="save" ${saving?'disabled':''}>${text('Save')}</button><button type="button" data-action="save-new" ${saving?'disabled':''}>${text('Save as new')}</button></div><p class="wa-draft-status">${text(dirty?'Unsaved changes':'Wa draft')} · r${draft.revision}</p></section><p class="wa-notice" role="status" aria-live="polite">${notice?text(notice):''}${errorText?` <span>${esc(errorText)}</span>`:''}</p><div class="wa-workspace"><aside class="wa-panel wa-pool"><h2>${text('Member pool')} <small>${draft.members.length}</small></h2><p>${text('Pool is excluded from analysis.')}</p><label>${text('Choose saved people')}<select data-person><option value="">${text('Choose saved people')}</option>${people.list().filter(person=>!draft.members.some(member=>member.personId===person.id)).map(person=>`<option value="${esc(person.id)}">${esc(person.name)} · ${esc(person.birthDate || '')}</option>`).join('')}</select></label><button type="button" data-action="add">${text('Add to pool')}</button>${!people.list().length?`<p>${text('No saved people')}</p>`:''}<h3>${text('Unassigned pool')} · ${pool.length}</h3>${pool.map(memberRow).join('')}</aside><main class="wa-layout"><section class="wa-panel wa-alpha"><label>${text('Manual Alpha')}<select data-alpha><option value="">${text('No Alpha selected')}</option>${draft.members.map(member=>`<option value="${esc(member.memberId)}" ${draft.alphaId===member.memberId?'selected':''}>${esc(nameOf(member))}</option>`).join('')}</select></label>${draft.alphaId?memberRow(memberById(draft.alphaId)):''}</section><div class="wa-groups">${draft.pentas.map(group=>`<details class="wa-panel wa-group" data-group="${esc(group.pentaId)}" ${collapsed.has(group.pentaId)?'':'open'}><summary><strong>${text(roles[group.role])}</strong><span>${group.memberIds.length}${draft.layoutMode==='standard'?'/3–5':''}</span></summary><label>${text('Penta name')}<input data-group-title="${esc(group.pentaId)}" data-focus="${esc(group.pentaId)}" value="${esc(group.title)}" placeholder="${text(roles[group.role])}"></label>${group.memberIds.map(id=>memberRow(memberById(id))).join('') || `<p class="wa-empty">${text('Assignment')} · 0</p>`}</details>`).join('')}</div><section class="wa-panel">${schematic()}<div class="wa-analyze-controls"><span data-wa-state>${text(state)}</span><button type="button" class="btn-primary" data-action="analyze" ${busy || !layout.ready?'disabled':''}>${text('Analyze structure')}</button></div></section></main></div><section class="wa-panel wa-results" aria-busy="${busy}"><h2>${text('Communication themes')}</h2>${resultHtml()}</section><details class="wa-panel wa-library"><summary>${text('Wa reading')} · 14</summary><p>${text('Manual Powerbase note')}</p><div>${listWaContent(getLocale()).map(entry=>`<button type="button" data-reading="${esc(entry.objectId)}">${esc(entry.name)}</button>`).join('')}</div></details></div>`;
    container.querySelectorAll('[data-group]').forEach(node=>node.addEventListener('toggle',()=>{if(node.open)collapsed.delete(node.dataset.group);else collapsed.add(node.dataset.group);}));
    if (focus) { const replacement=[...container.querySelectorAll('[data-focus]')].find(node=>node.dataset.focus===focus); replacement?.focus({preventScroll:true}); if (replacement && start!=null) replacement.setSelectionRange(start,end); }
  }
  function showReading(id, withContributions = false) {
    const entry = readWaContent(id,getLocale()); if (!entry) return;
    prepareDetailDialog(detail,'wa');
    const pair = withContributions ? pairById(id) : null;
    const contributors = pair ? `<section class="wa-contributions"><h3>${text('Wa contributions')}</h3><dl>${id.split('-').map(gate=>`<div><dt>${text('Gate {gate}',{gate})}</dt><dd>${pairHolders(pair,gate).map(memberId=>{ const member=memberById(typeof memberId==='string'?memberId:memberId.memberId); return `<span>${esc(nameOf(member))}${member&&personFor(member)?.timeUnknown?` · ≈ ${text('Estimated at noon')}`:''}</span>`; }).join('') || text('No contributions')}</dd></div>`).join('')}</dl><p>${text('Within-person coverage')}: ${pair.selfCompleteMemberIds.length} · ${text('Cross-member pairs')}: ${pair.complementaryMemberPairs.length}</p></section>` : '';
    detail.innerHTML = `<section class="modal wa-reading-sheet"><header><span class="wa-source-label">Wa</span><button type="button" class="gate-detail-close" aria-label="${text('Close')}">×</button></header><div class="gate-detail-body"><h2>${esc(withContributions?waPairLabel(id,getLocale()):entry.name)}</h2>${contributors}<div class="knowledge-summary-callout">${renderProse({content:entry.summary})}</div><div class="knowledge-body">${renderProse({content:entry.detail})}</div><details><summary>${text('Source references')}</summary><p>${entry.sourceRefs.map(esc).join(' · ')}</p></details></div></section>`;
    detailOpen=true; openDetailDialog(detail,()=>{detailOpen=false;},{owner:'wa',label:entry.name});
  }
  function compare(before, after) {
    if (!before) return [];
    const diff=diffWa(before.result,after.result); if(diff.status!=='ready')return [];
    const changes=diff.reassignments.map(change=>{
      const member=after.snapshot.members.find(m=>m.memberId===change.memberId)||before.snapshot.members.find(m=>m.memberId===change.memberId);
      return {kind:!change.from?'join':!change.to?'leave':'move',name:nameOf(member),from:destination(before.snapshot,change.memberId),to:destination(after.snapshot,change.memberId),before:before.snapshot,after:after.snapshot};
    });
    for(const group of diff.pentas)changes.push({kind:'group',name:destinationName(after.snapshot,group.pentaId)});
    for(const pair of diff.communication.pairs)changes.push({kind:'contribution',id:pair.channelId});
    return changes;
  }
  async function runAnalysis() {
    clearAnalysis(); const token=generation, snapshot=clone(draft), layout=validateWaLayout(snapshot);
    if (!layout.ready) { notice='Layout incomplete'; render(); return; }
    busy=true; notice=''; errorText=''; render();
    let candidates=[];
    const valid=()=>!disposed && token===generation && candidates.every(candidate=>JSON.stringify(people.get(candidate.personId))===candidate.personSnapshot);
    try {
      candidates=layout.memberIds.map(id=>{
        const member=snapshot.members.find(item=>item.memberId===id), person=people.get(member.personId);
        if (!person) throw Error(`${member.labelSnapshot}: ${t('Missing reference')}`);
        const birth=effectiveTeamBirth(birthFromPerson(person));
        if (!validateBirth({...birth,timeUnknown:false})) throw Error(`${person.name}: ${t('Missing assigned data')}`);
        return {memberId:id,personId:person.id,displayName:person.name,timeUnknown:!!person.timeUnknown,birthTimeConfidence:person.timeUnknown?'estimated':person.birthTime?'exact':'not_recorded',personSnapshot:JSON.stringify(person),birth};
      });
      const prepared=[];
      for (const candidate of candidates) {
        const output=await calculate(candidate.birth);
        if (!valid()) { if(token===generation)notice='Wa input changed'; return; }
        if (!output?.chart) throw Error(`${candidate.displayName}: ${t('Missing assigned data')}`);
        prepared.push({...candidate,chart:output.chart});
      }
      const output=await analyze(snapshot,prepared);
      if (!valid()) { if(token===generation)notice='Wa input changed'; return; }
      if (output?.status !== 'ready') { notice='Missing assigned data'; return; }
      const ready={snapshot,layout,result:output}; previousReady=currentReady || previousReady;
      comparison=compare(previousReady,ready); result=output; currentReady=ready;
    } catch(error) { if(token===generation){notice='Analysis unavailable';errorText=error.message;result=null;} }
    finally { if(token===generation&&!disposed){busy=false;render();} }
  }
  function preserveReady() { if(currentReady)previousReady=currentReady; }
  async function save(asNew=false) {
    if(saving)return; const token=++operation, capturedGeneration=generation;
    const snapshot=clone(draft);
    if(asNew)Object.assign(snapshot,{organizationId:createUuid(),revision:0,revisionId:null,parentRevisionId:null,savedAt:null});
    saving=true;notice='';render();
    try {
      const saved=await repository.save(snapshot,{expectedRevision:asNew?0:snapshot.revision});
      if(disposed||token!==operation)return;
      if(capturedGeneration===generation){draft=clone(saved);dirty=false;} else if(!asNew && draft.organizationId===snapshot.organizationId) { for(const key of ['revision','revisionId','parentRevisionId','savedAt'])draft[key]=saved[key]; }
      notice='Wa saved';
    }catch(error){if(token===operation)failure(error);}finally{if(token===operation&&!disposed){saving=false;render();}}
  }
  function layer(title, body) {
    closeLayer?.(); const opened=openOperationDialog({content:`<section class="modal wa-operation" aria-label="${text(title)}"><header><h2>${text(title)}</h2><button type="button" data-close aria-label="${text('Close')}">×</button></header>${body}<p class="wa-layer-error" role="alert"></p></section>`,onClose:()=>{if(closeLayer===opened.close)closeLayer=null;}});closeLayer=opened.close;return opened;
  }
  async function savedList() {
    const token=++operation;
    try { const list=await repository.list(); if(disposed||token!==operation)return;
      const {root,close}=layer('Saved organizations',list.length?`<div class="wa-saved-list">${list.map(item=>`<button type="button" data-load="${esc(item.organizationId)}">${esc(item.title || t('Wa organization'))} · r${item.revision}</button>`).join('')}</div>`:`<p>${text('No saved organizations')}</p>`);
      root.addEventListener('click',async event=>{const id=event.target.closest('[data-load]')?.dataset.load;if(!id)return;
        try{if(dirty&&!await confirmOperation(t('Wa discard changes?')))return;const loaded=await repository.get(id);if(!loaded||disposed||!root.isConnected)return;close();load(loaded);}catch(error){root.querySelector('.wa-layer-error').textContent=error.message;}});
    }catch(error){failure(error);render();}
  }
  async function history() {
    const token=++operation, organizationId=draft.organizationId;
    try { const versions=await repository.history(organizationId);if(disposed||token!==operation)return;
      const {root,close}=layer('Revision history',`<p>${text('Wa restore note')}</p>${versions.length?`<div class="wa-saved-list">${versions.map(item=>`<button type="button" data-restore="${esc(item.revisionId)}">${text('Restore revision')} · r${item.revision}<small>${esc(item.title)} · ${esc(item.savedAt)}</small></button>`).join('')}</div>`:`<p>${text('No revision history')}</p>`}`);
      root.addEventListener('click',async event=>{const button=event.target.closest('[data-restore]');if(!button||button.disabled)return;
        try {if(dirty&&!await confirmOperation(t('Wa discard changes?')))return;const expectedRevision=draft.revision, inputGeneration=generation;button.disabled=true;const restored=await repository.restore(organizationId,button.dataset.restore,{expectedRevision});if(disposed||!root.isConnected)return;if(inputGeneration!==generation){notice='Wa input changed';close();render();return;}close();load(restored);notice='Wa restored';render();}catch(error){failure(error);root.querySelector('.wa-layer-error').textContent=t(notice);button.disabled=false;}});
    }catch(error){failure(error);render();}
  }
  function load(snapshot) { preserveReady();clearAnalysis();if(snapshot.organizationId!==draft.organizationId)previousReady=null;draft=clone(snapshot);dirty=false;notice='';errorText='';render(); }
  async function onClick(event) {
    const button=event.target.closest('button');if(!button||!container.contains(button))return;
    try {
      if(button.dataset.pair){showReading(button.dataset.pair,true);return;}
      if(button.dataset.reading){showReading(button.dataset.reading);return;}
      if(button.dataset.remove){preserveReady();draft=removeWaMember(draft,button.dataset.remove);changed();return;}
      switch(button.dataset.action){
        case 'add': {const person=people.get(container.querySelector('[data-person]').value);if(person&&!draft.members.some(m=>m.personId===person.id)){preserveReady();draft.members.push(createWaMember({personId:person.id,labelSnapshot:person.name}));changed();}break;}
        case 'analyze':preserveReady();await runAnalysis();break;
        case 'save':await save();break;
        case 'save-new':await save(true);break;
        case 'list':await savedList();break;
        case 'history':await history();break;
        case 'new':if(!dirty||await confirmOperation(t('Wa discard changes?')))load(createWaDraft());break;
      }
    }catch(error){failure(error);render();}
  }
  function onChange(event) {
    const node=event.target;
    try {
      if(node.matches('[data-mode]')){preserveReady();draft.layoutMode=node.value;changed();}
      if(node.matches('[data-alpha]')){preserveReady();draft=node.value?moveWaMember(draft,node.value,{alpha:true}):draft.alphaId?moveWaMember(draft,draft.alphaId,null):draft;changed();}
      if(node.matches('[data-assign]')){preserveReady();draft=moveWaMember(draft,node.dataset.assign,node.value==='alpha'?{alpha:true}:node.value?{pentaId:node.value}:null);changed();}
    }catch(error){failure(error);render();}
  }
  function onInput(event) {
    const node=event.target;
    if(node.matches('[data-title]')){preserveReady();draft.title=node.value;changed();}
    if(node.matches('[data-group-title]')){preserveReady();draft.pentas.find(group=>group.pentaId===node.dataset.groupTitle).title=node.value;changed();}
  }
  container.addEventListener('click',onClick);container.addEventListener('change',onChange);container.addEventListener('input',onInput);
  const unsubscribe=people.subscribe?.(()=>{if(disposed)return;preserveReady();clearAnalysis();notice='Wa input changed';render();});
  render();
  return {render,refreshLanguage(){closeReading();closeLayer?.();render();},dispose(){if(disposed)return;disposed=true;generation++;operation++;unsubscribe?.();closeReading();closeLayer?.();detail.remove();container.removeEventListener('click',onClick);container.removeEventListener('change',onChange);container.removeEventListener('input',onInput);container.replaceChildren();}};
}
