import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaDetailRenderer, renderOrgGateReading } from '../src/views/wa-detail-content.js';
import { ORG_READING_CONTENT, readOrgGateBody } from '../src/lib/wa/org-reading-content.js';
import baseZhCN from '../src/lib/wa/org-reading-content.zh-CN.js';
import baseZhHant from '../src/lib/wa/org-reading-content.zh-Hant.js';
import baseEn from '../src/lib/wa/org-reading-content.en.js';
import gates40ZhCN from '../src/lib/wa/org-reading-content.gates40.zh-CN.js';
import gates40ZhHant from '../src/lib/wa/org-reading-content.gates40.zh-Hant.js';
import gates40En from '../src/lib/wa/org-reading-content.gates40.en.js';
import { orgGateName, orgGateCopy } from '../src/lib/wa/org-role-readings.js';
import { OC16_DEPARTMENTS } from '../src/lib/wa/oc16-catalog.js';
import { GATE_DESCRIPTIONS } from '../src/lib/content.js';
import { setLocale, t } from '../src/lib/i18n.js';
import { esc } from '../src/lib/format.js';

const LOCALES = ['zh-CN', 'zh-Hant', 'en'];
const BASES = { 'zh-CN': baseZhCN, 'zh-Hant': baseZhHant, en: baseEn };
const REMAINING = { 'zh-CN': gates40ZhCN, 'zh-Hant': gates40ZhHant, en: gates40En };
const TITLES = { 'zh-CN': '商业解读', 'zh-Hant': '商業解讀', en: 'Business reading' };
/** Every gate in the OC16 partition: 32 channels × 2 ends, each gate exactly once. */
const ALL_GATES = [...new Set(OC16_DEPARTMENTS.flatMap(department => department.pairs.flatMap(pair => pair.gates)))]
  .sort((a, b) => a - b);
const gateKeys = object => Object.keys(object ?? {}).map(Number).sort((a, b) => a - b);
/** The normalizer's presentation fields only; anything else in an authored entry is maintenance metadata. */
const presentable = entry => ({
  intro: typeof entry?.intro === 'string' && entry.intro.trim() ? entry.intro.trim() : null,
  application: typeof entry?.application === 'string' && entry.application.trim() ? entry.application.trim() : null,
  organizationRole: typeof entry?.organizationRole === 'string' && entry.organizationRole.trim() ? entry.organizationRole.trim() : null,
  role: typeof entry?.role === 'string' && entry.role.trim() ? entry.role.trim() : null
});
const fixture = () => ({ status: 'ready', gateRecords: [], memberIds: [], pairs: [], departments: [] });
const renderer = () => createWaDetailRenderer({ getResult: fixture, nameOf: id => `Fictional ${id}` });

test('the remaining forty gates are delivered once, in three locales, with no overlap', () => {
  for (const locale of LOCALES) {
    const base = gateKeys(BASES[locale].gates);
    const extra = gateKeys(REMAINING[locale].gates);
    assert.equal(base.length, 12, `${locale} Penta gates`);
    assert.equal(extra.length, 40, `${locale} remaining gates`);
    const overlap = extra.filter(gate => base.includes(gate));
    assert.deepEqual(overlap, [], `${locale} overlap`);
    const union = [...base, ...extra].sort((a, b) => a - b);
    assert.equal(union.length, 52, `${locale} integrated gate table`);
    // Delivered, non-empty prose under all three locales; the published reader keeps its signature.
    for (const gate of extra) {
      const body = readOrgGateBody(gate, locale);
      assert.ok(body, `${locale} gate ${gate}`);
      for (const field of ['role', 'intro', 'application']) {
        assert.equal(typeof body[field], 'string', `${locale} gate ${gate} ${field}`);
        assert.ok(body[field].trim().length > 0, `${locale} gate ${gate} ${field}`);
      }
      assert.equal(ORG_READING_CONTENT.gates[locale][gate].intro, body.intro);
    }
    // The indexed table is exactly the two authored sets, unchanged and metadata-free.
    assert.deepEqual(ORG_READING_CONTENT.gates[locale],
      Object.fromEntries([...base, ...extra].sort((a, b) => a - b).map(gate =>
        [gate, presentable(gate in BASES[locale].gates ? BASES[locale].gates[gate] : REMAINING[locale].gates[gate])])));
  }
});

test('channel copy is untouched: the thirty-two titles and bodies merge with no channel or name change', () => {
  for (const locale of LOCALES) {
    assert.equal(Object.keys(ORG_READING_CONTENT.channels[locale]).length, 32, `${locale} channels`);
    assert.deepEqual(ORG_READING_CONTENT.channels[locale],
      Object.fromEntries(Object.entries(BASES[locale].channels).map(([id, entry]) => [id, presentable(entry)])));
    assert.deepEqual(ORG_READING_CONTENT.names[locale],
      Object.fromEntries(Object.entries(BASES[locale].channels).filter(([, entry]) => entry.name?.trim()).map(([id, entry]) => [id, entry.name.trim()])));
  }
});

