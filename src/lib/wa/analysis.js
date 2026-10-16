import { validateWaLayout } from './model.js';
import { extractTeamActivations } from '../human-design/team-activation.js';
import { analyzePentaStructure } from '../human-design/penta-structure.js';
import { CHANNELS } from '../human-design/catalog.js';

// Canonical endpoints only. Wa display labels and source aliases belong to the content layer.
export const WA_PAIRS = Object.freeze([[21, 45], [25, 51], [2, 14], [3, 60], [6, 59], [27, 50]]
  .map(gates => Object.freeze({ channelId: gates.join('-'), gates: Object.freeze(gates) })));
const supported = version => Object.freeze({ supported: true, version });
const unsupported = reason => Object.freeze({ supported: false, reason });
export const WA_CAPABILITIES = Object.freeze({
  structuralUnion: supported('wa-activation-union-v1'),
  manualAlpha: supported('wa-manual-alpha-v1'),
  groupPenta: supported('penta-structure-v1'),
  observation: supported('wa-observation-v1'),
  custom: unsupported('Custom policy is reserved for a future version.'),
  intervalCertainty: unsupported('A verified interval provider is required.'),
  automaticAlpha: unsupported('No verified automatic Alpha rule.'),
  formalGap: unsupported('Endpoint absence is not a formal Gap rule.'),
  triggering: unsupported('No verified Triggering rule.'),
  automaticPowerBases: unsupported('Only user-authored manual metadata is supported.'),
  authorityScore: unsupported('No verified scoring rule.'),
  fitScore: unsupported('No verified scoring rule.'),
  leadershipScore: unsupported('No verified scoring rule.'),
  ranking: unsupported('Structural counts are not rankings.'),
  formation: unsupported('Engineering layout readiness does not establish formation.')
});
const sorted = values => [...values].sort();
const numeric = values => [...values].sort((a, b) => a - b);
const canonical = gates => numeric(gates).join('-');
const byId = (a, b) => a.pentaId < b.pentaId ? -1 : a.pentaId > b.pentaId ? 1 : 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// Runtime provenance stays outside enumerable v1 results and contains no birth inputs.
const resultActivations = new WeakMap();

function groupCommunication(snapshot, activationsByMember) {
  const view = (ids, scope) => {
    const memberIds = sorted(new Set(ids));
    const byGate = new Map();
    for (const id of memberIds) for (const activation of activationsByMember.get(id) ?? []) {
      if (!byGate.has(activation.gate)) byGate.set(activation.gate, []);
      byGate.get(activation.gate).push({ ...activation });
    }
    return { scope, memberIds, pairs: WA_PAIRS.map(pair => collectPair(pair, byGate)) };
  };
  return { sourceScope: 'supplied_chart_activations', officialMechanics: false,
    groups: [...snapshot.pentas].sort(byId).map(group => ({ pentaId: group.pentaId,
      ...view(group.memberIds, 'group_members_only'),
      withAlpha: view([...group.memberIds, ...(snapshot.alphaId === null ? [] : [snapshot.alphaId])], 'group_union_manual_alpha') })) };
}

export function collectPair(pair, activationsByGate) {
  const [first, second] = pair.gates;
  const gateRecords = pair.gates.map(gate => {
    const activations = activationsByGate.get(gate) ?? [];
    const memberIds = sorted(new Set(activations.map(activation => activation.memberId)));
    return { gate, memberIds, activationCount: activations.length, contributorCount: memberIds.length,
      holders: memberIds.map(memberId => ({ memberId,
        activationCount: activations.filter(activation => activation.memberId === memberId).length })), activations };
  });
  const [left, right] = gateRecords.map(record => record.memberIds);
  const selfCompleteMemberIds = left.filter(id => right.includes(id));
  const complementaryMemberPairs = [];
  for (const firstMemberId of left) for (const secondMemberId of right) {
    if (firstMemberId !== secondMemberId) complementaryMemberPairs.push({ firstMemberId, secondMemberId });
  }
  const missingGates = gateRecords.filter(record => !record.memberIds.length).map(record => record.gate);
  const withinMember = selfCompleteMemberIds.length > 0;
  const acrossMembers = complementaryMemberPairs.length > 0;
  const status = missingGates.length === 2 ? 'absent' : missingGates.length === 1 ? 'hanging'
    : withinMember ? (acrossMembers ? 'both' : 'selfComplete') : 'crossMemberOnly';
  return { channelId: pair.channelId, gates: [...pair.gates], status, missingGates,
    holdersByGate: { [first]: left, [second]: right }, gateRecords,
    selfCompleteMemberIds, complementaryMemberPairs, withinMember, acrossMembers,
    activationCount: gateRecords.reduce((total, record) => total + record.activationCount, 0),
    contributorCount: new Set([...left, ...right]).size,
    derivation: 'internal_activation_union_topology_v1' };
}

