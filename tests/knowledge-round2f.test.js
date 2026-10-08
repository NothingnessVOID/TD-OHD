import {preservedSource, releaseCandidate} from './helpers/knowledge-release-contract.js';
import {skinProjection} from './helpers/skin-projection.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {knowledgeContent} from '../src/lib/knowledge/content/index.js';
import {getKnowledgeEntry} from '../src/lib/knowledge/registry.js';
import {renderKnowledgeDetail} from '../src/lib/knowledge/detail-renderer.js';
import {setLocale,t} from '../src/lib/i18n.js';
import {assertContentBoundary,baseline,pairs,targetIds,uiKeys,round2FContent} from './helpers/knowledge-round2f-contract.js';
const q=id=>({objectType:'variable',objectId:id.replace('variable.','')});
const plain=s=>s.replace(/<[^>]*>/g,'').replaceAll('&#39;',"'").replaceAll('&quot;','"').replaceAll('&amp;','&');
test('historical Round 2F range proof and exact Round 2G copy preserve all 165 summaries and 129 other articles',()=>assert.deepEqual(assertContentBoundary(),{changed:36,unchanged:129}));
test('12 exact directed pairs are stable metadata in each independent locale',()=>{
 const approved=JSON.parse(readFileSync(new URL('./fixtures/knowledge-round2f-deviation.json',import.meta.url)));
 for(const [locale,records] of Object.entries(knowledgeContent))for(const [kind,values] of Object.entries(pairs))for(const [source,target] of Object.entries(values)){
  const r=records[`variable.${kind}:${source}`],s=r.presentation.sections.find(s=>s.kind==='deviation');
  assert.equal(s.sourceValue,source);assert.equal(s.targetValue,target);
  assert.equal(s.id,kind==='perspective'?'distraction':'transference');assert.equal(s.terminology,s.id);
  assert.equal(s.title,{en:'Off-track State','zh-CN':'偏离状态','zh-Hant':'偏離狀態'}[locale]);
  assert.ok(Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.end<=r.detail.length&&s.end>s.start);
  const historical=round2FContent[locale][`variable.${kind}:${source}`],range=historical.presentation.sections.find(p=>p.id===s.id);
  assert.equal(createHash('sha256').update(historical.detail.slice(range.start,range.end)).digest('hex'),approved[locale][`variable.${kind}:${source}`]);
  if(locale==='en')assert.match(historical.detail.slice(range.start,range.end),kind==='perspective'?/not a second trait/:/not a second motivation/);
 }
});
test('all 36 sections render metadata-driven localized A ↓ B in order on Library and Chart surfaces',()=>{
 for(const locale of Object.keys(knowledgeContent)){setLocale(locale,{persist:false});for(const id of targetIds){
  const e=getKnowledgeEntry(q(id)),s=e.detail.presentation.sections.find(s=>s.kind==='deviation');
  const bare=renderKnowledgeDetail(q(id));
  for(const tone of [null,1,3,4,6]){
   const h=renderKnowledgeDetail(q(id),tone?{variableContext:{tone,color:e.properties.color,base:1}}:{});
   const deviation=h.slice(h.indexOf('<section class="knowledge-section knowledge-surface knowledge-information knowledge-deviation"'));
   assert.match(deviation,/<h3 class="knowledge-deviation-heading">/);assert.ok(deviation.includes(t('Off-track State')));
   assert.ok(deviation.includes(t(s.terminology==='distraction'?'Variable Distraction':'Variable Transference')));
   assert.ok(h.indexOf('knowledge-summary-callout')<h.indexOf('data-section="core"'));
   assert.ok(h.indexOf('data-section="tone4to6"')<h.indexOf('knowledge-deviation"'));
   assert.ok(deviation.indexOf(`data-value="${s.sourceValue}"`)<deviation.indexOf('↓'));
   assert.ok(deviation.indexOf('↓')<deviation.indexOf(`data-value="${s.targetValue}"`));
   for(const v of [s.sourceValue,s.targetValue])assert.ok(deviation.includes(getKnowledgeEntry(q(`variable.${e.properties.kind}:${v}`)).name));
   assert.doesNotMatch(deviation,/knowledge-yours|data-selected|Not-Self Theme|非我主[题題]|role="alert"|warning|danger/);
   assert.equal((h.match(/knowledge-yours/g)||[]).length,tone?1:0);
   assert.ok(plain(deviation).includes(e.detail.template.slice(s.start,s.end).split('\n\n')[0].replaceAll('**','')));
   assert.equal(deviation,bare.slice(bare.indexOf('<section class="knowledge-section knowledge-surface knowledge-information knowledge-deviation"')));
  }
 }}
});
test('Determination and Environment have no deviation block; display is not based on visible copy matching',()=>{
 setLocale('en',{persist:false});for(const kind of ['determination','environment'])for(const e of Object.keys(knowledgeContent.en).filter(id=>id.startsWith('variable.'+kind+':')&&!id.endsWith(':introduction')))assert.doesNotMatch(renderKnowledgeDetail(q(e)),/knowledge-deviation|Off-track State/);
 const record=knowledgeContent.en['variable.motivation:fear'],s=record.presentation.sections.find(s=>s.kind==='deviation'),old=record.detail;
 try{record.detail=old.slice(0,s.start)+'x'.repeat(s.end-s.start);const h=renderKnowledgeDetail(q('variable.motivation:fear'));assert.match(h,/data-value="fear"/);assert.match(h,/data-value="need"/);}finally{record.detail=old;}
});
test('deviation interface has explicit locale messages and uses neutral theme tokens',()=>{
 const en=JSON.parse(readFileSync(new URL('../src/locales/ui-contexts.json',import.meta.url))).en;
 for(const locale of Object.keys(knowledgeContent)){const messages=locale==='en'?en:JSON.parse(readFileSync(new URL(`../src/locales/${locale}/ui-chart.json`,import.meta.url)));for(const key of uiKeys)assert.ok(messages[key]);}
 const css=readFileSync(new URL('../src/lib/knowledge/detail-access.css',import.meta.url),'utf8').split('/* A conditional knowledge relationship')[1].split('.knowledge-process')[0];
 assert.match(css,/var\(--accent\)/);assert.match(css,/var\(--accent-soft\)/);assert.match(css,/var\(--border-subtle\)/);assert.doesNotMatch(css,/#[0-9a-f]+|--hd-|danger|warning|alert|red|yellow/i);
});
test('engines, Variable mapping, Home, Export, Timeline and protected consumers stay byte-identical to actual baseline',()=>{
 for(const file of ['src/lib/knowledge/content/index.js','src/lib/variable-arrows.js','src/lib/chart-engine/sharp-contract.js','src/lib/human-design/variable-data.js','engine-core/TransitCore.cs','src/bodygraph.js','src/views/chart.js','src/views/connection.js','src/views/team.js','src/features/transit-timeline/core.js','src/features/transit-timeline/view.js','src/lib/chart-data-export.js'])assert.deepEqual(readFileSync(new URL('../'+file,import.meta.url)),preservedSource(file,baseline),file);
});
