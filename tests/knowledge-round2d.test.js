import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync}from'node:fs';
import {execFileSync}from'node:child_process';
import {createHash}from'node:crypto';
import {knowledgeContent}from'../src/lib/knowledge/content/index.js';
import {listKnowledgeEntries,getKnowledgeEntry}from'../src/lib/knowledge/registry.js';
import {renderKnowledgeDetail}from'../src/lib/knowledge/detail-renderer.js';
import {setLocale}from'../src/lib/i18n.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/knowledge-round2c-content.json',import.meta.url)));
const q=(objectType,objectId)=>({objectType,objectId});
const hash=s=>createHash('sha256').update(s).digest('hex');
const plain=s=>s.replace(/<[^>]*>/g,'').replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"').replace(/\s+/g,'');
const langs=fn=>{for(const l of ['en','zh-CN','zh-Hant']){setLocale(l,{persist:false});fn(l);}};
test('Round 2D zero editorial change: all 165 Summary/Detail hashes match immutable Round 2C fixture',()=>{
 for(const [l,records]of Object.entries(knowledgeContent))for(const [id,r]of Object.entries(records))assert.equal(hash(r.summary+'\n'+r.detail),fixture.articles[l][id],l+'/'+id);
});
test('all 55 reviewed entries render; Cognition remains six name-only entries',()=>langs(()=>{
 const entries=listKnowledgeEntries();assert.equal(entries.filter(e=>e.hasDetail).length,55);assert.equal(entries.filter(e=>e.objectType==='cognition'&&!e.hasDetail).length,6);
 for(const entry of entries){const html=renderKnowledgeDetail(entry);assert.match(html,/knowledge-detail/);if(entry.hasSummary)assert.match(html,/knowledge-summary-callout/);assert.doesNotMatch(html,/center-reading|gate-chip|circuit-badge|role="alert"/);}
}));
test('Generator has real Strategy/Aura surfaces, source chips and compact metadata; Emotional stays prose',()=>langs(()=>{
 const html=renderKnowledgeDetail(q('type','generator'));assert.match(html,/data-section="strategy"/);assert.match(html,/data-section="aura"/);assert.match(html,/knowledge-chip/);assert.match(html,/knowledge-meta/);
 const e=getKnowledgeEntry(q('authority','emotional')),h=renderKnowledgeDetail(e);assert.match(h,/knowledge-reading/);assert.doesNotMatch(h,/<h3>|提醒|常见误区|关键词/);assert.ok(plain(h).includes(plain(e.detail.template)));
}));
test('Profile process and timeline refer to all original text; only 2/4 and 3/6 specialize',()=>langs(l=>{
 for(const [id,layout]of [['2/4','process'],['3/6','timeline']]){const e=getKnowledgeEntry(q('profile',id)),h=renderKnowledgeDetail(e);assert.match(h,/knowledge-geometry/);assert.match(h,new RegExp(`data-layout="${layout}"`));const p=e.detail.presentation,body=e.detail.template;
 for(const b of p.blocks){if(b.kind==='process'){assert.equal(b.steps.length,3);for(const r of [b.lead,...b.steps])assert.ok(plain(h).includes(plain(body.slice(r.start,r.end))));}else if(b.kind==='timeline'){assert.equal(b.stages.length,3);for(const stage of b.stages)for(const r of [stage.label,stage.body])assert.ok(plain(h).includes(plain(body.slice(r.start,r.end))));}else assert.ok(plain(h).includes(plain(body.slice(b.start,b.end))));}
 }
 for(const e of listKnowledgeEntries().filter(e=>e.objectType==='profile'&&!['2/4','3/6'].includes(e.objectId)))assert.doesNotMatch(renderKnowledgeDetail(e),/data-layout="(?:process|timeline)"/);
}));
test('Definition Library keeps all original prose without invented personal topology',()=>langs(()=>{
 for(const id of ['none','single','split','tripleSplit','quadrupleSplit']){const e=getKnowledgeEntry(q('definition',id)),h=renderKnowledgeDetail(e);assert.ok(plain(h).includes(plain(e.detail.template)));assert.doesNotMatch(h,/knowledge-island|data-center|data-gate|data-channel|<svg/);}
}));
test('dynamic Cross cards follow the existing four-gate order; introduction has no chart activations',()=>langs(()=>{
 const query={...q('cross','RightAngleCrossOfExplanation2'),cross:{rawId:'RightAngleCrossOfExplanation2',gates:[23,43,49,4],angle:'right',name:'Right Angle Cross of Explanation 2'}};const e=getKnowledgeEntry(query);const h=renderKnowledgeDetail(query);const roles=['personality-sun','personality-earth','design-sun','design-earth'];for(const [i,role]of roles.entries())assert.match(h,new RegExp(`data-activation="${role}"[^]*?knowledge-chip[^]*?${e.properties.gates[i]}`));assert.equal((h.match(/class="knowledge-activation knowledge-activation-link"/g)||[]).length,4);assert.equal((h.match(/knowledge-geometry/g)||[]).length,1);assert.doesNotMatch(renderKnowledgeDetail(q('cross','introduction')),/knowledge-cross-activations/);
}));
test('24 Variable articles × six Tones keep exactly one selected branch, Library none; information stays neutral',()=>langs(()=>{
 for(const e of listKnowledgeEntries().filter(e=>e.objectType==='variable')){const bare=renderKnowledgeDetail(e);assert.doesNotMatch(bare,/knowledge-yours|data-selected="true"|knowledge-context-badges/);for(let tone=1;tone<=6;tone++){const h=renderKnowledgeDetail(e,{variableContext:{tone,color:e.properties.color,base:1}});assert.equal((h.match(/knowledge-yours/g)||[]).length,1);assert.equal((h.match(/data-selected="true"/g)||[]).length,1);assert.match(h,new RegExp(`data-selected="true" data-section="${tone<=3?'tone1to3':'tone4to6'}"`));assert.doesNotMatch(h,/role="alert"|warning|error/);}
 if(['perspective','motivation'].includes(e.properties.kind))assert.match(bare,/knowledge-information/);
 }
}));
test('Round 2C calculations, dialog mechanics and protected detail modules stay exact',()=>{
 for(const file of ['src/lib/detail-dialog.js','src/lib/bodygraph-detail-layout.js','src/bodygraph.js','src/lib/variable-arrows.js','src/lib/chart-engine/sharp-contract.js','engine-core/TransitCore.cs','src/views/connection.js','src/views/team.js'])assert.equal(hash(readFileSync(new URL('../'+file,import.meta.url))),hash(execFileSync('git',['show','438ad2dc2dfa950eed55687143516051023de824:'+file])),file);
 const renderer=readFileSync(new URL('../src/lib/knowledge/detail-renderer.js',import.meta.url),'utf8');assert.doesNotMatch(renderer,/indexOf\(|includes\('30|match\(.*30|querySelector.*bodygraph/);
 const css=readFileSync(new URL('../src/lib/knowledge/detail-access.css',import.meta.url),'utf8');assert.doesNotMatch(css,/#[a-f0-9]{3,8}\b/i);
});