function schematic(snapshot, memberIds, poolMemberIds) {
  const encode = value => encodeURIComponent(value);
  const nodes = [];
  const edges = [];
  if (snapshot.alphaId !== null) nodes.push({ nodeId: 'alpha', kind: 'alpha', memberId: snapshot.alphaId, x: 450, y: 75 });
  const centers = { foundation: [200, 300], expansion: [700, 300], coordinating: [450, 680] };
  for (const group of [...snapshot.pentas].sort(byId)) {
    const nodeId = `penta:${encode(group.pentaId)}`;
    const [x, y] = centers[group.role];
    nodes.push({ nodeId, kind: 'penta', pentaId: group.pentaId, role: group.role, x, y });
    if (snapshot.alphaId !== null) edges.push({ edgeId: `alpha:${encode(group.pentaId)}`, from: 'alpha', to: nodeId, kind: 'manual_coordination' });
    const ids = sorted(group.memberIds);
    ids.forEach((memberId, index) => {
      const angle = 2 * Math.PI * index / ids.length - Math.PI / 2;
      const childId = `member:${encode(group.pentaId)}:${encode(memberId)}`;
      nodes.push({ nodeId: childId, kind: 'member', memberId, pentaId: group.pentaId,
        x: x + Math.cos(angle) * 135, y: y + Math.sin(angle) * 135 });
      edges.push({ edgeId: `membership:${encode(group.pentaId)}:${encode(memberId)}`, from: nodeId, to: childId, kind: 'membership' });
    });
  }
  poolMemberIds.forEach((memberId, index) => nodes.push({ nodeId: `unassigned:${encode(memberId)}`, kind: 'pool', memberId, x: 75 + index * 100, y: 940 }));
  return { version: 'schematic-v1', relationshipMeaning: 'manual_organization_only',
    viewBox: [0, 0, Math.max(900, poolMemberIds.length * 100 + 50), 1020], memberIds, poolMemberIds, nodes, edges };
}

