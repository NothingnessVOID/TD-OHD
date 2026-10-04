import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { validateKnowledgePresentationScope } from '../scripts/lib/knowledge-presentation-scope.mjs';

const root = path.resolve(import.meta.dirname, '..');
const scope = () => JSON.parse(readFileSync(path.join(root, 'docs/knowledge-layer/review-round2-ui-scope.json')));
test('review source scope preserves baseline provenance and only the eight authorized UI files', () => {
  assert.equal(Object.keys(validateKnowledgePresentationScope(root)).length, 8);
  const bad = scope(); bad.files['src/views/chart.js'] = {before:'bad',after:'bad'};
  assert.throws(() => validateKnowledgePresentationScope(root,bad), /Outside Knowledge UI scope/);
  const wrongBaseline = scope(); wrongBaseline.baseline = 'main';
  assert.throws(() => validateKnowledgePresentationScope(root,wrongBaseline), /Unexpected Knowledge UI baseline/);
  const drift = scope(); drift.files['src/lib/knowledge/detail-renderer.js'].after = 'bad';
  assert.throws(() => validateKnowledgePresentationScope(root,drift), /content mismatch/);
});
