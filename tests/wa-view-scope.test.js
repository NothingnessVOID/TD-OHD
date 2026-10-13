import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveWaViewScope, hasScopedWaEstimate } from '../src/lib/wa/view-scope.js';
import { analyzeOC16 } from '../src/lib/wa/oc16-analysis.js';
import { fixture, chart } from './helpers/wa-fixtures.js';
import { setLocale, t } from '../src/lib/i18n.js';
import '../src/lib/wa/oc16-messages.js';

test('organization always includes Alpha and all assigned people; a standalone group defaults to its own members',()=>{
 const {snapshot}=fixture({pool:2});
 const before=structuredClone(snapshot);
 assert.deepEqual(resolveWaViewScope(snapshot,{includeAlpha:false}).memberIds,snapshot.members.slice(0,10).map(m=>m.memberId));
 assert.deepEqual(resolveWaViewScope(snapshot,{pentaId:'g0'}),{pentaId:'g0',includeAlpha:false,memberIds:['m01','m02','m03'],memberCount:3,kind:'group_only'});
 assert.deepEqual(resolveWaViewScope(snapshot,{pentaId:'g0',includeAlpha:true}).memberIds,['m00','m01','m02','m03']);
 assert.deepEqual(snapshot,before);
 assert.throws(()=>resolveWaViewScope(snapshot,{pentaId:'unknown'}),/Unknown/);
 snapshot.alphaId=null;
 assert.equal(resolveWaViewScope(snapshot,{pentaId:'g0',includeAlpha:true}).includeAlpha,false);
});
test('view scopes drive exactly corresponding coverage, sources and counts; changing assignments alone preserves organization union',()=>{
 const {snapshot,prepared}=fixture();
 prepared.forEach((person,index)=>{person.chart=chart(index===0?[45,60]:index===1?[21,50]:[6,3]);});
 const analyze=opts=>analyzeOC16(snapshot,prepared,resolveWaViewScope(snapshot,opts));
 const whole=analyze();const group=analyze({pentaId:'g0'});const withAlpha=analyze({pentaId:'g0',includeAlpha:true});
 assert.equal(whole.memberIds.length,10);assert.equal(group.memberIds.length,3);assert.equal(withAlpha.memberIds.length,4);
 assert.deepEqual(group.gateRecords.find(r=>r.gate===45).memberIds,[]);
 assert.deepEqual(withAlpha.gateRecords.find(r=>r.gate===45).memberIds,['m00']);
 assert.equal(group.pairs.find(p=>p.channelId==='21-45').status,'hanging');
 assert.equal(withAlpha.pairs.find(p=>p.channelId==='21-45').status,'crossMemberOnly');
 [snapshot.pentas[0].memberIds[0],snapshot.pentas[1].memberIds[0]]=[snapshot.pentas[1].memberIds[0],snapshot.pentas[0].memberIds[0]];
 const changed=analyze();
 assert.deepEqual(changed.gateRecords,whole.gateRecords);assert.deepEqual(changed.pairs,whole.pairs);assert.deepEqual(changed.departments,whole.departments);
 assert.notDeepEqual(analyze({pentaId:'g0'}).gateRecords,group.gateRecords);
});
test('estimated-time notice excludes out-of-scope Alpha and never leaks a previous result into errors',()=>{
 const {snapshot,prepared}=fixture();prepared[0].timeUnknown=true;
 const all=analyzeOC16(snapshot,prepared,resolveWaViewScope(snapshot));
 const group=analyzeOC16(snapshot,prepared,resolveWaViewScope(snapshot,{pentaId:'g0'}));
 const plus=analyzeOC16(snapshot,prepared,resolveWaViewScope(snapshot,{pentaId:'g0',includeAlpha:true}));
 assert.equal(hasScopedWaEstimate(all),true);assert.equal(hasScopedWaEstimate(group),false);assert.equal(hasScopedWaEstimate(plus),true);
 assert.equal(hasScopedWaEstimate(null),false);assert.equal(hasScopedWaEstimate({...plus,status:'not_ready'}),false);
});
test('dedicated navigation keys have exact three-language names without changing technical page names',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/data-view="team" data-i18n="nav.team"/);assert.match(html,/data-view="wa" data-i18n="nav.organization"/);
 for(const [locale,team,organization] of [['en','Team','Organization'],['zh-CN','团队','组织'],['zh-Hant','團隊','組織']]){
  setLocale(locale,{persist:false});assert.equal(t('nav.team'),team);assert.equal(t('nav.organization'),organization);
  assert.ok(t('Organization · Wa').includes('Wa'));assert.ok(t('Team · Penta').includes('Penta'));
  assert.ok(t('OC16 scope count',{scope:'Penta A',count:3}).includes('3'));
 }
});
