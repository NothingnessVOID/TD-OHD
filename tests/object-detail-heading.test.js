import test from 'node:test';
import assert from 'node:assert/strict';
import { renderGateDetailHeading, renderChannelDetailHeading, renderDetailNavigation } from '../src/lib/object-detail-heading.js';
import { pentaDetailAdapter } from '../src/lib/shared-object-details.js';
import { PENTA_CHANNELS } from '../src/lib/human-design/penta-catalog.js';
import { getKnowledgeEntry } from '../src/lib/knowledge/registry.js';
import { setLocale } from '../src/lib/i18n.js';
import { gateName, hexagramName } from '../src/lib/vocabulary.js';

test('localized shared headings are used by Penta, with canonical badges and no contextual state', () => {
  for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
    setLocale(locale, { persist: false });
    const heading = renderGateDetailHeading(31);
    assert.ok(heading.includes(gateName(31)));
    assert.ok(heading.includes(hexagramName(31)));
    assert.match(heading, /class="detail-label"/);
    assert.match(heading, /class="detail-name"/);
    const gate = pentaDetailAdapter.gate({ gate: 31, activations: [] }, { groupLabel: 'Group only' });
    assert.ok(gate.includes(`<div class="tl-detail-heading">${heading}</div>`));
    assert.ok(gate.indexOf('data-penta-activations') < gate.indexOf('data-shared-gate='));
    assert.ok(gate.indexOf('data-shared-gate=') < gate.indexOf('data-shared-channel-select='));
    assert.doesNotMatch(heading, /Group only|data-penta-activations/);
    for (const channel of PENTA_CHANNELS) {
      const title = renderChannelDetailHeading(channel.channelId);
      assert.equal((title.match(/class="circuit-badge /g) || []).length, 2);
      const html = pentaDetailAdapter.channel({ ...channel, status: 'absent' });
      assert.ok(html.includes(`<div class="tl-detail-heading">${title}</div>`));
      assert.ok(html.indexOf('data-penta-channel-state') < html.indexOf('data-shared-channel-reading'));
      assert.ok(html.indexOf('data-shared-channel-reading') < html.indexOf('data-shared-gate-select='));
      const entry = getKnowledgeEntry({ domain: 'human-design', objectType: 'penta', objectId: `channel:${channel.channelId}` });
      if (entry.properties.interpretationStatus !== 'verified') assert.doesNotMatch(html, /data-penta-specific/);
    }
  }
});
test('group activations group stable member IDs and scope side color hooks to markers', () => {
  const html = pentaDetailAdapter.gate({ gate: 31, activations: [
    { memberId: 'a', side: 'design', planet: 'sun', gate: 31, line: 3 },
    { memberId: 'b', side: 'personality', planet: 'moon', gate: 31, line: 1 },
    { memberId: 'a', side: 'personality', planet: 'earth', gate: 31, line: 5 }
  ] }, { people: [{ memberId: 'a', displayName: 'Same' }, { memberId: 'b', displayName: 'Same' }] });
  assert.equal((html.match(/data-penta-member=/g) || []).length, 2);
  assert.equal((html.match(/<h4>Same<\/h4>/g) || []).length, 2);
  assert.equal((html.match(/<span data-activation-side="design"/g) || []).length, 1);
  assert.equal((html.match(/<span data-activation-side="personality"/g) || []).length, 2);
  assert.ok(html.indexOf('31.5') < html.indexOf('data-penta-member="b"'));
  assert.doesNotMatch(html, /<li[^>]+data-activation-side/);
});
test('navigation exposes accessible close and optional delegated back without owning history', () => {
  assert.doesNotMatch(renderDetailNavigation(), /data-shared-back/);
  assert.match(renderDetailNavigation({ canGoBack: true }), /data-shared-back/);
  assert.match(renderDetailNavigation(), /class="gate-detail-close"[^>]+aria-label=/);
  assert.equal(pentaDetailAdapter.navigation, renderDetailNavigation);
  assert.equal(renderGateDetailHeading(99), '');
  assert.equal(renderChannelDetailHeading('bad'), '');
});
