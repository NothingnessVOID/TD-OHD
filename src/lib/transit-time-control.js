/**
 * Shared transit time control: the date / time / timezone / Now row, the DST
 * ambiguity choice and the status line.
 *
 * The Transits view and the Sleep chart both ask the same question — "which
 * wall-clock moment should the overlay be read at?" — so the control, its
 * resolution rule and its two failure paths live here once instead of being
 * copied per view. `lib/transit-time.js` still owns the calendar maths; this
 * module owns the widgets, the DOM ids and the messages.
 *
 * Element ids stay `<prefix>-date`, `<prefix>-time`, `<prefix>-timezone`,
 * `<prefix>-now`, `<prefix>-choice`, `<prefix>-choice-label`, `<prefix>-status`
 * and (with `showModeToggle`) `<prefix>-only-toggle`. The Transits view mounts
 * with the historical `transit` prefix on purpose: a large set of existing e2e
 * checks selects `#transit-date`, `#transit-time`, `#transit-choice` and
 * friends, so the shared control must keep rendering exactly those ids — the
 * same reason the shared person picker kept the `team-*` ids. A second host
 * passes its own prefix (the Sleep chart uses `dream-transit`), which also keeps
 * ids unique when both controls are in the document at once.
 *
 * Markup belongs to the module, not to `index.html`: the host supplies an empty
 * container, so a new caller cannot drift from the Transits view's markup and
 * the two never duplicate a template. `.tl-toolbar`, `.tl-zone`, `.tl-sr-only`
 * and `.tl-mode-toggle` are reused as-is, and the host carries the `tl` class so
 * `src/features/transit-timeline/timeline.css` styles the row the same way in
 * both places.
 *
 * Localised labels are marked with `data-i18n`, so `translatePage()` handles a
 * language change with no extra hook here; the status line holds numbers only.
 */

import { transitInstants, formatTransitOffset } from './transit-time.js';
import { setMessage } from './i18n.js';

const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const markup = (id, { showModeToggle }) => `
  <div class="tl-toolbar">
    <label><span data-i18n="Date">Date</span><input type="date" id="${id('date')}"></label>
    <label><span data-i18n="Time">Time</span><input type="time" id="${id('time')}" step="1"></label>
    <div class="tl-toolbar-actions">
      <span class="tl-zone"><span data-i18n="Timezone">Timezone</span> <output id="${id('timezone')}"></output></span>
      <button id="${id('now')}" type="button" data-action="transit-now" data-i18n="Now">Now</button>
      ${showModeToggle ? `<button id="${id('only-toggle')}" type="button" class="tl-mode-toggle" data-action="toggle-transit-mode" aria-pressed="false" data-i18n="Transit only">Transit only</button>` : ''}
    </div>
  </div>
  <label id="${id('choice-label')}" class="tl-choice-label" hidden><span data-i18n="Choose UTC offset">Choose UTC offset</span> <select id="${id('choice')}" class="tl-choice"></select></label>
  <p id="${id('status')}" class="tl-sr-only tl-time-status" aria-live="polite"></p>`;

/**
 * Mount the control into an empty host element.
 *
 * @param {object} options
 * @param {HTMLElement} options.host - container the control renders into
 * @param {string} [options.idPrefix] - element id prefix; `transit` keeps the historical ids
 * @param {(selection: object|null) => void} [options.onChange] - resolved moment, or null when the wall time is invalid
 * @param {boolean} [options.showModeToggle] - offer the transit-only mode (Transits view only)
 * @param {(pressed: boolean) => void} [options.onModeToggle] - the mode button changed
 * @returns {{ getSelection: () => object, getResolved: () => object|null, getInstant: () => number|null,
 *   isTransitOnly: () => boolean, resolve: () => object|null, setNow: () => object|null,
 *   reportError: (message: string) => void, destroy: () => void }}
 */
