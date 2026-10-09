import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validatePentaPhase1BRevisionScope } from '../docs/frontend-knowledge-sync-v1/validate.mjs';

const root = path.resolve(import.meta.dirname, '..');
const scopeFile = 'docs/team/PHASE1B-REVISION-SCOPE.json';
const scope = JSON.parse(readFileSync(path.join(root, scopeFile)));
const paths = scope.allowedPaths;
function sandbox(run) {
  const temp = mkdtempSync(path.join(tmpdir(), 'penta-phase1b-revision-'));
  try {
    mkdirSync(path.join(temp, 'docs/team'), { recursive: true });
    cpSync(path.join(root, scopeFile), path.join(temp, scopeFile));
    for (const file of paths) {
      mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
      cpSync(path.join(root, file), path.join(temp, file));
    }
    return run(temp);
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

test('frozen revision checks each source against independently pinned SHA-256', () => {
  sandbox(temp => assert.deepEqual(validatePentaPhase1BRevisionScope(temp, paths), paths));
  assert.equal(scope.status, 'frozen');
  assert.equal(Object.keys(scope.files).length, 6);
  for (const file of paths) sandbox(temp => {
    const target = path.join(temp, file);
    writeFileSync(target, Buffer.concat([readFileSync(target), Buffer.from('\n')]));
    assert.throws(() => validatePentaPhase1BRevisionScope(temp, paths), /Invalid Penta Phase 1B revision scope/);
  });
});

test('unlicensed sources, protected paths and path variants are rejected', () => {
  for (const file of ['src/main.js', 'src/lib/team-extra.js', 'src/views/../views/team.js', 'engine-core/TransitCore.cs'])
    sandbox(temp => assert.throws(() => validatePentaPhase1BRevisionScope(temp, [file]), /Unlicensed Phase 1B revision source/));
});

test('manifest changes cannot extend paths, hashes, baseline or freeze state', () => {
  for (const edit of [s => s.allowedPaths.push('src/main.js'), s => { s.files[paths[0]] = '0'.repeat(64); },
    s => { s.baseline = '0'.repeat(40); }, s => { s.status = 'draft-unfrozen'; }]) sandbox(temp => {
    const target = path.join(temp, scopeFile);
    const data = JSON.parse(readFileSync(target)); edit(data); writeFileSync(target, JSON.stringify(data));
    assert.throws(() => validatePentaPhase1BRevisionScope(temp, []), /Invalid Penta Phase 1B revision scope/);
  });
});

test('original Phase 1B scope remains independently pinned to its original baseline', () => {
  const original = JSON.parse(readFileSync(path.join(root, 'docs/team/PHASE1B-SOURCE-SCOPE.json')));
  assert.equal(original.baseline, '56e9419185d6c7e2edf02278fe208ee7e6443a03');
  assert.equal(Object.keys(original.files).length, 6);
  for (const file of paths) assert.match(original.files[file], /^[0-9a-f]{64}$/);
});
