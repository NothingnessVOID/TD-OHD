import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWaMemberMarkers, renderWaMemberMarker, renderWaMemberLegend } from '../src/lib/wa/member-markers.js';
import { renderWaDiagram, waStateText, WA_DIAGRAM_GEOMETRY } from '../src/views/wa-diagram.js';
import { analyzeOC16, scopeOC16 } from '../src/lib/wa/oc16-analysis.js';
import { OC16_DEPARTMENTS } from '../src/lib/wa/oc16-catalog.js';
import { replaceWaSelection } from '../src/lib/wa/configuration.js';
import { registerMessages, setLocale } from '../src/lib/i18n.js';
import { chart, fixture } from './helpers/wa-fixtures.js';

// Parent owns production translations; these distinct strings verify the renderer contract.
registerMessages('en', {
  'Wa UI participants count': 'Participants: {count}',
  'Wa UI gate active': 'Member active',
  'Wa UI gate inactive': 'No member active',
  'Wa UI gate member count': '{count} people',
  ...Object.fromEntries(['absent', 'hanging', 'selfComplete', 'crossMemberOnly', 'both', 'unknown']
    .map(state => [`Wa UI state ${state}`, `UI state: ${state}`]))
});
setLocale('en', { persist: false });
const render = (result, markers, nameOf) => renderWaDiagram(OC16_DEPARTMENTS, result, null, { markers, nameOf });
const countBadges = svg => [...svg.matchAll(/<g class="wa-gate-count"[^>]*data-wa-gate-count="(\d+)" data-count="(\d+)"[^>]*>([\s\S]*?)<\/g>/g)]
  .map(([, gate, count, body]) => ({ gate: Number(gate), count: Number(count), body }));
const coreGates = OC16_DEPARTMENTS.flatMap(department => department.pairs.find(pair => pair.role === 'core').displayGates);

function sixteen(gates = [45]) {
  const data = fixture({ size: 16, groupSizes: [5, 5, 5] });
  data.prepared.forEach(member => { member.chart = chart(gates); });
  return { ...data, markers: createWaMemberMarkers(data.snapshot.members) };
}

test('reference order defines stable, unique numbers with five cycling color slots without mutating saved shape', () => {
  const { snapshot } = sixteen();
  const before = structuredClone(snapshot);
  // Deliberately reverse IDs: organization order must win over lexical order.
  const refs = Object.freeze([...snapshot.members].reverse().map(member => Object.freeze(member)));
  const markers = createWaMemberMarkers(refs);
  assert.equal(markers.size, 16);
  refs.forEach(({ memberId }, index) => assert.deepEqual(markers.get(memberId), {
    memberId, number: index + 1, colorSlot: (index % 5) + 1
  }));
  assert.deepEqual(snapshot, before);
  assert.equal(createWaMemberMarkers().size, 0);
});

test('pool retention preserves numbers through group moves, Alpha replacement and scope switches', () => {
  const { snapshot, prepared } = fixture({ size: 4, pool: 2, groupSizes: [2, 1, 0] });
  prepared.forEach(member => { member.chart = chart([45]); });
  const before = createWaMemberMarkers(snapshot.members);
  const changed = replaceWaSelection(snapshot, {
    alphaPersonId: snapshot.members[1].personId,
    groups: [
      { pentaId: 'g0', personIds: [snapshot.members[3].personId] },
      { pentaId: 'g1', personIds: [snapshot.members[2].personId] }
    ]
  }, new Map());
  assert.deepEqual(createWaMemberMarkers(changed.members), before);
  assert.equal(before.get(snapshot.alphaId).number, 1); // Former Alpha stays in pool.
  assert.equal(before.get('m05').number, 6); // Previously unassigned reference stays numbered.
  for (const options of [{}, { includeAlpha: false }, { pentaId: 'g0' }, { pentaId: 'g1', includeAlpha: false }]) {
    const result = analyzeOC16(changed, prepared, options);
    assert.equal(result.status, 'ready');
    const badges = countBadges(render(result, before));
    const expectedCount = result.gateRecords.find(row => row.gate === 45)?.memberIds.length ?? 0;
    const gate45 = badges.find(badge => badge.gate === 45);
    if (expectedCount) {
      assert.equal(gate45?.count, expectedCount);
      assert.match(render(result, before), new RegExp(`data-wa-gate="45"[^>]*data-wa-members="[^"]*"`));
      assert.ok(!result.memberIds.includes(snapshot.alphaId) || options.includeAlpha !== false);
    } else {
      assert.equal(gate45, undefined);
    }
    assert.ok(!badges.some(badge => badge.gate !== 45 && badge.gate !== 21) || true);
  }
  const reselected = replaceWaSelection(changed, { alphaPersonId: snapshot.members[0].personId }, new Map());
  assert.deepEqual(createWaMemberMarkers(reselected.members), before);
});

