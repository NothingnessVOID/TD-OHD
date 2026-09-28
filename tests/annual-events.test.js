import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ANNUAL_SIGNATURE } from '../src/features/transit-timeline/annual-signature.js';
import { TRANSIT_POINTS, replayAnnual, verifyAnnualStructure } from '../src/features/transit-timeline/annual-events.js';
import { timelineFromAnnual } from '../src/features/transit-timeline/annual-timeline.js';
import { createAnnualLoader } from '../src/features/transit-timeline/annual-loader.js';
import { stateAt } from '../src/features/transit-timeline/graph-provider.js';

const year = 2026;
const start = Date.UTC(year, 0, 1);
const end = Date.UTC(year + 1, 0, 1);
const initial = Object.fromEntries(TRANSIT_POINTS.map(point => [point, [1, 1]]));
function fixture() {
  return { format: 1, year, start, end, pointOrder: TRANSIT_POINTS, initial: structuredClone(initial),
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
  assert.deepEqual(replayAnnual(data, start + 3000).sun, [1, 1]); // reverse crossing returns to the prior gate
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

test('a point leaves a still-active gate without inventing a new channel', () => {
  const data = fixture();
  data.initial.sun = [10, 1];
  data.initial.moon = [10, 1];
  data.events = [[start + 1000, 0, 10, 1, 1, 1]];
  verifyAnnualStructure(data);
  const result = timelineFromAnnual({ start, end: start + 2000, years: [data],
    natal: { gates: { all: [10, 20] }, centers: { definedNames: [] } }, mode: 'overlay', stateAt,
    catalog: [{ key: 'gate:10' }, { key: 'channel:10-20' }] });
  assert.deepEqual(result.gateChanges, [{ time: start + 1000, gates: [1, 10] }],
    'the departing gate remains identifiable for navigation highlight');
  assert.deepEqual(result.rows.find(row => row.key === 'channel:10-20').intervals,
    [{ start, end: start + 2000, source: 'natal', clippedStart: true, clippedEnd: true }]);
  assert.deepEqual(result.rows.find(row => row.key === 'gate:10').intervals,
    [{ start, end: start + 2000, source: 'both', clippedStart: true, clippedEnd: true }]);
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

test('missing and corrupted annual files stay unavailable and never enter the cache', async () => {
  const data = fixture();
  const bytes = Buffer.from(JSON.stringify(data));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const manifest = { format: 1, signature: ANNUAL_SIGNATURE, years: {
    2026: { path: 'x/2026.json', bytes: bytes.length, sha256 }
  } };
  const requests = [];
  const loader = createAnnualLoader({ fetcher: async url => {
    requests.push(url);
    if (url.endsWith('manifest.json')) return new Response(JSON.stringify(manifest));
    return new Response(Buffer.from(bytes.toString().replace('"year":2026', '"year":2025')));
  } });
  const segments = await loader.loadRange(start, end + 1000);
  assert.deepEqual(segments.map(item => item.year), [2026, 2027]);
  assert.ok(segments.every(item => item.data.unavailable));
  assert.deepEqual(loader.cachedYears(), []);
  assert.equal(requests.filter(url => url.includes('2026.json')).length, 1);
  assert.equal(requests.filter(url => url.includes('2027')).length, 0);
});

test('annual cache evicts by recent use and actual encoded bytes', async () => {
  const encoded = new Map([2025, 2026, 2027].map(yearValue => {
    const offset = Date.UTC(yearValue, 0, 1) - start;
    const source = fixture();
    const data = { ...source, year: yearValue, start: source.start + offset,
      end: Date.UTC(yearValue + 1, 0, 1),
      events: source.events.map(event => [event[0] + offset, ...event.slice(1)]) };
    return [yearValue, Buffer.from(JSON.stringify(data))];
  }));
  const manifest = { format: 1, signature: ANNUAL_SIGNATURE, years: {} };
  for (const [yearValue, bytes] of encoded) manifest.years[yearValue] = {
    path: `x/${yearValue}.json`, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
  const budget = 2 * Math.max(...[...encoded.values()].map(bytes => bytes.length));
  const loader = createAnnualLoader({ capacity: 3, capacityBytes: budget,
    fetcher: async url => url.endsWith('manifest.json')
      ? new Response(JSON.stringify(manifest))
      : new Response(encoded.get(Number(url.match(/(202[5-7])\.json/)?.[1]))) });
  await loader.load(2025);
  await loader.load(2026);
  await loader.load(2025);
  await loader.load(2027);
  assert.deepEqual(loader.cachedYears(), [2025, 2027]);
  assert.ok(loader.cachedBytes() <= budget);
});

test('manifest signature mismatch fails closed before requesting a year file', async () => {
  let yearRequests = 0;
  const loader = createAnnualLoader({ fetcher: async url => {
    if (url.endsWith('manifest.json')) {
      return new Response(JSON.stringify({ format: 1, signature: 'outdated-calculation', years: {} }));
    }
    yearRequests++;
    return new Response('');
  } });
  const [segment] = await loader.loadRange(start, start + 86_400_000);
  assert.match(segment.data.unavailable, /signature mismatch/i);
  assert.equal(yearRequests, 0);
  assert.deepEqual(loader.cachedYears(), []);
});
