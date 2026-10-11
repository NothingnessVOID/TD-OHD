import test from 'node:test';
import { integrationAddedPaths } from './helpers/wa-integration-projection.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pentaIntegrationBase, pentaIntegrationHead, pentaContentHead, pentaContentPaths,
  pentaIntegrationPaths, pentaAddedPaths, assertPentaIntegrationApproval,
  assertPentaIntegrationSource, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';
import { pairedCardHeaderProjection } from './helpers/paired-card-header-projection.js';
import { historicalAuditSource } from './helpers/penta-audit-history-projection.js';
import { auditRoot, incrementBase, incrementManifestPath, snapshotBytes, incrementProjection,
  validateReleaseIncrement } from './helpers/release-increment-projection.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: auditRoot, maxBuffer: 32 * 1024 * 1024 });
const protectedPath = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file)
  || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(file);
const oldInventory = git('ls-tree', '-r', '--name-only', pentaIntegrationBase)
  .toString().trim().split('\n').filter(protectedPath);
const inventory = [...oldInventory, ...integrationAddedPaths];
const incrementBasePaths = new Set(git('ls-tree', '-r', '--name-only', incrementBase).toString().trim().split('\n'));

test('Penta pins the full final parent SHA, twelve source paths and two additions independently of HEAD', () => {
  assert.equal(pentaIntegrationBase, 'f7cb220b880b54d482ca5c23889123f39c2c632e');
  assert.equal(pentaIntegrationHead, 'f347ff011e20e951c94b7dcf9f745a976b972399');
  assert.equal(pentaContentHead, '0c5164349d85e95216847f94b98b39e7a9e94388');
  assert.ok(Object.isFrozen(pentaIntegrationPaths));
  assert.ok(Object.isFrozen(pentaAddedPaths));
  assert.equal(pentaIntegrationPaths.length, 12);
  assert.deepEqual(pentaAddedPaths, ['src/lib/knowledge/content/penta-v1.json', 'src/lib/knowledge/penta-reading-policy.js']);
  assertPentaIntegrationApproval();
  for (const file of pentaContentPaths) assert.deepEqual(read(file), snapshotBytes(pentaContentHead, file));
});

test('all existing files validate before historical normalization; new files have no invented historical blob', () => {
  for (const file of pentaIntegrationPaths) {
    const source = read(file);
    assertPentaIntegrationSource(source, file);
    assert.deepEqual(source, snapshotBytes(pentaIntegrationHead, file));
    if (pentaAddedPaths.includes(file)) {
      assert.throws(() => pentaIntegrationProjection(source, file), /no historical projection/);
      assert.throws(() => incrementProjection(source, file), /no historical projection/);
    } else {
      assert.deepEqual(pentaIntegrationProjection(source, file), snapshotBytes(pentaIntegrationBase, file));
      assert.deepEqual(pairedCardHeaderProjection(source, file), snapshotBytes(pentaIntegrationBase, file));
      if (incrementBasePaths.has(file)) assert.deepEqual(incrementProjection(source, file), snapshotBytes(incrementBase, file));
      else assert.throws(() => incrementProjection(source, file), /no historical projection/);
    }
  }
  const result = validateReleaseIncrement();
  assert.equal(result.reviewedFiles, 56);
  assert.equal(result.protectedFiles, inventory.length);
  assert.ok(result.unchangedInvariants > 50);
});

test('every Penta file rejects byte mutations at direct, header, increment and injected inventory entry points', () => {
  for (const file of pentaIntegrationPaths) {
    const original = read(file);
    const flipped = Buffer.from(original); flipped[0] ^= 1;
    for (const source of [Buffer.concat([original, Buffer.from('\n// unreviewed\n')]), flipped]) {
      for (const project of [assertPentaIntegrationSource, pentaIntegrationProjection,
        pairedCardHeaderProjection, incrementProjection]) {
        assert.throws(() => project(source, file), /Unreviewed increment source/);
      }
      assert.throws(() => validateReleaseIncrement(auditRoot, {
        files: inventory, read: p => p === file ? source : read(p),
      }), /Unreviewed increment source/);
    }
    if (!pentaAddedPaths.includes(file)) {
      assert.throws(() => pentaIntegrationProjection(snapshotBytes(pentaIntegrationBase, file), file), /Unreviewed increment source/);
    }
  }
});

test('exact added inventory excludes missing, extra and duplicate paths', () => {
  for (const files of [oldInventory, ...pentaAddedPaths.map(file => inventory.filter(p => p !== file)),
    [...inventory, 'src/lib/penta-unreviewed-messages.js'], [...inventory, pentaAddedPaths[0]]]) {
    assert.throws(() => validateReleaseIncrement(auditRoot, { files }), /Unreviewed increment source inventory/);
  }
  const source = Buffer.from('unreviewed');
  assert.strictEqual(pentaIntegrationProjection(source, 'src/lib/unreviewed.js'), source);
  assert.throws(() => assertPentaIntegrationSource(source, 'src/lib/unreviewed.js'), /Unreviewed Penta integration path/);
});

test('old manifests cannot authorize new content by expansion, repinning or simultaneous edits', () => {
  const original = JSON.parse(read(incrementManifestPath));
  for (const mutate of [m => { m.reviewedHead = pentaIntegrationHead; },
    m => { m.files[pentaAddedPaths[0]] = 'approve'; }, m => { m.files['src/lib/knowledge/sources.js'] = 'approve'; }]) {
    const manifest = structuredClone(original); mutate(manifest);
    assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory,
      read: file => file === incrementManifestPath ? Buffer.from(JSON.stringify(manifest))
        : file === pentaAddedPaths[0] ? Buffer.from('{}') : read(file),
    }), /Unreviewed increment manifest/);
  }
});

test('only exact audit hooks restore historical tests and helpers; extra edits still fail', () => {
  for (const file of [
    'tests/helpers/paired-card-header-projection.js', 'tests/helpers/release-increment-projection.js',
    ...['release-increment', 'issue-details', 'paired-gate-visual', 'channel-status',
      'paired-card-layout', 'paired-card-final', 'paired-card-header'].map(name => `tests/${name}-scope.test.js`),
  ]) {
    assert.deepEqual(historicalAuditSource(file), snapshotBytes(pentaIntegrationBase, file));
    assert.throws(() => historicalAuditSource(file, Buffer.concat([read(file), Buffer.from('\n// unreviewed\n')])),
      /Unreviewed historical audit/);
  }
});
