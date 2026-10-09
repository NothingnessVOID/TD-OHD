import test from 'node:test';
import assert from 'node:assert/strict';
import { createMember, validateBirth, addSavedMember, TeamMemberError } from '../src/lib/human-design/team-members.js';
import { TEAM_STORAGE_KEY, TEAM_STORAGE_VERSION, TeamRepositoryError, listTeams, getTeam, saveTeam, deleteTeam } from '../src/lib/team-repository.js';

const birth = { birthDate: '2000-02-29', birthTime: '00:00', timezone: 0 };
const person = { id: 'person-a', name: 'Same name', ...birth };
const member = () => createMember({ memberId: 'member-a', personId: person.id, displayName: person.name, origin: 'saved' });
const storage = () => {
  const data = new Map([['natalengine_profiles', 'untouched'], ['ohd-last-person-id', 'person-a']]);
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
const code = expected => error => error.code === expected;

test('member relationships have stable independent ids and explicit origins', () => {
  const a = createMember({ personId: 'a', displayName: ' Name ', origin: 'saved' });
  const b = createMember({ personId: 'a', displayName: 'Name', origin: 'saved' });
  assert.notEqual(a.memberId, b.memberId);
  assert.notEqual(a.memberId, a.personId);
  assert.equal(a.displayName, 'Name');
  assert.equal(createMember({ ...a, displayName: 'Renamed' }).memberId, a.memberId);
  assert.equal(createMember({ displayName: 'Temporary', origin: 'quick' }).personId, null);
  for (const [patch, expected] of [[{ personId: null }, 'INVALID_PERSON_ID'], [{ personId: '' }, 'INVALID_PERSON_ID'],
    [{ displayName: ' ' }, 'INVALID_DISPLAY_NAME'], [{ origin: 'other' }, 'INVALID_ORIGIN'], [{ memberId: '' }, 'INVALID_MEMBER_ID']]) {
    assert.throws(() => createMember({ ...member(), ...patch }), error => error instanceof TeamMemberError && error.code === expected);
  }
});

test('birth validation rejects normalization, seconds, coercion and absent timezone; zero is valid', () => {
  for (const patch of [{}, { timezone: -14 }, { timezone: 14 }, { timezone: 5.75 }, { birthDate: '0001-01-01' },
    { birthDate: '2400-02-29' }, { birthTime: '23:59' }]) assert.equal(validateBirth({ ...birth, ...patch }), true);
  for (const value of [null, undefined, [], {}, ...[
    { birthDate: '1900-02-29' }, { birthDate: '2023-02-29' }, { birthDate: '2024-04-31' }, { birthDate: '2024-00-01' },
    { birthDate: '2024-13-01' }, { birthDate: '2024-01-00' }, { birthDate: '0000-01-01' }, { birthDate: '2024-2-01' },
    { birthDate: '2024-01-01junk' }, { birthDate: '2024-01-01\n' }, { birthTime: '00:00\n' }, { birthTime: '24:00' }, { birthTime: '12:60' }, { birthTime: '1:00' },
    { birthTime: '12:00:00' }, { birthTime: '' }, { birthTime: undefined, timeUnknown: true },
    { timezone: undefined }, { timezone: null }, { timezone: '' }, { timezone: '0' }, { timezone: false },
    { timezone: NaN }, { timezone: Infinity }, { timezone: -14.01 }, { timezone: 14.01 }
  ].map(patch => ({ ...birth, ...patch }))]) assert.equal(validateBirth(value), false, JSON.stringify(value));
});

test('adding saved members uses id alone, validates real birth data and never mutates input', () => {
  const initial = Object.freeze([]);
  const first = addSavedMember(initial, person);
  assert.equal(initial.length, 0);
  assert.equal(first[0].personId, person.id);
  assert.throws(() => addSavedMember(first, { ...person, name: 'Changed' }), code('DUPLICATE_PERSON_ID'));
  const second = addSavedMember(first, { ...person, id: 'person-b' });
  assert.equal(second.length, 2);
  assert.notEqual(second[0].memberId, second[1].memberId);
  assert.equal(first.length, 1);
  assert.equal(addSavedMember([], { ...person, timezone: undefined, location: { timezone: 0 } }).length, 1);
  assert.throws(() => addSavedMember([], { ...person, birthTime: '12:00:00' }), code('INVALID_BIRTH'));
  assert.throws(() => addSavedMember([], { ...person, id: null }), code('INVALID_PERSON_ID'));
  assert.throws(() => addSavedMember(null, person), code('INVALID_MEMBERS'));
  assert.throws(() => addSavedMember([{ ...member(), memberId: undefined }], person), code('INVALID_MEMBERS'));
});

test('versioned repository CRUD preserves relationship ids and isolates all other keys', () => {
  const store = storage();
  assert.deepEqual(listTeams(store), []);
  assert.equal(getTeam('missing', store), null);
  assert.equal(deleteTeam('missing', store), false);
  const saved = saveTeam({ name: ' Team ', members: [{ ...member(), chart: { secret: true }, birth }] }, store);
  assert.ok(saved.teamId);
  assert.equal(saved.name, 'Team');
  assert.equal(saved.revision, 1);
  assert.equal(saved.schemaVersion, 1);
  assert.equal(saved.kind, 'penta');
  assert.deepEqual(saved.members, [{ memberId: 'member-a', personId: person.id, labelSnapshot: person.name }]);
  assert.equal(JSON.parse(store.data.get(TEAM_STORAGE_KEY)).version, TEAM_STORAGE_VERSION);
  saved.members[0].labelSnapshot = 'Mutated caller';
  assert.equal(getTeam(saved.teamId, store).members[0].labelSnapshot, person.name);
  const updated = saveTeam({ ...getTeam(saved.teamId, store), name: 'Renamed' }, store);
  assert.equal(updated.revision, 2);
  assert.equal(updated.createdAt, saved.createdAt);
  assert.equal(updated.members[0].memberId, 'member-a');
  assert.equal(listTeams(store).length, 1);
  assert.throws(() => saveTeam({ ...updated, revision: 1 }, store), code('REVISION_CONFLICT'));
  assert.equal(deleteTeam(saved.teamId, store), true);
  assert.equal(deleteTeam(saved.teamId, store), false);
  assert.deepEqual(listTeams(store), []);
  assert.equal(store.data.get('natalengine_profiles'), 'untouched');
  assert.equal(store.data.get('ohd-last-person-id'), 'person-a');
  assert.equal(store.data.size, 3);
});

test('invalid teams and unsaved members fail before storage mutation', () => {
  const store = storage();
  for (const [input, expected] of [[null, 'INVALID_TEAM'], [{ name: ' ', members: [] }, 'INVALID_TEAM'],
    [{ name: 'T', members: null }, 'INVALID_TEAM'], [{ name: 'T', members: [{ ...member(), memberId: undefined }] }, 'INVALID_TEAM'],
    [{ name: 'T', members: [createMember({ origin: 'quick', displayName: 'Quick' })] }, 'UNSAVED_MEMBER'],
    [{ name: 'T', members: [member(), member()] }, 'DUPLICATE_MEMBER_ID'],
    [{ name: 'T', members: [member(), { ...member(), memberId: 'other' }] }, 'DUPLICATE_PERSON_ID']]) {
    assert.throws(() => saveTeam(input, store), error => error instanceof TeamRepositoryError && error.code === expected);
  }
  assert.equal(store.data.has(TEAM_STORAGE_KEY), false);
  for (const operation of [getTeam, deleteTeam]) assert.throws(() => operation('', store), code('INVALID_TEAM_ID'));
});

test('corruption and unsupported versions are explicit errors and never overwritten', () => {
  const store = storage();
  const valid = saveTeam({ name: 'T', members: [member()] }, store);
  for (const [raw, expected] of [['broken', 'CORRUPT_STORAGE'], ['null', 'CORRUPT_STORAGE'],
    ['[]', 'CORRUPT_STORAGE'], [JSON.stringify({ version: 2, teams: [] }), 'UNSUPPORTED_VERSION'],
    [JSON.stringify({ version: 1, teams: {} }), 'CORRUPT_STORAGE'],
    [JSON.stringify({ version: 1, teams: [{ ...valid, schemaVersion: 2 }] }), 'UNSUPPORTED_VERSION'],
    [JSON.stringify({ version: 1, teams: [{ ...valid, kind: 'wa' }] }), 'CORRUPT_STORAGE'],
    [JSON.stringify({ version: 1, teams: [{ ...valid, members: null }] }), 'CORRUPT_STORAGE'],
    [JSON.stringify({ version: 1, teams: [valid, valid] }), 'CORRUPT_STORAGE']]) {
    store.data.set(TEAM_STORAGE_KEY, raw);
    for (const operation of [() => listTeams(store), () => getTeam(valid.teamId, store),
      () => saveTeam({ name: 'New', members: [] }, store), () => deleteTeam(valid.teamId, store)]) {
      assert.throws(operation, code(expected));
      assert.equal(store.data.get(TEAM_STORAGE_KEY), raw);
    }
  }
});

test('storage absence, denied reads, denied writes and quota failure stay explicit', () => {
  assert.throws(() => listTeams(null), code('STORAGE_UNAVAILABLE'));
  assert.throws(() => listTeams({ getItem() { throw new Error('Denied'); }, setItem() {} }), code('STORAGE_READ_FAILED'));
  const store = storage();
  const saved = saveTeam({ name: 'T', members: [member()] }, store);
  const raw = store.data.get(TEAM_STORAGE_KEY);
  const denied = { getItem: store.getItem, setItem() { throw new Error('Quota exceeded'); } };
  assert.throws(() => saveTeam({ ...saved, name: 'Changed' }, denied), code('STORAGE_WRITE_FAILED'));
  assert.throws(() => deleteTeam(saved.teamId, denied), code('STORAGE_WRITE_FAILED'));
  assert.equal(store.data.get(TEAM_STORAGE_KEY), raw);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
    assert.throws(() => listTeams(), code('STORAGE_UNAVAILABLE'));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
