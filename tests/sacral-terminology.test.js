import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import cn from '../src/lib/knowledge/content/human-design-zh-CN.js';
import supplements from '../src/lib/reference-supplements.json' with { type: 'json' };

test('simplified Chinese knowledge and reference prose use 骶骨 consistently', () => {
  for (const [label, content] of [['knowledge', cn], ['reference', supplements['zh-CN']]]) {
    const prose = JSON.stringify(content);
    assert.doesNotMatch(prose, /荐骨|薦骨/, label);
    assert.match(prose, /骶骨/, label);
  }
  const root = new URL('../src/locales/zh-CN/', import.meta.url);
  for (const file of readdirSync(root).filter(name => /\.(json|js)$/.test(name))) {
    assert.doesNotMatch(readFileSync(new URL(file, root), 'utf8'), /荐骨|薦骨/, file);
  }
});
