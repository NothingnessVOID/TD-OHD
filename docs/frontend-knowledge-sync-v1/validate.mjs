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

// The additive review is anchored both to a committed snapshot and to literal
// digests here. A modified scope document alone cannot expand the allowlist.
const pentaReviewed = Object.freeze({
  'src/lib/human-design/penta-catalog.js': '91a6df5319e9bb790a20b517220f4831d9ed9b04267184e4e85bb5ae8f4774fc',
  'src/lib/human-design/team-activation.js': '84d48728136abd62b7ca4fb07dad6eca0c24de70ce01c43eafad3f9ffc0dc34c',
  'src/lib/human-design/penta-structure.js': 'f6f3d722f8c11454bd2864ccf6eb1d56b3e687031e17d75762c73a3987ed15ad'
});
const pentaPhase1BReviewed = Object.freeze({
  'src/views/team.js': '36a9366c324cd3b385c2103d34f923a605d7286a12b9719777a70c58674636f5',
  'src/lib/human-design/team-members.js': '905278020bb8c6ac5fe06ce82a74be00974e912f961f4410e7741a81db5ab1d5',
  'src/lib/team-repository.js': '1c25146ad151aa0028436683e082fc80b61b2b12f9c6e98df22df6b67b5a45eb',
  'src/styles/team-members.css': '975a636b93e0a402dfff8285bfb43eef5177c1eb7e6b9d10d74bdd8fb01829e8',
  'src/locales/zh-CN/ui-views.json': 'ee4224b560b80e1263ee08eb2f9e8b7c320847dcbe67baca63fe94f74816b1c0',
  'src/locales/zh-Hant/ui-views.json': '5414dff5488945a9d5bdd03b8172f5298e0efc4afc83665b56d5f7d623b9a7ef'
});
export function validatePentaPhase1BSourceScope(rootPath, currentFiles, revision = null) {
  const scope = JSON.parse(readFileSync(path.join(rootPath, 'docs/team/PHASE1B-SOURCE-SCOPE.json')));
  const paths = Object.keys(pentaPhase1BReviewed);
  if (scope.schemaVersion !== 1 || !/^[0-9a-f]{40}$/.test(scope.baseline)
      || Object.keys(scope.files).sort().join('\n') !== paths.slice().sort().join('\n')
      || paths.some(file => scope.files[file] !== pentaPhase1BReviewed[file]
        || hash(readFileSync(path.join(rootPath, file))) !== (revision?.[file] ?? pentaPhase1BReviewed[file])))
    throw new Error('Invalid Penta Phase 1B source scope');
  const allowed = new Set(paths);
  for (const file of currentFiles)
    if (protectedPath(file) && !allowed.has(file) && !pentaReviewed[file]) throw new Error(`Unreviewed new source: ${file}`);
  return paths;
}

const pentaPhase1BRevisionReviewed = Object.freeze({
  'src/views/team.js': '9936ec4e15f3480d9af4427037a7b97bd716a8ec30ca5f9d5fdef8f8c8ade0f9',
  'src/lib/human-design/team-members.js': '905278020bb8c6ac5fe06ce82a74be00974e912f961f4410e7741a81db5ab1d5',
  'src/lib/team-repository.js': 'f709480c5584172da5e9e7e7ca0796fe7f6926143a0e8266d0538fd99b3b618b',
  'src/styles/team-members.css': '975a636b93e0a402dfff8285bfb43eef5177c1eb7e6b9d10d74bdd8fb01829e8',
  'src/locales/zh-CN/ui-views.json': '72443bb169058968cbc8f7e8f98938d1045e9644630e77a0d217a98f89e40cbb',
  'src/locales/zh-Hant/ui-views.json': '793c2976e1256cb6153230d3c2fe82f687b8a1c75f12c233756c5ec6269d1217'
});
export function validatePentaPhase1BRevisionScope(rootPath, changedFiles) {
  const scope = JSON.parse(readFileSync(path.join(rootPath, 'docs/team/PHASE1B-REVISION-SCOPE.json')));
  const paths = Object.keys(pentaPhase1BRevisionReviewed);
  if (scope.schemaVersion !== 1 || scope.baseline !== 'bed1f568c29c1b9c5ac366f5912b50f74e0fb1c4'
      || scope.status !== 'frozen' || Object.keys(scope.files ?? {}).sort().join('\n') !== paths.slice().sort().join('\n')
      || scope.allowedPaths?.slice().sort().join('\n') !== paths.slice().sort().join('\n')
      || paths.some(file => scope.files[file] !== pentaPhase1BRevisionReviewed[file]
        || hash(readFileSync(path.join(rootPath, file))) !== pentaPhase1BRevisionReviewed[file]))
    throw new Error('Invalid Penta Phase 1B revision scope');
  const allowed = new Set(paths);
  for (const file of changedFiles)
    if (protectedPath(file) && !allowed.has(file)) throw new Error(`Unlicensed Phase 1B revision source: ${file}`);
  return paths;
}

