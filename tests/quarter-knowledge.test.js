import test from 'node:test';
import assert from 'node:assert/strict';
import { getKnowledgeEntry, getKnowledgeEntryById, listKnowledgeEntries } from '../src/lib/knowledge/registry.js';
import { renderKnowledgeDetail } from '../src/lib/knowledge/detail-renderer.js';
import { quarterPersonalBasis, renderQuarterLensBody } from '../src/lib/knowledge/quarter-detail.js';
import { QUARTER_IDS, quarterGatesFor, quarterName } from '../src/lib/quarter.js';
import { getLocale, setLocale } from '../src/lib/i18n.js';

const query = id => ({ domain: 'human-design', objectType: 'quarter', objectId: id });
const gatesSection = html => html.match(/<section class="knowledge-surface knowledge-quarter-gates"[\s\S]*?<\/section>/)?.[0] ?? '';
const personalLine = html => html.match(/<p class="knowledge-quarter-personal"[\s\S]*?<\/p>/)?.[0] ?? null;
const bodyHtml = html => html.match(/<div class="knowledge-reading" data-quarter-body>([\s\S]*?)<\/div>/)?.[1] ?? '';
const withLocale = (locale, fn) => { const previous = getLocale(); setLocale(locale, { persist: false }); try { return fn(); } finally { setLocale(previous, { persist: false }); } };

test('four quarter knowledge identities are registered once and resolve by stable id', () => {
  assert.equal(getKnowledgeEntryById('hd.quarter.initiation').id, 'hd.quarter.initiation');
  for (const id of QUARTER_IDS) {
    const entry = getKnowledgeEntry(query(id));
    assert.equal(entry.id, `hd.quarter.${id}`);
    assert.equal(entry.objectType, 'quarter');
    assert.equal(entry.objectId, id);
    assert.equal(entry.hasSummary, true);
    assert.equal(entry.hasDetail, true);
    assert.equal(entry.detail.sourceId, 'quarter-three-view-2026');
    assert.deepEqual(entry.properties.gates, quarterGatesFor(id));
    assert.equal(listKnowledgeEntries().filter(item => item.objectType === 'quarter' && item.objectId === id).length, 1);
  }
  assert.equal(listKnowledgeEntries().filter(item => item.objectType === 'quarter').length, 4);
  assert.equal(getKnowledgeEntry(query('unknown')), null);
});

test('names, purpose theme and every lens body are localized from the same quarter identity', () => {
  for (const locale of ['zh-CN', 'zh-Hant', 'en']) withLocale(locale, () => {
    for (const id of QUARTER_IDS) {
      const entry = getKnowledgeEntry(query(id));
      assert.equal(entry.name, quarterName(id, locale));
      const html = renderKnowledgeDetail(query(id), { quarterLens: 'hd' });
      assert.match(html, new RegExp(`>${entry.name}<`));
      assert.match(html, /knowledge-quarter-theme/);
      assert.match(html, /data-quarter-article/);
      // Exactly the three native reading-category buttons carry data-quarter-lens.
      assert.equal((html.match(/data-quarter-lens="/g) || []).length, 3);
      assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
      assert.match(html, /data-quarter-lens-current="hd"/);
      assert.match(html, /data-quarter-lens-current/);
      // 16 shared gate chips, each carrying the Knowledge→Gate activation id.
      assert.equal((html.match(/data-quarter-gate="/g) || []).length, 16);
      assert.equal((html.match(/data-activation="quarter-gate-/g) || []).length, 16);
      for (const gate of quarterGatesFor(id)) {
        assert.match(gatesSection(html), new RegExp(`data-quarter-gate="${gate}"`));
      }
    }
  });
});

test('the selected lens changes only the body; identity, gates and personal basis stay fixed', () => withLocale('zh-CN', () => {
  const hd = renderKnowledgeDetail(query('duality'), { quarterLens: 'hd', quarterContext: { gate: 18, line: 3, estimated: true } });
  const love = renderKnowledgeDetail(query('duality'), { quarterLens: 'love', quarterContext: { gate: 18, line: 3, estimated: true } });
  const business = renderKnowledgeDetail(query('duality'), { quarterLens: 'business', quarterContext: { gate: 18, line: 3, estimated: true } });
  assert.equal(gatesSection(hd), gatesSection(love));
  assert.equal(gatesSection(hd), gatesSection(business));
  assert.equal(personalLine(hd), personalLine(love));
  assert.equal(bodyHtml(hd).includes('联结'), true);
  assert.equal(bodyHtml(love).includes('关系本身就是人生主题'), true);
  assert.equal(bodyHtml(business).includes('合伙人机制'), true);
  assert.notEqual(bodyHtml(hd), bodyHtml(love));
  assert.equal(renderQuarterLensBody('duality', 'unknown'), renderQuarterLensBody('duality', 'hd'));
}));

test('personal basis is shown only for a valid gate of the same quarter, with explicit estimation', () => withLocale('zh-CN', () => {
  const own = renderKnowledgeDetail(query('initiation'), { quarterContext: { gate: 13, line: 4, estimated: false } });
  assert.match(personalLine(own), /13\.4/);
  assert.equal((own.match(/is-personal/g) || []).length, 1);
  assert.match(own, /data-quarter-personal-gate="true"/);
  assert.doesNotMatch(own, /Quarter estimated/);
  assert.doesNotMatch(own, /出生时间按估算|estimated birth time/);

  const otherQuarter = renderKnowledgeDetail(query('initiation'), { quarterContext: { gate: 2, line: 1, estimated: false } });
  assert.equal(personalLine(otherQuarter), null);
  assert.doesNotMatch(otherQuarter, /is-personal/);

  const invalid = renderKnowledgeDetail(query('initiation'), { quarterContext: { gate: 0 } });
  assert.equal(personalLine(invalid), null);

  const estimated = renderKnowledgeDetail(query('initiation'), { quarterContext: { gate: 3, line: null, estimated: true } });
  assert.match(personalLine(estimated), /3\.—/);
  assert.match(estimated, /data-quarter-personal/);
  assert.deepEqual(quarterPersonalBasis('initiation', { gate: 3, line: 9 }), { gate: 3, line: null, estimated: false });
  assert.deepEqual(quarterPersonalBasis('initiation', { gate: '24', line: 2, estimated: true }), { gate: 24, line: 2, estimated: true });
  assert.deepEqual(quarterPersonalBasis('civilization', { gate: 24, line: 2 }), null);
}));

test('the library article has no personal context unless one is explicitly passed', () => {
  for (const locale of ['zh-CN', 'zh-Hant', 'en']) withLocale(locale, () => {
    const html = renderKnowledgeDetail('hd.quarter.civilization');
    assert.equal(personalLine(html), null);
    assert.doesNotMatch(html, /is-personal|data-quarter-personal|quarter-personal-gate/);
    assert.doesNotMatch(html, /〔|三一教材|毛毛撰写/);
  });
});

test('quarter copy carries no source labels or scores in any lens or locale', () => {
  for (const locale of ['zh-CN', 'zh-Hant', 'en']) withLocale(locale, () => {
    for (const id of QUARTER_IDS) for (const lens of ['hd', 'business', 'love']) {
      const html = renderKnowledgeDetail(query(id), { quarterLens: lens });
      assert.doesNotMatch(html, /〔|三一教材|毛毛撰写|sourceId|reviewStatus/);
      assert.doesNotMatch(html, /评分|适合指数|[0-9]\/10/);
    }
  });
});
