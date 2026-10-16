import { pentaRecords } from './penta-foundation.js';
import { getKnowledgeSummary } from './registry.js';
import { pentaPackage, PENTA_CONTENT_SOURCE, readPentaContent } from './content/penta.js';

const reviewed = slot => slot?.reviewStatus === 'reviewed' && Boolean(slot.content?.trim());
function mode(objectId, reviewStatus, p) {
  if (reviewStatus !== 'reviewed') return null;
  // Package content cannot borrow an old verified structural status.
  if (p.contentPackage != null) {
    return p.contentPackage === pentaPackage.contentPackage && p.contentVersion === pentaPackage.contentVersion
      && p.interpretationStatus === 'editorial-reviewed'
      && p.editorialReview?.status === 'complete' && p.editorialReview.actor === pentaPackage.editorialReview.actor
      && Array.isArray(p.sourceRefs) && p.sourceRefs.length > 0
      && p.sourceRefs.every(ref => typeof ref.sourceId === 'string' && Object.hasOwn(pentaPackage.sourceRegistry, ref.sourceId)
        && typeof ref.locator === 'string' && Boolean(ref.locator.trim())
        && typeof (ref.scope ?? ref.use) === 'string' && Boolean((ref.scope ?? ref.use).trim())) ? 'editorial' : null;
  }
  return p.evidence?.status === 'verified'
    && (!/^(gate|channel):/.test(objectId) || p.interpretationStatus === 'verified') ? 'verified' : null;
}
function accepted(slot, policy, objectId, field) {
  return reviewed(slot) && (policy === 'editorial'
    ? slot.sourceId === PENTA_CONTENT_SOURCE && slot.evidenceStatus === 'editorial-reviewed'
      && slot.content === readPentaContent(objectId, field, slot.locale)
    : policy === 'verified' && slot.evidenceStatus === 'verified');
}
export function qualifyPentaEntry(entry) {
  if (!entry) return null;
  const policy = mode(entry.objectId, entry.reviewStatus, entry.properties);
  if (!policy) return null;
  return { ...entry, summary: accepted(entry.summary, policy, entry.objectId, 'summary') ? entry.summary : null,
    detail: accepted(entry.detail, policy, entry.objectId, 'detail') ? entry.detail : null };
}
/** Summary is genuinely lazy: neither full-entry nor Detail getter is called. */
export function readPentaSummary(objectId) {
  const record = pentaRecords.find(item => item.objectId === objectId);
  if (!record) return null;
  const policy = mode(objectId, record.reviewStatus, record.properties());
  if (!policy) return null;
  const slot = getKnowledgeSummary({ domain: 'human-design', objectType: 'penta', objectId });
  return accepted(slot, policy, objectId, 'summary') ? slot : null;
}