export function validatePentaPhase1AScope(rootPath, currentFiles) {
  const scope = JSON.parse(readFileSync(path.join(rootPath, 'docs/team/PHASE1A-SOURCE-SCOPE.json')));
  const paths = Object.keys(pentaReviewed);
  if (scope.baseline !== 'd2abe43c39a6ae3f04c74a6747cb1174d0388052'
      || Object.keys(scope.files).sort().join('\n') !== paths.slice().sort().join('\n')
      || paths.some(file => scope.files[file] !== pentaReviewed[file]
        || hash(readFileSync(path.join(rootPath, file))) !== pentaReviewed[file]
        || !git('show', `${scope.baseline}:${file}`).equals(readFileSync(path.join(rootPath, file)))))
    throw new Error('Invalid Penta Phase 1A source scope');
  const allowed = new Set(paths);
  for (const file of currentFiles) {
    if (protectedPath(file) && !allowed.has(file) && !pentaPhase1BReviewed[file]) throw new Error(`Unreviewed new source: ${file}`);
  }
  return paths;
}

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
  const copyPath = path.join(rootPath, 'docs/knowledge-layer/round2g-scope.json');
  const copy = existsSync(copyPath) ? JSON.parse(readFileSync(copyPath)) : null;
  const copyAllowed = new Set([...deviationAllowed,'src/locales/zh-CN/vocabulary.js','src/locales/zh-Hant/vocabulary.js']);
  if (copy && (copy.baseline !== 'e731e69b91ea1ce083a4a8b023d2dd660c08735e' || Object.keys(copy.files).length !== 10 || Object.keys(copy.files).some(file => !copyAllowed.has(file)))) throw new Error('Invalid Round 2G exact copy scope');
  const restorationPath = path.join(rootPath, 'docs/knowledge-layer/variable-29-scope.json');
  const restoration = existsSync(restorationPath) ? JSON.parse(readFileSync(restorationPath)) : null;
  const restorationAllowed = new Set(['src/lib/knowledge/content/human-design-en.js','src/lib/knowledge/content/human-design-zh-CN.js','src/lib/knowledge/content/human-design-zh-Hant.js','src/lib/knowledge/detail-access.css','src/lib/knowledge/detail-controller.js','src/lib/knowledge/detail-renderer.js','src/lib/knowledge/human-design-foundation.js','src/lib/knowledge/sources.js','src/locales/ui-contexts.json']);
  if (restoration && (restoration.baseline !== 'efe59fdc863f409a66eb0c0eaaea73f09f324119' || Object.keys(restoration.files).length !== 9 || Object.keys(restoration.files).some(file => !restorationAllowed.has(file)))) throw new Error('Invalid Variable 29 final content scope');
  // Later content/UI rounds were explicitly approved after the historical sync scopes.
  // Pin their immutable RC blobs; astronomy, topology and annual data keep the old guards.
  const finalScope = JSON.parse(readFileSync(path.join(rootPath, 'docs/knowledge-layer/release-candidate-scope.json')));
  if (finalScope.releaseCandidate !== '7b133bdcbe600bb6f0e0fa8925da890ea39c9978'
      || finalScope.baseline !== 'efe59fdc863f409a66eb0c0eaaea73f09f324119') throw new Error('Invalid release candidate baseline');
  const authorized = git('diff', '--name-only', finalScope.baseline, finalScope.releaseCandidate, '--', 'src', 'index.html').toString().trim().split('\n');
  if (Object.keys(finalScope.files).sort().join('\n') !== authorized.sort().join('\n')) throw new Error('Invalid final presentation scope');
  for (const [file, digest] of Object.entries(finalScope.files))
    if (hash(git('show', `${finalScope.releaseCandidate}:${file}`)) !== digest) throw new Error(`RC scope hash differs: ${file}`);
  const fixFile = 'src/lib/reference-supplements.js';
  const fixedImport = Buffer.from(git('show', `${finalScope.releaseCandidate}:${fixFile}`).toString()
    .replace("from './reference-supplements.json';", "from './reference-supplements.json' with { type: 'json' };"));
  if (Object.keys(finalScope.releaseFixes).sort().join() !== '.env.production,.env.static,src/lib/reference-supplements.js' || hash(fixedImport) !== finalScope.releaseFixes[fixFile]) throw new Error('Unreviewed release fix');
  const productionEnv = Buffer.from(git('show', `${finalScope.releaseCandidate}:.env.production`).toString() + 'VITE_OHD_LOCAL=false\n');
  const staticEnv = Buffer.from('# Static hosted sites do not include the password-protected local installation.\nVITE_OHD_LOCAL=false\nVITE_OHD_API_BASE=\nVITE_OHD_SYNC_ENABLED=false\n');
  for (const [file, bytes] of [['.env.production', productionEnv], ['.env.static', staticEnv]])
    if (hash(bytes) !== finalScope.releaseFixes[file] || hash(readFileSync(path.join(rootPath, file))) !== hash(bytes)) throw new Error(`Static feature switch differs: ${file}`);
  const connectionScope = JSON.parse(readFileSync(path.join(rootPath, 'docs/connection-structure-phase1-scope.json')));
  const connectionPaths = ['src/bodygraph.js', 'src/views/connection.js', 'src/lib/human-design/connection.js', 'src/lib/human-design/connection-structure.js', 'src/locales/ui-contexts.json', 'src/locales/zh-CN/ui-views.json', 'src/locales/zh-Hant/ui-views.json'];
  if (Object.keys(connectionScope.files).sort().join('\n') !== connectionPaths.sort().join('\n')) throw new Error('Invalid Relationship Phase 1 source scope');
  // Reviewed skin snapshot protects its non-composite source projection at c15e021.
  const skinScope = JSON.parse(readFileSync(path.join(rootPath, 'tests/fixtures/skin-reviewed-scope.json')));
  if (skinScope.schemaVersion !== 1 || skinScope.base !== 'a5485015f23ef31ca8227df2a2eaf2290a08e266'
      || skinScope.reviewedHead !== 'c15e021ea1b57ec46be5209d3dc75a4631f47b13') throw new Error('Invalid reviewed skin scope baseline');
  const skinPaths = git('diff', '--name-only', `${skinScope.base}...${skinScope.reviewedHead}`, '--', 'src').toString().trim().split('\n').filter(Boolean).sort();
  if (skinScope.srcFiles.slice().sort().join('\n') !== skinPaths.join('\n')) throw new Error('Invalid reviewed skin src scope');
  for (const [file, digest] of Object.entries(skinScope.files))
    if (!connectionPaths.includes(file) && hash(git('show', `${skinScope.reviewedHead}:${file}`)) !== digest) throw new Error(`Reviewed skin hash differs: ${file}`);
  for (const file of ['src/lib/chart-engine/sharp-contract.js','src/lib/human-design/variable-data.js','src/lib/human-design/connection.js','src/features/transit-timeline/core.js','src/lib/bodygraph-integration.js','src/lib/human-design/bodygraph-geometry.js','src/lib/variable-arrows.js','engine-core/TransitCore.cs'])
    if (!git('show', `${skinScope.reviewedHead}:${file}`).equals(git('show', `${skinScope.base}:${file}`))) throw new Error(`Protected algorithm/catalog/astronomy changed: ${file}`);
  const contrastScope = JSON.parse(readFileSync(path.join(rootPath, 'docs/source-contrast-scope.json')));
  const contrastPaths = ['src/bodygraph.js','src/lib/appearance.js','src/styles.css','src/styles/variable-arrows.css','src/features/transit-timeline/timeline.css','src/lib/source-contrast.js'];
  if (contrastScope.base !== 'a13eab9c1f9e82f9c3b2fcbc6b9692018f7037ef' || Object.keys(contrastScope.files).sort().join('\n') !== contrastPaths.sort().join('\n')) throw new Error('Invalid source contrast scope');
  const inkScope = JSON.parse(readFileSync(path.join(rootPath, 'docs/gate-ink-v2-scope.json')));
  if (inkScope.base !== '1883dbfa0c5e35567897c8b2786286ff20259ee8' || Object.keys(inkScope.files).length !== 12) throw new Error('Invalid gate ink scope');
  // Phase 1A is a narrow additive review. Pin paths and digests independently of
  // the review manifest so editing that manifest cannot authorize another source.
  const expectedFiles = [...new Set([...tree(MAIN), ...tree(KNOWLEDGE), ...Object.keys(finalScope.files), ...connectionPaths, ...skinScope.srcFiles, ...contrastPaths, 'index.html', 'package.json'])].filter(protectedPath);
  const currentFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: rootPath }).toString().trim().split('\n');
  const phase1BRevisionChanges = execFileSync('git', ['diff', '--name-only', 'bed1f568c29c1b9c5ac366f5912b50f74e0fb1c4', '--'], { cwd: rootPath }).toString().trim().split('\n').filter(Boolean);
  validatePentaPhase1BRevisionScope(rootPath, phase1BRevisionChanges);
  // Only the three pinned Phase 1A paths extend the historical allowlist.
  const additionalFiles = currentFiles.filter(file => !expectedFiles.includes(file));
  const pentaPaths = validatePentaPhase1AScope(rootPath, additionalFiles);
  expectedFiles.push(...pentaPaths);
  const pentaPhase1BPaths = validatePentaPhase1BSourceScope(rootPath, additionalFiles, pentaPhase1BRevisionReviewed);
  expectedFiles.push(...pentaPhase1BPaths);
  for (const file of currentFiles.filter(protectedPath))
    if (!expectedFiles.includes(file)) throw new Error(`Unreviewed new source: ${file}`);
  // The approved terminology correction changes only zh-CN 荐骨 to 骶骨.
  const terminologyFiles = new Set(['src/lib/knowledge/content/human-design-zh-CN.js','src/lib/reference-supplements.json']);
  const terminologyHash = file => terminologyFiles.has(file)
    ? hash(Buffer.from(git('show', `${finalScope.releaseCandidate}:${file}`).toString().replaceAll('荐骨', '骶骨'))) : undefined;
  for (const file of expectedFiles)
    if (hash(readFileSync(path.join(rootPath, file))) !== (pentaReviewed[file] ?? pentaPhase1BRevisionReviewed[file] ?? pentaPhase1BReviewed[file] ?? inkScope.files[file] ?? contrastScope.files[file] ?? connectionScope.files[file] ?? terminologyHash(file) ?? finalScope.releaseFixes[file] ?? skinScope.files[file] ?? finalScope.files[file] ?? restoration?.files[file] ?? copy?.files[file] ?? deviation?.files[file] ?? polish?.files[file] ?? refinement?.files[file] ?? visualReview?.files[file] ?? localeReview?.files[file] ?? review?.files[file] ?? hash(expectedMergedSource(file))))
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
