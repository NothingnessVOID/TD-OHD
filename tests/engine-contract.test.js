import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEngineAPI } from '../src/lib/engine/api.js';
import { normalizeChartInput, engineCacheKey, BODY_ORDER, createChartResult } from '../src/lib/engine/contract.js';
const iso='2005-07-20T21:40:00.000Z';
const identity=id=>({id,engineSignature:id==='modern'?'modern-signature':'historical-signature'});
const value=id=>({raw:{personality:Object.fromEntries(BODY_ORDER.map(b=>[b,{longitude:1,gate:1,line:1,color:1,tone:1,base:1}])),design:Object.fromEntries(BODY_ORDER.map(b=>[b,{longitude:1,gate:1,line:1,color:1,tone:1,base:1}])),type:'Reflector',authority:'Lunar',definition:'Empty',profile:'1 / 3',incarnationCross:'fixture',channels:[],centers:{Crown:'None'}},chart:{type:{strategy:'Wait a Lunar Cycle'}},engineIdentity:identity(id)});

test('contract reuses existing resolved location IANA and remains idempotent',()=>{
  const input=normalizeChartInput({date:'2005-07-20',time:'22:40',location:{iana:'Europe/London',name:'London'}});
  assert.equal(input.utc,iso);assert.equal(input.timezone,1);assert.equal(input.precision,'minute');
  assert.deepEqual(normalizeChartInput(input),input);
  assert.throws(()=>normalizeChartInput({...input,timezone:2}),/disagrees/);
});
test('precision records source accuracy and never rounds the resolved instant',()=>{
  const input=normalizeChartInput({utc:'2025-01-01T00:00:37.123Z',precision:'minute'});
  assert.equal(input.utc,'2025-01-01T00:00:37.123Z');assert.equal(input.precision,'minute');
  assert.throws(()=>normalizeChartInput({utc:iso,precision:'guess'}),/precision/);
  assert.equal(normalizeChartInput({date:'2005-07-20',timeUnknown:true,timezone:1}).birthTime,'12:00');
});
test('unified API defaults to Modern and both routes to two independent providers',async()=>{
  const calls=[];
  const providers=Object.fromEntries(['modern','jovian-compatible'].map(id=>[id,{id,async calculate(input){calls.push([id,input.utc]);return value(id);}}]));
  const {calculate}=createEngineAPI(providers);
  assert.equal((await calculate(iso)).engineId,'modern');
  const result=await calculate(iso,{engine:'both'});
  assert.equal(result.modern.engineId,'modern');assert.equal(result.jovianCompatible.engineId,'jovian-compatible');
  assert.notEqual(result.modern,result.jovianCompatible);assert.notEqual(result.modern.raw,result.jovianCompatible.raw);
  assert.deepEqual(calls,[['modern',iso],['modern',iso],['jovian-compatible',iso]]);
});
test('missing or misidentified provider never falls back',async()=>{
  const api=createEngineAPI({modern:{id:'modern',async calculate(){return value('jovian-compatible');}}});
  await assert.rejects(api.calculate(iso),/identity/);
  await assert.rejects(api.calculate(iso,{engine:'jovian-compatible'}),/unavailable/);
  await assert.rejects(api.calculate(iso,{engine:'misspelled'}),/Unknown engine/);
});
test('future cache keys isolate both engine id and signature and civil context',()=>{
  const input={utc:iso};
  const modern=identity('modern'),legacy=identity('jovian-compatible');
  assert.notEqual(engineCacheKey(modern,input),engineCacheKey(legacy,input));
  assert.notEqual(engineCacheKey(modern,input),engineCacheKey({...modern,engineSignature:'revision2'},input));
  const civil=normalizeChartInput({date:'2005-07-20',time:'22:40',timezone:1});
  assert.notEqual(engineCacheKey(modern,input),engineCacheKey(modern,civil));
});
test('contract rejects partial activations and retains all fine fields without copying mechanics',()=>{
  const birth=normalizeChartInput(iso),r=value('modern');
  const result=createChartResult(r,birth,'modern');
  assert.equal(result.raw,r.raw);assert.equal(result.chart,r.chart);
  delete r.raw.design.pluto;
  assert.throws(()=>createChartResult(r,birth,'modern'),/13 design/);
  const malformed=value('modern');malformed.raw.personality.sun.color=0;
  assert.throws(()=>createChartResult(malformed,birth,'modern'),/color/);
});
test('shared contract has no Node, Python or Swiss runtime dependency',()=>{
  for(const file of ['contract.js','api.js']){
    const source=readFileSync(new URL('../src/lib/engine/'+file,import.meta.url),'utf8');
    assert.doesNotMatch(source,/from ['"]node:|child_process|native_backend\.py|birth-engine-providers/);
  }
});
