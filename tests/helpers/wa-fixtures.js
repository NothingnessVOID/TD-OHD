import { createWaDraft } from '../../src/lib/wa/model.js';
import { TEAM_PLANETS } from '../../src/lib/human-design/team-activation.js';

// Entirely synthetic activations and identities; no real birth inputs.
export function chart(gates = [4]) {
  let index = 0;
  return { gates: Object.fromEntries(['personality', 'design'].map(side => [side,
    Object.fromEntries(TEAM_PLANETS.map(planet => [planet, { gate: gates[index++ % gates.length], line: 1, planet }]))])) };
}
export function fixture({ size = 10, pool = 0, layoutMode = 'standard', groupSizes = [3, 3, 3] } = {}) {
  const snapshot = createWaDraft({ organizationId: 'synthetic-wa', title: 'Synthetic Wa' });
  snapshot.layoutMode = layoutMode;
  snapshot.members = Array.from({ length: size + pool }, (_, index) => ({ memberId: `m${String(index).padStart(2, '0')}`,
    personId: `synthetic-person-${index}`, labelSnapshot: `Synthetic ${index}` }));
  snapshot.alphaId = snapshot.members[0]?.memberId ?? null;
  let index = 1;
  snapshot.pentas = snapshot.pentas.map((group, i) => ({ ...group, pentaId: `g${i}`,
    memberIds: snapshot.members.slice(index, index += groupSizes[i]).map(member => member.memberId) }));
  const prepared = snapshot.members.slice(0, size).map(member => ({ memberId: member.memberId, chart: chart() }));
  return { snapshot, prepared };
}
