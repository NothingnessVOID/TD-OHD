import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Fixed parent-reviewed source: never substitute HEAD, environment values or working bytes.
export const pairedCardLayoutBase = 'cc6e58df080918a32979f40efa3a792047f0aca4';
export const pairedCardLayoutHead = '4b080956c37fa4ae2d6212e2169fb15588161a53';
export const pairedCardLayoutPaths = Object.freeze(['src/styles.css', 'src/views/chart.js']);
// Exact literals reviewed against cc6. No status logic, status CSS or navigation edits.
export const pairedCardLayoutEdits = Object.freeze({
  'src/styles.css': Object.freeze([
    Object.freeze({
      before: `.gate-detail-channel:has(.gate-detail-paired-gate) .channel-circuit-badges { display:flex; flex-wrap:wrap; margin:4px 0; }
.gate-detail-paired-gate {
  display: block;
  max-width: 100%;
  min-height: 44px;
  margin-top: 2px;`,
      after: `/* Explicit rows avoid the anonymous line box around the inline channel title.
   The paired row owns a centered 44px target, so it needs no extra outer gap. */
.gate-detail-channel:has(.gate-detail-paired-gate) {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding-block: 8px;
}
.gate-detail-channel:has(.gate-detail-paired-gate) > .gate-link { justify-self: start; text-align: left; line-height: 1.5; }
.gate-detail-channel:has(.gate-detail-paired-gate) .channel-circuit-badges { display: flex; flex-wrap: wrap; margin: 4px 0; }
.gate-detail-paired-gate {
  display: flex;
  align-items: center;
  max-width: 100%;
  min-height: 44px;
  margin: 0;`,
    }),
    Object.freeze({
      before: `.gate-detail-paired-gate-number { color: var(--accent); font-weight: 500; }
.gate-detail-paired-gate-name { color: var(--text); font-weight: 600; }`,
      after: '.gate-detail-paired-gate-link { color: var(--accent); font-weight: 500; }',
    }),
    Object.freeze({
      before: '.gate-detail-paired-gate:focus-visible .gate-detail-paired-gate-number { text-decoration: underline; text-underline-offset: 3px; }',
      after: '.gate-detail-paired-gate:focus-visible .gate-detail-paired-gate-link { text-decoration: underline; text-underline-offset: 3px; }',
    }),
    Object.freeze({
      before: '  .gate-detail-paired-gate:hover .gate-detail-paired-gate-number { text-decoration: underline; text-underline-offset: 3px; }',
      after: '  .gate-detail-paired-gate:hover .gate-detail-paired-gate-link { text-decoration: underline; text-underline-offset: 3px; }',
    }),
  ]),
  'src/views/chart.js': Object.freeze([
    Object.freeze({
      before: '<button type="button" class="gate-detail-paired-gate" data-paired-gate="${pairedGate}"><span class="gate-detail-paired-gate-label">${t(\'Harmonic gate:\')}</span> <span class="gate-detail-paired-gate-number">${t(\'Gate {gate}\', { gate: pairedGate })}</span> · <span class="gate-detail-paired-gate-name">${esc(gateName(pairedGate))}</span></button>',
      after: '<button type="button" class="gate-detail-paired-gate" data-paired-gate="${pairedGate}"><span><span class="gate-detail-paired-gate-label">${t(\'Harmonic gate:\')}</span> <span class="gate-detail-paired-gate-link"><span class="gate-detail-paired-gate-number">${t(\'Gate {gate}\', { gate: pairedGate })}</span> · <span class="gate-detail-paired-gate-name">${esc(gateName(pairedGate))}</span></span></span></button>',
    }),
  ]),
});
const root = path.resolve(import.meta.dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const sha = source => createHash('sha256').update(source).digest('hex');
const cache = new Map();
function bytes(ref, file) {
  const key = `${ref}:${file}`;
  if (!cache.has(key)) cache.set(key, git('show', key));
  return Buffer.from(cache.get(key));
}

/** Restore exact reviewed layout edits; every other byte must equal cc6. */
export function assertPairedCardLayoutDelta(before, after, file) {
  const edits = pairedCardLayoutEdits[file];
  assert.ok(edits?.length, `Pending exact paired-card layout anchors: ${file}`);
  let restored = after.toString();
  for (const { before: oldText, after: newText } of edits) {
    assert.ok(oldText && newText && oldText !== newText, 'Exact layout edit must change nonempty anchors');
    const oldStart = before.toString().indexOf(oldText);
    assert.ok(oldStart >= 0, `Exact base layout anchor must exist: ${file}`);
    assert.equal(before.toString().indexOf(oldText, oldStart + 1), -1, 'Base layout anchor must be unique');
    const start = restored.indexOf(newText);
    assert.ok(start >= 0, `Exact approved layout anchor must exist: ${file}`);
    assert.equal(restored.indexOf(newText, start + 1), -1, 'Approved layout anchor must be unique');
    restored = restored.slice(0, start) + oldText + restored.slice(start + newText.length);
  }
  assert.deepEqual(Buffer.from(restored), before, `Unreviewed increment source outside exact paired-card layout anchors: ${file}`);
}

assert.match(pairedCardLayoutHead, /^[0-9a-f]{40}$/, 'Expected fixed parent-supplied paired-card layout source SHA; fail closed');
const changed = git('diff', '--name-only', pairedCardLayoutBase, pairedCardLayoutHead, '--',
  'src', 'engine-core', 'engine-tools', 'engine-wasm', 'jovian-engine', 'scripts',
  'third_party', 'public/transit-data', 'index.html', 'package.json', 'package-lock.json',
  'vite.config.js', '.env.production').toString().trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changed, [...pairedCardLayoutPaths], 'Unreviewed paired-card layout source paths');
for (const file of pairedCardLayoutPaths) {
  assertPairedCardLayoutDelta(bytes(pairedCardLayoutBase, file), bytes(pairedCardLayoutHead, file), file);
}

/** Validate both current files, restoring cc6 before channel-status and all older layers. */
export function pairedCardLayoutProjection(source, file) {
  if (!pairedCardLayoutPaths.includes(file)) return source;
  assert.equal(sha(source), sha(bytes(pairedCardLayoutHead, file)), `Unreviewed increment source: ${file} (paired-card layout)`);
  return bytes(pairedCardLayoutBase, file);
}
