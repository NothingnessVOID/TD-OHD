import test from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, CHANNELS } from '../src/lib/human-design/catalog.js';
import { definitionIds, definitionNames } from '../src/lib/human-design/identities.js';
import { PENTA_CHANNELS, PENTA_GATES } from '../src/lib/human-design/penta-catalog.js';
import { OC16_AXIS } from '../src/lib/wa/oc16-catalog.js';
import { TEAM_PLANETS } from '../src/lib/human-design/team-activation.js';
import { analyzeMemberBusiness, INTEGRATION_CHANNEL_IDS } from '../src/lib/member-business/analysis.js';

// Synthetic charts only: no engine, no WASM, no stored people.
const SLOTS = ['personality', 'design'].flatMap(side => TEAM_PLANETS.map(planet => [side, planet]));
const FILLER_GATE = 64;

function makeChart({ typeId = 'generator', definition = 'SingleDefinition', gates = [], filler = FILLER_GATE }) {
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

const run = (chart, extra = {}) => analyzeMemberBusiness({ memberId: 'synthetic-member', personId: 'synthetic-person',
  chart, ...extra });

test('a channel completed across personality and design sides is reported once', () => {
  // Real cross-side completion: gate 21 sits on the personality side, gate 45 on the design side.
  const chart = makeChart({ gates: [] });
  chart.gates.personality.sun = { gate: 21, line: 1, planet: 'sun' };
  chart.gates.design.sun = { gate: 45, line: 2, planet: 'sun' };
  const result = run(chart);
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.issues, []);
  assert.equal(result.activations.length, 26);
  assert.deepEqual(result.channelIds, ['21-45']);
  assert.deepEqual(result.integration.channelIds, []);
  const pair = result.activations.filter(activation => [21, 45].includes(activation.gate));
  assert.deepEqual(pair.map(activation => [activation.side, activation.gate]).sort(),
    [['design', 45], ['personality', 21]]);
});

test('a single active gate never reports a complete channel', () => {
  const result = run(makeChart({ gates: [3, 60, 10] }));
  assert.equal(result.status, 'ready');
  assert.ok(result.gateIds.includes(10));
  // Gate 10 is active on one side only, so 10–20 stays incomplete.
  assert.equal(result.activations.filter(activation => activation.gate === 10).length, 1);
  assert.deepEqual(result.channelIds, ['3-60']);
});

test('only the member\'s own 26 activations are used, never aggregate or stored channel lists', () => {
  const chart = makeChart({ gates: [3, 60] });
  chart.channels = [{ gates: [21, 45] }, { gates: [10, 20] }];
  chart.gates.all = [21, 45, 10, 20, 57, 34].map(gate => ({ gate, line: 1 }));
  chart.calculation.channels = [{ gates: [21, 45] }];
  chart.calculation.centerStates = { throat: { defined: true } };
  const result = run(chart);
  assert.deepEqual(result.channelIds, ['3-60']);
  assert.deepEqual(result.organization.channelIds, ['3-60']);
});

test('five stable type ids map to five distinct career ids', () => {
  const expected = {
    generator: 'classicBuilder',
    manifestingGenerator: 'expressBuilder',
    manifestor: 'initiator',
    projector: 'advisor',
    reflector: 'evaluator'
  };
  const seen = new Map();
  for (const [typeId, careerId] of Object.entries(expected)) {
    const result = run(makeChart({ typeId, gates: [3, 60] }));
    assert.equal(result.typeId, typeId);
    assert.equal(result.careerId, careerId);
    seen.set(careerId, typeId);
  }
  assert.equal(seen.size, 5);
});

test('reflector with no definition is ready even with zero complete personal channels', () => {
  const result = run(makeChart({ typeId: 'reflector', definition: 'Empty', gates: [] }));
  assert.equal(result.status, 'ready');
  assert.equal(result.definitionId, 'none');
  assert.equal(result.definitionComponentCount, 0);
  assert.deepEqual(result.channelIds, []);
  assert.deepEqual(result.organization.channelIds, []);
  assert.deepEqual(result.integration.channelIds, []);
  assert.deepEqual(result.penta.channelIds, []);
  for (const tier of ['upper', 'middle', 'lower']) {
    assert.deepEqual(result.organization.groups[tier].channelIds, []);
    assert.equal(result.organization.groups[tier].gateCount, 0);
  }
});

