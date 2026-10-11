import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { waIntegrationBase, waIntegrationHead, waPreparationHead, waAddedPaths,
  waIntegrationPaths, integrationAddedPaths, assertWaIntegrationApproval,
  assertWaIntegrationSource, waIntegrationProjection, waSnapshotBytes } from './helpers/wa-integration-projection.js';
import { waAdaptedAuditPaths, waNewAuditPaths, assertWaAuditApproval,
  waAuditHistoricalSource } from './helpers/wa-audit-history-projection.js';
import { pentaAddedPaths } from './helpers/penta-integration-projection.js';
import { pairedCardHeaderProjection } from './helpers/paired-card-header-projection.js';
import { incrementProjection, validateReleaseIncrement, auditRoot,
  incrementManifestPath } from './helpers/release-increment-projection.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: auditRoot, maxBuffer: 32 * 1024 * 1024 });
const protectedPath = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file)
  || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(file);
const baseInventory = git('ls-tree', '-r', '--name-only', waIntegrationBase)
  .toString().trim().split('\n').filter(protectedPath);
// f278 already contains the two Penta additions; append only Wa here.
const inventory = [...baseInventory, ...waAddedPaths];
function rejectsBytes(file, source) {
  assert.notDeepEqual(source, read(file), 'Negative must change actual current bytes');
  assert.throws(() => validateReleaseIncrement(auditRoot, {
    files: inventory, read: p => p === file ? source : read(p),
  }), error => error.code === 'ERR_ASSERTION'
    && error.message.startsWith(`Unreviewed increment source: ${file}`),
  'Must reject the mutated file, never an inventory, approval or different-file failure');
}

test('Wa requires explicit final source and independent audit approval with thirteen paths', () => {
  assert.equal(waIntegrationBase, 'f278e419e605e65d6f7ec501857bdc896103e2fa');
  assert.equal(waPreparationHead, '31a1d6f3ceede61c4ff85fd43a105f968459dc56');
  assertWaIntegrationApproval();
  assertWaAuditApproval();
  assert.equal(waIntegrationPaths.length, 13);
  assert.equal(waAddedPaths.length, 9);
  assert.ok(Object.isFrozen(waIntegrationPaths));
  assert.ok(Object.isFrozen(waAddedPaths));
  assert.ok(Object.isFrozen(integrationAddedPaths));
  assert.deepEqual(integrationAddedPaths, [...pentaAddedPaths, ...waAddedPaths]);
  assert.equal(new Set(inventory).size, inventory.length);
  assert.equal(validateReleaseIncrement(auditRoot, { files: inventory }).protectedFiles, inventory.length);
});

test('Wa bytes validate before old projections and additions never invent historical blobs', () => {
  for (const file of waIntegrationPaths) {
    const source = read(file);
    assertWaIntegrationSource(source, file);
    assert.deepEqual(source, waSnapshotBytes(waIntegrationHead, file));
    if (waAddedPaths.includes(file)) {
      for (const project of [waIntegrationProjection, pairedCardHeaderProjection, incrementProjection])
        assert.throws(() => project(source, file), /no historical projection/);
    } else {
      assert.deepEqual(waIntegrationProjection(source, file), waSnapshotBytes(waIntegrationBase, file));
      assert.deepEqual(pairedCardHeaderProjection(source, file), waSnapshotBytes(waIntegrationBase, file));
      rejectsBytes(file, waSnapshotBytes(waIntegrationBase, file));
    }
    const flipped = Buffer.from(source); flipped[0] ^= 1;
    for (const changed of [flipped, Buffer.concat([source, Buffer.from('\n// unreviewed\n')])]) {
      for (const project of [assertWaIntegrationSource, waIntegrationProjection,
        pairedCardHeaderProjection, incrementProjection])
        assert.throws(() => project(changed, file), /Unreviewed increment source:/);
      rejectsBytes(file, changed);
    }
  }
});

test('complete inventory catches every addition missing, extra or duplicated', () => {
  for (const file of integrationAddedPaths) {
    for (const files of [inventory.filter(p => p !== file), [...inventory, file]])
      assert.throws(() => validateReleaseIncrement(auditRoot, { files }), /Unreviewed increment source inventory/);
  }
  assert.throws(() => validateReleaseIncrement(auditRoot, {
    files: [...inventory, 'src/lib/wa/unreviewed.js'],
  }), /Unreviewed increment source inventory/);
  const source = Buffer.from('unapproved');
  assert.strictEqual(waIntegrationProjection(source, 'src/lib/wa/unreviewed.js'), source);
  assert.throws(() => assertWaIntegrationSource(source, 'src/lib/wa/unreviewed.js'), /Unreviewed Wa path/);
});

test('Penta, topology, engine and persistence negatives reach their actual byte guard', () => {
  for (const file of [...pentaAddedPaths, 'src/lib/knowledge/content/penta.js',
    'src/views/penta-matrix.js', 'src/lib/human-design/penta-structure.js',
    'engine-core/TransitCore.cs', 'src/lib/team-repository.js', 'src/lib/profile-storage.js'])
    rejectsBytes(file, Buffer.concat([read(file), Buffer.from('\n// unreviewed old source\n')]));
});

test('manifest expansion and simultaneous Wa byte changes cannot confer approval', () => {
  const original = JSON.parse(read(incrementManifestPath));
  for (const change of [m => { m.reviewedHead = waIntegrationHead; },
    m => { m.files[waAddedPaths[0]] = 'approve'; }]) {
    const manifest = structuredClone(original); change(manifest);
    assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory,
      read: file => file === incrementManifestPath ? Buffer.from(JSON.stringify(manifest))
        : file === waAddedPaths[0] ? Buffer.from('{}') : read(file),
    }), /Unreviewed increment manifest/);
  }
});

test('flat audit snapshot restores only reviewed adapters and rejects additional bytes', () => {
  assertWaAuditApproval();
  for (const file of waAdaptedAuditPaths) {
    assert.deepEqual(waAuditHistoricalSource(file), waSnapshotBytes(waIntegrationBase, file));
    assert.throws(() => waAuditHistoricalSource(file,
      Buffer.concat([read(file), Buffer.from('\n// unreviewed audit\n')])), /Unreviewed historical audit source:/);
  }
  for (const file of waNewAuditPaths) assert.ok(read(file).length > 0);
  const source = Buffer.from('not an approved adapter');
  assert.strictEqual(waAuditHistoricalSource('tests/unknown.test.js', source), source);
});
