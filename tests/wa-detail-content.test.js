import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWaDetailRenderer, renderActivationRows } from '../src/views/wa-detail-content.js';
import { OC16_DEPARTMENTS } from '../src/lib/wa/oc16-catalog.js';
import { readWaContent } from '../src/lib/wa/content.js';
import { renderProse } from '../src/lib/knowledge/detail-renderer.js';
import { readWaReadingExcerpt } from '../src/lib/wa/reading-presentation.js';
import { renderGateDetailHeading } from '../src/lib/object-detail-heading.js';
import { gateName, hexagramName, planetName } from '../src/lib/vocabulary.js';
import { setLocale, t } from '../src/lib/i18n.js';

// Fictional runtime presentation fixtures. No birth inputs or new analysis rules.
const activation = (memberId, gate, side = 'personality', planet = 'sun', line = 1) => ({ memberId, gate, side, planet, line });
function fixture({ status = 'both', left = ['a', 'b'], right = ['b', 'c'], self = ['b'], combinations = [
  { firstMemberId: 'a', secondMemberId: 'b' },
  { firstMemberId: 'a', secondMemberId: 'c' },
  { firstMemberId: 'b', secondMemberId: 'c' }
], extra = [] } = {}) {
  const gates = [21, 45];
  const gateRecords = gates.map((gate, index) => ({ gate, memberIds: index ? right : left,
    activations: [...(index ? right : left).map(id => activation(id, gate)), ...extra.filter(row => row.gate === gate)] }));
  return { status: 'ready', gateRecords, memberIds: ['a', 'b', 'c'],
    pairs: [{ channelId: '21-45', gates, status, holdersByGate: { 21: left, 45: right }, gateRecords,
      selfCompleteMemberIds: self, complementaryMemberPairs: combinations }],
    departments: [{ id: 'management', gateCount: 2, pairCount: 1 }] };
}
const names = { a: 'Fictional A', b: 'Fictional B', c: 'Fictional C' };
const renderer = result => createWaDetailRenderer({ getResult: () => result, nameOf: id => names[id] || id });
const occurrences = (html, needle) => html.split(needle).length - 1;
const endpoint = (html, gate) => html.split(`data-wa-endpoint="${gate}"`)[1]?.split('</div></div>')[0];

test('channel and department readings stay expanded without disclosure folds; gate and support stay fold-free', () => {
  const details = renderer(fixture());
  for (const html of [details.renderPair('21-45'), details.renderDepartment('management'), details.renderGate(45), details.renderPair('26-44')]) {
    assert.doesNotMatch(html, /<details\b|<summary\b/);
  }
  // Department ≡ core channel: one organization role reading, not a second department copy.
  const core = details.renderPair('21-45');
  const dept = details.renderDepartment('management');
  assert.match(core, /class="wa-detail-reading"[^>]*data-wa-knowledge="wa-org"/);
  assert.match(dept, /class="wa-detail-reading"[^>]*data-wa-knowledge="wa-org"/);
  assert.match(dept, /data-wa-merged-dept="management"/);
  assert.match(core, /data-wa-core-pair="21-45"/);
  assert.equal(core, dept);
});

for (const [status, left, right, self, combinations] of [
  ['absent', [], [], [], []],
  ['hanging', ['a'], [], [], []],
  ['selfComplete', ['b'], ['b'], ['b'], []],
  ['crossMemberOnly', ['a'], ['c'], [], [{ firstMemberId: 'a', secondMemberId: 'c' }]],
  ['both', ['a', 'b'], ['b', 'c'], ['b'], [{ firstMemberId: 'a', secondMemberId: 'c' }]]
]) test(`pair preserves supplied ${status} status and exact endpoint holders`, () => {
  setLocale('en', { persist: false });
  const result = fixture({ status, left, right, self, combinations });
  const html = renderer(result).renderPair('21-45');
  assert.match(html, new RegExp(`data-wa-state="${status}"`));
  assert.ok(html.includes(t(`Wa UI state ${status}`)));
  assert.ok(html.indexOf('data-wa-endpoint="45"') < html.indexOf('data-wa-endpoint="21"'));
  for (const [gate, ids] of [[21, left], [45, right]]) {
    const section = endpoint(html, gate);
    for (const id of ['a', 'b', 'c']) assert.equal(section.includes(`data-wa-member="${id}"`), ids.includes(id));
    assert.ok(section.includes(hexagramName(gate)));
    assert.ok(section.includes(gateName(gate)));
    if (!ids.length) assert.ok(section.includes(t('OC16 inactive')));
  }
});

