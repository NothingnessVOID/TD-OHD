import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTransitGates } from 'natalengine';
import { transitInstants, engineTransitArguments } from '../src/lib/transit-time.js';

test('Shanghai wall time resolves to the intended UTC instant, including 45-minute zones', () => {
  assert.equal(new Date(transitInstants('2026-09-23', '14:30', 'Asia/Shanghai')[0].instant).toISOString(), '2026-09-23T06:30:00.000Z');
  assert.equal(new Date(transitInstants('2026-09-23', '14:30', 'Asia/Kathmandu')[0].instant).toISOString(), '2026-09-23T08:45:00.000Z');
});

test('DST gap is rejected and repeated hour offers both instants', () => {
  assert.deepEqual(transitInstants('2026-03-08', '02:30', 'America/New_York'), []);
  const matches = transitInstants('2026-11-01', '01:30', 'America/New_York');
  assert.deepEqual(matches.map(m => new Date(m.instant).toISOString()), [
    '2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z'
  ]);
});

test('engine receives the selected minute and changes transit output during the day', () => {
  const times = ['08:00', '14:00', '20:00'].map(time => {
    const instant = transitInstants('2026-09-23', time, 'Asia/Shanghai')[0].instant;
    const [date, offset] = engineTransitArguments(instant);
    return calculateTransitGates(date, offset);
  });
  assert.deepEqual(times.map(t => `${t.gates.moon.gate}.${t.gates.moon.line}`), ['13.3', '13.6', '49.4']);
  // 20:00 in Shanghai is the engine's legacy date-only default: noon UTC.
  assert.deepEqual(times[2].gates, calculateTransitGates('2026-09-23').gates);
});

test('historical DST, half-hour zones and midnight use the selected date', () => {
  for (const [date, time, zone, expected] of [
    ['1944-06-15', '12:00', 'Europe/London', '1944-06-15T10:00:00.000Z'],
    ['2026-09-23', '00:00', 'Asia/Kolkata', '2026-09-22T18:30:00.000Z'],
    ['2026-01-15', '12:00', 'America/New_York', '2026-01-15T17:00:00.000Z'],
    ['2026-07-15', '12:00', 'America/New_York', '2026-07-15T16:00:00.000Z']
  ]) {
    assert.equal(new Date(transitInstants(date, time, zone)[0].instant).toISOString(), expected);
  }
});

test('same wall time in different zones changes the engine instant', () => {
  const shanghai = transitInstants('2026-09-23', '14:30', 'Asia/Shanghai')[0].instant;
  const london = transitInstants('2026-09-23', '14:30', 'Europe/London')[0].instant;
  assert.equal((london - shanghai) / 3600000, 7);
});
