/**
 * Location & timezone resolution for birth data.
 *
 * Thin re-export of natalengine's timezone module — Open-Meteo geocoding
 * (returns IANA zone) + historical UTC offset resolution via the Intl API.
 * Birth charts are extremely time-sensitive; this handles historical DST,
 * wartime time, and half-hour zones correctly.
 */

import { resolveUtcOffset, formatUtcOffset } from 'natalengine';
import { getLocale } from './i18n.js';

// GeoNames PPL also includes villages. Keep administrative seats and populated
// places large enough to serve as city-level timezone choices.
const CITY_CODES = new Set(['PPLC', 'PPLA', 'PPLA2', 'PPLG']);
export function isCityPlace(item) {
  if (!item?.timezone || !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) return false;
  return CITY_CODES.has(item.feature_code) ||
    ['PPL', 'PPLA3'].includes(item.feature_code) && Number(item.population) >= 15_000;
}

/** Search the same Open-Meteo endpoint as the engine with the query language. */
export async function searchPlaces(query, count = 8, { signal } = {}) {
  const locale = getLocale();
  const term = ({ '東京': 'Tokyo', 'とうきょう': 'Tokyo' })[query.trim()] || query;
  const languages = /[\u3040-\u30ff]/u.test(query) || query.trim() === '東京' ? ['ja', 'en']
    : /[\u3400-\u9fff]/u.test(query) ? ['zh', 'ja', 'en']
      : /[\u0400-\u04ff]/u.test(query) ? ['ru', 'en']
        : /[\u0600-\u06ff]/u.test(query) ? ['ar', 'en']
          : [locale.startsWith('zh') ? 'zh' : 'en', 'en'];
  for (const language of [...new Set(languages)]) {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({ name: term, count: String(Math.min(100, Math.max(count * 4, 20))), language, format: 'json' });
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);
    const data = await response.json();
    const places = (data.results || []).filter(isCityPlace)
      .sort((a, b) => (Number(b.population) || 0) - (Number(a.population) || 0))
      .slice(0, count).map(item => ({
      name: item.name,
      label: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
      latitude: item.latitude, longitude: item.longitude,
      timezone: item.timezone, countryCode: item.country_code
    }));
    if (places.length) return places;
  }
  return [];
}
export const offsetForZone = resolveUtcOffset;
export const formatOffset = formatUtcOffset;
