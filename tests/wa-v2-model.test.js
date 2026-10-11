import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaDraft, validateWaSnapshot, validateWaLayout, updateWaAnnotations, downgradeWaSnapshot, exportWaAnnotations, moveWaMember, removeWaMember, reconcileWaAnnotations } from '../src/lib/wa/model.js';
import { prepareWaMembers } from '../src/lib/wa/prepare.js';
import { chart, fixture } from './helpers/wa-fixtures.js';

function annotations() {
  return { manualCommunicationEdges: [{ edgeId: 'edge-a', fromMemberId: 'm00', toMemberId: 'm01', assignment: 'manual', note: 'human note' }],
    consultation: { assignment: 'manual', origin: 'manual', specificProblem: '', keyAllyIds: ['m00'],
      businessAreas: [{ pentaId: 'g0', workScope: 'delivery', demand: '', requiredSkills: ['recording'] }],
      gapIntents: [{ id: 'intent-stable', pentaId: 'g0', theme: 'handoff', stage: 'wish_list', note: '' }] } };
}

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

test('v1 remains unchanged; annotation adoption explicitly marks v2 and downgrade exports before removal', () => {
  const { snapshot } = fixture(); const original = structuredClone(snapshot);
  assert.equal(snapshot.schema, 'wa-refs-v1');
  const annotated = updateWaAnnotations(snapshot, annotations());
  assert.equal(annotated.schema, 'wa-refs-v2'); assert.deepEqual(snapshot, original);
  assert.equal(validateWaSnapshot({ ...annotated, schema: 'wa-refs-v1' }).valid, false);
  assert.equal(validateWaSnapshot({ ...snapshot, schema: 'wa-refs-v2' }).valid, false);
  assert.throws(() => downgradeWaSnapshot(annotated), { code: 'ANNOTATION_DOWNGRADE_CONFIRMATION_REQUIRED' });
  const exported = exportWaAnnotations(annotated);
  const converted = downgradeWaSnapshot(annotated, { confirmAnnotationRemoval: true });
  assert.deepEqual(converted.snapshot, original); assert.deepEqual(converted.annotations, exported);
  converted.annotations.annotations.consultation.specificProblem = 'changed copy';
  assert.equal(annotated.consultation.specificProblem, '');
  assert.throws(() => updateWaAnnotations(snapshot, { score: 5 }), { code: 'INVALID_ANNOTATION_PATCH' });
});

test('manual schemas reject unknown attrs, pool endpoints/allies, duplicates and unsupported stages', () => {
  const base = updateWaAnnotations(fixture({ pool: 1 }).snapshot, annotations());
  for (const mutate of [
    s => { s.consultation.assignment = 'automatic'; }, s => { s.consultation.origin = 'calculated'; },
    s => { s.consultation.score = 10; }, s => { s.consultation.businessAreas[0].score = 10; },
    s => { s.consultation.businessAreas.push(structuredClone(s.consultation.businessAreas[0])); },
    s => { s.consultation.businessAreas[0].pentaId = 'missing'; },
    s => { s.consultation.gapIntents[0].stage = 'computed'; },
    s => { s.consultation.gapIntents.push(structuredClone(s.consultation.gapIntents[0])); },
    s => { s.consultation.keyAllyIds = ['m10']; }, s => { s.consultation.keyAllyIds = ['m00', 'm00']; },
    s => { s.manualCommunicationEdges[0].fromMemberId = 'm10'; },
    s => { s.manualCommunicationEdges[0].toMemberId = 'm00'; },
    s => { s.manualCommunicationEdges[0].strength = 9; },
    s => { s.manualCommunicationEdges.push({ ...s.manualCommunicationEdges[0], edgeId: 'another' }); }
  ]) {
    const invalid = structuredClone(base); mutate(invalid);
    assert.equal(validateWaSnapshot(invalid).valid, false, mutate.toString());
  }
  const reversed = structuredClone(base);
  reversed.manualCommunicationEdges.push({ ...base.manualCommunicationEdges[0], edgeId: 'reverse', fromMemberId: 'm01', toMemberId: 'm00' });
  assert.equal(validateWaSnapshot(reversed).valid, true);
});

test('moves preserve annotations between groups and require detailed explicit cleanup on participant or Penta removal', () => {
  const base = updateWaAnnotations(fixture({ pool: 1 }).snapshot, annotations());
  base.manualMetadata = { powerBases: [{ memberId: 'm00', assignment: 'manual', label: 'Direction', note: 'keep' }] };
  const moved = moveWaMember(base, 'm01', { pentaId: 'g1' });
  assert.deepEqual(moved.consultation, base.consultation);
  assert.deepEqual(moved.manualCommunicationEdges, base.manualCommunicationEdges);
  for (const action of [() => moveWaMember(base, 'm00', null), () => moveWaMember(base, 'm10', { alpha: true }), () => removeWaMember(base, 'm00')]) {
    assert.throws(action, error => error.code === 'ANNOTATION_CLEANUP_REQUIRED' && error.issues.every(item => item.annotation !== undefined));
  }
  assert.throws(() => removeWaMember(base, 'm00'), error => error.issues.length === 3);
  const removed = removeWaMember(base, 'm00', { confirmAnnotationCleanup: true });
  assert.deepEqual(removed.consultation.keyAllyIds, []); assert.deepEqual(removed.manualCommunicationEdges, []);
  assert.deepEqual(removed.manualMetadata.powerBases, []);
  const groupRemoved = structuredClone(base); groupRemoved.pentas = groupRemoved.pentas.filter(group => group.pentaId !== 'g0');
  assert.throws(() => reconcileWaAnnotations(groupRemoved), { code: 'ANNOTATION_CLEANUP_REQUIRED' });
  const cleaned = reconcileWaAnnotations(groupRemoved, { confirmAnnotationCleanup: true });
  assert.deepEqual(cleaned.consultation.gapIntents, []); assert.deepEqual(cleaned.consultation.businessAreas, []);
  assert.equal(base.consultation.gapIntents[0].id, 'intent-stable');
});
