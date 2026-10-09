import {isReviewedPhase1BHistorySource} from './helpers/penta-phase1b-history-scope.js';
import {preservedSource, phase1ProtectedCurrent, releaseCandidate} from './helpers/knowledge-release-contract.js';
import {skinProjection,skinScope} from './helpers/skin-projection.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {round2GContent as knowledgeContent} from './helpers/knowledge-round2f-contract.js';
import {setLocale,t} from '../src/lib/i18n.js';
import {getKnowledgeEntry} from '../src/lib/knowledge/registry.js';
import {renderKnowledgeDetail} from '../src/lib/knowledge/detail-renderer.js';
import {assertContentBoundary,copyBaseline,pairs,targetIds,uiKeys} from './helpers/knowledge-round2f-contract.js';
const approved=JSON.parse(readFileSync(new URL('./fixtures/knowledge-round2g-copy.json',import.meta.url))).details;
const q=id=>({objectType:'variable',objectId:id.replace('variable.','')});
const rangeBodies=detail=>{
 const [intro,rest]=detail.split('\n\nTone 1–3 · Left\n\n');
 const [left,rightAndDeviation]=rest.split('\n\nTone 4–6 · Right\n\n');
 const index=rightAndDeviation.lastIndexOf('\n\n');
 return {intro,tone1to3:left,tone4to6:rightAndDeviation.slice(0,index),deviation:rightAndDeviation.slice(index+2)};
};
test('all 36 final Details equal the approved product strings character for character; no editorial fallback',()=>{
 assertContentBoundary();for(const [locale,records] of Object.entries(approved)){
  assert.equal(Object.keys(records).length,12);assert.deepEqual(Object.keys(records).sort(),[...targetIds].sort());
  for(const [id,expected] of Object.entries(records))assert.equal(knowledgeContent[locale][id].detail,expected,locale+'/'+id);
 }
 assert.ok(approved['zh-CN']['variable.motivation:fear'].startsWith('这里的“恐惧”不是“胆小”。'));
 assert.ok(approved['zh-Hant']['variable.motivation:fear'].startsWith('這裡的「恐懼」不是「膽小」。'));
 assert.ok(approved.en['variable.motivation:fear'].startsWith('“Fear” here does not mean being timid.'));
});
test('every recalculated range equals the complete approved section; deviation contains only the final specific paragraph',()=>{
 for(const [locale,records] of Object.entries(approved))for(const [id,expected] of Object.entries(records)){
  const r=knowledgeContent[locale][id],bodies=rangeBodies(expected);assert.equal(r.presentation.sections.length,4);
  let last=0;for(const section of r.presentation.sections){
   assert.ok(Number.isInteger(section.start)&&Number.isInteger(section.end));assert.ok(section.start>=last&&section.end<=expected.length);
   assert.equal(r.detail.slice(section.start,section.end),bodies[section.kind==='deviation'?'deviation':section.id],`${locale}/${id}/${section.id}`);last=section.end;
  }
  for(const branch of ['tone1to3','tone4to6'])assert.equal(r.presentation.sections.find(s=>s.id===branch).title,branch==='tone1to3'?'Tone 1–3 · Left':'Tone 4–6 · Right');
 }
});
test('Chinese final copies contain no English-parenthesized Chinese or repeated deviation titles; Flow keeps full names',()=>{
 for(const locale of ['zh-CN','zh-Hant']){setLocale(locale,{persist:false});for(const id of targetIds){
  const r=knowledgeContent[locale][id];assert.doesNotMatch(r.detail,/(Fear|Hope|Desire|Need|Guilt|Innocence|Survival|Possibility|Power|Wanting|Probability|Personal|Transference|Distraction)[（(]/);
  assert.doesNotMatch(r.detail,/Distraction|Transference/);
  const h=renderKnowledgeDetail(q(id));assert.doesNotMatch(h,/(?:Fear|Need|Survival|Wanting)[（(]|Distraction ·|Transference ·/);
  for(const value of [id.split(':')[1],pairs[id.includes('.perspective:')?'perspective':'motivation'][id.split(':')[1]]]){
   const name=getKnowledgeEntry(q(id.split(':')[0]+':'+value)).name;assert.match(name,id.includes('.perspective:')?/視角|视角/:/動機|动机/);assert.ok(h.includes(name));
  }
 }}
});
test('all public UI labels and mechanisms exactly match finalized wording; arrow conditional is separate from prose',()=>{
 const labels={en:['Off-track State','Distraction','Transference','Original perspective','Original motivation','May shift toward','When off track'], 'zh-CN':['偏离状态','分心','动机转移','原本视角','原本动机','可能转向','偏离时'],'zh-Hant':['偏離狀態','分心','動機轉移','原本視角','原本動機','可能轉向','偏離時']};
 const mechanisms={en:['Distraction describes what can happen when a perspective moves off its correct state and attention shifts toward its paired perspective.','Transference describes what can happen when a motivation moves off its correct state and shifts toward its paired motivation.'],'zh-CN':['这里的“分心”指的是：当原本的视角偏离正确状态时，注意力可能会转向与它对应的另一种视角。','这里的“动机转移”指的是：当原本的动机偏离正确状态时，可能会转向与它对应的另一种动机。'],'zh-Hant':['這裡的「分心」指的是：當原本的視角偏離正確狀態時，注意力可能會轉向與它對應的另一種視角。','這裡的「動機轉移」指的是：當原本的動機偏離正確狀態時，可能會轉向與它對應的另一種動機。']};
 for(const locale of Object.keys(labels)){setLocale(locale,{persist:false});assert.deepEqual(uiKeys.map(key=>t(key)),[...labels[locale],...mechanisms[locale]]);
  for(const id of targetIds){const html=renderKnowledgeDetail(q(id));assert.match(html,/<div class="knowledge-deviation-transition"><span class="knowledge-deviation-arrow" aria-hidden="true">↓<\/span><span class="knowledge-deviation-label">/);assert.ok(html.includes(t('When off track')));}
 }
});
test('approved vocabulary preserves the finalized Need label; names resolve through the existing registry',()=>{
 for(const [locale,before,after] of [['zh-CN','需要动机','需求动机'],['zh-Hant','需要動機','需求動機']]){
  const file=`src/locales/${locale}/vocabulary.js`,old=preservedSource(file,copyBaseline).toString();
  assert.equal(readFileSync(new URL('../'+file,import.meta.url),'utf8'),old);
  setLocale(locale,{persist:false});assert.equal(getKnowledgeEntry(q('variable.motivation:need')).name,after);
 }
 setLocale('en',{persist:false});assert.equal(getKnowledgeEntry(q('variable.motivation:need')).name,'Need');
});
test('engines, mapping, compact rendering and export stay exact to actual Round 2F baseline',()=>{
 for(const p of ['src/lib/chart-engine/sharp-contract.js','engine-core/TransitCore.cs','src/lib/variable-arrows.js','src/lib/human-design/variable-data.js','src/bodygraph.js','src/views/chart.js','src/views/team.js','src/views/connection.js','src/lib/chart-data-export.js','src/features/transit-timeline/core.js','src/features/transit-timeline/view.js','src/lib/knowledge/content/index.js'])if(!isReviewedPhase1BHistorySource(p))assert.deepEqual(['src/bodygraph.js','src/views/connection.js'].includes(p)?phase1ProtectedCurrent(p):readFileSync(new URL('../'+p,import.meta.url)),skinScope.files[p]?skinProjection(p,copyBaseline):preservedSource(p,copyBaseline),p);
});