test('name fallback only accepts the catalog\'s exact known type names', () => {
  const chart = makeChart({ typeId: 'manifestingGenerator', gates: [3, 60] });
  delete chart.type.id;
  delete chart.calculation.type.id;
  assert.equal(run(chart).careerId, 'expressBuilder');
  const guessed = makeChart({ typeId: 'wizard', gates: [3, 60] });
  guessed.type = { name: 'Generator-ish' };
  guessed.calculation.type = { rawId: 'Generator-ish' };
  const result = run(guessed);
  assert.equal(result.status, 'unavailable');
  assert.ok(result.issues.some(issue => issue.code === 'TYPE_UNAVAILABLE'));
  assert.equal(result.careerId, null);
});

test('unknown definition cannot be assumed to be single', () => {
  const chart = makeChart({ gates: [3, 60] });
  chart.calculation.definition = { id: 'twelve-fold', rawId: 'TwelveFold', componentCount: 12 };
  chart.definition = 'Twelve-fold Definition';
  const result = run(chart);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.definitionId, null);
  assert.equal(result.definitionComponentCount, null);
  assert.ok(result.issues.some(issue => issue.code === 'DEFINITION_UNAVAILABLE'));
});

test('definition falls back to the explicit display name when the id is absent', () => {
  // 1–8 (G/throat) and 26–44 (heart/spleen) are two real islands, so split is consistent.
  const chart = makeChart({ gates: [1, 8, 26, 44] });
  chart.calculation.definition = { id: null, rawId: 'SplitDefinition' };
  chart.definition = definitionNames.SplitDefinition;
  const result = run(chart);
  assert.equal(result.status, 'ready');
  assert.equal(result.definitionId, 'split');
  assert.equal(result.definitionComponentCount, 2);
  assert.deepEqual(result.definitionComponents, [['g', 'throat'], ['heart', 'spleen']]);
});

test('a known definition token that contradicts the calculation id is unavailable', () => {
  const chart = makeChart({ gates: [3, 60] });
  chart.definition = definitionNames.SplitDefinition;
  const result = run(chart);
  assert.equal(result.status, 'unavailable');
  assert.ok(result.issues.some(issue => issue.code === 'DEFINITION_SOURCE_CONFLICT' && issue.path === 'chart.definition'));
  const raw = makeChart({ gates: [3, 60] });
  raw.calculation.definition = { id: 'single', rawId: 'SplitDefinition' };
  assert.equal(run(raw).status, 'unavailable');
  assert.ok(run(raw).issues.some(issue => issue.code === 'DEFINITION_SOURCE_CONFLICT'
    && issue.path === 'chart.calculation.definition.rawId'));
});

test('the chart\'s own island count must match the reported definition', () => {
  // 3–60 alone is a single island: it cannot pass as split, triple or quadruple.
  for (const [definition, expected] of [['SplitDefinition', 2], ['TripleSplit', 3], ['QuadrupleSplit', 4]]) {
    const result = run(makeChart({ definition, gates: [3, 60] }));
    assert.equal(result.status, 'unavailable', definition);
    assert.ok(result.issues.some(issue => issue.code === 'DEFINITION_COMPONENT_CONFLICT'), definition);
    assert.equal(result.definitionComponents.length, 1, definition);
    assert.equal(expected > 1, true);
  }
  const twoIslands = run(makeChart({ definition: 'SplitDefinition', gates: [1, 8, 26, 44] }));
  assert.equal(twoIslands.status, 'ready');
  assert.equal(twoIslands.definitionComponents.length, 2);
});

