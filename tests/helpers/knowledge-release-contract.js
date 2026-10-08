import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseAst} from 'rollup/parseAst';
import {approvedSkinSource,skinScope} from './skin-projection.js';
export const releaseCandidate = '7b133bdcbe600bb6f0e0fa8925da890ea39c9978';
export const latestMain = 'f6e8232664ecbabc12544d1e99a131fd5261c6e8';
export const approvedPresentationPaths = new Set(['src/features/transit-timeline/timeline.css', 'src/features/transit-timeline/view.js', 'src/lib/channel-badges.js', 'src/lib/human-design/english-readings.js', 'src/lib/knowledge/content/human-design-en.js', 'src/lib/knowledge/content/human-design-zh-CN.js', 'src/lib/knowledge/content/human-design-zh-Hant.js', 'src/lib/knowledge/detail-access.css', 'src/lib/knowledge/detail-controller.js', 'src/lib/knowledge/detail-renderer.js', 'src/lib/knowledge/human-design-foundation.js', 'src/lib/knowledge/sources.js', 'src/lib/local-account.js', 'src/lib/planet-reference.js', 'src/lib/reference-catalog.js', 'src/lib/reference-content.js', 'src/lib/reference-messages.js', 'src/lib/reference-supplements.js', 'src/lib/reference-supplements.json', 'src/lib/sync-popover-ui.js', 'src/lib/vocabulary.js', 'src/locales/en.js', 'src/locales/ui-contexts.json', 'src/locales/zh-CN/channels.json', 'src/locales/zh-CN/index.js', 'src/locales/zh-CN/ui-views.json', 'src/locales/zh-CN/vocabulary.js', 'src/locales/zh-Hant/channels.json', 'src/locales/zh-Hant/index.js', 'src/locales/zh-Hant/ui-views.json', 'src/locales/zh-Hant/vocabulary.js', 'src/main.js', 'src/styles.css', 'src/views/chart.js', 'src/views/connection.js', 'src/views/reference.js', 'src/views/transit-presentation.js']);
function baselineSource(file, historical) { return execFileSync('git', ['show', `${approvedPresentationPaths.has(file) ? releaseCandidate : historical}:${file}`]); }
function latestMainSource(file) { return execFileSync('git', ['show', `${latestMain}:${file}`]); }
function topLevelFunctions(source) {
 const text = Buffer.isBuffer(source) ? source.toString() : source;
 return new Map(parseAst(text).body.map(node => node.type === 'ExportNamedDeclaration' ? node.declaration : node).filter(node => node?.type === 'FunctionDeclaration' && node.id).map(node => [node.id.name, text.slice(node.start, node.end)]));
}
function replaceOnce(source, before, after, label) {
 const i = source.indexOf(before);
 if (i < 0 || source.indexOf(before, i + before.length) >= 0) throw new Error(`Phase 1 projection expected one exact ${label}`);
 return source.slice(0, i) + after + source.slice(i + before.length);
}
function removeOnce(source, snippet, label) { return replaceOnce(source, snippet, '', label); }
const bodygraphImport = "import { analyzeConnectionStructure } from './lib/human-design/connection-structure.js';\n";
const connectionImport = "import { analyzeConnectionStructure } from '../lib/human-design/connection-structure.js';\n";
const renderConnectionDigest = 'ed9292efb2f4fbec0fb8ed967ebe734b80ed90b1a3343a89371dda62ae7bf0e1';
function projectBodygraph(source) {
 let text = source.toString();
 text = removeOnce(text, bodygraphImport, 'BodyGraph import');
 text = replaceOnce(text, '  const compositeStructure = composite?.structure || (composite ? analyzeConnectionStructure(composite.chartA, composite.chartB) : null);\n', '', 'composite structure local');
 text = replaceOnce(text, '    const compCenters = new Set(compositeStructure.composite.centers);\n', '    const compCenters = new Set();\n    for (const ch of compChannels) for (const c of (ch.centers || [])) compCenters.add(c);\n', 'composite center derivation');
 text = replaceOnce(text, '    const aDef = new Set(compositeStructure.individuals.personA.centers);\n    const bDef = new Set(compositeStructure.individuals.personB.centers);', '    const aDef = new Set(composite.chartA.centers.definedNames);\n    const bDef = new Set(composite.chartB.centers.definedNames);', 'composite center ownership');
 text = replaceOnce(text, "      ...(composite ? {\n        'data-center-defined': String(defined),\n        'data-center-state': compositeStructure.centerStates.find(state => state.center === centerKey).status,\n        'data-center-created': String(compositeStructure.centerStates.find(state => state.center === centerKey)?.created || false),\n        'data-center-owner': centerOwner(centerKey) || 'none'\n      } : {}),\n", '', 'composite center data attributes');
 text = replaceOnce(text, "          : t(compositeStructure.centerStates.find(state => state.center === centerKey)?.status === 'open' ? 'Completely open' : 'Undefined');", "          : t('Open between you');", 'composite tooltip status');
 return Buffer.from(text);
}
function declarations(text) {
 const result = new Map();
 for (const node of parseAst(text).body) if (node.type === 'VariableDeclaration') {
  for (const declaration of node.declarations) if (declaration.id.type === 'Identifier') result.set(declaration.id.name, text.slice(node.start, node.end));
 }
 return result;
}
function projectConnection(source) {
 let text = removeOnce(source.toString(), connectionImport, 'connection UI import');
 const current = topLevelFunctions(text), baseText = latestMainSource('src/views/connection.js').toString(), base = topLevelFunctions(baseText);
 const currentBody = current.get('renderConnectionContent');
 if (!currentBody || !base.has('renderConnectionContent')) throw new Error('Phase 1 projection requires renderConnectionContent in both sources');
 if (createHash('sha256').update(currentBody).digest('hex') !== renderConnectionDigest) throw new Error('Unreviewed renderConnectionContent Phase 1 implementation');
 text = replaceOnce(text, `export ${currentBody}`, base.get('renderConnectionContent'), 'renderConnectionContent function');
 const currentDeclarations = declarations(text), baseDeclarations = declarations(baseText);
 for (const name of ['DYN_BLURB', 'CONN_TYPES']) {
   const currentDeclaration = currentDeclarations.get(name);
   if (!currentDeclaration || !baseDeclarations.has(name)) throw new Error(`Missing approved relationship declaration: ${name}`);
   text = replaceOnce(text, currentDeclaration, baseDeclarations.get(name), `${name} factual description`);
 }
 return Buffer.from(text);
}
export function phase1Projection(source, file) { return file === 'src/bodygraph.js' ? projectBodygraph(source) : file === 'src/views/connection.js' ? projectConnection(source) : Buffer.isBuffer(source) ? source : Buffer.from(source); }
export function preservedSource(file, historical) {
 const source = ['src/bodygraph.js', 'src/views/connection.js'].includes(file)
  ? latestMainSource(file)
  : Object.hasOwn(skinScope.files, file) ? approvedSkinSource(file, historical) : baselineSource(file, historical);
 return ['src/lib/knowledge/content/human-design-zh-CN.js', 'src/lib/reference-supplements.json'].includes(file) ? Buffer.from(source.toString().replaceAll('荐骨', '骶骨')) : source;
}
export const approvedContent = Object.fromEntries(['en','zh-CN','zh-Hant'].map(locale => [locale, JSON.parse(preservedSource(`src/lib/knowledge/content/human-design-${locale}.js`, releaseCandidate).toString().split('export default ')[1].trim().replace(/;$/, ''))]));
export function readCurrentSource(file) { return readFileSync(new URL(`../../${file}`, import.meta.url)); }
export function phase1ProtectedCurrent(file) { return phase1Projection(readCurrentSource(file), file); }
