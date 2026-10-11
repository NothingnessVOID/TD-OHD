import assert from 'node:assert/strict';
import { pentaIntegrationProjection } from './penta-integration-projection.js';
import { waIntegrationProjection } from './wa-integration-projection.js';
import { v2SourceProjection } from './penta-wa-v2-review.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Fixed parent-supplied source commit, independently reviewed against aee.
// Never derive approval from HEAD, current bytes, environment variables or a manifest.
export const pairedCardHeaderBase = 'aee63103dec82bb262c88dbbd8adee785f9de607';
export const pairedCardHeaderHead = 'fafec304a2c0553df8bd1b91561e6db3d345bc97';
export const pairedCardHeaderPaths = Object.freeze(['src/styles.css', 'src/views/chart.js']);
export const pairedCardHeaderEdits = Object.freeze({
  'src/styles.css': Object.freeze([
    Object.freeze({
      before: '/* Only paired cards use three rows: title, wrapping metadata, harmonic gate. */',
      after: '/* Only paired cards group title and badges above status and harmonic gate. */',
    }),
    Object.freeze({
      before: '.gate-detail-channel:has(.gate-detail-paired-gate) > .gate-link { justify-self: start; text-align: left; line-height: 1.5; }',
      after: '.gate-detail-channel:has(.gate-detail-paired-gate) > .gate-detail-channel-header > .gate-link { text-align: left; line-height: 1.5; }',
    }),
    Object.freeze({
      before: '.gate-detail-channel:has(.gate-detail-paired-gate) > .gate-detail-channel-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; min-width: 0; }',
      after: '.gate-detail-channel:has(.gate-detail-paired-gate) > .gate-detail-channel-header { display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 4px 8px; min-width: 0; }',
    }),
    Object.freeze({
      before: '  border: 0;\n  border-top: 1px solid var(--border-subtle);\n  border-radius: 2px;',
      after: '  border: 0;\n  border-top: 1.5px solid var(--border);\n  border-radius: 2px;',
    }),
  ]),
  'src/views/chart.js': Object.freeze([
    Object.freeze({
      before: '      <button type="button" class="gate-link" data-channel="${key}">${t(\'Channel {channel}\', { channel: key })} · ${esc(channelName(channel.gates))}</button>',
      after: '      ${pairedGate == null ? \'\' : \'<div class="gate-detail-channel-header">\'}<button type="button" class="gate-link" data-channel="${key}">${t(\'Channel {channel}\', { channel: key })} · ${esc(channelName(channel.gates))}</button>',
    }),
    Object.freeze({
      before: '      ${pairedGate == null ? \'\' : \'<div class="gate-detail-channel-meta">\'}${renderChannelCircuitBadges(channel)}',
      after: '      ${renderChannelCircuitBadges(channel)}${pairedGate == null ? \'\' : \'</div>\'}',
    }),
    Object.freeze({
      before: '      <span class="circuit-badge transit-source-badge ${source}${statusClass}">${natalStatus ? t(\'Birth activations\') : statusLabel}</span>${pairedGate == null ? \'\' : \'</div>\'}',
      after: '      <span class="circuit-badge transit-source-badge ${source}${statusClass}">${natalStatus ? t(\'Birth activations\') : statusLabel}</span>',
    }),
  ]),
});
const root = path.resolve(import.meta.dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const sha = source => createHash('sha256').update(source).digest('hex');
const protectedPaths = ['src', 'engine-core', 'engine-tools', 'engine-wasm', 'jovian-engine',
  'scripts', 'third_party', 'public/transit-data', 'index.html', 'package.json',
  'package-lock.json', 'vite.config.js', '.env.production'];
const cache = new Map();
function bytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!cache.has(key)) cache.set(key, git('show', key));
  return Buffer.from(cache.get(key));
}

/** Reverse unique reviewed literal edits; reject every other source byte. */
export function assertPairedCardHeaderDelta(before, after, file) {
  const edits = pairedCardHeaderEdits[file];
  assert.ok(edits?.length, `Pending exact paired-card header anchors: ${file}; fail closed`);
  const original = before.toString();
  let restored = after.toString();
  for (const { before: oldText, after: newText } of edits) {
    assert.ok(oldText && newText && oldText !== newText, 'Exact header edit must change nonempty anchors');
    const oldStart = original.indexOf(oldText);
    assert.ok(oldStart >= 0, `Exact base header anchor must exist: ${file}`);
    assert.equal(original.indexOf(oldText, oldStart + 1), -1, 'Base header anchor must be unique');
    const start = restored.indexOf(newText);
    assert.ok(start >= 0, `Exact approved header anchor must exist: ${file}`);
    assert.equal(restored.indexOf(newText, start + 1), -1, 'Approved header anchor must be unique');
    restored = restored.slice(0, start) + oldText + restored.slice(start + newText.length);
  }
  assert.deepEqual(Buffer.from(restored), before, `Unreviewed increment source outside exact paired-card header anchors: ${file}`);
}

let reviewed = false;
export function assertPairedCardHeaderApproval() {
  assert.match(pairedCardHeaderHead, /^[0-9a-f]{40}$/, 'Pending parent-supplied paired-card header source SHA; fail closed');
  if (reviewed) return;
  assert.notEqual(pairedCardHeaderHead, pairedCardHeaderBase, 'Header approval must be a new source commit');
  git('merge-base', '--is-ancestor', pairedCardHeaderBase, pairedCardHeaderHead);
  const changed = git('diff', '--no-renames', '--name-only', pairedCardHeaderBase, pairedCardHeaderHead,
    '--', ...protectedPaths).toString().trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changed, [...pairedCardHeaderPaths], 'Unreviewed paired-card header source paths');
  for (const file of pairedCardHeaderPaths) {
    assertPairedCardHeaderDelta(bytes(pairedCardHeaderBase, file), bytes(pairedCardHeaderHead, file), file);
  }
  reviewed = true;
}

/** Validate header source first, restoring aee before all immutable older approvals. */
export function pairedCardHeaderProjection(source, file) {
  source = v2SourceProjection(source, file);
  source = waIntegrationProjection(source, file);
  source = pentaIntegrationProjection(source, file);
  if (!pairedCardHeaderPaths.includes(file)) return source;
  assertPairedCardHeaderApproval();
  assert.equal(sha(source), sha(bytes(pairedCardHeaderHead, file)), `Unreviewed increment source: ${file} (paired-card header)`);
  return bytes(pairedCardHeaderBase, file);
}
