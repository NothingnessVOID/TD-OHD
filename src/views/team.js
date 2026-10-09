import '../styles/team-members.css';
import { analyzePentaStructure } from '../lib/human-design/penta-structure.js';
import { computeChart } from '../lib/chartdata.js';
import { listPeople, getPerson, savePerson, birthFromPerson } from '../lib/people.js';
import { createPlaceSearch } from '../lib/placesearch.js';
import { esc } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { createMember, validateBirth } from '../lib/human-design/team-members.js';
import { listTeams, getTeam, saveTeam, deleteTeam } from '../lib/team-repository.js';

let teamId = null;
let teamRevision = null;
let members = [];
let groups = [];
let selectedPentaId = null;
let quickRows = [];
let generation = 0;
let pending = false;
let latest = null;
const $ = id => document.getElementById(id);
const text = (key, params) => esc(t(key, params));
const errorText = error => esc(error?.message || t('Unable to complete the operation.'));
const name = () => $('team-name').value.trim();
const selectedGroup = () => groups.find(group => group.pentaId === selectedPentaId);
const allMembers = () => [...members, ...quickRows.filter(rowHasData).map(row => ({ memberId: row._memberId, personId: null, displayName: row.querySelector('.team-name').value.trim() || t('Unnamed member'), origin: 'quick' }))];
function rowHasData(row) { return !!(row.querySelector('.team-name').value.trim() || row.querySelector('.team-date').value || row.querySelector('.team-time').value || row._placeSearch?.hasInput() || row.querySelector('.ps-input')?.value.trim()); }
function memberName(member) { return member.personId ? (getPerson(member.personId)?.name || member.labelSnapshot || member.displayName || t('Missing reference')) : member.displayName; }
function message(key, params) { $('team-content').innerHTML = `<p class="team-message" role="status">${text(key, params)}</p>`; }
function failure(error) { $('team-content').innerHTML = `<p class="team-message" role="alert">${errorText(error)}</p>`; }
function changed() { generation++; pending = false; $('team-calculate').disabled = false; latest = null; $('team-content').replaceChildren(); updateCounts(); }
function updateCounts() {
  if ($('team-count')) $('team-count').textContent = t('Team members: {count}', { count: allMembers().length });
  if ($('team-group-count')) $('team-group-count').textContent = t('Group members: {count} / 5', { count: selectedGroup()?.memberIds.length || 0 });
}
function refreshToolbar() {
  const select = $('team-list');
  try {
    select.innerHTML = `<option value="">${text('Choose a saved team')}</option>` + listTeams().map(team => `<option value="${esc(team.teamId)}">${esc(team.name)}</option>`).join('');
    select.value = teamId || '';
  } catch (error) { failure(error); }
}
function renderGroups() {
  const picker = $('team-group-list');
  if (!picker) return;
  picker.innerHTML = `<option value="">${text('Select Penta')}</option>` + groups.map(group => `<option value="${esc(group.pentaId)}">${esc(group.label)}</option>`).join('');
  picker.value = selectedPentaId || '';
  $('team-group-name').value = selectedGroup()?.label || '';
  $('team-group-name').disabled = !selectedGroup();
  const group = selectedGroup();
  $('team-group-members').innerHTML = group ? group.memberIds.map(id => {
    const member = allMembers().find(item => item.memberId === id);
    return `<div class="team-group-member" data-member-id="${esc(id)}"><span>${esc(member ? memberName(member) : t('Missing reference'))}</span><button type="button" class="team-unassign">${text('Remove from Penta')}</button></div>`;
  }).join('') : `<p class="team-hint">${text('Select a Penta group first.')}</p>`;
  updateCounts();
}
function renderMembers() {
  $('team-saved').innerHTML = `<label>${text('Choose a saved person')} <select id="team-person-picker"><option value="">${text('Choose a saved person')}</option>${listPeople().map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label><button type="button" id="team-add-person" class="btn-secondary">${text('Add person')}</button>`;
  $('team-selected').innerHTML = members.map(member => {
    const missing = member.personId && !getPerson(member.personId);
    const group = groups.find(g => g.memberIds.includes(member.memberId));
    return `<div class="team-member-card" data-member-id="${esc(member.memberId)}"><span>${esc(memberName(member))}${missing ? ` · ${text('Missing reference')}` : ''}${group ? ` · ${esc(group.label)}` : ` · ${text('Ungrouped')}`}</span><div>${missing ? `<button type="button" class="team-reassign">${text('Reassign person')}</button>` : ''}<button type="button" class="team-assign">${text('Add to Penta')}</button><button type="button" class="team-remove">${text('Remove')}</button></div></div>`;
  }).join('');
  renderGroups();
}
function addSavedPerson(id, replacing = null) {
  const person = getPerson(id);
  if (!person) return message('Missing reference');
  if (members.some(item => item.personId === id && item !== replacing)) return message('The selected person is already in this team.');
  if (replacing) { replacing.personId = id; replacing.displayName = person.name; replacing.labelSnapshot = person.name; }
  else members.push(createMember({ personId: id, displayName: person.name, origin: 'saved' }));
  changed(); renderMembers();
}
function assign(id) {
  const group = selectedGroup();
  if (!group) return message('Select a Penta group first.');
  if (!allMembers().some(member => member.memberId === id)) return;
  if (group.memberIds.includes(id)) return;
  if (groups.some(item => item.memberIds.includes(id))) return message('A member is already assigned to another Penta.');
  if (group.memberIds.length >= 5) return message('Five members maximum per Penta.');
  group.memberIds.push(id); changed(); renderMembers();
}
function removeMember(id) {
  members = members.filter(item => item.memberId !== id);
  for (const group of groups) group.memberIds = group.memberIds.filter(item => item !== id);
  changed(); renderMembers();
}
function newQuickRow() {
  const row = document.createElement('div');
  row.className = 'team-member-row';
  row.innerHTML = `<div class="team-quick-fields"><input class="team-name" type="text" placeholder="${text('Name')}" aria-label="${text('Name')}"><input class="team-date" type="date" aria-label="${text('Birth date')}"><input class="team-time" type="time" aria-label="${text('Birth time')}"></div><div class="team-place"></div><div class="team-row-actions"><button type="button" class="team-assign-quick">${text('Add to Penta')}</button><button type="button" class="team-save-person">${text('Save as person')}</button><button type="button" class="team-remove-quick">${text('Remove')}</button></div>`;
  row._memberId = crypto.randomUUID();
  row._placeSearch = createPlaceSearch(row.querySelector('.team-place'), { getDateTime: () => ({ date: row.querySelector('.team-date').value, time: row.querySelector('.team-time').value }) });
  for (const field of ['.team-date', '.team-time']) row.querySelector(field).addEventListener('change', row._placeSearch.updateDateTime);
  row.addEventListener('input', changed);
  row.addEventListener('change', changed);
  row.querySelector('.team-place').addEventListener('click', () => queueMicrotask(() => { if (row.isConnected) changed(); }));
  row.querySelector('.team-assign-quick').addEventListener('click', () => assign(row._memberId));
  row.querySelector('.team-remove-quick').addEventListener('click', () => {
    for (const group of groups) group.memberIds = group.memberIds.filter(id => id !== row._memberId);
    row._placeSearch.destroy(); row.remove(); quickRows = quickRows.filter(item => item !== row); changed(); renderGroups();
  });
  row.querySelector('.team-save-person').addEventListener('click', () => saveQuickPerson(row));
  $('team-members').append(row); quickRows.push(row); changed();
}
function birthProblem(birth) {
  if (birth.timeUnknown === true) return 'Birth time marked unknown.';
  if (!birth.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birth.birthDate) || !validDate(birth.birthDate)) return 'Invalid birth date.';
  if (!birth.birthTime) return 'Missing birth time.';
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birth.birthTime)) return 'Invalid birth time.';
  if (birth.timezone === null || birth.timezone === undefined || birth.timezone === '') return 'Missing timezone.';
  if (typeof birth.timezone !== 'number' || !Number.isFinite(birth.timezone) || birth.timezone < -14 || birth.timezone > 14) return 'Invalid timezone.';
  if (!validateBirth(birth)) return 'Invalid birth date.';
  return null;
}
function validDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
function checkedBirth(birth, label) {
  const problem = birthProblem(birth);
  if (problem) throw new Error(t('Birth details need correction: {names}', { names: label }) + ' ' + t(problem) + ' ' + t('Edit this person’s birth details.'));
  return birth;
}
function quickBirth(row) {
  const enteredName = row.querySelector('.team-name').value.trim();
  const birthDate = row.querySelector('.team-date').value;
  const birthTime = row.querySelector('.team-time').value;
  if (!enteredName) throw new Error(t('Please enter a name, date, time and place or UTC offset.'));
  if (!birthDate || !birthTime) return checkedBirth({ birthDate, birthTime, timezone: undefined }, enteredName);
  const location = row._placeSearch.getBirthLocation(birthDate, birthTime);
  if (!location) row._placeSearch.flagMissing();
  return checkedBirth({ name: enteredName, birthDate, birthTime, timezone: location?.timezone, location: location?.lat != null ? location : null }, enteredName);
}
function saveQuickPerson(row) {
  try {
    const birth = quickBirth(row);
    const person = savePerson({ ...birth, id: crypto.randomUUID() });
    members.push(createMember({ memberId: row._memberId, personId: person.id, displayName: person.name, origin: 'saved' }));
    row._placeSearch.destroy(); row.remove(); quickRows = quickRows.filter(item => item !== row);
    changed(); renderMembers(); message('Person saved.');
  } catch (error) { failure(error); }
}
function clearQuick() { for (const row of quickRows) row._placeSearch.destroy(); quickRows = []; $('team-members').replaceChildren(); }
function openTeam(id) {
  try {
    const team = getTeam(id);
    if (!team) throw new Error(t('The saved team could not be found.'));
    teamId = team.teamId; teamRevision = team.revision; $('team-name').value = team.name;
    members = team.members.map(item => ({ ...item, displayName: getPerson(item.personId)?.name || item.labelSnapshot, origin: 'saved' }));
    groups = team.groups.map(item => ({ ...item, memberIds: [...item.memberIds] }));
    selectedPentaId = groups[0]?.pentaId || null;
    clearQuick(); changed(); refreshToolbar(); renderMembers();
  } catch (error) { failure(error); }
}
function resetTeam() {
  teamId = null; teamRevision = null; members = []; groups = []; selectedPentaId = null;
  $('team-name').value = ''; clearQuick(); changed(); refreshToolbar(); renderMembers();
}
function persistTeam() {
  try {
    const unsaved = quickRows.filter(rowHasData).map(row => row.querySelector('.team-name').value.trim() || t('Unnamed member'));
    if (unsaved.length) return message('Unsaved members: {names}. Save each as a person first.', { names: unsaved.join(', ') });
    if (!name()) return message('Please enter a team name.');
    const saved = saveTeam({ ...(teamId ? { teamId, revision: teamRevision } : {}), name: name(), members: members.map(item => ({ memberId: item.memberId, personId: item.personId, labelSnapshot: memberName(item) })), groups });
    teamId = saved.teamId; teamRevision = saved.revision; refreshToolbar(); message('Team saved.');
  } catch (error) { failure(error); }
}
function removeTeam() { if (!teamId) return; try { deleteTeam(teamId); resetTeam(); message('Team deleted.'); } catch (error) { failure(error); } }
function renderResult(result, names, label) {
  $('team-content').innerHTML = `<div class="team-summary"><h3>${esc(name() || t('Untitled team'))} · ${esc(label)}</h3><p>${names.map(esc).join(' · ')}</p><p>${text('Gates covered: {count} / 12', { count: result.summary.presentGateCount })}</p><p>${text('Channels covered: {count} / 6', { count: result.summary.coveredChannelCount })}</p></div><div class="team-channels">${result.channels.map(channel => `<div class="team-channel"><strong>${esc(channel.channelId)}</strong> · ${esc(channel.gates.join('–'))} · ${text(({ absent: 'Not covered', selfComplete: 'One member covers both gates', crossMemberOnly: 'Covered across members', both: 'Covered individually and across members' })[channel.status])}</div>`).join('')}</div><p class="team-hint">${text('Penta matrix diagram arrives in Phase 1C.')}</p>`;
}
async function runTeamAnalysis() {
  if (pending) return;
  const token = generation;
  pending = true; $('team-calculate').disabled = true;
  message('Calculating…');
  try {
    // A partially completed quick row must never disappear from validation merely because it is unassigned.
    for (const row of quickRows.filter(rowHasData)) quickBirth(row);
    const group = selectedGroup();
    if (!group) return message('Select a Penta group first.');
    if (group.memberIds.length < 3) return message('Selected Penta needs at least three members.');
    if (group.memberIds.length > 5) return message('Five members maximum per Penta.');
    const candidates = group.memberIds.map(id => {
      const member = members.find(item => item.memberId === id);
      if (!member) {
        const row = quickRows.find(item => item._memberId === id);
        if (!row || !rowHasData(row)) throw new Error(t('Missing reference: {name}. Remove or reassign this member.', { name: id }));
        return { memberId: id, displayName: row.querySelector('.team-name').value.trim(), birth: quickBirth(row) };
      }
      const person = getPerson(member.personId);
      if (!person) throw new Error(t('Missing reference: {name}. Remove or reassign this member.', { name: member.labelSnapshot || member.displayName }));
      checkedBirth({ ...person, timezone: person.location?.timezone }, person.name);
      return { memberId: id, personId: person.id, personSnapshot: JSON.stringify(person), displayName: person.name, birth: birthFromPerson(person) };
    });
    const charts = [];
    for (const candidate of candidates) {
      const data = await computeChart(candidate.birth);
      if (token !== generation || candidates.some(item => item.personId && JSON.stringify(getPerson(item.personId)) !== item.personSnapshot)) return;
      charts.push({ memberId: candidate.memberId, chart: data.chart });
    }
    const result = analyzePentaStructure(charts);
    if (token !== generation) return;
    latest = { result, names: candidates.map(item => item.displayName), label: group.label };
    renderResult(result, latest.names, latest.label);
  } catch (error) { if (token === generation) failure(error); }
  finally { if (token === generation) { pending = false; $('team-calculate').disabled = false; } }
}
export function setupTeamView() {
  $('team-form').insertAdjacentHTML('afterbegin', `<div class="team-toolbar"><label>${text('Team name')} <input id="team-name" type="text" maxlength="100"></label><label>${text('Saved teams')} <select id="team-list"></select></label><div class="team-actions"><button type="button" id="team-new">${text('New team')}</button><button type="button" id="team-save">${text('Save team')}</button><button type="button" id="team-delete">${text('Delete team')}</button></div><p class="team-hint">${text('Browser-only team storage. Not synced with your people library or account.')}</p></div><section class="team-pool"><h3>${text('Team members')}</h3><div id="team-selected" class="team-selection"></div><p id="team-count" class="team-count"></p></section><section class="team-groups"><h3>${text('Penta groups')}</h3><p class="team-hint">${text('Penta groups are assigned manually.')}</p><div class="team-group-controls"><label>${text('Select Penta')} <select id="team-group-list"></select></label><button type="button" id="team-group-new">${text('New Penta')}</button><button type="button" id="team-group-delete">${text('Delete Penta')}</button><label>${text('Penta name')} <input id="team-group-name" type="text" maxlength="100"></label></div><p id="team-group-count" class="team-count"></p><div id="team-group-members"></div></section>`);
  const subtitle = document.querySelector('#team-view .view-subtitle');
  subtitle.removeAttribute('data-i18n'); subtitle.textContent = t('Team members and Penta structure');
  $('add-member').removeAttribute('data-i18n'); $('add-member').textContent = t('+ Add by birth data');
  $('team-calculate').removeAttribute('data-i18n'); $('team-calculate').textContent = t('Analyze Penta');
  $('team-new').addEventListener('click', resetTeam);
  $('team-save').addEventListener('click', persistTeam);
  $('team-delete').addEventListener('click', removeTeam);
  $('team-list').addEventListener('change', event => { if (event.target.value) openTeam(event.target.value); });
  $('team-name').addEventListener('input', changed);
  $('team-group-new').addEventListener('click', () => { const group = { pentaId: crypto.randomUUID(), label: `Penta ${String.fromCharCode(65 + groups.length)}`, memberIds: [] }; groups.push(group); selectedPentaId = group.pentaId; changed(); renderMembers(); });
  $('team-group-delete').addEventListener('click', () => { if (!selectedGroup()) return; groups = groups.filter(group => group.pentaId !== selectedPentaId); selectedPentaId = groups[0]?.pentaId || null; changed(); renderMembers(); });
  $('team-group-list').addEventListener('change', event => { selectedPentaId = event.target.value || null; changed(); renderGroups(); });
  $('team-group-name').addEventListener('input', event => { if (selectedGroup()) { selectedGroup().label = event.target.value; changed(); $('team-group-list').selectedOptions[0].textContent = event.target.value; for (const card of $('team-selected').children) { const member = members.find(item => item.memberId === card.dataset.memberId); if (member && selectedGroup().memberIds.includes(member.memberId)) card.querySelector('span').textContent = `${memberName(member)} · ${event.target.value}`; } } });
  $('team-group-members').addEventListener('click', event => { if (!event.target.classList.contains('team-unassign')) return; const group = selectedGroup(); if (!group) return; group.memberIds = group.memberIds.filter(id => id !== event.target.closest('[data-member-id]')?.dataset.memberId); changed(); renderMembers(); });
  $('team-saved').addEventListener('click', event => { if (event.target.id === 'team-add-person') addSavedPerson($('team-person-picker').value); });
  $('team-selected').addEventListener('click', event => {
    const id = event.target.closest('[data-member-id]')?.dataset.memberId;
    const member = members.find(item => item.memberId === id);
    if (!member) return;
    if (event.target.classList.contains('team-remove')) removeMember(id);
    if (event.target.classList.contains('team-reassign')) addSavedPerson($('team-person-picker').value, member);
    if (event.target.classList.contains('team-assign')) assign(id);
  });
  $('add-member').addEventListener('click', newQuickRow);
  $('team-calculate').addEventListener('click', runTeamAnalysis);
  refreshToolbar(); renderMembers();
}
export function renderTeamView() { renderMembers(); refreshToolbar(); }
export function refreshTeamLanguage() {
  const subtitle = document.querySelector('#team-view .view-subtitle');
  subtitle.textContent = t('Team members and Penta structure');
  $('add-member').textContent = t('+ Add by birth data'); $('team-calculate').textContent = t('Analyze Penta');
  const toolbar = $('team-form').querySelector('.team-toolbar');
  toolbar.querySelector('label:first-child').firstChild.textContent = t('Team name') + ' ';
  toolbar.querySelector('label:nth-child(2)').firstChild.textContent = t('Saved teams') + ' ';
  for (const [id, key] of [['team-new','New team'],['team-save','Save team'],['team-delete','Delete team']]) $(id).textContent = t(key);
  toolbar.querySelector('.team-hint').textContent = t('Browser-only team storage. Not synced with your people library or account.');
  $('team-form').querySelector('.team-pool h3').textContent = t('Team members');
  $('team-form').querySelector('.team-groups h3').textContent = t('Penta groups');
  $('team-form').querySelector('.team-groups .team-hint').textContent = t('Penta groups are assigned manually.');
  $('team-group-new').textContent = t('New Penta'); $('team-group-delete').textContent = t('Delete Penta');
  $('team-group-list').parentElement.firstChild.textContent = t('Select Penta') + ' ';
  $('team-group-name').parentElement.firstChild.textContent = t('Penta name') + ' ';
  for (const row of quickRows) {
    row.querySelector('.team-name').placeholder = t('Name');
    row.querySelector('.team-assign-quick').textContent = t('Add to Penta');
    row.querySelector('.team-save-person').textContent = t('Save as person');
    row.querySelector('.team-remove-quick').textContent = t('Remove');
    row.querySelector('.team-date').setAttribute('aria-label', t('Birth date'));
    row.querySelector('.team-time').setAttribute('aria-label', t('Birth time'));
    row._placeSearch.refreshLanguage();
  }
  renderMembers(); refreshToolbar(); if (latest) renderResult(latest.result, latest.names, latest.label);
}
