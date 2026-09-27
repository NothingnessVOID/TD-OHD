import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceEntries, referenceEntry, searchReference, circuitChannels } from '../src/lib/reference-catalog.js';
import { channelsForGate } from '../src/lib/reference-content.js';

test('the reference catalog covers the engine topology without top-level lines', () => {
  const entries = referenceEntries();
  for (const [kind, expected] of [['center', 9], ['channel', 36], ['gate', 64]]) {
    assert.equal(entries.filter(entry => entry.kind === kind).length, expected);
  }
  assert.equal(entries.some(entry => entry.kind === 'line'), false);
  for (const gate of [10, 20, 34, 57]) {
    const partners = channelsForGate(gate).map(channel => channel.gates.join('-'));
    assert.equal(partners.length, 3, `Gate ${gate} keeps all integration partners`);
    assert.equal(new Set(partners).size, partners.length);
  }
  assert.ok(circuitChannels('group', 'individual').some(ch => ch.circuit === 'integration'));
});

test('reversed and typographic channel IDs resolve while invalid gate and line IDs stay invalid', () => {
  assert.equal(referenceEntry('channel', '60–3')?.id, '3-60');
  assert.equal(referenceEntry('channel', '60-3')?.id, '3-60');
  assert.equal(searchReference('14.2')[0]?.id, '14');
  assert.equal(searchReference('14.2')[0]?.line, 2);
  for (const value of ['14.0', '14.7', '14.foo', '14.1.extra']) assert.deepEqual(searchReference(value), []);
  assert.equal(referenceEntry('gate', '65'), null);
  assert.equal(referenceEntry('channel', '1-2'), null);
});
