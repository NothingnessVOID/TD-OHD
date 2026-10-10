import '../styles/person-editor.css';
import { createPlaceSearch } from './placesearch.js';
import { savePerson, getAiAccess, setAiAccess } from './people.js';
import { localMode } from './local-store.js';
import { esc } from './format.js';
import { t } from './i18n.js';
import { toDecimalHour } from './chart-engine/birth-time.js';

export function openPersonEditor(birth) {
  if (!birth.id) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<form class="modal person-editor" role="dialog" aria-modal="true" aria-label="${esc(t('Edit chart'))}">
    <div class="modal-title">${t('Edit chart')}</div>
    <label class="modal-field">${t('Name')}<input id="edit-name" value="${esc(birth.name || '')}" required></label>
    <label class="modal-field">${t('Birth Date')}<input id="edit-date" type="date" value="${esc(birth.birthDate)}" required></label>
    <label class="modal-field">${t('Birth Time')}<input id="edit-time" type="time" value="${esc(birth.birthTime || '12:00')}" required></label>
    <label class="modal-check"><input id="edit-unknown" type="checkbox" ${birth.timeUnknown ? 'checked' : ''}>${t("I don't know my birth time")}</label>
    <p id="edit-estimate">${t('time unknown — chart uses noon')}</p>
    <div id="edit-place"></div>
    <label class="modal-check" ${localMode ? 'hidden' : ''}><input id="edit-ai" type="checkbox" ${getAiAccess(birth.id) ? 'checked' : ''}>${t('Let my AI read this chart through the connector')}</label>
    <p id="edit-error" role="alert" hidden></p>
    <div class="modal-actions"><button type="button" id="edit-cancel" class="btn-secondary">${t('Cancel')}</button><button type="submit" id="edit-save" class="btn-primary">${t('Save')}</button></div>
  </form>`;
  document.body.append(overlay);
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
  const trigger = document.activeElement;
  const close = () => { place.destroy(); overlay.remove(); document.removeEventListener('keydown', onKey); if (trigger?.isConnected) trigger.focus(); };
  const onKey = event => { if (event.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  field('cancel').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  overlay.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const birthDate = field('date').value, birthTime = effectiveTime();
      toDecimalHour(birthTime);
      const date = new Date(`${birthDate}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== birthDate) throw new Error(t('Invalid birth date.'));
      const location = place.getBirthLocation(birthDate, birthTime);
      if (!location) { place.flagMissing(); return; }
      savePerson({ ...birth, name: field('name').value.trim(), birthDate, birthTime, timeUnknown: field('unknown').checked, timezone: location.timezone, location });
      if (!localMode) setAiAccess(birth.id, field('ai').checked);
      close();
    } catch (error) {
      field('error').textContent = error.message;
      field('error').hidden = false;
    }
  });
  field('name').focus();
}
