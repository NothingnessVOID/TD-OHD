import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { channelStatusProjection } from './helpers/channel-status-projection.js';
import { pairedGateVisualBase, pairedGateVisualHead, pairedGateVisualPaths, pairedGateVisualProjection } from './helpers/paired-gate-visual-projection.js';
import { issueDetailsBase, issueDetailsHead, issueDetailsProjection } from './helpers/issue-details-projection.js';
import { auditRoot, incrementBase, incrementManifestPath, snapshotBytes, incrementProjection, validateReleaseIncrement } from './helpers/release-increment-projection.js';

const read = file => readFileSync(path.join(auditRoot, file));
const protectedPath = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file) || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(file);
const inventory = execFileSync('git', ['ls-tree', '-r', '--name-only', pairedGateVisualBase], { cwd: auditRoot }).toString().trim().split('\n').filter(protectedPath);
function rejectsSource(file, mutated) {
  assert.notDeepEqual(mutated, read(file), 'Negative case must change current bytes');
  for (const project of [pairedGateVisualProjection, issueDetailsProjection, incrementProjection]) {
    assert.throws(() => project(mutated, file), /Unreviewed increment source/);
  }
  assert.throws(() => validateReleaseIncrement(auditRoot, {
    files: inventory, read: p => p === file ? mutated : read(p),
  }), /Unreviewed increment source/);
}

test('visual layer pins only two files and projects before unchanged issue and release approvals', () => {
  assert.equal(pairedGateVisualBase, 'e8d07bbedf1b4cb96cfbb6b609e04151f26a45cb');
  assert.equal(pairedGateVisualHead, 'dc5fc87a2d2449b9a66923b63b842818fdeb810c');
  assert.deepEqual(pairedGateVisualPaths, ['src/styles.css', 'src/views/chart.js']);
  const changed = execFileSync('git', ['diff', '--name-only', pairedGateVisualBase, pairedGateVisualHead], { cwd: auditRoot }).toString().trim().split('\n').filter(protectedPath).sort();
  assert.deepEqual(changed, [...pairedGateVisualPaths]);
  for (const file of pairedGateVisualPaths) {
    const current = read(file);
    assert.deepEqual(channelStatusProjection(current, file), snapshotBytes(pairedGateVisualHead, file));
    assert.notDeepEqual(current, snapshotBytes(pairedGateVisualBase, file));
    assert.deepEqual(snapshotBytes(pairedGateVisualBase, file), snapshotBytes(issueDetailsHead, file));
    assert.deepEqual(pairedGateVisualProjection(current, file), snapshotBytes(pairedGateVisualBase, file));
    assert.deepEqual(issueDetailsProjection(current, file), snapshotBytes(issueDetailsBase, file));
    assert.deepEqual(incrementProjection(current, file), snapshotBytes(incrementBase, file));
  }
  assert.equal(validateReleaseIncrement().reviewedFiles, 56);
});

test('chart visual delta changes only the paired button line, preserving navigation and source logic', () => {
  const file = 'src/views/chart.js';
  const before = snapshotBytes(pairedGateVisualBase, file).toString();
  const after = snapshotBytes(pairedGateVisualHead, file).toString();
  const buttonLine = /^.*<button[^\n]*data-paired-gate[^\n]*$/gm;
  const oldLines = before.match(buttonLine), newLines = after.match(buttonLine);
  assert.equal(oldLines?.length, 1);
  assert.equal(newLines?.length, 1);
  assert.equal(after.replace(buttonLine, ''), before.replace(buttonLine, ''));
  assert.equal((newLines[0].match(/<span\b/g) || []).length, 3);
  assert.doesNotMatch(newLines[0], /reference-link/);
});

test('CSS changes only the exact paired-gate block including hover media; every outside byte stays unchanged', () => {
  const file = 'src/styles.css';
  const before = snapshotBytes(pairedGateVisualBase, file);
  const after = snapshotBytes(pairedGateVisualHead, file);
  const oldBlock = Buffer.from('.gate-detail-paired-gate { display: block; max-width: 100%; min-height: 44px; margin-top: 8px; text-align: left; overflow-wrap: anywhere; }\n');
  const newBlock = Buffer.from(`.gate-detail-paired-gate {
  display: block;
  max-width: 100%;
  min-height: 44px;
  margin-top: 2px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: transparent;
  font: inherit;
  line-height: 1.5;
  color: var(--text-secondary);
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.gate-detail-paired-gate-label { font-size: 12px; color: var(--text-secondary); }
.gate-detail-paired-gate-number { color: var(--accent); font-weight: 500; }
.gate-detail-paired-gate-name { color: var(--text); font-weight: 600; }
.gate-detail-paired-gate:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.gate-detail-paired-gate:focus-visible .gate-detail-paired-gate-number { text-decoration: underline; text-underline-offset: 3px; }
@media (hover: hover) {
  .gate-detail-paired-gate:hover .gate-detail-paired-gate-number { text-decoration: underline; text-underline-offset: 3px; }
}
`);
  const oldStart = before.indexOf(oldBlock), newStart = after.indexOf(newBlock);
  assert.ok(oldStart >= 0, 'Exact old paired CSS block exists');
  assert.ok(newStart >= 0, 'Exact approved paired CSS block including media exists');
  assert.equal(before.indexOf(oldBlock, oldStart + 1), -1, 'Old block is unique');
  assert.equal(after.indexOf(newBlock, newStart + 1), -1, 'New block is unique');
  assert.deepEqual(after.subarray(0, newStart), before.subarray(0, oldStart));
  assert.deepEqual(after.subarray(newStart + newBlock.length), before.subarray(oldStart + oldBlock.length));
});

