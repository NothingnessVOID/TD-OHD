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

/** Search the same Open-Meteo endpoint as the engine with the query language. */
export async function searchPlaces(query, count = 8, { signal } = {}) {
  const locale = getLocale();
  const languages = /[\u3040-\u30ff]/u.test(query) ? ['ja', 'en']
    : /[\u3400-\u9fff]/u.test(query) ? ['zh', 'ja', 'en']
      : [locale.startsWith('zh') ? 'zh' : 'en', 'en'];
  for (const language of [...new Set(languages)]) {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({ name: query, count: String(count), language, format: 'json' });
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);
    const data = await response.json();
    const places = (data.results || []).map(item => ({
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
