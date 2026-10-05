/** Frontend review guard. The historical release manifest remains an immutable snapshot. */
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { validateDistribution } from '../release-licensing-v1/validate.mjs';
const root = path.resolve(import.meta.dirname, '../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(readFileSync(path.join(root, file)));
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
export function validateFrontendRelease() {
  const review = json('docs/frontend-runtime-ux-v1/review-hashes.json');
  const identity = json('docs/release-licensing-v1/production-identity.json');
  const allowedFrontend = /^(?:src\/main\.js|src\/views\/(?:entry|connection|team)\.js|src\/lib\/(?:i18n|initial-locale|local-store|location|people|placesearch|sync|sync-config|temporary-birth)\.js|src\/locales\/(?:zh-CN|zh-Hant)\/(?:index\.js|ui-runtime\.json)|src\/features\/transit-timeline\/(?:presets\.js|view\.js|timeline\.css|core\.js))$/;
  for (const file of Object.keys(review.frontendSources))
    if (!allowedFrontend.test(file)) throw new Error(`Outside frontend review scope: ${file}`);
  // This task authorizes only the calendar-range ceiling change in core.js.
  // Keep every calculation statement byte-identical to the integration baseline.
  const timelineCore = 'src/features/transit-timeline/core.js';
  const originalCore = execFileSync('git', ['show', `${review.baseline}:${timelineCore}`], { cwd: root, encoding: 'utf8' });
  const expectedCore = originalCore.replace(
    '// A 366-day local calendar span may gain an hour across a daylight-saving fold.\nexport const MAX_TIMELINE_SPAN = 367 * DAY;',
    '// An inclusive calendar year can cover 367 dates plus a historical 24h rollback\n// (Pacific/Apia, 1891-08-01 through 1892-08-01): exactly 368 elapsed days.\nexport const MAX_TIMELINE_SPAN = 368 * DAY;');
  if (readFileSync(path.join(root, timelineCore), 'utf8') !== expectedCore)
    throw new Error('Timeline core change exceeds the reviewed span ceiling');
  validateDistribution();
  // All computation source checks remain pinned to the previously licensed release.
  for (const [file, expected] of Object.entries(identity.relevantSourceHashes))
    if (hash(readFileSync(path.join(root, file))) !== expected) throw new Error(`Calculation source changed: ${file}`);
  const protectedFile = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|third_party\/|jovian-engine\/|public\/transit-data\/)/.test(file) || /^package(?:-lock)?\.json$/.test(file);
  const baseline = execFileSync('git', ['ls-tree', '-r', '--name-only', review.baseline], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(protectedFile);
  const currentFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
  for (const file of currentFiles.filter(protectedFile))
    if (!baseline.includes(file) && !review.frontendSources[file]) throw new Error(`Unreviewed new source: ${file}`);
  for (const file of baseline) {
    const original = execFileSync('git', ['show', `${review.baseline}:${file}`], { cwd: root });
    const expected = review.frontendSources[file] || hash(original);
    if (hash(readFileSync(path.join(root, file))) !== expected) throw new Error(`Unreviewed source change: ${file}`);
  }
  for (const [file, expected] of Object.entries(review.frontendSources))
    if (hash(readFileSync(path.join(root, file))) !== expected) throw new Error(`Frontend review hash differs: ${file}`);
  for (const [file, expected] of Object.entries(review.distribution))
    if (hash(readFileSync(path.join(root, 'dist', file))) !== expected) throw new Error(`Build hash differs: ${file}`);
  const actual = files(path.join(root, 'dist')).map(f => path.relative(path.join(root, 'dist'), f)).sort();
  if (JSON.stringify(actual) !== JSON.stringify(Object.keys(review.distribution).sort())) throw new Error('Unexpected distribution files');
  if (actual.some(file => /jovian|swiss176|de406|native_backend/i.test(file))) throw new Error('Historical runtime in browser');
  for (const [name, expected] of Object.entries(identity.ephemerisHashes))
    if (hash(readFileSync(path.join(root, 'dist/engine/ephe', name))) !== expected) throw new Error(`Ephemeris changed: ${name}`);
  return { passed: true, engineSignature: identity.engineSignature, baseline: review.baseline,
    reviewedFrontendFiles: Object.keys(review.frontendSources).length, protectedBaselineFiles: baseline.length };
}
