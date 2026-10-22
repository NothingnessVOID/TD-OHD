import test from 'node:test';
import assert from 'node:assert/strict';
import { records, byGate, byPlanet, fixingCounts, projections, ACTIVATION_SIDES } from '../src/lib/panel-graphics/activations.js';
import { PLANET_ORDER } from '../src/lib/planet-reference.js';
import { calculateLineFixings } from '../src/features/transit-timeline/line-fixing.js';

/** A chart shaped like the adapter's output, with full polarities so fixing is computable. */
function chart() {
  return {
    gates: {
      design: {
        sun: { gate: 12, line: 3, color: 4, tone: 2, base: 5 },
        mercury: { gate: 12, line: 5, color: 1, tone: 6, base: 2 },
        moon: { gate: 30, line: 2, color: 3, tone: 3, base: 1 }
      },
      personality: {
        moon: { gate: 12, line: 3, color: 4, tone: 2, base: 5 },
        venus: { gate: 30, line: 1, color: 5, tone: 1, base: 3 }
      }
    }
  };
}

test('every activation becomes exactly one record', () => {
  const list = records(chart());
  assert.equal(list.length, 5);
  for (const record of list) {
    assert.ok(ACTIVATION_SIDES.includes(record.side));
    assert.ok(PLANET_ORDER.includes(record.planet));
    assert.ok(Number.isInteger(record.gate) && Number.isInteger(record.line));
    assert.ok(['exalted', 'detriment', 'juxtaposed', 'none', 'unknown'].includes(record.fixing));
  }
});

test('two records on the same gate and line are never merged', () => {
  const list = records(chart());
  const sameKey = list.filter(record => record.gate === 12 && record.line === 3);
  assert.equal(sameKey.length, 2, 'Design Sun 12.3 and Personality Moon 12.3 are two records');
  assert.deepEqual(sameKey.map(record => record.side).sort(), ['design', 'personality']);
});

test('every record carries the fixing its own side and planet resolved', () => {
  const source = chart();
  const expected = calculateLineFixings(source);
  for (const record of records(source)) {
    assert.equal(record.fixing, expected[record.side][record.planet].natalState,
      `${record.side} ${record.planet}`);
  }
});

test('same side, different planets, same gate and line stay separate records with their own fixing', () => {
  // Two design planets on the identical gate.line. Merging by {side, gate, line}
  // would collapse them into one record and lose one planet's fixing.
  const source = chart();
  source.gates.design.jupiter = { gate: 12, line: 3, color: 4, tone: 2, base: 5 };
  const list = records(source);
  const pair = list.filter(record => record.side === 'design' && record.gate === 12 && record.line === 3);
  assert.equal(pair.length, 2, 'both design planets keep their own record');
  assert.deepEqual(pair.map(record => record.planet).sort(), ['jupiter', 'sun']);
  const expected = calculateLineFixings(source);
  for (const record of pair) {
    assert.equal(record.fixing, expected.design[record.planet].natalState, record.planet);
  }
});

test('one construction yields the list and both projections from a single fixing pass', () => {
  const source = chart();
  const built = projections(source);
  assert.equal(built.list.length, records(source).length);
  let grouped = 0;
  for (const [, group] of built.byGate) grouped += group.length;
  assert.equal(grouped, built.list.length);
  let paired = 0;
  for (const [, sides] of built.byPlanet) paired += (sides.design ? 1 : 0) + (sides.personality ? 1 : 0);
  assert.equal(paired, built.list.length);
  // The two projections must agree with the standalone helpers on the same chart.
  assert.deepEqual([...byGate(source).keys()].sort(), [...built.byGate.keys()].sort());
  assert.deepEqual([...byPlanet(source).keys()].sort(), [...built.byPlanet.keys()].sort());
});

test('byGate keeps every record and its total equals records().length', () => {
  const list = records(chart());
  const grouped = byGate(chart());
  let total = 0;
  for (const [, group] of grouped) total += group.length;
  assert.equal(total, list.length);
  // Gate 12 has Design Sun 12.3, Design Mercury 12.5 and Personality Moon 12.3.
  assert.equal(grouped.get(12).length, 3);
  assert.deepEqual(grouped.get(12).map(record => `${record.side[0].toUpperCase()}${record.side.slice(1)} ${record.planet} ${record.gate}.${record.line}`).sort(),
    ['Design mercury 12.5', 'Design sun 12.3', 'Personality moon 12.3']);
});

test('byPlanet gives each planet one record per side, and none invented', () => {
  const planets = byPlanet(chart());
  assert.equal(planets.get('sun').design.gate, 12);
  assert.equal(planets.get('sun').personality, null);
  assert.equal(planets.get('moon').design.gate, 30);
  assert.equal(planets.get('moon').personality.gate, 12);
  // No row is created for a planet the chart does not use.
  assert.equal(planets.has('pluto'), false);
});

test('fixing counts never put unknown into a known denominator', () => {
  const list = [
    { fixing: 'exalted' }, { fixing: 'exalted' }, { fixing: 'none' },
    { fixing: 'juxtaposed' }, { fixing: 'unknown' }, { fixing: 'not-a-state' }
  ];
  const counts = fixingCounts(list);
  assert.deepEqual(counts, { exalted: 2, detriment: 0, juxtaposed: 1, none: 1, unknown: 2 });
  const known = counts.exalted + counts.detriment + counts.juxtaposed + counts.none;
  assert.equal(known + counts.unknown, list.length);
});

test('a chart with no activations yields empty projections', () => {
  assert.deepEqual(records({}), []);
  assert.equal(byGate({}).size, 0);
  assert.equal(byPlanet({}).size, 0);
});
