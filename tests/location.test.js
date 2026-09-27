import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offsetForZone, formatOffset, searchPlaces } from '../src/lib/location.js';

test('US Mountain time: DST summer vs winter', () => {
  assert.equal(offsetForZone('1990-06-15', '14:30', 'America/Denver'), -6); // MDT
  assert.equal(offsetForZone('1990-01-15', '14:30', 'America/Denver'), -7); // MST
});

test('half-hour and 45-minute zones', () => {
  assert.equal(offsetForZone('1985-03-20', '08:00', 'Asia/Kolkata'), 5.5);
  assert.equal(offsetForZone('1990-06-15', '12:00', 'Asia/Kathmandu'), 5.75);
});

test('historical: British Double Summer Time (WWII)', () => {
  // Summer 1944 the UK ran at UTC+2
  assert.equal(offsetForZone('1944-06-15', '12:00', 'Europe/London'), 2);
  // Normal modern summer is +1
  assert.equal(offsetForZone('1990-06-15', '12:00', 'Europe/London'), 1);
});

test('historical: US year-round DST in 1974 (energy crisis)', () => {
  // January 1974: DST in effect nationwide
  assert.equal(offsetForZone('1974-01-15', '12:00', 'America/New_York'), -4);
  assert.equal(offsetForZone('1973-01-15', '12:00', 'America/New_York'), -5);
});

test('southern hemisphere DST', () => {
  assert.equal(offsetForZone('1990-01-15', '12:00', 'Australia/Sydney'), 11); // AEDT
  assert.equal(offsetForZone('1990-06-15', '12:00', 'Australia/Sydney'), 10); // AEST
});

test('zones without DST', () => {
  assert.equal(offsetForZone('2000-06-15', '12:00', 'Asia/Tokyo'), 9);
  assert.equal(offsetForZone('2000-12-15', '12:00', 'America/Phoenix'), -7);
});

test('midnight handling', () => {
  assert.equal(offsetForZone('1990-06-15', '00:00', 'America/Denver'), -6);
  assert.equal(offsetForZone('1990-06-15', '23:59', 'America/Denver'), -6);
});

test('formatOffset', () => {
  assert.equal(formatOffset(-7), 'UTC-7');
  assert.equal(formatOffset(5.5), 'UTC+5:30');
  assert.equal(formatOffset(0), 'UTC+0');
  assert.equal(formatOffset(5.75), 'UTC+5:45');
});

test('place search passes query language and preserves IANA zone', async () => {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(new URL(url));
    return { ok: true, json: async () => ({ results: [{
      name: '東京', admin1: '東京都', country: '日本', latitude: 35.7,
      longitude: 139.7, timezone: 'Asia/Tokyo', country_code: 'JP'
    }] }) };
  };
  try {
    const result = await searchPlaces('とうきょう');
    assert.equal(calls[0].searchParams.get('language'), 'ja');
    assert.equal(result[0].timezone, 'Asia/Tokyo');
    assert.match(result[0].label, /東京/);
  } finally { globalThis.fetch = previous; }
});
