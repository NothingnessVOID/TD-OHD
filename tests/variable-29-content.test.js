import {isReviewedPhase1BHistorySource} from './helpers/penta-phase1b-history-scope.js';
import {preservedSource,phase1ProtectedCurrent,approvedContent} from './helpers/knowledge-release-contract.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {knowledgeContent} from '../src/lib/knowledge/content/index.js';
import {listKnowledgeEntries,getKnowledgeEntry,getKnowledgeSummary,createKnowledgeReader} from '../src/lib/knowledge/registry.js';
import {foundationRecords} from '../src/lib/knowledge/human-design-foundation.js';
import {setLocale} from '../src/lib/i18n.js';
import {renderKnowledgeDetail} from '../src/lib/knowledge/detail-renderer.js';
import {referenceEntry} from '../src/lib/reference-catalog.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/variable-29-content.json',import.meta.url)));
const source=readFileSync(new URL('./fixtures/variable-29-source-zh-CN.md',import.meta.url),'utf8');
const cleanup=JSON.parse(readFileSync(new URL('./fixtures/variable-public-copy-cleanup.json',import.meta.url)));
// The original attachment stays immutable; only the approved public voice edits differ.
const publicSource=cleanup.replacements['zh-CN'].reduce((text,[before,after])=>text.replaceAll(before,after),source);
const q=key=>({objectType:'variable',objectId:key.replace('variable.','')});
const plain=text=>text.replace(/<[^>]*>/g,'').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('**','').replace(/^- /gm,'').replace(/\s+/g,'');
const order={determination:['core','tone1to3','tone4to6','lifeAdvice'],environment:['core','tone1to3','tone4to6','physicalEnvironment','lifeAdvice','businessScenario'],perspective:['core','tone1to3','tone4to6','distraction'],motivation:['core','tone1to3','tone4to6','correctState','transference']};
test('87 complete locale records equal the approved final sections; source package hash remains immutable',()=>{
 assert.equal(createHash('sha256').update(source).digest('hex'),fixture.sourceSha256);
 assert.equal((source.match(/^## \d+\./gm)||[]).length,29);
 for(const [locale,records] of Object.entries(fixture.records)){
  assert.equal(Object.keys(records).length,29);
  for(const [key,expected] of Object.entries(records))assert.deepEqual(knowledgeContent[locale][key],expected,locale+'/'+key);
 }
 for(const [key,r] of Object.entries(fixture.records['zh-CN']))for(const s of r.presentation.sections){
  if(key==='variable.determination:taste'&&s.id.startsWith('tone'))continue;
  const body=r.detail.slice(s.start,s.end);assert.ok(publicSource.includes(body),`source text lost or rewritten: ${body.slice(0,45)}`);
 }
});
test('29 identities open through the same registry and reference routes; five common articles are reused, not copied',()=>{
 for(const locale of Object.keys(fixture.records)){
  setLocale(locale,{persist:false});const entries=listKnowledgeEntries().filter(e=>e.objectType==='variable');
  assert.equal(entries.length,29);assert.equal(entries.filter(e=>e.properties.publicOverview).length,5);
  for(const e of entries){assert.ok(e.hasDetail);assert.ok(referenceEntry('knowledge',e.id));assert.equal(e.detail.sourceId,'variable-final-content');assert.match(renderKnowledgeDetail(e),/knowledge-variable-links/);}
  const publicBody=knowledgeContent[locale]['variable.introduction'].detail;
  for(const e of entries.filter(e=>!e.properties.publicOverview))assert.ok(!e.detail.template.includes(publicBody));
 }
});
test('all Color section orders, full bodies, lists and emphasis render without truncation; deviations end the reading',()=>{
 for(const locale of Object.keys(fixture.records)){setLocale(locale,{persist:false});for(const e of listKnowledgeEntries().filter(e=>e.objectType==='variable'&&!e.properties.publicOverview)){
  const sections=e.detail.presentation.sections;assert.deepEqual(sections.map(s=>s.id),order[e.properties.kind]);
  const html=renderKnowledgeDetail(e),reading=html.split('<nav class="knowledge-variable-links">')[0];let previous=-1;
  for(const s of sections){const at=reading.indexOf(`data-section="${s.id}"`);assert.ok(at>previous,e.id+'/'+s.id);previous=at;
   assert.ok(plain(reading).includes(plain(e.detail.template.slice(s.start,s.end))),e.id+'/'+s.id+' missing text');
  }
  assert.doesNotMatch(html,/\*\*|source conflict|sourceId|reviewStatus|教材原稿此处写/);
  if(e.properties.kind==='perspective')assert.ok(!sections.some(s=>s.id==='correctState'));
  if(e.properties.kind==='motivation')assert.ok(sections.some(s=>s.id==='correctState'));
  if(['motivation','perspective'].includes(e.properties.kind)){const block=html.slice(html.indexOf('knowledge-deviation"'));assert.match(block,/knowledge-deviation-transition/);assert.match(block,/knowledge-deviation-mechanism knowledge-secondary/);assert.ok(block.indexOf('knowledge-deviation-flow')<block.indexOf('knowledge-deviation-mechanism'));}
 }}
});
test('Taste retains exact validated Open/Closed branches; six Environment subtype pairs remain',()=>{
 const pairs={caves:['Selective','Blending'],markets:['Internal','External'],kitchens:['Wet','Dry'],mountains:['Active','Passive'],valleys:['Narrow','Wide'],shores:['Natural','Artificial']};
 for(const locale of Object.keys(fixture.records)){const r=knowledgeContent[locale];
  const old=JSON.parse(execFileSync('git',['show',fixture.baseline+`:src/lib/knowledge/content/human-design-${locale}.js`]).toString().split('export default ')[1].trim().replace(/;$/,''));
  for(const id of ['tone1to3','tone4to6']){const before=old['variable.determination:taste'].presentation.sections.find(s=>s.id===id),after=r['variable.determination:taste'].presentation.sections.find(s=>s.id===id);assert.equal(after.title,before.title);}
  for(const [id,pair]of Object.entries(pairs))for(const [i,branch]of ['tone1to3','tone4to6'].entries())assert.ok(r['variable.environment:'+id].presentation.sections.find(s=>s.id===branch).title.includes(pair[i]));
 }
});
test('all 24 Color pages select exactly one numeric Tone branch; source subtitle Summary stays independent of arbitrarily long Detail',()=>{
 for(const locale of Object.keys(fixture.records)){setLocale(locale,{persist:false});for(const e of listKnowledgeEntries().filter(e=>e.objectType==='variable'&&!e.properties.publicOverview)){
  assert.equal((renderKnowledgeDetail(e).match(/knowledge-yours/g)||[]).length,0);
  for(let tone=1;tone<=6;tone++)assert.equal((renderKnowledgeDetail(e,{variableContext:{tone,color:e.properties.color,base:1}}).match(/knowledge-yours/g)||[]).length,1);
  assert.equal(getKnowledgeSummary(e).content,fixture.records[locale]['variable.'+e.objectId].summary);
 }}
 const record={...foundationRecords.find(e=>e.objectId==='motivation:fear')};let reads=0;
 record.detail={...record.detail,read:()=>{reads++;return 'long detail '.repeat(100000);}};
 const reader=createKnowledgeReader([record]);const summary=reader.getKnowledgeSummary(record).content;assert.equal(reads,0);
 assert.ok(reader.getKnowledgeDetail(record).content.length>100000);assert.equal(reader.getKnowledgeSummary(record).content,summary);assert.equal(reads,1);
});
test('all non-Variable knowledge, calculation, snapshots, sources, positions, exports and BodyGraph remain exact',()=>{
 for(const [locale,records] of Object.entries(knowledgeContent)){
  const old=approvedContent[locale];
  for(const [key,r]of Object.entries(records).filter(([key])=>!key.startsWith('variable.')))assert.deepEqual(r,old[key]);
 }
 for(const path of ['src/lib/variable-arrows.js','src/lib/chart-engine/sharp-contract.js','src/lib/human-design/variable-data.js','src/views/chart.js','src/bodygraph.js','src/lib/chart-data-export.js','src/features/transit-timeline/core.js','src/features/transit-timeline/view.js','engine-core/TransitCore.cs','src/views/connection.js','src/views/team.js','tests/fixtures/sharp-definition-components.json'])if(!isReviewedPhase1BHistorySource(path))assert.deepEqual(['src/bodygraph.js','src/views/connection.js'].includes(path)?phase1ProtectedCurrent(path):readFileSync(new URL('../'+path,import.meta.url)),preservedSource(path,fixture.baseline),path);
});
