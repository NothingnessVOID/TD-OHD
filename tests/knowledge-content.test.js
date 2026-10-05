import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { geneKeyTerm, GENE_KEY_DESCRIPTIONS } from '../src/lib/content.js';
import { knowledgeContent } from '../src/lib/knowledge/content/index.js';
import { getKnowledgeEntry, getKnowledgeSummary, getKnowledgeDetail, listKnowledgeEntries } from '../src/lib/knowledge/registry.js';
import { knowledgeTerm, resolveKnowledgeText } from '../src/lib/knowledge/terms.js';
import { renderKnowledgeDetail } from '../src/lib/knowledge/detail-renderer.js';
import { getLocale, setLocale } from '../src/lib/i18n.js';
import { typeFacts, profileGeometry, definitionFacts } from '../src/lib/human-design/identities.js';
import * as vocabulary from '../src/lib/vocabulary.js';
const query=(objectType,objectId)=>({objectType,objectId});
const withLanguages=fn=>{const previous=getLocale();try{for(const locale of ['en','zh-CN','zh-Hant']){setLocale(locale,{persist:false});fn(locale);}}finally{setLocale(previous,{persist:false});}};

test('formal locale content has identical 55 keys, bounded summaries and separate bodies',()=>{
 const keys=Object.keys(knowledgeContent.en).sort();assert.equal(keys.length,55);
 for(const [locale,records]of Object.entries(knowledgeContent)) {
  assert.deepEqual(Object.keys(records).sort(),keys);
  for(const [key,record]of Object.entries(records)) {
   assert.ok(typeof record.summary === 'string' && typeof record.detail === 'string');
   assert.ok(record.summary.length< (locale==='en'?130:65),`${locale}/${key}: oversized Summary`);
   assert.ok(!record.summary.includes('\n'));assert.notEqual(record.summary,record.detail);
   assert.ok(record.detail.length>record.summary.length);
   assert.doesNotMatch(record.detail,/"(?:strategy|signature|notSelf|geometry|taxonomy)"\s*:/);
  }
 }
 withLanguages(locale=>{for(const e of listKnowledgeEntries()) {
  if(e.objectType==='cognition'){assert.equal(e.summary,null);assert.equal(e.detail,null);continue;}
  assert.equal(e.summary.reviewStatus,'reviewed');assert.equal(e.detail.reviewStatus,'reviewed');assert.equal(e.summary.version,2);
  const text=[e.name,e.summary.content,e.detail.content].join(' ');
  if(locale==='en')assert.doesNotMatch(text,/[\u3400-\u9fff]/);
  else if(locale==='zh-Hant') assert.doesNotMatch(text,/[A-Za-z]/,`${locale}/${e.id}: mixed language`);
 }});
});

test('stable taxonomy preserves MG and eight independent Authority identities',()=>{
 setLocale('en',{persist:false});
 const mg=getKnowledgeEntry(query('type','manifestingGenerator'));
 assert.equal(mg.id,'hd.type.manifestingGenerator');
 assert.deepEqual(typeFacts.manifestingGenerator,{family:'generator',taxonomy:'subtype',strategy:'Wait to Respond',signature:'Satisfaction',notSelf:'Frustration'});
 assert.equal(mg.properties.strategy,'Wait to Respond');assert.equal(mg.properties.notSelf,'Frustration');
 assert.equal(mg.provenance.properties.reviewStatus,'verified');
 assert.equal(listKnowledgeEntries().filter(e=>e.objectType==='authority').length,8);
 const a=getKnowledgeEntry(query('authority','egoManifested')),b=getKnowledgeEntry(query('authority','egoProjected'));
 assert.notEqual(a.name,b.name);assert.notEqual(a.detail.content,b.detail.content);assert.ok(!a.summary.sharedReference);
 assert.match(getKnowledgeDetail(query('authority','mental')).content,/no direct inner authority/);
 assert.match(getKnowledgeDetail(query('authority','mental')).content,/sounding board/i);
 assert.equal(Object.values(profileGeometry).filter(x=>x==='rightAngle').length,7);
 assert.equal(Object.values(profileGeometry).filter(x=>x==='juxtaposition').length,1);
 assert.equal(Object.values(profileGeometry).filter(x=>x==='leftAngle').length,4);
 assert.equal(definitionFacts.none.taxonomy,'state');assert.equal(Object.values(definitionFacts).filter(x=>x.taxonomy==='type').length,4);
});

