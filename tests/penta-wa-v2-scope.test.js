import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { v2RootBase, v2PhaseA, v2Phases, v2ActivePhases, v2PendingPhases, v2SourcePaths,
  v2AddedPaths, assertV2SourceApproval, assertV2Source, v2SourceProjection,
  v2SnapshotBytes } from './helpers/penta-wa-v2-review.js';
import { assertV2AuditApproval, v2AuditHistoricalSource, v2AdaptedAuditPaths }
  from './helpers/penta-wa-v2-audit-compat.js';
import { v2AuditHead } from './helpers/penta-wa-v2-audit-approval.js';
import { pentaIntegrationHead, pentaContentHead, pentaContentPaths, assertPentaIntegrationSource }
  from './helpers/penta-integration-projection.js';
import { waIntegrationHead, waIntegrationPaths, integrationAddedPaths,
  assertWaIntegrationSource } from './helpers/wa-integration-projection.js';
import { pairedCardHeaderProjection } from './helpers/paired-card-header-projection.js';
import { incrementProjection, validateReleaseIncrement, auditRoot, incrementManifestPath }
  from './helpers/release-increment-projection.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: auditRoot, maxBuffer: 32 * 1024 * 1024 });
const protectedPath = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file)
  || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(file);
const inventory = git('ls-tree', '-r', '--name-only', v2RootBase).toString().trim().split('\n').filter(protectedPath);
const targetError = file => error => error.code === 'ERR_ASSERTION'
  && error.message.startsWith(`Unreviewed increment source: ${file}`);

test('A alone is explicitly active with an immutable parent-approved five-file range and no additions', () => {
  assert.equal(v2RootBase, 'c379fbe6b9a1b4b472b900aeedc691275407c3f8');
  assert.equal(v2PhaseA.head, '9b01fb87fce51648b4fddf4d0dcdd9defe8867c7');
  assert.equal(v2PhaseA.base, v2RootBase);
  assert.deepEqual(v2ActivePhases, ['A']);
  assert.deepEqual(v2PendingPhases, ['B', 'C']);
  assert.deepEqual(v2SourcePaths, ['src/lib/knowledge/content/penta-v1.json',
    'src/lib/knowledge/content/penta.js', 'src/lib/knowledge/penta-foundation.js',
    'src/lib/knowledge/sources.js', 'src/lib/wa/content-data.json']);
  assert.deepEqual(v2AddedPaths, []);
  for (const value of [v2Phases, v2PhaseA, v2PhaseA.paths, v2PhaseA.addedPaths,
    v2ActivePhases, v2PendingPhases, v2SourcePaths, v2AddedPaths]) assert.ok(Object.isFrozen(value));
  assertV2SourceApproval();
  assert.equal(validateReleaseIncrement().protectedFiles, inventory.length);
});

test('rootbase retains approved v1 product bytes; A restores both old content pins without replacing them', () => {
  assert.equal(pentaIntegrationHead, 'f347ff011e20e951c94b7dcf9f745a976b972399');
  assert.equal(pentaContentHead, '0c5164349d85e95216847f94b98b39e7a9e94388');
  assert.equal(waIntegrationHead, '52fcbae82836aeb033716b61b6ad79bd0b89c2d9');
  assert.equal(git('diff', '--name-only', waIntegrationHead, v2RootBase, '--',
    'src', 'index.html', 'package.json', 'package-lock.json').toString(), '');
  for (const file of waIntegrationPaths) {
    const restored = v2SourceProjection(read(file), file);
    assert.deepEqual(restored, v2SnapshotBytes(waIntegrationHead, file));
    assertWaIntegrationSource(restored, file);
  }
  for (const file of pentaContentPaths) {
    const restored = v2SourceProjection(read(file), file);
    assert.deepEqual(restored, v2SnapshotBytes(pentaContentHead, file));
    assertPentaIntegrationSource(restored, file);
  }
});

