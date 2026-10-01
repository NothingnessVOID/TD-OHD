import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBodygraphSVG, renderChartCardSVG, renderStoryCardSVG } from '../src/lib/human-design/svg-renderer.js';

const chart = { gates: { personality: { sun: { gate: 1, line: 2 } }, design: { sun: { gate: 8, line: 3 } } },
  centers: { definedNames: ['g', 'throat'] }, type: { name: 'Projector' },
  profile: { numbers: '1/3', name: 'Synthetic profile' }, authority: { name: 'Self-Projected Authority' },
  definition: 'Single Definition' };

test('pure SVG contains all gates, defined centers and optional activation columns', () => {
  const svg = renderBodygraphSVG(chart, { planetColumns: true, id: 'test-chart' });
  assert.match(svg, /^<svg[^>]+role="img"/);
  assert.match(svg, /data-center="throat"/);
  assert.match(svg, /data-layer="planets-design"/);
  assert.match(svg, /data-layer="planets-personality"/);
  assert.match(svg, /id="test-chart-stripe-both"/);
  assert.equal((svg.match(/<circle /g) || []).length, 64);
  assert.doesNotMatch(renderBodygraphSVG(chart), /data-layer="planets-/);
});

test('share cards retain output dimensions and escape user-provided display names', () => {
  const name = '<script>&"';
  const landscape = renderChartCardSVG(chart, { name });
  const story = renderStoryCardSVG(chart, { name, theme: 'dark' });
  const square = renderStoryCardSVG(chart, { format: 'square', footer: '' });
  assert.match(landscape, /viewBox="0 0 1200 630"/);
  assert.match(story, /viewBox="0 0 1080 1920"/);
  assert.match(square, /viewBox="0 0 1080 1080"/);
  assert.doesNotMatch(landscape + story, /<script>/);
  assert.match(landscape, /&lt;script>&amp;&quot;/);
  assert.doesNotMatch(square, /openhumandesign.com/);
});
