import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Astronomy from 'astronomy-engine';
import { calculateBirthPositions } from 'natalengine';
import { computeChart, toDecimalHour } from '../src/lib/chartdata.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/variable-v1.json', import.meta.url)));
const sources = {
  determination: ['design', 'sun'], environment: ['design', 'northNode'],
  motivation: ['personality', 'sun'], perspective: ['personality', 'northNode'],
};

test('all 1440 birth minutes reach astronomy-engine at the requested minute', () => {
  const date = '2000-05-10';
  for (let minuteOfDay = 0; minuteOfDay < 1440; minuteOfDay++) {
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    const clock = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const input = toDecimalHour(clock);
    const positions = calculateBirthPositions(2000, 5, 10, input, 0, null, null, { preserveSeconds: true });
    const exactDate = new Date(Date.UTC(2000, 4, 10, hour, minute));
    const expected = Astronomy.Ecliptic(Astronomy.GeoVector('Sun', exactDate, true)).elon;
    assert.equal(positions.sun.longitude, expected, `${date} ${clock}`);
  }
  for (const clock of ['00:01', '01:01', '07:59', '12:30', '18:47', '23:59']) {
    const [hour, minute] = clock.split(':').map(Number);
    assert.equal(Math.round(toDecimalHour(clock) * 60), hour * 60 + minute, clock);
  }
});

test('pinned Variable fixtures preserve source, longitude, subdivisions and arrow', () => {
  const coveredTones = new Set();
  for (const fixture of fixtures.cases) {
    const chart = computeChart(fixture).chart;
    assert.equal(chart.type.name, fixture.type);
    assert.equal(chart.authority.name, fixture.authority);
    assert.equal(chart.profile.numbers, fixture.profile);
    assert.equal(chart.variable.notation, fixture.notation);
    for (const [key, expected] of Object.entries(fixture.arrows)) {
      assert.deepEqual([expected.source, expected.planet], sources[key], key);
      const actual = chart.gates[expected.source][expected.planet];
      for (const field of ['gate', 'line', 'color', 'tone', 'base'])
        assert.equal(actual[field], expected[field], `${fixture.birthDate} ${key} ${field}`);
      assert.ok(Math.abs(actual.longitude - expected.longitude) < 1e-8);
      assert.equal(chart.variable[key].color, actual.color);
      assert.equal(chart.variable[key].tone, actual.tone);
      assert.equal(chart.variable[key].arrow, expected.arrow);
      assert.equal(expected.arrow, expected.tone <= 3 ? 'left' : 'right');
      coveredTones.add(expected.tone);
    }
  }
  assert.deepEqual([...coveredTones].sort(), [1, 2, 3, 4, 5, 6]);
});

test('the app chart adapter uses the minute-preserving engine path', () => {
  const sample = { birthDate: '2000-05-10', birthTime: '01:01', timezone: 8 };
  const chart = computeChart(sample).chart;
  const expected = calculateBirthPositions(2000, 5, 10, toDecimalHour(sample.birthTime), 8,
    null, null, { preserveSeconds: true });
  assert.equal(chart.positions.personality.sun.longitude, expected.sun.longitude);
});

test('changing Color does not flip a Variable arrow when Tone is unchanged', () => {
  const byTone = new Map();
  for (let day = 1; day <= 31; day++) {
    const chart = computeChart({ birthDate: `2000-05-${String(day).padStart(2, '0')}`,
      birthTime: '12:30', timezone: 8 }).chart;
    const { color, tone, arrow } = chart.variable.determination;
    const entries = byTone.get(tone) || [];
    entries.push({ color, arrow });
    byTone.set(tone, entries);
  }
  for (let tone = 1; tone <= 6; tone++) {
    const entries = byTone.get(tone) || [];
    assert.ok(new Set(entries.map(entry => entry.color)).size >= 2,
      `Tone ${tone} should occur under different Colors`);
    assert.deepEqual([...new Set(entries.map(entry => entry.arrow))],
      [tone <= 3 ? 'left' : 'right']);
  }
});
