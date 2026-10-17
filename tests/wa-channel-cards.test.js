import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, chart } from './helpers/wa-fixtures.js';
import { analyzeOC16 } from '../src/lib/wa/oc16-analysis.js';
import { createWaDetailRenderer, waChannelTitle } from '../src/views/wa-detail-content.js';
import { createWaMemberMarkers } from '../src/lib/wa/member-markers.js';
import { setLocale, t } from '../src/lib/i18n.js';
const {snapshot,prepared}=fixture({size:3,groupSizes:[2,0,0]});
prepared[0].chart=chart([45]);prepared[1].chart=chart([21]);prepared[2].chart=chart([54]);
const markers=createWaMemberMarkers(snapshot.members);
let current=analyzeOC16(snapshot,prepared);
const render=createWaDetailRenderer({getResult:()=>current,nameOf:id=>`Fictional <${id}>`,markerOf:id=>markers.get(id)});

test('quick cards show exact endpoint people and unique participants without article bodies or planetary lists',()=>{
 setLocale('zh-CN',{persist:false});
 const html=render.renderChannelCards('management',{kind:'core'});
 assert.equal((html.match(/data-pair-row=/g)||[]).length,1);assert.match(html,/data-participant-count="2"/);
 assert.match(html,/data-wa-endpoint="45"[\s\S]*?data-wa-member="m00"/);
 assert.match(html,/data-wa-endpoint="21"[\s\S]*?data-wa-member="m01"/);
 const footer=html.split('data-channel-participants')[1];
 assert.equal((footer.match(/data-wa-member="m00"/g)||[]).length,1);assert.equal((footer.match(/data-wa-member="m01"/g)||[]).length,1);
 assert.doesNotMatch(html,/data-wa-member="m02"|data-activation-side|data-wa-knowledge|knowledge-body/);
 assert.match(html,/data-marker-number="1"/);assert.match(html,/data-marker-number="2"/);
 assert.match(html,/Fictional &lt;m00&gt;/);assert.match(html,/左侧闸门/);assert.match(html,/右侧闸门/);
});
test('core and additional channel cards remain distinct and all three locales avoid internal coverage/pair copy',()=>{
 for(const locale of ['en','zh-CN','zh-Hant']){
  setLocale(locale,{persist:false});
  for(const id of ['management','competition','direction','interaction','logic','innovation']){
   const html=render.renderChannelCards(id);
   assert.doesNotMatch(html.replace(/<[^>]*>/g,''),/覆盖|覆蓋|门对|門對|\bcoverage\b|\bpairs?\b/i);
   assert.doesNotMatch(html,/data-wa-knowledge|data-activation-side/);
  }
  const other=render.renderChannelCards('management',{kind:'other'});
  assert.equal((other.match(/data-pair-row=/g)||[]).length,1);assert.doesNotMatch(other,/data-pair-row="21-45"/);
  assert.match(other,/data-pair-row="26-44"/);
  assert.equal(waChannelTitle('21-45'), t('OC16 org role management'));
  assert.equal(waChannelTitle('25-51'), t('OC16 org role competition'));
  assert.equal(waChannelTitle('26-44'), t('OC16 personnel'));
 }
});
test('changing scope removes out-of-scope names from quick cards; failures remain unknown not zero',()=>{
 current=analyzeOC16(snapshot,prepared,{pentaId:'g0',includeAlpha:false});
 const html=render.renderChannelCards('management',{kind:'core'});
 assert.match(html,/data-participant-count="1"/);assert.doesNotMatch(html,/data-wa-member="m00"/);assert.match(html,/data-wa-member="m01"/);
 current={status:'not_ready'};
 const missing=render.renderChannelCards('management',{kind:'core'});
 assert.match(missing,/data-participant-count="—"/);assert.doesNotMatch(missing,/data-participant-count="0"|data-wa-member=/);
 assert.equal((missing.match(/data-wa-covered="unknown"/g)||[]).length,2);
});
