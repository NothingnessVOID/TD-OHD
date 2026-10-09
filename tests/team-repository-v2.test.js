import test from 'node:test';
import assert from 'node:assert/strict';
import { saveTeam, getTeam, listTeams, deleteTeam, TEAM_STORAGE_KEY, TeamRepositoryError } from '../src/lib/team-repository.js';

const person = n => ({ memberId: `member-${n}`, personId: `person-${n}`, labelSnapshot: `Name ${n}` });
function storage(initial) {
  const values = new Map(initial ? [[TEAM_STORAGE_KEY, JSON.stringify(initial)]] : []);
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
const group = (name, ids) => ({ pentaId: `penta-${name}`, label: name, memberIds: ids.map(n => `member-${n}`) });
const code = expected => error => error instanceof TeamRepositoryError && error.code === expected;

test('Team holds eight members; 3+3, 3+4, 4+4 and 3+5 groups persist without copying birth data', () => {
  for (const [first, second] of [[3, 3], [3, 4], [4, 4], [3, 5]]) {
    const store = storage();
    const team = saveTeam({ name: 'Pool', members: Array.from({ length: 8 }, (_, n) => ({ ...person(n), birthDate: '1980-01-01', chart: {} })),
      groups: [group('A', Array.from({ length: first }, (_, n) => n)), group('B', Array.from({ length: second }, (_, n) => n + first))] }, store);
    assert.equal(team.schemaVersion, 2);
    assert.deepEqual(getTeam(team.teamId, store).groups.map(g => g.memberIds.length), [first, second]);
    assert.equal(listTeams(store)[0].members.length, 8);
    assert.doesNotMatch(store.values.get(TEAM_STORAGE_KEY), /birthDate|chart|planet/);
    assert.throws(() => saveTeam({ ...team, revision: 0 }, store), code('REVISION_CONFLICT'));
    assert.equal(deleteTeam(team.teamId, store), true);
  }
});

test('drafts and ungrouped members persist; invalid references and overlapping assignments cannot be saved', () => {
  const store = storage();
  const members = Array.from({ length: 8 }, (_, n) => person(n));
  const draft = saveTeam({ name: 'Draft', members, groups: [group('A', [0, 1])] }, store);
  assert.equal(draft.groups[0].memberIds.length, 2);
  assert.equal(draft.members.length, 8);
  for (const [groups, expected] of [
    [[group('A', [0, 1, 2]), group('B', [2, 3, 4])], 'DUPLICATE_GROUP_ASSIGNMENT'],
    [[group('A', [0, 1, 2, 3, 4, 5])], 'GROUP_TOO_LARGE'],
    [[group('A', [99])], 'UNKNOWN_GROUP_MEMBER'],
  ]) assert.throws(() => saveTeam({ ...draft, groups }, store), code(expected));
  assert.equal(getTeam(draft.teamId, store).groups[0].memberIds.length, 2);
});

test('v1 envelope migrates atomically to v2 and retains memberId, revision and untouched source data', () => {
  const now = '2026-01-01T00:00:00.000Z';
  const old = { schemaVersion: 1, kind: 'penta', teamId: 'legacy', name: 'Old team', members: Array.from({ length: 8 }, (_, n) => person(n)), revision: 3, createdAt: now, updatedAt: now };
  const store = storage({ version: 1, teams: [old] });
  const migrated = getTeam('legacy', store);
  assert.deepEqual(migrated.members.map(m => m.memberId), old.members.map(m => m.memberId));
  assert.deepEqual(migrated.groups[0].memberIds, old.members.slice(0, 5).map(m => m.memberId));
  assert.equal(migrated.revision, 3);
  assert.equal(JSON.parse(store.values.get(TEAM_STORAGE_KEY)).version, 2);
  const copy = JSON.parse(store.values.get(TEAM_STORAGE_KEY));
  const failure = storage({ version: 1, teams: [old] });
  const original = failure.values.get(TEAM_STORAGE_KEY);
  failure.setItem = () => { throw new Error('quota'); };
  assert.throws(() => listTeams(failure), code('STORAGE_WRITE_FAILED'));
  assert.equal(failure.values.get(TEAM_STORAGE_KEY), original);
  assert.equal(copy.teams[0].groups.length, 1);
});

test('malformed v1 members or unknown envelope versions retain original bytes', () => {
  for (const value of [{ version: 1, teams: [{ schemaVersion: 1 }] }, { version: 9, teams: [] }]) {
    const store = storage(value);
    const before = store.values.get(TEAM_STORAGE_KEY);
    assert.throws(() => listTeams(store));
    assert.equal(store.values.get(TEAM_STORAGE_KEY), before);
  }
});
