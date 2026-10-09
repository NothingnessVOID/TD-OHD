import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Historical comparisons permit only these independently pinned Phase 1B bytes.
// Never derive approval from the editable source-scope manifest.
const reviewed = Object.freeze({
  'src/views/team.js': '36a9366c324cd3b385c2103d34f923a605d7286a12b9719777a70c58674636f5',
  'src/locales/zh-CN/ui-views.json': 'ee4224b560b80e1263ee08eb2f9e8b7c320847dcbe67baca63fe94f74816b1c0',
  'src/locales/zh-Hant/ui-views.json': '5414dff5488945a9d5bdd03b8172f5298e0efc4afc83665b56d5f7d623b9a7ef'
});
export function isReviewedPhase1BHistorySource(file, read = path => readFileSync(new URL(`../../${path}`, import.meta.url))) {
  if (!Object.hasOwn(reviewed, file)) return false;
  assert.equal(createHash('sha256').update(read(file)).digest('hex'), reviewed[file],
    `Unreviewed Phase 1B historical source: ${file}`);
  return true;
}
