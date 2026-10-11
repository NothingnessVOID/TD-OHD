import test from 'node:test';
import assert from 'node:assert/strict';
import { pentaReadingEntry, renderPentaReading, pentaDetailAdapter, renderSharedGateReading, renderSharedChannelReading } from '../src/lib/shared-object-details.js';
import { readPentaSummary } from '../src/lib/knowledge/penta-reading-policy.js';
import { referenceEntries } from '../src/lib/reference-catalog.js';
import { pentaRecords } from '../src/lib/knowledge/penta-foundation.js';
import { listKnowledgeEntries } from '../src/lib/knowledge/registry.js';
import { setLocale } from '../src/lib/i18n.js';
import { gateReading, channelReading } from '../src/lib/reference-content.js';
import { hexagramName } from '../src/lib/vocabulary.js';
import { esc } from '../src/lib/format.js';

test('all 29 Penta entries expose distinct reviewed summary/detail and safe multi-paragraph articles in three locales', () => {
  for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
    setLocale(locale, { persist: false });
    const entries = listKnowledgeEntries({ includePenta: true }).filter(e => e.objectType === 'penta');
    assert.equal(entries.length, 29);
    assert.equal(listKnowledgeEntries().length, 70);
    for (const entry of entries) {
      const accepted = pentaReadingEntry(entry.objectId);
      assert.ok(accepted, entry.id);
      assert.ok(accepted.summary?.content.trim());
      assert.ok(accepted.detail?.content.trim());
      assert.notEqual(accepted.summary.content.trim(), accepted.detail.content.trim());
      const html = renderPentaReading(entry.objectId);
      assert.match(html, /knowledge-summary-callout/);
      assert.match(html, /knowledge-body/);
      assert.ok((html.match(/<p>/g) || []).length >= 3, entry.id);
      assert.ok(html.includes(esc(entry.name)));
      assert.doesNotMatch(html, /undefined|humanApproval|editorialReview|sourceRefs/);
    }
    const gate = pentaDetailAdapter.gate({ gate: 31, activations: [] });
    assert.ok(gate.includes(esc(hexagramName(31))));
    assert.ok(gate.includes(renderSharedGateReading(31)));
    assert.ok(renderSharedGateReading(31).includes(gateReading(31, 'hd', { activeLines: [], selectedLine: null })));
    assert.ok(renderSharedChannelReading('7-31').includes(channelReading('7-31')));
  }
});

test('editorial acceptance rejects forged status, absent review, wrong sources, missing or duplicate slots', () => {
  const record = pentaRecords.find(r => r.objectId === 'gate:31');
  const original = { properties: record.properties, reviewStatus: record.reviewStatus, summary: record.summary, detail: record.detail };
  const reset = () => Object.assign(record, original);
  try {
    assert.ok(pentaReadingEntry('gate:31'));
    for (const patch of [
      { interpretationStatus: 'missing' },
      { contentPackage: 'unknown' },
      { editorialReview: { status: 'incomplete', humanApproval: false } },
      { editorialReview: { status: 'complete', actor: 'unknown' } },
      { contentVersion: 999 },
      { sourceRefs: [] },
      { sourceRefs: [{ sourceId: 'bogus', locator: 'page 1', scope: 'claim' }] },
      { sourceRefs: [{ sourceId: 'J1', locator: '', scope: 'claim' }] }
    ]) {
      reset(); record.properties = () => ({ ...original.properties(), ...patch });
      assert.equal(pentaReadingEntry('gate:31'), null, JSON.stringify(patch));
    }
    reset(); record.properties = () => ({ ...original.properties(), editorialReview: { ...original.properties().editorialReview, humanApproval: true } });
    assert.ok(pentaReadingEntry('gate:31'), 'later human approval does not remove editorial content');
    reset(); record.reviewStatus = 'unreviewed';
    assert.equal(pentaReadingEntry('gate:31'), null);
    for (const field of ['summary', 'detail']) {
      for (const patch of [{ reviewStatus: 'unreviewed' }, { sourceId: 'unknown' }, { read: () => '  ' }]) {
        reset(); record[field] = { ...original[field], ...patch };
        assert.equal(pentaReadingEntry('gate:31')[field], null, `${field}: ${JSON.stringify(patch)}`);
      }
      reset(); record[field] = null;
      assert.equal(pentaReadingEntry('gate:31')[field], null);
    }
    reset(); record.detail = { ...original.detail, read: () => { throw new Error('Detail must not resolve'); } };
    assert.ok(readPentaSummary('gate:31')?.content);
    assert.ok(referenceEntries().find(entry => entry.id === record.id).summary);
    record.properties = () => ({ ...original.properties(), interpretationStatus: 'verified', evidence: { status: 'verified' }, sourceRefs: [{ sourceId: 'bogus' }] });
    assert.equal(readPentaSummary('gate:31'), null);
    assert.equal(referenceEntries().find(entry => entry.id === record.id).summary, '');
    reset(); record.properties = () => ({ ...original.properties(), sourceRefs: [{ sourceId: 'bogus' }] });
    assert.equal(readPentaSummary('gate:31'), null);
    assert.equal(referenceEntries().find(entry => entry.id === record.id).summary, '');
  } finally { reset(); }
});

test('legacy verified path keeps independent slots and rejects unverified specialist text', () => {
  const record = pentaRecords.find(r => r.objectId === 'channel:7-31');
  const original = { properties: record.properties, reviewStatus: record.reviewStatus, summary: record.summary, detail: record.detail };
  try {
    record.properties = () => ({ evidence: { status: 'verified' }, interpretationStatus: 'verified' });
    record.reviewStatus = 'reviewed';
    record.summary = { ...original.summary, read: () => 'Verified summary', evidenceStatus: 'verified' };
    record.detail = null;
    const summaryOnly = renderPentaReading('channel:7-31');
    assert.equal((summaryOnly.match(/Verified summary/g) || []).length, 1);
    assert.ok(pentaReadingEntry('channel:7-31').summary);
    assert.equal(pentaReadingEntry('channel:7-31').detail, null);
    record.summary = null;
    record.detail = { ...original.detail, read: () => '<script>unsafe</script>\n\nSecond paragraph', evidenceStatus: 'verified' };
    const detailOnly = renderPentaReading('channel:7-31');
    assert.doesNotMatch(detailOnly, /knowledge-summary-callout|<script>/);
    assert.match(detailOnly, /&lt;script&gt;/);
    record.detail.evidenceStatus = 'missing';
    assert.equal(renderPentaReading('channel:7-31'), '');
    record.properties = () => ({ evidence: { status: 'verified' }, interpretationStatus: 'missing' });
    assert.equal(pentaReadingEntry('channel:7-31'), null);
  } finally { Object.assign(record, original); }
});
