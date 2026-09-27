import test from 'node:test';
import assert from 'node:assert/strict';
import { computeChart, sensitivityCheck } from '../src/lib/chartdata.js';

test('natal computation is reused across a rename and invalidated by calculation fields', () => {
  const birth = { birthDate: '1990-06-15', birthTime: '14:30', timezone: 8, name: 'Example' };
  const first = computeChart(birth);
  const renamed = computeChart({ ...birth, name: 'Renamed' });
  assert.equal(renamed.chart, first.chart);
  assert.equal(renamed.geneKeys, first.geneKeys);
  assert.notEqual(computeChart({ ...birth, birthTime: '14:31' }).chart, first.chart);
  assert.notEqual(computeChart({ ...birth, timeUnknown: true }).chart, first.chart);
  assert.equal(sensitivityCheck(birth, first.chart), sensitivityCheck({ ...birth, name: 'Renamed' }, first.chart));
});

test('cache data survives serialization with raw fields and distinct unknown-time metadata', () => {
  const birth = { birthDate: '1990-06-15', birthTime: '12:00', timezone: 8, timeUnknown: false };
  const known = computeChart(birth);
  const unknown = computeChart({ ...birth, timeUnknown: true });
  assert.notEqual(known.chart, unknown.chart);
  assert.deepEqual(JSON.parse(JSON.stringify(known)), known);
  assert.deepEqual(structuredClone(unknown), unknown);
  assert.equal(known.birth.timeUnknown, false);
  assert.equal(unknown.birth.timeUnknown, true);
  for (const field of ['gate', 'line', 'color', 'tone', 'base', 'longitude']) {
    assert.equal(JSON.parse(JSON.stringify(known)).chart.gates.personality.sun[field],
      known.chart.gates.personality.sun[field]);
  }
});

test('birth time refuses missing, invalid and unsupported seconds instead of silently rounding', () => {
  const birth = { birthDate: '1990-06-15', timezone: 8 };
  assert.throws(() => computeChart(birth), RangeError);
  assert.throws(() => computeChart({ ...birth, birthTime: '14:30:20' }), RangeError);
  assert.throws(() => computeChart({ ...birth, birthTime: '25:00' }), RangeError);
  assert.doesNotThrow(() => computeChart({ ...birth, timeUnknown: true }));
});
