import '../styles/wa.css';
import '../lib/wa/messages.js';
import { listPeople, getPerson, onPeopleChange } from '../lib/people.js';
import { computeChart } from '../lib/chartdata.js';
import { effectiveTeamBirth } from './team-birth.js';
import { getLocale, t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { createUuid } from '../lib/uuid.js';
import { openOperationDialog, confirmOperation } from '../lib/operation-dialog.js';
import { openDetailDialog, closeDetailDialog, prepareDetailDialog } from '../lib/detail-dialog.js';
import { renderProse } from '../lib/knowledge/detail-renderer.js';
import { readWaContent, listWaContent, WA_PAIR_IDS, waPairLabel } from '../lib/wa/content.js';
import { createWaDraft, createWaMember, moveWaMember, removeWaMember, validateWaLayout, updateWaAnnotations, exportWaAnnotations, downgradeWaSnapshot } from '../lib/wa/model.js';
import { prepareWaMembers } from '../lib/wa/prepare.js';
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
  let draft = createWaDraft(), dirty = false, disposed = false, generation = 0, operation = 0, saveGeneration = 0;
  let result = null, previousReady = null, comparison = [], currentReady = null, trace = null;
  let busy = false, saving = false, notice = '', errorText = '', closeLayer = null, detailOpen = false;
  const collapsed = new Set(), expandedManual = new Set();
  let selectedGroup = '', showGroupAlpha = true;
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
  const clearAnalysis = () => { generation++; busy = false; result = null; trace = null; currentReady = null; closeReading(); };
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
  const participating = () => draft.members.filter(member => destination(draft, member.memberId));
  const consultation = () => clone(draft.consultation || { assignment:'manual', origin:'manual' });
  function updateConsultation(record) { draft=updateWaAnnotations(draft,{consultation:record}); }
  function updateEdges(edges) { draft=updateWaAnnotations(draft,{manualCommunicationEdges:edges}); }
  function manualField(key, label, value = '', extra = '') {
    return `<label>${text(label)}<textarea data-manual-field="${key}" data-focus="manual-${key}-${esc(extra)}" ${extra} rows="3">${esc(value)}</textarea></label>`;
  }
  function manualHtml() {
    const record = draft.consultation;
    return `<details class="wa-panel wa-manual" data-manual-section="records" ${expandedManual.has('records')?'open':''}><summary>${text('Manual records')}</summary><p class="wa-empty">${text('Manual records note')}</p><div class="wa-actions"><button type="button" data-action="export-annotations">${text('Export manual annotations')}</button><button type="button" data-action="export-backup">${text('Export backup')}</button>${record?`<button type="button" data-action="remove-consultation">${text('Delete consultation')}</button>`:''}</div><h3>${text('Consultation')} · ${text('Manual')}</h3><div class="wa-manual-fields">${manualField('specificProblem','Specific problem',record?.specificProblem)}${manualField('personalManagementNotes','Personal management notes',record?.personalManagementNotes)}${manualField('communicationPlan','Communication plan',record?.communicationPlan)}</div><h3>${text('Business areas')}</h3>${draft.pentas.map(group=>{
      const area=record?.businessAreas?.find(item=>item.pentaId===group.pentaId);
      return `<details data-manual-section="${esc(group.pentaId)}" ${expandedManual.has(group.pentaId)?'open':''}><summary>${esc(roleName(group))}</summary><div class="wa-manual-fields">${manualField('workScope','Work scope',area?.workScope,`data-area="${esc(group.pentaId)}"`)}${manualField('demand','Demand',area?.demand,`data-area="${esc(group.pentaId)}"`)}${manualField('requiredSkills','Required skills, one per line',area?.requiredSkills?.join('\n'),`data-area="${esc(group.pentaId)}"`)}</div>${area?`<button type="button" data-remove-area="${esc(group.pentaId)}">${text('Delete business area')}</button>`:''}</details>`;
    }).join('')}<h3>${text('Gap intentions')}</h3><div class="wa-record-list">${(record?.gapIntents||[]).map(item=>`<article><strong>${esc(item.theme||t('Untitled intention'))}</strong><p>${esc(destinationName(draft,item.pentaId))} · ${text(`Gap stage ${item.stage}`)}</p><p>${esc(item.note||'')}</p><div class="wa-actions"><button type="button" data-edit-intent="${esc(item.id)}">${text('Edit')}</button><button type="button" data-remove-intent="${esc(item.id)}">${text('Delete')}</button></div></article>`).join('')}</div><button type="button" data-action="add-intent">${text('Add Gap intention')}</button><fieldset class="wa-allies"><legend>${text('Key allies')} · ${text('Manual')}</legend>${participating().map(member=>`<label><input type="checkbox" data-ally="${esc(member.memberId)}" ${(record?.keyAllyIds||[]).includes(member.memberId)?'checked':''}><span>${esc(nameOf(member))}</span></label>`).join('')||`<p>${text('Assign participants first')}</p>`}</fieldset><h3>${text('Manual communication links')}</h3><div class="wa-record-list">${(draft.manualCommunicationEdges||[]).map(edge=>`<article><strong>${esc(nameOf(memberById(edge.fromMemberId)))} → ${esc(nameOf(memberById(edge.toMemberId)))}</strong><p>${esc(edge.label||'')} · ${text('Manual')}</p><p>${esc(edge.note||'')}</p><div class="wa-actions"><button type="button" data-edit-edge="${esc(edge.edgeId)}">${text('Edit')}</button><button type="button" data-remove-edge="${esc(edge.edgeId)}">${text('Delete')}</button></div></article>`).join('')}</div><button type="button" data-action="add-edge" ${participating().length<2?'disabled':''}>${text('Add manual link')}</button></details>`;
  }
  function editRecord(kind, id) {
    const intent=kind==='intent', records=intent?draft.consultation?.gapIntents:draft.manualCommunicationEdges;
    const existing=records?.find(item=>(intent?item.id:item.edgeId)===id);
    const item=clone(existing || (intent?{id:createUuid(),pentaId:draft.pentas[0].pentaId,theme:'',stage:'wish_list',note:''}:{edgeId:createUuid(),fromMemberId:participating()[0]?.memberId,toMemberId:participating()[1]?.memberId,assignment:'manual',label:'',note:''}));
    const options=(list,value)=>list.map(entry=>`<option value="${esc(entry.id)}" ${entry.id===value?'selected':''}>${esc(entry.name)}</option>`).join('');
    const field=(key,label)=>`<label>${text(label)}<textarea name="${key}" rows="3">${esc(item[key]||'')}</textarea></label>`;
    const select=(key,label,list)=>`<label>${text(label)}<select name="${key}">${options(list,item[key])}</select></label>`;
    const members=participating().map(member=>({id:member.memberId,name:nameOf(member)}));
    const inputGeneration=generation;
    const {root,close}=layer(intent?'Gap intentions':'Manual communication links',`<form class="wa-record-form"><p>${text('Manual')}</p>${intent?`${select('pentaId','Penta name',draft.pentas.map(group=>({id:group.pentaId,name:roleName(group)})))}${field('theme','Intention theme')}${select('stage','Reported stage',['wish_list','configured','observed'].map(stage=>({id:stage,name:t(`Gap stage ${stage}`)})))}`:`${select('fromMemberId','From participant',members)}${select('toMemberId','To participant',members)}${field('label','Link label')}`} ${field('note','Note')}<div class="wa-actions"><button type="submit" data-save-record>${text('Save record')}</button><button type="button" data-cancel-record>${text('Cancel')}</button></div></form>`);
    root.querySelector('[data-cancel-record]').addEventListener('click',close);
    root.querySelector('form').addEventListener('submit',event=>{
      event.preventDefault();
      if(generation!==inputGeneration){root.querySelector('.wa-layer-error').textContent=t('Wa input changed');return;}
      const updated={...item,...Object.fromEntries(new FormData(event.target))};
      if(!intent&&updated.fromMemberId===updated.toMemberId){root.querySelector('.wa-layer-error').textContent=t('Choose different participants');return;}
      preserveReady();
      try {
        if(intent){const target=consultation();target.gapIntents=(target.gapIntents||[]).map(entry=>entry.id===updated.id?updated:entry);if(!existing)target.gapIntents.push(updated);updateConsultation(target);}
        else {const edges=(draft.manualCommunicationEdges||[]).map(entry=>entry.edgeId===updated.edgeId?updated:entry);if(!existing)edges.push(updated);updateEdges(edges);}
        close();changed();
      } catch {root.querySelector('.wa-layer-error').textContent=t('Invalid manual record');}
    });
  }
  function pairRecords(value = result) { return value?.communication?.pairs || []; }
  function pairById(id, value = result) { return pairRecords(value).find(pair => pair.channelId === id); }
  function pairHolders(pair, gate) { return pair?.holdersByGate?.[gate] || []; }
  function pairCoverage(pair, id) { const gates = id.split('-'); return gates.filter(gate => pairHolders(pair, gate).length).length; }
  function themeCards(pairs, scope) {
    return `<div class="wa-themes" data-coverage="${scope}">${WA_PAIR_IDS.map(id=>{const pair=pairs.find(item=>item.channelId===id), coverage=pairCoverage(pair,id);return `<button type="button" class="wa-theme" data-pair="${id}" data-pair-scope="${scope}"><span class="wa-source-label">Wa</span><strong>${esc(waPairLabel(id,getLocale()))}</strong><span>${text(coverage===2?'Both endpoints present':coverage===1?'Partial endpoint coverage':'No endpoint coverage')}</span><small>${id.split('-').map(gate=>`${gate}: ${pairHolders(pair,gate).length}`).join(' · ')}</small></button>`;}).join('')}</div>`;
  }
  function traceHtml() {
    if(trace?.status!=='ready'||!trace.gates.length)return '';
    return `<details class="wa-trace"><summary>${text('Activation changes')} · ${trace.activations.added.length} / ${trace.activations.removed.length}</summary><ul>${trace.gates.map(gate=>`<li>${text('Gate {gate}',{gate:gate.gate})} · ${text('Activations')} ${gate.activationCount.from} → ${gate.activationCount.to}<ul>${gate.members.map(member=>`<li>${esc(nameOf(memberById(member.memberId)||previousReady?.snapshot.members.find(item=>item.memberId===member.memberId)))}: +${member.added.length} / −${member.removed.length}${[...member.removed,...member.added].length?` · ${esc([...new Set([...member.removed,...member.added].map(item=>`${item.gate}.${item.line}`))].join(', '))}`:''}</li>`).join('')}</ul></li>`).join('')}</ul></details>`;
  }
  function resultHtml() {
    if (!result) return `<p class="wa-empty" data-wa-empty>${text('Wa empty result')}</p>`;
    const group=result.groupCommunication?.groups.find(item=>item.pentaId===selectedGroup);
    return `${result.uncertainty.uncertainMemberIds.length?`<p class="wa-conditional">≈ ${text('Wa conditional result')}</p>`:''}<h3>${text('Structural coverage')}</h3><label>${text('Communication group')}<select data-communication-group><option value="">${text('All participants')}</option>${draft.pentas.map(item=>`<option value="${esc(item.pentaId)}" ${selectedGroup===item.pentaId?'selected':''}>${esc(roleName(item))}</option>`).join('')}</select></label>${group?`<label class="wa-alpha-toggle"><input type="checkbox" data-group-alpha ${showGroupAlpha?'checked':''}>${text('Show group with Alpha')}</label><section class="wa-coverage-section"><h3>${text('Group members only')}</h3>${themeCards(group.pairs,'group')}</section>${showGroupAlpha?`<section class="wa-coverage-section"><h3>${text('Group with manual Alpha')}</h3>${themeCards(group.withAlpha.pairs,'alpha')}</section>`:''}`:themeCards(pairRecords(),'all')}<section class="wa-comparison"><h3>${text('Compared with previous ready analysis')}</h3>${previousReady ? comparison.length ? `<ul>${comparison.map(change=>`<li>${esc(changeText(change))}</li>`).join('')}</ul>` : `<p>${text('No structural changes')}</p>` : `<p>${text('First ready analysis')}</p>`}${traceHtml()}</section>`;
  }
  function changeText(change) {
    if (change.kind === 'contribution') return `${waPairLabel(change.id,getLocale())}: ${t('Contribution changed')}`;
    if (change.kind === 'group') return `${change.name}: ${t('Group structure changed')}`;
    if (change.kind === 'member') return `${change.name}: ${t('Member structure changed')}`;
    return `${change.name}: ${t(change.kind==='move'?'Moved':change.kind==='join'?'Joined':'Left')}${change.kind==='move' ? ` · ${destinationName(change.before,change.from)} → ${destinationName(change.after,change.to)}` : ''}`;
  }
  function readingList() {
    try {return listWaContent(getLocale()).map(entry=>`<button type="button" data-reading="${esc(entry.objectId)}">${esc(entry.name)}</button>`).join('');}
    catch {return `<p>${text('Wa reading unavailable')}</p>`;}
  }
  function render() {
    if (disposed) return;
    container.querySelectorAll('[data-manual-section]').forEach(node=>{if(node.open)expandedManual.add(node.dataset.manualSection);else expandedManual.delete(node.dataset.manualSection);});
    const layout = validateWaLayout(draft), pool = draft.members.filter(member=>!destination(draft,member.memberId));
    const active = container.contains(document.activeElement) ? document.activeElement : null;
    const focus = active?.getAttribute('data-focus'), start = active?.selectionStart, end = active?.selectionEnd;
    const state = busy ? 'Wa calculating' : result ? draft.layoutMode==='observation'?'Observation ready':'Structural analysis ready' : !layout.ready?'Layout incomplete':'Wa draft';
    container.innerHTML = `<div class="wa-page" data-wa-page><header class="wa-header"><div><p class="wa-eyebrow">WA · ${text('Organization schematic')}</p><h1>${text('Wa organization')}</h1></div><div class="wa-actions"><button type="button" data-action="new">${text('New organization')}</button><button type="button" data-action="list">${text('Saved organizations')}</button><button type="button" data-action="history">${text('Revision history')}</button></div></header><p class="wa-scope">${text('Wa scope')}</p><section class="wa-panel wa-settings"><label>${text('Organization title')}<input data-title data-focus="title" maxlength="300" value="${esc(draft.title)}" placeholder="${text('Wa organization')}"></label><label>${text('Layout mode')}<select data-mode><option value="standard" ${draft.layoutMode==='standard'?'selected':''}>${text('Standard layout')}</option><option value="observation" ${draft.layoutMode==='observation'?'selected':''}>${text('Observation layout')}</option></select></label><div class="wa-save-actions"><button type="button" class="btn-primary" data-action="save" ${saving?'disabled':''}>${text('Save')}</button><button type="button" data-action="save-new" ${saving?'disabled':''}>${text('Save as new')}</button></div><p class="wa-draft-status">${text(dirty?'Unsaved changes':'Wa draft')} · r${draft.revision}</p></section><p class="wa-notice" role="status" aria-live="polite">${notice?text(notice):''}${errorText?` <span>${esc(errorText)}</span>`:''}</p><div class="wa-workspace"><aside class="wa-panel wa-pool"><h2>${text('Member pool')} <small>${draft.members.length}</small></h2><p>${text('Pool is excluded from analysis.')}</p><label>${text('Choose saved people')}<select data-person><option value="">${text('Choose saved people')}</option>${people.list().filter(person=>!draft.members.some(member=>member.personId===person.id)).map(person=>`<option value="${esc(person.id)}">${esc(person.name)} · ${esc(person.birthDate || '')}</option>`).join('')}</select></label><button type="button" data-action="add">${text('Add to pool')}</button>${!people.list().length?`<p>${text('No saved people')}</p>`:''}<h3>${text('Unassigned pool')} · ${pool.length}</h3>${pool.map(memberRow).join('')}</aside><main class="wa-layout"><section class="wa-panel wa-alpha"><label>${text('Manual Alpha')}<select data-alpha><option value="">${text('No Alpha selected')}</option>${draft.members.map(member=>`<option value="${esc(member.memberId)}" ${draft.alphaId===member.memberId?'selected':''}>${esc(nameOf(member))}</option>`).join('')}</select></label>${draft.alphaId?memberRow(memberById(draft.alphaId)):''}</section><div class="wa-groups">${draft.pentas.map(group=>`<details class="wa-panel wa-group" data-group="${esc(group.pentaId)}" ${collapsed.has(group.pentaId)?'':'open'}><summary><strong>${text(roles[group.role])}</strong><span>${group.memberIds.length}${draft.layoutMode==='standard'?'/3–5':''}</span></summary><label>${text('Penta name')}<input data-group-title="${esc(group.pentaId)}" data-focus="${esc(group.pentaId)}" value="${esc(group.title)}" placeholder="${text(roles[group.role])}"></label>${group.memberIds.map(id=>memberRow(memberById(id))).join('') || `<p class="wa-empty">${text('Assignment')} · 0</p>`}</details>`).join('')}</div><section class="wa-panel">${schematic()}<div class="wa-analyze-controls"><span data-wa-state>${text(state)}</span><button type="button" class="btn-primary" data-action="analyze" ${busy || !layout.ready?'disabled':''}>${text('Analyze structure')}</button></div></section></main></div><section class="wa-panel wa-results" aria-busy="${busy}"><h2>${text('Communication themes')}</h2>${resultHtml()}</section>${manualHtml()}<details class="wa-panel wa-library"><summary>${text('Wa reading')} · 14</summary><p>${text('Manual Powerbase note')}</p><div>${readingList()}</div></details></div>`;
    container.querySelectorAll('[data-group]').forEach(node=>node.addEventListener('toggle',()=>{if(!node.isConnected)return;if(node.open)collapsed.delete(node.dataset.group);else collapsed.add(node.dataset.group);}));
    container.querySelectorAll('[data-manual-section]').forEach(node=>node.addEventListener('toggle',()=>{if(!node.isConnected)return;if(node.open)expandedManual.add(node.dataset.manualSection);else expandedManual.delete(node.dataset.manualSection);}));
    if (focus) { const replacement=[...container.querySelectorAll('[data-focus]')].find(node=>node.dataset.focus===focus); replacement?.focus({preventScroll:true}); if (replacement && start!=null && replacement.setSelectionRange) replacement.setSelectionRange(start,end); }
  }
  function showReading(id, withContributions = false, scope = 'all') {
    let entry;
    try {entry = readWaContent(id,getLocale());if(!entry)throw Error('Unavailable');}
    catch {notice='Wa reading unavailable';errorText='';render();return;}
    prepareDetailDialog(detail,'wa');
    const group=result?.groupCommunication?.groups.find(item=>item.pentaId===selectedGroup);
    const pair = withContributions ? (scope==='group'?group?.pairs:scope==='alpha'?group?.withAlpha.pairs:pairRecords())?.find(item=>item.channelId===id) : null;
    const contributors = pair ? `<section class="wa-contributions"><h3>${text('Wa contributions')}</h3><dl>${id.split('-').map(gate=>`<div><dt>${text('Gate {gate}',{gate})}</dt><dd>${pairHolders(pair,gate).map(memberId=>{ const member=memberById(typeof memberId==='string'?memberId:memberId.memberId); return `<span>${esc(nameOf(member))}${member&&personFor(member)?.timeUnknown?` · ≈ ${text('Estimated at noon')}`:''}</span>`; }).join('') || text('No contributions')}</dd></div>`).join('')}</dl><p>${text('Within-person coverage')}: ${pair.selfCompleteMemberIds.length} · ${text('Cross-member pairs')}: ${pair.complementaryMemberPairs.length}</p></section>` : '';
    detail.innerHTML = `<section class="modal wa-reading-sheet"><header><span class="wa-source-label">Wa</span><button type="button" class="gate-detail-close" aria-label="${text('Close')}">×</button></header><div class="gate-detail-body"><h2>${esc(withContributions?waPairLabel(id,getLocale()):entry.name)}</h2>${contributors}<div class="knowledge-summary-callout">${renderProse({content:entry.summary})}</div><div class="knowledge-body">${renderProse({content:entry.detail})}</div><details><summary>${text('Source references')}</summary><p>${entry.sourceRefs.map(esc).join(' · ')}</p></details></div></section>`;
    detailOpen=true; openDetailDialog(detail,()=>{detailOpen=false;},{owner:'wa',label:entry.name});
  }
  function compare(before, after) {
    if (!before) return [];
    const diff=diffWa(before.result,after.result,{includeTrace:true}); if(diff.status!=='ready')return [];
    trace=diff.contributionTrace;
    const changes=diff.reassignments.map(change=>{
      const member=after.snapshot.members.find(m=>m.memberId===change.memberId)||before.snapshot.members.find(m=>m.memberId===change.memberId);
      return {kind:!change.from?'join':!change.to?'leave':'move',name:nameOf(member),from:destination(before.snapshot,change.memberId),to:destination(after.snapshot,change.memberId),before:before.snapshot,after:after.snapshot};
    });
    for(const group of diff.pentas)changes.push({kind:'group',name:destinationName(after.snapshot,group.pentaId)});
    for(const member of diff.memberChanges)changes.push({kind:'member',name:nameOf(after.snapshot.members.find(item=>item.memberId===member.memberId)||before.snapshot.members.find(item=>item.memberId===member.memberId))});
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
      candidates=layout.memberIds.map(id=>{const member=snapshot.members.find(item=>item.memberId===id);return {personId:member.personId,personSnapshot:JSON.stringify(people.get(member.personId))};});
      const prepared=await prepareWaMembers(snapshot,{getPerson:id=>people.get(id),effectiveBirth:effectiveTeamBirth,calculateBirth:async birth=>{
        if(!valid())throw Error('Input changed');
        return calculate(birth);
      }});
      if (!valid()) { if(token===generation)notice='Wa input changed'; return; }
      if(prepared.status!=='ready'){
        notice='Analysis unavailable';
        errorText=prepared.issues.map(issue=>`${nameOf(snapshot.members.find(member=>member.memberId===issue.memberId))}: ${t(({CHART_CALCULATION_FAILED:'Chart calculation failed',INVALID_PROVIDER_RESULT:'Invalid chart provider result',MISSING_PERSON_REFERENCE:'Missing reference',PERSON_LOOKUP_FAILED:'Missing reference'})[issue.code]||'Missing assigned data')}`).join(' · ');
        return;
      }
      const output=await analyze(snapshot,prepared.members,{includeGroupCommunication:true});
      if (!valid()) { if(token===generation)notice='Wa input changed'; return; }
      if (output?.status !== 'ready') { notice='Missing assigned data'; return; }
      const ready={snapshot,layout,result:output}; previousReady=currentReady || previousReady;
      comparison=compare(previousReady,ready); result=output; currentReady=ready;
    } catch(error) { if(token===generation){notice='Analysis unavailable';errorText=error?.message || t('Chart calculation failed');result=null;} }
    finally { if(token===generation&&!disposed){busy=false;render();} }
  }
  function preserveReady() { if(currentReady)previousReady=currentReady; }
  function confirmAnnotationChange(body, confirmLabel) {
    return new Promise(resolve=>{
      const opened=openOperationDialog({content:`<section class="modal wa-operation"><header><h2>${text('Manual record changes')}</h2></header>${body}<div class="wa-actions"><button type="button" data-close>${text('Cancel')}</button><button type="button" data-confirm-cleanup>${text(confirmLabel)}</button></div></section>`,onClose:reason=>resolve(reason==='confirm')});
      opened.root.querySelector('[data-confirm-cleanup]').addEventListener('click',()=>opened.close('confirm'));
    });
  }
  function cleanupReport(issues) {
    const groups=[['MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT','Manual communication links'],['ALLY_NOT_PARTICIPANT','Key allies'],['UNKNOWN_METADATA_MEMBER','Powerbase notes']];
    return `<p>${text('Manual references will be removed')}</p>${groups.map(([code,label])=>{
      const matches=issues.filter(issue=>issue.code===code);if(!matches.length)return '';
      return `<h3>${text(label)} · ${matches.length}</h3><ul>${matches.map(issue=>{const annotation=issue.annotation;return `<li>${esc(code==='MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT'?`${nameOf(memberById(annotation.fromMemberId))} → ${nameOf(memberById(annotation.toMemberId))}${annotation.label?` · ${annotation.label}`:''}`:code==='ALLY_NOT_PARTICIPANT'?nameOf(memberById(annotation)):`${nameOf(memberById(annotation.memberId))} · ${annotation.label}`)}</li>`;}).join('')}</ul>`;
    }).join('')}`;
  }
  async function changeMember(memberId, target, remove=false) {
    const inputGeneration=generation;
    const apply=options=>remove?removeWaMember(draft,memberId,options):moveWaMember(draft,memberId,target,options);
    try {const next=apply();preserveReady();draft=next;changed();}
    catch(error){
      if(error?.code!=='ANNOTATION_CLEANUP_REQUIRED')throw error;
      // Keep the underlying select accurate while the shared confirmation owns focus.
      render();
      const confirmed=await confirmAnnotationChange(cleanupReport(error.issues),'Remove affected records and continue');
      if(!confirmed||disposed)return;
      if(inputGeneration!==generation){notice='Wa input changed';render();return;}
      const next=apply({confirmAnnotationCleanup:true});preserveReady();draft=next;changed();
    }
  }
  async function exportRecords(backup=false) {
    const snapshot=clone(draft);
    const data=backup?{schema:'wa-ui-backup-v2',draft:snapshot,saved:snapshot.revision?await repository.exportOrganization(snapshot.organizationId):null}:exportWaAnnotations(snapshot);
    if(disposed)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`wa-${backup?'backup':'annotations'}-${snapshot.organizationId.replace(/[^a-zA-Z0-9_-]/g,'_')}-r${snapshot.revision}.json`;link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function restoreReport(previous) {
    const changedFields=['consultation','manualCommunicationEdges','manualMetadata'].filter(key=>JSON.stringify(draft[key])!==JSON.stringify(previous[key])&&draft[key]!==undefined);
    if(!changedFields.length)return '';
    const record=draft.consultation;
    return `<p>${text('Restore annotation warning')}</p><ul>${changedFields.includes('consultation')?`<li>${text('Consultation')}: ${['specificProblem','personalManagementNotes','communicationPlan'].filter(key=>record[key]).length} · ${text('Business areas')}: ${record.businessAreas?.length||0} · ${text('Gap intentions')}: ${record.gapIntents?.length||0} · ${text('Key allies')}: ${(record.keyAllyIds||[]).map(id=>esc(nameOf(memberById(id)))).join(', ')||'0'}</li>`:''}${changedFields.includes('manualCommunicationEdges')?`<li>${text('Manual communication links')}: ${draft.manualCommunicationEdges.length}<ul>${draft.manualCommunicationEdges.map(edge=>`<li>${esc(nameOf(memberById(edge.fromMemberId)))} → ${esc(nameOf(memberById(edge.toMemberId)))}</li>`).join('')}</ul></li>`:''}${changedFields.includes('manualMetadata')?`<li>${text('Powerbase notes')}: ${draft.manualMetadata.powerBases?.length||0}</li>`:''}</ul>${!previous.consultation&&!previous.manualCommunicationEdges?`<p>${text('Revision has no v2 annotations')}</p>`:''}`;
  }
  async function save(asNew=false) {
    if(saving)return; const token=++saveGeneration, capturedGeneration=generation;
    const snapshot=clone(draft);
    if(asNew)Object.assign(snapshot,{organizationId:createUuid(),revision:0,revisionId:null,parentRevisionId:null,savedAt:null});
    saving=true;notice='';render();
    try {
      const saved=await repository.save(snapshot,{expectedRevision:asNew?0:snapshot.revision});
      if(disposed||token!==saveGeneration)return;
      if(capturedGeneration===generation){if(asNew){clearAnalysis();previousReady=null;comparison=[];}draft=clone(saved);dirty=false;} else if(!asNew && draft.organizationId===snapshot.organizationId) { for(const key of ['revision','revisionId','parentRevisionId','savedAt'])draft[key]=saved[key]; }
      notice='Wa saved';
    }catch(error){if(token===saveGeneration&&!disposed)failure(error);}finally{if(token===saveGeneration&&!disposed){saving=false;render();}}
  }
  function layer(title, body) {
    closeLayer?.(); const opened=openOperationDialog({content:`<section class="modal wa-operation" aria-label="${text(title)}"><header><h2>${text(title)}</h2><button type="button" data-close aria-label="${text('Close')}">×</button></header>${body}<p class="wa-layer-error" role="alert"></p></section>`,onClose:()=>{if(closeLayer===opened.close)closeLayer=null;}});closeLayer=opened.close;return opened;
  }
  async function savedList() {
    const token=++operation, inputGeneration=generation;
    try { const list=await repository.list(); if(disposed||token!==operation||inputGeneration!==generation)return;
      const {root,close}=layer('Saved organizations',list.length?`<div class="wa-saved-list">${list.map(item=>`<button type="button" data-load="${esc(item.organizationId)}">${esc(item.title || t('Wa organization'))} · r${item.revision}</button>`).join('')}</div>`:`<p>${text('No saved organizations')}</p>`);
      root.addEventListener('click',async event=>{const id=event.target.closest('[data-load]')?.dataset.load;if(!id)return;
        try{if(dirty&&!await confirmOperation(t('Wa discard changes?')))return;const requestGeneration=generation;const loaded=await repository.get(id);if(!loaded||disposed||!root.isConnected||token!==operation||requestGeneration!==generation)return;close();load(loaded);}catch(error){root.querySelector('.wa-layer-error').textContent=error.message;}});
    }catch(error){failure(error);render();}
  }
  async function history() {
    const token=++operation, organizationId=draft.organizationId, requestGeneration=generation;
    try { const versions=await repository.history(organizationId);if(disposed||token!==operation||requestGeneration!==generation||organizationId!==draft.organizationId)return;
      const {root,close}=layer('Revision history',`<p>${text('Wa restore note')}</p>${versions.length?`<div class="wa-saved-list">${versions.map(item=>`<button type="button" data-restore="${esc(item.revisionId)}">${text('Restore revision')} · r${item.revision}<small>${esc(item.title)} · ${esc(item.savedAt)}</small></button>`).join('')}</div>`:`<p>${text('No revision history')}</p>`}`);
      root.addEventListener('click',async event=>{const button=event.target.closest('[data-restore]');if(!button||button.disabled)return;
        try {const inputGeneration=generation;const previous=versions.find(item=>item.revisionId===button.dataset.restore);const report=restoreReport(previous);if(report){if(!await confirmAnnotationChange(report,'Restore with these changes'))return;}else if(dirty&&!await confirmOperation(t('Wa discard changes?')))return;if(disposed||inputGeneration!==generation||organizationId!==draft.organizationId||!root.isConnected)return;const expectedRevision=draft.revision;button.disabled=true;const restored=await repository.restore(organizationId,button.dataset.restore,{expectedRevision});if(disposed||!root.isConnected)return;if(inputGeneration!==generation){if(draft.organizationId===organizationId){for(const key of ['revision','revisionId','parentRevisionId','savedAt'])draft[key]=restored[key];}notice='Wa input changed';close();render();return;}close();load(restored);notice='Wa restored';render();}catch(error){failure(error);root.querySelector('.wa-layer-error').textContent=t(notice);button.disabled=false;}});
    }catch(error){failure(error);render();}
  }
  function load(snapshot) { operation++;closeLayer?.();preserveReady();clearAnalysis();if(snapshot.organizationId!==draft.organizationId)previousReady=null;draft=clone(snapshot);selectedGroup='';dirty=false;notice='';errorText='';render(); }
  async function onClick(event) {
    const button=event.target.closest('button');if(!button||!container.contains(button))return;
    try {
      if(button.dataset.editIntent){editRecord('intent',button.dataset.editIntent);return;}
      if(button.dataset.editEdge){editRecord('edge',button.dataset.editEdge);return;}
      if(button.dataset.removeIntent){preserveReady();const record=consultation();record.gapIntents=record.gapIntents.filter(item=>item.id!==button.dataset.removeIntent);updateConsultation(record);changed();return;}
      if(button.dataset.removeEdge){preserveReady();updateEdges(draft.manualCommunicationEdges.filter(item=>item.edgeId!==button.dataset.removeEdge));changed();return;}
      if(button.dataset.removeArea){preserveReady();const record=consultation();record.businessAreas=record.businessAreas.filter(item=>item.pentaId!==button.dataset.removeArea);updateConsultation(record);changed();return;}
      if(button.dataset.pair){showReading(button.dataset.pair,true,button.dataset.pairScope);return;}
      if(button.dataset.reading){showReading(button.dataset.reading);return;}
      if(button.dataset.remove){await changeMember(button.dataset.remove,null,true);return;}
      switch(button.dataset.action){
        case 'export-annotations':await exportRecords();break;
        case 'export-backup':await exportRecords(true);break;
        case 'add-intent':editRecord('intent');break;
        case 'add-edge':editRecord('edge');break;
        case 'remove-consultation':{const inputGeneration=generation;if(await confirmOperation(t('Delete consultation?'))&&!disposed&&inputGeneration===generation){preserveReady();const base=downgradeWaSnapshot(draft,{confirmAnnotationRemoval:true}).snapshot;draft=Object.hasOwn(draft,'manualCommunicationEdges')?updateWaAnnotations(base,{manualCommunicationEdges:draft.manualCommunicationEdges}):base;changed();}break;}
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
  async function onChange(event) {
    const node=event.target;
    try {
      if(node.matches('[data-group-alpha]')){showGroupAlpha=node.checked;closeReading();render();return;}
      if(node.matches('[data-communication-group]')){selectedGroup=node.value;closeReading();render();return;}
      if(node.matches('[data-ally]')){preserveReady();const record=consultation();record.keyAllyIds=(record.keyAllyIds||[]).filter(id=>id!==node.dataset.ally);if(node.checked)record.keyAllyIds.push(node.dataset.ally);updateConsultation(record);changed();}
      if(node.matches('[data-mode]')){preserveReady();draft.layoutMode=node.value;changed();}
      if(node.matches('[data-alpha]')){if(node.value)await changeMember(node.value,{alpha:true});else if(draft.alphaId)await changeMember(draft.alphaId,null);}
      if(node.matches('[data-assign]'))await changeMember(node.dataset.assign,node.value==='alpha'?{alpha:true}:node.value?{pentaId:node.value}:null);
    }catch(error){failure(error);render();}
  }
  function onInput(event) {
    const node=event.target;
    if(node.matches('[data-manual-field]')){
      preserveReady();const record=consultation(), key=node.dataset.manualField;
      if(node.dataset.area){record.businessAreas ||= [];let area=record.businessAreas.find(item=>item.pentaId===node.dataset.area);if(!area){area={pentaId:node.dataset.area,workScope:'',demand:'',requiredSkills:[]};record.businessAreas.push(area);}area[key]=key==='requiredSkills'?node.value.split('\n'):node.value;}
      else record[key]=node.value;
      updateConsultation(record);changed();
    }
    if(node.matches('[data-title]')){preserveReady();draft.title=node.value;changed();}
    if(node.matches('[data-group-title]')){preserveReady();draft.pentas.find(group=>group.pentaId===node.dataset.groupTitle).title=node.value;changed();}
  }
  container.addEventListener('click',onClick);container.addEventListener('change',onChange);container.addEventListener('input',onInput);
  const unsubscribe=people.subscribe?.(()=>{if(disposed)return;preserveReady();clearAnalysis();notice='Wa input changed';render();});
  render();
  return {render,refreshLanguage(){closeReading();closeLayer?.();render();},dispose(){if(disposed)return;disposed=true;generation++;operation++;saveGeneration++;unsubscribe?.();closeReading();closeLayer?.();detail.remove();container.removeEventListener('click',onClick);container.removeEventListener('change',onChange);container.removeEventListener('input',onInput);container.replaceChildren();}};
}
