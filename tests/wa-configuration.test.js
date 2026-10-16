import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaDraft, updateWaAnnotations } from '../src/lib/wa/model.js';
import { ensureWaComposerSlots, replaceWaSelection, waPersonIdsFromTeamGroup } from '../src/lib/wa/configuration.js';

const people = new Map(Array.from({ length: 9 }, (_, index) => [`fictional-${index}`, {
  id: `fictional-${index}`, name: `Fictional composer ${index}`, birthDate: '1990-01-01',
  birthTime: '12:00', chart: { forbidden: true }, location: { fictional: true }
}]));
const personIds = [...people.keys()];
const groupPatch = (snapshot, index, ids) => ({ groups: [{ pentaId: snapshot.pentas[index].pentaId, personIds: ids }] });
const select = (snapshot, index, ids, options) => replaceWaSelection(snapshot, groupPatch(snapshot, index, ids), people, options);

function annotated() {
  let snapshot = createWaDraft();
  snapshot = select(snapshot, 0, personIds.slice(0, 2));
  snapshot = replaceWaSelection(snapshot, { alphaPersonId: personIds[2] }, people);
  snapshot.manualMetadata = { notes: 'Fictional historical note', powerBases: [{ memberId: snapshot.members[0].memberId, label: 'Fictional powerbase', assignment: 'manual', note: 'Keep pool metadata' }] };
  return updateWaAnnotations(snapshot, {
    manualCommunicationEdges: [{ edgeId: 'fictional-edge', fromMemberId: snapshot.members[0].memberId, toMemberId: snapshot.alphaId, assignment: 'manual', label: 'Fictional contact', note: 'Full note retained in before snapshot' }],
    consultation: { assignment: 'manual', origin: 'manual', keyAllyIds: [snapshot.members[0].memberId], specificProblem: 'Keep hidden text', businessAreas: [{ pentaId: snapshot.pentas[0].pentaId, workScope: 'Fictional scope', demand: '', requiredSkills: [] }], gapIntents: [{ id: 'fictional-gap', pentaId: snapshot.pentas[0].pentaId, theme: 'Keep intention', stage: 'wish_list', note: '' }] }
  });
}

test('zero/one/two people and optional Alpha are valid atomic drafts with stable Wa identities', () => {
  const original = createWaDraft();
  const saved = structuredClone(original);
  const one = select(original, 0, [personIds[0]]);
  const two = select(one, 0, personIds.slice(0, 2));
  assert.equal(two.pentas[0].memberIds.length, 2);
  assert.equal(two.members[0].memberId, one.members[0].memberId);
  const cleared = select(two, 0, []);
  assert.equal(cleared.pentas[0].memberIds.length, 0);
  assert.deepEqual(cleared.members, two.members, 'unassigned stock stays in the pool');
  assert.equal(select(cleared, 0, [personIds[0]]).members[0].memberId, one.members[0].memberId);
  assert.equal(cleared.alphaId, null);
  assert.deepEqual(original, saved);
  for (const ref of two.members) assert.deepEqual(Object.keys(ref).sort(), ['labelSnapshot', 'memberId', 'personId']);
  assert.ok(!JSON.stringify(two).includes('birthDate'));
  assert.ok(!JSON.stringify(two).includes('forbidden'));
});

test('saved Team mapper resolves each group by personId; never copies Team member IDs', () => {
  const team = { members: personIds.slice(0, 3).map((personId, index) => ({ memberId: `team-member-${index}`, personId })),
    groups: [{ pentaId: 'team-group-one', memberIds: ['team-member-0'] }, { pentaId: 'team-group-two', memberIds: ['team-member-1', 'team-member-2'] }] };
  const ids = waPersonIdsFromTeamGroup(team, 'team-group-two');
  assert.deepEqual(ids, personIds.slice(1, 3));
  const next = select(createWaDraft(), 0, ids);
  assert.ok(next.members.every(member => !member.memberId.startsWith('team-member-')));
  assert.deepEqual(select(next, 0, ids), next, 're-importing into same target is stable');
  team.groups[0].memberIds.push('team-member-0');
  assert.throws(() => waPersonIdsFromTeamGroup(team, 'team-group-one'), { code: 'DUPLICATE_PERSON_ID' });
});

