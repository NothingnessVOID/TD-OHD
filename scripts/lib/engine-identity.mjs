/** Reproducible source/file identity shared by browser caches and native annual data. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { generateAnnualEventsAsync } from '../../src/features/transit-timeline/annual-events.js';
const root = resolve(import.meta.dirname, '../..');
const vendor = resolve(root, 'third_party/SharpAstrology.SwissEph');
const hash = value => createHash('sha256').update(value).digest('hex');
export function sourceFiles(directory = vendor) {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .flatMap(entry => entry.isDirectory() ? ['bin', 'obj', '.git'].includes(entry.name) ? [] : sourceFiles(resolve(directory, entry.name))
      : /\.(cs|csproj)$/.test(entry.name) ? [resolve(directory, entry.name)] : []);
}
export function engineIdentity() {
  const upstreamFiles = JSON.parse(readFileSync(resolve(vendor, 'upstream-files.json')));
  const patchedFiles = Object.fromEntries(sourceFiles().map(file => [relative(vendor, file).replaceAll('\\', '/'), hash(readFileSync(file))]));
  const epheBytes = readFileSync(resolve(root, 'engine-wasm/ephemeris-manifest.json'));
  const ephe = JSON.parse(epheBytes);
  const identity = {
    humanDesignVersion: '1.2.0', baseVersion: '0.14.0', swissUpstreamVersion: '0.5.1',
    swissUpstreamRepository: 'https://github.com/CReizner/SharpAstrology.SwissEph',
    swissUpstreamCommit: '342a57997c1b987e7949acc98897c8b73d05939a',
    patchRevision: 'td-ohd-swiss-parity-v1-true-node-light-time', patchedSourceSha256: hash(JSON.stringify(patchedFiles)),
    ephemerisManifestSha256: hash(epheBytes), utcSemanticsVersion: 'utc-tt-ut1-swe-utc-to-jd-v1'
  };
  const signatureInput = {
    format: 1, ...identity, swissCommit: ephe.commit, swissFiles: ephe.files,
    transitAdapterSha256: hash(readFileSync(resolve(root, 'engine-core/TransitCore.cs'))),
    timeAdapterSha256: hash(readFileSync(resolve(root, 'src/lib/transit-time.js'))),
    annualAlgorithmSha256: hash(generateAnnualEventsAsync.toString()),
    scanStepMs: 60000, boundaryToleranceMs: 1000, points: 13,
    convention: 'apparent tropical geocentric, proper UTC->UT1, file-based Swiss, no Moshier fallback'
  };
  const changedFiles = Object.keys(patchedFiles).filter(file => patchedFiles[file] !== upstreamFiles[file])
    .map(file => ({ file, upstreamSha256: upstreamFiles[file] ?? null, patchedSha256: patchedFiles[file] }));
  return { identity, signatureInput, signature: hash(JSON.stringify(signatureInput)).slice(0, 20), changedFiles };
}
export function writeEngineIdentity() {
  const data = engineIdentity();
  writeFileSync(resolve(vendor, 'patch-manifest.json'), JSON.stringify(data, null, 2) + '\n');
  writeFileSync(resolve(root, 'src/lib/chart-engine/engine-identity.js'),
    '// Generated from pinned source and ephemeris hashes by scripts/lib/engine-identity.mjs.\n' +
    `export const ENGINE_IDENTITY = Object.freeze(${JSON.stringify(data.identity, null, 2)});\n` +
    `export const ENGINE_SIGNATURE = '${data.signature}';\n`);
  writeFileSync(resolve(root, 'src/features/transit-timeline/annual-signature.js'),
    "// Annual files must share the exact source/time/ephemeris identity.\nimport { ENGINE_SIGNATURE } from '../../lib/chart-engine/engine-identity.js';\nexport const ANNUAL_SIGNATURE = ENGINE_SIGNATURE;\n");
  return data;
}
