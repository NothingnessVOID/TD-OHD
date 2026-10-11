import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
const sha = source => createHash('sha256').update(source).digest('hex');

export const v2RootBase = 'c379fbe6b9a1b4b472b900aeedc691275407c3f8';
// Parent-supplied source approval. Append later phase records; never repin A.
export const v2PhaseA = Object.freeze({
  base: v2RootBase,
  head: '9b01fb87fce51648b4fddf4d0dcdd9defe8867c7',
  paths: Object.freeze([
    'src/lib/knowledge/content/penta-v1.json',
    'src/lib/knowledge/content/penta.js',
    'src/lib/knowledge/penta-foundation.js',
    'src/lib/knowledge/sources.js',
    'src/lib/wa/content-data.json',
  ]),
  addedPaths: Object.freeze([]),
});
export const v2Phases = Object.freeze({ A: v2PhaseA });
export const v2PendingPhases = Object.freeze(['B', 'C']);
// Explicit authorization, independent of HEAD, working bytes, and pending phases.
export const v2ActivePhases = Object.freeze(['A']);
export const v2SourcePaths = Object.freeze([...new Set(v2ActivePhases.flatMap(id => v2Phases[id].paths))]);
export const v2AddedPaths = Object.freeze([...new Set(v2ActivePhases.flatMap(id => v2Phases[id].addedPaths))]);
const root = path.resolve(import.meta.dirname, '../..');
const protectedPaths = ['src', 'engine-core', 'engine-tools', 'engine-wasm', 'jovian-engine',
  'scripts', 'third_party', 'public/transit-data', 'index.html', 'package.json',
  'package-lock.json', 'vite.config.js', '.env.production'];
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const paths = output => output.toString().trim().split('\n').filter(Boolean).sort();
const cache = new Map();
export function v2SnapshotBytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!cache.has(key)) cache.set(key, git('show', key));
  return Buffer.from(cache.get(key));
}
let reviewed = false;
export function assertV2SourceApproval() {
  if (reviewed) return;
  assert.ok(v2ActivePhases.length > 0, 'Pending parent v2 source approval; fail closed');
  assert.equal(new Set(v2ActivePhases).size, v2ActivePhases.length, 'Duplicate active v2 phase');
  let preceding = v2RootBase;
  for (const id of v2ActivePhases) {
    const phase = v2Phases[id];
    assert.ok(phase && !v2PendingPhases.includes(id), `Pending parent v2 phase ${id}; fail closed`);
    assert.equal(phase.base, preceding, `Unreviewed v2 phase ${id} range`);
    assert.match(phase.head, /^[0-9a-f]{40}$/, `Pending parent v2 phase ${id} SHA; fail closed`);
    assert.notEqual(phase.base, phase.head);
    git('merge-base', '--is-ancestor', phase.base, phase.head);
    assert.deepEqual(paths(git('diff', '--no-renames', '--name-only', phase.base, phase.head,
      '--', ...protectedPaths)), [...phase.paths].sort(), `Unreviewed v2 phase ${id} source paths`);
    assert.deepEqual(paths(git('diff', '--no-renames', '--diff-filter=A', '--name-only',
      phase.base, phase.head, '--', ...protectedPaths)), [...phase.addedPaths].sort(),
    `Unreviewed v2 phase ${id} added paths`);
    assert.deepEqual(paths(git('diff', '--no-renames', '--diff-filter=D', '--name-only',
      phase.base, phase.head, '--', ...protectedPaths)), [], `Unreviewed v2 phase ${id} deletion`);
    preceding = phase.head;
  }
  reviewed = true;
}
export function assertV2Source(source, file) {
  assertV2SourceApproval();
  assert.ok(v2SourcePaths.includes(file), `Unreviewed v2 path: ${file}`);
  const phase = [...v2ActivePhases].reverse().map(id => v2Phases[id]).find(item => item.paths.includes(file));
  assert.equal(sha(source), sha(v2SnapshotBytes(phase.head, file)),
    `Unreviewed increment source: ${file} (v2)`);
}
/** Validate current bytes before Wa/Penta; only rootbase files have historical bytes. */
export function v2SourceProjection(source, file) {
  if (!v2SourcePaths.includes(file)) return source;
  assertV2Source(source, file);
  assert.ok(!v2AddedPaths.includes(file), `New v2 file has no historical projection: ${file}`);
  return v2SnapshotBytes(v2RootBase, file);
}