/** Runtime-only full Sharp charts. Pool data is deliberately never inspected. */
export function analyzeWa(snapshot, preparedMembers = [], options = {}) {
  const layoutValidation = validateWaLayout(snapshot);
  const base = { modelVersion: 'wa-structure-v1', organizationId: snapshot?.organizationId ?? null,
    revision: snapshot?.revision ?? null, revisionId: snapshot?.revisionId ?? null,
    capabilities: WA_CAPABILITIES, layoutValidation };
  if (!layoutValidation.ready) return { ...base, status: 'layout_not_ready', issues: layoutValidation.issues };
  const { memberIds, poolMemberIds } = layoutValidation;
  const issues = [];
  if (!Array.isArray(preparedMembers)) return { ...base, status: 'not_ready',
    issues: [{ code: 'INVALID_PREPARED_MEMBERS' }], memberIds, poolMemberIds };
  if (!memberIds.length) issues.push({ code: 'NO_PARTICIPANTS' });
  const wanted = new Set(memberIds);
  const prepared = new Map();
  const seen = new Set();
  for (const [index, member] of preparedMembers.entries()) {
    if (!record(member) || typeof member.memberId !== 'string' || !member.memberId.trim()) {
      issues.push({ code: 'INVALID_PREPARED_MEMBER', path: `preparedMembers[${index}]` });
      continue;
    }
    if (seen.has(member.memberId)) issues.push({ code: 'DUPLICATE_PREPARED_MEMBER', memberId: member.memberId });
    seen.add(member.memberId);
    if (wanted.has(member.memberId)) prepared.set(member.memberId, member);
  }
  if (issues.length) return { ...base, status: 'not_ready', issues, memberIds, poolMemberIds };
  const activationsByMember = new Map();
  const estimatedMemberIds = [];
  const uncertainMemberIds = [];
  for (const memberId of memberIds) {
    const member = prepared.get(memberId);
    if (!member) { issues.push({ code: 'MISSING_PREPARED_MEMBER', memberId }); continue; }
    if (member.chartQuality !== undefined && !record(member.chartQuality)) {
      issues.push({ code: 'INVALID_CHART_QUALITY', memberId, path: 'chartQuality' }); continue;
    }
    if (member.chartQuality?.mode === 'interval') {
      issues.push({ code: 'DATA_QUALITY_REQUIRED', memberId, path: 'chartQuality.mode' }); continue;
    }
    if (member.chartQuality?.mode !== undefined && member.chartQuality.mode !== 'single_chart') {
      issues.push({ code: 'INVALID_CHART_QUALITY', memberId, path: 'chartQuality.mode' }); continue;
    }
    if (member.birthTimeConfidence !== undefined && !['exact', 'estimated', 'unknown', 'not_recorded'].includes(member.birthTimeConfidence)) {
      issues.push({ code: 'INVALID_TIME_CONFIDENCE', memberId }); continue;
    }
    if (member.timeUnknown !== undefined && typeof member.timeUnknown !== 'boolean') {
      issues.push({ code: 'INVALID_TIME_UNKNOWN', memberId }); continue;
    }
    try { activationsByMember.set(memberId, extractTeamActivations(member)); }
    catch (error) { issues.push({ code: error?.code ?? 'INVALID_CHART', memberId, path: error?.path,
      message: error?.message ?? String(error) }); }
    if (member.timeUnknown || member.birthTimeConfidence === 'estimated') estimatedMemberIds.push(memberId);
    if (member.timeUnknown || member.birthTimeConfidence === undefined
      || ['estimated', 'unknown', 'not_recorded'].includes(member.birthTimeConfidence)) uncertainMemberIds.push(memberId);
  }
  // Do not produce partial coverage or plausible zero values when any assigned input is unready.
  if (issues.length) return { ...base, status: 'not_ready', issues, memberIds, poolMemberIds };
  const activationsByGate = new Map();
  for (const activations of activationsByMember.values()) for (const activation of activations) {
    if (!activationsByGate.has(activation.gate)) activationsByGate.set(activation.gate, []);
    activationsByGate.get(activation.gate).push(activation);
  }
  const pairs = WA_PAIRS.map(pair => collectPair(pair, activationsByGate));
  const refs = new Map(snapshot.members.map(member => [member.memberId, member]));
  const members = memberIds.map(memberId => {
    const activations = activationsByMember.get(memberId);
    const gates = new Set(activations.map(activation => activation.gate));
    return { ...refs.get(memberId), gateIds: numeric(gates), activationCount: activations.length,
      activeChannelIds: sorted(CHANNELS.filter(channel => channel.gates.every(gate => gates.has(gate))).map(channel => canonical(channel.gates))),
      gateContributions: numeric(gates).map(gate => ({ gate, activationCount: activations.filter(activation => activation.gate === gate).length })),
      pairIds: pairs.filter(pair => pair.gates.some(gate => gates.has(gate))).map(pair => pair.channelId),
      selfCompletePairIds: pairs.filter(pair => pair.selfCompleteMemberIds.includes(memberId)).map(pair => pair.channelId) };
  });
  const pentas = [...snapshot.pentas].sort(byId).map(group => {
    const ids = sorted(group.memberIds);
    const validSize = ids.length >= 3 && ids.length <= 5;
    return { pentaId: group.pentaId, role: group.role, title: group.title, memberIds: ids,
      status: validSize ? 'ready' : 'outside_standard_template',
      result: validSize ? analyzePentaStructure(ids.map(id => prepared.get(id))) : null };
  });
  // Layout's v2 readiness diagnostics must not alter a successful v1 analysis shape.
  const { canAnalyze, participantCount, ...legacyLayoutValidation } = layoutValidation;
  const result = { ...base, layoutValidation: legacyLayoutValidation,
    status: 'ready', issues: [], alphaId: snapshot.alphaId, memberIds, poolMemberIds, members, pentas,
    communication: { pairs, missingGateIds: numeric(new Set(pairs.flatMap(pair => pair.missingGates))),
      incompletePairIds: pairs.filter(pair => pair.missingGates.length).map(pair => pair.channelId) },
    uncertainty: { certaintyMode: 'single_chart_conditional', estimatedMemberIds, uncertainMemberIds, intervalSupported: false },
    layout: schematic(snapshot, memberIds, poolMemberIds) };
  if (options?.includeGroupCommunication === true) result.groupCommunication = groupCommunication(snapshot, activationsByMember);
  if (Object.hasOwn(snapshot, 'consultation')) result.consultation = structuredClone(snapshot.consultation);
  if (Object.hasOwn(snapshot, 'manualCommunicationEdges')) result.manualCommunication = {
    assignment: 'manual', affectsCoverage: false, sourceVerification: 'not_performed', mechanicalActivation: false,
    edges: structuredClone(snapshot.manualCommunicationEdges)
  };
  resultActivations.set(result, structuredClone([...activationsByMember.values()].flat()));
  return result;
}

