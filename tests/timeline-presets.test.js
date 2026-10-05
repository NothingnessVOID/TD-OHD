import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, MAX_TIMELINE_SPAN, calculateTimeline, calculateTimelineAsync } from '../src/features/transit-timeline/core.js';
import { RANGE_OPTIONS, presetWindow } from '../src/features/transit-timeline/presets.js';
import { wallTime } from '../src/features/transit-timeline/time.js';
import { transitInstants } from '../src/lib/transit-time.js';

const at = iso => Date.parse(iso);
const resolve = (date, time, zone) => transitInstants(date, time, zone)[0].instant;

test('the one-day preset covers the selected local calendar date', () => {
  assert.deepEqual(RANGE_OPTIONS.map(([value]) => value), ['1', '3', '7', '30', '90', '180', 'year', 'past-year']);
  const instant = resolve('2026-09-24', '01:45:00', 'Asia/Shanghai');
  const window = presetWindow(instant, '1', 'Asia/Shanghai', transitInstants);
  assert.deepEqual(window, { start: at('2026-09-23T16:00:00Z'), end: at('2026-09-24T16:00:00Z') });
  assert.equal(window.end - window.start, DAY);
  assert.deepEqual(presetWindow(resolve('2026-09-24', '23:59:00', 'Asia/Shanghai'), '1', 'Asia/Shanghai', transitInstants), window);
  const spring = presetWindow(resolve('2026-03-08', '03:30:00', 'America/New_York'), '1', 'America/New_York', transitInstants);
  assert.deepEqual(spring, { start: at('2026-03-08T05:00:00Z'), end: at('2026-03-09T04:00:00Z') });
  const fall = presetWindow(resolve('2026-11-01', '01:30:00', 'America/New_York'), '1', 'America/New_York', transitInstants);
  assert.deepEqual(fall, { start: at('2026-11-01T04:00:00Z'), end: at('2026-11-02T05:00:00Z') });
});

test('3, 7, 30, 90 and 180 days use complete Shanghai calendar dates with one context day and N forward dates', () => {
  const morning = resolve('2026-09-24', '09:50:00', 'Asia/Shanghai');
  const evening = resolve('2026-09-24', '23:30:00', 'Asia/Shanghai');
  const expected = Object.fromEntries([3,7,30,90,180].map(n => [n, [
    '2026-09-22T16:00:00Z', new Date(at('2026-09-23T16:00:00Z') + n * DAY).toISOString()
  ]]));
  for (const [preset, [start, end]] of Object.entries(expected)) {
    const window = { start: at(start), end: at(end) };
    assert.deepEqual(presetWindow(morning, preset, 'Asia/Shanghai', transitInstants), window);
    assert.deepEqual(presetWindow(evening, preset, 'Asia/Shanghai', transitInstants), window);
  }
});

test('natural-day windows include 23- and 25-hour New York DST dates', () => {
  const spring = resolve('2026-03-08', '03:30:00', 'America/New_York');
  const springWindow = presetWindow(spring, '3', 'America/New_York', transitInstants);
  assert.deepEqual(springWindow, { start: at('2026-03-07T05:00:00Z'), end: at('2026-03-11T04:00:00Z') });
  assert.equal((springWindow.end - springWindow.start) / 3_600_000, 95);
  const fall = resolve('2026-11-01', '01:30:00', 'America/New_York');
  const fallWindow = presetWindow(fall, '3', 'America/New_York', transitInstants);
  assert.deepEqual(fallWindow, { start: at('2026-10-31T04:00:00Z'), end: at('2026-11-04T05:00:00Z') });
  assert.equal((fallWindow.end - fallWindow.start) / 3_600_000, 97);
});

test('a skipped local date resolves to the next existing day boundary', () => {
  const instant = resolve('2011-12-31', '12:00:00', 'Pacific/Apia');
  const window = presetWindow(instant, '3', 'Pacific/Apia', transitInstants);
  assert.equal(wallTime(window.start, 'Pacific/Apia').date, '2011-12-31');
  assert.equal(wallTime(window.end, 'Pacific/Apia').date, '2012-01-03');
});

test('year presets include complete selected and anniversary dates in UTC and Shanghai', () => {
  for (const zone of ['UTC', 'Asia/Shanghai']) {
    const selected = resolve('2026-10-05', '16:42:15', zone);
    const future = presetWindow(selected, 'year', zone, transitInstants);
    const past = presetWindow(selected, 'past-year', zone, transitInstants);
    assert.deepEqual(future, { start: resolve('2026-10-05', '00:00:00', zone), end: resolve('2027-10-06', '00:00:00', zone) });
    assert.deepEqual(past, { start: resolve('2025-10-05', '00:00:00', zone), end: resolve('2026-10-06', '00:00:00', zone) });
    for (const preset of ['year', 'past-year']) {
      const window = presetWindow(selected, preset, zone, transitInstants);
      assert.deepEqual(presetWindow(resolve('2026-10-05', '23:59:59', zone), preset, zone, transitInstants), window);
      assert.equal(wallTime(window.end - 1000, zone).time, '23:59:59');
      assert.equal(wallTime(window.end, zone).time, '00:00:00');
    }
  }
});

