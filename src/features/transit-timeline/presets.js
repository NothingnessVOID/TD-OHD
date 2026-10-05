import { DAY } from './core.js';
import { wallTime } from './time.js';

export const RANGE_OPTIONS = [
  ['1', 'hours24'], ['3', 'days3'], ['7', 'days7'], ['30', 'days30'],
  ['90', 'days90'], ['180', 'days180'],
  ['year', 'year1'], ['past-year', 'pastYear1'],
];

/** Match the local anniversary, clamping February 29 and resolving DST edges. */
function calendarShift(instant, months, zone, resolveTime) {
  const wall = wallTime(instant, zone);
  const [year, month, day] = wall.date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetDay = Math.min(day, new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate());
  const local = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), targetDay, ...wall.time.split(':').map(Number));
  const originalOffset = (Date.parse(`${wall.date}T${wall.time}Z`) - instant) / 3600000;
  // If the anniversary falls in a spring-forward gap, use its next valid minute.
  for (let minute = 0; minute <= 180; minute++) {
    const candidate = new Date(local + minute * 60000).toISOString();
    const matches = resolveTime(candidate.slice(0, 10), candidate.slice(11, 19), zone);
    if (matches.length) return (matches.find(value => value.offset === originalOffset) || matches[0]).instant;
  }
  throw new RangeError('Could not resolve the anniversary in this timezone');
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
  if (preset === 'year') return {
    start: instant,
    end: calendarShift(instant, 12, zone, resolveTime)
  };
  if (preset === 'past-year') {
    const end = instant + 1000; // Include the selected second in the exclusive range.
    return { start: calendarShift(instant, -12, zone, resolveTime), end };
  }
  const currentDate = wallTime(instant, zone).date;
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