test('paired hit target, transparent styling, text hierarchy and keyboard/hover regressions fail at every entry', () => {
  const file = 'src/styles.css';
  for (const [before, after] of [
    ['min-height: 44px;\n  margin-top: 2px;', 'min-height: 24px;\n  margin-top: 2px;'],
    ['margin-top: 2px;\n  padding: 0;', 'margin-top: 8px;\n  padding: 0;'],
    ['background: transparent;\n  font: inherit;', 'background: red;\n  font: inherit;'],
    ['.gate-detail-paired-gate-name { color: var(--text); font-weight: 600; }', '.gate-detail-paired-gate-name { color: var(--text); font-weight: 400; }'],
    ['.gate-detail-paired-gate:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }', '.gate-detail-paired-gate:focus-visible { outline: none; }'],
    ['.gate-detail-paired-gate:hover .gate-detail-paired-gate-number { text-decoration: underline;', '.gate-detail-paired-gate:hover .gate-detail-paired-gate-number { text-decoration: none;'],
  ]) {
    assert.ok(read(file).toString().includes(before), `Regression anchor exists: ${before}`);
    rejectsSource(file, Buffer.from(read(file).toString().replace(before, after)));
  }
});

test('every visual file rejects both additional bytes and single-byte mutations at every entry', () => {
  for (const file of pairedGateVisualPaths) {
    rejectsSource(file, Buffer.concat([read(file), Buffer.from('\n/* unreviewed visual delta */\n')]));
    const mutated = Buffer.from(read(file));
    mutated[0] ^= 1;
    rejectsSource(file, mutated);
  }
});

test('restoring pre-visual bytes or pre-issue bug bytes cannot bypass the new outer layer', () => {
  for (const file of pairedGateVisualPaths) {
    for (const ref of [pairedGateVisualBase, issueDetailsHead, issueDetailsBase]) {
      rejectsSource(file, snapshotBytes(ref, file));
    }
  }
});

test('visual projection passes all other paths through while older source and inventory guards still reject them', () => {
  for (const file of ['src/styles/penta-matrix.css', 'src/views/penta-matrix.js', 'src/views/team.js', 'engine-core/TransitCore.cs', 'src/lib/human-design/penta-structure.js', 'src/lib/knowledge/content/penta.js', 'src/lib/local-store.js', 'src/lib/team-repository.js', 'src/lib/profile-storage.js']) {
    const current = read(file);
    assert.strictEqual(pairedGateVisualProjection(current, file), current);
    const mutated = Buffer.concat([current, Buffer.from('\n// outside visual scope\n')]);
    assert.strictEqual(pairedGateVisualProjection(mutated, file), mutated);
    assert.throws(() => validateReleaseIncrement(auditRoot, {
      files: inventory, read: p => p === file ? mutated : read(p),
    }), /Unreviewed increment source/);
  }
  for (const file of ['src/lib/unreviewed.js', 'src/styles/paired-gate-unreviewed.css', 'engine-core/Unreviewed.cs']) {
    const source = Buffer.from('unapproved');
    assert.strictEqual(pairedGateVisualProjection(source, file), source);
    assert.throws(() => validateReleaseIncrement(auditRoot, { files: [...inventory, file] }), /Unreviewed increment source inventory/);
  }
  for (const file of pairedGateVisualPaths) {
    assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory.filter(p => p !== file) }), /Unreviewed increment source inventory/);
  }
});

test('visual source edits cannot authorize themselves through manifest repinning, expansion or simultaneous edits', () => {
  for (const file of pairedGateVisualPaths) {
    const original = JSON.parse(read(incrementManifestPath));
    for (const change of [
      manifest => { manifest.reviewedHead = pairedGateVisualHead; },
      manifest => { manifest.files[file] = 'approve altered visual source'; },
      manifest => { manifest.files['src/styles/paired-gate-unreviewed.css'] = 'expand approval'; },
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
