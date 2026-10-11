import test from 'node:test';
import { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';
import { historicalAuditSource } from './helpers/penta-audit-history-projection.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pairedCardHeaderBase, pairedCardHeaderHead, pairedCardHeaderPaths, pairedCardHeaderEdits,
  pairedCardHeaderProjection, assertPairedCardHeaderApproval, assertPairedCardHeaderDelta } from './helpers/paired-card-header-projection.js';
import { pairedCardFinalBase, pairedCardFinalHead, pairedCardFinalProjection } from './helpers/paired-card-final-projection.js';
import { pairedCardLayoutBase, pairedCardLayoutProjection } from './helpers/paired-card-layout-projection.js';
import { channelStatusBase, channelStatusProjection } from './helpers/channel-status-projection.js';
import { pairedGateVisualBase, pairedGateVisualProjection } from './helpers/paired-gate-visual-projection.js';
import { issueDetailsBase, issueDetailsProjection } from './helpers/issue-details-projection.js';
import { auditRoot, incrementBase, snapshotBytes, incrementProjection, validateReleaseIncrement } from './helpers/release-increment-projection.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url));
const projects = [pairedCardHeaderProjection, pairedCardFinalProjection, pairedCardLayoutProjection,
  channelStatusProjection, pairedGateVisualProjection, issueDetailsProjection, incrementProjection];
const protectedPath = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file)
  || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(file);
const inventory = execFileSync('git', ['ls-tree', '-r', '--name-only', pairedCardHeaderBase], { cwd: auditRoot })
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
    () => '<span class="channel-circuit-badges"><span class="circuit-badge">fixture</span></span>',
    { defined: 'Defined', natal: 'Birth activations', transit: 'Transit', mixed: 'Mixed', inactive: 'Inactive' });
}
function eachState(run) {
  const channel = { gates: [1, 8] };
  for (const active of [false, true]) {
    const chart = { channels: active ? [channel] : [] };
    for (const source of ['defined', 'natal', 'transit', 'mixed', 'inactive']) {
      for (const model of [null, { channels: chart.channels, channelSource: () => source }]) run(channel, chart, model);
    }
  }
}
function unwrap(html, className) {
  const wrapper = `<div class="${className}">`;
  assert.equal(html.split(wrapper).length, 2, `Exactly one ${className}`);
  const start = html.indexOf(wrapper), end = html.indexOf('</div>', start);
  assert.ok(end > start, 'Wrapper is closed');
  const content = html.slice(start + wrapper.length, end);
  return { content, html: html.slice(0, start) + content + html.slice(end + '</div>'.length), end };
}

test('header pins fixed source SHA and seven immutable literal edits across exactly chart/CSS', () => {
  assert.equal(pairedCardHeaderBase, 'aee63103dec82bb262c88dbbd8adee785f9de607');
  assert.equal(pairedCardHeaderHead, 'fafec304a2c0553df8bd1b91561e6db3d345bc97');
  assert.deepEqual(pairedCardHeaderPaths, ['src/styles.css', 'src/views/chart.js']);
  assert.ok(Object.isFrozen(pairedCardHeaderPaths));
  assert.ok(Object.isFrozen(pairedCardHeaderEdits));
  assertPairedCardHeaderApproval();
  for (const file of pairedCardHeaderPaths) {
    assert.ok(Object.isFrozen(pairedCardHeaderEdits[file]));
    assert.equal(pairedCardHeaderEdits[file].length, file === 'src/styles.css' ? 4 : 3);
    for (const edit of pairedCardHeaderEdits[file]) assert.ok(Object.isFrozen(edit));
    const before = snapshotBytes(pairedCardHeaderBase, file), after = snapshotBytes(pairedCardHeaderHead, file);
    assertPairedCardHeaderDelta(before, after, file);
    assert.throws(() => assertPairedCardHeaderDelta(before,
      Buffer.concat([after, Buffer.from('\n/* outside header anchors */\n')]), file), /outside exact paired-card header anchors/);
  }
  assert.throws(() => assertPairedCardHeaderDelta(Buffer.from('a'), Buffer.from('b'), 'src/unknown.js'), /fail closed/);
});

