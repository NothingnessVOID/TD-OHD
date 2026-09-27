/** Export source-preserving reference assets to an ignored local artifact. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as engine from 'natalengine';
import * as zhCN from '../src/locales/zh-CN/content.js';
import * as zhHant from '../src/locales/zh-Hant/content.js';

const output = new URL('../artifacts/data-audit/', import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const sources = [
  'package-lock.json', 'scripts/patch-natalengine-seconds.mjs', 'src/lib/content.js', 'src/lib/quarter.js',
  'node_modules/natalengine/src/calculators/humandesign.js',
  ...['gate-descriptions', 'gate-lines', 'channel-descriptions', 'hexagram-descriptions', 'gene-key-descriptions']
    .map(name => `node_modules/natalengine/src/data/${name}.js`),
  ...['zh-CN', 'zh-Hant'].flatMap(locale => ['gates', 'lines', 'channels', 'hexagrams', 'gene-keys']
    .map(name => `src/locales/${locale}/${name}.json`))
];
const hashes = Object.fromEntries(await Promise.all(sources.map(async source => [source, sha(await readFile(new URL(`../${source}`, import.meta.url)))])));
const version = JSON.parse(await readFile(new URL('../node_modules/natalengine/package.json', import.meta.url), 'utf8')).version;
const localeData = { en: engine, 'zh-CN': zhCN, 'zh-Hant': zhHant };
const assets = [];
for (const [locale, data] of Object.entries(localeData)) {
  const file = (enName, localName) => locale === 'en'
    ? `node_modules/natalengine/src/data/${enName}.js`
    : `src/locales/${locale}/${localName}.json`;
  const add = (kind, id, sourcePath, rawFields) => assets.push({
    stableId: `${kind}/${id}`, kind, locale, engineVersion: version, sourcePath,
    sourceHash: hashes[sourcePath], rawFields, reviewStatus: 'unreviewed'
  });
  for (let gate = 1; gate <= 64; gate++) {
    add('gate', gate, file('gate-descriptions', 'gates'), data.GATE_DESCRIPTIONS[gate] || null);
    add('hexagram', gate, file('hexagram-descriptions', 'hexagrams'), data.HEXAGRAM_DESCRIPTIONS[gate] || null);
    add('gene-key', gate, file('gene-key-descriptions', 'gene-keys'), data.GENE_KEY_DESCRIPTIONS[gate] || null);
    for (let line = 1; line <= 6; line++) add('line', `${gate}.${line}`, file('gate-lines', 'lines'), data.LINE_DESCRIPTIONS[gate]?.[line] || null);
  }
  for (const channel of engine.CHANNELS) {
    const id = channel.gates.join('-');
    add('channel', id, file('channel-descriptions', 'channels'), data.CHANNEL_DESCRIPTIONS[id] || null);
  }
}
for (const [id, center] of Object.entries(engine.CENTERS)) {
  const sourcePath = 'node_modules/natalengine/src/calculators/humandesign.js';
  assets.push({ stableId: `center/${id}`, kind: 'center', locale: 'en', engineVersion: version,
    sourcePath, sourceHash: hashes[sourcePath], rawFields: center, reviewStatus: 'unreviewed' });
}
const missing = assets.filter(asset => !asset.rawFields).map(asset => `${asset.locale}/${asset.stableId}`);
const counts = Object.fromEntries(Object.keys(localeData).map(locale => [locale,
  Object.fromEntries(['gate', 'line', 'channel', 'hexagram', 'gene-key'].map(kind => [kind, assets.filter(asset => asset.locale === locale && asset.kind === kind && asset.rawFields).length]))]));
const inventory = { engineVersion: version, sourceHashes: hashes, counts,
  centers: Object.keys(engine.CENTERS).length, channels: engine.CHANNELS.length, gates: Object.keys(engine.GATES).length,
  missing, rawExportPath: 'artifacts/data-audit/raw-reference.json', reviewStatus: 'unreviewed' };
await mkdir(output, { recursive: true });
await mkdir(new URL('../docs/data-audit/', import.meta.url), { recursive: true });
await writeFile(new URL('raw-reference.json', output), `${JSON.stringify(assets, null, 2)}\n`);
await writeFile(new URL('../docs/data-audit/inventory.json', import.meta.url), `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Exported ${assets.length} raw assets; ${missing.length} missing fields; engine ${version}.`);
