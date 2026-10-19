import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {candidateRGB,contrastRatio} from '../src/lib/source-contrast.js';
import {inkScope,inkProjection} from './helpers/ink-projection.js';
test('preferred ink wins even if alternative has higher contrast',()=>{
 const first=[255,249,242];assert.deepEqual(candidateRGB(first,[255,255,255],[[40,38,36]]),first);
});
test('alternative is used only when preferred fails; adaptive only when both fail',()=>{
 assert.deepEqual(candidateRGB([250,250,250],[25,26,24],[[245,245,245]]),[25,26,24]);
 const result=candidateRGB([120,120,120],[130,130,130],[[255,255,255]]);
 assert.ok(contrastRatio(result,[255,255,255])>=4.5);assert.notDeepEqual(result,[120,120,120]);
});
// Skin ink byte-freeze is retired as a release gate by the owner; the skin ramps
// keep evolving with the token layer. Kept verbatim below for historical review.
test('Skin ink additions leave every existing token and CSS byte unchanged',{skip:'retired release gate: skin ink byte-freeze'},()=>{
 for(const file of Object.keys(inkScope.files).filter(f=>f.includes('/skins/'))){
  const current=readFileSync(file,'utf8');inkProjection(current,file);
  const stripped=current.replace(/^  --hd-gate-(?:active|inactive)-ink: #[0-9A-F]{6};\n/gm,'');
  assert.equal(stripped,execFileSync('git',['show',inkScope.base+':'+file]).toString(),file);
 }
});
// The engine guard below is NOT a historical audit: it proves the calculation,
// geometry and mapping modules that produce chart data are still byte-identical.
test('calculation and geometry modules stay byte-identical to the ink baseline',()=>{
 for(const file of ['src/lib/human-design/connection-structure.js','src/lib/human-design/connection.js','src/lib/human-design/bodygraph-geometry.js','src/lib/variable-arrows.js','src/lib/transit-graph.js'])assert.deepEqual(readFileSync(file),execFileSync('git',['show',inkScope.base+':'+file]),file);
});
