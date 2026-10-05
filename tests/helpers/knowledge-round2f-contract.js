import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {knowledgeContent} from '../../src/lib/knowledge/content/index.js';
export const baseline='fa1d6afba38ebe0128b517a565123c827340554d';
export const pairs={perspective:{survival:'wanting',possibility:'probability',power:'personal',wanting:'survival',probability:'possibility',personal:'power'},motivation:{fear:'need',hope:'guilt',desire:'innocence',need:'fear',guilt:'hope',innocence:'desire'}};
export const targetIds=new Set(Object.entries(pairs).flatMap(([kind,values])=>Object.keys(values).map(value=>`variable.${kind}:${value}`)));
export const uiKeys=['Off-track State','Variable Distraction','Variable Transference','Correct perspective','Correct motivation','Possible off-track direction','When the perspective moves off its correct state, attention can be drawn toward its paired perspective. This describes a possible off-track direction, not a second fixed trait.','In anxiety, pressure or confusion, motivation can shift toward its paired motivation. This describes a possible off-track state, not a second motivation.'];
const fixture=JSON.parse(readFileSync(new URL('../fixtures/knowledge-round2c-content.json',import.meta.url)));
const hash=s=>createHash('sha256').update(s).digest('hex');
export const originalContent=Object.fromEntries(Object.keys(knowledgeContent).map(locale=>[locale,JSON.parse(execFileSync('git',['show',`${baseline}:src/lib/knowledge/content/human-design-${locale}.js`]).toString().split('export default ')[1].trim().replace(/;$/,''))]));
/** Keep Round 2C immutable. Only 36 approved deviation bodies may change. */
export function assertContentBoundary() {
 let changed=0,unchanged=0;
 for(const [locale,records] of Object.entries(knowledgeContent)) {
  assert.equal(Object.keys(records).length,55);
  assert.deepEqual(Object.keys(records),Object.keys(originalContent[locale]));
  for(const [id,r] of Object.entries(records)) {
   const old=originalContent[locale][id];
   assert.equal(hash(old.summary+'\n'+old.detail),fixture.articles[locale][id],`${locale}/${id}: actual baseline is Round 2C`);
   assert.equal(r.summary,old.summary,`${locale}/${id}: Summary immutable`);
   if(!targetIds.has(id)) {assert.equal(hash(r.summary+'\n'+r.detail),fixture.articles[locale][id],`${locale}/${id}`);assert.deepEqual(r,old,`${locale}/${id}: metadata immutable`);unchanged++;continue;}
   const s=r.presentation.sections.find(s=>s.kind==='deviation'),prior=old.presentation.sections.find(part=>part.id===s?.id);
   assert.ok(s&&prior,id);assert.notEqual(r.detail,old.detail,id);
   assert.equal(r.detail.slice(0,s.start),old.detail.slice(0,prior.start),`${locale}/${id}: unchanged prefix`);
   assert.equal(r.detail.slice(s.end),old.detail.slice(prior.end),`${locale}/${id}: unchanged suffix`);
   for(const part of r.presentation.sections.filter(p=>p.id!==s.id)) {
    const before=old.presentation.sections.find(p=>p.id===part.id);
    assert.deepEqual(part,before);assert.equal(r.detail.slice(part.start,part.end),old.detail.slice(before.start,before.end));
   }
   assert.equal(s.start,prior.start);assert.equal(s.end,r.detail.length);changed++;
  }
 }
 assert.equal(changed,36);assert.equal(unchanged,129);
 // The historical fixture itself cannot be silently replaced.
 assert.deepEqual(readFileSync(new URL('../fixtures/knowledge-round2c-content.json',import.meta.url)),execFileSync('git',['show',baseline+':tests/fixtures/knowledge-round2c-content.json']));
 return {changed,unchanged};
}
