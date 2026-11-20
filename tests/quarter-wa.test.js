import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocale, setLocale } from '../src/lib/i18n.js';
import { analyzeMemberBusiness } from '../src/lib/member-business/analysis.js';
import { analyzeMemberEnvironments } from '../src/lib/member-business/environments.js';
import { personalQuarterFacts } from '../src/lib/quarter-personal.js';
import {
  renderMemberBusinessPanel, renderMemberBusinessFrame, renderQuarterMembersFrame,
  renderMemberGateFrame, memberGateLines
} from '../src/views/wa-member-business.js';
import { analysisInput } from './helpers/member-business-fixtures.js';

const withLocale = (locale, fn) => { const previous = getLocale(); setLocale(locale, { persist: false }); try { return fn(); } finally { setLocale(previous, { persist: false }); } };
const memberOf = (id = 'm1', name = '虚构 甲') => ({ memberId: id, displayName: name, timeUnknown: false, birthTimeConfidence: 'exact' });
const markerOf = id => ({ memberId: id, number: 2, colorSlot: 2 });
const nameOf = id => ({ m1: '虚构 甲', m2: '虚构 乙', m3: '虚构 丙' }[id] ?? id);

const factsFor = options => {
  const analysis = analyzeMemberBusiness(analysisInput(options));
  return { analysis, screening: analyzeMemberEnvironments(analysis) };
};

test('the member frame renders the quarter as a fifth block and survives an unavailable analysis', () => withLocale('zh-CN', () => {
  const ready = factsFor({ gates: [7, 31] });
  const html = renderMemberBusinessFrame({
    member: memberOf(), analysis: ready.analysis, screening: ready.screening,
    quarterFacts: { status: 'ready', id: 'initiation', gate: 3, line: 2, estimated: false },
    markerOf, nameOf, placementOf: () => ({ kind: 'penta', title: 'Penta A' }), index: 0, count: 2
  });
  const order = ['career', 'definition', 'environments', 'strengths', 'quarter'].map(block => html.indexOf(`data-wa-mb-block="${block}"`));
  assert.ok(order.every(index => index > -1));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(html, /终生主题象限/);
  assert.match(html, /data-wa-member-quarter="initiation"/);
  assert.match(html, /启蒙/);
  assert.match(html, /3\.2/);
  assert.doesNotMatch(html, /wa-mb-quarter-est/);

  // Other business fields are unavailable, but a valid Sun gate still shows the quarter.
  const onlyQuarter = renderMemberBusinessFrame({
    member: memberOf(), analysis: { status: 'insufficient' }, screening: null,
    quarterFacts: { status: 'ready', id: 'mutation', gate: 34, line: 4, estimated: true },
    markerOf, nameOf, placementOf: () => null, index: 0, count: 1
  });
  const unavailable = onlyQuarter.indexOf('data-wa-mb-insufficient');
  const quarter = onlyQuarter.indexOf('data-wa-mb-block="quarter"');
  assert.ok(unavailable > -1 && quarter > unavailable);
  assert.match(onlyQuarter, /data-wa-member-quarter="mutation"/);
  assert.match(onlyQuarter, /wa-mb-quarter-est/);
  assert.doesNotMatch(onlyQuarter, /data-wa-mb-block="career"/);

  const missing = renderMemberBusinessFrame({
    member: memberOf(), analysis: { status: 'insufficient' }, screening: null, quarterFacts: null,
    markerOf, nameOf, placementOf: () => null, index: 0, count: 1
  });
  assert.match(missing, /data-wa-mb-quarter-missing/);
  assert.match(missing, /资料不足/);
  assert.doesNotMatch(missing, /data-wa-member-quarter=/);
}));

test('the entry card exposes the all-member quarter list without changing its scope note', () => withLocale('zh-CN', () => {
  const html = renderMemberBusinessPanel({ state: 'ready', memberCount: 3, groups: [] });
  assert.match(html, /data-wa-quarter-members/);
  assert.match(html, /全组织成员象限/);
  assert.match(html, /不受当前查看范围影响/);
  const loading = renderMemberBusinessPanel({ state: 'loading', memberCount: 2, groups: [] });
  assert.match(loading, /data-wa-quarter-members/);
}));

