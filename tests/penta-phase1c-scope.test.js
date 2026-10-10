import {incrementHistoricalSource} from './helpers/release-increment-projection.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validatePentaPhase1CScope, validatePentaPhase1CPolishScope, validatePentaPhase1CFinalScope } from '../docs/frontend-knowledge-sync-v1/validate.mjs';

const root = path.resolve(import.meta.dirname, '..');
const scope = JSON.parse(readFileSync(path.join(root, 'docs/team/PHASE1C-SOURCE-SCOPE.json')));
const polish = JSON.parse(readFileSync(path.join(root, 'docs/team/PHASE1C-POLISH-SOURCE-SCOPE.json')));
const final = JSON.parse(readFileSync(path.join(root, 'docs/team/PHASE1C-FINAL-SOURCE-SCOPE.json')));
function sandbox(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), 'phase1c-'));
  try {
    for (const file of ['docs/team/PHASE1C-SOURCE-SCOPE.json', 'docs/team/PHASE1C-POLISH-SOURCE-SCOPE.json', 'docs/team/PHASE1C-FINAL-SOURCE-SCOPE.json', ...new Set([...Object.keys(scope.files), ...Object.keys(polish.files), ...Object.keys(final.files)])]) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      // Exercise the historical snapshot with its own original bytes; Phase 1E has a separate guard.
      if (['src/views/penta-matrix.js','src/styles/penta-matrix.css'].includes(file))
        writeFileSync(path.join(dir, file), execFileSync('git', ['show', `da21b31c8832e4786a68b34c6956c0b7efa65946:${file}`], { cwd: root }));
      else writeFileSync(path.join(dir, file), incrementHistoricalSource(file));
    }
    return fn(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('Phase 1C pins each authorized source byte and rejects manifest expansion', () => {
  sandbox(dir => {
    assert.deepEqual(validatePentaPhase1CScope(dir), scope.files);
    assert.deepEqual(validatePentaPhase1CPolishScope(dir), polish.files);
    assert.deepEqual(validatePentaPhase1CFinalScope(dir), final.files);
  });
  for (const file of Object.keys(polish.files)) if (!Object.hasOwn(final.files, file)) sandbox(dir => {
    writeFileSync(path.join(dir, file), Buffer.concat([readFileSync(path.join(dir, file)), Buffer.from('\n')]));
    assert.throws(() => validatePentaPhase1CPolishScope(dir), /Invalid Phase 1C polish source/);
  });
  for (const file of Object.keys(final.files)) sandbox(dir => {
    writeFileSync(path.join(dir, file), Buffer.concat([readFileSync(path.join(dir, file)), Buffer.from('\n')]));
    assert.throws(() => validatePentaPhase1CFinalScope(dir), /Invalid Phase 1C final source/);
  });
  sandbox(dir => {
    const file = path.join(dir, 'docs/team/PHASE1C-SOURCE-SCOPE.json');
    const altered = structuredClone(scope);
    altered.files['src/views/unreviewed.js'] = '0'.repeat(64);
    writeFileSync(file, JSON.stringify(altered));
    assert.throws(() => validatePentaPhase1CScope(dir), /Invalid Penta Phase 1C source scope/);
  });
  sandbox(dir => {
    const file = path.join(dir, 'docs/team/PHASE1C-POLISH-SOURCE-SCOPE.json');
    const altered = structuredClone(polish);
    altered.files['src/views/unreviewed.js'] = '0'.repeat(64);
    writeFileSync(file, JSON.stringify(altered));
    assert.throws(() => validatePentaPhase1CPolishScope(dir), /Invalid Phase 1C polish source scope/);
  });
  sandbox(dir => assert.throws(() => validatePentaPhase1CPolishScope(dir, ['src/views/unreviewed.js']), /Unreviewed Phase 1C polish source/));
  sandbox(dir => {
    const file = path.join(dir, 'docs/team/PHASE1C-FINAL-SOURCE-SCOPE.json');
    const altered = structuredClone(final);
    altered.files['src/views/unreviewed.js'] = '0'.repeat(64);
    writeFileSync(file, JSON.stringify(altered));
    assert.throws(() => validatePentaPhase1CFinalScope(dir), /Invalid Phase 1C final source scope/);
  });
  sandbox(dir => assert.throws(() => validatePentaPhase1CFinalScope(dir, ['src/views/unreviewed.js']), /Unreviewed Phase 1C final source/));
});
