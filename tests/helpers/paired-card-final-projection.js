import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pairedCardHeaderProjection } from './paired-card-header-projection.js';

// Fixed parent-supplied source commit, independently checked against 7ff.
// Never derive approval from HEAD, the environment, current bytes or an editable manifest.
export const pairedCardFinalBase = '7ff318ad5e68c353c64d8cb8226fac48a3244cc3';
export const pairedCardFinalHead = 'ee6bfb100e23e13af0d33bb590a82600a805dbb0';
export const pairedCardFinalPaths = Object.freeze(['src/styles.css', 'src/views/chart.js']);
// Unique literal edits only: gate-only metadata wrapping and paired-card spacing.
// Status, source, navigation, full-detail markup and all unrelated CSS stay byte-identical.
export const pairedCardFinalEdits = Object.freeze({
  'src/styles.css': Object.freeze([
    Object.freeze({
      before: '/* Explicit rows avoid the anonymous line box around the inline channel title.\n   The paired row owns a centered 44px target, so it needs no extra outer gap. */',
      after: '/* Only paired cards use three rows: title, wrapping metadata, harmonic gate. */',
    }),
    Object.freeze({
      before: '.gate-detail-channel:has(.gate-detail-paired-gate) {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);\n  padding-block: 8px;',
      after: '.gate-detail-channel:has(.gate-detail-paired-gate) {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);\n  padding-block: 6px;\n  row-gap: 4px;',
    }),
    Object.freeze({
      before: '.gate-detail-channel:has(.gate-detail-paired-gate) .channel-circuit-badges { display: flex; flex-wrap: wrap; margin: 4px 0; }',
      after: '.gate-detail-channel:has(.gate-detail-paired-gate) > .gate-detail-channel-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; min-width: 0; }\n.gate-detail-channel:has(.gate-detail-paired-gate) .channel-circuit-badges { display: flex; flex-wrap: wrap; margin: 0; }',
    }),
    Object.freeze({
      before: '.gate-detail-paired-gate {\n  display: flex;\n  align-items: center;\n  max-width: 100%;\n  min-height: 44px;',
      after: '.gate-detail-paired-gate {\n  display: flex;\n  align-items: center;\n  max-width: 100%;\n  min-height: 30px;',
    }),
    Object.freeze({
      before: '  border: 0;\n  border-radius: 2px;\n  background: transparent;\n  font: inherit;',
      after: '  border: 0;\n  border-top: 1px solid var(--border-subtle);\n  border-radius: 2px;\n  background: transparent;\n  font: inherit;',
    }),
    Object.freeze({
      before: '.gate-detail-paired-gate-label { font-size: 12px; color: var(--text-secondary); }',
      after: '@media (max-width: 600px), (pointer: coarse) {\n  .gate-detail-paired-gate { min-height: 44px; }\n}\n.gate-detail-paired-gate-label { font-size: 12px; color: var(--text-secondary); }',
    }),
  ]),
  'src/views/chart.js': Object.freeze([
    Object.freeze({
      before: '      ${renderChannelCircuitBadges(channel)}',
      after: '      ${pairedGate == null ? \'\' : \'<div class="gate-detail-channel-meta">\'}${renderChannelCircuitBadges(channel)}',
    }),
    Object.freeze({
      before: '      <span class="circuit-badge transit-source-badge ${source}${statusClass}">${natalStatus ? t(\'Birth activations\') : statusLabel}</span>',
      after: '      <span class="circuit-badge transit-source-badge ${source}${statusClass}">${natalStatus ? t(\'Birth activations\') : statusLabel}</span>${pairedGate == null ? \'\' : \'</div>\'}',
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

/** Reverse only unique, literal reviewed edits; every other byte must equal 7ff. */
export function assertPairedCardFinalDelta(before, after, file) {
  const edits = pairedCardFinalEdits[file];
  assert.ok(edits?.length, `Pending exact paired-card final anchors: ${file}; fail closed`);
  const original = before.toString();
  let restored = after.toString();
  for (const { before: oldText, after: newText } of edits) {
    assert.ok(oldText && newText && oldText !== newText, 'Exact final edit must change nonempty anchors');
    const oldStart = original.indexOf(oldText);
    assert.ok(oldStart >= 0, `Exact base final anchor must exist: ${file}`);
    assert.equal(original.indexOf(oldText, oldStart + 1), -1, 'Base final anchor must be unique');
    const start = restored.indexOf(newText);
    assert.ok(start >= 0, `Exact approved final anchor must exist: ${file}`);
    assert.equal(restored.indexOf(newText, start + 1), -1, 'Approved final anchor must be unique');
    restored = restored.slice(0, start) + oldText + restored.slice(start + newText.length);
  }
  assert.deepEqual(Buffer.from(restored), before, `Unreviewed increment source outside exact paired-card final anchors: ${file}`);
}

let reviewed = false;
export function assertPairedCardFinalApproval() {
  // Missing SHA or anchors always fails closed before any protected bytes pass.
  assert.match(pairedCardFinalHead, /^[0-9a-f]{40}$/, 'Pending parent-supplied paired-card final source SHA; fail closed');
  if (reviewed) return;
  assert.notEqual(pairedCardFinalHead, pairedCardFinalBase, 'Final approval must be a new source commit');
  git('merge-base', '--is-ancestor', pairedCardFinalBase, pairedCardFinalHead);
  const changed = git('diff', '--no-renames', '--name-only', pairedCardFinalBase, pairedCardFinalHead,
    '--', ...protectedPaths).toString().trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changed, [...pairedCardFinalPaths], 'Unreviewed paired-card final source paths');
  for (const file of pairedCardFinalPaths) {
    assertPairedCardFinalDelta(bytes(pairedCardFinalBase, file), bytes(pairedCardFinalHead, file), file);
  }
  reviewed = true;
}

/** Validate final bytes first, restoring 7ff before the immutable compact approval. */
export function pairedCardFinalProjection(source, file) {
  source = pairedCardHeaderProjection(source, file);
  if (!pairedCardFinalPaths.includes(file)) return source;
  assertPairedCardFinalApproval();
  assert.equal(sha(source), sha(bytes(pairedCardFinalHead, file)), `Unreviewed increment source: ${file} (paired-card final)`);
  return bytes(pairedCardFinalBase, file);
}
