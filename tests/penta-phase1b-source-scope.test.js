import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validatePentaPhase1BSourceScope } from '../docs/frontend-knowledge-sync-v1/validate.mjs';

const root = path.resolve(import.meta.dirname, '..');
const scopeFile = 'docs/team/PHASE1B-SOURCE-SCOPE.json';
const files = [
  'src/views/team.js',
  'src/lib/human-design/team-members.js',
  'src/lib/team-repository.js',
  'src/styles/team-members.css',
  'src/locales/zh-CN/ui-views.json',
  'src/locales/zh-Hant/ui-views.json'
];
function sandbox(run) {
  const temp = mkdtempSync(path.join(tmpdir(), 'penta-phase1b-review-'));
  try {
    for (const file of [...files, scopeFile]) {
      mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
      cpSync(path.join(root, file), path.join(temp, file));
    }
    return run(temp);
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

test('the six Phase 1B paths match their pinned SHA-256 digests', () => {
  sandbox(temp => assert.deepEqual(validatePentaPhase1BSourceScope(temp, files), files));
});

test('unregistered new source is rejected', () => {
  sandbox(temp => {
    const extra = 'src/lib/team-extra.js';
    mkdirSync(path.dirname(path.join(temp, extra)), { recursive: true });
    writeFileSync(path.join(temp, extra), 'export {};\n');
    assert.throws(() => validatePentaPhase1BSourceScope(temp, [...files, extra]),
      /Unreviewed new source: src\/lib\/team-extra\.js/);
  });
});

test('mutating any reviewed source fails even when the scope manifest is also modified', () => {
  for (const file of files) sandbox(temp => {
    writeFileSync(path.join(temp, file), readFileSync(path.join(temp, file), 'utf8') + '\n// unexpected mutation\n');
    assert.throws(() => validatePentaPhase1BSourceScope(temp, files), /Invalid Penta Phase 1B source scope/);
  });
});

test('manifest cannot add a path or change a reviewed digest', () => {
  sandbox(temp => {
    const review = JSON.parse(readFileSync(path.join(temp, scopeFile)));
    review.files['src/lib/team-extra.js'] = '0'.repeat(64);
    writeFileSync(path.join(temp, scopeFile), JSON.stringify(review));
    assert.throws(() => validatePentaPhase1BSourceScope(temp, files), /Invalid Penta Phase 1B source scope/);
  });
  sandbox(temp => {
    const review = JSON.parse(readFileSync(path.join(temp, scopeFile)));
    review.files[files[0]] = '0'.repeat(64);
    writeFileSync(path.join(temp, scopeFile), JSON.stringify(review));
    assert.throws(() => validatePentaPhase1BSourceScope(temp, files), /Invalid Penta Phase 1B source scope/);
  });
});
