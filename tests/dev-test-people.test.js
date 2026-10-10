import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importTestPeople } from '../dev/import-test-people.js';
import { saveTeam, getTeam, TEAM_STORAGE_KEY } from '../src/lib/team-repository.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/dev-test-people.json', import.meta.url), 'utf8'));
function makeStore(initial = []) {
  const records = structuredClone(initial);
  return {
    listPeople: () => structuredClone(records),
    savePerson: person => records.push(structuredClone(person))
  };
}

test('ten clearly fictional people have unique IDs and historically matching timezone offsets', () => {
  assert.equal(fixture.fictional, true);
  assert.equal(fixture.people.length, 10);
  assert.equal(new Set(fixture.people.map(p => p.id)).size, 10);
  for (const person of fixture.people) {
    assert.match(person.name, /测试.*虚构/);
    const utc = new Date(Date.parse(`${person.birthDate}T${person.birthTime}:00Z`) - person.timezone * 3_600_000);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: person.location.iana, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(utc).map(part => [part.type, part.value]));
    assert.equal(`${parts.year}-${parts.month}-${parts.day}`, person.birthDate, person.id);
    assert.equal(`${parts.hour}:${parts.minute}`, person.birthTime, person.id);
    assert.ok(Number.isFinite(person.location.lat) && Number.isFinite(person.location.lon));
  }
});

test('fixture import is explicit and repeatable without duplicates', () => {
  const store = makeStore();
  assert.deepEqual(importTestPeople(fixture, store), { added: 10, skipped: 0, total: 10 });
  assert.deepEqual(importTestPeople(fixture, store), { added: 0, skipped: 10, total: 10 });
  assert.deepEqual(store.listPeople(), fixture.people);
});

test('existing people and user-edited fixture records are preserved', () => {
  const existing = [{ id: 'unrelated-test-record', name: 'Preserve me' }, { ...fixture.people[0], name: 'User-edited fixture' }];
  const store = makeStore(existing);
  assert.deepEqual(importTestPeople(fixture, store), { added: 9, skipped: 1, total: 11 });
  assert.deepEqual(store.listPeople().slice(0, 2), existing);
});

test('capacity is checked before any profile is written', () => {
  const existing = Array.from({ length: 41 }, (_, index) => ({ id: `existing-${index}` }));
  const store = makeStore(existing);
  assert.throws(() => importTestPeople(fixture, store), /50-person limit/);
  assert.deepEqual(store.listPeople(), existing);
});

test('all fixture records are validated before the first write', () => {
  const invalid = structuredClone(fixture);
  invalid.people[9].birthDate = '2001-02-29';
  const store = makeStore();
  assert.throws(() => importTestPeople(invalid, store), /Invalid birth date/);
  assert.deepEqual(store.listPeople(), []);
  assert.throws(() => importTestPeople({ ...fixture, fictional: false }, store), /fictional people/);
});

test('all ten fixture people can share one team with two Penta groups of five', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const members = fixture.people.map((person, index) => ({
    memberId: `fixture-member-${index + 1}`, personId: person.id, labelSnapshot: person.name
  }));
  const groups = [0, 5].map((start, index) => ({
    pentaId: `fixture-penta-${index + 1}`, label: `Fictional Penta ${index + 1}`,
    memberIds: members.slice(start, start + 5).map(member => member.memberId)
  }));
  const saved = saveTeam({ name: 'Fictional ten-person team', members, groups }, storage);
  const restored = getTeam(saved.teamId, storage);
  assert.equal(restored.members.length, 10);
  assert.deepEqual(restored.groups.map(group => group.memberIds.length), [5, 5]);
  assert.deepEqual(restored.members.map(member => member.personId), fixture.people.map(person => person.id));
  assert.doesNotMatch(values.get(TEAM_STORAGE_KEY), /birthDate|birthTime|timezone/);
  assert.throws(() => saveTeam({ ...saved, groups: [{ ...groups[0], memberIds: members.slice(0, 6).map(member => member.memberId) }] }, storage),
    error => error.code === 'GROUP_TOO_LARGE');
});

test('an interrupted import can be resumed without rewriting saved records', () => {
  const store = makeStore();
  let written = 0;
  assert.throws(() => importTestPeople(fixture, {
    listPeople: store.listPeople,
    savePerson(person) {
      if (++written === 4) throw new Error('simulated storage failure');
      store.savePerson(person);
    }
  }), /simulated storage failure/);
  assert.equal(store.listPeople().length, 3);
  assert.deepEqual(importTestPeople(fixture, store), { added: 7, skipped: 3, total: 10 });
});
