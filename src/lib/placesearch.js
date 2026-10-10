/**
 * Self-contained place autocomplete — instantiable, so several can live on
 * one page (Connection's Person B, every Team member row). Resolves to
 * lat/lon + IANA timezone and computes the historical UTC offset at the birth
 * moment on demand. A small "UTC offset" fallback keeps obscure places from
 * dead-ending. No shared DOM ids.
 *
 * Entry, Connection and Team use this same controller.
 */

import { searchPlaces, offsetForZone, formatOffset } from './location.js';
import { esc } from './format.js';
import { t, onLocaleChange } from './i18n.js';


export function createPlaceSearch(mount, { placeholder = 'Birth place', getDateTime, elements } = {}) {
  mount.classList.add('place-search');
  if (!elements) mount.innerHTML = `
    <div class="ps-place">
      <input type="text" class="ps-input" placeholder="${esc(t(placeholder))}" autocomplete="off" aria-label="${esc(t(placeholder))}">
      <div class="ps-results hidden"></div>
    </div>
    <input type="number" class="ps-manual hidden" placeholder="${esc(t('UTC offset, e.g. -6'))}" min="-14" max="14" step="0.25" aria-label="${esc(t('UTC offset at birth'))}">
    <button type="button" class="ps-toggle">${t('Enter UTC offset')}</button>
    <div class="ps-chip hidden"></div>
    <div class="ps-status field-error hidden" role="status"></div>
  `;
  const place = elements?.place || mount.querySelector('.ps-place');
  const input = elements?.input || mount.querySelector('.ps-input');
  const results = elements?.results || mount.querySelector('.ps-results');
  const manual = elements?.manual || mount.querySelector('.ps-manual');
  const manualWrap = elements?.manualWrap || manual;
  manual.disabled = true; // Inactive fallback must not block Entry form validity.
  const toggle = elements?.toggle || mount.querySelector('.ps-toggle');
  const chip = elements?.chip || mount.querySelector('.ps-chip');
  let status = elements?.status || mount.querySelector('.ps-status');
  if (!status) {
    status = document.createElement('p');
    status.className = 'ps-status field-error hidden'; status.setAttribute('role', 'status');
    results.after(status);
  }
  const help = document.createElement('p');
  help.className = 'place-help label-soft';
  help.dataset.i18n = 'Birth place determines the historical timezone, without solar-time correction. If your district is missing, choose a nearby city in the same timezone, or enter a UTC offset.';
  toggle.after(help);

  let selected = null;
  let found = [];
  let activeIndex = -1;
  let debounce = null;
  let seqCounter = 0;
  let manualMode = false;
  let composing = false;
  let controller = null;

  const dateTime = () => (getDateTime?.() || {});

  function clearResults() {
    results.innerHTML = '';
    results.classList.add('hidden');
    found = [];
    activeIndex = -1;
  }

  function updateChip() {
    if (manualMode) {
      const v = manual.value.trim();
      if (v === '') { chip.classList.add('hidden'); return; }
      const parsed = Number(v);
      if (!Number.isFinite(parsed) || parsed < -14 || parsed > 14) { chip.classList.add('hidden'); return; }
      chip.textContent = `${t('Manual offset')} · ${formatOffset(parsed)}`;
      chip.classList.remove('hidden');
      return;
    }
    if (!selected) { chip.classList.add('hidden'); return; }
    const { date, time } = dateTime();
    if (!date || !time) {
      chip.textContent = `${selected.label} · ${selected.timezone}`;
      chip.classList.remove('hidden');
      return;
    }
    const d = date;
    const birthTime = time;
    try {
      const off = offsetForZone(d, birthTime, selected.timezone);
      chip.textContent = `${selected.label} · ${t('{offset} at birth', { offset: formatOffset(off) })}`;
      chip.classList.remove('hidden');
    } catch {
      chip.classList.add('hidden');
    }
  }

  function pick(p) {
    selected = p;
    input.value = p.label;
    input.removeAttribute('aria-invalid');
    clearResults();
    updateChip();
  }

  function setActive(i) {
    const items = results.querySelectorAll('.ps-result');
    if (!items.length) return;
    activeIndex = ((i % items.length) + items.length) % items.length;
    items.forEach((el, j) => el.classList.toggle('active', j === activeIndex));
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; input.dispatchEvent(new Event('input')); });
  input.addEventListener('input', () => {
    if (composing) return;
    const seq = ++seqCounter;
    controller?.abort(); controller = null;
    status.classList.add('hidden');
    selected = null;
    input.removeAttribute('aria-invalid');
    updateChip();
    const q = input.value.trim();
    clearTimeout(debounce);
    if (q.length < 2) { clearResults(); return; }
    debounce = setTimeout(async () => {
      controller = new AbortController();
      try {
        const places = await searchPlaces(q, 8, { signal: controller.signal });
        if (seq !== seqCounter) return; // stale response
        if (!places.length) {
          clearResults(); status.textContent = t('No matching place found. Search a nearby or parent city in the same timezone, or enter a UTC offset.'); status.classList.remove('hidden'); return;
        }
        results.innerHTML = places.map((p, i) =>
          `<button type="button" class="ps-result place-result" data-i="${i}">${esc(p.label)}</button>`).join('');
        results.classList.remove('hidden');
        found = places;
        activeIndex = -1;
        results.querySelectorAll('.ps-result').forEach(btn =>
          btn.addEventListener('click', () => pick(places[parseInt(btn.dataset.i)])));
      } catch (error) {
        if (seq !== seqCounter || error.name === 'AbortError') return;
        clearResults();
        status.textContent = t('Place search is unavailable. Try again or enter a UTC offset manually.');
        status.classList.remove('hidden');
      }
    }, 250);
  });

  input.addEventListener('keydown', (e) => {
    const open = !results.classList.contains('hidden') && found.length;
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(found[activeIndex >= 0 ? activeIndex : 0]); }
    else if (e.key === 'Escape') { clearResults(); }
  });

  const onDocClick = (e) => { if (!mount.contains(e.target)) clearResults(); };
  document.addEventListener('click', onDocClick);

  manual.addEventListener('input', () => { manual.removeAttribute('aria-invalid'); updateChip(); });

  toggle.addEventListener('click', () => {
    manualMode = !manualMode;
    manual.disabled = !manualMode;
    place.classList.toggle('hidden', manualMode);
    manualWrap.classList.toggle('hidden', !manualMode);
    toggle.textContent = manualMode ? t('Search birth place') : t('Enter UTC offset');
    ++seqCounter; controller?.abort(); clearTimeout(debounce);
    clearResults();
    updateChip();
  });

  function refreshLanguage() {
    help.textContent = t(help.dataset.i18n);
    const placeLabel = t(placeholder);
    input.placeholder = placeLabel;
    input.setAttribute('aria-label', placeLabel);
    manual.placeholder = t('UTC offset, e.g. -6');
    manual.setAttribute('aria-label', t('UTC offset at birth'));
    toggle.textContent = manualMode ? t('Search birth place') : t('Enter UTC offset');
    updateChip();
  }
  const unsubscribeLanguage = onLocaleChange(refreshLanguage);

  refreshLanguage();
  return {
    refreshLanguage,
    setBirthLocation(location, timezone = location?.timezone) {
      ++seqCounter; controller?.abort(); clearTimeout(debounce); clearResults();
      manualMode = !location?.iana;
      selected = location?.iana ? { label: location.name || location.iana, latitude: location.lat, longitude: location.lon, timezone: location.iana } : null;
      input.value = selected?.label || '';
      manual.value = timezone == null ? '' : String(timezone);
      manual.disabled = !manualMode;
      place.classList.toggle('hidden', manualMode);
      manualWrap.classList.toggle('hidden', !manualMode);
      refreshLanguage();
    },
    updateDateTime: updateChip,
    hasInput: () => manualMode ? manual.value.trim() !== '' : !!selected,
    flagMissing: () => {
      const el = manualMode ? manual : input;
      status.textContent = t('Pick a place from the list — or enter a UTC offset manually below.');
      status.classList.remove('hidden');
      el.setAttribute('aria-invalid', 'true');
      el.focus();
    },
    /**
     * Birth-location for the given date/time, or null if nothing entered.
     * Place mode → { timezone (historical offset), lat, lon, iana, name }.
     * Manual mode → { timezone } only.
     */
    getBirthLocation(date, time) {
      if (manualMode) {
        const v = manual.value.trim();
        const parsed = Number(v);
        if (v === '' || !Number.isFinite(parsed) || parsed < -14 || parsed > 14 || Math.round(parsed * 4) !== parsed * 4) return null;
        return { timezone: parsed };
      }
      if (!selected) return null;
      let timezone;
      try { timezone = offsetForZone(date, time, selected.timezone); } catch { return null; }
      return { timezone, lat: selected.latitude, lon: selected.longitude, iana: selected.timezone, name: selected.label };
    },
    destroy() {
      document.removeEventListener('click', onDocClick);
      unsubscribeLanguage?.();
      ++seqCounter; controller?.abort(); clearTimeout(debounce);
    }
  };
}
