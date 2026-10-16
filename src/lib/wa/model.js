import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from './schema.json' with { type: 'json' };
import { createUuid } from '../uuid.js';
import { createMember } from '../human-design/team-members.js';

export const WA_SCHEMA = 'wa-refs-v1';
export const WA_ANNOTATED_SCHEMA = 'wa-refs-v2';
export const WA_ANNOTATION_FIELDS = Object.freeze(['manualCommunicationEdges', 'consultation']);
export const WA_ROLES = Object.freeze(['foundation', 'expansion', 'coordinating']);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const checkShape = ajv.compile(schema);
const issue = (code, path, message) => ({ code, path, message });

export class WaModelError extends Error {
  constructor(code, message, issues = []) {
    super(message);
    this.name = 'WaModelError';
    this.code = code;
    this.issues = issues;
  }
}

export function createWaDraft({ organizationId = createUuid(), title = '' } = {}) {
  const draft = {
    kind: 'wa', schema: WA_SCHEMA, organizationId, title,
    revision: 0, revisionId: null, parentRevisionId: null, savedAt: null,
    layoutMode: 'standard', alphaAssignment: 'manual', alphaId: null, members: [],
    pentas: WA_ROLES.map(role => ({ pentaId: createUuid(), role, title: '', memberIds: [] }))
  };
  assertWaSnapshot(draft);
  return draft;
}

/** People must already have a PeopleStore identity; birth is resolved only at runtime. */
export function createWaMember({ personId, labelSnapshot, memberId } = {}) {
  const member = createMember({ personId, displayName: labelSnapshot, memberId, origin: 'saved' });
  return { memberId: member.memberId, personId: member.personId, labelSnapshot: member.displayName };
}

/** Inspect descriptors without invoking getters; reject values JSON would erase or coerce.
 * Iterative traversal rejects cycles and excessive nesting before Ajv or cloning runs. */
export function validateWaPlainJson(value) {
  const active = new Set();
  const stack = [{ value, path: '', depth: 0 }];
  try {
    while (stack.length) {
      const item = stack.pop();
      if (item.exit) { active.delete(item.value); continue; }
      const { value: current, path, depth } = item;
      const invalid = message => ({ valid: false, issues: [issue('NON_JSON_VALUE', path, message)] });
      if (current === null || typeof current === 'string' || typeof current === 'boolean') continue;
      if (typeof current === 'number' && Number.isFinite(current)) continue;
      if (typeof current !== 'object') return invalid('Only plain JSON values are accepted.');
      if (depth > 100) return invalid('JSON nesting exceeds 100 levels.');
      if (active.has(current)) return invalid('Cyclic data is not JSON.');
      const array = Array.isArray(current);
      const prototype = Object.getPrototypeOf(current);
      if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
        return invalid('Only plain objects and arrays are accepted.');
      }
      active.add(current);
      stack.push({ value: current, exit: true });
      const descriptors = Object.getOwnPropertyDescriptors(current);
      const keys = Reflect.ownKeys(descriptors);
      if (array && keys.length !== current.length + 1) return invalid('Sparse arrays and extra array properties are not accepted.');
      for (const key of keys) {
        if (array && key === 'length') continue;
        if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key)) return invalid('Unsafe object key.');
        if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= current.length)) return invalid('Extra array property.');
        const descriptor = descriptors[key];
        if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return invalid('Accessors and hidden properties are not JSON data.');
        stack.push({ value: descriptor.value, path: `${path}/${key}`, depth: depth + 1 });
      }
    }
  } catch {
    return { valid: false, issues: [issue('NON_JSON_VALUE', '', 'Unable to inspect JSON data.')] };
  }
  return { valid: true, issues: [] };
}

