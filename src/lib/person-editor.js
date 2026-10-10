import '../styles/person-editor.css';
import { openOperationDialog } from './operation-dialog.js';
import { createPlaceSearch } from './placesearch.js';
import { savePerson, getAiAccess, setAiAccess } from './people.js';
import { localMode } from './local-store.js';
import { esc } from './format.js';
import { t } from './i18n.js';
import { toDecimalHour } from './chart-engine/birth-time.js';

export function openPersonEditor(birth = {}, { create = false, onSaved = null, onCancel = null } = {}) {
  if (!birth.id && !create) return;
  const title = create ? 'Team create person' : 'Edit chart';
  const content = `<form class="modal person-editor" role="dialog" aria-modal="true" aria-label="${esc(t(title))}">
    <header><div class="modal-title">${esc(t(title))}</div><button type="button" class="ui-icon-button" data-close aria-label="${esc(t('Close'))}">×</button></header>
    <label class="modal-field">${t('Name')}<input id="edit-name" value="${esc(birth.name || '')}" required></label>
    <label class="modal-field">${t('Birth Date')}<input id="edit-date" type="date" value="${esc(birth.birthDate || '')}" required></label>
    <label class="modal-field">${t('Birth Time')}<input id="edit-time" type="time" value="${esc(birth.birthTime || '')}" required></label>
    <label class="modal-check"><input id="edit-unknown" type="checkbox" ${birth.timeUnknown ? 'checked' : ''}>${t("I don't know my birth time")}</label>
    <p id="edit-estimate">${t('time unknown — chart uses noon')}</p>
    <div id="edit-place"></div>
    <label class="modal-check" ${localMode ? 'hidden' : ''}><input id="edit-ai" type="checkbox" ${getAiAccess(birth.id) ? 'checked' : ''}>${t('Let my AI read this chart through the connector')}</label>
    <p id="edit-error" role="alert" hidden></p>
    <div class="modal-actions"><button type="button" id="edit-cancel" class="btn-secondary" data-close>${t('Cancel')}</button><button type="submit" id="edit-save" class="btn-primary">${t('Save')}</button></div>
  </form>`;
  const { overlay, close } = openOperationDialog({ content, onClose: reason => { place.destroy(); if (reason !== 'saved') onCancel?.(); } });
  const field = id => overlay.querySelector(`#edit-${id}`);
  const effectiveTime = () => field('unknown').checked ? '12:00' : field('time').value;
  const place = createPlaceSearch(field('place'), { getDateTime: () => ({ date: field('date').value, time: effectiveTime() }) });
  place.setBirthLocation(birth.location, birth.timezone);
  const updateUnknown = () => {
    field('time').disabled = field('unknown').checked;
    field('estimate').hidden = !field('unknown').checked;
    place.updateDateTime();
  };
  updateUnknown();
  field('unknown').addEventListener('change', updateUnknown);
  field('date').addEventListener('change', place.updateDateTime);
  field('time').addEventListener('change', place.updateDateTime);
  overlay.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const birthDate = field('date').value, birthTime = effectiveTime();
      toDecimalHour(birthTime);
      const date = new Date(`${birthDate}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== birthDate) throw new Error(t('Invalid birth date.'));
      const location = place.getBirthLocation(birthDate, birthTime);
      if (!location) { place.flagMissing(); return; }
      const saved = savePerson({ ...birth, name: field('name').value.trim(), birthDate, birthTime, timeUnknown: field('unknown').checked, timezone: location.timezone, location });
      if (!localMode) setAiAccess(saved.id, field('ai').checked);
      close('saved');
      onSaved?.(saved);
    } catch (error) {
      field('error').textContent = error.message;
      field('error').hidden = false;
    }
  });
  field('name').focus();
}
