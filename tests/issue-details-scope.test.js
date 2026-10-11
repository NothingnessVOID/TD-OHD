import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pairedGateVisualProjection } from './helpers/paired-gate-visual-projection.js';
import { issueDetailsBase, issueDetailsHead, issueDetailsPaths, issueDetailsProjection } from './helpers/issue-details-projection.js';
import { auditRoot, incrementBase, incrementManifestPath, snapshotBytes, incrementProjection, validateReleaseIncrement } from './helpers/release-increment-projection.js';

const read = file => readFileSync(path.join(auditRoot, file));
const protectedPath = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file) || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(file);
const inventory = execFileSync('git', ['ls-tree', '-r', '--name-only', issueDetailsHead], { cwd: auditRoot }).toString().trim().split('\n').filter(protectedPath);
function rejectsSource(file, mutated) {
  assert.notDeepEqual(mutated, read(file), 'Negative case must change current bytes');
  assert.throws(() => validateReleaseIncrement(auditRoot, {
    files: inventory, read: p => p === file ? mutated : read(p),
  }), /Unreviewed increment source/);
}

test('issue details pins exact five source paths and validates before both historical layers', () => {
  assert.equal(issueDetailsBase, 'f436587116ab605eb1d9ff1b50c333bd7c23cdcc');
  assert.equal(issueDetailsHead, 'b11cb649040c7b2e016758b1c0a0e34f71ecaa29');
  assert.deepEqual(issueDetailsPaths, ['src/styles.css', 'src/styles/penta-matrix.css', 'src/views/chart.js', 'src/views/penta-matrix.js', 'src/views/team.js']);
  for (const file of issueDetailsPaths) {
    assert.deepEqual(pairedGateVisualProjection(read(file), file), snapshotBytes(issueDetailsHead, file));
    assert.deepEqual(issueDetailsProjection(read(file), file), snapshotBytes(issueDetailsBase, file));
    assert.deepEqual(incrementProjection(read(file), file), snapshotBytes(incrementBase, file));
  }
  assert.equal(validateReleaseIncrement().reviewedFiles, 56);
});

test('each approved file rejects mutation through direct projection, outer hook and injected per-file reads', () => {
  for (const file of issueDetailsPaths) {
    const mutated = Buffer.concat([read(file), Buffer.from('\n/* unreviewed issue detail delta */\n')]);
    assert.throws(() => issueDetailsProjection(mutated, file), /Unreviewed increment source/);
    assert.throws(() => incrementProjection(mutated, file), /Unreviewed increment source/);
    rejectsSource(file, mutated);
  }
});

test('restoring any pre-fix file cannot revive an approved historical bug', () => {
  for (const file of issueDetailsPaths) {
    const old = snapshotBytes(issueDetailsBase, file);
    assert.throws(() => issueDetailsProjection(old, file), /Unreviewed increment source/);
    assert.throws(() => incrementProjection(old, file), /Unreviewed increment source/);
    rejectsSource(file, old);
  }
});

test('targeted navigation, locale and temporary selection regressions fail before projection', () => {
  const regressions = [
    ['src/views/chart.js', "showGateDetail(id, false, currentDetail.source)", 'showGateDetail(id, false)'],
    ['src/views/chart.js', 'detailContext?.model, gateNum)', 'detailContext?.model)'],
    ['src/views/penta-matrix.js', 'selectedTarget = null; hoverTarget = null;\n      applyHighlights();', '/* retain stale selectedTarget */\n      applyHighlights();'],
    ['src/views/penta-matrix.js', 'restoreTrigger(detailTrigger); detailTrigger = null;', 'detailTrigger = null;'],
    ['src/views/team.js', 'if(latest) matrix?.refreshLanguage();', 'if(latest) renderResult();'],
  ];
  for (const [file, before, after] of regressions) {
    assert.ok(read(file).toString().includes(before), `Regression anchor exists: ${file}`);
    rejectsSource(file, Buffer.from(read(file).toString().replace(before, after)));
  }
});

test('unknown paths are passed through, never exempted from engine, knowledge or store protection', () => {
  for (const file of ['engine-core/TransitCore.cs', 'src/lib/human-design/penta-structure.js', 'src/lib/knowledge/content/penta.js', 'src/lib/local-store.js', 'src/lib/team-repository.js', 'src/lib/profile-storage.js']) {
    const mutated = Buffer.concat([read(file), Buffer.from('\n// outside issue scope\n')]);
    assert.strictEqual(issueDetailsProjection(mutated, file), mutated);
    rejectsSource(file, mutated);
  }
  for (const file of ['src/lib/unreviewed.js', 'src/lib/issue-details-messages.js', 'engine-core/Unreviewed.cs']) {
    const source = Buffer.from('unapproved');
    assert.strictEqual(issueDetailsProjection(source, file), source);
    assert.throws(() => validateReleaseIncrement(auditRoot, { files: [...inventory, file] }), /Unreviewed increment source inventory/);
  }
  assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory.filter(file => file !== issueDetailsPaths[0]) }), /Unreviewed increment source inventory/);
});

test('source and manifest simultaneous edits, expansion and repinning cannot authorize issue changes', () => {
  for (const file of issueDetailsPaths) {
    const original = JSON.parse(read(incrementManifestPath));
    for (const change of [
      manifest => { manifest.reviewedHead = issueDetailsHead; },
      manifest => { manifest.files[file] = 'approve altered issue source'; },
      manifest => { manifest.files['src/lib/unreviewed.js'] = 'expand approval'; },
    ]) {
      const manifest = structuredClone(original); change(manifest);
      assert.throws(() => validateReleaseIncrement(auditRoot, {
        files: inventory,
        read: p => p === incrementManifestPath ? Buffer.from(JSON.stringify(manifest))
          : p === file ? Buffer.concat([read(p), Buffer.from('\n// mutation')]) : read(p),
      }), /Unreviewed increment manifest/);
    }
  }
});
