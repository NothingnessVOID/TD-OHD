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

test('new share omits direct identity and preserves calculation inputs', () => {
  const out = paramsToBirth(birthToParams(full).toString());
  assert.equal(out.name, null);
  assert.equal(out.location, null);
  assert.equal(out.birthDate, full.birthDate);
  assert.equal(out.birthTime, full.birthTime);
  assert.equal(out.timezone, full.timezone);
  assert.deepEqual([...birthToParams(full).keys()], ['d', 't', 'tz']);
  assert.deepEqual(paramsToBirth(birthToParams(full, { includeIdentity: true }).toString()), full);
});

test('minimal: date only', () => {
  const out = paramsToBirth('d=1990-06-15');
  assert.equal(out.birthDate, '1990-06-15');
  assert.equal(out.birthTime, '12:00');
  assert.equal(out.timezone, 0);
  assert.equal(out.location, null);
  assert.equal(out.name, null);
});

test('rejects malformed dates', () => {
  assert.equal(paramsToBirth('d=junk'), null);
  assert.equal(paramsToBirth('t=14:30'), null);
  assert.equal(paramsToBirth(''), null);
});

test('rejects malformed explicit time, zone and coordinates', () => {
  assert.equal(paramsToBirth('d=1990-06-15&t=banana&tz=soup'), null);
  assert.equal(paramsToBirth('d=1990-02-31&t=12:00&tz=0'), null);
  assert.equal(paramsToBirth('d=1990-06-15&t=12:00&tz=0x10'), null);
  assert.equal(paramsToBirth('d=1990-06-15&t=12:00&tz=0&lat=900&lon=0'), null);
  assert.equal(paramsToBirth('d=1990-06-15&t=12:00&tz=0&lat=12oops&lon=0'), null);
});

test('fractional timezone offsets survive', () => {
  const out = paramsToBirth('d=1985-03-20&t=08:00&tz=5.5');
  assert.equal(out.timezone, 5.5);
});

test('timeUnknown round-trips', () => {
  const out = paramsToBirth(birthToParams({ ...full, timeUnknown: true }).toString());
  assert.equal(out.timeUnknown, true);
  assert.equal(paramsToBirth('d=1990-06-15').timeUnknown, false);
});
