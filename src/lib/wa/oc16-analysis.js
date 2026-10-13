import { validateWaLayout } from './model.js';
import { prepareWaMembers } from './prepare.js';
import { analyzeWa, collectPair } from './analysis.js';
import { extractTeamActivations } from '../human-design/team-activation.js';
import { OC16_DEPARTMENTS, WA_PILLARS } from './oc16-catalog.js';

const sorted = values => [...new Set(values)].sort();
const provenance = new WeakMap();
const classification = Object.freeze({ classification: 'user-supplied-reference-classification',
  sourceScope: 'supplied_chart_activations', officialMechanics: false,
  structuralStatisticsOnly: true, powerbaseInference: false });
const failure = (base, issues) => ({ ...base, status: 'not_ready', issues });
const observation = snapshot => ({ ...structuredClone(snapshot), layoutMode: 'observation' });

/** Validate the original first: an observation copy must not sanitize unsupported modes or bad JSON. */
export async function prepareWaPreview(snapshot, providers) {
  const layoutValidation = validateWaLayout(snapshot);
  const base = { members: [], layoutValidation, standardTemplateSatisfied: layoutValidation.standardTemplateSatisfied };
  if (!layoutValidation.valid) return failure(base, layoutValidation.issues);
  if (!layoutValidation.memberIds.length) return { ...base, status: 'empty', issues: [] };
  const prepared = await prepareWaMembers(observation(snapshot), providers);
  return { ...prepared, layoutValidation, standardTemplateSatisfied: layoutValidation.standardTemplateSatisfied,
    status: prepared.status === 'ready' ? 'ready' : 'not_ready' };
}

function counts(gateRecords, pairs) {
  const gateCount = gateRecords.filter(record => record.activationCount > 0).length;
  const pairCount = pairs.filter(pair => pair.missingGates.length === 0).length;
  return { gateCount, gateTotal: gateRecords.length, gatePercentage: gateCount / gateRecords.length * 100,
    pairCount, pairTotal: pairs.length, pairPercentage: pairCount / pairs.length * 100,
    contributorIds: sorted(gateRecords.flatMap(record => record.memberIds)) };
}

function coverage(memberIds, activations, scope) {
  const ids = sorted(memberIds);
  const wanted = new Set(ids);
  const byGate = new Map();
  for (const activation of activations) {
    if (!wanted.has(activation.memberId)) continue;
    if (!byGate.has(activation.gate)) byGate.set(activation.gate, []);
    byGate.get(activation.gate).push({ ...activation });
  }
  const pairs = OC16_DEPARTMENTS.flatMap(department => department.pairs.map(pair => {
    const result = collectPair(pair, byGate);
    return { ...pair, ...result, contributorIds: sorted(result.gateRecords.flatMap(record => record.memberIds)) };
  }));
  // Every catalog gate occurs once, so the shared pair collector supplies all 64 gate records.
  const gateRecords = pairs.flatMap(pair => pair.gateRecords)
    .map(record => ({ ...record, contributorIds: [...record.memberIds] })).sort((a, b) => a.gate - b.gate);
  const departments = OC16_DEPARTMENTS.map(department => {
    const departmentPairs = pairs.filter(pair => pair.departmentId === department.id);
    const gates = new Set(departmentPairs.flatMap(pair => pair.gates));
    const records = gateRecords.filter(record => gates.has(record.gate));
    return { ...department, pairs: departmentPairs, gateRecords: records, ...counts(records, departmentPairs) };
  });
  const pillars = WA_PILLARS.map(pillar => {
    const record = gateRecords.find(record => record.gate === pillar.gate);
    return { ...pillar, ...record, present: record.activationCount > 0 };
  });
  return { ...classification, scope, memberIds: ids, gateRecords, pairs, departments, pillars, ...counts(gateRecords, pairs) };
}