test('header restores aee before final, compact, status, paired, issue and release approvals', () => {
  for (const file of pairedCardHeaderPaths) {
    const current = read(file);
    assert.deepEqual(current, snapshotBytes(pairedCardHeaderHead, file));
    assert.notDeepEqual(current, snapshotBytes(pairedCardHeaderBase, file));
    assert.deepEqual(snapshotBytes(pairedCardHeaderBase, file), snapshotBytes(pairedCardFinalHead, file));
    for (const [project, ref] of [
      [pairedCardHeaderProjection, pairedCardHeaderBase], [pairedCardFinalProjection, pairedCardFinalBase],
      [pairedCardLayoutProjection, pairedCardLayoutBase],
      [channelStatusProjection, file === 'src/views/chart.js' ? channelStatusBase : pairedCardLayoutBase],
      [pairedGateVisualProjection, pairedGateVisualBase], [issueDetailsProjection, issueDetailsBase],
      [incrementProjection, incrementBase],
    ]) assert.deepEqual(project(current, file), snapshotBytes(ref, file));
  }
  assert.equal(validateReleaseIncrement().reviewedFiles, 56);
});

test('header rejects extra bytes, old snapshots and status/source/navigation/full-detail mutations at every entry', () => {
  for (const file of pairedCardHeaderPaths) {
    rejectsSource(file, Buffer.concat([read(file), Buffer.from('\n/* unreviewed header delta */\n')]));
    const changed = Buffer.from(read(file)); changed[0] ^= 1;
    rejectsSource(file, changed);
    for (const ref of [pairedCardHeaderBase, pairedCardFinalHead, pairedCardFinalBase, pairedCardLayoutBase]) {
      rejectsSource(file, snapshotBytes(ref, file));
    }
  }
  const file = 'src/views/chart.js';
  for (const [before, after] of [
    ['const gateStatus = channel.gates.includes(sourceGate);', 'const gateStatus = true;'],
    ["gateStatus && (source === 'defined' || source === 'natal')", "gateStatus && source === 'defined'"],
    ["${natalStatus ? t('Birth activations') : statusLabel}", '${statusLabel}'],
    ['showGateDetail(id, false, currentDetail.source)', 'showGateDetail(id, false)'],
    ['detailContext?.model, gateNum)', 'detailContext?.model)'],
    ['channel.gates.find(gate => gate !== sourceGate)', 'channel.gates.find(gate => gate === sourceGate)'],
    ['export function showGateDetail(gateNum, pushHistory = true, source = null)', 'export function showGateDetail(gateNum, pushHistory = false, source = null)'],
  ]) {
    const changed = mutateUnique(read(file), before, after);
    rejectsSource(file, changed);
    assert.throws(() => assertPairedCardHeaderDelta(snapshotBytes(pairedCardHeaderBase, file), changed, file));
  }
});

test('Center actual rendered HTML stays byte-identical including whitespace for all source/model states', () => {
  const before = channelRenderer(snapshotBytes(pairedCardHeaderBase, 'src/views/chart.js'));
  const after = channelRenderer(read('src/views/chart.js'));
  eachState((channel, chart, model) => {
    for (const gate of [undefined, null, 99]) {
      const actual = after(channel, chart, model, gate);
      assert.equal(actual, before(channel, chart, model, gate));
      assert.doesNotMatch(actual, /gate-detail-channel-header|gate-detail-channel-meta|gate-detail-paired-gate/);
    }
  });
});