test('February 29 clamps the anniversary date and retains the whole final date', () => {
  for (const zone of ['UTC', 'Asia/Shanghai', 'America/New_York']) {
    const leap = resolve('2024-02-29', '12:34:56', zone);
    const future = presetWindow(leap, 'year', zone, transitInstants);
    assert.deepEqual(future, { start: resolve('2024-02-29', '00:00:00', zone), end: resolve('2025-03-01', '00:00:00', zone) });
    const past = presetWindow(leap, 'past-year', zone, transitInstants);
    assert.deepEqual(past, { start: resolve('2023-02-28', '00:00:00', zone), end: resolve('2024-03-01', '00:00:00', zone) });
    assert.equal(past.end - past.start, 367 * DAY);
  }
  const lastDay = presetWindow(at('2026-12-31T23:59:59Z'), 'past-year', 'UTC', transitInstants);
  assert.deepEqual(lastDay, { start: at('2025-12-31T00:00:00Z'), end: at('2027-01-01T00:00:00Z') });
});

test('calendar years preserve complete 23- and 25-hour anniversary dates across New York DST', () => {
  const zone = 'America/New_York';
  const spring = presetWindow(resolve('2025-03-08', '02:30:00', zone), 'year', zone, transitInstants);
  assert.deepEqual(spring, { start: at('2025-03-08T05:00:00Z'), end: at('2026-03-09T04:00:00Z') });
  assert.equal(spring.end - spring.start, 366 * DAY - 3600000);
  assert.equal(spring.end - resolve('2026-03-08', '00:00:00', zone), 23 * 3600000);
  const fall = presetWindow(resolve('2025-11-01', '01:30:00', zone), 'year', zone, transitInstants);
  assert.deepEqual(fall, { start: at('2025-11-01T04:00:00Z'), end: at('2026-11-02T05:00:00Z') });
  assert.equal(fall.end - fall.start, 366 * DAY + 3600000);
  assert.equal(fall.end - resolve('2026-11-01', '00:00:00', zone), 25 * 3600000);
  const leapFold = presetWindow(resolve('2023-11-04', '16:42:15', zone), 'year', zone, transitInstants);
  assert.equal(leapFold.end - leapFold.start, 367 * DAY + 3600000);
  assert.ok(leapFold.end - leapFold.start <= MAX_TIMELINE_SPAN);
  const past = presetWindow(resolve('2027-11-01', '01:30:00', zone), 'past-year', zone, transitInstants);
  assert.deepEqual(past, { start: at('2026-11-01T04:00:00Z'), end: at('2027-11-02T04:00:00Z') });
});

test('calendar year boundaries handle skipped dates and midnight DST gaps', () => {
  const zone = 'Pacific/Apia';
  const future = presetWindow(resolve('2010-12-29', '12:00:00', zone), 'year', zone, transitInstants);
  assert.deepEqual(wallTime(future.end, zone), { date: '2011-12-31', time: '00:00:00' });
  const past = presetWindow(resolve('2012-12-30', '12:00:00', zone), 'past-year', zone, transitInstants);
  assert.deepEqual(wallTime(past.start, zone), { date: '2011-12-31', time: '00:00:00' });
  assert.deepEqual(wallTime(past.end, zone), { date: '2012-12-31', time: '00:00:00' });
  const midnightGap = presetWindow(resolve('2018-10-15', '12:00:00', 'America/Sao_Paulo'), 'past-year', 'America/Sao_Paulo', transitInstants);
  assert.deepEqual(wallTime(midnightGap.start, 'America/Sao_Paulo'), { date: '2017-10-15', time: '01:00:00' });
});

test('the minimal 368-day ceiling admits a leap year plus historical 24-hour rollback', async () => {
  const range = presetWindow(at('1891-08-01T00:00:00Z'), 'year', 'Pacific/Apia', transitInstants);
  assert.deepEqual(range, { start: at('1891-07-31T11:26:56Z'), end: at('1892-08-02T11:26:56Z') });
  assert.equal(range.end - range.start, 368 * DAY);
  assert.equal(MAX_TIMELINE_SPAN, range.end - range.start);
  const request = { ...range, snapshot: () => ({}), states: () => new Map(), catalog: [], scanStep: DAY };
  assert.equal(calculateTimeline(request).end, range.end);
  assert.equal((await calculateTimelineAsync(request)).end, range.end);
  assert.throws(() => calculateTimeline({ ...request, end: range.end + 1 }), RangeError);
  await assert.rejects(calculateTimelineAsync({ ...request, end: range.end + 1 }), RangeError);
});

test('invalid presets and instants fail clearly', () => {
  assert.throws(() => presetWindow(0, 'hours6', 'UTC', transitInstants), RangeError);
  assert.throws(() => presetWindow(Number.NaN, 'year', 'UTC', transitInstants), RangeError);
});
