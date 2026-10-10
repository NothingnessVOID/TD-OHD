import '../styles/team-direct.css';
import '../styles/team-controls.css';
import './team-messages.js';
import { effectiveTeamBirth } from './team-birth.js';
import { renderPentaPlaceholder } from './penta-placeholder.js';
import { createPentaMatrix } from './penta-matrix.js';
import { pentaDetailAdapter } from '../lib/shared-object-details.js';
import { analyzePentaStructure } from '../lib/human-design/penta-structure.js';
import { computeChart } from '../lib/chartdata.js';
import { listPeople, getPerson, birthFromPerson, onPeopleChange } from '../lib/people.js';
import { openPersonEditor } from '../lib/person-editor.js';
import { openOperationDialog, confirmOperation } from '../lib/operation-dialog.js';
import '../lib/team-selection-messages.js';
import { esc } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { validateBirth } from '../lib/human-design/team-members.js';
import { listTeams, getTeam, saveTeam, deleteTeam } from '../lib/team-repository.js';
import { createUuid } from '../lib/uuid.js';
const $ = id => document.getElementById(id);
const txt = key => esc(t(key));
const freshGroup = () => ({ pentaId: createUuid(), label: 'Penta A', memberIds: [] });
let teamId = null, revision = null, teamName = '', members = [], groups = [], selectedId = null;
let generation = 0, timer, matrix = null, latest = null, dirty = false, closeLayer = null;
const group = () => groups.find(g => g.pentaId === selectedId);
const selectedMembers = () => (group()?.memberIds || []).map(id => members.find(m => m.memberId === id)).filter(Boolean);
const memberName = m => getPerson(m.personId)?.name || m.labelSnapshot;
function status(message = '', personId = null) {
 $('team-flow-status').innerHTML = esc(message) + (personId ? ` <button type="button" data-edit-person="${esc(personId)}">${txt('Edit chart')}</button>` : '');
}
function currentRepository() { return !teamId || getTeam(teamId)?.revision === revision; }
function reset() { teamId = null; revision = null; teamName = ''; members = []; groups = [freshGroup()]; selectedId = groups[0].pentaId; dirty = false; schedule(false); }
function renderControls() {
 const focusId = document.activeElement?.dataset?.focusMember;
 const title = teamName ? `${teamName} / ${group()?.label || 'Penta A'}` : (!teamId && groups.length === 1 && group()?.label === 'Penta A' ? t('Penta temporary') : group()?.label || t('Penta temporary'));
 $('team-current').innerHTML = `<span class="team-current-name">${esc(title)}</span>${dirty ? `<span class="team-dirty-indicator" title="${txt('Penta unsaved changes')}" aria-label="${txt('Penta unsaved changes')}">●</span>` : ''}<span aria-hidden="true">⌄</span>`;
 $('team-current').title = title;
 $('team-save').textContent = t('Save'); $('team-save').classList.toggle('is-dirty', dirty); $('team-manage').ariaLabel = t('Team manage');
 const addButton = $('team-add-saved-person');
 addButton.textContent = t('Team add person'); addButton.removeAttribute('aria-disabled');
 addButton.dataset.full = String(selectedMembers().length >= 5); addButton.title = selectedMembers().length >= 5 ? t('Team five limit') : t('Team add person');
 $('team-member-caption').textContent = `${t('Penta current members')} · ${selectedMembers().length}/5`;
 $('team-selected-chips').innerHTML = selectedMembers().map((m,i) => `<span class="team-person-chip penta-member-${i+1}"><button type="button" data-focus-member="${esc(m.memberId)}" aria-pressed="${matrix?.highlightedMemberId === m.memberId}" title="${esc(memberName(m))}"><b class="penta-member-tag">${i+1}</b><span class="team-chip-name">${esc(memberName(m))}</span>${getPerson(m.personId)?.timeUnknown ? `<small title="${txt('Team estimated time')}">≈</small>` : ''}</button><button type="button" data-remove-member="${esc(m.memberId)}" aria-label="${txt('Remove')} ${esc(memberName(m))}">×</button></span>`).join('');
 $('team-selected-chips').append(addButton);
 if (focusId) [...$('team-selected-chips').querySelectorAll('[data-focus-member]')].find(button => button.dataset.focusMember === focusId)?.focus({ preventScroll:true });
}
function placeholder(error = false) {
 matrix?.dispose(); matrix = null; latest = null;
 renderPentaPlaceholder($('team-content'), { error });
 $('team-analysis').innerHTML = `<section class="panel penta-reading-section penta-empty-guide"><h2>${txt('Penta reading title')}</h2><p>${txt(error ? 'Penta repair guide' : 'Penta empty guide')}</p></section>`;
}
function schedule(markDirty = true) {
 if (markDirty) dirty = true;
 generation++; clearTimeout(timer); matrix?.closeDetail?.(); renderControls();
 const count = selectedMembers().length;
 $('team-content').setAttribute('aria-busy', String(count >= 3));
 $('team-content').inert = count >= 3;
 $('team-analysis').setAttribute('aria-busy', String(count >= 3));
 if (count < 3) { $('team-analysis').inert = false; $('team-analysis').style.opacity = ''; placeholder(); status(); $('team-content').setAttribute('aria-busy','false'); return; }
 // Keep the previous scene readable but non-interactive, with an explicit updating state.
 $('team-analysis').inert = true; $('team-analysis').style.opacity = '.55';
 status(t('Calculating…')); timer = setTimeout(analyze, 160);
}
async function analyze() {
 const token = generation, pentaId = selectedId;
 let problemPerson = null;
 try {
  if (!currentRepository()) throw new Error(t('Team revision changed; reload before saving.'));
  const candidates = selectedMembers().map(m => {
   problemPerson = m.personId;
   const person = getPerson(m.personId);
   if (!person) throw new Error(`${memberName(m)}: ${t('Missing reference')}`);
   const birth = effectiveTeamBirth({ ...person, timezone: person.location?.timezone });
   if (!birth.birthTime) throw new Error(`${person.name}: ${t('Missing birth time.')}`);
   if (birth.timezone == null) throw new Error(`${person.name}: ${t('Missing timezone.')}`);
   if (!validateBirth({ ...birth, timeUnknown: false })) throw new Error(`${person.name}: ${t('Birth details need correction: {names}', { names: person.name })}`);
   return { memberId: m.memberId, personId: person.id, displayName: person.name, timeUnknown: !!person.timeUnknown, estimatedTime: person.timeUnknown ? '12:00' : null, snapshot: JSON.stringify(person), birth: effectiveTeamBirth(birthFromPerson(person)) };
  });
  const valid = () => token === generation && pentaId === selectedId && currentRepository() && candidates.every(p => JSON.stringify(getPerson(p.personId)) === p.snapshot);
  const charts = [];
  for (const p of candidates) { problemPerson = p.personId; const data = await computeChart(p.birth); if (!valid()) return; charts.push({ memberId: p.memberId, chart: data.chart }); }
  const result = analyzePentaStructure(charts); if (!valid()) return;
  latest = { result, people: candidates, groupLabel: group().label }; renderResult(); status();
 } catch (error) { if (token === generation) { placeholder(true); status(error.message, getPerson(problemPerson) ? problemPerson : null); } }
 finally { if (token === generation) { $('team-content').setAttribute('aria-busy','false'); $('team-content').inert = false; $('team-analysis').inert = false; $('team-analysis').setAttribute('aria-busy','false'); $('team-analysis').style.opacity = ''; } }
}
function renderResult() {
 if (!latest) return;
 const scroll = document.querySelector('.team-results').scrollTop, selection = matrix?.selection || null, highlighted = matrix?.highlightedMemberId || null;
 matrix?.dispose(); $('team-content').replaceChildren(); $('team-analysis').replaceChildren();
 matrix = createPentaMatrix($('team-content'), { ...latest, analysisContainer: $('team-analysis'), detailAdapter: pentaDetailAdapter, initialSelection: selection, onMemberFocusChange: renderControls });
 if (highlighted) matrix.setHighlightedMemberId(highlighted);
 document.querySelector('.team-results').scrollTop = scroll; renderControls();
}
function layer(title, body, bind) {
 closeLayer?.();
 const { root, close } = openOperationDialog({ content: `<section class="modal team-control-dialog" aria-label="${txt(title)}"><header><h3 class="modal-title">${txt(title)}</h3><button type="button" data-close aria-label="${txt('Close')}">×</button></header>${body}<p class="team-layer-error" role="alert"></p></section>`, onClose: () => { if (closeLayer === close) closeLayer = null; } });
 closeLayer = close; bind(root, close); return root;
}
function editPerson(id = null) {
 const person = id ? getPerson(id) : null;
 if (id && !person) { status(t('Missing reference')); return; }
 closeLayer?.(); $('team-add-saved-person').focus();
 openPersonEditor(person ? { ...person, ...birthFromPerson(person), createdAt: person.createdAt } : {}, { create: !person, onSaved: saved => { if (!id) picker({ ids:[...selectedMembers().map(m => m.personId), saved.id].slice(0,5), search:'', pentaId:selectedId, revision, teamId }); else schedule(false); } });
}
function picker(draft = null) {
 draft ||= { ids: selectedMembers().map(m => m.personId), search: '', pentaId: selectedId, revision, teamId };
 layer('Team add person', `<input id="team-person-search" type="search" placeholder="${txt('Team search people')}" aria-label="${txt('Team search people')}"><p id="team-selection-count" role="status"></p><button type="button" id="team-person-create">${txt('Team create person')}</button><div id="team-person-results"></div><div class="modal-actions"><button type="button" data-close>${txt('Cancel')}</button><button type="button" id="team-selection-confirm" class="btn-primary">${txt('Confirm')}</button></div>`, (root, close) => {
  const search = root.querySelector('input'); search.value = draft.search;
  const error = message => { root.querySelector('.team-layer-error').textContent = message; };
  const render = () => {
   root.querySelector('#team-selection-count').textContent = t('Team selected count', { count: draft.ids.length });
   root.querySelector('#team-person-results').innerHTML = listPeople().filter(p => `${p.name} ${p.birthDate} ${p.id}`.toLowerCase().includes(draft.search.toLowerCase())).map(p => `<div class="team-picker-row"><button type="button" data-add-person="${esc(p.id)}" aria-pressed="${draft.ids.includes(p.id)}" ${draft.ids.length >= 5 && !draft.ids.includes(p.id) ? 'disabled' : ''}><strong>${esc(p.name)}</strong><small>${esc(p.birthDate)} · ${esc(p.timeUnknown ? t('Team estimated time') : p.birthTime)} · ${esc(p.id.slice(-6))}</small></button><button type="button" data-edit-person="${esc(p.id)}">${txt('Edit chart')}</button></div>`).join('');
  };
  const editor = id => {
   const person = id ? getPerson(id) : null; close();
   openPersonEditor(person ? { ...person, ...birthFromPerson(person) } : {}, { create: !person, onCancel: () => picker(draft), onSaved: saved => { if (!id && draft.ids.length < 5) draft.ids.push(saved.id); picker(draft); } });
  };
  search.oninput = () => { draft.search = search.value; render(); }; render(); search.focus();
  root.querySelector('#team-person-create').onclick = () => editor();
  root.addEventListener('click', e => { const b = e.target.closest('button'); if (b?.dataset.addPerson) { const id = b.dataset.addPerson; draft.ids = draft.ids.includes(id) ? draft.ids.filter(v => v !== id) : [...draft.ids, id].slice(0,5); render(); root.querySelector(`[data-add-person="${CSS.escape(id)}"]`)?.focus(); } if (b?.dataset.editPerson) editor(b.dataset.editPerson); });
  root.querySelector('#team-selection-confirm').onclick = async () => {
   const valid = () => currentRepository() && draft.teamId === teamId && draft.revision === revision && draft.pentaId === selectedId;
   if (!valid()) { error(t('Team revision changed; reload before saving.')); return; }
   const nextMembers = members.map(m => ({...m})), nextGroups = groups.map(g => ({...g, memberIds:[...g.memberIds]}));
   const ids = [], moves = [];
   for (const id of draft.ids) {
    const person = getPerson(id); if (!person) { error(t('Missing reference')); return; }
    let member = nextMembers.find(m => m.personId === id);
    if (!member) { member = { memberId:createUuid(), personId:id, labelSnapshot:person.name }; nextMembers.push(member); }
    const other = nextGroups.find(g => g.pentaId !== selectedId && g.memberIds.includes(member.memberId));
    if (other) { moves.push(t('Team move person', {name:person.name, group:other.label})); other.memberIds = other.memberIds.filter(v => v !== member.memberId); }
    ids.push(member.memberId);
   }
   if (moves.length && !await confirmOperation(moves.join('\n'))) return;
   if (!root.isConnected) return;
   if (!valid()) { error(t('Team revision changed; reload before saving.')); return; }
   if (draft.ids.some(id => !getPerson(id))) { error(t('Missing reference')); return; }
   nextGroups.find(g => g.pentaId === selectedId).memberIds = ids;
   members = nextMembers; groups = nextGroups; close(); schedule();
  };
 });
}
function load(team, pentaId) { teamId = team.teamId; revision = team.revision; teamName = team.name; members = team.members.map(m => ({ ...m })); groups = team.groups.map(g => ({ ...g, memberIds: [...g.memberIds] })); if (!groups.length) groups.push(freshGroup()); selectedId = pentaId || groups[0].pentaId; dirty = false; schedule(false); }
function switcher() {
 layer('Team / Penta', `<button type="button" id="team-temporary">${txt('Team temporary')}</button><button type="button" id="team-new-group">${txt('New Penta')}</button><div>${groups.map(g => `<button type="button" data-local-group="${esc(g.pentaId)}">${esc(teamName || t('Team temporary'))} / ${esc(g.label)}</button>`).join('')}</div><hr>${listTeams().map(team => `<section><strong>${esc(team.name)}</strong>${team.groups.map(g => `<button type="button" data-team="${esc(team.teamId)}" data-group="${esc(g.pentaId)}">${esc(g.label)}</button>`).join('') || `<button type="button" data-team="${esc(team.teamId)}">${txt('Open')}</button>`}</section>`).join('')}`, (root, close) => {
  root.querySelector('#team-temporary').onclick = async () => { if (!dirty || await confirmOperation(t('Discard unsaved team changes?'))) { close(); reset(); } };
  root.querySelector('#team-new-group').onclick = () => {
   layer('New Penta', `<form><label>${txt('Penta name')}<input name="group" value="Penta ${String.fromCharCode(65+groups.length)}" required></label><div class="modal-actions"><button type="button" data-close>${txt('Cancel')}</button><button type="submit">${txt('Confirm')}</button></div></form>`, (dialog, done) => {
    dialog.querySelector('form').onsubmit = event => { event.preventDefault(); const label = dialog.querySelector('input').value.trim(); if (!label) return; const g = freshGroup(); g.label = label; groups.push(g); selectedId = g.pentaId; done(); schedule(); };
   });
  };
  root.onclick = async event => { const b = event.target.closest('button'); if (b?.dataset.localGroup) { selectedId = b.dataset.localGroup; close(); schedule(false); } else if (b?.dataset.team && (!dirty || await confirmOperation(t('Discard unsaved team changes?')))) { const team = getTeam(b.dataset.team); close(); load(team, b.dataset.group); } };
 });
}
function saveDialog() {
 const snapshotTeams = listTeams();
 layer('Save team', `<form id="team-save-form"><label>${txt('Saved teams')}<select id="team-save-target"><option value="">${txt('New team')}</option>${snapshotTeams.map(team => `<option value="${esc(team.teamId)}" ${team.teamId === teamId ? 'selected' : ''}>${esc(team.name)}</option>`).join('')}</select></label><label>${txt('Team name')}<input id="team-save-name" value="${esc(teamName)}"></label><label>${txt('Penta name')}<input id="team-save-group" value="${esc(group().label)}" required></label><button type="submit">${txt('Save')}</button></form>`, (root, close) => {
  const target = root.querySelector('#team-save-target'), name = root.querySelector('#team-save-name');
  const update = () => { name.required = !target.value; name.disabled = !!target.value; }; target.onchange = update; update();
  root.querySelector('form').onsubmit = async event => { event.preventDefault(); try {
   if (!currentRepository()) throw Error(t('Team revision changed; reload before saving.'));
   const destination = snapshotTeams.find(team => team.teamId === target.value);
   let nextMembers = members.map(m => ({ memberId:m.memberId, personId:m.personId, labelSnapshot:memberName(m) }));
   let nextGroups = groups.map(g => ({ ...g, memberIds:[...g.memberIds] })); let savedGroupId = selectedId;
   nextGroups.find(g => g.pentaId === selectedId).label = root.querySelector('#team-save-group').value.trim();
   if (destination && destination.teamId !== teamId) {
    nextMembers = destination.members.map(m => ({...m})); nextGroups = destination.groups.map(g => ({...g, memberIds:[...g.memberIds]}));
    const ids = [];
    for (const source of selectedMembers()) {
     let member = nextMembers.find(m => m.personId === source.personId);
     if (!member) { member = { memberId: source.memberId, personId:source.personId, labelSnapshot:memberName(source) }; nextMembers.push(member); }
     const assigned = nextGroups.find(g => g.memberIds.includes(member.memberId));
     if (assigned && !await confirmOperation(t('Team move person', { name:memberName(source), group:assigned.label }))) return;
     if (assigned) assigned.memberIds = assigned.memberIds.filter(id => id !== member.memberId);
     ids.push(member.memberId);
    }
    if (nextGroups.some(g => g.pentaId === savedGroupId)) savedGroupId = createUuid();
    nextGroups.push({ pentaId:savedGroupId, label:root.querySelector('#team-save-group').value.trim(), memberIds:ids });
   }
   if (!currentRepository()) throw Error(t('Team revision changed; reload before saving.'));
   const saved = saveTeam({ ...(destination ? {teamId:destination.teamId, revision:destination.teamId === teamId ? revision : destination.revision} : {}), name:destination?.teamId === teamId ? teamName : destination?.name || name.value.trim(), members:nextMembers, groups:nextGroups });
   close(); load(saved, savedGroupId); status(t('Team saved.'));
  } catch(error) { root.querySelector('.team-layer-error').textContent = error.message; } };
 });
}
function manage() {
 layer('Team manage', `<form><label>${txt('Team name')}<input name="team" value="${esc(teamName)}"></label><label>${txt('Penta name')}<input name="group" value="${esc(group().label)}" required></label><button type="submit">${txt('Save')}</button></form><button id="team-delete-group">${txt('Delete Penta')}</button><button id="team-delete-team" ${!teamId?'disabled':''}>${txt('Delete team')}</button><h4>${txt('Team members')}</h4>${members.map(m => `<div class="team-picker-row"><span>${esc(memberName(m))} · ${esc(groups.find(g => g.memberIds.includes(m.memberId))?.label || t('Ungrouped'))}</span><button data-assign="${esc(m.personId)}">${txt('Add to current Penta')}</button><button data-pool-remove="${esc(m.memberId)}">${txt('Remove from team')}</button></div>`).join('')}`, (root, close) => {
  root.querySelector('form').onsubmit = event => { event.preventDefault(); teamName = root.querySelector('[name=team]').value.trim(); group().label = root.querySelector('[name=group]').value.trim(); dirty = true; close(); renderControls(); saveDialog(); };
  root.querySelector('#team-delete-group').onclick = async () => { if (!await confirmOperation(t('Delete Penta'))) return; groups = groups.filter(g => g.pentaId !== selectedId); if (!groups.length) groups.push(freshGroup()); selectedId = groups[0].pentaId; close(); schedule(); };
  root.querySelector('#team-delete-team').onclick = async () => { if (!await confirmOperation(t('Delete this saved team?'))) return; try { if (!currentRepository()) throw Error(t('Team revision changed; reload before saving.')); deleteTeam(teamId); close(); reset(); } catch(e) { root.querySelector('.team-layer-error').textContent=e.message; } };
  root.addEventListener('click', async event => { const b = event.target.closest('button'); if (b?.dataset.assign) { const ids = selectedMembers().map(m => m.personId); if (!ids.includes(b.dataset.assign) && ids.length < 5) ids.push(b.dataset.assign); picker({ids, search:'', pentaId:selectedId, revision, teamId}); } if (b?.dataset.poolRemove) { const id=b.dataset.poolRemove; members=members.filter(m=>m.memberId!==id); groups.forEach(g=>g.memberIds=g.memberIds.filter(v=>v!==id)); close(); schedule(); } });
 });
}
export function setupTeamView() {
 const subtitle = document.querySelector('#team-view .view-subtitle');
 subtitle.removeAttribute('data-i18n'); subtitle.textContent = t('Team members and Penta structure');
 const previousContent = $('team-content');
 if (previousContent && !$('team-form').contains(previousContent)) previousContent.remove();
 $('team-form').innerHTML = `<div class="team-workspace"><div class="team-management"><div class="team-current-toolbar"><button type="button" id="team-current"></button><button type="button" id="team-save">${txt('Save')}</button><button type="button" id="team-manage" aria-label="${txt('Team manage')}">…</button></div><div id="team-member-caption" class="team-member-caption"></div><div id="team-selected-chips"></div><button type="button" id="team-add-saved-person">${txt('Team add person')}</button><p id="team-flow-status" role="status" aria-live="polite"></p><div id="team-content"></div></div><div class="team-results"><div id="team-analysis"></div></div></div>`;
 $('team-current').onclick = switcher; $('team-save').onclick = saveDialog; $('team-manage').onclick = manage; $('team-add-saved-person').onclick = () => picker();
 $('team-selected-chips').onclick = event => { const b = event.target.closest('button'); if(b?.dataset.removeMember) { group().memberIds=group().memberIds.filter(id=>id!==b.dataset.removeMember); schedule(); $('team-add-saved-person').focus(); } if(b?.dataset.focusMember && matrix) { matrix.setHighlightedMemberId(matrix.highlightedMemberId===b.dataset.focusMember?null:b.dataset.focusMember); } };
 $('team-flow-status').onclick = event => { const id=event.target.closest('button')?.dataset.editPerson; if(id) editPerson(id); };
 onPeopleChange(() => schedule(false));
 window.addEventListener('storage', event => { if(event.key === null || event.key === 'ohd-teams-v1') schedule(false); });
 reset();
}
export function renderTeamView() { if ($('team-current')) schedule(false); }
export function refreshTeamLanguage() { closeLayer?.(); if (!$('team-current')) return; document.querySelector('#team-view .view-subtitle').textContent = t('Team members and Penta structure'); renderControls(); if(latest) renderResult(); else schedule(false); }
