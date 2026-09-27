import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { snapshot } from '../src/features/transit-timeline/snapshot.js';
import { discreteState, replayAnnual, sameActivation, TRANSIT_POINTS, verifyAnnualStructure } from '../src/features/transit-timeline/annual-events.js';

const root = resolve(import.meta.dirname, '..', 'public/transit-data');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json')));
const years = process.argv.includes('--all') ? Object.keys(manifest.years).map(Number)
  : [Number(process.argv.find(arg => /^\d{4}$/.test(arg)) || 2026)];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
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
  const examples = [];
  for (const time of [...times].sort((a, b) => a - b)) {
    const actual = discreteState(snapshot(time));
    const replayed = replayAnnual(data, time);
    for (const point of TRANSIT_POINTS) if (!sameActivation(actual[point], replayed[point])) {
      differences++;
      if (examples.length < 12) examples.push({ time: new Date(time).toISOString(), point,
        direct: actual[point], replayed: replayed[point] });
    }
  }
  const endState = discreteState(snapshot(data.end - 1000));
  for (const point of TRANSIT_POINTS) if (!sameActivation(final[point], endState[point])) {
    differences++;
    if (examples.length < 12) examples.push({ point, final: final[point], direct: endState[point] });
  }
  totalDifferences += differences;
  console.log(JSON.stringify({ year, events: data.events.length, sampleTimes: times.size,
    differences, examples, verifyMs: Math.round(performance.now() - started) }));
}
if (totalDifferences) process.exitCode = 1;
