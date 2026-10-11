import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { v2AuditHead } from './penta-wa-v2-audit-approval.js';

const root = path.resolve(import.meta.dirname, '../..');
const sourceBase = '9b01fb87fce51648b4fddf4d0dcdd9defe8867c7';
export const v2AdaptedAuditPaths = Object.freeze([
  'tests/helpers/paired-card-header-projection.js',
  'tests/helpers/release-increment-projection.js',
  'tests/helpers/wa-audit-history-projection.js',
  'tests/penta-integration-scope.test.js',
  'tests/wa-integration-scope.test.js',
]);
export const v2NewAuditPaths = Object.freeze([
  'tests/helpers/penta-wa-v2-review.js',
  'tests/helpers/penta-wa-v2-audit-compat.js',
  'tests/helpers/penta-wa-v2-audit-approval.js',
  'tests/penta-wa-v2-scope.test.js',
]);
const approvalPath = 'tests/helpers/penta-wa-v2-audit-approval.js';
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const read = file => readFileSync(path.join(root, file));
const bytes = (ref, file) => git('show', `${ref}:${file}`);
/** Structural review of an explicit candidate does not authorize runtime compatibility. */
export function assertV2AuditSnapshot(ref) {
  assert.match(ref, /^[0-9a-f]{40}$/, 'Pending parent v2 audit snapshot approval; fail closed');
  assert.equal(git('rev-parse', `${ref}^`).toString().trim(), sourceBase,
    'v2 audit adaptation must be a separate commit on the fixed A source');
  assert.deepEqual(git('diff', '--no-renames', '--name-only', sourceBase, ref).toString()
    .trim().split('\n').filter(Boolean).sort(), [...v2AdaptedAuditPaths, ...v2NewAuditPaths].sort(),
  'Unreviewed v2 audit snapshot paths');
  for (const file of [...v2AdaptedAuditPaths, ...v2NewAuditPaths].filter(file => file !== approvalPath))
    assert.deepEqual(read(file), bytes(ref, file), `Unreviewed historical audit source: ${file}`);
  assert.equal(read(approvalPath).toString(), bytes(ref, approvalPath).toString()
    .replace("'PENDING_PARENT_V2_AUDIT_APPROVAL'", `'${v2AuditHead}'`),
  'Unreviewed v2 audit approval edits');
}
let reviewed = false;
export function assertV2AuditApproval() {
  assert.match(v2AuditHead, /^[0-9a-f]{40}$/, 'Pending parent v2 audit snapshot approval; fail closed');
  if (!reviewed) {
    assertV2AuditSnapshot(v2AuditHead);
    reviewed = true;
  }
}
/** One flat approved adapter layer; old Wa and Penta checks continue unchanged after it. */
export function v2AuditHistoricalSource(file, source = read(file)) {
  if (!v2AdaptedAuditPaths.includes(file)) return source;
  assertV2AuditApproval();
  assert.deepEqual(source, bytes(v2AuditHead, file), `Unreviewed historical audit source: ${file}`);
  return bytes(sourceBase, file);
}
