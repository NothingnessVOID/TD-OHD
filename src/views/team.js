import '../styles/team-members.css';
import '../styles/team-visual-polish.css';
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
 $('team-analysis').innerHTML = `<section class="penta-reading-section penta-empty-guide"><h2>${txt('Penta reading title')}</h2><p>${txt(error ? 'Penta repair guide' : 'Penta empty guide')}</p></section>`;
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
 closeLayer?.(); const trigger = document.activeElement;
 const dialog = document.createElement('dialog'); dialog.className = 'team-control-dialog';
 dialog.innerHTML = `<header><h3>${txt(title)}</h3><button type="button" data-close aria-label="${txt('Close')}">×</button></header>${body}<p class="team-layer-error" role="alert"></p>`;
 document.body.append(dialog);
 const close = () => { dialog.close(); dialog.remove(); if (closeLayer === close) closeLayer = null; if (trigger?.isConnected) trigger.focus(); };
 closeLayer = close; dialog.querySelector('[data-close]').onclick = close;
 dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
 dialog.showModal(); bind(dialog, close); return dialog;
}
function editPerson(id = null) {
 const person = id ? getPerson(id) : null;
 if (id && !person) { status(t('Missing reference')); return; }
 closeLayer?.(); $('team-add-saved-person').focus();
 openPersonEditor(person ? { ...person, ...birthFromPerson(person), createdAt: person.createdAt } : {}, { create: !person, onSaved: saved => { if (!id) addPerson(saved.id); else schedule(false); } });
}
function addPerson(id) {
 if (group().memberIds.length >= 5) { status(t('Team five limit')); return false; }
 let m = members.find(m => m.personId === id);
 if (m && group().memberIds.includes(m.memberId)) return false;
 const other = m && groups.find(g => g.memberIds.includes(m.memberId));
 if (other && !window.confirm(t('Team move person', { name: memberName(m), group: other.label }))) return false;
 if (!m) { const p = getPerson(id); if (!p) return false; m = { memberId: createUuid(), personId: id, labelSnapshot: p.name }; members.push(m); }
 if (other) other.memberIds = other.memberIds.filter(value => value !== m.memberId);
 group().memberIds.push(m.memberId); schedule(); return true;
}
function picker() {
 if (group().memberIds.length >= 5) { status(t('Team five limit')); return; }
 layer('Team add person', `<input id="team-person-search" type="search" placeholder="${txt('Team search people')}" aria-label="${txt('Team search people')}"><button type="button" id="team-person-create">${txt('Team create person')}</button><div id="team-person-results"></div>`, (root, close) => {
  const search = root.querySelector('input');
  const render = () => { root.querySelector('#team-person-results').innerHTML = listPeople().filter(p => `${p.name} ${p.birthDate} ${p.id}`.toLowerCase().includes(search.value.toLowerCase())).map(p => `<div class="team-picker-row"><button type="button" data-add-person="${esc(p.id)}" ${selectedMembers().some(m => m.personId === p.id) ? 'disabled' : ''}><strong>${esc(p.name)}</strong><small>${esc(p.birthDate)} · ${esc(p.timeUnknown ? t('Team estimated time') : p.birthTime)} · ${esc(p.location?.name || '')} · ${esc(p.id.slice(-6))}</small></button><button type="button" data-edit-person="${esc(p.id)}">${txt('Edit chart')}</button></div>`).join(''); };
  search.oninput = render; render(); search.focus();
  root.querySelector('#team-person-create').onclick = () => editPerson();
  root.addEventListener('click', e => { const b = e.target.closest('button'); if (b?.dataset.addPerson && addPerson(b.dataset.addPerson)) close(); if (b?.dataset.editPerson) editPerson(b.dataset.editPerson); });
 });
}
function load(team, pentaId) { teamId = team.teamId; revision = team.revision; teamName = team.name; members = team.members.map(m => ({ ...m })); groups = team.groups.map(g => ({ ...g, memberIds: [...g.memberIds] })); if (!groups.length) groups.push(freshGroup()); selectedId = pentaId || groups[0].pentaId; dirty = false; schedule(false); }
function switcher() {
 layer('Team / Penta', `<button type="button" id="team-temporary">${txt('Team temporary')}</button><button type="button" id="team-new-group">${txt('New Penta')}</button><div>${groups.map(g => `<button type="button" data-local-group="${esc(g.pentaId)}">${esc(teamName || t('Team temporary'))} / ${esc(g.label)}</button>`).join('')}</div><hr>${listTeams().map(team => `<section><strong>${esc(team.name)}</strong>${team.groups.map(g => `<button type="button" data-team="${esc(team.teamId)}" data-group="${esc(g.pentaId)}">${esc(g.label)}</button>`).join('') || `<button type="button" data-team="${esc(team.teamId)}">${txt('Open')}</button>`}</section>`).join('')}`, (root, close) => {
  root.querySelector('#team-temporary').onclick = () => { if (!dirty || confirm(t('Discard unsaved team changes?'))) { close(); reset(); } };
  root.querySelector('#team-new-group').onclick = () => { const g = freshGroup(); g.label = `Penta ${String.fromCharCode(65+groups.length)}`; groups.push(g); selectedId = g.pentaId; close(); schedule(); };
  root.onclick = event => { const b = event.target.closest('button'); if (b?.dataset.localGroup) { selectedId = b.dataset.localGroup; close(); schedule(false); } else if (b?.dataset.team && (!dirty || confirm(t('Discard unsaved team changes?')))) { const team = getTeam(b.dataset.team); close(); load(team, b.dataset.group); } };
 });
}
function saveDialog() {
 const snapshotTeams = listTeams();
 layer('Save team', `<form id="team-save-form"><label>${txt('Saved teams')}<select id="team-save-target"><option value="">${txt('New team')}</option>${snapshotTeams.map(team => `<option value="${esc(team.teamId)}" ${team.teamId === teamId ? 'selected' : ''}>${esc(team.name)}</option>`).join('')}</select></label><label>${txt('Team name')}<input id="team-save-name" value="${esc(teamName)}"></label><label>${txt('Penta name')}<input id="team-save-group" value="${esc(group().label)}" required></label><button type="submit">${txt('Save')}</button></form>`, (root, close) => {
  const target = root.querySelector('#team-save-target'), name = root.querySelector('#team-save-name');
  const update = () => { name.required = !target.value; name.disabled = !!target.value; }; target.onchange = update; update();
  root.querySelector('form').onsubmit = event => { event.preventDefault(); try {
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
     if (assigned && !confirm(t('Team move person', { name:memberName(source), group:assigned.label }))) return;
     if (assigned) assigned.memberIds = assigned.memberIds.filter(id => id !== member.memberId);
     ids.push(member.memberId);
    }
    if (nextGroups.some(g => g.pentaId === savedGroupId)) savedGroupId = createUuid();
    nextGroups.push({ pentaId:savedGroupId, label:root.querySelector('#team-save-group').value.trim(), memberIds:ids });
   }
   const saved = saveTeam({ ...(destination ? {teamId:destination.teamId, revision:destination.teamId === teamId ? revision : destination.revision} : {}), name:destination?.teamId === teamId ? teamName : destination?.name || name.value.trim(), members:nextMembers, groups:nextGroups });
   close(); load(saved, savedGroupId); status(t('Team saved.'));
  } catch(error) { root.querySelector('.team-layer-error').textContent = error.message; } };
 });
}
function manage() {
 layer('Team manage', `<form><label>${txt('Team name')}<input name="team" value="${esc(teamName)}"></label><label>${txt('Penta name')}<input name="group" value="${esc(group().label)}" required></label><button type="submit">${txt('Save')}</button></form><button id="team-delete-group">${txt('Delete Penta')}</button><button id="team-delete-team" ${!teamId?'disabled':''}>${txt('Delete team')}</button><h4>${txt('Team members')}</h4>${members.map(m => `<div class="team-picker-row"><span>${esc(memberName(m))} · ${esc(groups.find(g => g.memberIds.includes(m.memberId))?.label || t('Ungrouped'))}</span><button data-assign="${esc(m.personId)}">${txt('Add to current Penta')}</button><button data-pool-remove="${esc(m.memberId)}">${txt('Remove from team')}</button></div>`).join('')}`, (root, close) => {
  root.querySelector('form').onsubmit = event => { event.preventDefault(); teamName = root.querySelector('[name=team]').value.trim(); group().label = root.querySelector('[name=group]').value.trim(); dirty = true; close(); renderControls(); saveDialog(); };
  root.querySelector('#team-delete-group').onclick = () => { if (!confirm(t('Delete Penta'))) return; groups = groups.filter(g => g.pentaId !== selectedId); if (!groups.length) groups.push(freshGroup()); selectedId = groups[0].pentaId; close(); schedule(); };
  root.querySelector('#team-delete-team').onclick = () => { if (!confirm(t('Delete this saved team?'))) return; try { if (!currentRepository()) throw Error(t('Team revision changed; reload before saving.')); deleteTeam(teamId); close(); reset(); } catch(e) { root.querySelector('.team-layer-error').textContent=e.message; } };
  root.addEventListener('click', event => { const b = event.target.closest('button'); if (b?.dataset.assign) { if(addPerson(b.dataset.assign)) close(); } if (b?.dataset.poolRemove) { const id=b.dataset.poolRemove; members=members.filter(m=>m.memberId!==id); groups.forEach(g=>g.memberIds=g.memberIds.filter(v=>v!==id)); close(); schedule(); } });
 });
}
export function setupTeamView() {
 const subtitle = document.querySelector('#team-view .view-subtitle');
 subtitle.removeAttribute('data-i18n'); subtitle.textContent = t('Team members and Penta structure');
 const previousContent = $('team-content');
 if (previousContent && !$('team-form').contains(previousContent)) previousContent.remove();
 $('team-form').innerHTML = `<div class="team-workspace"><div class="team-management"><div class="team-current-toolbar"><button type="button" id="team-current"></button><button type="button" id="team-save">${txt('Save')}</button><button type="button" id="team-manage" aria-label="${txt('Team manage')}">…</button></div><div id="team-member-caption" class="team-member-caption"></div><div id="team-selected-chips"></div><button type="button" id="team-add-saved-person">${txt('Team add person')}</button><p id="team-flow-status" role="status" aria-live="polite"></p><div id="team-content"></div></div><div class="team-results"><div id="team-analysis"></div></div></div>`;
 $('team-current').onclick = switcher; $('team-save').onclick = saveDialog; $('team-manage').onclick = manage; $('team-add-saved-person').onclick = picker;
 $('team-selected-chips').onclick = event => { const b = event.target.closest('button'); if(b?.dataset.removeMember) { group().memberIds=group().memberIds.filter(id=>id!==b.dataset.removeMember); schedule(); $('team-add-saved-person').focus(); } if(b?.dataset.focusMember && matrix) { matrix.setHighlightedMemberId(matrix.highlightedMemberId===b.dataset.focusMember?null:b.dataset.focusMember); } };
 $('team-flow-status').onclick = event => { const id=event.target.closest('button')?.dataset.editPerson; if(id) editPerson(id); };
 onPeopleChange(() => schedule(false));
 window.addEventListener('storage', event => { if(event.key === null || event.key === 'ohd-teams-v1') schedule(false); });
 reset();
}
export function renderTeamView() { if ($('team-current')) schedule(false); }
export function refreshTeamLanguage() { closeLayer?.(); if (!$('team-current')) return; document.querySelector('#team-view .view-subtitle').textContent = t('Team members and Penta structure'); renderControls(); if(latest) renderResult(); else schedule(false); }
