import { DAY } from './core.js';
import { wallTime } from './time.js';

export const RANGE_OPTIONS = [
  ['1', 'hours24'], ['3', 'days3'], ['7', 'days7'], ['30', 'days30'],
  ['90', 'days90'], ['180', 'days180'],
  ['year', 'year1'], ['past-year', 'pastYear1'],
];

/** Shift only the local calendar date; clamp February 29 to February 28. */
function calendarYearDateShift(date, years) {
  const [year, month, day] = date.split('-').map(Number);
  const targetYear = year + years;
  const targetDay = Math.min(day, new Date(Date.UTC(targetYear, month, 0)).getUTCDate());
  return new Date(Date.UTC(targetYear, month - 1, targetDay)).toISOString().slice(0, 10);
}

function localDayBoundary(date, zone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const localDate = instant => {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  let low = utcMidnight - 2 * DAY;
  let high = utcMidnight + 3 * DAY;
  while (high - low > 1) {
    const middle = low + Math.floor((high - low) / 2);
    if (localDate(middle) < date) low = middle;
    else high = middle;
  }
  // A skipped local date resolves to the first instant of the next date.
  return high;
}

function shiftDate(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

export function presetWindow(instant, preset, zone, resolveTime) {
  if (!Number.isFinite(instant) || !RANGE_OPTIONS.some(([value]) => value === preset)) {
    throw new RangeError('Invalid timeline preset');
  }
  const currentDate = wallTime(instant, zone).date;
  if (preset === 'year') return {
    start: localDayBoundary(currentDate, zone),
    end: localDayBoundary(shiftDate(calendarYearDateShift(currentDate, 1), 1), zone)
  };
  if (preset === 'past-year') return {
    start: localDayBoundary(calendarYearDateShift(currentDate, -1), zone),
    end: localDayBoundary(shiftDate(currentDate, 1), zone)
  };
  if (preset === '1') return {
    start: localDayBoundary(currentDate, zone),
    end: localDayBoundary(shiftDate(currentDate, 1), zone)
  };
  // [previous local midnight, selected local date + N midnight).
  // N future-facing dates plus one context date; DST days need not be 24h.
  const daysBefore = 1;
  const daysAfter = Number(preset);
  return {
    start: localDayBoundary(shiftDate(currentDate, -daysBefore), zone),
    end: localDayBoundary(shiftDate(currentDate, daysAfter), zone)
  };
}