/** Shape first, then relation semantics. Incomplete standard drafts remain valid. */
export function validateWaSnapshot(snapshot) {
  const json = validateWaPlainJson(snapshot);
  if (!json.valid) return { ...json, status: 'invalid' };
  if (!checkShape(snapshot)) return {
    valid: false, status: 'invalid',
    issues: checkShape.errors.map(error => issue('SCHEMA_INVALID', error.instancePath, error.message))
  };
  const issues = [];
  const members = new Set();
  const people = new Set();
  for (const member of snapshot.members) {
    if (members.has(member.memberId)) issues.push(issue('DUPLICATE_MEMBER_ID', 'members', member.memberId));
    if (people.has(member.personId)) issues.push(issue('DUPLICATE_PERSON_ID', 'members', member.personId));
    members.add(member.memberId);
    people.add(member.personId);
  }
  const groups = new Set();
  const roles = new Set();
  const assigned = new Set();
  for (const group of snapshot.pentas) {
    if (groups.has(group.pentaId)) issues.push(issue('DUPLICATE_PENTA_ID', 'pentas', group.pentaId));
    if (roles.has(group.role)) issues.push(issue('DUPLICATE_ROLE', 'pentas', group.role));
    groups.add(group.pentaId);
    roles.add(group.role);
    for (const id of group.memberIds) {
      if (!members.has(id)) issues.push(issue('UNKNOWN_GROUP_MEMBER', 'pentas', id));
      if (assigned.has(id)) issues.push(issue('DUPLICATE_GROUP_ASSIGNMENT', 'pentas', id));
      assigned.add(id);
    }
  }
  if (snapshot.alphaId !== null && !members.has(snapshot.alphaId)) issues.push(issue('UNKNOWN_ALPHA', 'alphaId', snapshot.alphaId));
  if (assigned.has(snapshot.alphaId)) issues.push(issue('ALPHA_IN_PENTA', 'alphaId', snapshot.alphaId));
  for (const [index, entry] of (snapshot.manualMetadata?.powerBases ?? []).entries()) {
    if (!members.has(entry.memberId)) issues.push({ ...issue('UNKNOWN_METADATA_MEMBER', `manualMetadata.powerBases/${index}`, entry.memberId), annotation: structuredClone(entry) });
  }
  const participants = new Set(assigned);
  if (snapshot.alphaId !== null) participants.add(snapshot.alphaId);
  const edgeIds = new Set();
  for (const [index, edge] of (snapshot.manualCommunicationEdges ?? []).entries()) {
    if (!participants.has(edge.fromMemberId) || !participants.has(edge.toMemberId)) issues.push({ ...issue('MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT', `manualCommunicationEdges/${index}`, edge.edgeId), annotation: structuredClone(edge) });
    if (edge.fromMemberId === edge.toMemberId) issues.push(issue('MANUAL_EDGE_SELF_LINK', 'manualCommunicationEdges', edge.edgeId));
    if (edgeIds.has(edge.edgeId)) issues.push(issue('DUPLICATE_MANUAL_EDGE', 'manualCommunicationEdges', edge.edgeId));
    edgeIds.add(edge.edgeId);
  }
  const consultation = snapshot.consultation;
  for (const [index, id] of (consultation?.keyAllyIds ?? []).entries()) {
    if (!participants.has(id)) issues.push({ ...issue('ALLY_NOT_PARTICIPANT', `consultation.keyAllyIds/${index}`, id), annotation: id });
  }
  const areas = new Set(), intents = new Set();
  for (const [index, area] of (consultation?.businessAreas ?? []).entries()) {
    if (!groups.has(area.pentaId)) issues.push({ ...issue('CONSULTATION_UNKNOWN_PENTA', `consultation.businessAreas/${index}`, area.pentaId), annotation: structuredClone(area) });
    if (areas.has(area.pentaId)) issues.push(issue('DUPLICATE_BUSINESS_AREA', 'consultation.businessAreas', area.pentaId));
    areas.add(area.pentaId);
  }
  for (const [index, intent] of (consultation?.gapIntents ?? []).entries()) {
    if (!groups.has(intent.pentaId)) issues.push({ ...issue('CONSULTATION_UNKNOWN_PENTA', `consultation.gapIntents/${index}`, intent.pentaId), annotation: structuredClone(intent) });
    if (intents.has(intent.id)) issues.push(issue('DUPLICATE_GAP_INTENT', 'consultation.gapIntents', intent.id));
    intents.add(intent.id);
  }
  if (snapshot.layoutMode === 'custom' || snapshot.customPolicy !== undefined) {
    issues.push(issue('CUSTOM_UNSUPPORTED', 'layoutMode', 'Custom layouts are reserved for a future version.'));
  }
  return { valid: issues.length === 0, status: issues.length ? 'invalid' : 'valid', issues };
}

