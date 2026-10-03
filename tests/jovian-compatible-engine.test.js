import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolvePrototypeBirth, BirthEnginePrototype } from '../scripts/lib/birth-engine-prototype.mjs';
import { ENGINE_SIGNATURE } from '../src/lib/chart-engine/engine-identity.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('isolated prototype resolves the same UTC for numeric offset and IANA zones',()=>{
  const expected='2005-07-20T21:40:00.000Z';
  for(const input of [
    {utc:'2005-07-20T21:40:00Z'},
    {date:'2005-07-21',time:'05:40',timezone:8},
    {date:'2005-07-20',time:'16:40',timezone:-5},
    {date:'2005-07-21',time:'05:40',timeZone:'Asia/Shanghai'},
    {date:'2005-07-21',time:'05:40',timeZone:'Asia/Singapore'},
    {date:'2005-07-20',time:'22:40',timeZone:'Europe/London'}
  ]) assert.equal(resolvePrototypeBirth(input).utc,expected);
});
test('DST gap and fold are explicit and no solar-time correction is applied',()=>{
  assert.throws(()=>resolvePrototypeBirth({date:'2025-03-30',time:'01:30',timeZone:'Europe/London'}),/DST gap/);
  const input={date:'2025-10-26',time:'01:30',timeZone:'Europe/London'};
  assert.equal(Date.parse(resolvePrototypeBirth({...input,fold:1}).utc)-Date.parse(resolvePrototypeBirth(input).utc),3600000);
  assert.equal(resolvePrototypeBirth({date:'2000-02-03',time:'04:05',timezone:8,longitude:121}).utc,resolvePrototypeBirth({date:'2000-02-03',time:'04:05',timezone:8,longitude:-3}).utc);
});
test('invalid inputs and unknown engines fail instead of silently falling back',async()=>{
  assert.throws(()=>resolvePrototypeBirth({utc:'2025-01-01T12:00:00'}),/explicit zone/);
  assert.throws(()=>resolvePrototypeBirth({utc:'2025-02-30T12:00:00Z'}),/Invalid birth date/);
  assert.throws(()=>resolvePrototypeBirth({date:'2025-02-30',time:'12:00',timezone:0}),/Invalid date/);
  const client=new BirthEnginePrototype();
  await assert.rejects(client.calculate({utc:'2025-01-01T00:00Z'},{engine:'typo'}),/Unknown engine/);
});
test('production provider has no dependency on the experimental selector',()=>{
  for(const file of ['src/lib/chart-engine/index.js','src/lib/chart-engine/sharp-provider.js','engine-wasm/Program.cs']){
    assert.doesNotMatch(read(file),/jovian-compatible|BirthEnginePrototype|HistoricalC2Backend/);
  }
  assert.equal(ENGINE_SIGNATURE,'59b90e629033cc7faf95');
  assert.match(read('jovian-engine/mechanics/Program.cs'),/new HumanDesignChart/);
  assert.match(read('jovian-engine/mechanics/Program.cs'),/TransitCore.SerializeBirth/);
  assert.doesNotMatch(read('jovian-engine/mechanics/JovianMechanics.csproj'),/ProjectReference|SwissEph/);
  assert.match(read('jovian-engine/mechanics/JovianMechanics.csproj'),/Compile Include="\.\.\/\.\.\/engine-core\/TransitCore.cs"/);
});
test('external astronomy uses actual historical files, not research fixture lookups',()=>{
  const source=read('jovian-engine/native_backend.py');
  assert.doesNotMatch(source,/golden-cases|official-results|predictions-sealed/);
  assert.match(source,/swe_calc_ut/);
  assert.match(source,/swe_calc/);
  assert.doesNotMatch(source,/longitudeOffset|epsilon\s*=/);
  const manifest=JSON.parse(read('jovian-engine/native-assets.json'));
  assert.equal(manifest.sourceVersion,'1.76.00');
  assert.equal(manifest.flags,258);
  assert.equal(manifest.assets.length,3);
  for(const asset of manifest.assets){assert.match(asset.sha256,/^[a-f0-9]{64}$/);assert.equal(asset.redistributed,false);}
});
