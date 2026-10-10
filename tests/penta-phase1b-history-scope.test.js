import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isReviewedPhase1BHistorySource } from './helpers/penta-phase1b-history-scope.js';

const files = ['src/views/team.js', 'src/locales/zh-CN/ui-views.json', 'src/locales/zh-Hant/ui-views.json'];
test('historical Phase 1B exceptions require each independently pinned source digest', () => {
  for (const file of files) {
    assert.equal(isReviewedPhase1BHistorySource(file), true);
    const bytes = readFileSync(new URL(`../${file}`, import.meta.url));
    assert.throws(() => isReviewedPhase1BHistorySource(file, () => Buffer.concat([bytes, Buffer.from('\n') ])),
      /Unreviewed (Phase 1B historical|increment) source/);
  }
});
test('all other paths retain historical comparisons, including the other Phase 1B sources', () => {
  for (const file of ['src/lib/human-design/team-members.js', 'src/lib/team-repository.js',
    'src/styles/team-members.css', 'src/views/connection.js', 'src/bodygraph.js',
    'src/locales/en/ui-views.json', 'src/views/../views/team.js', 'toString', '__proto__']) {
    assert.equal(isReviewedPhase1BHistorySource(file, () => { throw new Error('must not read unapproved paths'); }), false, file);
  }
});
