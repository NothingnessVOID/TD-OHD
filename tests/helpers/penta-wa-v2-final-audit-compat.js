import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { finalAuditHead } from './penta-wa-v2-final-audit-approval.js';
import { followupHistoricalSource } from './penta-wa-v2-followup.js';
const root = path.resolve(import.meta.dirname, '../..');
const preparationHead = '771337b5c00f1db106d987914a352012ce844ece';
const historicalHead = '953959249bd7409c5b4d1042fc2ca38f943c39e5';
export const finalAdaptedAuditPaths = Object.freeze([
  'tests/helpers/paired-card-header-projection.js',
  'tests/helpers/release-increment-projection.js',
  'tests/helpers/penta-wa-v2-audit-compat.js',
  ...['release-increment', 'issue-details', 'paired-gate-visual', 'channel-status',
    'paired-card-layout', 'paired-card-final', 'paired-card-header', 'penta-integration',
    'wa-integration', 'penta-wa-v2'].map(name => `tests/${name}-scope.test.js`),
]);
export const finalNewAuditPaths = Object.freeze([
  'tests/helpers/penta-wa-v2-final-phases.js',
  'tests/helpers/penta-wa-v2-final-review.js',
  'tests/helpers/penta-wa-v2-final-audit-compat.js',
  'tests/helpers/penta-wa-v2-final-audit-approval.js',
  'tests/penta-wa-v2-final-scope.test.js',
]);
const approvalPath = 'tests/helpers/penta-wa-v2-final-audit-approval.js';
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const read = file => readFileSync(path.join(root, file));
const cache = new Map();
function bytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!cache.has(key)) cache.set(key, git('show', key));
  return Buffer.from(cache.get(key));
}
export function assertFinalAuditSnapshot(ref) {
  assert.match(ref, /^[0-9a-f]{40}$/, 'Pending parent final audit approval; fail closed');
  assert.equal(git('rev-parse', `${ref}^`).toString().trim(), preparationHead,
    'Final audit must be an independent commit on the fixed preparation');
  assert.deepEqual(git('diff', '--no-renames', '--name-only', preparationHead, ref).toString()
    .trim().split('\n').filter(Boolean).sort(), [...finalAdaptedAuditPaths, ...finalNewAuditPaths].sort(),
  'Unreviewed final audit snapshot paths');
  for (const file of [...finalAdaptedAuditPaths, ...finalNewAuditPaths].filter(file => file !== approvalPath))
    assert.deepEqual(followupHistoricalSource(file, read(file)), bytes(ref, file), `Unreviewed historical audit source: ${file}`);
  assert.equal(read(approvalPath).toString(), bytes(ref, approvalPath).toString()
    .replace("'PENDING_PARENT_FINAL_AUDIT_APPROVAL'", `'${finalAuditHead}'`), 'Unreviewed final audit approval edits');
  // A records and approval remain immutable even though the runtime adapter gains a new outer layer.
  for (const file of ['tests/helpers/penta-wa-v2-review.js', 'tests/helpers/penta-wa-v2-audit-approval.js'])
    assert.deepEqual(read(file), bytes(historicalHead, file), `Unreviewed immutable A audit source: ${file}`);
}
let reviewed = false;
export function assertFinalAuditApproval() {
  assert.match(finalAuditHead, /^[0-9a-f]{40}$/, 'Pending parent final audit approval; fail closed');
  if (!reviewed) { assertFinalAuditSnapshot(finalAuditHead); reviewed = true; }
}
export function finalAuditHistoricalSource(file, source = read(file)) {
  if (!finalAdaptedAuditPaths.includes(file)) return source;
  assertFinalAuditApproval();
  source = followupHistoricalSource(file, source);
  assert.deepEqual(source, bytes(finalAuditHead, file), `Unreviewed historical audit source: ${file}`);
  return bytes(historicalHead, file);
}
