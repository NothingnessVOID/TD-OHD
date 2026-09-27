import test from 'node:test';
import assert from 'node:assert/strict';
import { GATE_DESCRIPTIONS as raw } from 'natalengine';
import { GATE_DESCRIPTIONS as displayed } from '../src/lib/content.js';
import { getLocale, setLocale } from '../src/lib/i18n.js';
import { quarterForGate, quarterGroups } from '../src/lib/quarter.js';

test('four quarters cover all gates once in 16-gate mandala arcs', () => {
  assert.deepEqual(quarterGroups.map(group => group.length), [16, 16, 16, 16]);
  assert.deepEqual([...new Set(quarterGroups.flat())].sort((a, b) => a - b),
    Array.from({ length: 64 }, (_, index) => index + 1));
  assert.equal(quarterGroups[0][0], 13);
  assert.equal(quarterGroups[0].at(-1), 24);
  assert.equal(quarterGroups[1][0], 2);
  assert.equal(quarterGroups[2][0], 7);
  assert.equal(quarterGroups[3][0], 1);
  assert.equal(quarterForGate(3), 'Initiation');
  assert.equal(quarterForGate(0), null);
});

test('display correction is localized and does not rewrite the preserved source', () => {
  const prior = getLocale();
  try {
    setLocale('en', { persist: false });
    assert.equal(raw[3].quarter, 'Mutation');
    assert.equal(displayed[3].quarter, 'Initiation');
    assert.equal(displayed[3].description, raw[3].description);
    setLocale('zh-CN', { persist: false });
    assert.equal(displayed[3].quarter, '启蒙');
    setLocale('zh-Hant', { persist: false });
    assert.equal(displayed[3].quarter, '啟蒙');
  } finally { setLocale(prior, { persist: false }); }
});
