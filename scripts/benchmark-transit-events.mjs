import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { replayAnnual } from '../src/features/transit-timeline/annual-events.js';
import { timelineFromAnnual } from '../src/features/transit-timeline/annual-timeline.js';
import { catalog, stateAt } from '../src/features/transit-timeline/provider.js';

const root = resolve(import.meta.dirname, '..', 'public/transit-data');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json')));
const entry = manifest.years[2026];
const start = performance.now();
const bytes = await readFile(resolve(root, entry.path));
const readMs = performance.now() - start;
const parseStart = performance.now();
const data = JSON.parse(bytes);
const parseMs = performance.now() - parseStart;
const natal = { gates: { all: [10, 20, 34, 57] },
  centers: { definedNames: ['g', 'throat', 'sacral', 'spleen'] },
  lines: ['10.1', '20.2', '34.3', '57.4'] };
const sampleStart = performance.now();
for (let index = 0; index < 1000; index++) {
  replayAnnual(data, data.start + (index * 31_337_137) % (data.end - data.start));
}
const replay1000Ms = performance.now() - sampleStart;
const durations = [7, 28, 365];
const deriveMs = {};
const counts = {};
for (const days of durations) {
  const before = performance.now();
  const result = timelineFromAnnual({ start: data.start, end: Math.min(data.end, data.start + days * 86_400_000),
    years: [data], natal, mode: 'overlay', catalog: catalog(), stateAt });
  deriveMs[days] = Math.round((performance.now() - before) * 10) / 10;
  counts[days] = { rows: result.rows.filter(row => row.intervals.length).length,
    gateEvents: result.gateEvents.length, lineEvents: result.events.length - result.gateEvents.length };
}
console.log(JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch,
  readMs: Math.round(readMs * 10) / 10, parseMs: Math.round(parseMs * 10) / 10,
  replay1000Ms: Math.round(replay1000Ms * 10) / 10, deriveMs, counts,
  rssBytesAtEnd: process.memoryUsage().rss }, null, 2));
