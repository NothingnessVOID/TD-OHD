import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setLocale } from '../src/lib/i18n.js';
import { analyzeMemberBusiness } from '../src/lib/member-business/analysis.js';
import { analyzeMemberEnvironments } from '../src/lib/member-business/environments.js';
import { renderMemberBusinessPanel, memberPlacementGroups, renderMemberBusinessFrame, renderMemberBusinessChannel } from '../src/views/wa-member-business.js';
import { analysisInput } from './helpers/member-business-fixtures.js';

setLocale('zh-CN', { persist: false });

const facts = options => {
  const analysis = analyzeMemberBusiness(analysisInput(options));
  return { analysis, screening: analyzeMemberEnvironments(analysis) };
};
const memberOf = (id, name) => ({ memberId: id, displayName: name, timeUnknown: false, birthTimeConfidence: 'exact' });
const markers = id => ({ memberId: id, number: 1, colorSlot: 2 });

function frame(options, overrides = {}) {
  const { analysis, screening } = facts(options);
  return renderMemberBusinessFrame({
    member: memberOf('synthetic-member', '虚构 甲'), analysis, screening,
    markerOf: markers, nameOf: () => '虚构 甲', placementOf: () => ({ kind: 'penta', title: 'Penta A' }),
    index: 0, count: 3, ...overrides
  });
}

test('the member frame renders the four blocks in order with a personal scope line', () => {
  const html = frame({ gates: [7, 31] });
  const order = ['career', 'definition', 'environments', 'strengths'].map(block => html.indexOf(`data-wa-mb-block="${block}"`));
  assert.ok(order.every(index => index > -1));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(html, /data-wa-mb="member"/);
  assert.match(html, /职业类型/);
  assert.match(html, /商业优势/);
  assert.match(html, /这份分析只使用该成员自己的出生图/);
  assert.match(html, /虚构 甲/);
  assert.match(html, /Penta A/);
  assert.doesNotMatch(html, /data-wa-mb-estimated/);
});

test('prev/next replace the same frame and disable at the ends', () => {
  const first = frame({ gates: [7, 31] }, { index: 0, count: 3 });
  assert.match(first, /data-wa-member-step="prev"[^>]*disabled/);
  assert.match(first, /data-wa-member-step="next"[^>]*>下一位/);
  assert.match(first, /1 \/ 3/);
  const last = frame({ gates: [7, 31] }, { index: 2, count: 3 });
  assert.match(last, /data-wa-member-step="next"[^>]*disabled/);
  const single = frame({ gates: [7, 31] }, { index: 0, count: 1 });
  assert.match(single, /data-wa-member-step="prev"[^>]*disabled/);
  assert.match(single, /data-wa-member-step="next"[^>]*disabled/);
});

test('work environments are平列 with step numbers and the screening folds by default', () => {
  const html = frame({ typeId: 'projector', definition: 'SplitDefinition', gates: [1, 8, 26, 44, 34, 57] });
  assert.match(html, /data-wa-mb-env="solo" data-status="supported"/);
  assert.match(html, /data-wa-mb-env="partnership" data-status="supported"/);
  assert.match(html, /有依据 · 第 3 步/);
  assert.match(html, /有依据 · 第 1、2 步/);
  assert.match(html, /具体执行与直觉判断时，需要不被打扰的独立空间/);
  assert.match(html, /<details class="wa-mb-screening" data-wa-mb-screening>\s*<summary>五步排查依据<\/summary>/);
  assert.doesNotMatch(html, /<details[^>]*\sopen/);
  assert.match(html, /其余环境：本图未提供依据/);
  for (const step of [1, 2, 3, 4, 5]) assert.match(html, new RegExp(`data-wa-mb-step="${step}"`));
  assert.match(html, /怎样理解/);
  assert.doesNotMatch(html, /教材指向|原典|官方版|通俗版|来源对照/);
});

test('the penta row always shows its gate count and never turns a low count into a caution', () => {
  const low = frame({ gates: [3, 60, 7] });
  assert.match(low, /data-wa-mb-env="penta" data-status="none"/);
  assert.match(low, /激活闸门 1 \/ 12/);
  assert.match(low, /暂无完整 Penta 通道/);
  assert.doesNotMatch(low, /data-wa-mb-env="penta"[^>]*data-status="caution"/);
  const connected = frame({ gates: [7, 31] });
  assert.match(connected, /有小组连接依据/);
  assert.match(connected, /激活闸门 2 \/ 12 ｜ 7–31/);
});

