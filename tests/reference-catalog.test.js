import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceEntries, referenceEntry, searchReference, circuitChannels } from '../src/lib/reference-catalog.js';
import { channelsForGate } from '../src/lib/reference-content.js';
import { CIRCUIT_GROUPS, channelCircuit } from '../src/lib/circuit-topology.js';
import { CHANNELS } from 'natalengine';

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
  assert.equal(entries.filter(entry => entry.kind === 'group').length, 3);
  assert.equal(entries.filter(entry => entry.kind === 'circuit').length, 0);
  assert.ok(circuitChannels('group', 'individual').some(ch => channelCircuit(ch).circuit === 'integration'));
  for (const query of ['Integration', '整合']) {
    assert.ok(searchReference(query).some(entry => entry.kind === 'group' && entry.id === 'individual'));
  }
});

test('reversed and typographic channel IDs resolve while invalid gate and line IDs stay invalid', () => {
  assert.equal(referenceEntry('channel', '60–3')?.id, '3-60');
  assert.equal(referenceEntry('channel', '60-3')?.id, '3-60');
  assert.ok(searchReference('14').some(entry => entry.kind === 'gate' && entry.id === '14'));
  for (const value of ['14.', '14.2', '14.0', '14.7', '14.foo', '14.1.extra']) assert.deepEqual(searchReference(value), []);
  assert.equal(searchReference('', 'group').length, 3);
  assert.deepEqual(searchReference('', 'circuit'), []);
  assert.equal(referenceEntry('circuit', 'logic')?.id, 'collective', 'old circuit links open their parent group');
  assert.equal(referenceEntry('gate', '65'), null);
  assert.equal(referenceEntry('channel', '1-2'), null);
});

test('the three groups partition all channels and Integration contains exactly four', () => {
  const seen = new Set();
  for (const [group, circuits] of Object.entries(CIRCUIT_GROUPS)) {
    const channels = circuitChannels('group', group);
    for (const circuit of circuits) assert.ok(channels.some(channel => channelCircuit(channel).circuit === circuit));
    for (const channel of channels) {
      const id = channel.gates.join('-');
      assert.equal(seen.has(id), false, `${id} occurs in one group`);
      seen.add(id);
    }
  }
  assert.equal(seen.size, CHANNELS.length);
  assert.deepEqual(circuitChannels('circuit', 'integration').map(ch => ch.gates.join('-')).sort(),
    ['10-20', '10-57', '20-34', '34-57']);
  assert.equal(channelCircuit(CHANNELS.find(ch => ch.gates.join('-') === '10-34')).circuit, 'centering');
  assert.equal(channelCircuit(CHANNELS.find(ch => ch.gates.join('-') === '20-57')).circuit, 'knowing');
});
