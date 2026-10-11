import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { v2RootBase, v2PhaseA, assertV2SourceApproval, v2SourceProjection,
  v2SnapshotBytes } from './penta-wa-v2-review.js';
import { finalPhases, finalActivePhases, v2PhaseB, v2PhaseC } from './penta-wa-v2-final-phases.js';
import { integrationAddedPaths as oldAddedPaths } from './wa-integration-projection.js';
export { finalPhases, finalActivePhases, v2PhaseB, v2PhaseC };
export const finalSourcePaths = Object.freeze([...new Set(finalActivePhases.flatMap(id => finalPhases[id].paths))]);
export const finalAddedPaths = Object.freeze([...new Set(finalActivePhases.flatMap(id => finalPhases[id].addedPaths))]);
export const integrationAddedPaths = Object.freeze([...oldAddedPaths, ...finalAddedPaths]);
const root = path.resolve(import.meta.dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const protectedPaths = ['src', 'engine-core', 'engine-tools', 'engine-wasm', 'jovian-engine',
  'scripts', 'third_party', 'public/transit-data', 'index.html', 'package.json',
  'package-lock.json', 'vite.config.js', '.env.production'];
const paths = output => output.toString().trim().split('\n').filter(Boolean).sort();
const sha = source => createHash('sha256').update(source).digest('hex');
function assertRange(base, head, expected, additions, label) {
  assert.match(head, /^[0-9a-f]{40}$/, `Pending parent ${label} source approval; fail closed`);
  git('merge-base', '--is-ancestor', base, head);
  assert.deepEqual(paths(git('diff', '--no-renames', '--name-only', base, head, '--', ...protectedPaths)),
    [...expected].sort(), `Unreviewed ${label} source paths`);
  assert.deepEqual(paths(git('diff', '--no-renames', '--diff-filter=A', '--name-only', base, head, '--', ...protectedPaths)),
    [...additions].sort(), `Unreviewed ${label} added paths`);
  assert.deepEqual(paths(git('diff', '--no-renames', '--diff-filter=D', '--name-only', base, head, '--', ...protectedPaths)),
    [], `Unreviewed ${label} deletion`);
}
let reviewed = false;
export function assertFinalSourceApproval() {
  if (reviewed) return;
  assertV2SourceApproval();
  assert.deepEqual(finalActivePhases, ['A', 'B', 'C'], 'Pending parent final active phases; fail closed');
  let preceding = v2RootBase;
  for (const id of finalActivePhases) {
    const phase = finalPhases[id];
    assert.equal(phase.base, preceding, `Unreviewed phase ${id} range`);
    assertRange(phase.base, phase.head, phase.paths, phase.addedPaths, `v2 phase ${id}`);
    preceding = phase.head;
  }
  assertRange(v2RootBase, v2PhaseC.head, finalSourcePaths, finalAddedPaths, 'v2 final');
  // Later phases cannot silently repin A or B-only source files.
  for (const file of finalSourcePaths) {
    const phase = [...finalActivePhases].reverse().map(id => finalPhases[id]).find(item => item.paths.includes(file));
    assert.equal(sha(v2SnapshotBytes(v2PhaseC.head, file)), sha(v2SnapshotBytes(phase.head, file)),
      `Unreviewed final phase provenance: ${file}`);
  }
  reviewed = true;
}
export function assertFinalSource(source, file) {
  assertFinalSourceApproval();
  assert.ok(finalSourcePaths.includes(file), `Unreviewed final v2 path: ${file}`);
  assert.equal(sha(source), sha(v2SnapshotBytes(v2PhaseC.head, file)),
    `Unreviewed increment source: ${file} (v2 final)`);
}
/** Check B/C before the immutable A projection, then old Wa/Penta. */
export function finalSourceProjection(source, file) {
  if (!finalSourcePaths.includes(file)) return source;
  assertFinalSource(source, file);
  assert.ok(!finalAddedPaths.includes(file), `New v2 file has no historical projection: ${file}`);
  return v2SourceProjection(v2SnapshotBytes(v2PhaseA.head, file), file);
}
