import { incrementProjection } from './release-increment-projection.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Historical comparisons permit only these independently pinned Phase 1B bytes.
// Never derive approval from the editable source-scope manifest.
const phase1C = Object.freeze({
  'src/views/team.js': '48dfdaf77fee8510591edbad680100f4d2f5fae5f57d06440b7b0fcdc4ae5890',
  'src/locales/zh-CN/ui-views.json': '382f88bff20621632c2a89c7876825c7d992fb5aec6759bdaec2141817122349',
  'src/locales/zh-Hant/ui-views.json': '8023a108577964e05f28443a8c30414fb520ee8c5dd32545d5327d36fbfe54a2'
});
const reviewed = Object.freeze({
  'src/views/team.js': '9936ec4e15f3480d9af4427037a7b97bd716a8ec30ca5f9d5fdef8f8c8ade0f9',
  'src/locales/zh-CN/ui-views.json': '72443bb169058968cbc8f7e8f98938d1045e9644630e77a0d217a98f89e40cbb',
  'src/locales/zh-Hant/ui-views.json': '793c2976e1256cb6153230d3c2fe82f687b8a1c75f12c233756c5ec6269d1217'
});
export function isReviewedPhase1BHistorySource(file, read = path => readFileSync(new URL(`../../${path}`, import.meta.url))) {
  if (!Object.hasOwn(reviewed, file)) return false;
  assert.equal(createHash('sha256').update(incrementProjection(read(file), file)).digest('hex'), phase1C[file] ?? reviewed[file],
    `Unreviewed Phase 1B historical source: ${file}`);
  return true;
}
