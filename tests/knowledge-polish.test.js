import {preservedSource} from './helpers/knowledge-release-contract.js';
import {uiKeys} from './helpers/knowledge-round2f-contract.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base='686a5966bd5c36f37dd4a80f5c51786c4f847a31';
test('Knowledge uses the actual shared Back class and no duplicate CSS identity',()=>{
 const controller=file('src/lib/knowledge/detail-controller.js');assert.match(controller,/class="gate-detail-back"/);assert.doesNotMatch(controller+file('src/lib/knowledge/detail-access.css'),/knowledge-back/);
 assert.match(file('src/styles.css'),/:has\(\.gate-detail-back\) \.gate-detail-body > \.knowledge-detail > \.detail-name/);
});
test('final approved shared styles retain primitives and title avoidance',()=>{
 assert.equal(file('src/styles.css'),preservedSource('src/styles.css',base).toString());
 assert.match(file('src/styles.css'),/\.ui-back-button/);
 assert.match(file('src/styles.css'),/\.ui-icon-button/);
});
test('Cross Panel uses one Basics button while preserving Gate wiring and no inline basics',()=>{
 const s=file('src/views/chart.js').split('function renderCrossPanel')[1].split('export function getCurrentChart')[0];assert.match(s,/data-cross-basics/);assert.match(s,/openKnowledgeDetail\(\{objectType:'cross',objectId:'introduction'\}\)/);assert.doesNotMatch(s,/getKnowledgeSummary|\.summary|\.detail/);assert.match(s,/wireRowHover\(item, parseInt\(item.dataset.gate\)\)/);
});
test('only confirmed dead Cross UI keys are removed in each independent locale',()=>{
 const keys=['Shared Cross introduction','Specific Cross detail is unavailable.','View Cross introduction in the library'];for(const l of ['zh-CN','zh-Hant']){const p=`src/locales/${l}/ui-chart.json`,before=JSON.parse(execFileSync('git',['show',base+':'+p]));for(const k of keys)delete before[k];const now=JSON.parse(file(p));for(const k of uiKeys){assert.ok(now[k]);delete now[k];}assert.deepEqual(now,before);}
});
test('Knowledge hover uses accent-soft with no box-model changes',()=>{
 const css=file('src/lib/knowledge/detail-access.css');assert.match(css,/\.knowledge-trigger:hover \{ background-color: var\(--accent-soft\); \}/);assert.match(css,/\.knowledge-trigger:focus-visible \{ outline: 2px solid var\(--accent\)/);
 for(const m of css.matchAll(/\.knowledge-trigger[^}]+}/g))assert.doesNotMatch(m[0],/padding:|width:|height:|transform:/);
});
test('Cross activation drill-down preserves source identity and reuses the existing Gate renderer',()=>{
 const renderer=file('src/lib/knowledge/detail-renderer.js'),controller=file('src/lib/knowledge/detail-controller.js'),chart=file('src/views/chart.js');
 assert.match(renderer,/button type="button" class="knowledge-activation knowledge-activation-link"/);assert.match(renderer,/data-source-side/);assert.match(renderer,/data-source-planet/);assert.match(renderer,/aria-label/);
 assert.match(controller,/ohd-open-knowledge-gate/);assert.doesNotMatch(controller,/from .*chart/);assert.match(chart,/showGateDetail\(gate, false, source\)/);assert.match(chart,/prev.kind === 'knowledge'/);
 const before=execFileSync('git',['show',base+':src/views/chart.js']).toString();const extract=s=>s.slice(s.indexOf('function goBack()'),s.indexOf('function detailNav()')).split('// Thin Knowledge')[0].trim();
 assert.equal(extract(chart).replace(/  if \(prev.kind === 'knowledge'\) \{[\s\S]*?\n  else if \(prev.kind === 'planet'\)/,"  if (prev.kind === 'planet')"),extract(before));
});