test('all sixty-four catalog gates render their own business reading in every locale', () => {
  for (const locale of LOCALES) {
    setLocale(locale, { persist: false });
    const view = renderer();
    assert.equal(ALL_GATES.length, 64);
    for (const gate of ALL_GATES) {
      const html = view.renderGate(gate);
      assert.equal((html.match(new RegExp(`<h3>${TITLES[locale]}</h3>`, 'g')) || []).length, 1, `${locale} gate ${gate} title`);
      assert.match(html, /data-wa-org-reading="gate"/, `${locale} gate ${gate}`);
      assert.match(html, /data-wa-org-body="(integrated|organization)"/, `${locale} gate ${gate} body`);
      assert.doesNotMatch(html, /data-wa-shared-knowledge/, `${locale} gate ${gate} shared fallback`);
      assert.doesNotMatch(html, /data-wa-org-pending/, `${locale} gate ${gate} pending`);
      // The prose shown is the organization business copy for this gate, not a shared natal description.
      const integrated = readOrgGateBody(gate, locale);
      const legacy = orgGateCopy(gate);
      const expected = integrated?.intro ?? legacy?.body;
      assert.ok(expected, `${locale} gate ${gate} expected copy`);
      assert.ok(html.includes(esc(expected)), `${locale} gate ${gate} own copy`);
      const shared = GATE_DESCRIPTIONS[gate];
      for (const field of ['keynote', 'description']) {
        const sharedText = typeof shared?.[field] === 'string' ? shared[field].trim() : '';
        if (sharedText.length >= 12) assert.ok(!html.includes(esc(sharedText)), `${locale} gate ${gate} ${field} leaked`);
      }
      // Role callout and sheet heading keep the organization name rule (twelve department gates first).
      assert.ok(html.includes(esc(orgGateName(gate))), `${locale} gate ${gate} role`);
    }
  }
  setLocale('zh-CN', { persist: false });
});

test('channel sheets keep one reading surface and still never expand a department roster', () => {
  for (const locale of LOCALES) {
    setLocale(locale, { persist: false });
    const view = renderer();
    for (const channelId of ['21-45', '4-63', '37-40', '42-53']) {
      const html = view.renderPair(channelId);
      assert.equal((html.match(/data-wa-org-reading="channel"/g) || []).length, 1, `${locale} ${channelId}`);
      assert.equal((html.match(/data-wa-org-reading="gate"/g) || []).length, 0, `${locale} ${channelId} gate section`);
      assert.equal((html.match(/<h3>[^<]*<\/h3>/g) || []).filter(row => row.includes(TITLES[locale])).length, 1, `${locale} ${channelId} title`);
      // The single reading section is this channel's own; related jumps stay buttons, not readings.
      assert.match(html, new RegExp(`data-wa-org-reading="channel" data-wa-org-body="(integrated|department|default)" data-wa-channel="${channelId}"`), `${locale} ${channelId} own reading`);
    }
  }
  setLocale('zh-CN', { persist: false });
});

test('provenance never reaches the rendered page', () => {
  const forbidden = ['sourceRefs', 'editorialBasis', 'ghd-gate', 'hdhd-gates', 'oc16-catalog', 'gethumandesign'];
  for (const locale of LOCALES) {
    setLocale(locale, { persist: false });
    const view = renderer();
    for (const gate of ALL_GATES) {
      const html = view.renderGate(gate);
      for (const needle of forbidden) assert.ok(!html.includes(needle), `${locale} gate ${gate} ${needle}`);
    }
    for (const [, body] of Object.entries(ORG_READING_CONTENT.gates[locale])) {
      for (const key of Object.keys(body)) assert.ok(['intro', 'application', 'organizationRole', 'role'].includes(key), key);
    }
  }
  setLocale('zh-CN', { persist: false });
});

test('a catalog gate without business copy says so instead of borrowing the natal description', () => {
  const missing = () => null;
  for (const locale of LOCALES) {
    setLocale(locale, { persist: false });
    const html = renderOrgGateReading(4, { gateBody: missing, gateCopy: missing });
    assert.match(html, /data-wa-org-body="pending"/);
    assert.match(html, /data-wa-org-pending/);
    assert.ok(html.includes(t('Wa org gate reading pending')));
    assert.doesNotMatch(html, /data-wa-shared-knowledge/);
    const shared = GATE_DESCRIPTIONS[4];
    assert.ok(!html.includes(esc(shared.keynote)), `${locale} keynote leaked`);
    assert.ok(!html.includes(esc(shared.description)), `${locale} description leaked`);
    // Non-catalog gates stay empty: no invented copy, no pending placeholder for a gate the page never lists.
    assert.equal(renderOrgGateReading(65, { gateBody: missing, gateCopy: missing }), '');
    assert.equal(renderer().renderGate(65), '');
  }
  setLocale('zh-CN', { persist: false });
});

test('the twelve department gate roles keep priority over any merged gate wording', () => {
  const roles = { 'zh-CN': { 21: '控制者', 45: '统治者', 2: '方向', 14: '大蓄' },
    'zh-Hant': { 21: '控制者', 45: '統治者', 2: '方向', 14: '大畜' },
    en: { 21: 'Controller', 45: 'Ruler', 2: 'Direction', 14: 'Great provision' } };
  for (const locale of LOCALES) {
    setLocale(locale, { persist: false });
    for (const [gate, role] of Object.entries(roles[locale])) assert.equal(orgGateName(Number(gate)), role, `${locale} ${gate}`);
    // 2 and 14 exist in the Penta table as 协调 / 容量; the organization heading must not read them.
    const view = renderer();
    assert.doesNotMatch(view.renderGate(2), new RegExp(locale === 'en' ? 'Coordination' : '协调|協調'));
    assert.doesNotMatch(view.renderGate(14), new RegExp(locale === 'en' ? 'Capacity' : '容量'));
  }
  setLocale('zh-CN', { persist: false });
});
