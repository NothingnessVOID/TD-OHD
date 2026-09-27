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