test('conflicts and oversize selections reject atomically without moving existing assignments', () => {
  let snapshot = select(createWaDraft(), 0, personIds.slice(0, 2));
  snapshot = replaceWaSelection(snapshot, { alphaPersonId: personIds[2] }, people);
  const original = structuredClone(snapshot);
  assert.throws(() => select(snapshot, 1, [personIds[0]]), { code: 'SELECTION_CONFLICT' });
  assert.throws(() => select(snapshot, 1, [personIds[2]]), { code: 'SELECTION_CONFLICT' });
  assert.throws(() => replaceWaSelection(snapshot, { alphaPersonId: personIds[0] }, people), { code: 'SELECTION_CONFLICT' });
  assert.throws(() => select(snapshot, 0, personIds.slice(0, 6)), { code: 'GROUP_TOO_LARGE' });
  assert.throws(() => select(snapshot, 0, [personIds[0], personIds[0]]), { code: 'DUPLICATE_PERSON_ID' });
  assert.throws(() => select(snapshot, 1, ['missing-fictional']), { code: 'MISSING_PERSON_REFERENCE' });
  assert.deepEqual(snapshot, original);
});

test('old one/two group layouts fill only missing roles and preserve IDs and metadata', () => {
  for (const count of [1, 2]) {
    const snapshot = annotated();
    snapshot.pentas = snapshot.pentas.slice(0, count);
    const before = structuredClone(snapshot);
    const next = ensureWaComposerSlots(snapshot);
    assert.equal(next.pentas.length, 3);
    assert.deepEqual(next.pentas.slice(0, count), before.pentas);
    assert.deepEqual(next.consultation, before.consultation);
    assert.deepEqual(next.manualMetadata, before.manualMetadata);
    assert.deepEqual(snapshot, before);
    assert.deepEqual(ensureWaComposerSlots(next), next);
  }
});

test('hidden annotations survive harmless edits; participant removal needs explicit cleanup despite retained pool', () => {
  const snapshot = annotated(), before = structuredClone(snapshot);
  const renamed = replaceWaSelection(snapshot, { title: 'Fictional renamed org', groups: [{ pentaId: snapshot.pentas[0].pentaId, personIds: personIds.slice(0, 2), title: 'Fictional renamed group' }] }, people);
  assert.deepEqual(renamed.manualCommunicationEdges, snapshot.manualCommunicationEdges);
  assert.deepEqual(renamed.consultation, snapshot.consultation);
  assert.throws(() => select(snapshot, 0, [personIds[1]]), error => {
    assert.equal(error.code, 'ANNOTATION_CLEANUP_REQUIRED');
    assert.deepEqual(error.issues.map(item => item.code).sort(), ['ALLY_NOT_PARTICIPANT', 'MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT']);
    assert.equal(error.issues.find(item => item.code === 'MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT').annotation.note, 'Full note retained in before snapshot');
    return true;
  });
  const next = select(snapshot, 0, [personIds[1]], { confirmAnnotationCleanup: true });
  assert.deepEqual(next.members, before.members);
  assert.deepEqual(next.manualCommunicationEdges, []);
  assert.deepEqual(next.consultation.keyAllyIds, []);
  assert.equal(next.consultation.specificProblem, 'Keep hidden text');
  assert.deepEqual(next.consultation.gapIntents, before.consultation.gapIntents);
  assert.deepEqual(next.consultation.businessAreas, before.consultation.businessAreas);
  assert.deepEqual(next.manualMetadata, before.manualMetadata);
  assert.deepEqual(snapshot, before, 'original remains an intact history snapshot or cancel state');
});

test('an explicit simultaneous replacement reconciles once against final participants', () => {
  const snapshot = annotated();
  const next = replaceWaSelection(snapshot, { groups: [
    { pentaId: snapshot.pentas[0].pentaId, personIds: [personIds[1]] },
    { pentaId: snapshot.pentas[1].pentaId, personIds: [personIds[0]] }
  ] }, people);
  assert.deepEqual(next.manualCommunicationEdges, snapshot.manualCommunicationEdges);
  assert.deepEqual(next.consultation, snapshot.consultation);
});
