import { engineIdentity, writeEngineIdentity } from './lib/engine-identity.mjs';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { createAnnualSource } from './lib/sharp-annual-source.mjs';
import { generateAnnualEventsAsync, verifyAnnualStructure } from '../src/features/transit-timeline/annual-events.js';

const root = resolve(import.meta.dirname, '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFile(resolve(root, path));
const { signatureInput, signature } = engineIdentity();
const years = process.argv.includes('--all')
  ? Array.from({ length: 16 }, (_, i) => 2021 + i)
  : [Number(process.argv.find(arg => /^\d{4}$/.test(arg)) || 2026)];
const outputIndex = process.argv.indexOf('--output');
const isolatedOutput = outputIndex !== -1;
if (isolatedOutput && !process.argv[outputIndex + 1]) throw new Error('--output requires a directory');
const outputRoot = resolve(root, isolatedOutput ? process.argv[outputIndex + 1] : 'public/transit-data');
if (isolatedOutput && outputRoot === resolve(root, 'public/transit-data')) throw new Error('Isolated output cannot overwrite published annual data');
await mkdir(resolve(outputRoot, signature), { recursive: true });
let manifest;
try { manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'))); }
catch { manifest = { format: 1, signature, signatureInput, years: {} }; }
if (manifest.signature !== signature) manifest = { format: 1, signature, signatureInput, years: {} };
for (const year of years) {
  const started = performance.now();
  const source = createAnnualSource(Date.UTC(year, 0, 1), Date.UTC(year + 1, 0, 1));
  const data = await generateAnnualEventsAsync({ year, snapshot: source.snapshot,
    onProgress: progress => { if (progress === 1 || Math.round(progress * 100) % 20 === 0) process.stderr.write(`\r${year}: ${Math.round(progress * 100)}%`); }
  });
  await source.client.close();
  data.signature = signature;
  verifyAnnualStructure(data);
  const bytes = Buffer.from(JSON.stringify(data));
  const checksum = hash(bytes);
  const filename = `${year}.${checksum.slice(0, 16)}.json`;
  const path = resolve(outputRoot, signature, filename);
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, bytes);
  await rename(temporary, path);
  manifest.years[year] = {
    path: `${signature}/${filename}`, sha256: checksum, bytes: bytes.length,
    gzipBytes: gzipSync(bytes).length, brotliBytes: brotliCompressSync(bytes).length,
    gateEvents: data.events.filter(event => event[2] !== event[4]).length,
    lineEvents: data.events.filter(event => event[2] === event[4]).length,
    records: data.events.length + 1
  };
  await writeFile(resolve(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const elapsedMs = Math.round(performance.now() - started);
  const memory = process.memoryUsage();
  process.stderr.write('\n');
  console.log(JSON.stringify({ year, signature, filename, elapsedMs,
    rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, ...manifest.years[year] }));
}
const manifestPath = resolve(outputRoot, 'manifest.json');
const temporaryManifest = `${manifestPath}.tmp-${process.pid}`;
await writeFile(temporaryManifest, JSON.stringify(manifest, null, 2) + '\n');
await rename(temporaryManifest, manifestPath);
if (!isolatedOutput) writeEngineIdentity();
