import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const hd = read('../src/styles/tokens/human-design-classic.css');
const site = read('../src/styles/tokens/site-default.css');
const renderer = read('../src/bodygraph.js');
const centers = ['head', 'ajna', 'throat', 'g', 'heart', 'spleen', 'solar', 'sacral', 'root'];

test('classic HD skin defines nine independent center edges and derived cores in both themes', () => {
  const [light, dark] = hd.split('[data-theme="dark"]');
  assert.ok(light && dark, 'classic skin needs light and dark definitions');
  for (const center of centers) {
    for (const theme of [light, dark]) {
      assert.match(theme, new RegExp(`--hd-center-${center}:\\s*[^;]+;`));
      assert.match(theme, new RegExp(`--hd-center-${center}-core:\\s*color-mix\\([^;]*var\\(--hd-center-${center}\\)`));
    }
  }
});

test('activation sources have one canonical palette input and legacy names are aliases', () => {
  for (const source of ['personality', 'design', 'transit']) {
    assert.match(hd, new RegExp(`--hd-${source}:\\s*#[0-9a-f]+;`, 'i'));
    assert.match(hd, new RegExp(`--hd-${source}-on:\\s*#[0-9a-f]+;`, 'i'));
    assert.match(renderer, new RegExp(`read\\('--hd-${source}'\\)`));
  }
  for (const [alias, source] of [
    ['personality', 'personality'], ['graph-personality', 'personality'],
    ['design', 'design'], ['graph-design', 'design'], ['transit-source', 'transit']
  ]) {
    assert.match(hd, new RegExp(`--${alias}:\\s*var\\(--hd-${source}\\);`));
  }
  assert.doesNotMatch(renderer, /#[0-9a-f]{3,8}\b/i, 'renderer cannot own palette hex values');
});

test('site and HD palettes have separate complete light and dark sections', () => {
  assert.match(site, /:root\s*\{[\s\S]*--bg:[^;]+;[\s\S]*--accent:[^;]+;/);
  assert.match(site, /\[data-theme="dark"\]\s*\{[\s\S]*--bg:[^;]+;[\s\S]*--accent:[^;]+;/);
  assert.match(hd, /--hd-graph-panel-bg:[^;]+;/);
  assert.match(hd, /--hd-tooltip-bg:[^;]+;/);
  assert.match(hd, /--hd-detail-bg:[^;]+;/);
  assert.match(hd, /--hd-legend-bg:[^;]+;/);
  assert.match(hd, /--hd-gate-number-size:\s*22px;/);
});
