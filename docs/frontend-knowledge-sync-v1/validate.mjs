/** Exact two-parent source guard for this merge; build revision metadata is not calculation identity. */
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { validateDistribution } from '../release-licensing-v1/validate.mjs';

const root = path.resolve(import.meta.dirname, '../..');
export const BASE = '2bc308b7a9037a10bae92fff6c9ff536a276b8ae';
export const MAIN = 'bc9b217fab260b1017bfb1478141f864e402289e';
export const KNOWLEDGE = 'df06686baa855b01a8bbfb3d77cf85b34eaf4717';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root });
const trees = new Map();
const tree = ref => {
  if (!trees.has(ref)) trees.set(ref, git('ls-tree', '-r', '--name-only', ref).toString().trim().split('\n'));
  return trees.get(ref);
};
const protectedPath = file => /^(?:src\/|engine-core\/|engine-tools\/|engine-wasm\/|scripts\/|third_party\/|jovian-engine\/|public\/transit-data\/)/.test(file)
  || /^(?:package(?:-lock)?\.json|LICENSE|vite\.config\.js|index\.html|\.env\.production)$/.test(file);

export function expectedMergedSource(file) {
  const read = ref => tree(ref).includes(file) ? git('show', `${ref}:${file}`) : null;
  const base = read(BASE), main = read(MAIN), knowledge = read(KNOWLEDGE);
  if (!base) {
    if (main && knowledge && !main.equals(knowledge)) throw new Error(`Conflicting new source: ${file}`);
    return main || knowledge;
  }
  if (main?.equals(base)) return knowledge;
  if (knowledge?.equals(base) || main?.equals(knowledge)) return main;
  if (file !== 'src/main.js') throw new Error(`Unreviewed overlapping source: ${file}`);
  // Reproduce Git's clean three-way merge from immutable parent blobs.
  const temp = mkdtempSync(path.join(tmpdir(), 'td-reviewed-merge-'));
  try {
    const inputs = ['main', 'base', 'knowledge'].map(name => path.join(temp, name));
    [main, base, knowledge].forEach((bytes, index) => writeFileSync(inputs[index], bytes));
    const merge = spawnSync('git', ['merge-file', '-p', ...inputs], { cwd: root });
    if (merge.status !== 0) throw new Error(`Reviewed parents need a semantic conflict resolution: ${file}`);
    return merge.stdout;
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

export function validateSyncedRelease(rootPath = root) {
  const expectedFiles = [...new Set([...tree(MAIN), ...tree(KNOWLEDGE)])].filter(protectedPath);
  const currentFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: rootPath }).toString().trim().split('\n');
  for (const file of currentFiles.filter(protectedPath))
    if (!expectedFiles.includes(file)) throw new Error(`Unreviewed new source: ${file}`);
  for (const file of expectedFiles)
    if (hash(readFileSync(path.join(rootPath, file))) !== hash(expectedMergedSource(file)))
      throw new Error(`Two-parent source differs: ${file}`);
  validateDistribution(path.join(rootPath, 'dist'));
  const identity = JSON.parse(readFileSync(path.join(rootPath, 'docs/release-licensing-v1/production-identity.json')));
  for (const [name, expected] of Object.entries(identity.ephemerisHashes))
    if (hash(readFileSync(path.join(rootPath, 'dist/engine/ephe', name))) !== expected) throw new Error(`Ephemeris changed: ${name}`);
  const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  if (files(path.join(rootPath, 'dist')).some(file => /jovian|swiss176|de406|native_backend/i.test(path.relative(path.join(rootPath, 'dist'), file))))
    throw new Error('Historical runtime in browser');
  return { passed: true, engineSignature: identity.engineSignature, protectedFiles: expectedFiles.length,
    main: MAIN, knowledge: KNOWLEDGE };
}
