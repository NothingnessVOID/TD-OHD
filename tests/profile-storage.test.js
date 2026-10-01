import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE_STORAGE_KEY, getProfiles, getProfile, saveProfile, deleteProfile } from '../src/lib/profile-storage.js';

function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key,value) => data.set(key,String(value)), data };
}

test('migration reads the existing birth library without rewriting its records', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage();
  try {
    assert.equal(PROFILE_STORAGE_KEY, ['natal', 'engine', '_profiles'].join(''));
    const existing = [{ id:'legacy', name:'Synthetic', birthDate:'1990-06-15', birthTime:'14:30', timeUnknown:false,
      location:{lat:10,lon:20,timezone:5.5,iana:'Asia/Kolkata',name:'Synthetic'}, cachedData:{ chart:'obsolete' } }];
    const raw = JSON.stringify(existing);
    localStorage.setItem(PROFILE_STORAGE_KEY,raw);
    assert.equal(getProfile('legacy').location.iana,'Asia/Kolkata');
    assert.equal(getProfiles()[0].cachedData,undefined);
    assert.equal(localStorage.getItem(PROFILE_STORAGE_KEY),raw);
    const updated = saveProfile({ ...getProfile('legacy'), name:'Updated', createdAt:'2020-01-01T00:00:00.000Z' });
    assert.equal(updated.id,'legacy');
    assert.equal(getProfiles().length,1);
    assert.equal(updated.createdAt,'2020-01-01T00:00:00.000Z');
    assert.equal(localStorage.data.size,1);
    assert.equal(deleteProfile('missing'),false);
    assert.equal(deleteProfile('legacy'),true);
    assert.deepEqual(getProfiles(),[]);
  } finally { globalThis.localStorage = previous; }
});

test('new birth profiles keep noon unknown-time defaults and the existing library limit', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage();
  try {
    const created = saveProfile({ name:'Synthetic', birthDate:'2000-05-10', timeUnknown:true });
    assert.ok(created.id);
    assert.equal(created.birthTime,'12:00');
    assert.equal(created.timeUnknown,true);
    assert.equal(created.location,null);
    for (let i=1;i<50;i++) saveProfile({ id:`sample-${i}`, birthDate:'2000-05-10' });
    assert.throws(()=>saveProfile({birthDate:'2000-05-10'}),/Maximum of 50/);
    assert.equal(saveProfile({...created,name:'Renamed'}).name,'Renamed');
    assert.equal(getProfiles().length,50);
    localStorage.setItem(PROFILE_STORAGE_KEY,'broken');
    assert.deepEqual(getProfiles(),[]);
  } finally { globalThis.localStorage = previous; }
});
