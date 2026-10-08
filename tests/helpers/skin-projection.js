import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';

export const skinScope = JSON.parse(readFileSync(new URL('../fixtures/skin-reviewed-scope.json', import.meta.url)));
export const skinBase = skinScope.base;
const root = path.resolve(import.meta.dirname, '../..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd: root});

/** Validate a current file against the explicit review hash, then project it into a historical guard. */
export function approvedSkinSource(file, historical) {
  assert.ok(Object.hasOwn(skinScope.files, file), `no approved skin hash for ${file}`);
  const current = readFileSync(path.join(root, file));
  assert.equal(sha256(current), skinScope.files[file], `approved skin hash changed: ${file}`);
  const reviewed = git('show', `${skinScope.reviewedHead}:${file}`);
  assert.equal(sha256(reviewed), skinScope.files[file], `reviewed snapshot hash differs: ${file}`);
  return reviewed;
}

export function skinProjection(file, historical) {
  if (Object.hasOwn(skinScope.files, file)) return approvedSkinSource(file, historical);
  return git('show', `${historical}:${file}`);
}

export function originMainSource(file) { return git('show', `${skinScope.base}:${file}`); }

/** Exact path/hash check plus explicit algorithm, catalog, relationship and astronomy invariants. */
export function assertSkinScopeBoundary() {
  const actualSrc = git('diff', '--name-only', `${skinScope.base}...${skinScope.reviewedHead}`, '--', 'src').toString().trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(skinScope.srcFiles.slice().sort(), actualSrc, 'skin manifest src paths must exactly match reviewed diff');
  for (const [file, digest] of Object.entries(skinScope.files))
    assert.equal(sha256(git('show', `${skinScope.reviewedHead}:${file}`)), digest, `reviewed HEAD hash differs: ${file}`);
  for (const file of [...skinScope.srcFiles, 'index.html', 'package.json'])
    assert.equal(sha256(readFileSync(path.join(root, file))), skinScope.files[file], `working file differs from reviewed skin: ${file}`);
  for (const file of ['src/lib/chart-engine/sharp-contract.js','src/lib/human-design/variable-data.js','src/lib/human-design/connection.js','src/lib/transit-graph.js','src/features/transit-timeline/core.js','src/lib/bodygraph-integration.js','src/lib/human-design/bodygraph-geometry.js','src/lib/gate-lenses.js','src/lib/variable-arrows.js','engine-core/TransitCore.cs'])
    assert.deepEqual(readFileSync(path.join(root, file)), git('show', `${skinScope.base}:${file}`), `${file} remains origin/main exact`);
  return {srcFiles: skinScope.srcFiles.length, exactHashes: Object.keys(skinScope.files).length};
}