test('pair sheet keeps self-complete near the top and omits cross-member combination lists', () => {
  const html = renderer(fixture()).renderPair('21-45');
  assert.doesNotMatch(html, /data-wa-combination-left|data-wa-combination-right|wa-detail-combinations/);
  assert.ok(!html.includes(t('Wa detail combinations')));
  assert.ok(!html.includes(t('Wa detail relationships')));
  const self = html.split('data-wa-self-complete>')[1].split('</div>')[0];
  assert.match(self, /class="wa-detail-member" data-wa-member="b">Fictional B/);
  assert.doesNotMatch(self, /data-wa-member="(?:a|c)"/);
  assert.ok(html.indexOf('data-wa-self-complete') < html.indexOf('data-wa-endpoint='));
  assert.ok(html.indexOf('data-wa-self-complete') < html.indexOf('data-wa-knowledge'));
  // People (endpoints) → Wa reading → related jumps
  assert.ok(html.indexOf('data-wa-endpoint=') < html.indexOf('data-wa-knowledge="wa-org"'));
  assert.ok(html.indexOf('data-wa-knowledge="wa-org"') < html.indexOf('data-wa-related-jumps'));
  assert.match(html, /class="wa-detail-reading"[^>]*data-wa-knowledge="wa-org"/);
  assert.doesNotMatch(html, /<details\b/);
});

test('all activation rows survive planet multiplicity, P/D and exact duplicates in every detail location', () => {
  const extra = [activation('b', 45, 'design', 'moon', 4), activation('b', 45, 'personality', 'mars', 6), activation('b', 45)];
  const result = fixture({ extra });
  const view = renderer(result);
  const signature = 'data-wa-member="b" data-activation-side="personality" data-activation-planet="sun" data-activation-gate="45" data-activation-line="1"';
  for (const html of [view.renderPair('21-45'), view.renderGate(45), view.renderDepartment('management'),
    view.renderPairRows(OC16_DEPARTMENTS[0], { compact: true })]) {
    assert.equal(occurrences(html, signature), 2);
    assert.match(html, /data-activation-side="design" data-activation-planet="moon" data-activation-gate="45" data-activation-line="4"/);
    assert.match(html, /data-activation-side="personality" data-activation-planet="mars" data-activation-gate="45" data-activation-line="6"/);
    assert.ok(html.includes(planetName('moon')));
    assert.match(html, /data-wa-side="design"/);
    assert.match(html, /data-wa-side="personality"/);
  }
  const pair = view.renderPair('21-45');
  // Flat pair sheet: activations live under each gate column (b on both 21 and 45).
  assert.equal(occurrences(pair, 'data-wa-activation-member="b"'), 2);
  assert.equal(occurrences(pair, 'class="wa-detail-activation"'), 7);
  assert.match(pair, /wa-detail-endpoint--flat/);
  assert.match(pair, /data-wa-gate-activations="45"/);
  assert.doesNotMatch(pair, /<h3>[^<]*OC16 activation sources|OC16 activation sources/);
  assert.match(view.renderPairRows('management', { compact: true }), /wa-detail-compact/);
  const department = view.renderDepartment('management');
  assert.match(department, /data-wa-gate-activations="45"/);
  assert.doesNotMatch(department, /<details class="wa-detail-fold" data-wa-gate-activations=/);
  assert.match(department, /wa-detail-endpoint--flat/);
});

test('all user values including raw-source attributes are escaped', () => {
  const id = 'a"<script>&';
  const row = activation(id, '45"<x>', 'design"<x>', 'sun"<x>', '1"<x>');
  const html = renderActivationRows([row], { nameOf: () => '<img src=x onerror="alert(1)">&' });
  assert.doesNotMatch(html, /<img|<script>|<x>/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;&amp;/);
  for (const attribute of ['side', 'planet', 'gate', 'line']) assert.match(html, new RegExp(`data-activation-${attribute}="[^\"]*&quot;&lt;x&gt;"`));
  const pair = createWaDetailRenderer({ getResult: () => fixture(), nameOf: () => '<Injected "name">&' }).renderPair('21-45');
  assert.doesNotMatch(pair, /<Injected/);
  assert.match(pair, /&lt;Injected &quot;name&quot;&gt;&amp;/);
});

