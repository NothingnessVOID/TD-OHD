import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pentaDetailAdapter as adapter, renderSharedGateReading, renderSharedChannelReading } from '../src/lib/shared-object-details.js';
import { gateReading, channelReading } from '../src/lib/reference-content.js';
import { setLocale } from '../src/lib/i18n.js';
import { PENTA_GATES, PENTA_CHANNELS } from '../src/lib/human-design/penta-catalog.js';
import { listKnowledgeEntries } from '../src/lib/knowledge/registry.js';
const ctx = { groupLabel: 'Synthetic group', people: [{ memberId: 'm1', personId: 'fiction', displayName: '<Alice>', timeUnknown: true, estimatedTime: '12:00' }] };
const record = gate => ({ gate, activations: [{ memberId: 'm1', side: 'design', planet: 'sun', gate, line: 3 }] });

test('three locales reuse exact canonical readings and preserve lens meaning', () => {
  for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
    setLocale(locale, { persist: false });
    for (const lens of ['hd', 'iching', 'gk', 'meridian']) {
      assert.ok(renderSharedGateReading(31, { lens, activeLines: [3] }).includes(gateReading(31, lens, { activeLines: [3] })));
    }
    assert.ok(renderSharedChannelReading('7-31').includes(channelReading('7-31')));
    const html = adapter.gate(record(31), ctx);
    assert.ok(html.indexOf('<header>') < html.indexOf('data-penta-activations'));
    assert.ok(html.indexOf('data-penta-activations') < html.indexOf('data-shared-gate'));
    assert.match(html, /&lt;Alice&gt;/);
    assert.match(html, /12:00/);
    assert.match(html, /D \(/);
    assert.match(html, /31\.3/);
    assert.doesNotMatch(html, /https?:|hd\.penta\.|data-penta-specific|data-detail-status|penta-knowledge-missing/);
    assert.match(html, /data-shared-channel-select="7-31"/);
  }
});
test('all twelve missing gate modules are omitted, six verified channel summaries precede ordinary reading', () => {
  for (const { gate } of PENTA_GATES) assert.doesNotMatch(adapter.gate(record(gate), ctx), /data-penta-specific/);
  for (const channel of PENTA_CHANNELS) {
    const html = adapter.channel({ ...channel, status: 'crossMemberOnly', holdersByGate: { [channel.gates[0]]: ['m1'] } }, ctx);
    assert.ok(html.indexOf('data-penta-channel-state') < html.indexOf('data-penta-specific'));
    assert.ok(html.indexOf('data-penta-specific') < html.indexOf('data-shared-channel-reading'));
    assert.doesNotMatch(html, /https?:|hd\.penta\.|data-detail-status/);
    assert.equal((html.match(/data-shared-gate-select=/g) || []).length, 2);
  }
  assert.equal(listKnowledgeEntries().length, 70);
  assert.equal(listKnowledgeEntries({ includePenta: true }).length, 91);
});
test('caller-owned context isolation and real entry-point reuse', () => {
  const a = adapter.gate(record(31), ctx);
  const b = adapter.gate(record(31), { people: [{ memberId: 'm1', displayName: 'Bob' }] });
  assert.match(a, /Alice/); assert.doesNotMatch(a, /Bob/);
  assert.match(b, /Bob/); assert.doesNotMatch(b, /Alice|12:00/);
  for (const view of ['chart', 'reference']) {
    const source = readFileSync(new URL(`../src/views/${view}.js`, import.meta.url), 'utf8');
    assert.match(source, /renderSharedGateReading\(/);
    assert.match(source, /renderSharedChannelReading\(/);
    assert.match(source, /bindSharedObjectDetails\(/);
    assert.doesNotMatch(source, /\bgateReading\(/);
  }
  const source = readFileSync(new URL('../src/lib/shared-object-details.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /getCurrentChart|localStorage|from .*views\/chart/);
});
