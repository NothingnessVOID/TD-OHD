import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { SharpNativeClient } from './lib/sharp-native-client.mjs';
import { discreteState, replayAnnual, sameActivation, TRANSIT_POINTS, verifyAnnualStructure } from '../src/features/transit-timeline/annual-events.js';
import { stateAt, natalIdentity } from '../src/features/transit-timeline/graph-provider.js';


const inputIndex = process.argv.indexOf('--input');
if (inputIndex !== -1 && !process.argv[inputIndex + 1]) throw new Error('--input requires a directory');
const root = inputIndex !== -1 ? resolve(process.argv[inputIndex + 1]) : resolve(import.meta.dirname, '..', 'public/transit-data');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json')));
const years = process.argv.includes('--all') ? Object.keys(manifest.years).map(Number)
  : [Number(process.argv.find(arg => /^\d{4}$/.test(arg)) || 2026)];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const natal = natalIdentity({ gates: { all: [3, 60, 13, 33, 4, 61, 23, 43] },
  centers: { definedNames: ['root', 'sacral', 'g', 'throat', 'ajna', 'head'] } });
const client = new SharpNativeClient();
const snapshot = async time => (await client.snapshot(time)).activations;
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
  // Add explicit windows around longitude direction changes. These are
  // stationary/reversal neighborhoods rather than only random timestamps.
  let stationWindows = 0;
  const stationPoints = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const direction = (a, b) => ((b - a + 540) % 360) - 180;
  const dayTimes = [];
  for (let time = data.start; time < data.end; time += 86_400_000) dayTimes.push(time);
  const daySnapshots = new Map((await client.batch(dayTimes)).map((value, index) => [dayTimes[index], value.activations]));
  for (const point of stationPoints) {
    let previous = null;
    let previousDirection = null;
    for (let time = data.start; time < data.end; time += 86_400_000) {
      const longitude = daySnapshots.get(time)[point].longitude;
      if (previous !== null) {
        const currentDirection = Math.sign(direction(previous, longitude));
        if (previousDirection && currentDirection && previousDirection !== currentDirection) {
          stationWindows++;
          for (const offset of [-43_200_000, 0, 43_200_000]) {
            const sample = time + offset;
            if (sample >= data.start && sample < data.end) times.add(sample);
          }
        }
        if (currentDirection) previousDirection = currentDirection;
      }
      previous = longitude;
    }
  }
  let roundTrips = 0;
  for (let index = 0; index < TRANSIT_POINTS.length; index++) {
    const pointEvents = data.events.filter(event => event[1] === index);
    for (let i = 1; i < pointEvents.length; i++) {
      const before = pointEvents[i - 1], after = pointEvents[i];
      if (before[2] === after[4] && before[3] === after[5] &&
          before[4] === after[2] && before[5] === after[3]) roundTrips++;
    }
  }
  let seed = year;
  for (let i = 0; i < 256; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    // Cache boundaries and UI clocks resolve whole UTC seconds. Millisecond
    // samples would test sub-second precision this cache does not represent.
    times.add(Math.floor((data.start + seed % (data.end - data.start)) / 1000) * 1000);
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
  const orderedTimes = [...times].sort((a, b) => a - b);
  for (let offset = 0; offset < orderedTimes.length; offset += 2048) {
    const batchTimes = orderedTimes.slice(offset, offset + 2048);
    const direct = await client.batch(batchTimes);
    for (let index = 0; index < batchTimes.length; index++) {
    const time = batchTimes[index];
    const actual = discreteState(direct[index].activations);
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
  }
  const endState = discreteState(await snapshot(data.end - 1000));
  for (const point of TRANSIT_POINTS) if (!sameActivation(final[point], endState[point])) {
    differences++;
    if (examples.length < 12) examples.push({ point, final: final[point], direct: endState[point] });
  }
  totalDifferences += differences + graphDifferences;
  console.log(JSON.stringify({ year, events: data.events.length, sampleTimes: times.size,
    stationWindows, roundTrips, differences, graphDifferences, examples,
    verifyMs: Math.round(performance.now() - started) }));
}
await client.close();
if (totalDifferences) process.exitCode = 1;
