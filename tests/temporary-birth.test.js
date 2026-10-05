import test from 'node:test';
import assert from 'node:assert/strict';
import { validTemporaryBirth, saveTemporaryBirth } from '../src/lib/temporary-birth.js';
import { savePerson, listPeople, onPeopleChange } from '../src/lib/people.js';
const birth = { name: 'Synthetic Example', birthDate: '1990-01-01', birthTime: '12:00', timezone: 8,
  location: { lat: 31.2, lon: 121.5, iana: 'Asia/Shanghai', name: 'Shanghai' } };

test('only explicit named and valid births may be auto-saved', () => {
  assert.equal(validTemporaryBirth(birth), true);
  for (const invalid of [{name:''},{name:'Person B'},{birthDate:'2023-02-29'}, {birthTime:''}, {birthTime:'25:00'}, {timezone:undefined}])
    assert.equal(validTemporaryBirth({ ...birth, ...invalid }), false);
});
test('Connection and Team share a single deduplicating PeopleStore seam', () => {
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  let changes = 0; const off = onPeopleChange(() => changes++);
  try {
    const first = saveTemporaryBirth(birth);
    const repeated = saveTemporaryBirth({ ...birth, location: { ...birth.location, name: 'Shanghai, China' } });
    assert.equal(first.id, repeated.id);
    assert.equal(listPeople().length, 1);
    assert.equal(repeated.location.iana, 'Asia/Shanghai');
    assert.equal(repeated.location.timezone, 8);
    assert.equal(repeated.location.name, 'Shanghai, China');
    assert.equal(changes, 2);
    assert.equal(saveTemporaryBirth({ ...birth, location: null }).id, first.id);
    assert.equal(listPeople()[0].location.iana, 'Asia/Shanghai', 'manual reentry retains existing place metadata');
    assert.equal(saveTemporaryBirth({ ...birth, name: '' }), null);
    assert.equal(listPeople().length, 1);
    assert.ok(savePerson({ ...birth, name: 'Another person' }));
    assert.equal(listPeople().length, 2);
    assert.notEqual(saveTemporaryBirth({ ...birth, birthTime: '12:00:59' }).id, first.id, 'distinct seconds are not silently merged');
  } finally { off(); delete globalThis.localStorage; }
});