const delta = (before, after) => ({ added: after.filter(value => !before.includes(value)), removed: before.filter(value => !after.includes(value)) });
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const placement = (result, id) => id === result.alphaId ? { kind: 'alpha' }
  : result.pentas.some(group => group.memberIds.includes(id))
    ? { kind: 'penta', pentaId: result.pentas.find(group => group.memberIds.includes(id)).pentaId }
    : result.poolMemberIds.includes(id) ? { kind: 'pool' } : null;

/** Compare ready results from one organization. All joins use stable IDs, never labels/order. */
export function diffWa(previous, next, options = {}) {
  if (previous?.status !== 'ready' || next?.status !== 'ready') return { status: 'not_ready', issues: [{ code: 'READY_RESULTS_REQUIRED' }] };
  if (previous.organizationId !== next.organizationId) return { status: 'invalid', issues: [{ code: 'ORGANIZATION_MISMATCH' }] };
  const participants = delta(previous.memberIds, next.memberIds);
  const ids = sorted(new Set([...previous.memberIds, ...previous.poolMemberIds, ...next.memberIds, ...next.poolMemberIds]));
  const reassignments = ids.map(memberId => ({ memberId, from: placement(previous, memberId), to: placement(next, memberId) }))
    .filter(change => !equal(change.from, change.to));
  const groupIds = sorted(new Set([...previous.pentas, ...next.pentas].map(group => group.pentaId)));
  const pentas = groupIds.map(pentaId => {
    const before = previous.pentas.find(group => group.pentaId === pentaId) ?? null;
    const after = next.pentas.find(group => group.pentaId === pentaId) ?? null;
    const members = delta(before?.memberIds ?? [], after?.memberIds ?? []);
    return { pentaId, added: before === null, removed: after === null,
      role: { from: before?.role ?? null, to: after?.role ?? null }, members,
      status: { from: before?.status ?? null, to: after?.status ?? null },
      resultChanged: !equal(before?.result, after?.result), before: before?.result ?? null, after: after?.result ?? null };
  }).filter(change => change.added || change.removed || change.role.from !== change.role.to || change.members.added.length
    || change.members.removed.length || change.status.from !== change.status.to || change.resultChanged);
  const pairs = next.communication.pairs.flatMap(after => {
    const before = previous.communication.pairs.find(pair => pair.channelId === after.channelId);
    return equal(before, after) ? [] : [{ channelId: after.channelId, from: before, to: after }];
  });
  const derived = member => member ? { gateIds: member.gateIds, gateContributions: member.gateContributions,
    activeChannelIds: member.activeChannelIds, activationCount: member.activationCount,
    pairIds: member.pairIds, selfCompletePairIds: member.selfCompletePairIds } : null;
  const memberChanges = sorted(new Set([...previous.members, ...next.members].map(member => member.memberId))).flatMap(memberId => {
    const before = derived(previous.members.find(member => member.memberId === memberId));
    const after = derived(next.members.find(member => member.memberId === memberId));
    return equal(before, after) ? [] : [{ memberId, before, after,
      gateIds: delta(before?.gateIds ?? [], after?.gateIds ?? []),
      activeChannelIds: delta(before?.activeChannelIds ?? [], after?.activeChannelIds ?? []) }];
  });
  const result = { status: 'ready', organizationId: next.organizationId, participants, memberChanges,
    addedMemberIds: participants.added, removedMemberIds: participants.removed,
    pool: delta(previous.poolMemberIds, next.poolMemberIds),
    alpha: { changed: previous.alphaId !== next.alphaId, from: previous.alphaId, to: next.alphaId },
    reassignments, pentas, communication: { pairs, missingGateIds: delta(previous.communication.missingGateIds, next.communication.missingGateIds),
      incompletePairIds: delta(previous.communication.incompletePairIds, next.communication.incompletePairIds) } };
  if (options?.includeTrace === true) result.contributionTrace = contributionTrace(previous, next);
  return result;
}

