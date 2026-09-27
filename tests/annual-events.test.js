import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ANNUAL_SIGNATURE } from '../src/features/transit-timeline/annual-signature.js';
import { TRANSIT_POINTS, replayAnnual, verifyAnnualStructure } from '../src/features/transit-timeline/annual-events.js';
import { timelineFromAnnual } from '../src/features/transit-timeline/annual-timeline.js';
import { createAnnualLoader } from '../src/features/transit-timeline/annual-loader.js';

const year = 2026;
const start = Date.UTC(year, 0, 1);
const end = Date.UTC(year + 1, 0, 1);
const initial = Object.fromEntries(TRANSIT_POINTS.map(point => [point, [1, 1]]));
function fixture() {
  return { format: 1, year, start, end, pointOrder: TRANSIT_POINTS, initial,
    events: [
      [start + 1000, 0, 1, 1, 1, 2],
      [start + 2000, 0, 1, 2, 2, 1],
      [start + 2000, 1, 1, 1, 2, 1],
      [start + 3000, 0, 2, 1, 1, 1]
    ], signature: ANNUAL_SIGNATURE };
}

test('line changes and simultaneous point changes replay atomically', () => {
  const data = fixture();
  assert.deepEqual(verifyAnnualStructure(data).sun, [1, 1]);
  assert.deepEqual(replayAnnual(data, start).sun, [1, 1]);
  assert.deepEqual(replayAnnual(data, start + 1000).sun, [1, 2]);
  assert.deepEqual(replayAnnual(data, start + 2000).earth, [2, 1]);
  assert.throws(() => replayAnnual(data, end), RangeError);
  const broken = fixture();
  broken.events[2][2] = 2;
  assert.throws(() => verifyAnnualStructure(broken));
});

test('derived intervals retain separate point contributions and gate navigation index', () => {
  const data = fixture();
  const result = timelineFromAnnual({ start, end: start + 4000, years: [data],
    natal: {}, mode: 'transit-only', catalog: [
      { key: 'gate:1' }, { key: 'gate:2' }, { key: 'line:1.2' }
    ], stateAt: (_, activations) => {
      const values = Object.values(activations);
      const states = new Map();
      for (const gate of [1, 2]) if (values.some(value => value.gate === gate)) states.set(`gate:${gate}`, 'transit');
      if (values.some(value => value.gate === 1 && value.line === 2)) states.set('line:1.2', 'transit');
      return states;
    } });
  assert.deepEqual(result.events, [start + 1000, start + 2000, start + 3000]);
  assert.deepEqual(result.gateEvents, [start + 2000, start + 3000]);
  assert.deepEqual(result.rows.find(row => row.key === 'gate:1').intervals.map(item => [item.start, item.end]),
    [[start, start + 4000]]); // all the other points still carry gate 1
  assert.deepEqual(result.rows.find(row => row.key === 'line:1.2').intervals.map(item => [item.start, item.end]),
    [[start + 1000, start + 2000]]);
});

test('annual loader deduplicates, validates and reuses year for 7/28/7 requests', async () => {
  const data = fixture();
  const bytes = Buffer.from(JSON.stringify(data));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  let manifestRequests = 0;
  let yearRequests = 0;
  const loader = createAnnualLoader({ base: './', fetcher: async url => {
    if (url.endsWith('manifest.json')) {
      manifestRequests++;
      return new Response(JSON.stringify({ format: 1, signature: ANNUAL_SIGNATURE, years: {
        2026: { path: `x/2026.${sha256.slice(0, 16)}.json`, bytes: bytes.length, sha256 }
      } }));
    }
    yearRequests++;
    return new Response(bytes);
  } });
  await Promise.all([loader.load(2026), loader.load(2026)]);
  await loader.loadRange(start, start + 7 * 86_400_000);
  await loader.loadRange(start, start + 28 * 86_400_000);
  await loader.loadRange(start, start + 7 * 86_400_000);
  assert.equal(manifestRequests, 1);
  assert.equal(yearRequests, 1);
  assert.deepEqual(loader.cachedYears(), [2026]);
});