test('the quarter list shows four equal groups plus an explicit insufficient group', () => withLocale('zh-CN', () => {
  const groups = [
    { id: 'initiation', memberIds: ['m1'] },
    { id: 'civilization', memberIds: [] },
    { id: 'duality', memberIds: ['m2', 'm3'] },
    { id: 'mutation', memberIds: [] },
    { id: 'unknown', memberIds: ['m4'] }
  ];
  const html = renderQuarterMembersFrame({ state: 'ready', groups, markerOf, nameOf });
  assert.match(html, /全组织成员象限/);
  assert.match(html, /按成员个人象限分组/);
  assert.equal((html.match(/data-wa-quarter-group="/g) || []).length, 5);
  assert.equal((html.match(/data-wa-quarter-knowledge="/g) || []).length, 4);
  assert.match(html, /data-wa-quarter-knowledge="duality"/);
  assert.doesNotMatch(html, /data-wa-quarter-knowledge="unknown"/);
  assert.equal((html.match(/data-wa-member-business="/g) || []).length, 4);
  assert.equal((html.match(/data-wa-quarter-empty/g) || []).length, 2);
  assert.match(html, /资料不足/);
  // No scores, shares or organization-level quarter.
  assert.doesNotMatch(html, /占比|score|评分|[0-9]+%/);

  const loading = renderQuarterMembersFrame({ state: 'loading', groups });
  assert.match(loading, /data-state="loading"/);
  assert.doesNotMatch(loading, /data-wa-quarter-group=/);
  assert.doesNotMatch(loading, /data-wa-member-business=/);
  const unavailable = renderQuarterMembersFrame({ state: 'unavailable', groups });
  assert.match(unavailable, /data-state="unavailable"/);
  assert.doesNotMatch(unavailable, /data-wa-quarter-group=/);
}));

test('a member quarter article only uses that member own gate lines and Sun line', () => withLocale('zh-CN', () => {
  const chart = { gates: {
    design: { sun: { gate: 13, line: 1 }, earth: { gate: 13, line: 2 }, moon: { gate: 2, line: 3 } },
    personality: { sun: { gate: 13, line: 4 }, earth: { gate: 13, line: 6 }, moon: { gate: 3, line: 1 } }
  } };
  assert.deepEqual(memberGateLines(chart, 13), [1, 2, 4, 6]);
  assert.deepEqual(memberGateLines(chart, 3), [1]);
  assert.deepEqual(memberGateLines(null, 13), []);

  const sun = renderMemberGateFrame({ memberId: 'm1', gate: 13, chart, markerOf, nameOf });
  assert.match(sun, /data-wa-member-gate="13"/);
  assert.match(sun, /data-active-lines="1,2,4,6"/);
  assert.match(sun, /data-selected-line="4"/);
  assert.match(sun, /虚构 甲/);
  assert.match(sun, /data-shared-reading/);
  assert.doesNotMatch(sun, /data-wa-gate=/);

  const other = renderMemberGateFrame({ memberId: 'm1', gate: 3, chart, markerOf, nameOf });
  assert.match(other, /data-selected-line=""/);
  assert.match(other, /data-active-lines="1"/);
  assert.equal(renderMemberGateFrame({ memberId: 'm1', gate: 65, chart, markerOf, nameOf }), '');

  // Public quarter gate: no member, no personal activation, no chart read.
  const publicGate = renderMemberGateFrame({ gate: 13 });
  assert.match(publicGate, /data-wa-gate-scope="public"/);
  assert.match(publicGate, /data-active-lines=""/);
  assert.match(publicGate, /公共知识/);
  assert.doesNotMatch(publicGate, /data-wa-member=|data-selected-line="[1-6]"/);
}));

test('the quarter list marks only explicitly estimated members', () => withLocale('zh-CN', () => {
  const groups = [
    { id: 'initiation', memberIds: ['m1', 'm2'] },
    { id: 'civilization', memberIds: ['m3'] },
    { id: 'duality', memberIds: [] },
    { id: 'mutation', memberIds: [] }
  ];
  const facts = { m1: { status: 'ready', estimated: true }, m2: { status: 'ready', estimated: false }, m3: { status: 'insufficient', estimated: false } };
  const html = renderQuarterMembersFrame({ state: 'ready', groups, markerOf, nameOf, quarterFactsOf: id => facts[id] ?? null });
  assert.equal((html.match(/data-wa-quarter-estimated/g) || []).length, 1);
  const tile = id => html.match(new RegExp(`<button[^>]*data-wa-member-business="${id}"[\\s\\S]*?<\\/button>`))?.[0] ?? '';
  assert.match(tile('m1'), /data-wa-quarter-estimated/);
  assert.match(tile('m1'), /≈/);
  assert.match(tile('m1'), /title="[^"]*估算[^"]*"/);
  assert.doesNotMatch(tile('m2'), /data-wa-quarter-estimated|≈/);
  assert.doesNotMatch(tile('m3'), /data-wa-quarter-estimated|≈/);
  // A missing fact is never guessed; four group headings stay unchanged.
  const none = renderQuarterMembersFrame({ state: 'ready', groups, markerOf, nameOf });
  assert.equal((none.match(/data-wa-quarter-estimated/g) || []).length, 0);
  assert.equal((none.match(/data-wa-quarter-knowledge=/g) || []).length, 4);
}));

test('the host quarter facts stay independent from the business analysis', () => {
  const facts = personalQuarterFacts({ chart: { gates: { personality: { sun: { gate: 7, line: 2 } } } }, timeUnknown: true });
  assert.deepEqual(facts, { status: 'ready', id: 'duality', gate: 7, line: 2, estimated: true });
  assert.equal(personalQuarterFacts({ chart: { gates: { personality: {} } } }).id, null);
});
