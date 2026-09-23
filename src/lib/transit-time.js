const HOUR = 3600000;

/** Resolve a wall time to every matching instant (two during a DST fall-back). */
export function transitInstants(date, time, zone) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall)) throw new Error('Enter a valid date and time.');

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  const partsAt = instant => Object.fromEntries(
    formatter.formatToParts(new Date(instant)).map(p => [p.type, p.value])
  );
  const offsets = new Set();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = wall + hours * HOUR;
    const p = partsAt(sample);
    const shown = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    offsets.add((shown - sample) / HOUR);
  }

  return [...offsets].map(offset => ({ instant: wall - offset * HOUR, offset }))
    .filter(({ instant }) => {
      const p = partsAt(instant);
      return `${p.year}-${p.month}-${p.day}` === date && `${p.hour}:${p.minute}` === time;
    })
    .sort((a, b) => a.instant - b.instant);
}

/** NatalEngine reads a Date through browser-local getters before applying its offset. */
export function engineTransitArguments(instant) {
  const date = new Date(instant);
  return [date, -date.getTimezoneOffset() / 60];
}