test('a reported component count that contradicts the definition is blocking, a missing one is not', () => {
  const chart = makeChart({ definition: 'SplitDefinition', gates: [1, 8, 26, 44] });
  chart.calculation.definition.componentCount = 1;
  const contradicted = run(chart);
  assert.equal(contradicted.status, 'unavailable');
  assert.ok(contradicted.issues.some(issue => issue.code === 'DEFINITION_COMPONENT_MISMATCH'));
  const missing = makeChart({ definition: 'SplitDefinition', gates: [1, 8, 26, 44] });
  missing.calculation.definition.componentCount = null;
  const derived = run(missing);
  assert.equal(derived.status, 'ready');
  assert.equal(derived.definitionComponentCount, 2);
  assert.ok(!derived.issues.some(issue => issue.code === 'DEFINITION_COMPONENT_MISMATCH'));
});

test('an incomplete 26-activation source is rejected with its own code', () => {
  const chart = makeChart({ gates: [3, 60] });
  delete chart.gates.design.sun;
  const result = run(chart);
  assert.equal(result.status, 'unavailable');
  assert.ok(result.issues.some(issue => issue.code === 'MISSING_ACTIVATION' && issue.path === 'chart.gates.design.sun'));
  assert.deepEqual(result.activations, []);
});

test('broken or missing charts return unavailable instead of throwing', () => {
  for (const chart of [undefined, null, 'chart', 42, [], {}]) {
    const result = run(chart);
    assert.equal(result.status, 'unavailable');
    assert.ok(result.issues.length > 0);
    for (const key of ['gateIds', 'channelIds', 'activations', 'steps']) assert.ok(Array.isArray(result[key]));
    assert.ok(result.organization.groups.upper);
  }
  const noMember = analyzeMemberBusiness({ chart: makeChart({ gates: [3, 60] }) });
  assert.equal(noMember.status, 'unavailable');
  assert.ok(noMember.issues.some(issue => issue.code === 'INVALID_MEMBER_ID'));
});

test('reflector with a defined split chart and a defined type with no definition both conflict', () => {
  const reflector = run(makeChart({ typeId: 'reflector', definition: 'SplitDefinition', gates: [1, 8, 26, 44] }));
  assert.equal(reflector.status, 'unavailable');
  assert.ok(reflector.issues.some(issue => issue.code === 'REFLECTOR_DEFINITION_CONFLICT'));
  const generator = run(makeChart({ typeId: 'generator', definition: 'Empty', gates: [] }));
  assert.equal(generator.status, 'unavailable');
  assert.ok(generator.issues.some(issue => issue.code === 'NO_DEFINITION_FOR_DEFINED_TYPE'));
});

test('personId is optional but an explicitly invalid value is never cleared silently', () => {
  const chart = makeChart({ gates: [3, 60] });
  assert.equal(analyzeMemberBusiness({ memberId: 'synthetic-member', chart }).status, 'ready');
  for (const personId of [null, '', '   ', 42, {}, []]) {
    const result = analyzeMemberBusiness({ memberId: 'synthetic-member', personId, chart });
    assert.equal(result.status, 'unavailable');
    assert.ok(result.issues.some(issue => issue.code === 'INVALID_PERSON_ID' && issue.path === 'personId'));
  }
});

test('inputs and the supplied chart are not modified', () => {
  const chart = makeChart({ gates: [3, 60, 10, 20] });
  const input = { memberId: 'synthetic-member', personId: 'synthetic-person', chart,
    timeUnknown: true, birthTimeConfidence: 'estimated' };
  const chartBefore = structuredClone(chart);
  const inputBefore = structuredClone(input);
  run(chart, { timeUnknown: input.timeUnknown, birthTimeConfidence: input.birthTimeConfidence });
  assert.deepEqual(chart, chartBefore);
  assert.deepEqual(input, inputBefore);
});

test('confidence flags are preserved and a 12:00 birth time alone is not unknown', () => {
  const chart = makeChart({ gates: [3, 60] });
  assert.equal(chart.meta.birthHour, 12);
  const plain = run(chart);
  assert.equal(plain.timeUnknown, false);
  assert.equal(plain.birthTimeConfidence, null);
  const explicit = run(chart, { timeUnknown: true, birthTimeConfidence: 'estimated' });
  assert.equal(explicit.timeUnknown, true);
  assert.equal(explicit.birthTimeConfidence, 'estimated');
  assert.equal(explicit.status, 'ready');
});

