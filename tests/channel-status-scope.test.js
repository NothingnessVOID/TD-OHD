import test from 'node:test';
import { integrationAddedPaths } from './helpers/wa-integration-projection.js';
import { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pairedCardLayoutBase, pairedCardLayoutProjection } from './helpers/paired-card-layout-projection.js';
import { channelStatusBase, channelStatusHead, channelStatusPaths, channelStatusProjection } from './helpers/channel-status-projection.js';
import { pairedGateVisualBase, pairedGateVisualHead, pairedGateVisualProjection } from './helpers/paired-gate-visual-projection.js';
import { issueDetailsBase, issueDetailsHead, issueDetailsProjection } from './helpers/issue-details-projection.js';
import { auditRoot, incrementBase, incrementManifestPath, snapshotBytes, incrementProjection, validateReleaseIncrement } from './helpers/release-increment-projection.js';

const file = 'src/views/chart.js';
const read = p => readFileSync(path.join(auditRoot, p));
const protectedPath = p => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(p) || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(p);
const inventory = execFileSync('git', ['ls-tree', '-r', '--name-only', channelStatusBase], { cwd: auditRoot }).toString().trim().split('\n').filter(protectedPath);
inventory.push(...integrationAddedPaths);

// Exact status-only delta reviewed against the fixed parent-supplied source snapshot.
const approvedStatusBlock = [
  "  const source = model && active ? model.channelSource(channel) : active ? 'defined' : 'inactive';",
  '  const statusLabel = model',
  "    ? t(active ? TRANSIT_SOURCE_LABELS[source] : 'No complete channel in this view')",
  "    : t(active ? 'Defined' : 'Not defined in this view');",
  '  const gateStatus = channel.gates.includes(sourceGate);',
  "  const natalStatus = gateStatus && (source === 'defined' || source === 'natal');",
  '  const statusClass = gateStatus',
  "    ? ` tl-activation-label tl-detail-channel-status${natalStatus ? ' tl-activation-natal' : ''}` : '';",
  '',
].join('\n');
const approvedStatusBadge = "      <span class=\"circuit-badge transit-source-badge ${source}${statusClass}\">${natalStatus ? t('Birth activations') : statusLabel}</span>";
function replaceUnique(text, before, after) {
  const start = text.indexOf(before);
  assert.ok(start >= 0, 'Exact reviewed anchor must exist');
  assert.equal(text.indexOf(before, start + before.length), -1, 'Reviewed anchor must be unique');
  return text.slice(0, start) + after + text.slice(start + before.length);
}
function rejectsSource(mutated) {
  assert.notDeepEqual(mutated, read(file), 'Negative case must change current bytes');
  for (const project of [channelStatusProjection, pairedGateVisualProjection, issueDetailsProjection, incrementProjection]) {
    assert.throws(() => project(mutated, file), /Unreviewed increment source/);
  }
  assert.throws(() => validateReleaseIncrement(auditRoot, {
    files: inventory, read: p => p === file ? mutated : read(p),
  }), /Unreviewed increment source/);
}

test('channel status pins only chart and projects base94 before unchanged paired, issue and release layers', () => {
  assert.equal(channelStatusBase, '94ae062dc1d1d19ca7f8cbfa7cee2f31546ae963');
  assert.equal(channelStatusHead, '73b926bbc606b30242610d83feeaf6ba414a0228');
  assert.deepEqual(channelStatusPaths, [file]);
  const current = read(file);
  assert.deepEqual(pairedCardLayoutProjection(current, file), snapshotBytes(channelStatusHead, file));
  assert.notDeepEqual(current, snapshotBytes(channelStatusBase, file));
  assert.deepEqual(snapshotBytes(channelStatusBase, file), snapshotBytes(pairedGateVisualHead, file));
  assert.deepEqual(channelStatusProjection(current, file), snapshotBytes(channelStatusBase, file));
  assert.deepEqual(pairedGateVisualProjection(current, file), snapshotBytes(pairedGateVisualBase, file));
  assert.deepEqual(issueDetailsProjection(current, file), snapshotBytes(issueDetailsBase, file));
  assert.deepEqual(incrementProjection(current, file), snapshotBytes(incrementBase, file));
  assert.equal(validateReleaseIncrement().reviewedFiles, 56);
});

test('only exact renderChannelJump status classes and label change; all other chart bytes remain identical', () => {
  const before = snapshotBytes(channelStatusBase, file).toString();
  const after = snapshotBytes(channelStatusHead, file).toString();
  const functionStart = 'function renderChannelJump(channel, chart, model = null, sourceGate = null) {';
  const start = before.indexOf(functionStart);
  assert.ok(start >= 0);
  const blockStart = before.indexOf('  const source =', start);
  const blockEnd = before.indexOf('  const pairedGate =', blockStart);
  assert.ok(blockStart > start && blockEnd > blockStart);
  const oldStatusBlock = before.slice(blockStart, blockEnd);
  const oldBadge = '      <span class="circuit-badge transit-source-badge ${source}">${statusLabel}</span>';
  const restored = replaceUnique(replaceUnique(after, approvedStatusBlock, oldStatusBlock), approvedStatusBadge, oldBadge);
  assert.equal(restored, before, 'Every byte outside the exact approved status anchors stays unchanged');
});

