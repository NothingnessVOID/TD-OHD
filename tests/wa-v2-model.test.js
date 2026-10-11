import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaDraft, validateWaSnapshot, validateWaLayout } from '../src/lib/wa/model.js';
import { prepareWaMembers } from '../src/lib/wa/prepare.js';
import { chart, fixture } from './helpers/wa-fixtures.js';

function peopleFor(snapshot) {
  return new Map(snapshot.members.map(member => [member.personId, { id: member.personId, name: member.labelSnapshot,
    birthDate: '2000-02-29', birthTime: '10:30', timeUnknown: false, location: { timezone: 8 } }]));
}

test('plain JSON walk rejects cycles, unsafe keys, hidden data, nonfinite and nonplain values before Ajv', () => {
  const cycle = {}; cycle.self = cycle;
  const hostile = [null, undefined, NaN, Infinity, 1n, () => {}, new Date(), new Map(), cycle,
    JSON.parse('{"__proto__":{}}'), { constructor: {} }, Object.create({ inherited: true }),
    Object.defineProperty({}, 'hidden', { value: 1 }), { get value() { throw Error('must not run'); } }, [, 1]];
  for (const bad of hostile) {
    assert.equal(validateWaSnapshot(bad).valid, false);
    const snapshot = createWaDraft(); snapshot.extra = bad;
    assert.equal(validateWaSnapshot(snapshot).valid, false);
  }
  const invalid = validateWaLayout(null);
  assert.equal(invalid.canAnalyze, false);
  assert.equal(invalid.participantCount, 0);
  assert.deepEqual(invalid.memberIds, []);
  const draft = createWaDraft(); const copy = structuredClone(draft);
  assert.equal(validateWaSnapshot(draft).valid, true);
  assert.deepEqual(draft, copy);
});

test('saved timestamps require timezone and a real date without repairing history', () => {
  for (const savedAt of ['2026-10-11', '2026-10-11T12:00:00', '2026-02-30T12:00:00Z', 'not a date']) {
    const snapshot = { ...createWaDraft(), revision: 1, revisionId: 'r1', savedAt };
    assert.equal(validateWaSnapshot(snapshot).valid, false, savedAt);
    assert.equal(snapshot.savedAt, savedAt);
  }
  assert.equal(validateWaSnapshot({ ...createWaDraft(), revision: 1, revisionId: 'r1', savedAt: '2026-10-11T12:00:00+08:00' }).valid, true);
});

test('all identity, refs and birth preflight completes before provider; pool never blocks', async () => {
  const { snapshot } = fixture({ pool: 1 }); const people = peopleFor(snapshot);
  let calls = 0;
  const calculateBirth = async () => { calls++; return { chart: chart() }; };
  for (const mutate of [p => { p.timeUnknown = 'false'; }, p => { p.timeUnknown = null; }, p => { delete p.timeUnknown; },
    p => { p.birthDate = '2025-02-29'; }, p => { p.birthTime = ''; }, p => { p.birthTime = '25:00'; },
    p => { p.location.timezone = NaN; }, p => { p.location.timezone = 15; }, p => { delete p.location.timezone; }]) {
    const invalid = structuredClone(people); mutate(invalid.get(snapshot.members[9].personId));
    assert.equal((await prepareWaMembers(snapshot, id => invalid.get(id), calculateBirth)).status, 'not_ready');
    assert.equal(calls, 0);
  }
  for (const mutate of [s => { s.members[9] = null; }, s => { s.members[9].memberId = s.members[0].memberId; },
    s => { s.members[9].personId = s.members[0].personId; }, s => { s.pentas[0].memberIds.push('missing'); }]) {
    const invalid = structuredClone(snapshot); mutate(invalid);
    assert.equal((await prepareWaMembers(invalid, id => people.get(id), calculateBirth)).status, 'layout_not_ready');
    assert.equal(calls, 0);
  }
  people.delete(snapshot.members[10].personId);
  const ready = await prepareWaMembers(snapshot, { getPerson: id => people.get(id), calculateBirth });
  assert.equal(ready.status, 'ready'); assert.equal(calls, 10); assert.equal(ready.members.length, 10);
});

test('explicit unknown alone permits the existing noon estimate; missing time never guessed', async () => {
  const { snapshot } = fixture(); const people = peopleFor(snapshot);
  const person = people.get(snapshot.members[0].personId); person.timeUnknown = true; person.birthTime = null;
  const seen = [];
  const result = await prepareWaMembers(snapshot, id => people.get(id), async birth => { seen.push(birth); return { chart: chart() }; });
  assert.equal(result.status, 'ready'); assert.equal(seen[0].birthTime, '12:00');
  assert.equal(result.members[0].timeUnknown, true); assert.equal(person.birthTime, null);
});

test('provider exceptions and malformed outputs have stable separate codes and no partial results', async () => {
  const { snapshot } = fixture(); const people = peopleFor(snapshot);
  for (const thrown of [null, 'failure', new Error('failure')]) {
    const result = await prepareWaMembers(snapshot, id => people.get(id), async () => { throw thrown; });
    assert.equal(result.status, 'not_ready'); assert.deepEqual(result.members, []);
    assert.ok(result.issues.every(issue => issue.code === 'CHART_CALCULATION_FAILED'));
  }
  for (const output of [null, 'chart', {}, { chart: {} }, { chart: chart([65]) }, { chart: new Date() }]) {
    const result = await prepareWaMembers(snapshot, id => people.get(id), async () => output);
    assert.ok(result.issues.every(issue => issue.code === 'INVALID_PROVIDER_RESULT'));
  }
});
