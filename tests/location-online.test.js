import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces } from '../src/lib/location.js';

test('online: multilingual city search uses the live Open-Meteo index', { skip: !process.env.OHD_ONLINE_TESTS }, async () => {
  const cases = [
    ['上海', 'CN'], ['Shanghai', 'CN'], ['東京', 'JP'], ['Tokyo', 'JP'],
    ['Москва', 'RU'], ['Moscow', 'RU'], ['München', 'DE'], ['Munich', 'DE'],
    ['القاهرة', 'EG'], ['Cairo', 'EG']
  ];
  for (const [query, country] of cases) {
    const places = await searchPlaces(query);
    assert.equal(places[0]?.countryCode, country, `${query}: primary city`);
    assert.ok(places[0]?.timezone, `${query}: IANA timezone`);
    if (query === '上海') assert.ok(places.every(place =>
      !/云南|四川|浙江/.test(place.label)), 'Shanghai village names must not be offered');
  }
});
