import {isReviewedPhase1BHistorySource} from './helpers/penta-phase1b-history-scope.js';
import {contrastProjection} from './helpers/contrast-projection.js';
import {preservedSource, phase1ProtectedCurrent, releaseCandidate} from './helpers/knowledge-release-contract.js';
import {skinProjection,skinScope} from './helpers/skin-projection.js';
import {assertContentBoundary, targetIds, round2GContent} from './helpers/knowledge-round2f-contract.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseAst } from 'rollup/parseAst';
import { knowledgeContent } from '../src/lib/knowledge/content/index.js';
import { setLocale } from '../src/lib/i18n.js';
import { listKnowledgeEntries } from '../src/lib/knowledge/registry.js';
import { renderKnowledgeDetail } from '../src/lib/knowledge/detail-renderer.js';
import { chartKnowledgeQuery } from '../src/lib/knowledge/access.js';
const base='66185da8071a64b679ce51857c7029556957f038';
const bytes=p=>readFileSync(new URL('../'+p,import.meta.url));
const original=p=>preservedSource(p,base);
const approvedSkin=p=>skinProjection(p,base);
const q=(objectType,objectId)=>({objectType,objectId});

test('Round 2B runtime and independent vocabulary remain unchanged',()=>{
 for(const path of ['src/locales/zh-Hant/vocabulary.js','src/lib/knowledge/content/index.js','src/bodygraph.js','src/features/transit-timeline/core.js','src/features/transit-timeline/view.js','src/features/transit-timeline/timeline.css','src/main.js','src/lib/i18n.js','src/views/connection.js','src/views/team.js','engine-core/TransitCore.cs','src/lib/chart-engine/sharp-contract.js','src/lib/variable-arrows.js'])if(!isReviewedPhase1BHistorySource(path))assert.deepEqual(['src/bodygraph.js','src/views/connection.js'].includes(path)?phase1ProtectedCurrent(path):contrastProjection(bytes(path),path),skinScope.files[path]?approvedSkin(path):preservedSource(path,base),path);
});
test('protected BodyGraph detail functions are byte-identical to the latest baseline',()=>{
 const extract=s=>new Map(parseAst(s).body.map(n=>n.type==='ExportNamedDeclaration'?n.declaration:n).filter(n=>n?.type==='FunctionDeclaration').map(n=>[n.id.name,s.slice(n.start,n.end)]));
 assert.deepEqual(bytes('src/lib/bodygraph-detail-layout.js'),approvedSkin('src/lib/bodygraph-detail-layout.js'));
 const before=extract(original('src/views/chart.js').toString()),after=extract(bytes('src/views/chart.js').toString());
 for(const name of ['showGateDetail','showTransitChannelDetail','showCenterDetail','showPlanetDetail',]){assert.ok(before.has(name),name);assert.equal(after.get(name),before.get(name),name);}
});
test('legacy zh-CN hashes stay exact outside explicitly approved Round 2C/2F editorial ranges',()=>{
 const hashes=JSON.parse(bytes('tests/fixtures/knowledge-round2b-content.json'));
 assert.equal(Object.keys(hashes).length,55);assertContentBoundary();
 for(const [key,record]of Object.entries(round2GContent['zh-CN']).filter(([key])=>key!=='variable.determination:taste'&&!key.startsWith('variable.environment:')&&!targetIds.has(key)))assert.equal(createHash('sha256').update(record.summary+'\n'+record.detail).digest('hex'),hashes[key],key);
 setLocale('zh-CN',{persist:false});const entries=listKnowledgeEntries();assert.equal(entries.filter(e=>e.hasDetail).length,64);assert.equal(entries.filter(e=>e.objectType==='cognition'&&!e.hasDetail).length,6);assert.equal(entries.filter(e=>e.objectType==='variable'&&!e.properties.publicOverview).length,24);
 assert.match(knowledgeContent['zh-CN']['authority.sacral'].detail,/嗯哼／呃呃/);assert.match(knowledgeContent['zh-CN']['definition.quadrupleSplit'].detail,/8 个或 9 个/);
});
test('Type has semantic Strategy and Aura sections; Strategy shares its Type identity',()=>{
 setLocale('zh-CN',{persist:false});
 for(const id of ['generator','manifestingGenerator','manifestor','projector','reflector']){
  const chart={calculation:{type:{id}}};assert.deepEqual(chartKnowledgeQuery(chart,'strategy'),chartKnowledgeQuery(chart,'type'));
  const html=renderKnowledgeDetail(q('type',id));assert.match(html,/<h3>策略<\/h3>/);assert.match(html,/<h3>气场<\/h3>/);assert.match(html,/正向反馈/);assert.match(html,/非我主题/);assert.doesNotMatch(html,/knowledge-facts|taxonomy|family|data-version|签名|标志/);
 }
});
test('24 semantic Variable bodies mark only the numeric Tone branch and never mark Library',()=>{
 setLocale('zh-CN',{persist:false});
 for(const entry of listKnowledgeEntries().filter(e=>e.objectType==='variable'&&!e.properties.publicOverview)){
  const bare=renderKnowledgeDetail(entry);assert.doesNotMatch(bare,/knowledge-yours/);
  for(const tone of [1,2,3,4,5,6]){
   const html=renderKnowledgeDetail(entry,{variableContext:{color:entry.properties.color,tone,base:2}});
   const matches=html.match(/knowledge-yours/g)||[];assert.equal(matches.length,1);
   assert.match(html,new RegExp(`data-section="${tone<=3?'tone1to3':'tone4to6'}"><h3>[^<]+<span class="knowledge-yours">你的`));
   for(const section of entry.detail.presentation.sections)assert.ok(html.replace(/<[^>]*>/g,'').replaceAll('&quot;','\"').replaceAll('&#39;',"'").includes(entry.detail.template.slice(section.start,section.end).split('\n\n')[0].replaceAll('**','')));
   assert.doesNotMatch(html,/warning|error|sourceId|reviewStatus|verified|资料来源/);
  }
 }
});
test('EN and Hant use their own semantic presentation without zh-CN fallback',()=>{
 for(const locale of ['en','zh-Hant']){setLocale(locale,{persist:false});for(const entry of listKnowledgeEntries().filter(e=>e.objectType==='variable'&&!e.properties.publicOverview||e.objectType==='type')){assert.ok(entry.detail.presentation);const html=renderKnowledgeDetail(entry,{variableContext:{tone:2,color:1,base:1}});assert.doesNotMatch(html,/气场/);if(entry.objectType==='variable'&&!entry.properties.publicOverview)assert.match(html,/knowledge-yours/);}}
});
