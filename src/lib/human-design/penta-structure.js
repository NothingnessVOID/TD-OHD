import { PENTA_GATES, PENTA_CHANNELS } from './penta-catalog.js';
import { extractTeamActivations, compareTeamActivations, TeamStructureError } from './team-activation.js';

const sorted = values => [...values].sort();

/** Structural coverage only; neither people nor charts are modified. */
export function analyzePentaStructure(members) {
  if (!Array.isArray(members)) {
    throw new TeamStructureError('INVALID_MEMBERS', null, 'members', 'members must be an array of 3–5 members');
  }
  if (members.length < 3 || members.length > 5) {
    throw new TeamStructureError('PENTA_MEMBER_COUNT', null, 'members',
      `Penta requires 3–5 members; received ${members.length}`);
  }
  const ids = new Set();
  const activations = [];
  for (let index = 0; index < members.length; index++) {
    const member = members[index];
    const id = member?.memberId;
    if (typeof id !== 'string' || !id.trim()) {
      throw new TeamStructureError('INVALID_MEMBER_ID', id ?? null, `members[${index}].memberId`,
        'memberId must be a nonempty string');
    }
    if (ids.has(id)) {
      throw new TeamStructureError('DUPLICATE_MEMBER_ID', id, `members[${index}].memberId`, `Duplicate memberId: ${id}`);
    }
    ids.add(id);
    activations.push(...extractTeamActivations(member));
  }
  activations.sort(compareTeamActivations);
  const byGate = new Map();
  for (const activation of activations) {
    if (!byGate.has(activation.gate)) byGate.set(activation.gate, []);
    byGate.get(activation.gate).push(activation);
  }
  const gates = PENTA_GATES.map(cell => {
    const sources = byGate.get(cell.gate) || [];
    const memberIds = sorted(new Set(sources.map(source => source.memberId)));
    return {
      ...cell,
      status: sources.length ? 'present' : 'absent',
      memberIds,
      activations: sources,
      activationCount: sources.length,
      contributorCount: memberIds.length
    };
  });
  const memberIdsByGate = new Map(gates.map(cell => [cell.gate, cell.memberIds]));
  const channels = PENTA_CHANNELS.map(channel => {
    const [upper, lower] = channel.gates;
    const upperIds = memberIdsByGate.get(upper);
    const lowerIds = memberIdsByGate.get(lower);
    const lowerSet = new Set(lowerIds);
    const selfCompleteMemberIds = upperIds.filter(id => lowerSet.has(id));
    // Endpoint identity is explicit; upper and lower must be different members.
    const complementaryMemberPairs = upperIds.flatMap(upperMemberId => lowerIds
      .filter(lowerMemberId => lowerMemberId !== upperMemberId)
      .map(lowerMemberId => ({ upperMemberId, lowerMemberId })));
    const missingGates = channel.gates.filter(gate => memberIdsByGate.get(gate).length === 0);
    const status = missingGates.length ? 'absent' : selfCompleteMemberIds.length
      ? (complementaryMemberPairs.length ? 'both' : 'selfComplete') : 'crossMemberOnly';
    return {
      channelId: channel.channelId,
      gates: channel.gates,
      holdersByGate: { [upper]: upperIds, [lower]: lowerIds },
      missingGates,
      selfCompleteMemberIds,
      complementaryMemberPairs,
      status
    };
  });
  return {
    modelVersion: 'penta-structure-v1',
    scope: 'penta',
    memberCount: members.length,
    gates,
    channels,
    summary: {
      presentGateCount: gates.filter(gate => gate.status === 'present').length,
      coveredChannelCount: channels.filter(channel => channel.status !== 'absent').length,
      pentaActivationCount: gates.reduce((sum, gate) => sum + gate.activationCount, 0),
      totalActivationCount: activations.length
    }
  };
}
