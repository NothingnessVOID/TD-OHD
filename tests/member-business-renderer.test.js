import test from 'node:test';
import assert from 'node:assert/strict';
import { setLocale } from '../src/lib/i18n.js';
import { analyzeMemberBusiness } from '../src/lib/member-business/analysis.js';
import { analyzeMemberEnvironments } from '../src/lib/member-business/environments.js';
import { renderMemberBusinessList, renderMemberBusinessFrame, renderMemberBusinessChannel } from '../src/views/wa-member-business.js';
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

test('the member list renders every supplied member with marker, placement and career name', () => {
  const first = analyzeMemberBusiness(analysisInput({ gates: [7, 31] }));
  const second = analyzeMemberBusiness({ ...analysisInput({ gates: [21, 45] }), memberId: 'second-member' });
  const html = renderMemberBusinessList({
    members: [memberOf('first-member', '虚构 甲'), memberOf('second-member', '虚构 乙')],
    analysisOf: id => id === 'first-member' ? first : second,
    markerOf: id => ({ memberId: id, number: id === 'first-member' ? 1 : 2, colorSlot: 3 }),
    nameOf: id => id === 'first-member' ? '虚构 甲' : '虚构 乙',
    placementOf: id => id === 'first-member' ? { kind: 'alpha' } : { kind: 'penta', title: 'Penta B' }
  });
  assert.match(html, /以下列出本组织全部已分配成员/);
  assert.match(html, /data-wa-member-open="first-member"/);
  assert.match(html, /data-wa-member-open="second-member"/);
  assert.match(html, /Penta B/);
  assert.match(html, /经典建造者/);
  assert.ok(html.indexOf('first-member') < html.indexOf('second-member'));
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