test('penta and organization membership come from the shared catalogs, not local lists', () => {
  const result = run(makeChart({ gates: [7, 31] }));
  assert.deepEqual(result.channelIds, ['7-31']);
  assert.deepEqual(result.penta.activeGateIds, [7, 31]);
  assert.deepEqual(result.penta.channelIds, ['7-31']);
  assert.deepEqual(result.penta.missingGateIds,
    PENTA_GATES.map(cell => cell.gate).filter(gate => gate !== 7 && gate !== 31).sort((a, b) => a - b));
  assert.deepEqual(result.organization.channelIds, ['7-31']);
  assert.deepEqual(result.organization.groups.upper.channelIds, ['7-31']);
  assert.deepEqual(result.organization.groups.upper.gateIds, [7, 31]);
  assert.equal(result.organization.groups.upper.gateCount, 2);
  // Each tier holds three two-gate channels, so the tier total is six catalog gates.
  assert.equal(result.organization.groups.upper.gateTotal, 6);
  assert.equal(result.organization.groups.middle.gateCount, 0);
  assert.equal(result.organization.groups.lower.gateCount, 0);
});

test('integration scope is exactly the four declared textbook channels', () => {
  assert.deepEqual([...INTEGRATION_CHANNEL_IDS], ['10-20', '10-57', '20-34', '34-57']);
  const result = run(makeChart({ gates: [10, 20, 34] }));
  // 10–34 is an individual channel; 20–34 belongs to the four integration channels.
  assert.deepEqual(result.channelIds, ['10-20', '10-34', '20-34']);
  assert.deepEqual(result.integration.channelIds, ['10-20', '20-34']);
});

test('definition and channel evidence must agree before the result is ready', () => {
  const noChannel = run(makeChart({ typeId: 'generator', definition: 'SingleDefinition', gates: [10] }));
  assert.equal(noChannel.status, 'unavailable');
  assert.ok(noChannel.issues.some(issue => issue.code === 'DEFINITION_WITHOUT_COMPLETE_CHANNEL'));
  const noDefinition = run(makeChart({ typeId: 'reflector', definition: 'Empty', gates: [3, 60] }));
  assert.equal(noDefinition.status, 'unavailable');
  assert.ok(noDefinition.issues.some(issue => issue.code === 'NO_DEFINITION_WITH_COMPLETE_CHANNEL'));
  const mismatched = makeChart({ typeId: 'generator', definition: 'SplitDefinition', gates: [1, 8, 26, 44] });
  mismatched.calculation.definition.componentCount = 3;
  const contradicted = run(mismatched);
  assert.equal(contradicted.status, 'unavailable');
  assert.ok(contradicted.issues.some(issue => issue.code === 'DEFINITION_COMPONENT_MISMATCH' && issue.severity === 'blocking'));
  assert.equal(contradicted.definitionComponentCount, 3);
});

test('results are serializable, deterministically ordered and every channel id exists in the catalog', () => {
  const chart = makeChart({ gates: [20, 10, 3, 60, 34] });
  const first = run(chart);
  const second = run(chart);
  assert.deepEqual(first, second);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.deepEqual(first.channelIds, [...first.channelIds].sort((a, b) => {
    const [a0, a1] = a.split('-').map(Number), [b0, b1] = b.split('-').map(Number);
    return a0 - b0 || a1 - b1;
  }));
  const catalogIds = new Set(CHANNELS.map(channel => [...channel.gates].sort((a, b) => a - b).join('-')));
  for (const id of first.channelIds) assert.ok(catalogIds.has(id));
  for (const row of OC16_AXIS) assert.equal(row.pair.gates.length, 2);
  for (const channel of PENTA_CHANNELS) assert.equal(channel.gates.length, 2);
  assert.deepEqual(first.steps.map(step => step.stepId),
    ['member-activations', 'personal-channels', 'career-type', 'definition', 'integration', 'penta', 'organization']);
  for (const step of first.steps) assert.equal(typeof step.status, 'string');
});
