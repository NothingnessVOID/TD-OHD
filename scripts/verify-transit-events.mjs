import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { snapshot } from '../src/features/transit-timeline/snapshot.js';
import { discreteState, replayAnnual, sameActivation, TRANSIT_POINTS, verifyAnnualStructure } from '../src/features/transit-timeline/annual-events.js';
import { stateAt, natalIdentity } from '../src/features/transit-timeline/graph-provider.js';
import { computeChart } from '../src/lib/chartdata.js';

const root = resolve(import.meta.dirname, '..', 'public/transit-data');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json')));
const years = process.argv.includes('--all') ? Object.keys(manifest.years).map(Number)
  : [Number(process.argv.find(arg => /^\d{4}$/.test(arg)) || 2026)];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const natal = natalIdentity(computeChart({ birthDate: '1985-01-01', birthTime: '12:00', timezone: 0 }).chart);
const activations = state => Object.fromEntries(TRANSIT_POINTS.map(point =>
  [point, { gate: state[point][0], line: state[point][1] }]));
const graphState = (state, mode) => [...stateAt(natal, activations(state), mode)]
  .sort(([a], [b]) => a.localeCompare(b));
let totalDifferences = 0;
let precedingFinal = null;
for (const year of years) {
  const entry = manifest.years[year];
  if (!entry) throw new Error(`Missing manifest entry for ${year}`);
  const started = performance.now();
  const bytes = await readFile(resolve(root, entry.path));
  if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256) throw new Error(`${year}: byte/hash mismatch`);
  const data = JSON.parse(bytes);
  if (data.signature !== manifest.signature) throw new Error(`${year}: signature mismatch`);
  const final = verifyAnnualStructure(data);
  if (precedingFinal) {
    for (const point of TRANSIT_POINTS) if (!sameActivation(precedingFinal[point], data.initial[point])) {
      throw new Error(`${year}: cross-year seam mismatch for ${point}`);
    }
  }
  precedingFinal = final;
  const times = new Set([data.start, data.start + 1000, Math.floor((data.start + data.end) / 2), data.end - 1000]);
  let seed = year;
  for (let i = 0; i < 256; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    times.add(data.start + seed % (data.end - data.start));
  }
  // Independent direct-engine samples on both sides of every detected boundary.
  for (const event of data.events) {
    if (event[0] - 1000 >= data.start) times.add(event[0] - 1000);
    times.add(event[0]);
    if (event[0] + 1000 < data.end) times.add(event[0] + 1000);
  }
  let differences = 0;
  let graphDifferences = 0;
  const examples = [];
  for (const time of [...times].sort((a, b) => a - b)) {
    const actual = discreteState(snapshot(time));
    const replayed = replayAnnual(data, time);
    for (const point of TRANSIT_POINTS) if (!sameActivation(actual[point], replayed[point])) {
      differences++;
      if (examples.length < 12) examples.push({ time: new Date(time).toISOString(), point,
        direct: actual[point], replayed: replayed[point] });
    }
    for (const mode of ['overlay', 'transit-only']) {
      if (JSON.stringify(graphState(actual, mode)) !== JSON.stringify(graphState(replayed, mode))) {
        graphDifferences++;
        if (examples.length < 12) examples.push({ time: new Date(time).toISOString(), mode,
          directGraph: graphState(actual, mode), replayedGraph: graphState(replayed, mode) });
      }
    }
  }
  const endState = discreteState(snapshot(data.end - 1000));
  for (const point of TRANSIT_POINTS) if (!sameActivation(final[point], endState[point])) {
    differences++;
    if (examples.length < 12) examples.push({ point, final: final[point], direct: endState[point] });
  }
  totalDifferences += differences + graphDifferences;
  console.log(JSON.stringify({ year, events: data.events.length, sampleTimes: times.size,
    differences, graphDifferences, examples, verifyMs: Math.round(performance.now() - started) }));
}
if (totalDifferences) process.exitCode = 1;
