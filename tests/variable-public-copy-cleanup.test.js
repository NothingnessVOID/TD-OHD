import {preservedSource, releaseCandidate} from './helpers/knowledge-release-contract.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {knowledgeContent} from '../src/lib/knowledge/content/index.js';
import {renderKnowledgeDetail} from '../src/lib/knowledge/detail-renderer.js';
import {setLocale} from '../src/lib/i18n.js';
const cleanup=JSON.parse(readFileSync(new URL('./fixtures/variable-public-copy-cleanup.json',import.meta.url)));
const finalRecords=JSON.parse(readFileSync(new URL('./fixtures/variable-29-content.json',import.meta.url))).records;
const apply=(text,locale)=>cleanup.replacements[locale].reduce((s,[a,b])=>s.replaceAll(a,b),text);
test('only seven public voice phrases per locale change; every other field and section identity stays exact',()=>{
 for(const [locale,records]of Object.entries(knowledgeContent)){
  const raw=execFileSync('git',['show',`${cleanup.baseline}:src/lib/knowledge/content/human-design-${locale}.js`]).toString();
  const original=JSON.parse(raw.split('export default ')[1].trim().replace(/;$/,''));
  let edits=0;
  assert.deepEqual(Object.keys(records).filter(key=>key.startsWith('variable.')),Object.keys(original).filter(key=>key.startsWith('variable.')));
  for(const [key,r]of Object.entries(original).filter(([key])=>key.startsWith('variable.'))){
   const expected=structuredClone(r);
   if(cleanup.keys.includes(key)){
    for(const [before]of cleanup.replacements[locale])edits+=r.detail.split(before).length-1;
    expected.detail=apply(r.detail,locale);
    expected.presentation.sections=expected.presentation.sections.map(section=>({...section,
     start:apply(r.detail.slice(0,section.start),locale).length,
     end:apply(r.detail.slice(0,section.end),locale).length}));
   }
   // Subsequent approved navigation work changes only the five overview names/summaries.
   if(key==='variable.introduction'||key.endsWith(':introduction')) {
    expected.name=finalRecords[locale][key].name;expected.summary=finalRecords[locale][key].summary;
   }
   assert.deepEqual(records[key],expected,`${locale}/${key}: unauthorized change`);
  }
  assert.equal(edits,7,locale);
 }
});
test('all 29 public Variable articles and rendered bodies contain zero internal source voice in all locales',()=>{
 for(const [locale,records]of Object.entries(knowledgeContent)){
  setLocale(locale,{persist:false});let count=0;
  for(const [key,r]of Object.entries(records).filter(([key])=>key.startsWith('variable.'))){
   count++;
   assert.doesNotMatch(r.detail,/教材|textbook|supplied material|source says/i);
   assert.doesNotMatch(renderKnowledgeDetail({objectType:'variable',objectId:key.replace('variable.','')}),/教材|textbook|supplied material|source says/i);
  }
  assert.equal(count,29);
 }
});
test('conflict records, source evidence, calculations, Tone mapping and all renderer behavior remain byte-identical',()=>{
 for(const path of ['docs/knowledge-layer/variable-29-conflicts.md','tests/fixtures/variable-29-source-zh-CN.md','src/lib/knowledge/detail-renderer.js','src/lib/knowledge/detail-controller.js','src/lib/knowledge/detail-access.css','src/lib/knowledge/human-design-foundation.js','src/lib/knowledge/sources.js','src/lib/variable-arrows.js','src/lib/chart-engine/sharp-contract.js','src/lib/human-design/variable-data.js','engine-core/TransitCore.cs']){
  const bytes=readFileSync(new URL('../'+path,import.meta.url));
  assert.deepEqual(bytes,preservedSource(path,cleanup.baseline),path);
 }
});
