import test from 'node:test';
import { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';
import { historicalAuditSource } from './helpers/penta-audit-history-projection.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pairedCardHeaderProjection } from './helpers/paired-card-header-projection.js';
import { pairedCardFinalBase, pairedCardFinalHead, pairedCardFinalPaths, pairedCardFinalEdits,
  pairedCardFinalProjection, assertPairedCardFinalApproval, assertPairedCardFinalDelta } from './helpers/paired-card-final-projection.js';
import { pairedCardLayoutBase, pairedCardLayoutHead, pairedCardLayoutProjection } from './helpers/paired-card-layout-projection.js';
import { channelStatusBase, channelStatusProjection } from './helpers/channel-status-projection.js';
import { pairedGateVisualBase, pairedGateVisualProjection } from './helpers/paired-gate-visual-projection.js';
import { issueDetailsBase, issueDetailsProjection } from './helpers/issue-details-projection.js';
import { auditRoot, incrementBase, snapshotBytes, incrementProjection, validateReleaseIncrement } from './helpers/release-increment-projection.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url));
const projects = [pairedCardFinalProjection, pairedCardLayoutProjection, channelStatusProjection,
  pairedGateVisualProjection, issueDetailsProjection, incrementProjection];
const protectedPath = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file)
  || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(file);
const inventory = execFileSync('git', ['ls-tree', '-r', '--name-only', pairedCardFinalBase], { cwd: auditRoot })
  .toString().trim().split('\n').filter(protectedPath);
inventory.push(...pentaAddedPaths);
function rejectsSource(file, mutated) {
  assert.notDeepEqual(mutated, read(file), 'Negative case must change current bytes');
  for (const project of projects) assert.throws(() => project(mutated, file), /Unreviewed increment source/);
  assert.throws(() => validateReleaseIncrement(auditRoot, {
    files: inventory, read: p => p === file ? mutated : read(p),
  }), /Unreviewed increment source/);
}
function mutateUnique(source, before, after) {
  const text = source.toString(), start = text.indexOf(before);
  assert.ok(start >= 0, `Regression anchor exists: ${before}`);
  assert.equal(text.indexOf(before, start + 1), -1, 'Regression anchor is unique');
  return Buffer.from(text.slice(0, start) + after + text.slice(start + before.length));
}

test('final pins the parent-reviewed source SHA, two paths and immutable literal anchors', () => {
  assert.equal(pairedCardFinalBase, '7ff318ad5e68c353c64d8cb8226fac48a3244cc3');
  assert.equal(pairedCardFinalHead, 'ee6bfb100e23e13af0d33bb590a82600a805dbb0');
  assert.deepEqual(pairedCardFinalPaths, ['src/styles.css', 'src/views/chart.js']);
  assert.ok(Object.isFrozen(pairedCardFinalPaths));
  assert.ok(Object.isFrozen(pairedCardFinalEdits));
  for (const file of pairedCardFinalPaths) {
    assert.ok(Object.isFrozen(pairedCardFinalEdits[file]));
    assert.equal(pairedCardFinalEdits[file].length, file === 'src/styles.css' ? 6 : 2);
    for (const edit of pairedCardFinalEdits[file]) assert.ok(Object.isFrozen(edit));
  }
  assertPairedCardFinalApproval();
});

test('final approval requires fixed source SHA and exact reviewed two-file delta', () => {
  assertPairedCardFinalApproval();
  for (const file of pairedCardFinalPaths) {
    const before = snapshotBytes(pairedCardFinalBase, file), after = snapshotBytes(pairedCardFinalHead, file);
    assertPairedCardFinalDelta(before, after, file);
    assert.throws(() => assertPairedCardFinalDelta(before,
      Buffer.concat([after, Buffer.from('\n/* outside final anchors */\n')]), file), /outside exact paired-card final anchors/);
  }
});

test('final normalizes 7ff before all immutable historical approvals', () => {
  assertPairedCardFinalApproval();
  for (const file of pairedCardFinalPaths) {
    const current = read(file);
    assert.deepEqual(pairedCardHeaderProjection(current, file), snapshotBytes(pairedCardFinalHead, file));
    assert.notDeepEqual(current, snapshotBytes(pairedCardFinalBase, file));
    assert.deepEqual(snapshotBytes(pairedCardFinalBase, file), snapshotBytes(pairedCardLayoutHead, file));
    for (const [project, ref] of [
      [pairedCardFinalProjection, pairedCardFinalBase], [pairedCardLayoutProjection, pairedCardLayoutBase],
      [channelStatusProjection, file === 'src/views/chart.js' ? channelStatusBase : pairedCardLayoutBase],
      [pairedGateVisualProjection, pairedGateVisualBase], [issueDetailsProjection, issueDetailsBase],
      [incrementProjection, incrementBase],
    ]) assert.deepEqual(project(current, file), snapshotBytes(ref, file));
  }
  assert.equal(validateReleaseIncrement().reviewedFiles, 56);
});

