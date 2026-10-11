import test from 'node:test';
import { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pairedCardFinalProjection } from './helpers/paired-card-final-projection.js';
import { pairedCardLayoutBase, pairedCardLayoutHead, pairedCardLayoutPaths, pairedCardLayoutProjection, assertPairedCardLayoutDelta } from './helpers/paired-card-layout-projection.js';
import { channelStatusBase, channelStatusHead, channelStatusProjection } from './helpers/channel-status-projection.js';
import { pairedGateVisualBase, pairedGateVisualHead, pairedGateVisualProjection } from './helpers/paired-gate-visual-projection.js';
import { issueDetailsBase, issueDetailsHead, issueDetailsProjection } from './helpers/issue-details-projection.js';
import { auditRoot, incrementBase, incrementManifestPath, snapshotBytes, incrementProjection, validateReleaseIncrement } from './helpers/release-increment-projection.js';

const read = file => readFileSync(path.join(auditRoot, file));
const protectedPath = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file) || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(file);
const inventory = execFileSync('git', ['ls-tree', '-r', '--name-only', pairedCardLayoutBase], { cwd: auditRoot }).toString().trim().split('\n').filter(protectedPath);
inventory.push(...pentaAddedPaths);
function rejectsSource(file, mutated) {
  assert.notDeepEqual(mutated, read(file), 'Negative case must change current bytes');
  for (const project of [pairedCardLayoutProjection, channelStatusProjection, pairedGateVisualProjection, issueDetailsProjection, incrementProjection]) {
    assert.throws(() => project(mutated, file), /Unreviewed increment source/);
  }
  assert.throws(() => validateReleaseIncrement(auditRoot, {
    files: inventory, read: p => p === file ? mutated : read(p),
  }), /Unreviewed increment source/);
}
function mutateUnique(source, before, after) {
  const text = source.toString();
  const start = text.indexOf(before);
  assert.ok(start >= 0, `Regression anchor exists: ${before}`);
  assert.equal(text.indexOf(before, start + 1), -1, 'Regression anchor is unique');
  return Buffer.from(text.slice(0, start) + after + text.slice(start + before.length));
}

test('compact pins exactly chart/css and normalizes cc6 before status, paired, issue and release', () => {
  assert.equal(pairedCardLayoutBase, 'cc6e58df080918a32979f40efa3a792047f0aca4');
  assert.equal(pairedCardLayoutHead, '4b080956c37fa4ae2d6212e2169fb15588161a53');
  assert.deepEqual(pairedCardLayoutPaths, ['src/styles.css', 'src/views/chart.js']);
  for (const file of pairedCardLayoutPaths) {
    const current = read(file);
    assert.deepEqual(pairedCardFinalProjection(current, file), snapshotBytes(pairedCardLayoutHead, file));
    assert.notDeepEqual(current, snapshotBytes(pairedCardLayoutBase, file));
    assert.deepEqual(pairedCardLayoutProjection(current, file), snapshotBytes(pairedCardLayoutBase, file));
    assert.deepEqual(snapshotBytes(pairedCardLayoutBase, file), snapshotBytes(channelStatusHead, file));
    assert.deepEqual(channelStatusProjection(current, file), snapshotBytes(channelStatusBase, file));
    assert.deepEqual(channelStatusProjection(current, file), snapshotBytes(pairedGateVisualHead, file));
    assert.deepEqual(pairedGateVisualProjection(current, file), snapshotBytes(pairedGateVisualBase, file));
    assert.deepEqual(issueDetailsProjection(current, file), snapshotBytes(issueDetailsBase, file));
    assert.deepEqual(incrementProjection(current, file), snapshotBytes(incrementBase, file));
  }
  assert.equal(validateReleaseIncrement().reviewedFiles, 56);
});

test('only exact reviewed paired markup and paired/has-paired CSS anchors change', () => {
  for (const file of pairedCardLayoutPaths) {
    const before = snapshotBytes(pairedCardLayoutBase, file);
    const after = snapshotBytes(pairedCardLayoutHead, file);
    assertPairedCardLayoutDelta(before, after, file);
    assert.throws(() => assertPairedCardLayoutDelta(before,
      Buffer.concat([after, Buffer.from('\n/* non-layout delta */\n')]), file), /outside exact paired-card layout anchors/);
  }
});

test('both files reject extra bytes, single-byte edits and all historical source snapshots at every entry', () => {
  for (const file of pairedCardLayoutPaths) {
    rejectsSource(file, Buffer.concat([read(file), Buffer.from('\n/* unreviewed compact delta */\n')]));
    const mutated = Buffer.from(read(file)); mutated[0] ^= 1;
    rejectsSource(file, mutated);
    for (const ref of [pairedCardLayoutBase, channelStatusHead, channelStatusBase, pairedGateVisualHead, pairedGateVisualBase, issueDetailsHead, issueDetailsBase]) {
      rejectsSource(file, snapshotBytes(ref, file));
    }
  }
});

