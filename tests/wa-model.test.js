import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaDraft, createWaMember, validateWaSnapshot, validateWaLayout, moveWaMember, removeWaMember } from '../src/lib/wa/model.js';
import { fixture } from './helpers/wa-fixtures.js';

test('strict Ajv 2020 draft shape accepts incomplete refs and rejects unknown data at every level', () => {
  const draft = createWaDraft();
  assert.equal(validateWaSnapshot(draft).valid, true);
  assert.equal(validateWaLayout(draft).status, 'layout_not_ready');
  const { snapshot } = fixture();
  const cases = [
    value => { value.birth = {}; }, value => { value.result = {}; }, value => { value.score = 0; },
    value => { value.members[0].chart = {}; }, value => { value.members[0].personId = null; },
    value => { value.pentas[0].automatic = true; }, value => { value.members[0].labelSnapshot = '  '; },
    value => { value.revision = 1; value.revisionId = 'r'; value.savedAt = '2026-02-30T12:00:00Z'; },
    value => { value.manualMetadata = { powerBases: [{ memberId: 'm00', label: 'X', assignment: 'manual', score: 0 }] }; },
    value => { value.revision = 0.5; }, value => { value.alphaAssignment = 'automatic'; }
  ];
  for (const mutate of cases) {
    const invalid = structuredClone(snapshot); mutate(invalid);
    assert.equal(validateWaSnapshot(invalid).valid, false, mutate.toString());
  }
});

test('refs, roles, identities and group disjointness are semantic constraints', () => {
  const { snapshot } = fixture();
  const cases = [
    [v => { v.members[1].memberId = v.members[0].memberId; }, 'DUPLICATE_MEMBER_ID'],
    [v => { v.members[1].personId = v.members[0].personId; }, 'DUPLICATE_PERSON_ID'],
    [v => { v.pentas[1].pentaId = v.pentas[0].pentaId; }, 'DUPLICATE_PENTA_ID'],
    [v => { v.pentas[1].role = v.pentas[0].role; }, 'DUPLICATE_ROLE'],
    [v => { v.pentas[0].memberIds.push('missing'); }, 'UNKNOWN_GROUP_MEMBER'],
    [v => { v.pentas[1].memberIds.push('m01'); }, 'DUPLICATE_GROUP_ASSIGNMENT'],
    [v => { v.alphaId = 'm01'; }, 'ALPHA_IN_PENTA'],
    [v => { v.alphaId = 'missing'; }, 'UNKNOWN_ALPHA'],
    [v => { v.manualMetadata = { powerBases: [{ memberId: 'missing', label: 'Direction', assignment: 'manual' }] }; }, 'UNKNOWN_METADATA_MEMBER'],
    [v => { v.layoutMode = 'custom'; v.customPolicy = { reason: 'manual experiment' }; }, 'CUSTOM_UNSUPPORTED']
  ];
  for (const [mutate, code] of cases) {
    const invalid = structuredClone(snapshot); mutate(invalid);
    assert.ok(validateWaSnapshot(invalid).issues.some(issue => issue.code === code), code);
  }
  snapshot.pentas[0].memberIds.push('m01');
  assert.equal(validateWaSnapshot(snapshot).valid, false);
});

test('10/16 standard boundaries, unlimited unassigned pool, and observation readiness are separate from saving', () => {
  for (const options of [{ pool: 20 }, { size: 16, groupSizes: [5, 5, 5] }]) {
    const { snapshot } = fixture(options);
    assert.equal(validateWaLayout(snapshot).ready, true);
  }
  for (const options of [{ size: 9, groupSizes: [2, 3, 3] }, { size: 17, groupSizes: [6, 5, 5] }]) {
    const { snapshot } = fixture(options);
    assert.equal(validateWaSnapshot(snapshot).valid, true);
    assert.equal(validateWaLayout(snapshot).ready, false);
    snapshot.layoutMode = 'observation';
    assert.equal(validateWaLayout(snapshot).status, 'outside_standard_template');
    assert.equal(validateWaLayout(snapshot).ready, true);
  }
});

test('moves and removals preserve IDs, never mutate input, clean Alpha/group/manual references', () => {
  const { snapshot } = fixture({ pool: 1 });
  snapshot.manualMetadata = { notes: 'manual', powerBases: [{ memberId: 'm00', label: 'Direction', assignment: 'manual' }] };
  const original = structuredClone(snapshot);
  const moved = moveWaMember(snapshot, 'm01', { pentaId: 'g1' });
  assert.equal(moved.pentas[0].memberIds.includes('m01'), false);
  assert.equal(moved.pentas[1].memberIds.includes('m01'), true);
  assert.deepEqual(snapshot, original);
  const alpha = moveWaMember(snapshot, 'm01', { alpha: true });
  assert.equal(alpha.alphaId, 'm01');
  assert.ok(validateWaLayout(alpha).poolMemberIds.includes('m00'));
  const removed = removeWaMember(snapshot, 'm00');
  assert.equal(removed.alphaId, null);
  assert.deepEqual(removed.manualMetadata.powerBases, []);
  assert.equal(validateWaLayout(removed).ready, false);
  assert.throws(() => moveWaMember(snapshot, 'missing', null), { code: 'UNKNOWN_MEMBER' });
  assert.throws(() => moveWaMember(snapshot, 'm00', { pentaId: 'missing' }), { code: 'UNKNOWN_PENTA' });
  assert.throws(() => moveWaMember(snapshot, 'm00', {}), { code: 'INVALID_TARGET' });
  assert.deepEqual(createWaMember({ personId: 'person', memberId: 'stable', labelSnapshot: ' Label ' }),
    { personId: 'person', memberId: 'stable', labelSnapshot: 'Label' });
});
