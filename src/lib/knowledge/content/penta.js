import data from './penta-v1.json' with { type: 'json' };

// Original package records and review passes stay intact in the data file.
export const pentaPackage = data;
export const pentaContentRecords = data.records;
export const PENTA_CONTENT_SOURCE = 'penta-wa-development-v2';
export const PENTA_CONTENT_LOCALES = Object.freeze(['zh-CN', 'zh-Hant', 'en']);
export const pentaContent = Object.freeze(Object.fromEntries(PENTA_CONTENT_LOCALES.map(locale => [
  locale, Object.fromEntries(data.records.map(item => [item.objectId, item.locales[locale]]))
])));

// Resolve exactly one field in exactly one language; never borrow another slot.
export function readPentaContent(objectId, field, locale, content = pentaContent) {
  return content[locale]?.[objectId]?.[field] ?? null;
}

// Plain text only. The UI must insert each returned paragraph via textContent or
// its existing escaping helper; this function deliberately does not emit HTML.
export function pentaTextParagraphs(text) {
  return typeof text === 'string' ? text.split(/\r?\n\s*\r?\n/u).map(part => part.trim()).filter(Boolean) : [];
}
