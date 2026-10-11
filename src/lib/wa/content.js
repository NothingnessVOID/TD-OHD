import records from './content-data.json' with { type: 'json' };

/** Wa owns this catalog. These aliases do not alter ordinary channel knowledge. */
export const WA_CONTENT_ALIASES = Object.freeze({ '21-45':'45-21', '25-51':'51-25', '2-14':'2-14', '3-60':'3-60', '6-59':'59-6', '27-50':'27-50' });
export const WA_PAIR_IDS = Object.freeze(Object.keys(WA_CONTENT_ALIASES));
const clone = value => structuredClone(value);
export function readWaContent(id, locale = 'en') {
  const packageId = WA_CONTENT_ALIASES[id] || id;
  const record = records.find(item => item.objectId === packageId || item.id === id);
  if (!record) return null;
  const localized = record.locales[locale] || record.locales.en;
  return { ...clone(record), ...clone(localized), canonicalId: Object.keys(WA_CONTENT_ALIASES).find(key => WA_CONTENT_ALIASES[key] === record.objectId) || record.objectId, packageId: record.objectId };
}
export function listWaContent(locale = 'en') { return records.map(record => readWaContent(record.objectId, locale)); }
export function waPairLabel(id, locale = 'en') {
  const entry = readWaContent(id, locale);
  return entry ? `${entry.canonicalId} ${entry.name.replace(/^\d+[–-]\d+\s*/, '')}` : id;
}