export function assertWaSnapshot(snapshot) {
  const validation = validateWaSnapshot(snapshot);
  if (!validation.valid) throw new WaModelError('INVALID_SNAPSHOT', 'Invalid Wa reference snapshot.', validation.issues);
  return snapshot;
}

export function validateWaLayout(snapshot) {
  const validation = validateWaSnapshot(snapshot);
  if (!validation.valid) return { ...validation, ready: false, canAnalyze: false, participantCount: 0, standardTemplateSatisfied: false, memberIds: [], poolMemberIds: [], groups: [] };
  const assigned = new Set(snapshot.pentas.flatMap(group => group.memberIds));
  if (snapshot.alphaId !== null) assigned.add(snapshot.alphaId);
  const groups = [...snapshot.pentas].sort((a, b) => a.pentaId < b.pentaId ? -1 : a.pentaId > b.pentaId ? 1 : 0)
    .map(group => ({ pentaId: group.pentaId, role: group.role,
    memberCount: group.memberIds.length, ready: group.memberIds.length >= 3 && group.memberIds.length <= 5 }));
  const deviations = [];
  if (snapshot.alphaId === null) deviations.push(issue('ALPHA_REQUIRED', 'alphaId', 'Choose an Alpha manually.'));
  for (const role of WA_ROLES) {
    if (!groups.some(group => group.role === role)) deviations.push(issue('MISSING_ROLE', 'pentas', role));
  }
  for (const group of groups) if (!group.ready) deviations.push(issue('PENTA_MEMBER_COUNT', group.pentaId, 'A standard group requires 3–5 members.'));
  if (assigned.size < 10 || assigned.size > 16) deviations.push(issue('PARTICIPANT_COUNT', 'members', 'Standard layout requires 10–16 assigned participants.'));
  const standardTemplateSatisfied = deviations.length === 0;
  const ready = standardTemplateSatisfied || snapshot.layoutMode === 'observation';
  return { valid: true, ready, canAnalyze: ready, participantCount: assigned.size, status: standardTemplateSatisfied ? 'valid_standard_layout'
    : snapshot.layoutMode === 'observation' ? 'outside_standard_template' : 'layout_not_ready',
  standardTemplateSatisfied, issues: deviations, groups,
  memberIds: [...assigned].sort(), poolMemberIds: snapshot.members.map(member => member.memberId).filter(id => !assigned.has(id)).sort() };
}

/** Pure atomic move. target=null puts a member in the pool; {alpha:true} replaces Alpha. */
export function moveWaMember(snapshot, memberId, target = null, options = {}) {
  assertWaSnapshot(snapshot);
  if (!snapshot.members.some(member => member.memberId === memberId)) throw new WaModelError('UNKNOWN_MEMBER', memberId);
  if (target !== null && !(typeof target === 'object' && !Array.isArray(target)
    && ((target.alpha === true && Object.keys(target).length === 1)
      || (typeof target.pentaId === 'string' && Object.keys(target).length === 1)))) {
    throw new WaModelError('INVALID_TARGET', 'Use null, {alpha:true}, or {pentaId}.');
  }
  if (target?.pentaId && !snapshot.pentas.some(group => group.pentaId === target.pentaId)) throw new WaModelError('UNKNOWN_PENTA', target.pentaId);
  const next = structuredClone(snapshot);
  next.pentas.forEach(group => { group.memberIds = group.memberIds.filter(id => id !== memberId); });
  if (next.alphaId === memberId) next.alphaId = null;
  if (target?.alpha) next.alphaId = memberId;
  if (target?.pentaId) next.pentas.find(group => group.pentaId === target.pentaId).memberIds.push(memberId);
  return reconcileWaAnnotations(next, options);
}

export function removeWaMember(snapshot, memberId, options = {}) {
  assertWaSnapshot(snapshot);
  if (!snapshot.members.some(member => member.memberId === memberId)) throw new WaModelError('UNKNOWN_MEMBER', memberId);
  const next = structuredClone(snapshot);
  next.pentas.forEach(group => { group.memberIds = group.memberIds.filter(id => id !== memberId); });
  if (next.alphaId === memberId) next.alphaId = null;
  next.members = next.members.filter(member => member.memberId !== memberId);
  return reconcileWaAnnotations(next, options);
}

