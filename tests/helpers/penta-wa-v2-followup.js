import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { followupHead } from './penta-wa-v2-followup-approval.js';
const root = path.resolve(import.meta.dirname, '../..');
const base = 'e6a55d87fd9889e2516bec059611ab7a2d32cf3b';
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const read = file => readFileSync(path.join(root, file));
const bytes = (ref, file) => git('show', `${ref}:${file}`);
const freeze = pairs => Object.freeze(pairs.map(pair => Object.freeze(pair)));
// Exact inverse edits, not a new source projection or a replacement audit snapshot.
export const followupPatches = Object.freeze({
  ...Object.fromEntries([['channel-status', 'p'], ['paired-card-layout', 'file'], ['paired-gate-visual', 'file']]
    .map(([name, arg]) => [`tests/${name}-scope.test.js`, freeze([
      ["import { integrationAddedPaths } from './helpers/penta-wa-v2-final-review.js';",
        "import { integrationAddedPaths, finalSourceProjection } from './helpers/penta-wa-v2-final-review.js';"],
      [`pentaIntegrationProjection(current, ${arg})`, `pentaIntegrationProjection(finalSourceProjection(current, ${arg}), ${arg})`],
    ])])),
  'tests/variable-public-copy-cleanup.test.js': freeze([
    ["import {preservedSource, releaseCandidate} from './helpers/knowledge-release-contract.js';",
      "import {preservedSource, releaseCandidate} from './helpers/knowledge-release-contract.js';\nimport {incrementProjection} from './helpers/release-increment-projection.js';"],
    ['  assert.deepEqual(bytes,preservedSource(path,cleanup.baseline),path);',
      "  const historical=path==='src/lib/knowledge/detail-renderer.js'?incrementProjection(bytes,path):bytes;\n  assert.deepEqual(historical,preservedSource(path,cleanup.baseline),path);\n  if(path==='src/lib/knowledge/detail-renderer.js') {\n   const flipped=Buffer.from(bytes);flipped[0]^=1;\n   for(const changed of [flipped,Buffer.concat([bytes,Buffer.from('\\n// unreviewed renderer\\n')])])\n    assert.throws(()=>incrementProjection(changed,path),error=>error.code==='ERR_ASSERTION'&&error.message.startsWith(`Unreviewed increment source: ${path}`));\n  }"],
  ]),
  'tests/helpers/penta-wa-v2-final-audit-compat.js': freeze([
    ["import { finalAuditHead } from './penta-wa-v2-final-audit-approval.js';",
      "import { finalAuditHead } from './penta-wa-v2-final-audit-approval.js';\nimport { followupHistoricalSource } from './penta-wa-v2-followup.js';"],
    ['    assert.deepEqual(read(file), bytes(ref, file), `Unreviewed historical audit source: ${file}`);',
      '    assert.deepEqual(followupHistoricalSource(file, read(file)), bytes(ref, file), `Unreviewed historical audit source: ${file}`);'],
    ['  assertFinalAuditApproval();\n  assert.deepEqual(source, bytes(finalAuditHead, file),',
      '  assertFinalAuditApproval();\n  source = followupHistoricalSource(file, source);\n  assert.deepEqual(source, bytes(finalAuditHead, file),'],
  ]),
});
const approvalPath = 'tests/helpers/penta-wa-v2-followup-approval.js';
const newPaths = ['tests/helpers/penta-wa-v2-followup.js', approvalPath, 'tests/penta-wa-v2-followup.test.js'];
export function reverseFollowupPatch(file, source) {
  if (!Object.hasOwn(followupPatches, file)) return source;
  let text = source.toString();
  for (const [before, after] of followupPatches[file]) {
    const at = text.indexOf(after);
    assert.ok(at >= 0 && text.indexOf(after, at + 1) < 0, `Unreviewed historical audit hook: ${file}`);
    text = text.slice(0, at) + before + text.slice(at + after.length);
  }
  const historical = bytes(base, file);
  assert.deepEqual(Buffer.from(text), historical, `Unreviewed historical audit source: ${file}`);
  return historical;
}
export function assertFollowupSnapshot(ref) {
  assert.match(ref, /^[0-9a-f]{40}$/, 'Pending parent follow-up approval; fail closed');
  assert.equal(git('rev-parse', `${ref}^`).toString().trim(), base, 'Unreviewed follow-up parent');
  assert.deepEqual(git('diff', '--no-renames', '--name-only', base, ref).toString().trim().split('\n').sort(),
    [...Object.keys(followupPatches), ...newPaths].sort(), 'Unreviewed follow-up paths');
  for (const file of [...Object.keys(followupPatches), ...newPaths].filter(file => file !== approvalPath)) {
    assert.deepEqual(read(file), bytes(ref, file), `Unreviewed historical audit source: ${file}`);
    if (Object.hasOwn(followupPatches, file)) reverseFollowupPatch(file, read(file));
  }
  assert.equal(read(approvalPath).toString(), bytes(ref, approvalPath).toString()
    .replace("'PENDING_PARENT_FOLLOWUP_APPROVAL'", `'${followupHead}'`), 'Unreviewed follow-up approval edits');
}
let reviewed = false;
export function followupHistoricalSource(file, source = read(file)) {
  if (!Object.hasOwn(followupPatches, file)) return source;
  assert.match(followupHead, /^[0-9a-f]{40}$/, 'Pending parent follow-up approval; fail closed');
  if (!reviewed) { assertFollowupSnapshot(followupHead); reviewed = true; }
  assert.deepEqual(source, bytes(followupHead, file), `Unreviewed historical audit source: ${file}`);
  return reverseFollowupPatch(file, source);
}
