/** Record a reviewed build without overwriting historical release evidence. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { validateKnowledgePresentationScope } from './lib/knowledge-presentation-scope.mjs';

const root = path.resolve(import.meta.dirname, '..');
validateKnowledgePresentationScope(root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(readFileSync(path.join(root,file)));
const dist = path.join(root,'dist');
const release = json('docs/release-licensing-v1/release-components.json');
const original = Object.assign({}, ...release.components.map(c => c.sha256));
const html = readFileSync(path.join(dist,'index.html'),'utf8');
const app = html.match(/<script[^>]*type="module"[^>]*src="\.\/(assets\/[^"<>]+)"/)[1];
const artifacts = {};
for (const [file, before] of Object.entries(original)) {
  let replacement = file;
  if (!existsSync(path.join(dist,file))) {
    if (file.startsWith('assets/index-')) replacement = app;
    else {
      const prefix = path.basename(file).replace(/\.[\w]+\.wasm$/,'.');
      const matches = readdirSync(path.join(dist,path.dirname(file))).filter(name => name.startsWith(prefix) && name.endsWith('.wasm'));
      if (matches.length !== 1) throw new Error('Ambiguous build artifact: '+file);
      replacement = `${path.dirname(file)}/${matches[0]}`;
    }
  }
  const after = hash(readFileSync(path.join(dist,replacement)));
  if (replacement === file && before === after) continue;
  if (!/^(assets\/index-[\w-]+\.js|engine\/_framework\/(SharpChartEngine|SharpTransitCore|SharpAstrology\.SwissEph)\.[\w]+\.wasm)$/.test(file)) throw new Error('Unexpected artifact drift: '+file);
  artifacts[file] = {path:replacement,before,after};
}
const record = {
  buildMode:process.argv.includes('--static')?'static':'default',
  sourceScopeHash:hash(readFileSync(path.join(root,'docs/knowledge-layer/review-round2-ui-scope.json'))),
  artifacts
};
writeFileSync(path.join(root,'docs/knowledge-layer/review-round2-ui-build.json'),JSON.stringify(record,null,2)+'\n');
console.log(`Recorded ${Object.keys(artifacts).length} renamed/rebuilt artifacts; historical manifests preserved.`);
