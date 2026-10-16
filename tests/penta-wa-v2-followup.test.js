import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { followupPatches, reverseFollowupPatch, followupHistoricalSource }
  from './helpers/penta-wa-v2-followup.js';
import { followupHead } from './helpers/penta-wa-v2-followup-approval.js';
import { assertFinalAuditApproval } from './helpers/penta-wa-v2-final-audit-compat.js';
const read = file => readFileSync(new URL('../' + file, import.meta.url));

test('follow-up permits only unique exact edits; additions, flips and missing hooks still fail', () => {
  for (const [file, edits] of Object.entries(followupPatches)) {
    assert.ok(Object.isFrozen(edits));
    const source = read(file);
    reverseFollowupPatch(file, source);
    const flipped = Buffer.from(source); flipped[0] ^= 1;
    for (const changed of [flipped, Buffer.concat([source, Buffer.from('\n// unreviewed\n')]),
      Buffer.from(source.toString().replace(edits[0][1], edits[0][0])),
      Buffer.concat([source, Buffer.from(edits[0][1])])]) {
      assert.notDeepEqual(changed, source);
      assert.throws(() => reverseFollowupPatch(file, changed), /Unreviewed historical audit (source|hook):/);
    }
  }
  const source = Buffer.from('unknown');
  assert.strictEqual(reverseFollowupPatch('tests/unknown.js', source), source);
});

test('follow-up runtime requires separate parent approval and preserves the original final audit', () => {
  if (followupHead === 'PENDING_PARENT_FOLLOWUP_APPROVAL') {
    assert.throws(() => assertFinalAuditApproval(), /Pending parent follow-up approval/);
    return;
  }
  assertFinalAuditApproval();
  for (const file of Object.keys(followupPatches)) {
    assert.deepEqual(followupHistoricalSource(file), reverseFollowupPatch(file, read(file)));
    assert.throws(() => followupHistoricalSource(file,
      Buffer.concat([read(file), Buffer.from('\n// unreviewed\n')])), /Unreviewed historical audit source:/);
  }
});