test('status, source logic and navigation cannot enter the layout approval', () => {
  const file = 'src/views/chart.js';
  for (const [before, after] of [
    ['const gateStatus = channel.gates.includes(sourceGate);', 'const gateStatus = true;'],
    ["gateStatus && (source === 'defined' || source === 'natal')", "gateStatus && source === 'defined'"],
    ["${natalStatus ? t('Birth activations') : statusLabel}", '${statusLabel}'],
    ['showGateDetail(id, false, currentDetail.source)', 'showGateDetail(id, false)'],
    ['detailContext?.model, gateNum)', 'detailContext?.model)'],
    ['channel.gates.find(gate => gate !== sourceGate)', 'channel.gates.find(gate => gate === sourceGate)'],
  ]) {
    const mutated = mutateUnique(read(file), before, after);
    rejectsSource(file, mutated);
    assert.throws(() => assertPairedCardLayoutDelta(snapshotBytes(pairedCardLayoutBase, file), mutated, file));
  }
});

test('compact grid scope, centered hit target and unified link regressions fail at every entry', () => {
  const file = 'src/styles.css';
  // Keep the exact compact negative fixtures after final normalizes back to 7ff.
  const historical = pairedCardFinalProjection(read(file), file);
  for (const [before, after] of [
    ['.gate-detail-channel:has(.gate-detail-paired-gate) {', '.gate-detail-channel {'],
    ['  grid-template-columns: minmax(0, 1fr);\n  padding-block: 8px;', '  grid-template-columns: 1fr;\n  padding-block: 12px;'],
    ['.gate-detail-paired-gate {\n  display: flex;\n  align-items: center;', '.gate-detail-paired-gate {\n  display: block;'],
    ['min-height: 44px;\n  margin: 0;', 'min-height: 24px;\n  margin: 0;'],
    ['min-height: 44px;\n  margin: 0;', 'min-height: 44px;\n  margin: 8px;'],
    ['background: transparent;\n  font: inherit;', 'background: red;\n  font: inherit;'],
    ['.gate-detail-paired-gate-link { color: var(--accent); font-weight: 500; }', '.gate-detail-paired-gate-link { color: var(--text); font-weight: 600; }'],
    ['.gate-detail-paired-gate:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }', '.gate-detail-paired-gate:focus-visible { outline: none; }'],
    ['.gate-detail-paired-gate:focus-visible .gate-detail-paired-gate-link { text-decoration: underline;', '.gate-detail-paired-gate:focus-visible .gate-detail-paired-gate-link { text-decoration: none;'],
    ['.gate-detail-paired-gate:hover .gate-detail-paired-gate-link { text-decoration: underline;', '.gate-detail-paired-gate:hover .gate-detail-paired-gate-link { text-decoration: none;'],
  ]) {
    const mutated = mutateUnique(historical, before, after);
    assert.notDeepEqual(mutated, historical, 'Historical negative must mutate its fixture');
    rejectsSource(file, mutated);
    assert.throws(() => assertPairedCardLayoutDelta(snapshotBytes(pairedCardLayoutBase, file), mutated, file));
  }
  const chart = 'src/views/chart.js';
  rejectsSource(chart, mutateUnique(read(chart), 'class="gate-detail-paired-gate-link"', 'class="gate-detail-paired-gate-number"'));
});

test('unrelated paths pass through compact while source and inventory guards remain active', () => {
  for (const file of ['src/styles/penta-matrix.css', 'src/views/penta-matrix.js', 'src/views/team.js', 'engine-core/TransitCore.cs', 'src/lib/human-design/penta-structure.js', 'src/lib/knowledge/content/penta.js', 'src/lib/local-store.js', 'src/lib/team-repository.js', 'src/lib/profile-storage.js']) {
    const current = read(file);
    assert.deepEqual(pairedCardLayoutProjection(current, file), pentaIntegrationProjection(current, file));
    const mutated = Buffer.concat([current, Buffer.from('\n// outside compact scope\n')]);
    if (pentaIntegrationPaths.includes(file)) assert.throws(() => pairedCardLayoutProjection(mutated, file), /Unreviewed increment source/);
    else assert.strictEqual(pairedCardLayoutProjection(mutated, file), mutated);
    assert.throws(() => validateReleaseIncrement(auditRoot, {
      files: inventory, read: p => p === file ? mutated : read(p),
    }), /Unreviewed increment source/);
  }
  const unknown = 'src/lib/paired-card-layout-unreviewed.js';
  const source = Buffer.from('unapproved');
  assert.strictEqual(pairedCardLayoutProjection(source, unknown), source);
  assert.throws(() => validateReleaseIncrement(auditRoot, { files: [...inventory, unknown] }), /Unreviewed increment source inventory/);
  for (const file of pairedCardLayoutPaths) {
    assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory.filter(p => p !== file) }), /Unreviewed increment source inventory/);
  }
});

test('manifest repinning, expansion and simultaneous source edits cannot authorize compact', () => {
  const original = JSON.parse(read(incrementManifestPath));
  for (const file of pairedCardLayoutPaths) {
    for (const change of [
      manifest => { manifest.reviewedHead = pairedCardLayoutHead; },
      manifest => { manifest.files[file] = 'approve altered compact source'; },
      manifest => { manifest.files['src/lib/paired-card-layout-unreviewed.js'] = 'expand approval'; },
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
