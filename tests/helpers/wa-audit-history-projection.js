import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { waAuditHead } from './wa-integration-approval.js';
import { v2AuditHistoricalSource } from './penta-wa-v2-audit-compat.js';

const root = path.resolve(import.meta.dirname, '../..');
const base = 'f278e419e605e65d6f7ec501857bdc896103e2fa';
const auditBase = '31a1d6f3ceede61c4ff85fd43a105f968459dc56';
export const waAdaptedAuditPaths = Object.freeze([
  'tests/helpers/paired-card-header-projection.js',
  'tests/helpers/release-increment-projection.js',
  'tests/helpers/penta-audit-history-projection.js',
  ...['release-increment', 'issue-details', 'paired-gate-visual', 'channel-status',
    'paired-card-layout', 'paired-card-final', 'paired-card-header', 'penta-integration']
    .map(name => `tests/${name}-scope.test.js`),
]);
export const waNewAuditPaths = Object.freeze([
  'tests/helpers/wa-integration-projection.js',
  'tests/helpers/wa-audit-history-projection.js',
  'tests/wa-integration-scope.test.js',
]);
const approvalPath = 'tests/helpers/wa-integration-approval.js';
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const cache = new Map();
function bytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!cache.has(key)) cache.set(key, git('show', key));
  return Buffer.from(cache.get(key));
}
let reviewed = false;
export function assertWaAuditApproval() {
  assert.match(waAuditHead, /^[0-9a-f]{40}$/, 'Pending parent Wa audit snapshot approval; fail closed');
  if (reviewed) return;
  assert.equal(git('rev-parse', `${waAuditHead}^`).toString().trim(), auditBase,
    'Audit adaptation must be a separate snapshot on the fixed preparation source');
  assert.deepEqual(git('diff', '--no-renames', '--name-only', auditBase, waAuditHead)
    .toString().trim().split('\n').filter(Boolean).sort(),
  [...waAdaptedAuditPaths, ...waNewAuditPaths, approvalPath].sort(), 'Unreviewed Wa audit snapshot paths');
  // The final two literal approval IDs are reviewed separately; never inferred from this file.
  for (const file of [...waAdaptedAuditPaths, ...waNewAuditPaths]) {
    assert.deepEqual(v2AuditHistoricalSource(file, readFileSync(path.join(root, file))), bytes(waAuditHead, file),
      `Unreviewed historical audit source: ${file}`);
  }
  reviewed = true;
}
/** Flat, fixed adaptation snapshot; the original Penta exact hooks still run afterwards. */
export function waAuditHistoricalSource(file, source = readFileSync(path.join(root, file))) {
  if (!waAdaptedAuditPaths.includes(file)) return source;
  assertWaAuditApproval();
  source = v2AuditHistoricalSource(file, source);
  assert.deepEqual(source, bytes(waAuditHead, file), `Unreviewed historical audit source: ${file}`);
  return bytes(base, file);
}
