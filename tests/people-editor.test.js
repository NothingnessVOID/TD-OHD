import test from 'node:test';
import assert from 'node:assert/strict';
import { saveProfile, getProfile } from '../src/lib/profile-storage.js';
import { peopleChange, randomPersonId } from '../src/lib/person-input.js';
import { createChartDataService } from '../src/lib/chartdata.js';
import { sharpProvider } from '../src/lib/chart-engine/sharp-provider.js';

const birth = { id:'fictional-a', name:'Fictional A', birthDate:'2000-02-15', birthTime:'12:00', timezone:0, timeUnknown:false };
test('same-id edit preserves original createdAt and UTC zero', () => {
  const values = new Map();
  globalThis.localStorage = { getItem:key=>values.get(key) ?? null, setItem:(key,value)=>values.set(key,value) };
  saveProfile({ ...birth, createdAt:'2001-01-01T00:00:00.000Z', location:{timezone:0} });
  saveProfile({ ...birth, name:'Edited', location:{timezone:0} });
  const saved = getProfile(birth.id);
  assert.equal(saved.createdAt,'2001-01-01T00:00:00.000Z');
  assert.equal(saved.id,birth.id);
  assert.equal(saved.location.timezone,0);
});
test('change payload distinguishes presentation from calculation and unknown noon', () => {
  assert.equal(peopleChange('save',birth,{...birth,name:'Other'}).calculationChanged,false);
  assert.equal(peopleChange('save',birth,{...birth,name:'Other'}).presentationChanged,true);
  assert.equal(peopleChange('save',birth,{...birth,timeUnknown:true}).calculationChanged,true);
  assert.equal(peopleChange('delete',birth,null).personId,birth.id);
});
test('invalidated pending failures cannot evict a newer promise', async () => {
  let rejectOld, calls=0;
  const service = createChartDataService({cacheKey:sharpProvider.cacheKey, calculateBirth:()=> {
    calls++;
    return calls===1 ? new Promise((resolve,reject)=>{rejectOld=reject;}) : Promise.resolve({chart:{new:true}});
  }});
  const old = service.computeChart(birth);
  service.invalidateBirth(birth);
  const latest = await service.computeChart(birth);
  rejectOld(new Error('old failure'));
  await assert.rejects(old,/old failure/);
  assert.equal((await service.computeChart({...birth,name:'Other'})).chart,latest.chart);
  assert.equal(calls,2);
});
test('sensitivity and birth caches invalidate together while name-only edits reuse', async () => {
  let calculations = 0, probes = 0;
  const chart = { type:{name:'type'},authority:{name:'authority'},profile:{numbers:'1/3'},definition:'single',gates:{personality:{moon:{gate:1,line:1}}} };
  const service = createChartDataService({cacheKey:sharpProvider.cacheKey,calculateBirth:async()=>{calculations++;return {chart};},calculateBirthAtOffset:async()=>{probes++;return chart;}});
  await service.computeChart(birth);
  await service.computeChart({...birth,name:'Renamed'});
  await service.sensitivityCheck(birth,chart);
  await service.sensitivityCheck({...birth,name:'Renamed'},chart);
  assert.equal(calculations,1);assert.equal(probes,2);
  service.invalidateBirth(birth);
  await service.computeChart(birth);await service.sensitivityCheck(birth,chart);
  assert.equal(calculations,2);assert.equal(probes,4);
});
test('UUID fallback works without randomUUID', () => {
  const original = globalThis.crypto;
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:array=>original.getRandomValues(array)}});
  try { assert.match(randomPersonId(),/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); }
  finally { Object.defineProperty(globalThis,'crypto',{configurable:true,value:original}); }
});
