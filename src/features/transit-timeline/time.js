export function wallTime(instant, zone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(instant).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}:${parts.second}` };
}

export function displayTime(instant, zone, locale = 'en-GB', compact = false) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZoneName: 'shortOffset', ...(compact ? {} : { year: 'numeric', second: '2-digit' }), hourCycle: 'h23'
  }).format(instant);
}

/**
 * Compact text for the detail sheet's timing summary. The range keeps the same
 * start/end/context structure at every length: only the values change. A date
 * is shared below the clocks on one local day; on different days each boundary
 * carries its own date. The UTC offsets appear once in the context line, or as
 * a transition when daylight-saving time changes inside the range.
 */
export function formatCompactTimingRange(start, end, zone, locale = 'en-GB') {
  const startDate = wallTime(start, zone).date;
  const endDate = wallTime(end, zone).date;
  const sameDay = startDate === endDate;
  const crossesYear = startDate.slice(0, 4) !== endDate.slice(0, 4);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: zone, month: 'short', day: 'numeric', ...(crossesYear ? { year: 'numeric' } : {})
  });
  const clockFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const offsetFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, timeZoneName: 'shortOffset'
  });
  const offset = instant => offsetFormatter.formatToParts(instant)
    .find(part => part.type === 'timeZoneName').value;
  const startOffset = offset(start);
  const endOffset = offset(end);
  const offsetValue = startOffset === endOffset ? startOffset : `${startOffset} → ${endOffset}`;
  const boundary = instant => sameDay
    ? clockFormatter.format(instant)
    : `${dateFormatter.format(instant)} ${clockFormatter.format(instant)}`;

  return {
    summaryStartValue: boundary(start),
    summaryEndValue: boundary(end),
    contextValue: sameDay ? `${dateFormatter.format(start)} · ${offsetValue}` : offsetValue,
    contextTitle: `${zone} · ${offsetValue}`
  };
}

/** Format a nonnegative duration with localized day, hour and minute units. */
export function formatDuration(durationMs, t) {
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new RangeError('Invalid duration');
  if (durationMs === 0) return t('durationZero');
  const totalMinutes = Math.floor(durationMs / 60_000);
  if (totalMinutes === 0) return t('durationUnderMinute');
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor(totalMinutes % (24 * 60) / 60);
  const minutes = totalMinutes % 60;
  return [
    days && t(days === 1 ? 'durationDay' : 'durationDays', { count: days }),
    hours && t(hours === 1 ? 'durationHour' : 'durationHours', { count: hours }),
    minutes && t(minutes === 1 ? 'durationMinute' : 'durationMinutes', { count: minutes })
  ].filter(Boolean).join(' ');
}
