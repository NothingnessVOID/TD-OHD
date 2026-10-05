import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {knowledgeContent} from '../src/lib/knowledge/content/index.js';
import {setLocale} from '../src/lib/i18n.js';
import {listKnowledgeEntries} from '../src/lib/knowledge/registry.js';
import {renderKnowledgeDetail} from '../src/lib/knowledge/detail-renderer.js';
const baseline='292edc9b5aa8f7c6b1fa5e3055c4c76cba8c52b3';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/knowledge-round2c-content.json',import.meta.url)));
const hash=s=>createHash('sha256').update(s).digest('hex');
const oldCN=JSON.parse(execFileSync('git',['show',baseline+':src/lib/knowledge/content/human-design-zh-CN.js']).toString().split('export default ')[1].trim().replace(/;$/,''));
const pairs={caves:['Selective','Blending'],markets:['Internal','External'],kitchens:['Wet','Dry'],mountains:['Active','Passive'],valleys:['Narrow','Wide'],shores:['Natural','Artificial']};
test('Round 2C keeps all 55 supplied independent locale articles and six name-only Cognitions',()=>{
 for(const [locale,records]of Object.entries(knowledgeContent)){
  assert.deepEqual(Object.keys(records).sort(),Object.keys(knowledgeContent.en).sort());assert.equal(Object.keys(records).length,55);
  for(const [key,record]of Object.entries(records)){assert.equal(hash(record.summary+'\n'+record.detail),fixture.articles[locale][key],locale+'/'+key);assert.doesNotMatch(record.detail,/Internal editorial notes|內部編輯備註|sourceId|reviewStatus|internal audit|https?:\/\//i);}
  setLocale(locale,{persist:false});const entries=listKnowledgeEntries();assert.equal(entries.filter(e=>e.hasSummary&&e.hasDetail).length,55);assert.equal(entries.filter(e=>e.objectType==='variable').length,24);assert.equal(entries.filter(e=>e.objectType==='cognition'&&!e.hasDetail&&!e.hasSummary).length,6);
 }
});
test('zh-CN changes only Taste branches and six Environment headings',()=>{
 for(const [key,record]of Object.entries(knowledgeContent['zh-CN'])){
  const old=oldCN[key];if(key!=='variable.determination:taste'&&!key.startsWith('variable.environment:')){assert.deepEqual({summary:record.summary,detail:record.detail},{summary:old.summary,detail:old.detail},key);continue;}
  assert.equal(record.summary,old.summary);const sections=record.presentation.sections;
  if(key.startsWith('variable.environment:')){const pair=pairs[key.split(':')[1]];for(const [i,id]of ['tone1to3','tone4to6'].entries()){const prior=old.presentation.sections.find(s=>s.id===id);const title=sections.find(s=>s.id===id).title;assert.ok(title.startsWith(prior.title+' · '));assert.equal(title.split(pair[i]).length-1,1,key+'/'+id);}}

  for(const section of sections){const prior=old.presentation.sections.find(s=>s.id===section.id);if(key!=='variable.determination:taste'||section.id==='intro')assert.equal(record.detail.slice(section.start,section.end),old.detail.slice(prior.start,prior.end),key+'/'+section.id);}
 }
});
test('Taste and all six Environment pairs retain numeric semantic Tone branches in every language',()=>{
 for(const [locale,records]of Object.entries(knowledgeContent)){
  const taste=records['variable.determination:taste'].presentation.sections;
  assert.match(taste.find(s=>s.id==='tone1to3').title,/Open/);assert.match(taste.find(s=>s.id==='tone4to6').title,/Closed/);
  for(const [id,pair]of Object.entries(pairs)){const sections=records['variable.environment:'+id].presentation.sections;for(const [i,branch]of ['tone1to3','tone4to6'].entries())assert.ok(sections.find(s=>s.id===branch).title.includes(pair[i]),locale+'/'+id+'/'+branch);}
 }
});
test('24 articles select exactly one branch for all six Tones; Library never marks Yours',()=>{
 for(const locale of Object.keys(knowledgeContent)){setLocale(locale,{persist:false});for(const entry of listKnowledgeEntries().filter(e=>e.objectType==='variable')){
  assert.doesNotMatch(renderKnowledgeDetail(entry),/knowledge-yours/);const sections=entry.detail.presentation.sections;
  assert.equal(new Set(sections.map(s=>s.id)).size,sections.length);
  for(const s of sections){assert.ok(Number.isInteger(s.start)&&s.start>=0&&s.end>=s.start&&s.end<=entry.detail.template.length);}
  for(let tone=1;tone<=6;tone++){const html=renderKnowledgeDetail(entry,{variableContext:{tone,color:entry.properties.color,base:1}});assert.equal((html.match(/knowledge-yours/g)||[]).length,1);assert.match(html,new RegExp(`data-section="${tone<=3?'tone1to3':'tone4to6'}"><h3>[^<]+<span class="knowledge-yours">`));assert.doesNotMatch(html,/class="[^"]*(?:warning|error)/);}
  if(entry.properties.kind==='perspective')assert.ok(sections.some(s=>s.id==='distraction'));if(entry.properties.kind==='motivation')assert.ok(sections.some(s=>s.id==='transference'));
 }}
});
test('native Type terminology and authored Profile geometry use the shared renderer',()=>{
 for(const locale of ['en','zh-Hant']){setLocale(locale,{persist:false});for(const e of listKnowledgeEntries().filter(e=>e.objectType==='type')){const html=renderKnowledgeDetail(e);assert.match(html,locale==='en'?/Signature/:/標誌/);assert.match(html,locale==='en'?/Not-Self Theme/:/非我主題/);assert.doesNotMatch(html,/Positive Feedback/);for(const range of Object.values(e.detail.presentation.fields))assert.ok(e.detail.template.slice(range.start,range.end));}
 const geometry=listKnowledgeEntries().filter(e=>e.objectType==='profile').map(e=>renderKnowledgeDetail(e)).join(' ');for(const phrase of locale==='en'?['Personal Destiny','Fixed Fate','Transpersonal Karma']:['個人命運','固定宿命','超個人業力'])assert.ok(geometry.includes(phrase));}
});
test('locale loader, calculations and arrow mapping remain byte-identical to Round 2B',()=>{
 for(const path of ['src/lib/knowledge/content/index.js','src/lib/variable-arrows.js','src/lib/chart-engine/sharp-contract.js','engine-core/TransitCore.cs','src/bodygraph.js','src/features/transit-timeline/core.js','src/features/transit-timeline/view.js'])assert.equal(hash(readFileSync(new URL('../'+path,import.meta.url))),hash(execFileSync('git',['show',baseline+':'+path])),path);
});
