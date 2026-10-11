import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { finalPhases, finalActivePhases, finalSourcePaths, finalAddedPaths, integrationAddedPaths,
  v2PhaseB, v2PhaseC, assertFinalSourceApproval, assertFinalSource, finalSourceProjection }
  from './helpers/penta-wa-v2-final-review.js';
import { v2RootBase, v2PhaseA, v2SnapshotBytes } from './helpers/penta-wa-v2-review.js';
import { finalAuditHead } from './helpers/penta-wa-v2-final-audit-approval.js';
import { assertFinalAuditApproval, finalAuditHistoricalSource, finalAdaptedAuditPaths }
  from './helpers/penta-wa-v2-final-audit-compat.js';
import { pairedCardHeaderProjection } from './helpers/paired-card-header-projection.js';
import { incrementProjection, validateReleaseIncrement, auditRoot, incrementManifestPath }
  from './helpers/release-increment-projection.js';
const read = file => readFileSync(new URL('../' + file, import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: auditRoot, maxBuffer: 32 * 1024 * 1024 });
const protectedPath = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file)
  || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(file);
const inventory = [...git('ls-tree', '-r', '--name-only', v2RootBase).toString().trim().split('\n').filter(protectedPath), ...finalAddedPaths];
const targetError = file => error => error.code === 'ERR_ASSERTION'
  && error.message.startsWith(`Unreviewed increment source: ${file}`);

test('final source approves exact A/B/C ranges, thirteen paths and only the B prepare addition', () => {
  assert.equal(v2PhaseA.head, '9b01fb87fce51648b4fddf4d0dcdd9defe8867c7');
  assert.equal(v2PhaseB.head, '20a7ba33952a078219c01524e4bfb8b6e1a2ba9b');
  assert.equal(v2PhaseB.base, v2PhaseA.head);
  assert.equal(v2PhaseC.base, v2PhaseB.head);
  assert.deepEqual(finalActivePhases, ['A', 'B', 'C']);
  assert.equal(finalPhases.A, v2PhaseA);
  assert.equal(finalSourcePaths.length, 13);
  assert.deepEqual(finalAddedPaths, ['src/lib/wa/prepare.js']);
  for (const record of [finalPhases, finalActivePhases, finalSourcePaths, finalAddedPaths,
    v2PhaseB, v2PhaseB.paths, v2PhaseB.addedPaths, v2PhaseC, v2PhaseC.paths, v2PhaseC.addedPaths])
    assert.ok(Object.isFrozen(record));
  assertFinalSourceApproval();
  assert.equal(validateReleaseIncrement().protectedFiles, inventory.length);
  assert.equal(git('diff', '--name-only', v2RootBase, v2PhaseC.head, '--',
    'package.json', 'package-lock.json', 'index.html', 'src/main.js').toString(), '');
});

test('every final path rejects flipped, appended and superseded bytes at its own guard', () => {
  for (const file of finalSourcePaths) {
    const source = read(file);
    assertFinalSource(source, file);
    assert.deepEqual(source, v2SnapshotBytes(v2PhaseC.head, file));
    if (finalAddedPaths.includes(file)) {
      for (const project of [finalSourceProjection, pairedCardHeaderProjection, incrementProjection])
        assert.throws(() => project(source, file), /no historical projection/);
    } else assert.deepEqual(finalSourceProjection(source, file), v2SnapshotBytes(v2RootBase, file));
    const flipped = Buffer.from(source); flipped[0] ^= 1;
    const mutations = [flipped, Buffer.concat([source, Buffer.from('\n// unreviewed final source\n')])];
    if (!finalAddedPaths.includes(file)) mutations.push(v2SnapshotBytes(v2RootBase, file));
    if (['src/lib/wa/model.js', 'src/lib/wa/prepare.js'].includes(file))
      mutations.push(v2SnapshotBytes(v2PhaseB.head, file));
    for (const changed of mutations) {
      assert.notDeepEqual(changed, source);
      for (const project of [assertFinalSource, finalSourceProjection, pairedCardHeaderProjection, incrementProjection])
        assert.throws(() => project(changed, file), targetError(file));
      assert.throws(() => validateReleaseIncrement(auditRoot, {
        files: inventory, read: p => p === file ? changed : read(p),
      }), targetError(file));
    }
  }
});

test('old plus new inventory rejects every missing or duplicate addition and unauthorized extras', () => {
  assert.equal(new Set(inventory).size, inventory.length);
  for (const file of integrationAddedPaths) {
    assert.ok(inventory.includes(file));
    for (const files of [inventory.filter(p => p !== file), [...inventory, file]])
      assert.throws(() => validateReleaseIncrement(auditRoot, { files }), /Unreviewed increment source inventory/);
  }
  assert.throws(() => validateReleaseIncrement(auditRoot, {
    files: [...inventory, 'src/lib/wa/unapproved-final.js'],
  }), /Unreviewed increment source inventory/);
  for (const file of ['package.json', 'package-lock.json', 'index.html', 'src/main.js',
    'src/lib/human-design/penta-structure.js', 'src/lib/team-repository.js'])
    assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory,
      read: p => p === file ? Buffer.concat([read(file), Buffer.from('\n// unreviewed\n')]) : read(p),
    }), targetError(file));
});

test('old evidence cannot grant final approval by rewriting its manifest', () => {
  const manifest = JSON.parse(read(incrementManifestPath));
  manifest.reviewedHead = v2PhaseC.head;
  manifest.files['src/lib/wa/prepare.js'] = 'approve';
  assert.throws(() => validateReleaseIncrement(auditRoot, { files: inventory,
    read: file => file === incrementManifestPath ? Buffer.from(JSON.stringify(manifest))
      : file === 'src/lib/wa/prepare.js' ? Buffer.from('{}') : read(file),
  }), /Unreviewed increment manifest/);
});

test('second audit layer fails closed pending parent approval and later restores A without repinning it', () => {
  if (finalAuditHead === 'PENDING_PARENT_FINAL_AUDIT_APPROVAL') {
    assert.throws(() => assertFinalAuditApproval(), /Pending parent final audit approval/);
    for (const file of finalAdaptedAuditPaths)
      assert.throws(() => finalAuditHistoricalSource(file), /Pending parent final audit approval/);
    return;
  }
  assertFinalAuditApproval();
  for (const file of finalAdaptedAuditPaths) {
    assert.deepEqual(finalAuditHistoricalSource(file), v2SnapshotBytes('953959249bd7409c5b4d1042fc2ca38f943c39e5', file));
    assert.throws(() => finalAuditHistoricalSource(file,
      Buffer.concat([read(file), Buffer.from('\n// unreviewed adapter\n')])), /Unreviewed historical audit source:/);
  }
});
