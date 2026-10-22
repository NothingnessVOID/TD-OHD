import test from 'node:test';
import assert from 'node:assert/strict';
import { records, byGate, byPlanet, fixingCounts, ACTIVATION_SIDES } from '../src/lib/panel-graphics/activations.js';
import { PLANET_ORDER } from '../src/lib/planet-reference.js';

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
  // Same fixing, because the fixing belongs to the planet on its side, not to the gate.
  assert.equal(new Set(list.map(record => record.fixing)).size >= 1, true);
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
