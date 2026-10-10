import assert from 'node:assert/strict';
import {validationHead,validationPaths,validationProjection} from './release-validation-projection.js';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const auditRoot = path.resolve(import.meta.dirname, '../..');
export const incrementBase = 'cb29ace095f86f1215ded44a6945a8a4b0c66935';
export const incrementHead = '8475a4a12311089f64dbec1ba8b37449cd238537';
export const incrementManifestPath = 'docs/release-increment-8475a4a.json';
const manifestDigest = '7be640d4ba0beead57608e8c033b65b7f9556f99171da59246e577f5c4e6dbf3';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: auditRoot, maxBuffer: 32 * 1024 * 1024 });
const blobs = new Map();
export function snapshotBytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!blobs.has(key)) blobs.set(key, git('show', key));
  return Buffer.from(blobs.get(key));
}
export function validateIncrementManifest(bytes = readFileSync(path.join(auditRoot, incrementManifestPath))) {
  assert.equal(sha256(bytes), manifestDigest, 'Unreviewed increment manifest');
  const manifest = JSON.parse(bytes);
  assert.equal(manifest.baseline, incrementBase);
  assert.equal(manifest.reviewedHead, incrementHead);
  const paths = git('diff', '--name-only', incrementBase, incrementHead, '--', 'src', 'index.html', 'package.json', 'package-lock.json', 'vite.config.js', 'scripts').toString().trim().split('\n');
  assert.deepEqual(Object.keys(manifest.files).sort(), paths.sort(), 'Increment paths must exactly match reviewed commits');
  return manifest;
}
const manifest = validateIncrementManifest();
const basePaths = new Set(git('ls-tree', '-r', '--name-only', incrementBase).toString().trim().split('\n'));
/** Current bytes must pass BEFORE any historical projection. Never infer approval from current hashes. */
export function incrementProjection(source, file) {
  source = validationProjection(source, file);
  if (!Object.hasOwn(manifest.files, file)) return Buffer.isBuffer(source) ? source : Buffer.from(source);
  assert.equal(sha256(source), sha256(snapshotBytes(incrementHead, file)), `Unreviewed increment source: ${file}`);
  assert.ok(basePaths.has(file), `New increment file has no historical projection: ${file}`);
  return snapshotBytes(incrementBase, file);
}
export function incrementHistoricalSource(file) {
  return incrementProjection(readFileSync(path.join(auditRoot, file)), file);
}
const protectedPath = file => /^(src\/|engine-core\/|engine-tools\/|engine-wasm\/|jovian-engine\/|scripts\/|third_party\/|public\/transit-data\/)/.test(file) || ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production'].includes(file);
/** Complete current source inventory plus fixed blobs catches mutations in unchanged algorithms and new paths too. */
export function validateReleaseIncrement(root = auditRoot, { read = file => readFileSync(path.join(root, file)), files = null } = {}) {
  const reviewed = validateIncrementManifest(read(incrementManifestPath));
  const expected = [...new Set([...git('ls-tree', '-r', '--name-only', incrementHead).toString().trim().split('\n').filter(protectedPath), ...validationPaths])].sort();
  if (!files) {
    const walk = relative => readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${relative}/${entry.name}`) : [`${relative}/${entry.name}`]);
    files = ['src', 'engine-core', 'engine-tools', 'engine-wasm', 'jovian-engine', 'scripts', 'third_party', 'public/transit-data'].flatMap(walk).filter(file => !/(^|\/)(bin|obj|node_modules)\//.test(file));
    // Build artifacts ignored by Git do not become approved source. Tracked files remain checked.
    const ignored = new Set(git('ls-files', '--others', '--ignored', '--exclude-standard').toString().trim().split('\n'));
    files = files.filter(file => !ignored.has(file) || expected.includes(file)).concat(['index.html', 'package.json', 'package-lock.json', 'vite.config.js', '.env.production']);
  }
  assert.deepEqual(files.slice().sort(), expected, 'Unreviewed increment source inventory');
  for (const file of expected) assert.equal(sha256(read(file)), sha256(snapshotBytes(validationPaths.includes(file) ? validationHead : incrementHead, file)), `Unreviewed increment source: ${file}`);
  // Historical proof inputs must not be editable behind the isolated snapshot.
  for (const file of [...basePaths].filter(file => /^(docs|tests\/fixtures)\/.*\.json$/.test(file)))
    assert.deepEqual(read(file), snapshotBytes(incrementBase, file), `Historical audit input changed: ${file}`);
  for (const file of reviewed.evidence) assert.deepEqual(read(file), snapshotBytes(incrementHead, file), `Increment evidence changed: ${file}`);
  const invariantPaths = expected.filter(file => /^(engine-|jovian-engine\/|src\/lib\/(chart-engine|knowledge|human-design)\/)/.test(file) && file !== 'src/lib/human-design/team-members.js');
  for (const file of invariantPaths) assert.deepEqual(snapshotBytes(incrementHead, file), snapshotBytes(incrementBase, file), `Unauthorized algorithm or knowledge delta: ${file}`);
  return { reviewedFiles: Object.keys(reviewed.files).length, protectedFiles: expected.length, unchangedInvariants: invariantPaths.length };
}
