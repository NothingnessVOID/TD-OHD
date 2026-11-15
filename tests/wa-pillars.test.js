import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OC16_DEPARTMENTS, OC16_PILLAR_ORDER } from '../src/lib/wa/oc16-catalog.js';
import { setLocale, t } from '../src/lib/i18n.js';
import '../src/lib/wa/oc16-messages.js';

const source = readFileSync(new URL('../src/views/wa.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/wa.css', import.meta.url), 'utf8');

const pillarBlock = () => source.match(/function pillarsHtml\(\)[\s\S]*?\n  \}/)[0];

test('six pillars follow the confirmed department order and each uses its explicit primary channel', () => {
  assert.deepEqual([...OC16_PILLAR_ORDER], ['management', 'competition', 'direction', 'logic', 'interaction', 'innovation']);
  assert.equal(OC16_DEPARTMENTS.length, 6);
  const primaries = OC16_PILLAR_ORDER.map(id => OC16_DEPARTMENTS.find(row => row.id === id).primaryChannelId);
  assert.deepEqual(primaries, ['21-45', '25-51', '2-14', '27-50', '6-59', '3-60']);
});

test('pillars render one department card each, titled by department name and showing hexagram names', () => {
  const block = pillarBlock();
  assert.match(block, /OC16_PILLAR_ORDER\.map/);
  assert.match(block, /department\.primaryChannelId/);
  assert.match(block, /hexagramName\(gate\)/);
  assert.match(block, /text\(department\.nameKey\)/);
  // Every card opens the existing department detail; the card itself is not a channel button.
  assert.match(block, /data-wa-department="\$\{department\.id\}"/);
  assert.match(block, /data-wa-pillar-department="\$\{department\.id\}"/);
  assert.doesNotMatch(block, /data-wa-pair="/);
  assert.match(block, /data-wa-pillars/);
  // The overview renders this block and no longer the nine-axis pillar block.
  assert.match(source, /\$\{pillarsHtml\(\)\}\$\{gapsHtml\(\)\}/);
  assert.doesNotMatch(source, /axisPillarsHtml/);
  // No hardcoded hexagram text in the view.
  assert.doesNotMatch(block, /噬嗑|萃|鼎|无妄/);
});

test('pillar and row highlighting follows the original role rule, not the axis tier', () => {
  assert.match(source, /const roleClass = pair => pair\.role === 'core' \? 'is-core' : pair\.role === 'personnel' \? 'is-personnel' : ''/);
  assert.match(source, /class="wa-pair-token \$\{roleClass\(pair\)\}"/);
  assert.match(source, /class="wa-channel-row \$\{roleClass\(pair\)\}"/);
  assert.doesNotMatch(source, /axisClass|is-axis/);
  assert.match(css, /\.wa-pair-token\.is-core \{ border-color:var\(--accent\); background:var\(--accent-soft,var\(--bg\)\); \}/);
  assert.doesNotMatch(css, /\.wa-pair-token\.is-axis/);
  // Historical CSS paints nothing for personnel; the class remains structural only.
  assert.doesNotMatch(css, /\.is-personnel/);
});

test('pillar block keeps the accepted desktop grid and the left nine-axis / right 32-row layout', () => {
  // Desktop default stays three per row (six cards fill two rows); narrower breakpoints are untouched.
  assert.match(css, /\.wa-pillars \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\); gap:8px; \}/);
  assert.match(css, /@media \(max-width:1200px\) and \(min-width:1051px\) \{ \.wa-pillars \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/);
  // Left graph column and the right department list keep their existing data sources.
  assert.match(source, /renderWaDiagram\(OC16_AXIS,/);
  assert.match(source, /<div class="wa-department-list">\$\{OC16_DEPARTMENTS\.map\(departmentHtml\)\.join\(''\)\}<\/div>/);
  const rows = OC16_DEPARTMENTS.flatMap(department => department.pairs);
  assert.equal(rows.length, 32);
  assert.equal(new Set(rows.map(pair => pair.channelId)).size, 32);
  assert.equal(new Set(rows.flatMap(pair => pair.gates)).size, 64);
});

test('pillar heading and department titles are localized in all three locales', () => {
  const expected = {
    'zh-CN': ['六大支柱', '管理', '竞争', '方向与规划', '规则与标准', '互动', '创新与结构'],
    'zh-Hant': ['六大支柱', '管理', '競爭', '方向與規劃', '規則與標準', '互動', '創新與結構'],
    en: ['Six pillars', 'Management', 'Competitiveness', 'Direction', 'Logic', 'Interaction', 'Innovation']
  };
  for (const [locale, values] of Object.entries(expected)) {
    setLocale(locale, { persist: false });
    assert.deepEqual([t('OC16 department pillars'), ...OC16_PILLAR_ORDER.map(id => t(`OC16 ${id}`))], values);
  }
});
