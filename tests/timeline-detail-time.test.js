import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCompactTimingRange, formatDuration } from '../src/features/transit-timeline/time.js';
import { translator } from '../src/features/transit-timeline/messages.js';

const at = iso => Date.parse(iso);
const shanghai = 'Asia/Shanghai';

test('same-day timing shares its date and UTC offset below two clock values', () => {
  const start = at('2026-09-29T03:39:00Z');
  const end = at('2026-09-29T13:11:00Z');
  const range = formatCompactTimingRange(start, end, shanghai, 'zh-CN');
  assert.deepEqual(range, {
    summaryStartValue: '11:39',
    summaryEndValue: '21:11',
    contextValue: '9月29日 · GMT+8',
    contextTitle: 'Asia/Shanghai · GMT+8'
  });
  assert.equal(formatCompactTimingRange(start, end, shanghai, 'en-GB').contextValue, '29 Sept · GMT+8');
});

test('cross-day and cross-month timing use the same fields with dates in each boundary', () => {
  const start = at('2026-09-29T03:39:00Z');
  const nextDay = at('2026-09-30T13:11:00Z');
  const multiDay = at('2026-10-02T05:44:00Z');
  assert.deepEqual(formatCompactTimingRange(start, nextDay, shanghai, 'zh-CN'), {
    summaryStartValue: '9月29日 11:39',
    summaryEndValue: '9月30日 21:11',
    contextValue: 'GMT+8',
    contextTitle: 'Asia/Shanghai · GMT+8'
  });
  assert.deepEqual(formatCompactTimingRange(start, multiDay, shanghai, 'zh-CN'), {
    summaryStartValue: '9月29日 11:39',
    summaryEndValue: '10月2日 13:44',
    contextValue: 'GMT+8',
    contextTitle: 'Asia/Shanghai · GMT+8'
  });
  const zh = translator({
    durationDay: '{count} 天', durationDays: '{count} 天',
    durationHour: '{count} 小时', durationHours: '{count} 小时',
    durationMinute: '{count} 分钟', durationMinutes: '{count} 分钟'
  });
  assert.equal(formatDuration(nextDay - start, zh), '1 天 9 小时 32 分钟');
  assert.equal(formatDuration(multiDay - start, zh), '3 天 2 小时 5 分钟');
});

test('cross-year timing identifies both years and English labels remain compact', () => {
  const start = at('2026-12-31T14:30:00Z');
  const end = at('2027-01-01T01:15:00Z');
  const chinese = formatCompactTimingRange(start, end, shanghai, 'zh-CN');
  assert.equal(chinese.summaryStartValue, '2026年12月31日 22:30');
  assert.equal(chinese.summaryEndValue, '2027年1月1日 09:15');
  const english = formatCompactTimingRange(start, end, shanghai, 'en-GB');
  assert.equal(english.summaryStartValue, '31 Dec 2026 22:30');
  assert.equal(english.summaryEndValue, '1 Jan 2027 09:15');
  assert.equal(english.contextValue, 'GMT+8');
});

test('a repeated DST clock hour shows both endpoint offsets once in the context', () => {
  const range = formatCompactTimingRange(
    at('2026-11-01T05:30:00Z'), at('2026-11-01T06:30:00Z'),
    'America/New_York', 'en-GB'
  );
  assert.equal(range.summaryStartValue, '01:30');
  assert.equal(range.summaryEndValue, '01:30');
  assert.equal(range.contextValue, '1 Nov · GMT-4 → GMT-5');
  assert.equal(range.contextTitle, 'America/New_York · GMT-4 → GMT-5');
});