test('the tribal collaboration note appears only for 21-45 or 37-40', () => {
  const plain = frame({ gates: [7, 31] });
  assert.doesNotMatch(plain, /协作关注/);
  const tribal = frame({ gates: [21, 45, 7, 31] });
  assert.match(tribal, /协作关注 · 第 5 步/);
  assert.match(tribal, /公共规则与资源边界/);
  assert.doesNotMatch(tribal, /拉帮结派|排斥|私人领地/);
});

test('a support channel outside the nine axes never shows an organization basis', () => {
  const html = frame({ gates: [26, 44] });
  assert.doesNotMatch(html, /data-wa-mb-env="organization"/);
  assert.match(html, /其余环境：本图未提供依据/);
});

test('business strengths group by circuit, link the 32 to the organization channel and the 4 to their own sheet', () => {
  const html = frame({ gates: [21, 45, 7, 31, 34, 57, 16, 48] });
  assert.match(html, /data-wa-mb-circuit="tribal"/);
  assert.match(html, /data-wa-mb-circuit="integration"/);
  assert.match(html, /data-wa-pair="21-45"[^>]*>21–45/);
  assert.match(html, /查看组织中的通道/);
  assert.match(html, /data-wa-business-channel="34-57"/);
  assert.match(html, /力量/);
  assert.match(html, /直觉与生命力结合，在当下立即响应/);
});

test('zero complete channels is ready and explained, never turned into "no strength"', () => {
  const html = frame({ typeId: 'reflector', definition: 'Empty', gates: [] });
  assert.match(html, /这张图没有完整个人通道。闸门仍然可以在与他人连接时形成表达。/);
  assert.doesNotMatch(html, /data-wa-mb-insufficient/);
});

test('unavailable analysis shows an explicit source-data note instead of a silent default', () => {
  const { analysis, screening } = facts({ gates: [3, 60] });
  const broken = { ...analysis, status: 'unavailable', typeId: null, careerId: null, definitionId: null };
  const html = renderMemberBusinessFrame({
    member: memberOf('synthetic-member', '虚构 甲'), analysis: broken,
    screening: analyzeMemberEnvironments(broken), markerOf: markers, nameOf: () => '虚构 甲',
    placementOf: () => null, index: 0, count: 1
  });
  assert.match(html, /data-wa-mb-insufficient/);
  assert.match(html, /资料不足/);
  assert.doesNotMatch(html, /经典建造者/);
  // An unavailable analysis keeps identity, switching and the estimate note, nothing else.
  assert.doesNotMatch(html, /data-wa-mb-block="career"/);
  assert.doesNotMatch(html, /data-wa-mb-block="strengths"/);
  assert.doesNotMatch(html, /data-wa-mb-block="environments"/);
  assert.doesNotMatch(html, /商业优势/);
  assert.equal(analyzeMemberEnvironments(broken).status, 'unavailable');
});

test('estimated birth time is stated explicitly', () => {
  const { analysis, screening } = facts({ gates: [3, 60] });
  const html = renderMemberBusinessFrame({
    member: { ...memberOf('synthetic-member', '虚构 甲'), timeUnknown: true, birthTimeConfidence: 'estimated' },
    analysis: { ...analysis, timeUnknown: true, birthTimeConfidence: 'estimated' }, screening,
    markerOf: markers, nameOf: () => '虚构 甲', placementOf: () => ({ kind: 'alpha' }), index: 0, count: 1
  });
  assert.match(html, /data-wa-mb-estimated/);
  assert.match(html, /出生时间未知或按中午估算/);
  assert.match(html, /Alpha/);
});

const panelMarkers = numbers => id => ({ memberId: id, number: numbers[id] ?? 1, colorSlot: 2 });
const row = (key, title, ids) => ({ key, title, memberIds: ids });