export function mountTransitTimeControl({
  host,
  idPrefix = 'transit',
  onChange = () => {},
  showModeToggle = false,
  onModeToggle = () => {}
} = {}) {
  if (!host) return null;
  const id = name => `${idPrefix}-${name}`;
  host.innerHTML = markup(id, { showModeToggle });

  const dateInput = host.querySelector(`#${id('date')}`);
  const timeInput = host.querySelector(`#${id('time')}`);
  const zoneOutput = host.querySelector(`#${id('timezone')}`);
  const nowButton = host.querySelector(`#${id('now')}`);
  const choiceLabel = host.querySelector(`#${id('choice-label')}`);
  const choice = host.querySelector(`#${id('choice')}`);
  const status = host.querySelector(`#${id('status')}`);
  const modeButton = showModeToggle ? host.querySelector(`#${id('only-toggle')}`) : null;

  /** The last successfully resolved moment, so a host can read it without re-resolving. */
  let resolved = null;
  const abort = new AbortController();
  const listen = (node, type, handler) => node?.addEventListener(type, handler, { signal: abort.signal });

  function showError(source) {
    status.classList.remove('tl-sr-only');
    setMessage(status, source);
  }

  /**
   * Resolve the widgets to a UTC instant, keeping the DST rules in one place: a
   * gap reports that the local time does not exist, a fold offers both offsets
   * and remembers the reader's pick for as long as it stays valid.
   */
  function resolve() {
    const date = dateInput.value;
    let time = timeInput.value;
    if (time.length === 5) time += ':00';
    const zone = zoneOutput.value.trim();
    let matches;
    try {
      matches = transitInstants(date, time, zone);
      if (!matches.length) throw new Error('This local time does not exist in that timezone. Choose another time.');
    } catch (error) {
      showError(error instanceof RangeError ? 'Enter a valid IANA timezone.' : error.message);
      choiceLabel.hidden = true;
      resolved = null;
      return null;
    }

    const selected = matches.find(m => String(m.instant) === choice.value) || matches[0];
    choiceLabel.hidden = matches.length < 2;
    choice.innerHTML = matches.map(m => `<option value="${m.instant}">${formatTransitOffset(m.offset)} (${new Date(m.instant).toISOString()})</option>`).join('');
    choice.value = String(selected.instant);
    status.classList.add('tl-sr-only');
    delete status.dataset.i18n;
    status.textContent = `${date} · ${time} · ${zone} (${formatTransitOffset(selected.offset)}) · ${new Date(selected.instant).toISOString().replace('.000Z', 'Z')}`;
    resolved = { date, time, zone, instant: selected.instant, offset: selected.offset };
    return resolved;
  }

  function commit({ notify = true } = {}) {
    const next = resolve();
    if (notify) onChange(next);
    return next;
  }

  /** "Now" in the zone currently shown, so a reader who switched zone stays there. */
  function setNow({ notify = true } = {}) {
    const zone = zoneOutput.value || browserZone();
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).map(part => [part.type, part.value]));
    dateInput.value = `${parts.year}-${parts.month}-${parts.day}`;
    timeInput.value = `${parts.hour}:${parts.minute}:${parts.second}`;
    zoneOutput.value = zone;
    zoneOutput.textContent = zone;
    return commit({ notify });
  }

  listen(dateInput, 'change', () => commit());
  listen(timeInput, 'change', () => commit());
  listen(choice, 'change', () => commit());
  listen(nowButton, 'click', () => setNow());
  listen(modeButton, 'click', () => {
    const pressed = modeButton.getAttribute('aria-pressed') !== 'true';
    modeButton.setAttribute('aria-pressed', String(pressed));
    onModeToggle(pressed);
  });

  // Seed the widgets without notifying: a host that is not on screen yet has
  // nothing to redraw, and its first render reads `getInstant()` instead.
  setNow({ notify: false });

  return {
    /** The widgets' raw values, as typed. */
    getSelection: () => ({ date: dateInput.value, time: timeInput.value, zone: zoneOutput.value.trim() }),
    /**
     * The last resolved moment: the raw selection plus the instant and the UTC
     * offset that the DST rule settled on, or null when it did not resolve. A
     * caller that prints the moment needs the offset, which the raw selection
     * cannot know.
     */
    getResolved: () => resolved,
    getInstant: () => resolved?.instant ?? null,
    isTransitOnly: () => modeButton?.getAttribute('aria-pressed') === 'true',
    resolve: () => resolve(),
    setNow: () => setNow(),
    /** A calculation failure is reported where the time is, as a time problem. */
    reportError: message => showError(message),
    destroy: () => {
      abort.abort();
      host.replaceChildren();
      resolved = null;
    }
  };
}
