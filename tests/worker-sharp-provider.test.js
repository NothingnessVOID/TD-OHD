import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHumanDesign, calculateHDTransits } from '../worker/chart-provider.js';
test('optional edge computation requires an explicit Sharp host and never falls back', async () => {
  await assert.rejects(calculateHumanDesign('2000-01-01', 12, 0), /host SharpAstrology/);
  await assert.rejects(calculateHDTransits({}, '2026-01-01'), /host SharpAstrology/);
  const chart = { id: 'supplied Sharp chart' };
  assert.equal(await calculateHumanDesign('2000-01-01', 12, 0, { calculateBirth: async () => chart }), chart);
});
