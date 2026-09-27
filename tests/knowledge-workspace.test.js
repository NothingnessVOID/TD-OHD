import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseBirth, BirthInputError } from '../src/lib/birth-input.js';
import { knowledgeEntries, knowledgeCounts, knowledgeEntry, searchKnowledge } from '../src/lib/knowledge-catalog.js';
import '../src/lib/knowledge-messages.js';
import { setLocale, ensureLocale } from '../src/lib/i18n.js';
import { checkedPng } from '../src/lib/chart-export.js';
import { hangingGatePartners } from '../src/lib/knowledge-topology.js';
import { calculateHumanDesign, analyzePenta } from 'natalengine';
await Promise.all([ensureLocale('zh-CN'), ensureLocale('zh-Hant')]);

const birth = {
  birthDate: '2000-02-29', birthTime: '14:30', timezone: 8,
  location: { name: 'Synthetic', lat: 0, lon: 0 }
};

test('birth boundary preserves minute precision and rejects silent repairs', () => {
  assert.equal(normaliseBirth(birth).birthTime, '14:30');
  assert.equal(normaliseBirth({ ...birth, birthTime: '14:30:00' }).birthTime, '14:30');
  assert.throws(() => normaliseBirth({ ...birth, birthTime: '14:30:42' }), BirthInputError);
  assert.equal(normaliseBirth({ ...birth, birthTime: '14:30:42' }, { confirmMinute: true }).birthTime, '14:30');
  assert.throws(() => normaliseBirth({ ...birth, birthDate: '2001-02-29' }), /valid birth date/);
  assert.throws(() => normaliseBirth({ ...birth, birthTime: '24:00' }), /valid birth time/);
  assert.throws(() => normaliseBirth({ ...birth, timezone: 99 }), /valid birth UTC offset/);
  assert.throws(() => normaliseBirth({ ...birth, location: { lat: 91, lon: 0 } }), /valid birth coordinates/);
  const unknown = normaliseBirth({ ...birth, timeUnknown: true, birthTime: null });
  assert.equal(unknown.birthTime, '12:00');
  assert.equal(unknown.timeUnknown, true);
});

test('library exposes every stable center, channel, gate and line without a chart', () => {
  const entries = knowledgeEntries();
  const counts = knowledgeCounts();
  assert.deepEqual([counts.center, counts.channel, counts.gate, counts.line], [9, 36, 64, 384]);
  assert.deepEqual([counts['circuit-group'], counts.circuit, counts.network], [3, 6, 1]);
  assert.equal(new Set(entries.map(entry => `${entry.type}/${entry.id}`)).size, entries.length);
  assert.equal(knowledgeEntry('line', '60.6')?.id, '60.6');
  assert.equal(knowledgeEntry('channel', '38-28')?.id, '28-38');
  assert.equal(knowledgeEntry('channel', '28-38')?.id, '28-38');
});

test('search follows language choice and accepts channel reverse aliases', () => {
  setLocale('en', { persist: false });
  assert.equal(searchKnowledge('38-28', { type: 'channel' })[0]?.id, '28-38');
  assert.equal(searchKnowledge('limitation', { type: 'gate' })[0]?.id, '60');
  assert.equal(searchKnowledge('限制', { type: 'gate' })[0]?.id, '60');
  setLocale('zh-CN', { persist: false });
  assert.equal(searchKnowledge('限制', { type: 'gate' })[0]?.id, '60');
  setLocale('zh-Hant', { persist: false });
  assert.equal(searchKnowledge('限制', { type: 'gate' })[0]?.id, '60');
  setLocale('en', { persist: false });
});

test('static image export accepts PNG bytes, not an empty or mislabeled blob', async () => {
  const signature = Uint8Array.from([137,80,78,71,13,10,26,10, ...new Array(16).fill(0)]);
  const valid = new Blob([signature], { type: 'image/png' });
  assert.equal(await checkedPng(valid), valid);
  await assert.rejects(checkedPng(new Blob([], { type: 'image/png' })), /Invalid PNG/);
  await assert.rejects(checkedPng(new Blob([signature], { type: 'text/plain' })), /Invalid PNG/);
});

test('a chart with no complete channel still has accessible hanging gates', () => {
  assert.deepEqual(hangingGatePartners([10]).find(row => row.gate === 10)?.partners, [20, 34, 57]);
  assert.equal(hangingGatePartners([10, 20]).find(row => row.gate === 10)?.partners.includes(20), false);
});

test('nine synthetic team members retain every returned connection', () => {
  const charts = Array.from({ length: 9 }, (_, index) => calculateHumanDesign(`2000-05-${String(index + 1).padStart(2, '0')}`, 12.5, 8));
  const result = analyzePenta(charts, charts.map((_, index) => `Synthetic ${index + 1}`));
  assert.equal(result.memberCount, 9);
  assert.ok(result.electromagnetics.length > 10);
});
