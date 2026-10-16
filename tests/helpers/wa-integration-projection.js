import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pentaAddedPaths } from './penta-integration-projection.js';

export const waIntegrationBase = 'f278e419e605e65d6f7ec501857bdc896103e2fa';
// Preparation evidence only. Neither candidate nor HEAD confers approval.
export const waPreparationHead = '31a1d6f3ceede61c4ff85fd43a105f968459dc56';
import { waIntegrationHead } from './wa-integration-approval.js';
export { waIntegrationHead, waAuditHead } from './wa-integration-approval.js';
export const waAddedPaths = Object.freeze([
  'src/lib/wa/analysis.js',
  'src/lib/wa/content-data.json',
  'src/lib/wa/content.js',
  'src/lib/wa/messages.js',
  'src/lib/wa/model.js',
  'src/lib/wa/repository.js',
  'src/lib/wa/schema.json',
  'src/styles/wa.css',
  'src/views/wa.js',
]);
export const waIntegrationPaths = Object.freeze([
  ...waAddedPaths, 'src/main.js', 'index.html', 'package.json', 'package-lock.json',
]);
export const integrationAddedPaths = Object.freeze([...pentaAddedPaths, ...waAddedPaths]);
const protectedPaths = ['src', 'engine-core', 'engine-tools', 'engine-wasm', 'jovian-engine',
  'scripts', 'third_party', 'public/transit-data', 'index.html', 'package.json',
  'package-lock.json', 'vite.config.js', '.env.production'];
const root = path.resolve(import.meta.dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const sha = source => createHash('sha256').update(source).digest('hex');
const cache = new Map();
export function waSnapshotBytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!cache.has(key)) cache.set(key, git('show', key));
  return Buffer.from(cache.get(key));
}
const paths = output => output.toString().trim().split('\n').filter(Boolean).sort();
let reviewed = false;
export function assertWaIntegrationApproval() {
  assert.match(waIntegrationHead, /^[0-9a-f]{40}$/, 'Pending parent final Wa source approval; fail closed');
  if (reviewed) return;
  assert.notEqual(waIntegrationHead, waIntegrationBase);
  git('merge-base', '--is-ancestor', waIntegrationBase, waIntegrationHead);
  assert.deepEqual(paths(git('diff', '--no-renames', '--name-only', waIntegrationBase,
    waIntegrationHead, '--', ...protectedPaths)), [...waIntegrationPaths].sort(), 'Unreviewed Wa source paths');
  assert.deepEqual(paths(git('diff', '--no-renames', '--diff-filter=A', '--name-only',
    waIntegrationBase, waIntegrationHead, '--', ...protectedPaths)), [...waAddedPaths].sort(), 'Unreviewed Wa added paths');
  assert.deepEqual(paths(git('diff', '--no-renames', '--diff-filter=D', '--name-only',
    waIntegrationBase, waIntegrationHead, '--', ...protectedPaths)), [], 'Unreviewed Wa deletion');
  reviewed = true;
}
export function assertWaIntegrationSource(source, file) {
  assertWaIntegrationApproval();
  assert.ok(waIntegrationPaths.includes(file), `Unreviewed Wa path: ${file}`);
  assert.equal(sha(source), sha(waSnapshotBytes(waIntegrationHead, file)),
    `Unreviewed increment source: ${file} (Wa integration)`);
}
/** Check current bytes before Penta and every older projection. Additions have no old blob. */
export function waIntegrationProjection(source, file) {
  if (!waIntegrationPaths.includes(file)) return source;
  assertWaIntegrationSource(source, file);
  assert.ok(!waAddedPaths.includes(file), `New Wa file has no historical projection: ${file}`);
  return waSnapshotBytes(waIntegrationBase, file);
}
