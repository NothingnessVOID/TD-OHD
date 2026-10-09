import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Historical comparisons permit only these independently pinned Phase 1B bytes.
// Never derive approval from the editable source-scope manifest.
const phase1C = Object.freeze({
  'src/views/team.js': '60c5c03e1b0bdc6d398d2017774e354142dc9f83008220edc4507069159cb149',
  'src/locales/zh-CN/ui-views.json': '7d220cde18c44093a0d62025f8135d3dc6d963ffb788848b147df04244a9b2f9',
  'src/locales/zh-Hant/ui-views.json': '87d3038a7a0f16ec629be2c66803f8f414d4418428e139e92abc97c96921b40a'
});
const reviewed = Object.freeze({
  'src/views/team.js': '9936ec4e15f3480d9af4427037a7b97bd716a8ec30ca5f9d5fdef8f8c8ade0f9',
  'src/locales/zh-CN/ui-views.json': '72443bb169058968cbc8f7e8f98938d1045e9644630e77a0d217a98f89e40cbb',
  'src/locales/zh-Hant/ui-views.json': '793c2976e1256cb6153230d3c2fe82f687b8a1c75f12c233756c5ec6269d1217'
});
export function isReviewedPhase1BHistorySource(file, read = path => readFileSync(new URL(`../../${path}`, import.meta.url))) {
  if (!Object.hasOwn(reviewed, file)) return false;
  assert.equal(createHash('sha256').update(read(file)).digest('hex'), phase1C[file] ?? reviewed[file],
    `Unreviewed Phase 1B historical source: ${file}`);
  return true;
}
