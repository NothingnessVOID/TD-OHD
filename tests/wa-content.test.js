import test from 'node:test';
import assert from 'node:assert/strict';
import records from '../src/lib/wa/content-data.json' with { type:'json' };
import { readWaContent, listWaContent, WA_PAIR_IDS, WA_CONTENT_ALIASES, waPairLabel } from '../src/lib/wa/content.js';

test('14 Wa articles preserve all three original localized texts and source references',()=>{
  assert.equal(records.length,14);
  for(const locale of ['en','zh-CN','zh-Hant']){
    assert.equal(listWaContent(locale).length,14);
    for(const source of records){
      const entry=readWaContent(source.id,locale);
      for(const key of ['name','summary','detail'])assert.equal(entry[key],source.locales[locale][key]);
      assert.deepEqual(entry.sourceRefs,source.sourceRefs);
      assert.ok(entry.sourceRefs.length>0);assert.ok(entry.detail.length>200);
      assert.equal(entry.packageId,source.objectId);
    }
  }
});
test('canonical/package/full IDs share identity without mutating source catalog',()=>{
  for(const id of WA_PAIR_IDS){
    const packageId=WA_CONTENT_ALIASES[id], expected=readWaContent(id);
    for(const alias of [packageId,`wa.communication.${id}`,`wa.communication.${packageId}`])assert.deepEqual(readWaContent(alias),expected);
    assert.equal(expected.canonicalId,id);assert.equal(expected.packageId,packageId);
  }
  assert.equal(waPairLabel('21-45'),'21-45 Management: Education and Implementation');
  assert.equal(waPairLabel('25-51'),'25-51 Competitiveness');
  assert.equal(waPairLabel('6-59'),'6-59 Interaction');
  const entry=readWaContent('21-45');entry.sourceRefs.push('mutated');
  assert.ok(!readWaContent('21-45').sourceRefs.includes('mutated'));
});
test('unknown locale or ID never silently crosses languages',()=>{
  assert.equal(readWaContent('alpha','fr'),null);assert.deepEqual(listWaContent('fr'),[]);
  assert.equal(readWaContent('missing'),null);assert.equal(readWaContent(null),null);
});
