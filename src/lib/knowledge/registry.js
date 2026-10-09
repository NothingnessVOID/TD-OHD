import { foundationRecords, crossRecord } from './human-design-foundation.js';
import { pentaRecords } from './penta-foundation.js';
import { validateKnowledgeEntry } from './schema.js';
import { getLocale } from '../i18n.js';
const key = query => `${query.domain ?? 'human-design'}:${query.objectType}:${query.objectId}`;
const metadata = ({ read, templateRead, presentationRead, ...source }) => ({...source,...(source.file?{file:source.file.replace('{locale}',getLocale())}:{})});
const resolve = reference => {
  if (reference == null) return null;
  const content = reference.read();
  return content == null ? null : ({ ...metadata(reference), content, ...(reference.templateRead ? { template:reference.templateRead() } : {}), ...(reference.presentationRead?.() ? { presentation: reference.presentationRead() } : {}), locale: getLocale() });
};

/** A small reference reader. Summary lookup never resolves Detail. */
export function createKnowledgeReader(records, dynamic = () => null) {
  const byKey = new Map(), ids = new Set();
  for (const record of records) {
    if (ids.has(record.id) || byKey.has(key(record))) throw new TypeError(`Duplicate knowledge identity: ${record.id}`);
    ids.add(record.id); byKey.set(key(record), record);
  }
  const find = query => byKey.get(key(query)) ?? (query.domain == null || query.domain === 'human-design' ? dynamic(query) : null);
  const getKnowledgeSummary = query => {
    const record = find(query);
    if (!record) return null;
    if (query.surface === 'hero') return resolve(record.legacySlots?.heroSummary ?? null);
    return resolve(record.summary); // No fallback to Detail, including when Summary is missing.
  };
  const getKnowledgeDetail = query => resolve(find(query)?.detail ?? null);
  const getKnowledgeEntry = query => {
    const record = find(query);
    if (!record) return null;
    const summary = resolve(record.summary), detail = resolve(record.detail);
    return validateKnowledgeEntry({
      id: record.id, domain: record.domain, objectType: record.objectType, objectId: record.objectId,
      name: record.name.read(), locale: getLocale(), summary, detail, hasSummary: summary !== null, hasDetail: detail !== null,
      summaryStatus: summary ? 'available' : 'missing', detailStatus: detail ? 'available' : 'missing',
      reviewStatus: record.reviewStatus, version: record.version,
      properties: record.properties?.() ?? {},
      legacySlots: Object.fromEntries(Object.entries(record.legacySlots ?? {}).map(([slot, source]) => [slot, resolve(source)])),
      provenance: { name: metadata(record.name), ...(record.identitySource ? { identity: metadata(record.identitySource) } : {}),
        ...(record.propertySource ? { properties: metadata(record.propertySource) } : {}) }
    });
  };
  // Static ID lookup derives from these same records; no hand-maintained route identity map.
  const getKnowledgeEntryById = id => {
    const record = records.find(item => item.id === id);
    return record ? getKnowledgeEntry(record) : null;
  };
  return { getKnowledgeEntry, getKnowledgeEntryById, getKnowledgeSummary, getKnowledgeDetail };
}
const records = [...foundationRecords, ...pentaRecords];
export const { getKnowledgeEntry, getKnowledgeEntryById, getKnowledgeSummary, getKnowledgeDetail } = createKnowledgeReader(records, crossRecord);
// Preserve the original list contract; callers opt into the separate Penta inventory.
export const listKnowledgeEntries = ({ includePenta = false } = {}) =>
  (includePenta ? records : foundationRecords).map(record => getKnowledgeEntry(record));