test('final rejects extra bytes, single-byte edits and pre-final snapshots at every entry', () => {
  assertPairedCardFinalApproval();
  for (const file of pairedCardFinalPaths) {
    rejectsSource(file, Buffer.concat([read(file), Buffer.from('\n/* unreviewed final delta */\n')]));
    const changed = Buffer.from(read(file)); changed[0] ^= 1;
    rejectsSource(file, changed);
    for (const ref of [pairedCardFinalBase, pairedCardLayoutHead, pairedCardLayoutBase]) {
      rejectsSource(file, snapshotBytes(ref, file));
    }
  }
});

test('final preserves gate status, source identity and navigation mutations as negatives', () => {
  assertPairedCardFinalApproval();
  const file = 'src/views/chart.js';
  for (const [before, after] of [
    ['const gateStatus = channel.gates.includes(sourceGate);', 'const gateStatus = true;'],
    ["gateStatus && (source === 'defined' || source === 'natal')", "gateStatus && source === 'defined'"],
    ["${natalStatus ? t('Birth activations') : statusLabel}", '${statusLabel}'],
    ['showGateDetail(id, false, currentDetail.source)', 'showGateDetail(id, false)'],
    ['detailContext?.model, gateNum)', 'detailContext?.model)'],
    ['channel.gates.find(gate => gate !== sourceGate)', 'channel.gates.find(gate => gate === sourceGate)'],
  ]) {
    const changed = mutateUnique(read(file), before, after);
    rejectsSource(file, changed);
    assert.throws(() => assertPairedCardFinalDelta(snapshotBytes(pairedCardFinalBase, file), changed, file));
  }
});

function channelRenderer(source) {
  const text = source.toString();
  const start = text.indexOf('function renderChannelJump(');
  const end = text.indexOf('\nexport function showGateDetail(', start);
  assert.ok(start >= 0 && end > start, 'Shared renderer boundaries exist');
  const translate = (text, values = {}) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
  const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  return new Function('t', 'esc', 'channelName', 'gateName', 'renderChannelCircuitBadges', 'TRANSIT_SOURCE_LABELS',
    text.slice(start, end) + '\nreturn renderChannelJump;')(
    translate, escape, () => 'Channel <fixture>', gate => `Gate ${gate}`,
    () => '<span class="channel-circuit-badges">fixture</span>',
    { defined: 'Defined', natal: 'Birth activations', transit: 'Transit', mixed: 'Mixed', inactive: 'Inactive' });
}

test('final leaves Center renderChannelJump HTML byte-identical across source and model states', () => {
  assertPairedCardFinalApproval();
  const before = channelRenderer(snapshotBytes(pairedCardFinalBase, 'src/views/chart.js'));
  const after = channelRenderer(read('src/views/chart.js'));
  const channel = { gates: [1, 8] };
  for (const active of [false, true]) {
    const chart = { channels: active ? [channel] : [] };
    for (const source of ['defined', 'natal', 'transit', 'mixed', 'inactive']) {
      for (const model of [null, { channels: chart.channels, channelSource: () => source }]) {
        for (const gate of [undefined, null, 99]) {
          assert.equal(after(channel, chart, model, gate), before(channel, chart, model, gate),
            `Center HTML remains identical: active=${active}, source=${source}, model=${!!model}, gate=${gate}`);
        }
      }
    }
  }
});

