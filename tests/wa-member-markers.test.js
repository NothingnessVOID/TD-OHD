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

test('each covered gate shows one count badge for distinct members; no per-person dots on the line', () => {
  const { snapshot, prepared, markers } = sixteen();
  const result = analyzeOC16(snapshot, prepared);
  const record = result.gateRecords.find(row => row.gate === 45);
  assert.equal(record.activationCount, 16 * 26);
  const svg = render(result, markers);
  const badges = countBadges(svg);
  assert.equal(badges.length, 1);
  assert.equal(badges[0].gate, 45);
  assert.equal(badges[0].count, 16);
  assert.match(svg, /Participants: 16"/);
  assert.doesNotMatch(svg, /wa-gate-member-marker|wa-link-secondary/);
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
  assert.match(svg, /Participants: 2"/);
  assert.doesNotMatch(svg, /Participants: 3"/);
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

test('fixed board keeps constant height; contributor strips stay inside the board without growing rows', () => {
  const { snapshot, prepared, markers } = sixteen(coreGates);
  const result = analyzeOC16(snapshot, prepared);
  const { ROW_HEIGHT, VIEW_WIDTH, LEFT_GATE, PAD_TOP, PAD_BOTTOM, MAX_DOTS, NODE_R, DOT_GAP, NODE_HALO_EXTRA, NODE_HIT_EXTRA } = WA_DIAGRAM_GEOMETRY;
  for (const count of [0, 1, 6, 7, 8, 12, 13, 14, 15, 16]) {
    const current = scopeOC16(result, snapshot.members.slice(0, count).map(member => member.memberId));
    const svg = render(current, markers);
    const [, width, height] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
    assert.equal(width, VIEW_WIDTH);
    assert.equal(height, 6 * ROW_HEIGHT + PAD_TOP + PAD_BOTTOM);
    assert.equal(countBadges(svg).length, count ? 12 : 0);
    assert.doesNotMatch(svg, /wa-link-diamond|wa-link-joint|wa-link-secondary|wa-row-bg/);
    assert.equal((svg.match(/wa-tube-mid/g) ?? []).length, 6);
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

test('channel tube encodes state by fill: full when defined, gradient from the active side when half, empty when open', () => {
  const { snapshot, prepared } = fixture({ size: 3, groupSizes: [2, 0, 0] });
  const markers = createWaMemberMarkers(snapshot.members);
  const rowFill = (svg, department) => svg.match(new RegExp(`data-department="${department}" data-fill="(\\w+)"`))[1];
  prepared[0].chart = chart([45, 21]);
  prepared[1].chart = chart([50]);
  prepared[2].chart = chart([6]);
  const selfSvg = render(analyzeOC16(snapshot, prepared), markers);
  assert.match(selfSvg, /data-state="selfComplete"/);
  assert.equal(rowFill(selfSvg, 'management'), 'full');
  assert.equal(rowFill(selfSvg, 'competition'), 'none');
  assert.match(selfSvg.match(/data-department="management"[\s\S]*?(?=data-department="|$)/)[0], /wa-tube-mid is-filled/);
  assert.match(selfSvg.match(/data-department="competition"[\s\S]*?(?=data-department="|$)/)[0], /wa-tube-mid is-hollow/);
  assert.doesNotMatch(selfSvg, /wa-link-diamond|wa-link-joint|wa-row-bg/);
  assert.equal((selfSvg.match(/wa-tube-mid/g) ?? []).length, 6);

  prepared[0].chart = chart([45]);
  prepared[1].chart = chart([21]);
  const crossSvg = render(analyzeOC16(snapshot, prepared), markers);
  assert.match(crossSvg, /data-state="crossMemberOnly"/);
  assert.equal(rowFill(crossSvg, 'management'), 'full');
  assert.match(crossSvg.match(/data-department="management"[\s\S]*?(?=data-department="|$)/)[0], /wa-tube-mid is-filled/);

  prepared[1].chart = chart([50]);
  const halfSvg = render(analyzeOC16(snapshot, prepared), markers);
  assert.match(halfSvg, /data-state="hanging"/);
  assert.equal(rowFill(halfSvg, 'management'), 'left');
  assert.match(halfSvg, /<linearGradient id="wa-tube-21-45"/);
  assert.match(halfSvg, /class="wa-tube-fill is-partial"[^>]*fill="url\(#wa-tube-21-45\)"/);
  assert.match(halfSvg.match(/data-department="management"[\s\S]*?(?=data-department="|$)/)[0], /wa-tube-mid is-hollow/);

  const unknownSvg = render(null, markers);
  assert.doesNotMatch(unknownSvg, /wa-tube-fill|<defs/);
});

test('contributor dots start on the outer face rim and pack inward toward the channel', () => {
  const { snapshot, prepared } = fixture({ size: 5, groupSizes: [3, 0, 0] });
  prepared[0].chart = chart([45]);
  prepared[1].chart = chart([45]);
  prepared[2].chart = chart([21]);
  prepared[3].chart = chart([21]);
  const markers = createWaMemberMarkers(snapshot.members);
  const svg = render(analyzeOC16(snapshot, prepared), markers);
  const { LEFT_GATE, RIGHT_GATE, DOT_STEP, DOT_OUTER_OFFSET } = WA_DIAGRAM_GEOMETRY;
  const left = countBadges(svg).find(badge => badge.gate === 45);
  const right = countBadges(svg).find(badge => badge.gate === 21);
  assert.equal(left?.count, 2);
  assert.equal(right?.count, 2);
  const leftXs = [...left.body.matchAll(/cx="([\d.]+)"/g)].map(m => Number(m[1]));
  const rightXs = [...right.body.matchAll(/cx="([\d.]+)"/g)].map(m => Number(m[1]));
  const leftStart = LEFT_GATE - DOT_OUTER_OFFSET;
  const rightStart = RIGHT_GATE + DOT_OUTER_OFFSET;
  assert.deepEqual(leftXs, [leftStart, leftStart + DOT_STEP]);
  assert.deepEqual(rightXs, [rightStart, rightStart - DOT_STEP]);
  assert.ok(leftXs[0] < LEFT_GATE, 'left strip starts outside the gate center');
  assert.ok(rightXs[0] > RIGHT_GATE, 'right strip starts outside the gate center');
  assert.ok(leftXs[1] > leftXs[0], 'left strip grows rightward (inward)');
  assert.ok(rightXs[1] < rightXs[0], 'right strip grows leftward (inward)');
});

test('contributor dots sit clear below gate face, halo and hit; mid diamond CSS stays luminous', () => {
  const { snapshot, prepared } = fixture({ size: 3, groupSizes: [2, 0, 0] });
  prepared[0].chart = chart([45, 21]);
  prepared[1].chart = chart([45]);
  const markers = createWaMemberMarkers(snapshot.members);
  const svg = render(analyzeOC16(snapshot, prepared), markers);
  const { NODE_R, DOT_GAP, NODE_HALO_EXTRA, NODE_HIT_EXTRA, LEFT_GATE, PILLAR_RING_R } = WA_DIAGRAM_GEOMETRY;
  const faceY = Number(svg.match(new RegExp(`class="wa-node-face" cx="${LEFT_GATE}" cy="([\\d.]+)"`))[1]);
  const badge = countBadges(svg).find(row => row.gate === 45);
  const dotY = Number(badge.body.match(/cy="([\d.]+)"/)[1]);
  assert.equal(dotY, faceY + NODE_R + DOT_GAP);
  assert.ok(DOT_GAP >= 24, `DOT_GAP=${DOT_GAP} should keep dots clear of hover/focus frames`);
  // Halo / hit / focus-ring bottoms must sit above the top of contributor dots.
  assert.ok(faceY + NODE_R + NODE_HALO_EXTRA + 1 < dotY - 4, 'halo must clear dots');
  assert.ok(faceY + NODE_R + NODE_HIT_EXTRA + 1 < dotY - 4, 'hit ring must clear dots');
  const focusExtra = WA_DIAGRAM_GEOMETRY.PILLAR_FOCUS_EXTRA;
  assert.ok(faceY + PILLAR_RING_R + focusExtra + 1 < dotY - 4, 'pillar focus ring must clear dots');
  assert.equal(NODE_R + WA_DIAGRAM_GEOMETRY.NODE_HIT_EXTRA, PILLAR_RING_R + focusExtra, 'pillar and plain focus share outer radius');
  assert.ok(Math.abs((PILLAR_RING_R - NODE_R) - focusExtra) <= 0.5, 'solid→pillar and pillar→focus gaps stay near-even');
  assert.match(svg, /wa-mid-halo/);
  assert.match(svg, /wa-tube-mid is-filled/);
  assert.match(svg, /class="wa-node-focus-ring"/);
  assert.equal((svg.match(/class="wa-node-focus-ring"/g) ?? []).length, 12);
  const waCss = readFileSync(new URL('../src/styles/wa.css', import.meta.url), 'utf8');
  assert.match(waCss, /\.wa-tube-mid\.is-filled\s*\{[^}]*fill:\s*#fff/);
  assert.doesNotMatch(waCss, /\.wa-tube-mid\.is-filled\s*\{[^}]*accent-on/);
  assert.match(waCss, /\.wa-mid-halo\s*\{/);
  assert.match(waCss, /\.wa-node-focus-ring\s*\{/);
  assert.match(waCss, /\.wa-diagram-gate:hover \.wa-node-focus-ring/);
  assert.match(waCss, /\.wa-diagram-channel:hover \.wa-link-hit/);
  assert.doesNotMatch(waCss, /\.wa-diagram-row:hover \.wa-row-bg|\.wa-row-bg\s*\{/);
});

test('left diagram contributors stay as dots even when showNames is requested', () => {
  const { snapshot, prepared, markers } = sixteen([45]);
  const svg = renderWaDiagram(OC16_DEPARTMENTS, analyzeOC16(snapshot, prepared), null, { markers, nameOf: id => `N${id}`, showNames: true });
  const [badge] = countBadges(svg);
  assert.match(badge.body, /wa-gate-dot/);
  assert.doesNotMatch(badge.body, /wa-gate-names|<text class="wa-gate-name"/);
  assert.doesNotMatch(badge.body.replace(/<title>[\s\S]*?<\/title>/, ''), /Nm\d+/);
  assert.match(badge.body, /\+11|\+15/); // overflow marker, never a name string
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
  assert.equal((svg.match(/class="wa-node-pillar"/g) ?? []).length, 0); // ring-only pillars
  assert.equal((svg.match(/class="wa-gate-chip"/g) ?? []).length, 12);
  assert.match(svg, /data-wa-gate-chip="45"/);
  assert.match(svg, /class="wa-dept-title"/);
  for (const state of ['absent', 'hanging', 'selfComplete', 'crossMemberOnly', 'both', 'unknown']) {
    assert.equal(waStateText(state), `UI state: ${state}`);
  }
  assert.equal(waStateText(), 'UI state: unknown');
  const css = readFileSync(new URL('../src/styles/wa-members.css', import.meta.url), 'utf8');
  for (let slot = 1; slot <= 5; slot++) assert.ok(css.includes(`var(--team-member-${slot})`));
  assert.ok(css.includes('var(--team-member-on)'));
  const waCss = readFileSync(new URL('../src/styles/wa.css', import.meta.url), 'utf8');
  assert.match(waCss, /\.wa-gate-count\s*\{[^}]*pointer-events:\s*none/);
  assert.match(waCss, /\.wa-tube\s*\{/);
  assert.match(waCss, /\.wa-tube-mid\.is-hollow/);
  assert.match(waCss, /\.wa-tube-mid\.is-filled/);
  assert.match(waCss, /\.wa-tube-mid\.is-filled\s*\{[^}]*fill:\s*#fff/);
  assert.doesNotMatch(waCss, /\.wa-tube-mid\.is-filled\s*\{[^}]*var\(--accent-on/);
  assert.match(waCss, /\.wa-mid-halo\s*\{/);
  assert.match(waCss, /\.wa-node-focus-ring\s*\{/);
  assert.match(waCss, /\.wa-diagram-gate:hover \.wa-node-focus-ring/);
  assert.match(waCss, /\.wa-diagram-channel:hover \.wa-link-hit/);
  assert.match(waCss, /\.wa-graph-column\s*\{[^}]*overflow:\s*visible/);
  assert.match(waCss, /\.wa-gate-chip-bg\s*\{/);
  assert.match(waCss, /\.wa-dept-title-rule\s*\{/);
  assert.doesNotMatch(waCss, /\.wa-dept-title-bg\s*\{/);
  assert.doesNotMatch(waCss, /\.wa-link-secondary\s*\{|\.wa-row-bg\s*\{|\.wa-link-half\s*\{|\.wa-link-base\s*\{/);
});
