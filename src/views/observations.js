import { listPeople } from '../lib/people.js';
import { esc } from '../lib/format.js';
import { t, getLocale } from '../lib/i18n.js';
import { createObservationStore } from '../lib/observation-store.js';
import { observationBackup, previewObservationRestore, OBSERVATION_ENGINE_VERSION, OBSERVATION_RULE_VERSION } from '../lib/observation-record.js';
import './observations.css';

const store = createObservationStore();
let initialized = false;
let records = [];
let selectedId = null;
let draft = null;
let pendingBackup = null;
let pendingPreview = null;
let dirty = false;
let contextProvider = () => null;
const mount = () => document.getElementById('observations-view');
const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const localInputValue = instant => {
  const date = new Date(instant);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const displayDate = record => new Intl.DateTimeFormat(getLocale(), {
  dateStyle: 'medium', timeStyle: 'short', timeZone: record.displayZone
}).format(new Date(record.observedAt));
const fresh = () => {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), observedAt: now, displayZone: deviceZone(), personId: null,
    alias: '', raw: '', interpretation: '', event: '', tags: [], snapshot: null,
    createdAt: now, updatedAt: now, restoredFrom: null };
};

function download(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function status(source, error = false) {
  const node = mount().querySelector('.ob-status');
  if (!node) return;
  node.textContent = t(source); node.dataset.error = String(error);
}

function subject(record) {
  const person = record.personId && listPeople().find(item => item.id === record.personId);
  return person?.name || record.alias || t('Anonymous observation');
}

function ensureDiscard() {
  return !dirty || confirm(t('Discard unsaved changes?'));
}

function readForm() {
  const form = mount().querySelector('.ob-editor');
  if (!form || !draft) return;
  draft.personId = form.elements.person.value || null;
  draft.alias = form.elements.alias.value.trim();
  draft.raw = form.elements.raw.value;
  draft.interpretation = form.elements.interpretation.value;
  draft.event = form.elements.event.value;
  draft.tags = [...new Set(form.elements.tags.value.split(/[,，]/).map(value => value.trim()).filter(Boolean))];
  const when = form.elements.when.value;
  if (when && when !== localInputValue(draft.observedAt)) {
    const parsed = new Date(when);
    if (!Number.isFinite(parsed.getTime())) throw new Error(t('Choose a valid observation time.'));
    draft.observedAt = parsed.toISOString();
    draft.displayZone = deviceZone();
    draft.snapshot = null;
  }
}

function select(id) {
  if (!ensureDiscard()) return;
  selectedId = id;
  draft = id ? structuredClone(records.find(record => record.id === id)) : fresh();
  dirty = false;
  render();
}

function render() {
  const current = draft || (draft = fresh());
  const people = listPeople();
  const matchedPerson = current.personId && people.some(item => item.id === current.personId);
  mount().innerHTML = `<div class="ob-heading"><div><span class="ob-eyebrow">${t('PRIVATE FIELD NOTES')}</span><h1>${t('Observations')}</h1>
    <p>${t('Record what happened first. Add an interpretation later, without changing the original observation.')}</p></div>
    <div class="ob-heading-actions"><button type="button" class="btn-secondary" data-ob="export">${t('Export backup')}</button>
      <button type="button" class="btn-secondary" data-ob="export-anon">${t('Export without identity')}</button>
      <button type="button" class="btn-secondary" data-ob="import">${t('Restore from file')}</button>
      <input class="ob-file" type="file" accept="application/json,.json" hidden></div></div>
    <div class="ob-layout"><aside class="ob-list-panel"><div class="ob-list-title"><h2>${t('Entries')} <span>${records.length}</span></h2>
      <button type="button" class="ob-new" data-ob="new">＋ ${t('New note')}</button></div>
      <div class="ob-list">${records.length ? records.map(record => `<button type="button" class="ob-list-item ${record.id === selectedId ? 'active' : ''}" data-ob-id="${esc(record.id)}">
        <span>${esc(displayDate(record))}</span><strong>${esc(subject(record))}</strong><small>${esc(record.raw || record.event || record.interpretation).slice(0, 100)}</small></button>`).join('')
        : `<p class="ob-empty">${t('No observations yet. Your first note can be anonymous and does not need a chart.')}</p>`}</div></aside>
    <section class="ob-editor-panel"><div class="ob-editor-top"><span>${selectedId ? t('Saved note') : t('New note')}</span>
      ${selectedId ? `<button type="button" class="ob-delete" data-ob="delete">${t('Delete note')}</button>` : ''}</div>
      <form class="ob-editor"><div class="ob-form-grid"><label>${t('When')}<input name="when" type="datetime-local" value="${localInputValue(current.observedAt)}" required>
        <small>${t('Time shown in {zone}', { zone: current.displayZone })}</small></label>
        <label>${t('Saved person')}<select name="person"><option value="">${t('No person linked')}</option>
          ${!matchedPerson && current.personId ? `<option value="${esc(current.personId)}" selected>${t('Person not currently available')}</option>` : ''}
          ${people.map(person => `<option value="${esc(person.id)}" ${current.personId === person.id ? 'selected' : ''}>${esc(person.name)}</option>`).join('')}</select></label></div>
        <div class="ob-form-grid"><label>${t('Anonymous code or label')}<input name="alias" maxlength="120" value="${esc(current.alias)}" placeholder="${esc(t('Optional label'))}"></label>
        <label>${t('Tags')}<input name="tags" value="${esc(current.tags.join(', '))}" placeholder="${esc(t('Separate tags with commas'))}"></label></div>
        <label class="ob-long"><span><b>01</b> ${t('What I noticed')}</span><textarea name="raw" rows="5" maxlength="10000" placeholder="${esc(t('Write the immediate experience in your own words'))}">${esc(current.raw)}</textarea></label>
        <label class="ob-long"><span><b>02</b> ${t('Later interpretation')}</span><textarea name="interpretation" rows="4" maxlength="10000" placeholder="${esc(t('Add meaning later; keep it separate from the first note'))}">${esc(current.interpretation)}</textarea></label>
        <label class="ob-long"><span><b>03</b> ${t('Real-world event')}</span><textarea name="event" rows="3" maxlength="10000" placeholder="${esc(t('What verifiably happened?'))}">${esc(current.event)}</textarea></label>
        <div class="ob-snapshot"><div><strong>${t('Chart snapshot')}</strong><p>${current.snapshot
          ? `${esc(displayDate({ observedAt: current.snapshot.instantUtc, displayZone: current.snapshot.displayZone }))} · ${current.snapshot.activeChannels.length} ${t('channels')} · ${esc(current.snapshot.mode)}`
          : t('No chart attached. You can record before opening a chart.')}</p></div>
          <button type="button" class="btn-secondary btn-small" data-ob="capture">${t('Capture timeline')}</button></div>
        <div class="ob-editor-actions"><button type="submit" class="btn-primary">${t('Save observation')}</button><span class="ob-status" role="status"></span></div>
      </form></section></div><div class="ob-import-preview" hidden></div>`;
}

async function reload() {
  records = await store.list();
  if (selectedId && !records.some(item => item.id === selectedId)) selectedId = null;
  if (!dirty) draft = selectedId ? structuredClone(records.find(item => item.id === selectedId)) : fresh();
  render();
}

function showImportPreview() {
  const panel = mount().querySelector('.ob-import-preview');
  const counts = pendingPreview.counts;
  panel.hidden = false;
  panel.innerHTML = `<div class="ob-import-card"><h2>${t('Restore preview')}</h2>
    <p>${t('New: {add} · Conflicting IDs kept as copies: {conflict} · Unchanged: {unchanged}', counts)}</p>
    <p>${t('Existing notes will not be overwritten. Review the file before importing sensitive information.')}</p>
    <div><button type="button" class="btn-primary" data-ob="confirm-import">${t('Import notes')}</button>
    <button type="button" class="btn-secondary" data-ob="cancel-import">${t('Cancel')}</button></div></div>`;
  panel.scrollIntoView({ block: 'nearest' });
}

export function setupObservationsView({ getTimelineContext = () => null } = {}) {
  if (initialized) return;
  initialized = true;
  contextProvider = getTimelineContext;
  mount().addEventListener('input', event => { if (event.target.closest('.ob-editor')) dirty = true; });
  mount().addEventListener('submit', async event => {
    if (!event.target.matches('.ob-editor')) return;
    event.preventDefault();
    try {
      readForm();
      draft.updatedAt = new Date().toISOString();
      const saved = await store.save(draft);
      selectedId = draft.id; dirty = false;
      await reload(); status(saved.backupWarning ? 'Observation saved, but automatic backup needs attention.' : 'Observation saved.');
    } catch (error) { status(error.message || 'Could not save observation.', true); }
  });
  mount().addEventListener('change', async event => {
    if (!event.target.matches('.ob-file') || !event.target.files?.[0]) return;
    try {
      const file = event.target.files[0];
      if (file.size > 2_000_000) throw new Error(t('Backup file is too large.'));
      pendingBackup = JSON.parse(await file.text());
      pendingPreview = previewObservationRestore(records, pendingBackup);
      showImportPreview();
    } catch (error) { pendingBackup = null; pendingPreview = null; status(error.message, true); }
    event.target.value = '';
  });
  mount().addEventListener('click', async event => {
    const item = event.target.closest('[data-ob-id]');
    if (item) { select(item.dataset.obId); return; }
    const action = event.target.closest('[data-ob]')?.dataset.ob;
    if (!action) return;
    if (action === 'new') { select(null); return; }
    if (action === 'import') { mount().querySelector('.ob-file').click(); return; }
    if (action === 'cancel-import') { pendingBackup = null; pendingPreview = null; mount().querySelector('.ob-import-preview').hidden = true; return; }
    if (action === 'export' || action === 'export-anon') {
      if (action === 'export-anon' && !confirm(t('Linked person IDs, labels and chart snapshots will be removed. Names written inside notes or tags remain; review the exported file before sharing.'))) return;
      download(`td-ohd-observations-${action === 'export-anon' ? 'anonymous-' : ''}${new Date().toISOString().slice(0, 10)}.json`,
        observationBackup(records, { anonymous: action === 'export-anon' }));
      return;
    }
    if (action === 'capture') {
      const context = contextProvider();
      if (!context) { status('Open a chart in Timeline first, then return here to capture it.', true); return; }
      readForm();
      draft.observedAt = context.instantUtc;
      draft.displayZone = context.displayZone;
      draft.snapshot = { ...context, engineVersion: OBSERVATION_ENGINE_VERSION, ruleVersion: OBSERVATION_RULE_VERSION };
      dirty = true; render(); status('Timeline snapshot attached. Save this note to keep it.'); return;
    }
    if (action === 'delete') {
      if (!selectedId || !confirm(t('Delete this observation? A backup should be exported first.'))) return;
      try { await store.delete(selectedId); selectedId = null; dirty = false; await reload(); status('Observation deleted.'); }
      catch (error) { status(error.message, true); }
      return;
    }
    if (action === 'confirm-import') {
      if (!pendingBackup) return;
      if (!ensureDiscard()) return;
      try {
        const result = await store.restore(pendingBackup);
        pendingBackup = null; pendingPreview = null; dirty = false; await reload();
        status(result.backupWarning ? 'Notes imported, but automatic backup needs attention.'
          : t('Imported {count} notes.', { count: result.counts.add + result.counts.conflict }));
      } catch (error) { status(error.message, true); }
    }
  });
}

export async function renderObservationsView() {
  setupObservationsView();
  try { await reload(); }
  catch (error) { mount().innerHTML = `<div class="ob-heading"><h1>${t('Observations')}</h1><p role="alert">${esc(error.message)}</p></div>`; }
}

export function leaveObservationsView() {
  if (dirty) { try { readForm(); } catch { /* Keep the in-memory draft untouched until the next edit. */ } }
}

export function refreshObservationsLanguage() {
  leaveObservationsView();
  if (mount() && !mount().classList.contains('hidden')) render();
}
