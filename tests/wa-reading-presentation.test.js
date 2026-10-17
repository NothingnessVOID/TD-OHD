import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {listWaContent,readWaContent} from '../src/lib/wa/content.js';
import {WA_READING_PARAGRAPHS,presentWaReading,readWaReadingExcerpt} from '../src/lib/wa/reading-presentation.js';
import {createWaDetailRenderer,renderWaReading} from '../src/views/wa-detail-content.js';
import {OC16_DEPARTMENTS} from '../src/lib/wa/oc16-catalog.js';
import {setLocale,t} from '../src/lib/i18n.js';
import {renderProse} from '../src/lib/knowledge/detail-renderer.js';
const forbidden=/覆盖|覆蓋|门对|門對|不代表正式|仅供参考|僅供參考|尚未证实|尚未證實|仅实验性|僅實驗性|\bcoverage\b|\bpairs?\b|for reference only|not officially/i;

test('all 42 Wa readings use explicit authored excerpts, keep source identity, and avoid internal UI copy',()=>{
 assert.equal(Object.keys(WA_READING_PARAGRAPHS).length,14);
 for(const locale of ['en','zh-CN','zh-Hant']){
  setLocale(locale,{persist:false});
  for(const source of listWaContent(locale)){
   const before=structuredClone(source),view=presentWaReading(source,locale);
   assert.ok(view,`${source.id}/${locale}`);assert.deepEqual(source,before);
   assert.deepEqual(view.paragraphIndexes,WA_READING_PARAGRAPHS[source.objectId]);
   let expected=view.paragraphIndexes.map(index=>source.detail.split(/\n\n+/)[index]).join('\n\n');
   for(const change of view.wordingChanges){assert.equal(expected.split(change.from).length-1,change.count);expected=expected.replaceAll(change.from,change.to);}
   assert.equal(view.detail,expected);
   assert.equal(view.summary,['alpha','scale-and-template'].includes(source.objectId)?null:source.summary);
   assert.doesNotMatch([source.name,view.summary||'',view.detail].join('\n'),forbidden,`${source.id}/${locale}`);
   const html=renderWaReading(source.objectId);
   assert.ok(html.includes(`data-wa-reading-id="${source.id}"`));assert.ok(html.includes(`data-wa-paragraphs="${view.paragraphIndexes.join(',')}"`));
   assert.ok(html.includes(renderProse({content:view.detail})));
   if(view.summary!==null)assert.ok(html.includes(renderProse({content:view.summary})));
  }
 }
});
test('supporting channels and gates use organization role readings, never personal chart prose',()=>{
 const view=createWaDetailRenderer({getResult:()=>null});
 for(const locale of ['en','zh-CN','zh-Hant']){
  setLocale(locale,{persist:false});
  for(const department of OC16_DEPARTMENTS){
   const core=department.pairs[0];
   for(const pair of department.pairs){
    const html=view.renderPair(pair.channelId);
    assert.ok(html.includes(`data-wa-content-id="${pair.role==='core'?core.channelId:pair.channelId}"`) || html.includes(`data-wa-content-id="${core.channelId}"`));
    // Core pair ≡ department sheet: reading-for is the department id. Support keeps jump reading-for=channelId.
    if(pair.role==='core') assert.ok(html.includes(`data-wa-reading-for="${department.id}"`));
    else assert.ok(html.includes(`data-wa-reading-for="${pair.channelId}"`));
    const escRole = t(`OC16 org role ${department.id}`).replaceAll('&','&amp;');
    if(pair.role==='core'){
      assert.ok(html.includes('data-wa-org-reading="channel"'));
      assert.ok(html.includes(escRole) || html.includes(t(`OC16 org role ${department.id}`)));
    } else {
      assert.ok(html.includes(t('Wa UI department reading')) || html.includes('data-wa-org-reading="channel"'));
    }
    assert.doesNotMatch(html,/data-shared-channel-reading|data-shared-gate=|data-shared-lens/);
    assert.doesNotMatch(html.replace(/<[^>]*>/g,''),forbidden);
    // Must never surface the incorrect four-foundation summary.
    assert.doesNotMatch(html,/四大基石|1、7、13、33|董事会与品牌灵魂|board of directors and brand soul/i);
    for(const gate of pair.gates){
      const gateHtml=view.renderGate(gate);
      assert.ok(gateHtml.includes(`data-wa-reading-for="gate:${gate}"`));
      assert.ok(gateHtml.includes(`data-wa-content-id="${pair.channelId}"`) || gateHtml.includes(`data-wa-content-id="${core.channelId}"`));
      assert.ok(gateHtml.includes('data-wa-org-reading="gate"'));
      const gateRole = t(`OC16 org gate role ${gate}`).replaceAll('&','&amp;');
      assert.ok(gateHtml.includes(gateRole) || gateHtml.includes(t(`OC16 org gate role ${gate}`)));
      assert.doesNotMatch(gateHtml,/data-shared-gate=|data-shared-lens/);
      assert.doesNotMatch(gateHtml,/四大基石|1、7、13、33/);
    }
   }
  }
 }
});
test('unsupported locale, identity and unreviewed paragraph/wording drift fail closed without mutating author data',()=>{
 assert.equal(readWaReadingExcerpt('45-21','ja'),null);assert.equal(readWaReadingExcerpt('32-54','en'),null);
 const record=readWaContent('penta-and-wa','en');
 assert.equal(presentWaReading({...record,detail:record.detail+'\n\nUnreviewed added paragraph'},'en'),null);
 assert.equal(presentWaReading({...record,detail:record.detail.replace('group coverage','unreviewed change')},'en'),null);
 const file='src/lib/wa/content-data.json';
 assert.deepEqual(readFileSync(new URL('../'+file,import.meta.url)),execFileSync('git',['show',`df45d2e763e0b5e297698cd1b703c27d257c8efc:${file}`]));
});
