/** Historical IANA offsets resolved through the platform Intl API. */
function wallTimeMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(new Date(utcMs));
  const get = t => parts.find(p => p.type === t)?.value;
  const hour = get('hour') === '24' ? '00' : get('hour'); // midnight quirk
  return Date.parse(`${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}Z`);
}

/**
 * UTC offset (in hours, east positive — e.g. -6 for MDT, +5.5 for IST)
 * in effect in `timeZone` at the given local wall-clock moment.
 *
 * Handles historical DST and offset changes via the platform's IANA data.
 * For wall times that don't exist (spring-forward gap) or exist twice
 * (fall-back), converges to one valid interpretation.
 *
 * @param {string} dateStr - YYYY-MM-DD (local)
 * @param {string} timeStr - HH:MM (local, 24h)
 * @param {string} timeZone - IANA zone, e.g. "America/Denver"
 * @returns {number} offset in hours
 */
export function resolveUtcOffset(dateStr, timeStr, timeZone) {
  const target = Date.parse(`${dateStr}T${timeStr}:00Z`);
  if (Number.isNaN(target)) throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`);
  let utc = target;
  for (let i = 0; i < 3; i++) {
    utc += target - wallTimeMs(utc, timeZone);
  }
  return (target - utc) / 3600000;
}

/** Human-readable offset, e.g. "UTC-7", "UTC+5:30". */
export function formatUtcOffset(hours) {
  const sign = hours < 0 ? '-' : '+';
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

