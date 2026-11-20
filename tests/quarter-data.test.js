import test from 'node:test';
import assert from 'node:assert/strict';
import { QUARTER_IDS, quarterForGate, quarterGroups, quarterGatesFor, quarterIdForGate, quarterName } from '../src/lib/quarter.js';
import { personalQuarterFacts } from '../src/lib/quarter-personal.js';
import { quarterBusinessLead, quarterLensOptions, quarterLensText, quarterTheme, QUARTER_LENS_IDS } from '../src/lib/quarter-content.js';
import { getLocale, setLocale } from '../src/lib/i18n.js';

const chart = (overrides = {}) => ({ gates: { personality: { sun: { gate: 3, line: 2 } }, design: { sun: { gate: 55, line: 5 } } }, ...overrides });

test('stable quarter ids keep the canonical 16-gate partition and the original lookup contract', () => {
  assert.deepEqual(QUARTER_IDS, ['initiation', 'civilization', 'duality', 'mutation']);
  assert.equal(quarterGroups.length, 4);
  for (const [index, id] of QUARTER_IDS.entries()) {
    assert.deepEqual(quarterGatesFor(id), quarterGroups[index]);
    assert.equal(quarterGatesFor(id).length, 16);
    for (const gate of quarterGatesFor(id)) assert.equal(quarterIdForGate(gate), id);
  }
  const all = QUARTER_IDS.flatMap(id => quarterGatesFor(id));
  assert.equal(new Set(all).size, 64);
  assert.deepEqual([...all].sort((a, b) => a - b), Array.from({ length: 64 }, (_, index) => index + 1));
  // The original API is unchanged: localized label or null, never an id.
  assert.equal(quarterForGate(3), 'Initiation');
  assert.equal(quarterForGate(3, 'zh-CN'), '启蒙');
  assert.equal(quarterForGate(16, 'zh-Hant'), '文明');
  assert.equal(quarterForGate(64, 'zh-CN'), '二元性');
  assert.equal(quarterForGate(0), null);
  assert.equal(quarterForGate(65), null);
  assert.equal(quarterIdForGate('3'), 'initiation');
  assert.equal(quarterIdForGate(3.5), null);
  assert.equal(quarterName('unknown'), null);
  assert.equal(quarterGatesFor('unknown'), null);
  // Copies: callers cannot mutate the canonical groups.
  quarterGatesFor('initiation').push(99);
  assert.equal(quarterGatesFor('initiation').length, 16);
});

test('personal quarter facts read only the Personality Sun gate and line', () => {
  assert.deepEqual(personalQuarterFacts({ chart: chart() }),
    { status: 'ready', id: 'initiation', gate: 3, line: 2, estimated: false });
  // Design Sun, other planets and channels are not a fallback.
  const designOnly = { gates: { personality: { sun: null, earth: { gate: 3, line: 1 }, moon: { gate: 3, line: 1 } }, design: { sun: { gate: 55, line: 5 } } }, channels: [{ gates: [3, 60] }] };
  assert.deepEqual(personalQuarterFacts({ chart: designOnly }), { status: 'insufficient', id: null, gate: null, line: null, estimated: false });
  assert.deepEqual(personalQuarterFacts({ chart: { gates: { personality: { sun: { gate: 3, line: 1 } }, design: { sun: { gate: 3, line: 1 } } } } }),
    { status: 'ready', id: 'initiation', gate: 3, line: 1, estimated: false });
  // Explicit estimation only: no 12:00 inference and no chart-level guess.
  assert.equal(personalQuarterFacts({ chart: chart(), timeUnknown: true }).estimated, true);
  assert.equal(personalQuarterFacts({ chart: chart(), birthTimeConfidence: 'estimated' }).estimated, true);
  assert.equal(personalQuarterFacts({ chart: chart(), birthTimeConfidence: 'exact' }).estimated, false);
  assert.equal(personalQuarterFacts({ chart: chart(), timeUnknown: false, birthTimeConfidence: 'unknown' }).estimated, false);
  // Missing or invalid data never defaults to a quarter.
  for (const bad of [undefined, null, {}, { gate: 0 }, { gate: 65 }, { gate: '3' }, { gate: 3.2 }]) {
    const facts = personalQuarterFacts({ chart: { gates: { personality: { sun: bad } } } });
    assert.equal(facts.status, 'insufficient');
    assert.equal(facts.id, null);
  }
  assert.equal(personalQuarterFacts().status, 'insufficient');
  // A missing line keeps the gate fact but does not invent a line.
  assert.deepEqual(personalQuarterFacts({ chart: { gates: { personality: { sun: { gate: 2 } } } } }),
    { status: 'ready', id: 'civilization', gate: 2, line: null, estimated: false });
});

test('three lens bodies and the purpose theme exist in every locale without source labels', () => {
  const previous = getLocale();
  for (const locale of ['zh-CN', 'zh-Hant', 'en']) {
    setLocale(locale, { persist: false });
    for (const id of QUARTER_IDS) {
      const theme = quarterTheme(id, locale);
      assert.ok(theme && theme.length > 3, `${locale}/${id} theme`);
      assert.doesNotMatch(theme, /〔|三一教材|毛毛撰写/);
      for (const lens of QUARTER_LENS_IDS) {
        const body = quarterLensText(id, lens, locale);
        assert.ok(body && body.length > 8, `${locale}/${id}/${lens}`);
        assert.doesNotMatch(body, /〔|三一教材|毛毛撰写|官方|据.{0,6}老师|来源/);
        assert.doesNotMatch(body, /\d+\s*分|[0-9]+\/10|评分|适合指数/);
      }
    }
    assert.ok(quarterBusinessLead(locale));
    assert.equal(quarterLensText('initiation', 'iching', locale), null);
    assert.equal(quarterLensText('missing', 'hd', locale), null);
    // Labels follow the three supplied view names, including OC16.
    const labels = Object.fromEntries(quarterLensOptions());
    assert.deepEqual(labels, locale === 'en'
      ? { hd: 'Human Design', business: 'OC16', love: 'Love' }
      : { hd: locale === 'zh-CN' ? '人类图' : '人類圖', business: 'OC16', love: locale === 'zh-CN' ? '爱情' : '愛情' });
  }
  setLocale(previous, { persist: false });
});