/** Original layout diagnostics and activation coverage deliberately have independent readiness. */
export function analyzeOC16(snapshot, prepared = [], options = {}) {
  const layoutValidation = validateWaLayout(snapshot);
  const base = { modelVersion: 'wa-oc16-preview-v1', ...classification, layoutValidation,
    standardTemplateSatisfied: layoutValidation.standardTemplateSatisfied, poolExcluded: true };
  if (!layoutValidation.valid) return failure(base, layoutValidation.issues);
  Object.assign(base, { organizationId: snapshot.organizationId, revision: snapshot.revision,
    revisionId: snapshot.revisionId, alphaId: snapshot.alphaId,
    memberIds: layoutValidation.memberIds, assignedMemberIds: [...layoutValidation.memberIds],
    poolMemberIds: layoutValidation.poolMemberIds });
  const pentaId = options?.pentaId === undefined ? null : options.pentaId;
  const includeAlpha = options?.includeAlpha === undefined ? true : options.includeAlpha;
  if (!options || typeof options !== 'object' || Array.isArray(options)
    || typeof includeAlpha !== 'boolean'
    || (pentaId !== null && !snapshot.pentas.some(group => group.pentaId === pentaId))) {
    return failure(base, [{ code: 'INVALID_OC16_SCOPE' }]);
  }
  const selectedIds = pentaId === null ? base.memberIds.filter(id => includeAlpha || id !== snapshot.alphaId)
    : [...snapshot.pentas.find(group => group.pentaId === pentaId).memberIds,
      ...(includeAlpha && snapshot.alphaId !== null ? [snapshot.alphaId] : [])];
  const scope = pentaId === null ? (includeAlpha ? 'assigned_members' : 'assigned_members_without_alpha')
    : includeAlpha ? 'group_union_manual_alpha' : 'group_members_only';
  let members = prepared;
  if (!Array.isArray(prepared)) {
    if (!prepared || !['ready', 'empty'].includes(prepared.status) || !Array.isArray(prepared.members)) {
      return failure(base, prepared?.issues?.length ? prepared.issues : [{ code: 'INVALID_PREPARED_MEMBERS' }]);
    }
    if (prepared.status === 'empty' && (base.memberIds.length || prepared.members.length)) {
      return failure(base, [{ code: 'INVALID_PREPARED_MEMBERS' }]);
    }
    members = prepared.members;
  }
  const preview = observation(snapshot);
  let coreWa, activations;
  try {
    coreWa = analyzeWa(preview, members);
    // Core WA intentionally rejects no participants. Only that exact empty condition is admitted here.
    const empty = !base.memberIds.length && coreWa.status === 'not_ready'
      && coreWa.issues.length === 1 && coreWa.issues[0].code === 'NO_PARTICIPANTS';
    if (coreWa.status !== 'ready' && !empty) return failure(base, coreWa.issues);
    const byId = new Map(members.map(member => [member.memberId, member]));
    activations = base.memberIds.flatMap(id => extractTeamActivations(byId.get(id)));
    if (empty) coreWa = null;
  } catch (error) {
    return failure(base, [{ code: error?.code ?? 'INVALID_PREPARED_MEMBERS',
      ...(error?.memberId ? { memberId: error.memberId } : {}), message: error?.message ?? String(error) }]);
  }
  const groups = [...preview.pentas].sort((a, b) => a.pentaId < b.pentaId ? -1 : a.pentaId > b.pentaId ? 1 : 0)
    .map(group => ({ pentaId: group.pentaId, role: group.role, title: group.title,
      ...coverage(group.memberIds, activations, 'group_members_only'),
      withAlpha: coverage([...group.memberIds, ...(preview.alphaId === null ? [] : [preview.alphaId])],
        activations, 'group_union_manual_alpha') }));
  const pentas = coreWa?.pentas ?? groups.map(group => ({ pentaId: group.pentaId, role: group.role,
    title: group.title, memberIds: group.memberIds, status: 'outside_standard_template', result: null }));
  const result = { ...base, status: selectedIds.length ? 'ready' : 'empty', issues: [], pentaId, includeAlpha,
    ...coverage(selectedIds, activations, scope), groups, coreWa, pentas };
  provenance.set(result, { memberIds: [...base.memberIds], activations: structuredClone(activations) });
  return result;
}

/** Rebuild from original activation provenance; pool/unknown/duplicate IDs never silently disappear. */
export function scopeOC16(result, memberIds) {
  const source = provenance.get(result);
  if (!source || !['ready', 'empty'].includes(result?.status)) {
    return failure(classification, [{ code: 'READY_OC16_RESULT_REQUIRED' }]);
  }
  if (!Array.isArray(memberIds) || memberIds.some(id => typeof id !== 'string' || !source.memberIds.includes(id))
    || new Set(memberIds).size !== memberIds.length) {
    return failure(classification, [{ code: 'INVALID_SCOPE_MEMBER_IDS' }]);
  }
  return { status: memberIds.length ? 'ready' : 'empty', issues: [],
    ...coverage(memberIds, source.activations, 'selected_members') };
}