test('scope changes use one fresh result per render and never retain prior people or activations', () => {
  let current = fixture(), calls = 0;
  const view = createWaDetailRenderer({ getResult: () => { calls++; return current; }, nameOf: id => names[id] });
  assert.match(view.renderPair('21-45'), /Fictional C/);
  current = fixture({ status: 'selfComplete', left: ['a'], right: ['a'], self: ['a'], combinations: [] });
  const snapshot = JSON.stringify(current);
  const methods = [() => view.renderPair('21-45'), () => view.renderGate(45), () => view.renderDepartment('management'),
    () => view.renderPairRows('management')];
  for (const render of methods) {
    const before = calls, html = render();
    assert.equal(calls, before + 1);
    assert.match(html, /Fictional A/);
    assert.doesNotMatch(html, /Fictional B|Fictional C|data-wa-member="[bc]"/);
  }
  assert.equal(JSON.stringify(current), snapshot);
});

test('unknown and partial records never become false zero coverage; true empty remains zero', () => {
  for (const result of [null, { ...fixture(), status: 'not_ready' }, { status: 'ready' }]) {
    const view = renderer(result);
    const html = view.renderDepartment('management');
    assert.match(html, /data-wa-gate-count="—">— \/ 4/);
    assert.match(html, /data-wa-pair-count="—">— \/ 2/);
    assert.doesNotMatch(html, /data-wa-state="absent"|data-wa-covered="false"|Fictional/);
    assert.match(view.renderPair('21-45'), /data-wa-state="unknown"/);
    assert.match(view.renderGate(45), /data-wa-gate-state="unknown"/);
  }
  const empty = fixture({ status: 'absent', left: [], right: [], self: [], combinations: [] });
  empty.status = 'empty';
  empty.departments[0] = { id: 'management', gateCount: 0, pairCount: 0 };
  assert.match(renderer(empty).renderDepartment('management'), /data-wa-gate-count="0">0 \/ 4/);
  const wrong = fixture({ status: 'unrecognized' });
  assert.match(renderer(wrong).renderPair('21-45'), /data-wa-state="unknown"/);
  for (const call of [v => v.renderGate('wrong'), v => v.renderPair('45-21'), v => v.renderDepartment('<wrong>'), v => v.renderPairRows({ id: 'wrong' })]) assert.equal(call(renderer(wrong)), '');
});

test('department counts are consumed, core precedes personnel, no trailing blanket contributors', () => {
  const result = fixture();
  // Preserve summary fields even when fixture rows are partial; the renderer must not derive new counts.
  result.departments[0] = { id: 'management', gateCount: 7, pairCount: 3, contributorIds: ['outsider'] };
  const html = renderer(result).renderDepartment('management');
  assert.match(html, /data-wa-gate-count="7">7 \/ 4/);
  assert.match(html, /data-wa-pair-count="3">3 \/ 2/);
  // Core is the primary sheet; personnel 44–26 listed below management.
  assert.equal(occurrences(html, 'data-pair-row='), 1);
  assert.match(html, /data-wa-core-pair="21-45"/);
  assert.ok(html.indexOf('data-wa-core-pair="21-45"') < html.indexOf('data-pair-row="26-44"'));
  assert.doesNotMatch(html, /outsider|wa-contributor-list/);
  assert.match(html, /data-wa-knowledge="wa-org" data-wa-content-id="21-45"/);
  assert.equal(occurrences(html, 'data-wa-org-reading="channel"'), 1);
});

