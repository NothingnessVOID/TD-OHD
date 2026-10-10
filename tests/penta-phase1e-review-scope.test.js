import {incrementHistoricalSource} from './helpers/release-increment-projection.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validatePentaPhase1EScope, validatePentaPhase1EReviewScope } from '../docs/frontend-knowledge-sync-v1/validate.mjs';

const root = path.resolve(import.meta.dirname, '..');
test('Phase 1E original snapshot and correction each retain independent exact hashes', () => {
  assert.equal(Object.keys(validatePentaPhase1EScope(root)).length, 9);
  const reviewed = validatePentaPhase1EReviewScope(root);
  assert.equal(Object.keys(reviewed).length, 7);
  const dir = mkdtempSync(path.join(tmpdir(), 'penta-review-'));
  try {
    const manifest = 'docs/team/PHASE1E-REVIEW-SOURCE-SCOPE.json';
    for (const file of [manifest, ...Object.keys(reviewed)]) {
      mkdirSync(path.dirname(path.join(dir,file)), { recursive:true });
      writeFileSync(path.join(dir,file), incrementHistoricalSource(file));
    }
    assert.deepEqual(validatePentaPhase1EReviewScope(dir), reviewed);
    const file = 'src/lib/knowledge/content/penta.js';
    writeFileSync(path.join(dir,file), readFileSync(path.join(dir,file),'utf8') + '\n');
    assert.throws(() => validatePentaPhase1EReviewScope(dir), /Invalid Phase 1E review source scope/);
    cpSync(path.join(root,file),path.join(dir,file));
    const scope = JSON.parse(readFileSync(path.join(dir,manifest),'utf8'));
    scope.files['src/lib/human-design/penta-catalog.js'] = '0'.repeat(64);
    writeFileSync(path.join(dir,manifest),JSON.stringify(scope));
    assert.throws(() => validatePentaPhase1EReviewScope(dir), /Invalid Phase 1E review source scope/);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
