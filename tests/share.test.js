import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthToParams, paramsToBirth } from '../src/lib/share.js';

const full = {
  name: 'Alex',
  birthDate: '1990-06-15',
  birthTime: '14:30',
  timeUnknown: false,
  timezone: -6,
  location: {
    lat: 39.7392,
    lon: -104.9847,
    timezone: -6,
    iana: 'America/Denver',
    name: 'Denver, Colorado, United States'
  }
};

test('round-trips full birth data', () => {
  const out = paramsToBirth(birthToParams(full).toString());
  assert.deepEqual(out, full);
});

test('minimal unknown-time link needs an explicit UTC offset', () => {
  const out = paramsToBirth('d=1990-06-15&tz=0');
  assert.equal(out.birthDate, '1990-06-15');
  assert.equal(out.birthTime, '12:00');
  assert.equal(out.timezone, 0);
  assert.equal(out.location, null);
  assert.equal(out.name, null);
  assert.equal(out.timeUnknown, true);
});

test('rejects malformed dates', () => {
  assert.throws(() => paramsToBirth('d=junk'), /valid birth date/);
  assert.equal(paramsToBirth('t=14:30'), null);
  assert.equal(paramsToBirth(''), null);
});

test('bad date, time and timezone never become a plausible noon UTC chart', () => {
  assert.throws(() => paramsToBirth('d=1990-02-30&t=12:00&tz=8'), /valid birth date/);
  assert.throws(() => paramsToBirth('d=1990-06-15&t=banana&tz=8'), /valid birth time/);
  assert.throws(() => paramsToBirth('d=1990-06-15&t=14:30&tz=soup'), /UTC offset/);
  assert.throws(() => paramsToBirth('d=1990-06-15&t=14:30'), /UTC offset/);
  assert.throws(() => paramsToBirth('d=1990-06-15&t=14:30&tz=8junk'), /UTC offset/);
});

test('fractional timezone offsets survive', () => {
  const out = paramsToBirth('d=1985-03-20&t=08:00&tz=5.5');
  assert.equal(out.timezone, 5.5);
});

test('timeUnknown round-trips', () => {
  const out = paramsToBirth(birthToParams({ ...full, timeUnknown: true }).toString());
  assert.equal(out.timeUnknown, true);
  assert.equal(paramsToBirth('d=1990-06-15&tz=8').timeUnknown, true);
});

test('zero birth seconds normalize, nonzero seconds demand explicit confirmation', () => {
  assert.equal(paramsToBirth('d=2000-02-29&t=01:45:00&tz=8').birthTime, '01:45');
  assert.throws(() => paramsToBirth('d=2000-02-29&t=01:45:30&tz=8'), /Confirm the birth minute/);
});