test('each A file validates before older projections; flipped, appended and stale v1 bytes fail at that file', () => {
  for (const file of v2SourcePaths) {
    const source = read(file);
    assertV2Source(source, file);
    assert.deepEqual(v2SourceProjection(source, file), v2SnapshotBytes(v2RootBase, file));
    const flipped = Buffer.from(source); flipped[0] ^= 1;
    for (const changed of [flipped, Buffer.concat([source, Buffer.from('\n// unreviewed\n')]),
      v2SnapshotBytes(v2RootBase, file)]) {
      assert.notDeepEqual(changed, source);
      for (const project of [assertV2Source, v2SourceProjection, pairedCardHeaderProjection, incrementProjection])
        assert.throws(() => project(changed, file), targetError(file));
      assert.throws(() => validateReleaseIncrement(auditRoot, {
        files: inventory, read: p => p === file ? changed : read(p),
      }), targetError(file));
    }
  }
});

test('inventory retains all old additions and rejects missing, duplicated, and unknown paths', () => {
  assert.equal(new Set(inventory).size, inventory.length);
  for (const file of new Set([...integrationAddedPaths, ...v2SourcePaths])) {
    assert.ok(inventory.includes(file));
    for (const files of [inventory.filter(p => p !== file), [...inventory, file]])
      assert.throws(() => validateReleaseIncrement(auditRoot, { files }), /Unreviewed increment source inventory/);
  }
  assert.throws(() => validateReleaseIncrement(auditRoot, {
    files: [...inventory, 'src/lib/wa/unapproved-v2.js'],
  }), /Unreviewed increment source inventory/);
});

test('pending B/C and package files still reject unapproved current bytes', () => {
  for (const file of ['src/lib/wa/model.js', 'src/lib/wa/analysis.js', 'src/views/wa.js',
    'src/lib/wa/messages.js', 'src/styles/wa.css', 'package.json', 'package-lock.json']) {
    const changed = Buffer.concat([read(file), Buffer.from('\n// unapproved later phase\n')]);
    assert.throws(() => validateReleaseIncrement(auditRoot, {
      files: inventory, read: p => p === file ? changed : read(p),
    }), targetError(file));
  }
  const bytes = Buffer.from('unknown');
  assert.strictEqual(v2SourceProjection(bytes, 'src/lib/wa/unapproved-v2.js'), bytes);
  assert.throws(() => assertV2Source(bytes, 'src/lib/wa/unapproved-v2.js'), /Unreviewed v2 path/);
});

test('old manifest edits cannot approve simultaneous A source mutations', () => {
  const manifest = JSON.parse(read(incrementManifestPath));
  manifest.reviewedHead = v2PhaseA.head;
  manifest.files[v2SourcePaths[0]] = 'approve';
  assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory,
    read: file => file === incrementManifestPath ? Buffer.from(JSON.stringify(manifest))
      : file === v2SourcePaths[0] ? Buffer.from('{}') : read(file),
  }), /Unreviewed increment manifest/);
});

test('flat audit compatibility requires separate parent approval; pending cannot authorize history', () => {
  if (v2AuditHead === 'PENDING_PARENT_V2_AUDIT_APPROVAL') {
    assert.throws(() => assertV2AuditApproval(), /Pending parent v2 audit snapshot approval/);
    for (const file of v2AdaptedAuditPaths)
      assert.throws(() => v2AuditHistoricalSource(file), /Pending parent v2 audit snapshot approval/);
    return;
  }
  assertV2AuditApproval();
  for (const file of v2AdaptedAuditPaths) {
    assert.deepEqual(v2AuditHistoricalSource(file), v2SnapshotBytes(v2PhaseA.head, file));
    assert.throws(() => v2AuditHistoricalSource(file,
      Buffer.concat([read(file), Buffer.from('\n// unreviewed audit\n')])), /Unreviewed historical audit source:/);
  }
});
