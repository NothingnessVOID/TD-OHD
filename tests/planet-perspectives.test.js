import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { esc } from '../src/lib/format.js';
import { setLocale, t } from '../src/lib/i18n.js';
import { PLANET_ORDER, PLANET_REFERENCE_IDS, planetDetailReference, planetReference, renderPlanetReading } from '../src/lib/planet-reference.js';
import { planetBusinessCopy, hasPlanetBusinessContent, PLANET_BUSINESS_LOCALES } from '../src/lib/planet-business-content.js';
import { PLANET_READING_LENSES, planetReadingBody, renderPlanetReadingPerspectives, resolvePlanetLens } from '../src/lib/planet-reading-perspectives.js';
import { renderGateLensSwitch } from '../src/lib/gate-lenses.js';

test('thirteen stable planet ids carry non-empty business copy in all three locales', () => {
  // Runtime data is prose only: source coordinates and editorial notes live in the maintenance doc.
  const data = JSON.parse(readFileSync(new URL('../src/lib/planet-business-content.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(data).sort(), ['en', 'zh-CN', 'zh-Hant']);
  for (const table of Object.values(data)) assert.deepEqual(Object.keys(table).sort(), [...PLANET_ORDER].sort());
  assert.deepEqual(PLANET_BUSINESS_LOCALES, ['zh-CN', 'zh-Hant', 'en']);
  assert.deepEqual([...PLANET_REFERENCE_IDS].sort(), [...PLANET_ORDER].sort());
  assert.equal(PLANET_ORDER.length, 13);
  for (const locale of PLANET_BUSINESS_LOCALES) {
    for (const planet of PLANET_ORDER) {
      const copy = planetBusinessCopy(planet, locale);
      assert.ok(copy, `${planet} missing ${locale} business copy`);
      assert.equal(copy.theme.trim(), copy.theme);
      const words = copy.theme.split(/\s+/).length;
      assert.ok(words <= 5 && copy.theme.length <= 40, `${planet} ${locale} theme length`);
      assert.ok(copy.body.length >= 40, `${planet} ${locale} body too short`);
      assert.equal(copy.body.trim(), copy.body);
    }
  }
  assert.ok(PLANET_BUSINESS_LOCALES.includes('en'));
});

test('unknown planet ids and locales never invent content', () => {
  for (const planet of ['chiron', 'Sun', '', null, undefined, 42]) {
    assert.equal(hasPlanetBusinessContent(planet), false);
    assert.equal(planetBusinessCopy(planet, 'zh-CN'), null);
    assert.equal(planetReadingBody(planet, 'zh-CN', 'business'), '');
    assert.equal(renderPlanetReadingPerspectives(planet, 'zh-CN', 'business'), '');
  }
  assert.equal(planetBusinessCopy('sun', 'ja'), null);
  setLocale('ja', { persist: false });
  const pending = renderPlanetReadingPerspectives('sun', 'ja', 'business');
  assert.match(pending, /data-planet-reading/);
  assert.doesNotMatch(pending, /核心表达/);
  setLocale('en', { persist: false });
});

test('human design lens output is the untouched reference reading', () => {
  for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
    setLocale(locale, { persist: false });
    for (const planet of PLANET_ORDER) {
      assert.equal(planetReadingBody(planet, locale, 'hd'), renderPlanetReading(planet, locale));
      assert.equal(planetReadingBody(planet, locale), renderPlanetReading(planet, locale));
      assert.ok(renderPlanetReadingPerspectives(planet, locale).includes(renderPlanetReading(planet, locale)));
      assert.ok(planetReference(planet, locale).length > 0);
      assert.ok(planetDetailReference(planet, locale).length > 0);
    }
  }
});

test('gate lens switch keeps its exact four-item DOM contract', () => {
  setLocale('en', { persist: false });
  const html = renderGateLensSwitch('gk', 'data-lens', 'data-reference-lens');
  const labels = [t('Detail information'), t('Six-line reading'), t('Gene gifts'), t('经络穴位')];
  assert.equal(html, `<div class="lens-switch gate-lens-switch">`
    + ['hd', 'iching', 'gk', 'meridian'].map((key, index) => `<button type="button" data-lens="${key}" data-reference-lens="${key}" aria-pressed="${key === 'gk'}" class="${key === 'gk' ? 'active' : ''}">${labels[index]}</button>`).join('')
    + `</div>`);
  assert.equal((html.match(/<button/g) || []).length, 4);
  assert.equal(renderGateLensSwitch('hd', 'data-shared-lens').includes('data-reference-lens'), false);
  assert.equal(renderGateLensSwitch('hd', 'data-shared-lens', 'data-something-else').includes('data-something-else'), false);
});

test('two-category switch renders escaped business copy without maintenance metadata', () => {
  setLocale('zh-CN', { persist: false });
  const copy = planetBusinessCopy('venus', 'zh-CN');
  const business = renderPlanetReadingPerspectives('venus', 'zh-CN', 'business');
  assert.match(business, /<section data-planet-reading data-planet="venus" data-planet-lens-current="business">/);
  assert.match(business, /class="lens-switch planet-lens-switch"/);
  assert.equal((business.match(/data-planet-lens=/g) || []).length, 2);
  assert.match(business, /data-planet-lens="hd" aria-pressed="false"/);
  assert.match(business, /data-planet-lens="business" aria-pressed="true" class="active"/);
  assert.ok(business.includes(`<p class="planet-reading-lead">${esc(copy.theme)}</p>`));
  assert.ok(business.includes('class="planet-reading-body"'));
  assert.doesNotMatch(business, /data-lens=|data-reference-lens|data-shared-lens/);
  assert.doesNotMatch(business, /20_\u5185\u90e8\u8d44\u6599|editorialNotes|sourceText|displayChange/);
  assert.doesNotMatch(business, new RegExp(planetDetailReference('venus', 'zh-CN').slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const hd = renderPlanetReadingPerspectives('venus', 'zh-CN');
  assert.match(hd, /<section data-planet-reading data-planet="venus" data-planet-lens-current="hd">/);
  assert.match(hd, /data-planet-lens="hd" aria-pressed="true" class="active"/);
  assert.doesNotMatch(hd, new RegExp(copy.body.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('reading category labels are three-locale and stable', () => {
  const labels = {};
  for (const locale of ['zh-CN', 'zh-Hant', 'en']) {
    setLocale(locale, { persist: false });
    const html = renderPlanetReadingPerspectives('sun', locale);
    const buttons = [...html.matchAll(/data-planet-lens="([a-z]+)"[^>]*>([^<]+)</g)].map(match => [match[1], match[2]]);
    labels[locale] = buttons;
  }
  assert.deepEqual(labels['zh-CN'], [['hd', '\u4eba\u7c7b\u56fe'], ['business', '\u5546\u4e1a']]);
  assert.deepEqual(labels['zh-Hant'], [['hd', '\u4eba\u985e\u5716'], ['business', '\u5546\u696d']]);
  assert.deepEqual(labels.en, [['hd', 'Human Design'], ['business', 'Business']]);
  setLocale('en', { persist: false });
});

test('unknown reading categories fall back to the default lens', () => {
  assert.deepEqual([...PLANET_READING_LENSES], ['hd', 'business']);
  for (const lens of [undefined, null, '', 'HD', 'iching', 'meridian', 'gate']) assert.equal(resolvePlanetLens(lens), 'hd');
  assert.equal(resolvePlanetLens('business'), 'business');
  setLocale('zh-CN', { persist: false });
  assert.match(renderPlanetReadingPerspectives('sun', 'zh-CN', 'iching'), /data-planet-lens-current="hd"/);
});

