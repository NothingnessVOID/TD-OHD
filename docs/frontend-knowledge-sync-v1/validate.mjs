/** Exact two-parent source guard for this merge; build revision metadata is not calculation identity. */
import { readFileSync, existsSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
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
  const reviewPath = path.join(rootPath, 'docs/knowledge-layer/round2b-scope.json');
  const review = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath)) : null;
  const allowed = new Set(['src/lib/knowledge/access.js','src/lib/knowledge/content/human-design-zh-CN.js','src/lib/knowledge/detail-access.css','src/lib/knowledge/detail-controller.js','src/lib/knowledge/detail-renderer.js','src/lib/knowledge/human-design-foundation.js','src/lib/knowledge/registry.js','src/locales/zh-CN/ui-chart.json','src/locales/zh-CN/vocabulary.js','src/locales/zh-Hant/ui-chart.json','src/views/chart.js','src/views/reference.js']);
  if (review && (review.baseline !== '66185da8071a64b679ce51857c7029556957f038' || Object.keys(review.files).some(file => !allowed.has(file)))) throw new Error('Invalid Round 2B presentation scope');
  const localePath = path.join(rootPath, 'docs/knowledge-layer/round2c-scope.json');
  const localeReview = existsSync(localePath) ? JSON.parse(readFileSync(localePath)) : null;
  const localeAllowed = new Set(['src/lib/knowledge/content/human-design-en.js','src/lib/knowledge/content/human-design-zh-CN.js','src/lib/knowledge/content/human-design-zh-Hant.js','src/lib/knowledge/detail-renderer.js','src/locales/zh-Hant/ui-chart.json']);
  if (localeReview && (localeReview.baseline !== '292edc9b5aa8f7c6b1fa5e3055c4c76cba8c52b3' || Object.keys(localeReview.files).length !== 5 || Object.keys(localeReview.files).some(file => !localeAllowed.has(file)))) throw new Error('Invalid Round 2C editorial scope');
  const visualPath = path.join(rootPath, 'docs/knowledge-layer/round2d-scope.json');
  const visualReview = existsSync(visualPath) ? JSON.parse(readFileSync(visualPath)) : null;
  const visualAllowed = new Set(['src/lib/knowledge/content/human-design-en.js','src/lib/knowledge/content/human-design-zh-CN.js','src/lib/knowledge/content/human-design-zh-Hant.js','src/lib/knowledge/detail-renderer.js','src/lib/knowledge/detail-access.css','src/locales/zh-CN/ui-chart.json','src/locales/zh-Hant/ui-chart.json']);
  if (visualReview && (visualReview.baseline !== '438ad2dc2dfa950eed55687143516051023de824' || Object.keys(visualReview.files).length !== 7 || Object.keys(visualReview.files).some(file => !visualAllowed.has(file)))) throw new Error('Invalid Round 2D visual scope');
  const refinementPath = path.join(rootPath, 'docs/knowledge-layer/round2e-scope.json');
  const refinement = existsSync(refinementPath) ? JSON.parse(readFileSync(refinementPath)) : null;
  const refinementAllowed = new Set([...visualAllowed,'src/lib/knowledge/detail-controller.js','src/lib/knowledge/human-design-foundation.js','src/views/chart.js']);
  if (refinement && (refinement.baseline !== '7d9f7df080dbbb997f7db6eeac6b04327fd5b2db' || Object.keys(refinement.files).length !== 10 || Object.keys(refinement.files).some(file => !refinementAllowed.has(file)))) throw new Error('Invalid Round 2E UI scope');
  const polishPath = path.join(rootPath, 'docs/knowledge-layer/round2e-polish-scope.json');
  const polish = existsSync(polishPath) ? JSON.parse(readFileSync(polishPath)) : null;
  const polishAllowed = new Set(['src/lib/knowledge/detail-renderer.js','src/lib/knowledge/detail-controller.js','src/lib/knowledge/detail-access.css','src/views/chart.js','src/styles.css','src/locales/zh-CN/ui-chart.json','src/locales/zh-Hant/ui-chart.json']);
  if (polish && (polish.baseline !== '686a5966bd5c36f37dd4a80f5c51786c4f847a31' || Object.keys(polish.files).length !== 7 || Object.keys(polish.files).some(file => !polishAllowed.has(file)))) throw new Error('Invalid Round 2E polish scope');
  const deviationPath = path.join(rootPath, 'docs/knowledge-layer/round2f-scope.json');
  const deviation = existsSync(deviationPath) ? JSON.parse(readFileSync(deviationPath)) : null;
  const deviationAllowed = new Set([...visualAllowed,'src/locales/ui-contexts.json']);
  if (deviation && (deviation.baseline !== 'fa1d6afba38ebe0128b517a565123c827340554d' || Object.keys(deviation.files).length !== 8 || Object.keys(deviation.files).some(file => !deviationAllowed.has(file)))) throw new Error('Invalid Round 2F deviation scope');
  const expectedFiles = [...new Set([...tree(MAIN), ...tree(KNOWLEDGE)])].filter(protectedPath);
  const currentFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: rootPath }).toString().trim().split('\n');
  for (const file of currentFiles.filter(protectedPath))
    if (!expectedFiles.includes(file)) throw new Error(`Unreviewed new source: ${file}`);
  for (const file of expectedFiles)
    if (hash(readFileSync(path.join(rootPath, file))) !== (deviation?.files[file] ?? polish?.files[file] ?? refinement?.files[file] ?? visualReview?.files[file] ?? localeReview?.files[file] ?? review?.files[file] ?? hash(expectedMergedSource(file))))
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
