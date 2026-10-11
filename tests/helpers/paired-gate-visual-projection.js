import assert from 'node:assert/strict';
import { channelStatusProjection } from './channel-status-projection.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Independently reviewed paired-gate visual snapshot. Never approve HEAD or working bytes.
export const pairedGateVisualBase = 'e8d07bbedf1b4cb96cfbb6b609e04151f26a45cb';
export const pairedGateVisualHead = 'dc5fc87a2d2449b9a66923b63b842818fdeb810c';
export const pairedGateVisualPaths = Object.freeze(['src/styles.css', 'src/views/chart.js']);
const root = path.resolve(import.meta.dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const sha = source => createHash('sha256').update(source).digest('hex');
const cache = new Map();
function bytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!cache.has(key)) cache.set(key, git('show', key));
  return Buffer.from(cache.get(key));
}
assert.match(pairedGateVisualHead, /^[0-9a-f]{40}$/, 'Expected fixed independently reviewed paired-gate visual SHA');
const changed = git('diff', '--name-only', pairedGateVisualBase, pairedGateVisualHead, '--',
  'src', 'engine-core', 'engine-tools', 'engine-wasm', 'jovian-engine', 'scripts',
  'third_party', 'public/transit-data', 'index.html', 'package.json', 'package-lock.json',
  'vite.config.js', '.env.production').toString().trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changed, [...pairedGateVisualPaths].sort(), 'Unreviewed paired-gate visual source paths');

/** Validate current bytes before the unchanged issue/release guards; other paths retain their input. */
export function pairedGateVisualProjection(source, file) {
  source = channelStatusProjection(source, file);
  if (!pairedGateVisualPaths.includes(file)) return source;
  assert.equal(sha(source), sha(bytes(pairedGateVisualHead, file)), `Unreviewed increment source: ${file} (paired-gate visual)`);
  return bytes(pairedGateVisualBase, file);
}
