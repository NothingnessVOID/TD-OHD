import assert from 'node:assert/strict';
import { pairedGateVisualProjection } from './paired-gate-visual-projection.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Independently reviewed issue 22/23/27 source snapshot. Never approve HEAD or working bytes.
export const issueDetailsBase = 'f436587116ab605eb1d9ff1b50c333bd7c23cdcc';
export const issueDetailsHead = 'b11cb649040c7b2e016758b1c0a0e34f71ecaa29';
export const issueDetailsPaths = Object.freeze([
  'src/styles.css',
  'src/styles/penta-matrix.css',
  'src/views/chart.js',
  'src/views/penta-matrix.js',
  'src/views/team.js',
]);
const root = path.resolve(import.meta.dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const cache = new Map();
function bytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!cache.has(key)) cache.set(key, git('show', key));
  return Buffer.from(cache.get(key));
}
// Match the complete protected-source diff, excluding issue docs/tests owned by other tasks.
const changed = git('diff', '--name-only', issueDetailsBase, issueDetailsHead, '--',
  'src', 'engine-core', 'engine-tools', 'engine-wasm', 'jovian-engine', 'scripts',
  'third_party', 'public/transit-data', 'index.html', 'package.json', 'package-lock.json',
  'vite.config.js', '.env.production').toString().trim().split('\n').sort();
assert.deepEqual(changed, [...issueDetailsPaths].sort(), 'Unreviewed issue details source paths');

/** Validate supplied current bytes before historical projection; unknown paths retain all older guards. */
export function issueDetailsProjection(source, file) {
  source = pairedGateVisualProjection(source, file);
  if (!issueDetailsPaths.includes(file)) return source;
  assert.equal(sha(source), sha(bytes(issueDetailsHead, file)), `Unreviewed increment source: ${file} (issue details)`);
  return bytes(issueDetailsBase, file);
}
