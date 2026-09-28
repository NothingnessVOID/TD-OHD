import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offsetForZone, formatOffset, searchPlaces, isCityPlace } from '../src/lib/location.js';

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
      longitude: 139.7, timezone: 'Asia/Tokyo', country_code: 'JP', feature_code: 'PPLC', population: 9733276
    }] }) };
  };
  try {
    const result = await searchPlaces('とうきょう');
    assert.equal(calls[0].searchParams.get('language'), 'ja');
    assert.equal(result[0].timezone, 'Asia/Tokyo');
    assert.match(result[0].label, /東京/);
  } finally { globalThis.fetch = previous; }
});

test('city candidates exclude village duplicates even for the same Shanghai name', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ results: [
    { name: '上海', admin1: '云南', country: '中国', feature_code: 'PPL', latitude: 26.1, longitude: 100.1, timezone: 'Asia/Shanghai' },
    { name: '上海', admin1: '上海市', country: '中国', feature_code: 'PPLA', population: 24874500, latitude: 31.2, longitude: 121.5, timezone: 'Asia/Shanghai' },
    { name: '上海', admin1: '四川', country: '中国', feature_code: 'PPL', latitude: 30.1, longitude: 104.1, timezone: 'Asia/Shanghai' },
    { name: '上海', admin1: '浙江', country: '中国', feature_code: 'PPL', latitude: 29.1, longitude: 120.1, timezone: 'Asia/Shanghai' },
    { name: '上海街区', admin1: '上海市', country: '中国', feature_code: 'PPLX', population: 500000, latitude: 31.2, longitude: 121.5, timezone: 'Asia/Shanghai' }
  ] }) });
  try {
    const places = await searchPlaces('上海');
    assert.equal(places.length, 1);
    assert.match(places[0].label, /上海市/);
  } finally { globalThis.fetch = previous; }
  assert.equal(isCityPlace({ feature_code: 'PPL', population: 22000, latitude: 1, longitude: 1, timezone: 'UTC' }), true);
  assert.equal(isCityPlace({ feature_code: 'PPLF', population: 22000, latitude: 1, longitude: 1, timezone: 'UTC' }), false);
});

test('place search handles no results and network failure without fallback candidates', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ results: [] }) });
    assert.deepEqual(await searchPlaces('Nobodyville'), []);
    globalThis.fetch = async () => { throw new Error('network unavailable'); };
    await assert.rejects(searchPlaces('Shanghai'), /network unavailable/);
  } finally { globalThis.fetch = previous; }
});
