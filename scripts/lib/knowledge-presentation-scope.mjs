/** Additive UI permission record; earlier release evidence remains immutable. */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const baseline = 'df06686baa855b01a8bbfb3d77cf85b34eaf4717';
const allowed = new Set([
  'src/lib/knowledge/detail-access.css',
  'src/lib/knowledge/detail-controller.js',
  'src/lib/knowledge/detail-renderer.js',
  'src/views/reference.js',
  'src/locales/zh-CN/ui-chart.json',
  'src/locales/zh-Hant/ui-chart.json',
  'src/locales/zh-CN/ui-views.json',
  'src/locales/zh-Hant/ui-views.json'
]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function validateKnowledgePresentationScope(root, suppliedScope) {
  const file = path.join(root, 'docs/knowledge-layer/review-round2-ui-scope.json');
  if (!suppliedScope && !existsSync(file)) return {};
  const scope = suppliedScope ?? JSON.parse(readFileSync(file));
  if (scope.baseline !== baseline) throw new Error('Unexpected Knowledge UI baseline');
  const hashes = {};
  for (const [file, record] of Object.entries(scope.files)) {
    if (!allowed.has(file)) throw new Error('Outside Knowledge UI scope: ' + file);
    if (hash(execFileSync('git', ['show', `${baseline}:${file}`], {cwd:root})) !== record.before) throw new Error('Knowledge UI baseline mismatch: ' + file);
    if (hash(readFileSync(path.join(root, file))) !== record.after) throw new Error('Knowledge UI content mismatch: ' + file);
    hashes[file] = record.after;
  }
  return hashes;
}
