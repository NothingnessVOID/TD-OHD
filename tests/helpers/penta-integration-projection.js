import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const pentaIntegrationBase = 'f7cb220b880b54d482ca5c23889123f39c2c632e';
export const pentaContentHead = '0c5164349d85e95216847f94b98b39e7a9e94388';
// Parent-supplied final phase1 snapshot, including the Summary/Detail isolation fix.
// Never derive approval from HEAD or editable manifests.
export const pentaIntegrationHead = 'f347ff011e20e951c94b7dcf9f745a976b972399';
export const pentaContentPaths = Object.freeze([
  'src/lib/knowledge/content/penta-v1.json',
  'src/lib/knowledge/content/penta.js',
  'src/lib/knowledge/penta-foundation.js',
  'src/lib/knowledge/sources.js',
]);
export const pentaIntegrationPaths = Object.freeze([
  ...pentaContentPaths,
  'src/lib/knowledge/detail-renderer.js',
  'src/lib/knowledge/penta-reading-policy.js',
  'src/lib/penta-reading-messages.js',
  'src/lib/reference-catalog.js',
  'src/lib/shared-object-details.js',
  'src/views/penta-matrix.js',
  'src/views/reference.js',
  'src/views/team.js',
]);
export const pentaAddedPaths = Object.freeze([
  'src/lib/knowledge/content/penta-v1.json',
  'src/lib/knowledge/penta-reading-policy.js',
]);
const protectedPaths = ['src', 'engine-core', 'engine-tools', 'engine-wasm', 'jovian-engine',
  'scripts', 'third_party', 'public/transit-data', 'index.html', 'package.json',
  'package-lock.json', 'vite.config.js', '.env.production'];
const root = path.resolve(import.meta.dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const sha = source => createHash('sha256').update(source).digest('hex');
const cache = new Map();
function bytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!cache.has(key)) cache.set(key, git('show', key));
  return Buffer.from(cache.get(key));
}
const paths = output => output.toString().trim().split('\n').filter(Boolean).sort();
let reviewed = false;
export function assertPentaIntegrationApproval() {
  assert.match(pentaIntegrationHead, /^[0-9a-f]{40}$/,
    'Pending parent-supplied final Penta integration source SHA; fail closed');
  if (reviewed) return;
  assert.notEqual(pentaIntegrationHead, pentaIntegrationBase);
  git('merge-base', '--is-ancestor', pentaIntegrationBase, pentaContentHead);
  git('merge-base', '--is-ancestor', pentaContentHead, pentaIntegrationHead);
  assert.deepEqual(paths(git('diff', '--no-renames', '--name-only', pentaIntegrationBase,
    pentaContentHead, '--', ...protectedPaths)), [...pentaContentPaths].sort(),
  'Unreviewed Penta content source paths');
  assert.deepEqual(paths(git('diff', '--no-renames', '--name-only', pentaIntegrationBase,
    pentaIntegrationHead, '--', ...protectedPaths)), [...pentaIntegrationPaths].sort(),
  'Unreviewed Penta integration source paths');
  assert.deepEqual(paths(git('diff', '--no-renames', '--diff-filter=A', '--name-only',
    pentaIntegrationBase, pentaIntegrationHead, '--', ...protectedPaths)), [...pentaAddedPaths].sort(),
  'Unreviewed Penta added source paths');
  assert.deepEqual(paths(git('diff', '--no-renames', '--diff-filter=D', '--name-only',
    pentaIntegrationBase, pentaIntegrationHead, '--', ...protectedPaths)), [],
  'Unreviewed Penta source deletion');
  // Content and its provenance have an independent fixed parent source approval.
  for (const file of pentaContentPaths) assert.deepEqual(bytes(pentaIntegrationHead, file),
    bytes(pentaContentHead, file), `Unreviewed Penta content revision: ${file}`);
  reviewed = true;
}

/** Validate new and existing files alike, without inventing historical blobs for additions. */
export function assertPentaIntegrationSource(source, file) {
  assertPentaIntegrationApproval();
  assert.ok(pentaIntegrationPaths.includes(file), `Unreviewed Penta integration path: ${file}`);
  assert.equal(sha(source), sha(bytes(pentaIntegrationHead, file)),
    `Unreviewed increment source: ${file} (Penta integration)`);
}

/** Current bytes must validate before the latest header and every older projection. */
export function pentaIntegrationProjection(source, file) {
  if (!pentaIntegrationPaths.includes(file)) return source;
  assertPentaIntegrationSource(source, file);
  assert.ok(!pentaAddedPaths.includes(file), `New Penta file has no historical projection: ${file}`);
  return bytes(pentaIntegrationBase, file);
}
