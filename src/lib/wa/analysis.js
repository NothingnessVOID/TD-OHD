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

function collectPair(pair, activationsByGate) {
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
export function analyzeWa(snapshot, preparedMembers = []) {
  const layoutValidation = validateWaLayout(snapshot);
  const base = { modelVersion: 'wa-structure-v1', organizationId: snapshot?.organizationId ?? null,
    revision: snapshot?.revision ?? null, revisionId: snapshot?.revisionId ?? null,
    capabilities: WA_CAPABILITIES, layoutValidation };
  if (!layoutValidation.ready) return { ...base, status: 'layout_not_ready', issues: layoutValidation.issues };
  const { memberIds, poolMemberIds } = layoutValidation;
  const issues = [];
  if (!Array.isArray(preparedMembers)) return { ...base, status: 'not_ready', issues: [{ code: 'INVALID_PREPARED_MEMBERS' }] };
  if (!memberIds.length) issues.push({ code: 'NO_PARTICIPANTS' });
  const wanted = new Set(memberIds);
  const prepared = new Map();
  for (const member of preparedMembers) {
    if (!wanted.has(member?.memberId)) continue;
    if (prepared.has(member.memberId)) issues.push({ code: 'DUPLICATE_PREPARED_MEMBER', memberId: member.memberId });
    prepared.set(member.memberId, member);
  }
  const activationsByMember = new Map();
  const estimatedMemberIds = [];
  const uncertainMemberIds = [];
  for (const memberId of memberIds) {
    const member = prepared.get(memberId);
    if (!member) { issues.push({ code: 'MISSING_PREPARED_MEMBER', memberId }); continue; }
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
    catch (error) { issues.push({ code: error.code ?? 'INVALID_CHART', memberId, path: error.path, message: error.message }); }
    if (member.timeUnknown || member.birthTimeConfidence === 'estimated') estimatedMemberIds.push(memberId);
    if (member.timeUnknown || ['estimated', 'unknown', 'not_recorded'].includes(member.birthTimeConfidence)) uncertainMemberIds.push(memberId);
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
  return { ...base, status: 'ready', issues: [], alphaId: snapshot.alphaId, memberIds, poolMemberIds, members, pentas,
    communication: { pairs, missingGateIds: numeric(new Set(pairs.flatMap(pair => pair.missingGates))),
      incompletePairIds: pairs.filter(pair => pair.missingGates.length).map(pair => pair.channelId) },
    uncertainty: { certaintyMode: 'single_chart_conditional', estimatedMemberIds, uncertainMemberIds, intervalSupported: false },
    layout: schematic(snapshot, memberIds, poolMemberIds) };
}

const delta = (before, after) => ({ added: after.filter(value => !before.includes(value)), removed: before.filter(value => !after.includes(value)) });
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const placement = (result, id) => id === result.alphaId ? { kind: 'alpha' }
  : result.pentas.some(group => group.memberIds.includes(id))
    ? { kind: 'penta', pentaId: result.pentas.find(group => group.memberIds.includes(id)).pentaId }
    : result.poolMemberIds.includes(id) ? { kind: 'pool' } : null;

/** Compare ready results from one organization. All joins use stable IDs, never labels/order. */
export function diffWa(previous, next) {
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
  return { status: 'ready', organizationId: next.organizationId, participants,
    addedMemberIds: participants.added, removedMemberIds: participants.removed,
    pool: delta(previous.poolMemberIds, next.poolMemberIds),
    alpha: { changed: previous.alphaId !== next.alphaId, from: previous.alphaId, to: next.alphaId },
    reassignments, pentas, communication: { pairs, missingGateIds: delta(previous.communication.missingGateIds, next.communication.missingGateIds),
      incompletePairIds: delta(previous.communication.incompletePairIds, next.communication.incompletePairIds) } };
}