/** One ready analysis per career type, keyed by member id; the five types map to five career ids. */
function panelAnalyses() {
  const ready = (memberId, typeId, definition, gates) => [memberId,
    analyzeMemberBusiness({ ...analysisInput({ typeId, definition, gates }), memberId })];
  return new Map([
    ready('m-initiator', 'manifestor', 'SingleDefinition', [7, 31]),
    ready('m-classic-1', 'generator', 'SingleDefinition', [7, 31]),
    ready('m-classic-2', 'generator', 'SingleDefinition', [21, 45]),
    ready('m-express', 'manifestingGenerator', 'SingleDefinition', [7, 31]),
    ready('m-advisor', 'projector', 'SingleDefinition', [7, 31]),
    ready('m-evaluator', 'reflector', 'Empty', [])
  ]);
}

function renderPanel(overrides = {}) {
  const analyses = panelAnalyses();
  return renderMemberBusinessPanel({
    state: 'ready', memberCount: analyses.size,
    groups: [row('alpha', 'Alpha（负责人）', ['m-initiator']), row('penta-b', 'Penta B', ['m-classic-1', 'm-classic-2', 'm-advisor']), row('penta-c', 'Penta C', ['m-express', 'm-evaluator'])],
    analysisOf: id => analyses.get(id) ?? null,
    markerOf: panelMarkers({ 'm-initiator': 1, 'm-classic-1': 2, 'm-classic-2': 3, 'm-express': 4, 'm-advisor': 5, 'm-evaluator': 6 }),
    nameOf: id => id === 'm-classic-1' ? '虚构 一位名字很长很长很长的成员' : `虚构 ${id.slice(2)}`,
    ...overrides
  });
}

test('the panel is one results card: title, neutral member count, scope note, then the tiles', () => {
  const html = renderPanel();
  assert.match(html, /<section class="panel wa-member-business" data-wa-member-business-panel data-state="ready"/);
  assert.match(html, /<h2>成员商业分析<\/h2>/);
  assert.match(html, /个人分析 · 全部成员 6 人/);
  assert.match(html, /以下列出本组织全部已分配成员，不受当前查看范围影响。/);
  // The count is plain small text, not the standard/preview badge.
  assert.doesNotMatch(html, /wa-state-badge/);
  assert.ok(html.indexOf('data-wa-mb-group="alpha"') < html.indexOf('data-wa-mb-group="penta-b"'));
  assert.ok(html.indexOf('data-wa-mb-group="penta-b"') < html.indexOf('data-wa-mb-group="penta-c"'));
  assert.match(html, /<h3 class="wa-subheading">Penta B<\/h3>/);
  assert.match(html, /class="wa-pillar wa-mb-tile" data-wa-member-business="m-classic-1" data-focus="mb-tile-m-classic-1"/);
  assert.equal(html.match(/class="wa-pillar wa-mb-tile"/g).length, 6);
  // The tile body reuses the page's pillar text block; only the name/career/definition lines are new.
  assert.match(html, /<span class="wa-pillar-text">\s*<span class="wa-mb-tile-head">/);
  // Placement lives in the group heading only; a tile never repeats Alpha or the Penta name.
  assert.doesNotMatch(html, /wa-mb-tile[^>]*>[^<]*Penta/);
});

test('career head count keeps the fixed order, hides zero rows and lists missing data separately', () => {
  const html = renderPanel();
  const line = html.slice(html.indexOf('data-wa-mb-careers'), html.indexOf('data-wa-mb-group'));
  const order = ['initiator', 'classicBuilder', 'expressBuilder', 'advisor', 'evaluator']
    .map(id => line.indexOf(`data-wa-mb-career="${id}"`)).filter(index => index > -1);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(line, /data-wa-mb-career="initiator">发起者 <b>1<\/b>/);
  assert.match(line, /data-wa-mb-career="classicBuilder">经典建造者 <b>2<\/b>/);
  assert.match(line, /data-wa-mb-career="evaluator">评估者 <b>1<\/b>/);
  assert.doesNotMatch(line, /资料不足/);
  // A member whose analysis is unavailable counts as missing data, never as a career type.
  const missing = renderPanel({ analysisOf: id => id === 'm-advisor' ? { status: 'unavailable', careerId: null } : panelAnalyses().get(id) });
  assert.match(missing, /data-wa-mb-career="unknown">资料不足 <b>1<\/b>/);
  const zero = renderPanel({ analysisOf: () => null });
  assert.doesNotMatch(zero, /data-wa-mb-career="(?:initiator|classicBuilder|expressBuilder|advisor|evaluator)"/);
});

