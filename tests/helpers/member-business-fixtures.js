// Synthetic Sharp-contract shaped charts (fixed fictional birthdays only).
// Shared by the member-business rule and renderer tests; no engine, no WASM, no people store.
import { TYPES } from '../../src/lib/human-design/catalog.js';
import { definitionIds, definitionNames } from '../../src/lib/human-design/identities.js';
import { TEAM_PLANETS } from '../../src/lib/human-design/team-activation.js';

const SLOTS = ['personality', 'design'].flatMap(side => TEAM_PLANETS.map(planet => [side, planet]));
export const FILLER_GATE = 64;

/** Explicit gates fill the 26 activation slots first; the rest repeat one harmless gate. */
export function makeChart({ typeId = 'generator', definition = 'SingleDefinition', gates = [], filler = FILLER_GATE } = {}) {
  const rawType = Object.entries(TYPES).find(([id]) => id === typeId);
  const chart = {
    type: rawType ? { ...rawType[1], id: rawType[0], rawId: rawType[1].name } : { id: typeId, name: typeId },
    calculation: {
      type: { id: typeId, rawId: rawType?.[1].name ?? typeId },
      definition: { id: definitionIds[definition] ?? definition, rawId: definition,
        componentCount: definition === 'Empty' ? 0 : undefined }
    },
    definition: definitionNames[definition] ?? definition,
    gates: { personality: {}, design: {} },
    meta: { birthHour: 12 }
  };
  SLOTS.forEach(([side, planet], index) => {
    chart.gates[side][planet] = { gate: gates[index] ?? filler, line: 1, planet };
  });
  return chart;
}

export const analysisInput = (options = {}) => ({
  memberId: 'synthetic-member', personId: 'synthetic-person', chart: makeChart(options)
});