test('terms follow the current vocabulary, reject unknown IDs, and escape rich HTML',()=>{
 withLanguages(()=>{
  assert.equal(knowledgeTerm('type.generator'),vocabulary.typeName('Generator'));
  assert.equal(knowledgeTerm('authority.sacral'),vocabulary.authorityName('Sacral Authority'));
  assert.equal(knowledgeTerm('center.sacral'),vocabulary.centerName('sacral'));
  assert.equal(resolveKnowledgeText('[[term:type.generator]]'),vocabulary.typeName('Generator'));
 });
 const words={typeName:()=> 'first'};assert.equal(knowledgeTerm('type.generator',words),'first');words.typeName=()=> 'updated';assert.equal(knowledgeTerm('type.generator',words),'updated');
 assert.throws(()=>knowledgeTerm('type.unknown'),/Unknown/);assert.throws(()=>knowledgeTerm('concept.toString'),/Unknown/);assert.throws(()=>knowledgeTerm('type.__proto__'),/Unknown/);
 assert.throws(()=>resolveKnowledgeText('[[term:concept.unknown]]'),/Unknown/);
 assert.throws(()=>resolveKnowledgeText('[[term:type.generator'),/Malformed/);
 const html=resolveKnowledgeText('<img onerror="x">[[term:type.generator]]',{rich:true,term:()=>'<script>alert(1)</script>'});
 assert.doesNotMatch(html,/<(?:img|script)/);assert.match(html,/&lt;img/);assert.match(html,/<strong class="knowledge-term">&lt;script/);
});

test('one reusable renderer keeps knowledge, context, missing content and shared Cross separate',()=>{
 withLanguages(()=>{
  const q=query('authority','sacral'),bare=renderKnowledgeDetail(q),contextual=renderKnowledgeDetail(q,{contextText:'<img src=x onerror=x>'});
  assert.equal(contextual.replace(/<aside class="knowledge-context">.*?<\/aside>/s,''),bare);assert.doesNotMatch(contextual,/<img/);
  assert.match(bare,/data-knowledge-id="hd.authority.sacral"/);if(getLocale()!=='zh-CN') assert.match(bare,/knowledge-term/);
  assert.doesNotMatch(renderKnowledgeDetail(query('cognition','taste')),/knowledge-missing/);
  const cross=renderKnowledgeDetail(query('cross','RightAngleCrossOfExplanation2'));
  assert.match(cross,/knowledge-body/);assert.doesNotMatch(cross,/knowledge-missing/);assert.equal(getKnowledgeDetail(query('cross','RightAngleCrossOfExplanation2')),null);
 });
});

test('Variable surface uses only Summary and no bilingual append; Foundation never reads Detail',()=>{
 const chart=readFileSync(new URL('../src/views/chart.js',import.meta.url),'utf8');
 const variable=chart.slice(chart.indexOf('function renderVariablePanel'),chart.indexOf('function renderCrossPanel'));
 assert.match(variable,/getKnowledgeSummary\(/);assert.doesNotMatch(variable,/getKnowledgeDetail|slot\.description|originalTerm/);
 assert.doesNotMatch(chart,/foundation-variable-heading[^\n]*<small>/);
 assert.doesNotMatch(chart,/roughly 70%/);assert.match(chart,/objectId:'introduction'/);
 const foundation=readFileSync(new URL('../src/lib/knowledge/human-design-foundation.js',import.meta.url),'utf8');
 assert.doesNotMatch(foundation,/from ['"].*sharp-contract/);
 assert.ok(listKnowledgeEntries().every(e=>e.domain==='human-design'));
 withLanguages(()=>{for(const e of listKnowledgeEntries().filter(e=>e.objectType==='variable'))assert.ok(getKnowledgeSummary(e)?.content);});
});


test('Cross Knowledge Surface can request single-language Gene Keys without changing legacy readers',()=>{
 withLanguages(locale=>{for(let gate=1;gate<=64;gate++)for(const field of ['shadow','gift','siddhi']){
  assert.equal(geneKeyTerm(gate,field,{bilingual:false}),GENE_KEY_DESCRIPTIONS[gate][field]);
  if(locale==='en')assert.doesNotMatch(geneKeyTerm(gate,field,{bilingual:false}),/[\u3400-\u9fff]/);
  else assert.doesNotMatch(geneKeyTerm(gate,field,{bilingual:false}),/[A-Za-z]/);
 }});
});
