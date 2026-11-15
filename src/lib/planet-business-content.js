// Planetary business (BG5) copy for the planet detail "business" lens.
// One locale-first table; a locale never falls back to another language, and an
// unknown planet id never invents content. Textbook source coordinates and the
// per-planet editorial changes are maintenance records, not runtime data:
// see docs/development/PLANET_BUSINESS_CONTENT.md.
import source from './planet-business-content.json' with { type: 'json' };
import { PLANET_REFERENCE_IDS } from './planet-reference.js';

export const PLANET_BUSINESS_LOCALES = Object.freeze(['zh-CN', 'zh-Hant', 'en']);

const text = value => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** Stable ids come from the canonical planet order, not from the copy table. */
export function hasPlanetBusinessContent(planet) {
  return PLANET_REFERENCE_IDS.includes(planet);
}

export function planetBusinessCopy(planet, locale) {
  if (!hasPlanetBusinessContent(planet)) return null;
  const table = PLANET_BUSINESS_LOCALES.includes(locale) ? source[locale] : null;
  const entry = table && typeof table === 'object' ? table[planet] : null;
  const theme = text(entry?.theme);
  const body = text(entry?.body);
  return theme && body ? { theme, body } : null;
}