/** Explicit editing boundary. Never auto-upgrade schema while loading or saving. */
export function updateWaAnnotations(snapshot, patch) {
  assertWaSnapshot(snapshot);
  const json = validateWaPlainJson(patch);
  if (!json.valid || !patch || Array.isArray(patch) || typeof patch !== 'object'
    || Object.keys(patch).some(key => !WA_ANNOTATION_FIELDS.includes(key))) {
    throw new WaModelError('INVALID_ANNOTATION_PATCH', 'Only optional annotation fields may be patched.', json.issues);
  }
  const next = structuredClone(snapshot);
  for (const [key, value] of Object.entries(patch)) next[key] = structuredClone(value);
  next.schema = WA_ANNOTATION_FIELDS.some(key => Object.hasOwn(next, key)) ? WA_ANNOTATED_SCHEMA : WA_SCHEMA;
  return assertWaSnapshot(next);
}

/** Call after a structural edit. Only explicit cleanup may remove human-entered references. */
export function reconcileWaAnnotations(snapshot, { confirmAnnotationCleanup = false } = {}) {
  const validation = validateWaSnapshot(snapshot);
  const referenceCodes = new Set(['MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT', 'ALLY_NOT_PARTICIPANT', 'CONSULTATION_UNKNOWN_PENTA', 'UNKNOWN_METADATA_MEMBER']);
  const references = validation.issues.filter(item => referenceCodes.has(item.code));
  if (validation.issues.some(item => !referenceCodes.has(item.code))) return assertWaSnapshot(snapshot);
  if (!references.length) return assertWaSnapshot(snapshot);
  if (confirmAnnotationCleanup !== true) throw new WaModelError('ANNOTATION_CLEANUP_REQUIRED', 'Explicit confirmation is required to remove referenced annotations.', references);
  const next = structuredClone(snapshot);
  const participants = new Set(next.pentas.flatMap(group => group.memberIds));
  if (next.alphaId !== null) participants.add(next.alphaId);
  const members = new Set(next.members.map(member => member.memberId));
  const groups = new Set(next.pentas.map(group => group.pentaId));
  if (next.manualCommunicationEdges) next.manualCommunicationEdges = next.manualCommunicationEdges.filter(edge => participants.has(edge.fromMemberId) && participants.has(edge.toMemberId));
  if (next.consultation?.keyAllyIds) next.consultation.keyAllyIds = next.consultation.keyAllyIds.filter(id => participants.has(id));
  for (const key of ['businessAreas', 'gapIntents']) {
    if (next.consultation?.[key]) next.consultation[key] = next.consultation[key].filter(entry => groups.has(entry.pentaId));
  }
  if (next.manualMetadata?.powerBases) next.manualMetadata.powerBases = next.manualMetadata.powerBases.filter(entry => members.has(entry.memberId));
  return assertWaSnapshot(next);
}

export function exportWaAnnotations(snapshot) {
  assertWaSnapshot(snapshot);
  return { schema: 'wa-annotations-v1', organizationId: snapshot.organizationId, revision: snapshot.revision,
    revisionId: snapshot.revisionId, parentRevisionId: snapshot.parentRevisionId, savedAt: snapshot.savedAt,
    annotations: Object.fromEntries(WA_ANNOTATION_FIELDS.filter(key => Object.hasOwn(snapshot, key)).map(key => [key, structuredClone(snapshot[key])])) };
}

/** Pure export conversion, never a database version rollback or a storage write. */
export function downgradeWaSnapshot(snapshot, { confirmAnnotationRemoval = false } = {}) {
  assertWaSnapshot(snapshot);
  if (WA_ANNOTATION_FIELDS.some(key => Object.hasOwn(snapshot, key)) && confirmAnnotationRemoval !== true) {
    throw new WaModelError('ANNOTATION_DOWNGRADE_CONFIRMATION_REQUIRED', 'Export annotations and explicitly confirm their removal from the v1 copy.');
  }
  const next = structuredClone(snapshot);
  for (const key of WA_ANNOTATION_FIELDS) delete next[key];
  next.schema = WA_SCHEMA;
  return { snapshot: assertWaSnapshot(next), annotations: exportWaAnnotations(snapshot) };
}
