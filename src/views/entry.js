/**
 * Birth entry view — name, date, time, place autocomplete.
 *
 * The place search resolves to lat/lon + IANA timezone, and the UTC
 * offset in effect at the birth moment is computed automatically.
 * A manual UTC-offset fallback hides under "Enter UTC offset manually".
 */

import { createPlaceSearch } from '../lib/placesearch.js';
import { listPeople, birthFromPerson } from '../lib/people.js';
import { esc } from '../lib/format.js';
import { t } from '../lib/i18n.js';


export function setupEntryView({ onSubmit }) {
  const form = document.getElementById('birth-form');
  const nameInput = document.getElementById('birth-name');
  const dateInput = document.getElementById('birth-date');
  const timeInput = document.getElementById('birth-time');
  const timeUnknown = document.getElementById('time-unknown');
  const placeInput = document.getElementById('birth-place');
  const placeResults = document.getElementById('place-results');
  const tzChip = document.getElementById('tz-chip');
  const manualToggle = document.getElementById('manual-tz-toggle');
  const manualWrap = document.getElementById('manual-tz-wrap');
  const manualOffset = document.getElementById('manual-tz');

  const placeSearch = createPlaceSearch(form, {
    placeholder: 'City…',
    getDateTime: () => ({ date: dateInput.value, time: timeUnknown.checked ? '12:00' : timeInput.value }),
    elements: { place: document.getElementById('place-group'), input: placeInput, results: placeResults,
      manual: manualOffset, manualWrap, toggle: manualToggle, chip: tzChip }
  });
  // --- Saved people quick-pick ---
  function renderQuickPick() {
    const wrap = document.getElementById('saved-people');
    const people = listPeople();
    if (!people.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `
      <div class="saved-people-label">${t('Saved charts')}</div>
      <div class="saved-people-chips">
        ${people.map(p => `<button type="button" class="person-chip" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('')}
      </div>
    `;
    wrap.querySelectorAll('.person-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const person = people.find(p => p.id === btn.dataset.id);
        if (person) onSubmit(birthFromPerson(person), { savedPerson: true });
      });
    });
  }

  dateInput.addEventListener('change', placeSearch.updateDateTime);
  timeInput.addEventListener('change', placeSearch.updateDateTime);
  timeUnknown.addEventListener('change', () => {
    timeInput.disabled = timeUnknown.checked;
    if (timeUnknown.checked) timeInput.value = '12:00';
    placeSearch.updateDateTime();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const birthDate = dateInput.value;
    if (!birthDate || !form.reportValidity()) return;
    const birthTime = timeUnknown.checked ? '12:00' : timeInput.value;
    if (!birthTime) { timeInput.focus(); timeInput.setAttribute('aria-invalid', 'true'); return; }

    const resolved = placeSearch.getBirthLocation(birthDate, birthTime);
    if (!resolved) { placeSearch.flagMissing(); return; }
    const timezone = resolved.timezone;
    const location = resolved.lat != null ? { ...resolved, timezone } : null;

    onSubmit({
      name: nameInput.value.trim() || null,
      birthDate,
      birthTime,
      timeUnknown: timeUnknown.checked,
      timezone,
      location,
      aiAccess: document.getElementById('ai-access')?.checked || false
    });
  });

  function refreshLanguage() {
    renderQuickPick();
    placeSearch.refreshLanguage();
  }

  refreshLanguage();
  return { renderQuickPick, refreshLanguage };
}
