import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Parent-supplied reviewed source SHA only. Never infer approval from HEAD or working bytes.
export const channelStatusBase = '94ae062dc1d1d19ca7f8cbfa7cee2f31546ae963';
export const channelStatusHead = '73b926bbc606b30242610d83feeaf6ba414a0228';
export const channelStatusPaths = Object.freeze(['src/views/chart.js']);
const root = path.resolve(import.meta.dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const sha = source => createHash('sha256').update(source).digest('hex');
const cache = new Map();
function bytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!cache.has(key)) cache.set(key, git('show', key));
  return Buffer.from(cache.get(key));
}
assert.match(channelStatusHead, /^[0-9a-f]{40}$/, 'Expected fixed parent-supplied channel-status source SHA');
const changed = git('diff', '--name-only', channelStatusBase, channelStatusHead, '--',
  'src', 'engine-core', 'engine-tools', 'engine-wasm', 'jovian-engine', 'scripts',
  'third_party', 'public/transit-data', 'index.html', 'package.json', 'package-lock.json',
  'vite.config.js', '.env.production').toString().trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changed, [...channelStatusPaths], 'Unreviewed channel-status source paths');

/** Accept only fixed new chart bytes, then restore base94 before the existing paired layer. */
export function channelStatusProjection(source, file) {
  if (!channelStatusPaths.includes(file)) return source;
  assert.equal(sha(source), sha(bytes(channelStatusHead, file)), `Unreviewed increment source: ${file} (channel status)`);
  return bytes(channelStatusBase, file);
}