test('Gate header groups only title/badges; standalone status and every unwrapped byte stay identical', () => {
  const before = channelRenderer(snapshotBytes(pairedCardHeaderBase, 'src/views/chart.js'));
  const after = channelRenderer(read('src/views/chart.js'));
  eachState((channel, chart, model) => {
    for (const gate of channel.gates) {
      const oldHtml = before(channel, chart, model, gate), newHtml = after(channel, chart, model, gate);
      const metadata = unwrap(oldHtml, 'gate-detail-channel-meta');
      const header = unwrap(newHtml, 'gate-detail-channel-header');
      assert.match(header.content, /class="gate-link"/);
      assert.match(header.content, /class="channel-circuit-badges"/);
      assert.doesNotMatch(header.content, /transit-source-badge|tl-detail-channel-status|gate-detail-paired-gate/);
      assert.doesNotMatch(newHtml, /gate-detail-channel-meta/);
      assert.ok(newHtml.indexOf('transit-source-badge') > header.end, 'Status is outside header');
      assert.ok(newHtml.indexOf('transit-source-badge') < newHtml.indexOf('class="gate-detail-paired-gate"'), 'Status precedes harmonic gate');
      assert.equal(header.html, metadata.html, 'Only wrapper position/name changes, preserving whitespace, badges, status and button HTML');
      assert.deepEqual(newHtml.match(/<span class="circuit-badge transit-source-badge[^>]*>[^<]*<\/span>/g),
        oldHtml.match(/<span class="circuit-badge transit-source-badge[^>]*>[^<]*<\/span>/g));
    }
  });
});

test('header conditional markup, exact paired CSS scope, 1.5px token separator and 30/44 targets reject regressions', () => {
  for (const [file, before, after] of [
    ['src/views/chart.js', "${pairedGate == null ? '' : '<div class=\"gate-detail-channel-header\">'}", '<div class="gate-detail-channel-header">'],
    ['src/views/chart.js', "${pairedGate == null ? '' : '</div>'}", '</div>'],
    ['src/styles.css', '.gate-detail-channel:has(.gate-detail-paired-gate) {', '.gate-detail-channel {'],
    ['src/styles.css', '.gate-detail-channel:has(.gate-detail-paired-gate) > .gate-detail-channel-header > .gate-link', '.gate-detail-channel .gate-link'],
    ['src/styles.css', '.gate-detail-channel:has(.gate-detail-paired-gate) > .gate-detail-channel-header {', '.gate-detail-channel-header {'],
    ['src/styles.css', 'display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 4px 8px; min-width: 0;', 'display: block;'],
    ['src/styles.css', '.gate-detail-channel:has(.gate-detail-paired-gate) .channel-circuit-badges {', '.channel-circuit-badges {'],
    ['src/styles.css', '  padding-block: 6px;\n  row-gap: 4px;', '  padding-block: 10px;\n  row-gap: 8px;'],
    ['src/styles.css', '  border-top: 1.5px solid var(--border);', '  border-top: 1px solid var(--border-subtle);'],
    ['src/styles.css', '  min-height: 30px;\n  margin: 0;', '  min-height: 20px;\n  margin: 0;'],
    ['src/styles.css', '@media (max-width: 600px), (pointer: coarse) {\n  .gate-detail-paired-gate { min-height: 44px; }', '@media (max-width: 600px) {\n  .gate-detail-paired-gate { min-height: 30px; }'],
  ]) {
    const changed = mutateUnique(read(file), before, after);
    rejectsSource(file, changed);
    assert.throws(() => assertPairedCardHeaderDelta(snapshotBytes(pairedCardHeaderBase, file), changed, file));
  }
});

test('historical approvals remain immutable except the final entry hook; other paths receive no approval', () => {
  for (const file of [
    'tests/helpers/paired-card-layout-projection.js', 'tests/helpers/channel-status-projection.js',
    'tests/helpers/paired-gate-visual-projection.js', 'tests/helpers/issue-details-projection.js',
    'tests/helpers/release-increment-projection.js', 'tests/helpers/release-validation-projection.js',
    'docs/release-increment-8475a4a.json', 'tests/paired-card-layout-scope.test.js',
    'tests/channel-status-scope.test.js', 'tests/paired-gate-visual-scope.test.js',
    'tests/issue-details-scope.test.js', 'tests/release-increment-scope.test.js', 'tests/knowledge-polish.test.js',
  ]) assert.deepEqual(historicalAuditSource(file), snapshotBytes(pairedCardHeaderBase, file), `Historical approval unchanged: ${file}`);
  const file = 'tests/helpers/paired-card-final-projection.js';
  const restored = read(file).toString()
    .replace("import { pairedCardHeaderProjection } from './paired-card-header-projection.js';\n", '')
    .replace('  source = pairedCardHeaderProjection(source, file);\n', '');
  assert.equal(restored, snapshotBytes(pairedCardHeaderBase, file).toString(), 'Final changes only by the header hook');
  for (const other of ['src/views/team.js', 'src/lib/knowledge/content/penta.js', 'engine-core/TransitCore.cs']) {
    const changed = Buffer.concat([read(other), Buffer.from('\n// outside header scope\n')]);
    if (pentaIntegrationPaths.includes(other)) assert.throws(() => pairedCardHeaderProjection(changed, other), /Unreviewed increment source/);
    else assert.strictEqual(pairedCardHeaderProjection(changed, other), changed);
    assert.throws(() => validateReleaseIncrement(auditRoot, {
      files: inventory, read: p => p === other ? changed : read(p),
    }), /Unreviewed increment source/);
  }
  const unknown = 'src/lib/header-unreviewed.js', source = Buffer.from('unapproved');
  assert.strictEqual(pairedCardHeaderProjection(source, unknown), source);
  assert.throws(() => validateReleaseIncrement(auditRoot, { files: [...inventory, unknown] }), /Unreviewed increment source inventory/);
  for (const missing of pairedCardHeaderPaths) {
    assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory.filter(p => p !== missing) }), /Unreviewed increment source inventory/);
  }
});
