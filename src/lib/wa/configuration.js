import { createUuid } from '../uuid.js';
import { assertWaSnapshot, createWaMember, reconcileWaAnnotations, WA_ROLES, WaModelError } from './model.js';

const fail = (code, message, issues = []) => { throw new WaModelError(code, message, issues); };
const owns = (object, key) => Object.hasOwn(object, key);

/** Fill absent roles only. Existing groups, identities and annotations are untouched. */
export function ensureWaComposerSlots(snapshot) {
  assertWaSnapshot(snapshot);
  const next = structuredClone(snapshot);
  for (const role of WA_ROLES) {
    if (!next.pentas.some(group => group.role === role)) {
      next.pentas.push({ pentaId: createUuid(), role, title: '', memberIds: [] });
    }
  }
  return assertWaSnapshot(next);
}

/** Resolve one saved Team group to person references, never Team member identities. */
export function waPersonIdsFromTeamGroup(team, pentaId) {
  const group = team?.groups?.find(item => item.pentaId === pentaId);
  if (!group) fail('UNKNOWN_PENTA', 'The saved Penta group is unavailable.');
  const ids = group.memberIds.map(memberId => {
    const member = team.members.find(item => item.memberId === memberId);
    if (!member?.personId) fail('MISSING_PERSON_REFERENCE', 'The saved group contains a missing person reference.');
    return member.personId;
  });
  if (new Set(ids).size !== ids.length) fail('DUPLICATE_PERSON_ID', 'A saved group contains duplicate people.');
  if (ids.length > 5) fail('GROUP_TOO_LARGE', 'A Penta group may contain at most five people.');
  return ids;
}

/**
 * Pure atomic replacement. Omitting a field preserves it; alphaPersonId:null clears Alpha.
 * peopleMap is a Map (or personId-keyed object). Existing missing references may stay;
 * newly introduced references must resolve. Pool members and all birth records survive.
 * Annotation cleanup is explicit; callers retain the before snapshot as history.
 */
export function replaceWaSelection(snapshot, patch, peopleMap, { confirmAnnotationCleanup = false } = {}) {
  assertWaSnapshot(snapshot);
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)
    || Object.keys(patch).some(key => !['alphaPersonId', 'groups', 'title'].includes(key))) {
    fail('INVALID_SELECTION', 'Expected an Alpha, group or title selection.');
  }
  const next = structuredClone(snapshot);
  const person = id => peopleMap instanceof Map ? peopleMap.get(id) : peopleMap?.[id];
  const memberFor = personId => {
    if (typeof personId !== 'string' || !personId.trim()) fail('MISSING_PERSON_REFERENCE', 'A personId is required.');
    let member = next.members.find(item => item.personId === personId);
    if (!member) {
      const record = person(personId);
      if (!record || typeof record.name !== 'string' || !record.name.trim()) {
        fail('MISSING_PERSON_REFERENCE', 'Save the person before selecting them.', [{ personId }]);
      }
      member = createWaMember({ personId, labelSnapshot: record.name });
      next.members.push(member);
    }
    return member.memberId;
  };
  if (owns(patch, 'title')) next.title = patch.title;
  if (owns(patch, 'alphaPersonId')) next.alphaId = patch.alphaPersonId === null ? null : memberFor(patch.alphaPersonId);
  if (owns(patch, 'groups')) {
    if (!Array.isArray(patch.groups)) fail('INVALID_SELECTION', 'groups must be an array.');
    const changed = new Set();
    for (const selection of patch.groups) {
      const group = next.pentas.find(item => item.pentaId === selection?.pentaId);
      if (!group) fail('UNKNOWN_PENTA', 'The target Penta is unavailable.');
      if (changed.has(group.pentaId)) fail('INVALID_SELECTION', 'A target may be changed only once per patch.');
      changed.add(group.pentaId);
      if (!Array.isArray(selection.personIds)) fail('INVALID_SELECTION', 'personIds must be an array.');
      if (selection.personIds.length > 5) fail('GROUP_TOO_LARGE', 'A Penta group may contain at most five people.');
      if (new Set(selection.personIds).size !== selection.personIds.length) fail('DUPLICATE_PERSON_ID', 'Select each person once.');
      group.memberIds = selection.personIds.map(memberFor);
      if (owns(selection, 'title')) group.title = selection.title;
    }
  }
  // Check the complete replacement before reconciliation. Never silently move anyone.
  const assignments = new Map();
  if (next.alphaId) assignments.set(next.alphaId, 'alpha');
  for (const group of next.pentas) {
    for (const memberId of group.memberIds) {
      if (assignments.has(memberId)) {
        const member = next.members.find(item => item.memberId === memberId);
        fail('SELECTION_CONFLICT', 'This person is already assigned to another target.', [
          { personId: member.personId, memberId, targets: [assignments.get(memberId), group.pentaId] }
        ]);
      }
      assignments.set(memberId, group.pentaId);
    }
  }
  return reconcileWaAnnotations(next, { confirmAnnotationCleanup });
}
