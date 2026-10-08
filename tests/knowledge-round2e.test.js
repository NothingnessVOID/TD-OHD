import {preservedSource, releaseCandidate} from './helpers/knowledge-release-contract.js';
import {skinProjection} from './helpers/skin-projection.js';
import {assertContentBoundary} from './helpers/knowledge-round2f-contract.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parseAst} from 'rollup/parseAst';
import {renderKnowledgeDetail} from '../src/lib/knowledge/detail-renderer.js';
import {getKnowledgeEntry,listKnowledgeEntries} from '../src/lib/knowledge/registry.js';
import {CENTER_SHAPES} from '../src/lib/human-design/bodygraph-geometry.js';
import {setLocale} from '../src/lib/i18n.js';
import {adaptSharpChart} from '../src/lib/chart-engine/sharp-contract.js';
const q=(objectType,objectId)=>({objectType,objectId});
const locales=fn=>{for(const l of ['en','zh-CN','zh-Hant']){setLocale(l,{persist:false});fn(l);}};
const plain=s=>s.replace(/<[^>]*>/g,'').replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"').replace(/\s+/g,'');
const maps={head:'Head',ajna:'Ajna',throat:'Throat',g:'G',heart:'Ego',spleen:'Spleen',solar:'SolarPlexus',sacral:'Sacral',root:'Root'};
test('Round 2E historical content guard permits only the approved Round 2F deviation ranges',()=>{
  assertContentBoundary();
});
test('all 12 Profiles in three locales have two line identities and complete original ordered text',()=>locales(()=>{
 for(const e of listKnowledgeEntries().filter(e=>e.objectType==='profile'&&e.objectId!=='introduction')){
  const h=renderKnowledgeDetail(e);assert.equal((h.match(/class="knowledge-line-identity"/g)||[]).length,2);assert.equal((h.match(/knowledge-line-section/g)||[]).length,2);assert.match(h,/knowledge-geometry/);
  const text=e.detail.template,p=e.detail.presentation;
  const ranges=[];const walk=b=>{if(b.blocks)b.blocks.forEach(walk);else if(b.kind==='timeline')b.stages.forEach(s=>ranges.push(s.label,s.body));else if(b.kind==='process'){ranges.push(b.lead,...b.steps,...b.separators);}else ranges.push(b);};p.blocks.forEach(walk);
  for(const r of ranges)assert.ok(plain(h).includes(plain(text.slice(r.start,r.end))),e.id);
  // Every non-whitespace source character belongs to a display range exactly once.
  const coverage=Array(text.length).fill(0);for(const r of ranges)for(let i=r.start;i<r.end;i++)coverage[i]++;
  for(let i=0;i<text.length;i++)if(!/\s/.test(text[i]))assert.equal(coverage[i],1,e.id+' offset '+i);
  const names=e.name.split(/\s*[/／]\s*/);assert.equal(names.length,2);for(const name of names)assert.ok(h.includes(name));
  assert.equal(h.includes('data-layout="process"'),e.objectId==='2/4');assert.equal(h.includes('data-layout="timeline"'),e.objectId==='3/6');
 }
}));
test('Definition contexts use canonical CENTER_SHAPES and exact provided memberships; Library has no diagram',()=>locales(()=>{
 const cases=JSON.parse(readFileSync(new URL('./fixtures/sharp-definition-components.json',import.meta.url))).samples.map(sample=>{const c=adaptSharpChart(sample.raw,{timezone:0});return [c.calculation.definition.id,c.definitionComponents];});
 for(const[id,components]of cases){
  const h=renderKnowledgeDetail(q('definition',id),{definitionComponents:components});assert.equal((h.match(/class="knowledge-island-card"/g)||[]).length,components.length);assert.equal((h.match(/data-highlighted="true"/g)||[]).length,components.flat().length);
  const svgs=[...h.matchAll(/<svg[^>]*aria-hidden="true">([^]*?)<\/svg>/g)];assert.equal(svgs.length,components.length||1);
  for(const[i,svg]of svgs.entries())for(const[key,shape]of Object.entries(maps)){const tag=svg[1].match(new RegExp(`<path data-center="${key}"[^>]*>`))[0];assert.ok(tag.includes(`d="${CENTER_SHAPES[shape].path}"`));assert.ok(tag.includes(`data-highlighted="${(components[i]??[]).includes(key)}"`));}
  assert.doesNotMatch(renderKnowledgeDetail(q('definition',id)),/<svg|knowledge-island-card/);
 }
}));
test('Cross Basics is independent and dynamic Cross carries identity, cards and jump only',()=>locales(l=>{
 const intro=getKnowledgeEntry(q('cross','introduction'));assert.equal(intro.name,{en:'Incarnation Cross','zh-CN':'Incarnation Cross（化身十字）','zh-Hant':'Incarnation Cross（化身十字）'}[l]);
 const query={...q('cross','RightAngleCrossOfExplanation2'),cross:{rawId:'RightAngleCrossOfExplanation2',gates:[23,43,49,4],angle:'right',name:'Right Angle Cross of Explanation 2'}};
 const e=getKnowledgeEntry(query),h=renderKnowledgeDetail(query);assert.equal(e.summary,null);assert.equal(e.detail,null);assert.match(h,/data-knowledge-jump="hd.cross.introduction"/);assert.doesNotMatch(h,/knowledge-summary-callout|data-section="composition"|knowledge-missing/);assert.equal((h.match(/data-activation=/g)||[]).length,4);
}));
test('Knowledge theme colors have no activation/type palette coupling',()=>{
 const css=readFileSync(new URL('../src/lib/knowledge/detail-access.css',import.meta.url),'utf8');assert.doesNotMatch(css,/--hd-|--knowledge-accent|#[a-f0-9]{3,8}\b|rgb\(/i);assert.match(css,/--knowledge-color: var\(--accent\)/);assert.match(css,/fill: var\(--accent-soft\); stroke: var\(--accent\)/);
});
test('protected calculation, geometry and BodyGraph functions stay byte-identical to Round 2D',()=>{
 const base='7d9f7df080dbbb997f7db6eeac6b04327fd5b2db';
 for(const p of ['src/lib/human-design/bodygraph-geometry.js','src/bodygraph.js','src/lib/chart-engine/sharp-contract.js','engine-core/TransitCore.cs','src/lib/variable-arrows.js','src/lib/detail-dialog.js','src/lib/bodygraph-detail-layout.js'])assert.deepEqual(readFileSync(new URL('../'+p,import.meta.url)),preservedSource(p,base),p);
 const extract=s=>new Map(parseAst(s).body.map(n=>n.type==='ExportNamedDeclaration'?n.declaration:n).filter(n=>n?.type==='FunctionDeclaration').map(n=>[n.id.name,s.slice(n.start,n.end)]));
 const old=extract(preservedSource('src/views/chart.js',base).toString()),now=extract(readFileSync(new URL('../src/views/chart.js',import.meta.url),'utf8'));
 // goBack's additive Knowledge return branch is guarded in knowledge-polish.test.js.
 for(const name of ['showGateDetail','showTransitChannelDetail','showCenterDetail','showPlanetDetail','detailNav'])assert.equal(now.get(name),old.get(name));
});
