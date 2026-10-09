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
let pending = false;
let generation = 0;
let latest = null;
let quickRows = [];
const $ = id => document.getElementById(id);
const text = (source, params) => esc(t(source, params));
const errorText = error => text(error?.message || 'Unable to complete the operation.');
function changed() { generation++; pending = false; $('team-calculate').disabled = false; latest = null; $('team-content').replaceChildren(); updateCount(); }
function message(source, params) { $('team-content').innerHTML = `<p class="team-message" role="status">${text(source, params)}</p>`; }
function failure(error) { $('team-content').innerHTML = `<p class="team-message" role="alert">${errorText(error)}</p>`; }
function name() { return $('team-name').value.trim(); }
function updateCount() { const node = $('team-count'); if (node) node.textContent = t('Members: {count} / 5', { count: members.length + quickRows.filter(row => rowHasData(row)).length }); }
function rowHasData(row) { return !!(row.querySelector('.team-name').value.trim() || row.querySelector('.team-date').value || row.querySelector('.team-time').value || row._placeSearch?.hasInput() || row.querySelector('.ps-input')?.value.trim()); }
function findMember(id) { return members.find(member => member.memberId === id); }
function memberName(member) { return member.personId ? (getPerson(member.personId)?.name || member.displayName || member.labelSnapshot || t('Missing reference')) : member.displayName; }
function refreshToolbar() {
  const select = $('team-list');
  const previous = teamId;
  try {
    select.innerHTML = `<option value="">${text('Choose a saved team')}</option>` + listTeams().map(team => `<option value="${esc(team.teamId)}">${esc(team.name)}</option>`).join('');
    select.value = previous || '';
  } catch (error) { failure(error); }
}
function renderMembers() {
  const wrap = $('team-saved');
  wrap.innerHTML = `<label>${text('Choose a saved person')} <select id="team-person-picker"><option value="">${text('Choose a saved person')}</option>${listPeople().map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label><button type="button" id="team-add-person" class="btn-secondary">${text('Add person')}</button>`;
  const container = $('team-selected');
  container.innerHTML = members.map(member => {
    const missing = member.personId && !getPerson(member.personId);
    return `<div class="team-member-card" data-member-id="${esc(member.memberId)}"><span>${esc(memberName(member))}${missing ? ` · ${text('Missing reference')}` : ''}</span><div>${missing ? `<button type="button" class="team-reassign">${text('Reassign person')}</button>` : ''}<button type="button" class="team-remove">${text('Remove')}</button></div></div>`;
  }).join('');
  updateCount();
}
function addSavedPerson(id, replacing = null) {
  const person = getPerson(id);
  if (!person) return message('Missing reference');
  if (members.some(m => m.personId === id && m !== replacing)) return message('The selected person is already in this team.');
  if (!replacing && members.length + quickRows.filter(rowHasData).length >= 5) return message('Five members maximum.');
  if (replacing) { replacing.personId = id; replacing.displayName = person.name; replacing.labelSnapshot = person.name; }
  else members.push(createMember({ personId: id, displayName: person.name, origin: 'saved' }));
  changed(); renderMembers();
}
function newQuickRow() {
  if (members.length + quickRows.length >= 5) return message('Five members maximum.');
  const row = document.createElement('div');
  row.className = 'team-member-row';
  row.innerHTML = `<div class="team-quick-fields"><input class="team-name" type="text" placeholder="${text('Name')}" aria-label="${text('Name')}"><input class="team-date" type="date" aria-label="${text('Birth date')}"><input class="team-time" type="time" aria-label="${text('Birth time')}"></div><div class="team-place"></div><div class="team-row-actions"><button type="button" class="team-save-person">${text('Save as person')}</button><button type="button" class="team-remove-quick">${text('Remove')}</button></div>`;
  row._memberId = crypto.randomUUID();
  row._placeSearch = createPlaceSearch(row.querySelector('.team-place'), { getDateTime: () => ({ date: row.querySelector('.team-date').value, time: row.querySelector('.team-time').value }) });
  for (const field of ['.team-date', '.team-time']) row.querySelector(field).addEventListener('change', row._placeSearch.updateDateTime);
  row.addEventListener('input', changed);
  row.addEventListener('change', changed);
  row.querySelector('.team-place').addEventListener('click', () => queueMicrotask(() => { if (row.isConnected) changed(); }));
  row.querySelector('.team-remove-quick').addEventListener('click', () => { row._placeSearch.destroy(); row.remove(); quickRows = quickRows.filter(item => item !== row); changed(); });
  row.querySelector('.team-save-person').addEventListener('click', () => saveQuickPerson(row));
  $('team-members').append(row);
  quickRows.push(row);
  changed();
}
function quickBirth(row) {
  const enteredName = row.querySelector('.team-name').value.trim();
  const birthDate = row.querySelector('.team-date').value;
  const birthTime = row.querySelector('.team-time').value;
  if (!enteredName || !birthDate || !birthTime) throw new Error(t('Please enter a name, date, time and place or UTC offset.'));
  const location = row._placeSearch.getBirthLocation(birthDate, birthTime);
  if (!location) { row._placeSearch.flagMissing(); throw new Error(t('Please enter a name, date, time and place or UTC offset.')); }
  const birth = { name: enteredName, birthDate, birthTime, timezone: location.timezone, location: location.lat != null ? location : null };
  validateBirth(birth);
  return birth;
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
    teamId = team.teamId; teamRevision = team.revision;
    $('team-name').value = team.name;
    members = team.members.map(item => ({ ...item, displayName: getPerson(item.personId)?.name || item.labelSnapshot, origin: 'saved' }));
    clearQuick(); changed(); refreshToolbar(); renderMembers();
  } catch (error) { failure(error); }
}
function resetTeam() { teamId = null; teamRevision = null; members = []; $('team-name').value = ''; clearQuick(); changed(); refreshToolbar(); renderMembers(); }
function persistTeam() {
  try {
    const unsaved = quickRows.filter(rowHasData).map(row => row.querySelector('.team-name').value.trim() || t('Unnamed member'));
    if (unsaved.length) return message('Unsaved members: {names}. Save each as a person first.', { names: unsaved.join(', ') });
    if (!name()) return message('Please enter a team name.');
    const saved = saveTeam({ ...(teamId ? { teamId, revision: teamRevision } : {}), kind: 'penta', name: name(), members: members.map(member => ({ memberId: member.memberId, personId: member.personId, labelSnapshot: memberName(member) })) });
    teamId = saved.teamId; teamRevision = saved.revision; refreshToolbar(); message('Team saved.');
  } catch (error) { failure(error); }
}
function removeTeam() {
  if (!teamId) return;
  try { deleteTeam(teamId); resetTeam(); message('Team deleted.'); } catch (error) { failure(error); }
}
function renderResult(result, names) {
  $('team-content').innerHTML = `<div class="team-summary"><h3>${esc(name() || t('Untitled team'))}</h3><p>${names.map(esc).join(' · ')}</p><p>${text('Gates covered: {count} / 12', { count: result.summary.presentGateCount })}</p><p>${text('Channels covered: {count} / 6', { count: result.summary.coveredChannelCount })}</p></div><div class="team-channels">${result.channels.map(channel => `<div class="team-channel"><strong>${esc(channel.channelId)}</strong> · ${esc(channel.gates.join('–'))} · ${text(({ absent: 'Not covered', selfComplete: 'One member covers both gates', crossMemberOnly: 'Covered across members', both: 'Covered individually and across members' })[channel.status])}</div>`).join('')}</div><p class="team-hint">${text('Penta matrix diagram arrives in Phase 1C.')}</p>`;
}
async function runTeamAnalysis() {
  if (pending) return;
  const token = generation;
  const button = $('team-calculate');
  pending = true; button.disabled = true;
  message('Calculating…');
  try {
    const activeRows = quickRows.filter(rowHasData);
    const count = members.length + activeRows.length;
    if (count < 3) return message('At least three members are required for Penta analysis.');
    if (count > 5) return message('Five members maximum.');
    const candidates = members.map(member => {
      const person = getPerson(member.personId);
      if (!person) throw new Error(t('Missing reference: {name}. Remove or reassign this member.', { name: member.labelSnapshot || member.displayName }));
      try {
        if (person.timeUnknown === true) throw new Error(t('Accurate birth time is required.'));
        validateBirth({ ...person, timezone: person.location?.timezone });
      } catch (error) {
        throw new Error(t('Birth details need correction: {names}', { names: person.name }) + ' ' + error.message + ' ' + t('Edit this person’s birth details.'));
      }
      return { memberId: member.memberId, personId: person.id, personSnapshot: JSON.stringify(person), displayName: person.name, birth: birthFromPerson(person) };
    });
    for (const row of activeRows) candidates.push({ memberId: row._memberId, displayName: row.querySelector('.team-name').value.trim(), birth: quickBirth(row) });
    const charts = [];
    for (const member of candidates) {
      const data = await computeChart(member.birth);
      if (token !== generation || candidates.some(candidate => candidate.personId && JSON.stringify(getPerson(candidate.personId)) !== candidate.personSnapshot)) return;
      charts.push({ memberId: member.memberId, chart: data.chart });
    }
    const result = analyzePentaStructure(charts);
    if (token !== generation) return;
    latest = { result, names: candidates.map(m => m.displayName) };
    renderResult(result, latest.names);
  } catch (error) { if (token === generation) failure(error); }
  finally { if (token === generation) { pending = false; button.disabled = false; } }
}
export function setupTeamView() {
  $('team-form').insertAdjacentHTML('afterbegin', `<div class="team-toolbar"><label>${text('Team name')} <input id="team-name" type="text" maxlength="100"></label><label>${text('Saved teams')} <select id="team-list"></select></label><div class="team-actions"><button type="button" id="team-new">${text('New team')}</button><button type="button" id="team-save">${text('Save team')}</button><button type="button" id="team-delete">${text('Delete team')}</button></div><p class="team-hint">${text('Browser-only team storage. Not synced with your people library or account.')}</p></div><div id="team-selected" class="team-selection"></div><p id="team-count" class="team-count"></p>`);
  const subtitle = document.querySelector('#team-view .view-subtitle');
  subtitle.removeAttribute('data-i18n'); subtitle.textContent = t('Team members and Penta structure');
  $('add-member').removeAttribute('data-i18n'); $('add-member').textContent = t('+ Add by birth data');
  $('team-calculate').removeAttribute('data-i18n'); $('team-calculate').textContent = t('Analyze Penta');
  $('team-new').addEventListener('click', resetTeam);
  $('team-save').addEventListener('click', persistTeam);
  $('team-delete').addEventListener('click', removeTeam);
  $('team-list').addEventListener('change', event => { if (event.target.value) openTeam(event.target.value); });
  $('team-name').addEventListener('input', changed);
  $('team-saved').addEventListener('click', event => { if (event.target.id === 'team-add-person') addSavedPerson($('team-person-picker').value); });
  $('team-selected').addEventListener('click', event => {
    const member = findMember(event.target.closest('[data-member-id]')?.dataset.memberId);
    if (!member) return;
    if (event.target.classList.contains('team-remove')) { members = members.filter(item => item !== member); changed(); renderMembers(); }
    if (event.target.classList.contains('team-reassign')) addSavedPerson($('team-person-picker').value, member);
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
  for (const row of quickRows) {
    row.querySelector('.team-name').placeholder = t('Name');
    row.querySelector('.team-save-person').textContent = t('Save as person');
    row.querySelector('.team-remove-quick').textContent = t('Remove');
    row.querySelector('.team-date').setAttribute('aria-label', t('Birth date'));
    row.querySelector('.team-time').setAttribute('aria-label', t('Birth time'));
  }
  renderMembers(); refreshToolbar(); if (latest) renderResult(latest.result, latest.names);
}