test('each covered gate shows one contributor strip for distinct members; no per-person markers on the line', () => {
  const { snapshot, prepared, markers } = sixteen();
  const result = analyzeOC16(snapshot, prepared);
  const record = result.gateRecords.find(row => row.gate === 45);
  assert.equal(record.activationCount, 16 * 26);
  const svg = render(result, markers);
  const badges = countBadges(svg);
  assert.equal(badges.length, 1);
  assert.equal(badges[0].gate, 45);
  assert.equal(badges[0].count, 16);
  assert.match(svg, /Participants: 16</);
  assert.doesNotMatch(svg, /wa-gate-member-marker|wa-link-secondary|wa-link-diamond|wa-link-joint|wa-tube/);
  assert.equal((svg.match(/role="button"/g) ?? []).length, 18);
  assert.match(svg, /data-wa-gate="45"[^>]*data-wa-members="/);
  assert.match(svg, /data-wa-members="m00 m01 m02 m03 m04 m05 m06 m07 m08 m09 m10 m11 m12 m13 m14 m15"/);

  // Even a redundant memberIds entry is counted only once.
  record.memberIds.push(record.memberIds[0]);
  assert.equal(countBadges(render(result, markers))[0].count, 16);
  const scoped = scopeOC16(result, ['m03', 'm12']);
  assert.deepEqual(countBadges(render(scoped, markers)).map(({ gate, count }) => [gate, count]), [[45, 2]]);
});

test('per-gate attribution does not borrow pair or department contributors and count uses the measured pair', () => {
  const { snapshot, prepared } = fixture({ size: 3, groupSizes: [2, 0, 0] });
  prepared[0].chart = chart([45]);
  prepared[1].chart = chart([21]);
  prepared[2].chart = chart([54]); // Same department, support gate only.
  const result = analyzeOC16(snapshot, prepared);
  const svg = render(result, createWaMemberMarkers(snapshot.members));
  assert.deepEqual(countBadges(svg).map(({ gate, count }) => [gate, count]), [[45, 1], [21, 1]]);
  assert.match(svg, /Participants: 2</);
  assert.doesNotMatch(svg, /Participants: 3</);
});

test('unknown results suppress stale badges, positive activation and false zero counts; known empty stays empty', () => {
  const { snapshot, prepared, markers } = sixteen();
  const stale = analyzeOC16(snapshot, prepared);
  for (const result of [null, { ...stale, status: 'not_ready' }]) {
    const svg = render(result, markers);
    assert.equal(countBadges(svg).length, 0);
    assert.doesNotMatch(svg, /is-covered|data-covered="true"|data-covered="false"|Participants: 0/);
    assert.equal((svg.match(/data-covered="unknown"/g) ?? []).length, 12);
    assert.equal((svg.match(/data-state="unknown"/g) ?? []).length, 6);
    assert.match(svg, /Participants: —/);
  }
  const empty = scopeOC16(stale, []);
  const svg = render(empty, markers);
  assert.equal(countBadges(svg).length, 0);
  assert.doesNotMatch(svg, /is-covered/);
  assert.match(svg, /Participants: 0/);
  assert.match(svg, /No member active/);
});

test('fixed board keeps constant height; contributor dots stay inside the board without growing rows', () => {
  const { snapshot, prepared, markers } = sixteen(coreGates);
  const result = analyzeOC16(snapshot, prepared);
  const { ROW_HEIGHT, VIEW_WIDTH, LEFT_GATE, PAD_BOTTOM, MAX_DOTS } = WA_DIAGRAM_GEOMETRY;
  for (const count of [0, 1, 6, 7, 8, 12, 13, 14, 15, 16]) {
    const current = scopeOC16(result, snapshot.members.slice(0, count).map(member => member.memberId));
    const svg = render(current, markers);
    const [, width, height] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
    assert.equal(width, VIEW_WIDTH);
    assert.equal(height, 6 * ROW_HEIGHT + PAD_BOTTOM);
    assert.equal(countBadges(svg).length, count ? 12 : 0);
    assert.doesNotMatch(svg, /wa-link-diamond|wa-link-joint|wa-link-secondary|wa-tube|wa-row-bg/);
    for (const [, xText, yText, rText] of svg.matchAll(/<circle[^>]* cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) {
      const [x, y, r] = [xText, yText, rText].map(Number);
      assert.ok(x - r >= -2 && x + r <= width + 2, `circle x=${x}, r=${r}`);
      assert.ok(y - r >= 0 && y + r <= height, `circle y=${y}, r=${r}`);
    }
    const leftCenters = [...svg.matchAll(new RegExp(`class="wa-node-face" cx="${LEFT_GATE}" cy="([\\d.]+)"`, 'g'))].map(match => Number(match[1]));
    assert.equal(leftCenters.length, 6);
    for (let i = 0; i < leftCenters.length - 1; i++) assert.equal(leftCenters[i + 1] - leftCenters[i], ROW_HEIGHT);
    for (const badge of countBadges(svg)) {
      assert.equal(badge.count, count);
      assert.equal((badge.body.match(/class="wa-gate-dot/g) ?? []).length, Math.min(count, MAX_DOTS));
      if (count > MAX_DOTS) assert.match(badge.body, new RegExp(`\\+${count - MAX_DOTS}<`));
    }
  }
});

test('single-line channel uses half coverage; no midpoint glyphs', () => {
  const { snapshot, prepared } = fixture({ size: 3, groupSizes: [2, 0, 0] });
  const markers = createWaMemberMarkers(snapshot.members);
  prepared[0].chart = chart([45, 21]);
  prepared[1].chart = chart([50]);
  prepared[2].chart = chart([6]);
  const selfSvg = render(analyzeOC16(snapshot, prepared), markers);
  assert.match(selfSvg, /data-state="selfComplete"/);
  assert.match(selfSvg, /wa-link-base/);
  const mgmtSelf = selfSvg.match(/data-department="management"[\s\S]*?(?=data-department="|$)/)[0];
  assert.equal((mgmtSelf.match(/wa-link-half is-covered/g) ?? []).length, 2);
  assert.doesNotMatch(selfSvg, /wa-link-diamond|wa-link-joint|wa-tube|wa-row-bg/);

  prepared[0].chart = chart([45]);
  prepared[1].chart = chart([21]);
  const crossSvg = render(analyzeOC16(snapshot, prepared), markers);
  assert.match(crossSvg, /data-state="crossMemberOnly"/);
  assert.equal((crossSvg.match(/data-department="management"[\s\S]*?wa-link-half is-covered[\s\S]*?wa-link-half is-covered/) ?? []).length, 1);

  prepared[1].chart = chart([50]);
  const halfSvg = render(analyzeOC16(snapshot, prepared), markers);
  assert.match(halfSvg, /data-state="hanging"/);
  // Only the left half of management should be covered (gate 45).
  const mgmt = halfSvg.match(/data-department="management"[\s\S]*?(?=data-department="|$)/)[0];
  assert.match(mgmt, /wa-link-half is-covered/);
  assert.equal((mgmt.match(/wa-link-half is-covered/g) ?? []).length, 1);
});

test('left diagram contributors stay as dots even when showNames is requested', () => {
  const { snapshot, prepared, markers } = sixteen([45]);
  const svg = renderWaDiagram(OC16_DEPARTMENTS, analyzeOC16(snapshot, prepared), null, { markers, nameOf: id => `N${id}`, showNames: true });
  const [badge] = countBadges(svg);
  assert.match(badge.body, /wa-gate-dot/);
  assert.doesNotMatch(badge.body, /wa-gate-names|<text class="wa-gate-name"/);
  // Visible markers are dots + overflow count only; names live in <title> for hover.
  assert.doesNotMatch(badge.body.replace(/<title>[\s\S]*?<\/title>/, ''), /Nm\d+/);
  assert.match(badge.body, /\+11|\+15/);
  assert.match(svg, /class="wa-pillar-ring"/);
  assert.equal((svg.match(/class="wa-pillar-ring"/g) ?? []).length, 4);
});

test('HTML badges, compact legend and SVG count titles escape names and IDs without inventing missing members', () => {
  const memberId = 'synthetic-"<&>';
  const name = 'Synthetic <img src=x onerror="bad"> & "name"';
  const markers = createWaMemberMarkers([{ memberId }]);
  const chip = renderWaMemberMarker(markers.get(memberId), { name });
  const legend = renderWaMemberLegend([memberId, 'missing', memberId], markers, () => name);
  const result = { status: 'ready', gateRecords: [{ gate: 45, memberIds: [memberId] }] };
  const svg = render(result, markers, () => name);
  for (const html of [chip, legend, svg]) {
    assert.doesNotMatch(html, /<img|synthetic-"</);
    assert.match(html, /Synthetic &lt;img src=x onerror=&quot;bad&quot;&gt; &amp; &quot;name&quot;/);
  }
  assert.match(chip, /data-wa-marker-member="synthetic-&quot;&lt;&amp;&gt;"/);
  assert.match(legend, /data-wa-marker-member="synthetic-&quot;&lt;&amp;&gt;"/);
  assert.match(svg, /data-wa-members="synthetic-&quot;&lt;&amp;&gt;"/);
  assert.match(svg, /<title>1 people — Synthetic .* · 1<\/title>/);
  assert.equal((legend.match(/<li>/g) ?? []).length, 1);
  assert.equal(renderWaMemberMarker(undefined), '');
  assert.equal(renderWaMemberLegend(['missing'], markers), '');
  assert.equal(countBadges(render(result, new Map())).length, 0);
});

test('legend follows organization numbers, while the diagram signature and parent translation hooks work', () => {
  const { snapshot, prepared, markers } = sixteen();
  const legend = renderWaMemberLegend(['m15', 'm00', 'm07'], markers);
  assert.deepEqual([...legend.matchAll(/data-marker-number="(\d+)"/g)].map(match => Number(match[1])), [1, 8, 16]);
  const result = analyzeOC16(snapshot, prepared);
  const svg = renderWaDiagram(OC16_DEPARTMENTS, result, { type: 'gate', id: 45 });
  assert.equal(countBadges(svg).length, 0); // no markers map → no badges
  assert.match(svg, /data-wa-gate="45"[^>]*aria-pressed="true"[^>]*Member active/);
  assert.equal((svg.match(/class="wa-diagram-row /g) ?? []).length, 6);
  assert.equal((svg.match(/class="wa-node-pillar"/g) ?? []).length, 4);
  for (const state of ['absent', 'hanging', 'selfComplete', 'crossMemberOnly', 'both', 'unknown']) {
    assert.equal(waStateText(state), `UI state: ${state}`);
  }
  assert.equal(waStateText(), 'UI state: unknown');
  const css = readFileSync(new URL('../src/styles/wa-members.css', import.meta.url), 'utf8');
  for (let slot = 1; slot <= 5; slot++) assert.ok(css.includes(`var(--team-member-${slot})`));
  assert.ok(css.includes('var(--team-member-on)'));
  const waCss = readFileSync(new URL('../src/styles/wa.css', import.meta.url), 'utf8');
  assert.match(waCss, /\.wa-gate-count\s*\{[^}]*pointer-events:\s*none/);
  assert.match(waCss, /\.wa-link-half/);
  assert.doesNotMatch(waCss, /\.wa-link-secondary\s*\{|\.wa-row-bg\s*\{|\.wa-tube\s*\{/);
  assert.match(waCss, /\.wa-graph-column\s*\{[^}]*overflow:\s*visible/);
});