test('a tile shows marker, name, career and information processing, and marks an estimated birth time', () => {
  const html = renderPanel();
  const tile = html.slice(html.indexOf('data-wa-member-business="m-classic-1"'), html.indexOf('</button>', html.indexOf('data-wa-member-business="m-classic-1"')));
  assert.match(tile, /class="wa-member-marker/);
  assert.match(tile, /<strong class="wa-mb-tile-name" title="虚构 一位名字很长很长很长的成员">/);
  assert.match(tile, /class="wa-mb-tile-career">经典建造者</);
  assert.match(tile, /class="wa-mb-tile-definition">独立处理</);
  assert.match(tile, /class="wa-mb-tile-arrow" aria-hidden="true">›</);
  assert.doesNotMatch(tile, /wa-mb-tile-est/);
  const analyses = panelAnalyses();
  const estimated = renderPanel({ analysisOf: id => id === 'm-advisor'
    ? { ...analyses.get('m-advisor'), timeUnknown: true, birthTimeConfidence: 'estimated' } : analyses.get(id) });
  assert.match(estimated, /class="wa-mb-tile-est" title="≈ 出生时间未知或按中午估算[^"]*">≈</);
});

test('undefined information processing gets its own short label and the detail keeps the full name', () => {
  const analyses = panelAnalyses();
  const html = renderPanel({ analysisOf: id => id === 'm-evaluator'
    ? { ...analyses.get('m-evaluator'), definitionId: 'none' } : analyses.get(id) });
  const tile = html.slice(html.indexOf('data-wa-member-business="m-evaluator"'), html.indexOf('</button>', html.indexOf('data-wa-member-business="m-evaluator"')));
  assert.match(tile, /class="wa-mb-tile-definition">无定义</);
  assert.doesNotMatch(tile, /随环境处理/);
  const detail = renderMemberBusinessFrame({ member: memberOf('m-evaluator', '虚构 evaluator'),
    analysis: { ...analyses.get('m-evaluator'), definitionId: 'none' }, screening: analyzeMemberEnvironments(analyses.get('m-evaluator')),
    markerOf: markers, nameOf: () => '虚构 evaluator', placementOf: () => ({ kind: 'penta', title: 'Penta C' }), index: 0, count: 1 });
  assert.match(detail, /无定义（随环境处理）/);
});

test('a tile with an unavailable analysis keeps the name and shows missing data on both lines', () => {
  const html = renderPanel({ analysisOf: id => id === 'm-classic-2' ? { status: 'unavailable', careerId: null, definitionId: null } : panelAnalyses().get(id) });
  const tile = html.slice(html.indexOf('data-wa-member-business="m-classic-2"'), html.indexOf('</button>', html.indexOf('data-wa-member-business="m-classic-2"')));
  assert.match(tile, /class="wa-mb-tile-name" title="虚构 classic-2">虚构 classic-2</);
  assert.match(tile, /class="wa-mb-tile-career">资料不足</);
  assert.match(tile, /class="wa-mb-tile-definition">资料不足</);
  assert.doesNotMatch(tile, /经典建造者|独立处理/);
});

test('busy and not-ready cards keep the shell and never repeat the error list', () => {
  const loading = renderMemberBusinessPanel({ state: 'loading', memberCount: 3 });
  assert.match(loading, /data-state="loading"/);
  assert.match(loading, /正在读取成员出生图…/);
  assert.match(loading, /全部成员 3 人/);
  assert.doesNotMatch(loading, /wa-mb-tile|wa-mb-grid|data-wa-mb-careers/);
  const unavailable = renderMemberBusinessPanel({ state: 'unavailable', memberCount: 3 });
  assert.match(unavailable, /data-state="unavailable"/);
  assert.match(unavailable, /个人分析暂不可用，请先处理上方提示/);
  assert.doesNotMatch(unavailable, /wa-mb-tile|wa-chart-errors|资料不足/);
  const noGroups = renderMemberBusinessPanel({ state: 'ready', memberCount: 0, groups: [] });
  assert.doesNotMatch(noGroups, /wa-mb-grid|data-wa-mb-group/);
});

test('placement groups are Alpha first, then the draft Penta order, empty groups dropped', () => {
  const groups = memberPlacementGroups({
    alphaId: 'm-3', alphaTitle: 'Alpha（负责人）',
    pentas: [
      { pentaId: 'p-beta', memberIds: ['m-2', 'm-1', 'm-unavailable'] },
      { pentaId: 'p-alpha', memberIds: ['m-4'] },
      { pentaId: 'p-empty', memberIds: [] }
    ],
    available: ['m-1', 'm-2', 'm-3', 'm-4'],
    titleOf: group => `Penta ${group.pentaId}`,
    numberOf: id => ({ 'm-1': 4, 'm-2': 2, 'm-3': 3, 'm-4': 1 })[id] ?? 0
  });
  assert.deepEqual(groups.map(group => group.key), ['alpha', 'p-beta', 'p-alpha']);
  assert.deepEqual(groups[0].memberIds, ['m-3']);
  assert.deepEqual(groups[1].memberIds, ['m-2', 'm-1']);
  assert.deepEqual(groups[2].memberIds, ['m-4']);
  assert.equal(groups[1].title, 'Penta p-beta');
});

test('the host wires the card between overview and departments and removed the old list entry', () => {
  const source = readFileSync(new URL('../src/views/wa.js', import.meta.url), 'utf8');
  assert.match(source, /\$\{overviewHtml\(\)\}\$\{memberBusinessHtml\(\)\}\$\{departmentsHtml\(\)\}/);
  assert.match(source, /if \(!layout\.memberIds\.length\) return '';/);
  assert.doesNotMatch(source, /data-wa-members-open|renderMemberBusinessList|type:'members'|wa-member-open/);
  // The tile must be decided before the marker badge, otherwise the badge swallows the click.
  assert.ok(source.indexOf("closest('[data-wa-member-business]')") < source.indexOf("closest('[data-wa-marker-member]')"));
});

test('the dev demo loads the public ui-system stylesheet after the Wa feature styles', () => {
  const demo = readFileSync(new URL('../dev/member-business-demo.js', import.meta.url), 'utf8');
  const feature = demo.indexOf("from '../src/views/wa.js'");
  const uiSystem = demo.indexOf("import '../src/styles/ui-system.css'");
  // main.js loads ui-system last so one definition wins; the demo has to keep the same order.
  assert.ok(feature > -1 && uiSystem > feature, 'ui-system must load after the feature stylesheets');
  assert.doesNotMatch(demo, /from '\.\.\/src\/main\.js'/);
});

test('the tile grid, typography and reuse of the pillar card follow the agreed rules', () => {
  const css = readFileSync(new URL('../src/styles/wa-member-business.css', import.meta.url), 'utf8');
  assert.match(css, /grid-template-columns: repeat\(auto-fill, minmax\(190px, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?\.wa-mb-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(css, /@media \(max-width: 360px\) \{\s*\.wa-mb-grid \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(css, /\.wa-mb-tile-career \{ font-size: 15px; font-weight: 600;/);
  assert.match(css, /\.wa-mb-tile-definition \{ color: var\(--text-secondary\); font-size: 13px;/);
  // Card chrome, hover glow/translate, focus-visible and reduced-motion stay in the shared pillar rule.
  assert.doesNotMatch(css, /\.wa-mb-tile:hover|\.wa-mb-tile:focus-visible/);
  assert.doesNotMatch(css, /\.wa-mb-tile \{[^}]*(?:border|background|box-shadow|transition|padding|border-radius):/);
});

test('the integration channel sheet reuses the same shared channel reading', () => {
  const html = renderMemberBusinessChannel({ channelId: '10-20' });
  assert.match(html, /data-wa-mb="channel"/);
  assert.match(html, /10–20/);
  assert.match(html, /觉醒/);
  assert.match(html, /data-wa-mb-shared/);
  assert.match(html, /data-shared-channel-reading/);
  assert.doesNotMatch(html, /组织中的通道/);
});
