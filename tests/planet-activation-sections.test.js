import test from 'node:test';
import assert from 'node:assert/strict';
import { setLocale, t } from '../src/lib/i18n.js';
import {
  planetActivationEntries,
  renderPlanetActivationSections
} from '../src/lib/planet-activation-sections.js';

const activation = (gate, line, color = 1, tone = 1, base = 1) => ({ gate, line, color, tone, base });

const natalChart = () => ({
  gates: {
    design: { sun: activation(1, 1, 3, 2, 5) },
    personality: { sun: activation(8, 4, 6, 1, 2) }
  }
});

test('a natal point reads both real activations, design first and personality second', () => {
  const entries = planetActivationEntries({ source: 'personality', planet: 'sun', chart: natalChart() });
  assert.deepEqual(entries.map(entry => entry.source), ['design', 'personality']);
  assert.deepEqual(entries.map(entry => entry.activation.gate), [1, 8]);
  assert.equal(entries[0].activation.color, 3);
  assert.equal(entries[1].activation.color, 6);
  // Clicking the other side is the same frame, not a filter.
  assert.deepEqual(planetActivationEntries({ source: 'design', planet: 'sun', chart: natalChart() })
    .map(entry => entry.source), ['design', 'personality']);
});

test('two sources activating the same gate stay two separate source records', () => {
  setLocale('en', { persist: false });
  const chart = { gates: { design: { moon: activation(8, 2) }, personality: { moon: activation(8, 5) } } };
  const entries = planetActivationEntries({ source: 'design', planet: 'moon', chart });
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map(entry => [entry.source, entry.activation.gate, entry.activation.line]),
    [['design', 8, 2], ['personality', 8, 5]]);
  const html = renderPlanetActivationSections(entries);
  assert.equal((html.match(/data-planet-gate="8"/g) || []).length, 2);
  assert.match(html, /data-planet-gate="8" data-planet-source="design"/);
  assert.match(html, /data-planet-gate="8" data-planet-source="personality"/);
  // Two identical gate numbers still read differently to assistive technology.
  const labels = [...html.matchAll(/aria-label="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(labels).size, 2);
  assert.ok(labels[0].startsWith('Design '));
  assert.ok(labels[1].startsWith('Personality '));
});

test('a missing side is not filled from the other side or from a passed activation', () => {
  const onlyPersonality = { gates: { design: {}, personality: { sun: activation(8, 4) } } };
  const entries = planetActivationEntries({
    source: 'design', planet: 'sun', chart: onlyPersonality, activation: activation(8, 4)
  });
  assert.deepEqual(entries.map(entry => entry.source), ['personality']);
  assert.deepEqual(planetActivationEntries({ source: 'design', planet: 'sun', chart: { gates: { design: {}, personality: {} } } }), []);
});

test('a real transit point keeps only its own temporary activation', () => {
  const entries = planetActivationEntries({
    source: 'transit', planet: 'sun', activation: activation(99, 9),
    chart: natalChart(), transitGates: { sun: activation(42, 3, 4, 4, 4) }
  });
  assert.deepEqual(entries.map(entry => [entry.source, entry.activation.gate]), [['transit', 42]]);
  const html = renderPlanetActivationSections(entries);
  assert.equal((html.match(/<section/g) || []).length, 1);
  assert.match(html, /data-planet-source="transit"/);
  assert.doesNotMatch(html, /data-planet-source="design"|data-planet-source="personality"/);
  assert.ok(html.includes(t('Current activation')));
});

test('unknown sources and planets render nothing', () => {
  for (const source of ['', 'hd', 'business', undefined]) {
    assert.deepEqual(planetActivationEntries({ source, planet: 'sun', chart: natalChart() }), []);
  }
  assert.deepEqual(planetActivationEntries({ source: 'design', chart: natalChart() }), []);
  assert.deepEqual(planetActivationEntries({ source: 'transit', planet: 'sun' }), []);
  assert.equal(renderPlanetActivationSections([]), '');
});

test('each section states its own source and gate line in three locales', () => {
  for (const locale of ['zh-CN', 'zh-Hant', 'en']) {
    setLocale(locale, { persist: false });
    const html = renderPlanetActivationSections(
      planetActivationEntries({ source: 'design', planet: 'sun', chart: natalChart() }));
    assert.ok(html.includes(`>${t('Design')}</div>`), `${locale} design label`);
    assert.ok(html.includes(`>${t('Personality')}</div>`), `${locale} personality label`);
    assert.ok(html.indexOf(t('Design')) < html.indexOf(t('Personality')), `${locale} design first`);
    assert.equal((html.match(/class="planet-activation"/g) || []).length, 2);
    assert.equal((html.match(/planet-detail-substructure-item/g) || []).length, 6);
    assert.match(html, /<button type="button" class="transit-detail-link planet-detail-gate"/);
  }
  setLocale('en', { persist: false });
});
