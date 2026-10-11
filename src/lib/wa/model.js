import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from './schema.json' with { type: 'json' };
import { createUuid } from '../uuid.js';
import { createMember } from '../human-design/team-members.js';

export const WA_SCHEMA = 'wa-refs-v1';
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

/** Shape first, then relation semantics. Incomplete standard drafts remain valid. */
export function validateWaSnapshot(snapshot) {
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
  for (const entry of snapshot.manualMetadata?.powerBases ?? []) {
    if (!members.has(entry.memberId)) issues.push(issue('UNKNOWN_METADATA_MEMBER', 'manualMetadata.powerBases', entry.memberId));
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
  if (!validation.valid) return { ...validation, ready: false, standardTemplateSatisfied: false, memberIds: [], poolMemberIds: [], groups: [] };
  const assigned = new Set(snapshot.pentas.flatMap(group => group.memberIds));
  if (snapshot.alphaId !== null) assigned.add(snapshot.alphaId);
  const groups = snapshot.pentas.map(group => ({ pentaId: group.pentaId, role: group.role,
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
  return { valid: true, ready, status: standardTemplateSatisfied ? 'valid_standard_layout'
    : snapshot.layoutMode === 'observation' ? 'outside_standard_template' : 'layout_not_ready',
  standardTemplateSatisfied, issues: deviations, groups,
  memberIds: [...assigned].sort(), poolMemberIds: snapshot.members.map(member => member.memberId).filter(id => !assigned.has(id)).sort() };
}

/** Pure atomic move. target=null puts a member in the pool; {alpha:true} replaces Alpha. */
export function moveWaMember(snapshot, memberId, target = null) {
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
  return assertWaSnapshot(next);
}

export function removeWaMember(snapshot, memberId) {
  const next = moveWaMember(snapshot, memberId, null);
  next.members = next.members.filter(member => member.memberId !== memberId);
  if (next.manualMetadata?.powerBases) next.manualMetadata.powerBases = next.manualMetadata.powerBases.filter(entry => entry.memberId !== memberId);
  return assertWaSnapshot(next);
}
