import test from 'node:test';
import assert from 'node:assert/strict';
import { createChartDataService } from '../src/lib/chartdata.js';
import { sharpProvider } from '../src/lib/chart-engine/sharp-provider.js';

function chart(moon) {
  return { type: { name: 'Generator' }, authority: { name: 'Sacral Authority' },
    profile: { numbers: '2/4' }, definition: 'Single Definition',
    incarnationCross: { gates: [1, 2, 3, 4] }, variable: { notation: 'LL RR' },
    gates: { personality: { moon: { gate: 1, line: moon } } } };
}
function service() {
  let calls = 0;
  const provider = {
    cacheKey: sharpProvider.cacheKey,
    async calculateBirth(birth) {
      calls++;
      return { chart: chart(birth.birthTime), geneKeys: { source: 'derived' } };
    },
    async calculateBirthAtOffset(birth, offset) { return chart(`${birth.birthTime}:${offset}`); }
  };
  return { ...createChartDataService(provider), calls: () => calls };
}

test('birth calculation promise is shared across names and invalidated by input', async () => {
  const s = service();
  const birth = { birthDate: '2088-06-15', birthTime: '14:30', timezone: 8, name: 'Example' };
  const [first, renamed] = await Promise.all([s.computeChart(birth), s.computeChart({ ...birth, name: 'Renamed' })]);
  assert.equal(first.chart, renamed.chart);
  assert.equal(first.geneKeys, renamed.geneKeys);
  assert.equal(s.calls(), 1);
  assert.notEqual((await s.computeChart({ ...birth, birthTime: '14:31' })).chart, first.chart);
  assert.notEqual((await s.computeChart({ ...birth, timeUnknown: true })).chart, first.chart);
  assert.equal(s.calls(), 3);
  assert.deepEqual(await s.sensitivityCheck(birth, first.chart),
    await s.sensitivityCheck({ ...birth, name: 'Renamed' }, first.chart));
});

test('cache data remains serializable and unknown time has distinct metadata', async () => {
  const s = service();
  const birth = { birthDate: '2088-06-15', birthTime: '12:00', timezone: 8, timeUnknown: false };
  const known = await s.computeChart(birth);
  const unknown = await s.computeChart({ ...birth, timeUnknown: true });
  assert.notEqual(known.chart, unknown.chart);
  assert.deepEqual(JSON.parse(JSON.stringify(known)), known);
  assert.deepEqual(structuredClone(unknown), unknown);
  assert.equal(known.birth.timeUnknown, false);
  assert.equal(unknown.birth.timeUnknown, true);
});

test('birth time rejects missing, invalid and unsupported seconds', () => {
  const birth = { birthDate: '2088-06-15', timezone: 8 };
  for (const input of [birth, { ...birth, birthTime: '14:30:20' }, { ...birth, birthTime: '25:00' }])
    assert.throws(() => sharpProvider.cacheKey(input), RangeError);
  assert.doesNotThrow(() => sharpProvider.cacheKey({ ...birth, timeUnknown: true }));
});