// Identity includes each original endpoint, including line, so a line-only edit is visible.
const activationIdentity = activation => JSON.stringify([
  activation.memberId, activation.side, activation.planet, activation.gate, activation.line
]);

function contributionTrace(previous, next) {
  const metadata = { sourceScope: 'supplied_chart_activations', officialMechanics: false,
    meaning: 'member_and_input_changes_only', performanceCausality: false };
  const before = resultActivations.get(previous);
  const after = resultActivations.get(next);
  // Persisted v1 results omit non-Wa activation detail. Do not invent that provenance.
  if (!before || !after) return { ...metadata, status: 'not_available', reason: 'ANALYZE_RESULTS_REQUIRED' };
  const beforeKeys = new Set(before.map(activationIdentity));
  const afterKeys = new Set(after.map(activationIdentity));
  const added = after.filter(activation => !beforeKeys.has(activationIdentity(activation)));
  const removed = before.filter(activation => !afterKeys.has(activationIdentity(activation)));
  const gates = numeric(new Set([...added, ...removed].map(activation => activation.gate))).map(gate => {
    const from = before.filter(activation => activation.gate === gate);
    const to = after.filter(activation => activation.gate === gate);
    const oldIds = sorted(new Set(from.map(activation => activation.memberId)));
    const newIds = sorted(new Set(to.map(activation => activation.memberId)));
    return { gate, contributors: delta(oldIds, newIds),
      activationCount: { from: from.length, to: to.length, delta: to.length - from.length },
      contributorCount: { from: oldIds.length, to: newIds.length, delta: newIds.length - oldIds.length },
      presence: { from: from.length ? 'present' : 'absent', to: to.length ? 'present' : 'absent' },
      members: sorted(new Set([...oldIds, ...newIds])).flatMap(memberId => {
        const oldActivations = from.filter(activation => activation.memberId === memberId);
        const newActivations = to.filter(activation => activation.memberId === memberId);
        const oldKeys = new Set(oldActivations.map(activationIdentity));
        const newKeys = new Set(newActivations.map(activationIdentity));
        const memberAdded = newActivations.filter(activation => !oldKeys.has(activationIdentity(activation)));
        const memberRemoved = oldActivations.filter(activation => !newKeys.has(activationIdentity(activation)));
        return memberAdded.length || memberRemoved.length ? [{ memberId,
          activationCount: { from: oldActivations.length, to: newActivations.length, delta: newActivations.length - oldActivations.length },
          presence: { from: oldActivations.length ? 'present' : 'absent', to: newActivations.length ? 'present' : 'absent' },
          added: memberAdded, removed: memberRemoved }] : [];
      }) };
  });
  const changedGates = new Set(gates.map(change => change.gate));
  const pairEndpoints = WA_PAIRS.filter(pair => pair.gates.some(gate => changedGates.has(gate))).map(pair => {
    const from = previous.communication.pairs.find(candidate => candidate.channelId === pair.channelId);
    const to = next.communication.pairs.find(candidate => candidate.channelId === pair.channelId);
    return { channelId: pair.channelId, status: { from: from.status, to: to.status },
      endpoints: pair.gates.map(gate => ({ gate,
        holders: delta(from.holdersByGate[gate], to.holdersByGate[gate]),
        activationCount: { from: from.gateRecords.find(record => record.gate === gate).activationCount,
          to: to.gateRecords.find(record => record.gate === gate).activationCount },
        presence: { from: from.holdersByGate[gate].length ? 'present' : 'absent', to: to.holdersByGate[gate].length ? 'present' : 'absent' } })) };
  });
  return structuredClone({ ...metadata, status: 'ready', activations: { added, removed }, gates, pairEndpoints });
}