test('three languages show organization role readings on core sheets and jump cards for department reading', () => {
  for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
    setLocale(locale, { persist: false });
    const view = renderer(fixture());
    const core = view.renderPair('21-45'), support = view.renderPair('26-44'), gate = view.renderGate(45);
    // Core pair and department are the same merged sheet; reading-for is the department id.
    assert.match(core, /class="wa-detail-reading" data-wa-knowledge="wa-org" data-wa-content-id="21-45" data-wa-reading-for="management"/);
    assert.equal(core, view.renderDepartment('management'));
    assert.doesNotMatch(core, /<details\b/);
    assert.ok(core.indexOf('data-wa-endpoint=') < core.indexOf('data-wa-knowledge="wa-org"'));
    assert.ok(core.indexOf('data-wa-knowledge="wa-org"') < core.indexOf('data-wa-related-jumps'));
    assert.ok(core.includes('data-wa-org-reading="channel"'));
    assert.ok(core.includes(t('OC16 org role management')));
    assert.ok(core.includes(t('OC16 org gate role 45')));
    assert.ok(core.includes(t('OC16 org gate body 45')));
    assert.doesNotMatch(core, /四大基石|1、7、13、33|董事会与品牌灵魂/);
    assert.equal(occurrences(core, 'data-wa-org-reading="channel"'), 1);
    // Support: own personnel org reading + jump card to the merged department sheet.
    assert.match(support, /data-wa-department="management"[^>]*data-wa-knowledge="wa-department" data-wa-content-id="21-45" data-wa-reading-for="26-44"/);
    assert.doesNotMatch(support, /<details\b/);
    assert.ok(support.includes('data-wa-org-reading="channel"'));
    assert.ok(support.includes(t('Wa UI department reading')));
    assert.ok(support.includes(t('Wa jump open department')));
    assert.ok(gate.includes(renderGateDetailHeading(45)));
    assert.doesNotMatch(gate, /<details\b/);
    assert.ok(gate.includes('data-wa-org-reading="gate"'));
    assert.ok(gate.includes(t('OC16 org gate role 45')));
    assert.ok(gate.includes(t('OC16 org gate body 45')));
    // Gate jumps to merged dept≡core (one card).
    assert.match(gate, /data-wa-department="management"[^>]*data-wa-knowledge="wa-org" data-wa-content-id="21-45" data-wa-reading-for="gate:45"/);
    assert.ok(gate.indexOf('data-wa-gate-state') < gate.indexOf('data-wa-org-reading="gate"'));
    assert.ok(gate.indexOf('data-wa-org-reading="gate"') < gate.indexOf('data-wa-activations'));
    assert.ok(gate.indexOf('data-wa-activations') < gate.indexOf('wa-detail-related'));
    assert.match(core, /data-wa-related-jumps/);
    assert.match(core, /data-wa-gate="45"/);
    assert.match(core, /data-wa-gate="21"/);
    for (const html of [core,support,gate]) assert.doesNotMatch(html,/data-shared-lens|data-shared-gate=|data-shared-channel-reading/);
    for (const html of [core, support, gate]) assert.doesNotMatch(html, /Wa detail |OC16 /);
    assert.ok(core.includes(t('OC16 covered by one')));
    assert.ok(core.includes(t('OC16 personality')));
  }
  setLocale('en', { persist: false });
});

test('pair sheet endpoints are flat like department rows with always-visible activations', () => {
  const view = renderer(fixture());
  const pair = view.renderPair('21-45');
  // Core endpoints live in the primary flat block before support-pair rows.
  const coreFlat = pair.split('data-wa-support-pairs')[0];
  assert.equal(occurrences(coreFlat, 'data-wa-endpoint='), 2);
  assert.equal(occurrences(coreFlat, 'wa-detail-endpoint--flat'), 2);
  assert.match(coreFlat, /data-wa-gate-activations="45"/);
  assert.match(coreFlat, /data-wa-gate-activations="21"/);
  const gate45 = coreFlat.split('data-wa-gate-activations="45"')[1].split('data-wa-gate-activations="21"')[0];
  assert.match(gate45, /data-wa-activation-member="b"/);
  assert.match(gate45, /data-wa-activation-member="c"/);
  assert.doesNotMatch(gate45, /data-wa-activation-member="a"/);
  assert.doesNotMatch(pair, /OC16 activation sources/);
  assert.ok(!view.renderSelected);
});

test('styles keep birth overrides and accessible text tokens scoped, with desktop/phone grids', () => {
  const css = readFileSync(new URL('../src/styles/wa-details.css', import.meta.url), 'utf8');
  for (const side of ['personality', 'design']) assert.ok(css.includes(`var(--hd-birth-${side}, var(--hd-${side}))`));
  assert.match(css, /--source-birthPersonality-text/);
  assert.match(css, /--source-birthDesign-text/);
  assert.doesNotMatch(css, /#[\da-f]{3,8}\b|rgba?\(|font-size:\s*(?:[0-9]|1[01])px|--hd-(?:design|personality)-on/i);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  const source = readFileSync(new URL('../src/views/wa-detail-content.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /document\.|window\.|localStorage|addEventListener|analyzeOC16|collectPair|openDetailDialog/);
});
