import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validatePentaPhase1AScope } from '../docs/frontend-knowledge-sync-v1/validate.mjs';

const root = path.resolve(import.meta.dirname, '..');
const scopeFile = 'docs/team/PHASE1A-SOURCE-SCOPE.json';
const files = [
  'src/lib/human-design/penta-catalog.js',
  'src/lib/human-design/team-activation.js',
  'src/lib/human-design/penta-structure.js'
];
function sandbox(run) {
  const temp = mkdtempSync(path.join(tmpdir(), 'penta-phase1a-review-'));
  try {
    for (const file of [...files, scopeFile]) {
      mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
      cpSync(path.join(root, file), path.join(temp, file));
    }
    return run(temp);
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

test('the three reviewed source paths match exact SHA-256 and committed Phase 1A blobs', () => {
  sandbox(temp => assert.deepEqual(validatePentaPhase1AScope(temp, files), files));
});

test('unregistered new source cannot pass the additive allowlist', () => {
  sandbox(temp => assert.throws(() => validatePentaPhase1AScope(temp, [...files, 'src/lib/human-design/extra.js']),
    /Unreviewed new source: src\/lib\/human-design\/extra\.js/));
});

test('mutating any reviewed source fails even when the scope manifest is also modified', () => {
  for (const file of files) sandbox(temp => {
    writeFileSync(path.join(temp, file), readFileSync(path.join(temp, file), 'utf8') + '\n// unexpected mutation\n');
    assert.throws(() => validatePentaPhase1AScope(temp, files), /Invalid Penta Phase 1A source scope/);
  });
});

test('manifest cannot add a fourth path or change a reviewed digest', () => {
  sandbox(temp => {
    const review = JSON.parse(readFileSync(path.join(temp, scopeFile)));
    review.files['src/lib/human-design/extra.js'] = '0'.repeat(64);
    writeFileSync(path.join(temp, scopeFile), JSON.stringify(review));
    assert.throws(() => validatePentaPhase1AScope(temp, files), /Invalid Penta Phase 1A source scope/);
  });
  sandbox(temp => {
    const review = JSON.parse(readFileSync(path.join(temp, scopeFile)));
    review.files[files[0]] = '0'.repeat(64);
    writeFileSync(path.join(temp, scopeFile), JSON.stringify(review));
    assert.throws(() => validatePentaPhase1AScope(temp, files), /Invalid Penta Phase 1A source scope/);
  });
});
