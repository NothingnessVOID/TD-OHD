import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validatePentaPhase1CScope } from '../docs/frontend-knowledge-sync-v1/validate.mjs';

const root = path.resolve(import.meta.dirname, '..');
const scope = JSON.parse(readFileSync(path.join(root, 'docs/team/PHASE1C-SOURCE-SCOPE.json')));
function sandbox(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), 'phase1c-'));
  try {
    for (const file of ['docs/team/PHASE1C-SOURCE-SCOPE.json', ...Object.keys(scope.files)]) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      cpSync(path.join(root, file), path.join(dir, file));
    }
    return fn(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('Phase 1C pins each authorized source byte and rejects manifest expansion', () => {
  sandbox(dir => assert.deepEqual(validatePentaPhase1CScope(dir), scope.files));
  for (const file of Object.keys(scope.files)) sandbox(dir => {
    writeFileSync(path.join(dir, file), Buffer.concat([readFileSync(path.join(dir, file)), Buffer.from('\n')]));
    assert.throws(() => validatePentaPhase1CScope(dir), /Invalid Phase 1C source/);
  });
  sandbox(dir => {
    const file = path.join(dir, 'docs/team/PHASE1C-SOURCE-SCOPE.json');
    const altered = structuredClone(scope);
    altered.files['src/views/unreviewed.js'] = '0'.repeat(64);
    writeFileSync(file, JSON.stringify(altered));
    assert.throws(() => validatePentaPhase1CScope(dir), /Invalid Penta Phase 1C source scope/);
  });
});
