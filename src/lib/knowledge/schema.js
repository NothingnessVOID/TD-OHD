import { SOURCES } from './sources.js';
export const DOMAINS = Object.freeze(['human-design', 'iching', 'gene-keys', 'meridian', 'td-ohd-extension', 'teacher-extension']);
export const OBJECT_TYPES = Object.freeze(['type', 'authority', 'profile', 'definition', 'cross', 'variable', 'cognition', 'gate', 'line', 'channel', 'center', 'geneKey', 'hexagram', 'meridian']);
export const REVIEW_STATUSES = Object.freeze(['unreviewed', 'reviewed', 'verified', 'custom']);
export function validateKnowledgeEntry(entry) {
  const check = (condition, field) => { if (!condition) throw new TypeError(`Invalid knowledge ${field}: ${entry?.id}`); };
  check(typeof entry?.id === 'string' && /^[a-zA-Z0-9._-]+$/.test(entry.id), 'id');
  check(DOMAINS.includes(entry.domain), 'domain');
  check(OBJECT_TYPES.includes(entry.objectType), 'objectType');
  check(typeof entry.objectId === 'string' && entry.objectId.length > 0, 'objectId');
  check(REVIEW_STATUSES.includes(entry.reviewStatus), 'reviewStatus');
  check(Number.isInteger(entry.version) && entry.version > 0, 'version');
  check(typeof entry.name === 'string', 'name');
  for (const slot of [entry.summary, entry.detail, ...Object.values(entry.legacySlots ?? {})]) {
    if (slot == null) continue;
    check(typeof slot.content === 'string', 'content');
    check(Boolean(SOURCES[slot.sourceId]), 'sourceId');
    check(REVIEW_STATUSES.includes(slot.reviewStatus), 'slot reviewStatus');
    check(Number.isInteger(slot.version) && slot.version > 0, 'slot version');
  }
  for (const reference of Object.values(entry.provenance)) check(Boolean(SOURCES[reference.sourceId]), 'provenance sourceId');
  check(entry.hasSummary === (entry.summary !== null) && entry.hasDetail === (entry.detail !== null), 'availability');
  return entry;
}