test('status changes, navigation changes, appended bytes and single-byte mutations fail at every entry', () => {
  const current = read(file);
  rejectsSource(Buffer.concat([current, Buffer.from('\n// unreviewed channel status delta\n')]));
  const mutated = Buffer.from(current); mutated[0] ^= 1;
  rejectsSource(mutated);
  for (const [before, after] of [
    [approvedStatusBlock, approvedStatusBlock + '  // unreviewed status logic\n'],
    [approvedStatusBadge, approvedStatusBadge + '<span>unreviewed status</span>'],
    ['const gateStatus = channel.gates.includes(sourceGate);', 'const gateStatus = true;'],
    ["gateStatus && (source === 'defined' || source === 'natal')", "gateStatus && source === 'defined'"],
    [' tl-activation-label tl-detail-channel-status', ' tl-activation-label'],
    ["${natalStatus ? ' tl-activation-natal' : ''}", "${natalStatus ? '' : ''}"],
    ["${natalStatus ? t('Birth activations') : statusLabel}", '${statusLabel}'],
    ["showGateDetail(id, false, currentDetail.source)", 'showGateDetail(id, false)'],
    ['detailContext?.model, gateNum)', 'detailContext?.model)'],
    ['class="gate-detail-paired-gate"', 'class="gate-detail-paired-gate altered"'],
  ]) rejectsSource(Buffer.from(replaceUnique(current.toString(), before, after)));
});

test('restoring base94, paired or issue snapshots cannot bypass the channel-status layer', () => {
  for (const ref of [channelStatusBase, pairedGateVisualHead, pairedGateVisualBase, issueDetailsHead, issueDetailsBase]) {
    rejectsSource(snapshotBytes(ref, file));
  }
});

test('other paths pass through identically while historical and inventory guards stay active', () => {
  const css = 'src/styles.css';
  assert.deepEqual(channelStatusProjection(read(css), css), snapshotBytes(pairedCardLayoutBase, css));
  const mutatedCss = Buffer.concat([read(css), Buffer.from('\n/* outside channel status scope */\n')]);
  assert.throws(() => channelStatusProjection(mutatedCss, css), /Unreviewed increment source/);
  assert.throws(() => validateReleaseIncrement(auditRoot, {
    files: inventory, read: p => p === css ? mutatedCss : read(p),
  }), /Unreviewed increment source/);
  for (const p of ['src/styles/penta-matrix.css', 'src/views/penta-matrix.js', 'src/views/team.js', 'engine-core/TransitCore.cs', 'src/lib/human-design/penta-structure.js', 'src/lib/knowledge/content/penta.js', 'src/lib/local-store.js', 'src/lib/team-repository.js', 'src/lib/profile-storage.js']) {
    const current = read(p);
    assert.deepEqual(channelStatusProjection(current, p), pentaIntegrationProjection(current, p));
    const mutated = Buffer.concat([current, Buffer.from('\n// outside channel status scope\n')]);
    if (pentaIntegrationPaths.includes(p)) assert.throws(() => channelStatusProjection(mutated, p), /Unreviewed increment source/);
    else assert.strictEqual(channelStatusProjection(mutated, p), mutated);
    assert.throws(() => validateReleaseIncrement(auditRoot, {
      files: inventory, read: q => q === p ? mutated : read(q),
    }), /Unreviewed increment source/);
  }
  const unknown = 'src/lib/channel-status-unreviewed.js';
  const source = Buffer.from('unapproved');
  assert.strictEqual(channelStatusProjection(source, unknown), source);
  assert.throws(() => validateReleaseIncrement(auditRoot, { files: [...inventory, unknown] }), /Unreviewed increment source inventory/);
  assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory.filter(p => p !== file) }), /Unreviewed increment source inventory/);
});

test('manifest repinning, expansion and simultaneous source edits cannot authorize status changes', () => {
  const original = JSON.parse(read(incrementManifestPath));
  for (const change of [
    manifest => { manifest.reviewedHead = channelStatusHead; },
    manifest => { manifest.files[file] = 'approve altered status source'; },
    manifest => { manifest.files['src/lib/channel-status-unreviewed.js'] = 'expand approval'; },
  ]) {
    const manifest = structuredClone(original); change(manifest);
    assert.throws(() => validateReleaseIncrement(auditRoot, {
      files: inventory,
      read: p => p === incrementManifestPath ? Buffer.from(JSON.stringify(manifest))
        : p === file ? Buffer.concat([read(p), Buffer.from('\n// mutation')]) : read(p),
    }), /Unreviewed increment manifest/);
  }
});