test('gate metadata wraps only badges/status while preserving every other rendered byte', () => {
  const before = channelRenderer(snapshotBytes(pairedCardFinalBase, 'src/views/chart.js'));
  const after = channelRenderer(pairedCardHeaderProjection(read('src/views/chart.js'), 'src/views/chart.js'));
  const channel = { gates: [1, 8] };
  for (const active of [false, true]) {
    const chart = { channels: active ? [channel] : [] };
    for (const source of ['defined', 'natal', 'transit', 'mixed', 'inactive']) {
      for (const model of [null, { channels: chart.channels, channelSource: () => source }]) {
        for (const gate of channel.gates) {
          const rendered = after(channel, chart, model, gate);
          const wrapper = '<div class="gate-detail-channel-meta">';
          assert.equal(rendered.split(wrapper).length, 2, 'Exactly one metadata row');
          const start = rendered.indexOf(wrapper), end = rendered.indexOf('</div>', start);
          const metadata = rendered.slice(start + wrapper.length, end);
          assert.match(metadata, /channel-circuit-badges/);
          assert.match(metadata, /circuit-badge transit-source-badge/);
          assert.doesNotMatch(metadata, /gate-link|gate-detail-paired-gate/);
          assert.equal(rendered.slice(0, start) + metadata + rendered.slice(end + '</div>'.length),
            before(channel, chart, model, gate), 'Only the metadata wrapper changes Gate HTML');
        }
      }
    }
  }
});

test('final metadata condition, scoped flex row, separator and desktop/mobile targets reject regressions', () => {
  for (const [file, before, after] of [
    ['src/views/chart.js', "${pairedGate == null ? '' : '<div class=\"gate-detail-channel-meta\">'}", '<div class="gate-detail-channel-meta">'],
    ['src/views/chart.js', "${pairedGate == null ? '' : '</div>'}", '</div>'],
    ['src/styles.css', '.gate-detail-channel:has(.gate-detail-paired-gate) {', '.gate-detail-channel {'],
    ['src/styles.css', '  padding-block: 6px;\n  row-gap: 4px;', '  padding-block: 10px;\n  row-gap: 8px;'],
    ['src/styles.css', '.gate-detail-channel:has(.gate-detail-paired-gate) > .gate-detail-channel-meta', '.gate-detail-channel-meta'],
    ['src/styles.css', 'display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; min-width: 0;', 'display: block;'],
    ['src/styles.css', '  min-height: 30px;\n  margin: 0;', '  min-height: 20px;\n  margin: 0;'],
    ['src/styles.css', '  border: 0;\n  border-top: 1px solid var(--border-subtle);\n  border-radius: 2px;', '  border: 0;\n  border-top: 0;\n  border-radius: 2px;'],
    ['src/styles.css', '@media (max-width: 600px), (pointer: coarse) {\n  .gate-detail-paired-gate { min-height: 44px; }', '@media (max-width: 600px) {\n  .gate-detail-paired-gate { min-height: 30px; }'],
  ]) {
    const historical = pairedCardHeaderProjection(read(file), file);
    const changed = mutateUnique(historical, before, after);
    assert.notDeepEqual(changed, historical, 'Historical negative must mutate its fixture');
    rejectsSource(file, changed);
    assert.throws(() => assertPairedCardFinalDelta(snapshotBytes(pairedCardFinalBase, file), changed, file));
  }
});

test('historical approval helpers, manifests and status/navigation scopes remain immutable', () => {
  for (const file of [
    'tests/helpers/channel-status-projection.js', 'tests/helpers/paired-gate-visual-projection.js',
    'tests/helpers/issue-details-projection.js', 'tests/helpers/release-increment-projection.js',
    'tests/helpers/release-validation-projection.js', 'docs/release-increment-8475a4a.json',
    'tests/channel-status-scope.test.js', 'tests/paired-gate-visual-scope.test.js',
    'tests/issue-details-scope.test.js', 'tests/release-increment-scope.test.js',
  ]) assert.deepEqual(historicalAuditSource(file), snapshotBytes(pairedCardFinalBase, file), `Historical approval unchanged: ${file}`);
  const file = 'tests/helpers/paired-card-layout-projection.js';
  const restored = read(file).toString()
    .replace("import { pairedCardFinalProjection } from './paired-card-final-projection.js';\n", '')
    .replace('  source = pairedCardFinalProjection(source, file);\n', '')
    .replace('/** Validate final first, then restore cc6 before channel-status and all older layers. */',
      '/** Validate both current files, restoring cc6 before channel-status and all older layers. */');
  assert.equal(restored, snapshotBytes(pairedCardFinalBase, file).toString(), 'Compact approval changes only by the final hook');
});

test('final unrelated paths pass through without conferring source approval', () => {
  for (const file of ['src/views/team.js', 'src/lib/knowledge/content/penta.js', 'engine-core/TransitCore.cs', 'src/lib/final-unreviewed.js']) {
    const source = Buffer.from('unapproved');
    if (pentaIntegrationPaths.includes(file)) assert.throws(() => pairedCardFinalProjection(source, file), /Unreviewed increment source/);
    else assert.strictEqual(pairedCardFinalProjection(source, file), source);
  }
});
