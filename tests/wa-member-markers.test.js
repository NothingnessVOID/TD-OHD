import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWaMemberMarkers, renderWaMemberMarker, renderWaMemberLegend } from '../src/lib/wa/member-markers.js';
import { renderWaDiagram, waStateText } from '../src/views/wa-diagram.js';
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
  ...Object.fromEntries(['absent', 'hanging', 'selfComplete', 'crossMemberOnly', 'both', 'unknown']
    .map(state => [`Wa UI state ${state}`, `UI state: ${state}`]))
});
setLocale('en', { persist: false });
const render = (result, markers, nameOf) => renderWaDiagram(OC16_DEPARTMENTS, result, null, { markers, nameOf });
const markerNodes = svg => [...svg.matchAll(/<g class="wa-gate-member-marker[^>]*data-wa-gate-marker="(\d+)" data-wa-marker-member="([^"]+)" data-marker-number="(\d+)">([\s\S]*?)<\/g>/g)]
  .map(([, gate, memberId, number, body]) => ({ gate: Number(gate), memberId, number: Number(number), body }));
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
    const nodes = markerNodes(render(result, before));
    assert.deepEqual(nodes.map(node => node.memberId).sort(), [...result.memberIds].sort());
    nodes.forEach(node => assert.equal(node.number, before.get(node.memberId).number));
    assert.ok(!nodes.some(node => node.memberId === snapshot.alphaId));
  }
  const reselected = replaceWaSelection(changed, { alphaPersonId: snapshot.members[0].personId }, new Map());
  assert.deepEqual(createWaMemberMarkers(reselected.members), before);
});

test('each gate shows exactly its actual IDs once, including all sixteen; repeated planets never multiply badges', () => {
  const { snapshot, prepared, markers } = sixteen();
  const result = analyzeOC16(snapshot, prepared);
  const record = result.gateRecords.find(row => row.gate === 45);
  assert.equal(record.activationCount, 16 * 26);
  const svg = render(result, markers);
  const nodes = markerNodes(svg);
  assert.equal(nodes.length, 16);
  assert.deepEqual(nodes.map(node => node.memberId), snapshot.members.map(member => member.memberId));
  assert.deepEqual(nodes.map(node => node.number), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.ok(nodes.every(node => node.gate === 45));
  assert.match(svg, />Participants: 16<\/text>/);
  assert.doesNotMatch(svg, /\+N|\+\d+|0 \/ 2/);
  assert.equal((svg.match(/role="button"/g) ?? []).length, 18);
  assert.ok(nodes.every(node => !/tabindex|role="button"/.test(node.body)));

  // Even a redundant memberIds entry is rendered only once.
  record.memberIds.push(record.memberIds[0]);
  assert.equal(markerNodes(render(result, markers)).length, 16);
  const scoped = scopeOC16(result, ['m03', 'm12']);
  assert.deepEqual(markerNodes(render(scoped, markers)).map(({ memberId, number }) => [memberId, number]), [['m03', 4], ['m12', 13]]);
});

test('per-gate attribution does not borrow pair or department contributors and count uses the measured pair', () => {
  const { snapshot, prepared } = fixture({ size: 3, groupSizes: [2, 0, 0] });
  prepared[0].chart = chart([45]);
  prepared[1].chart = chart([21]);
  prepared[2].chart = chart([54]); // Same department, support gate only.
  const result = analyzeOC16(snapshot, prepared);
  const svg = render(result, createWaMemberMarkers(snapshot.members));
  assert.deepEqual(markerNodes(svg).map(({ gate, memberId }) => [gate, memberId]), [[45, 'm00'], [21, 'm01']]);
  assert.match(svg, />Participants: 2<\/text>/);
  assert.doesNotMatch(svg, />Participants: 3<\/text>/);
});

test('unknown results suppress stale markers, positive activation and false zero counts; known empty stays empty', () => {
  const { snapshot, prepared, markers } = sixteen();
  const stale = analyzeOC16(snapshot, prepared);
  for (const result of [null, { ...stale, status: 'not_ready' }]) {
    const svg = render(result, markers);
    assert.equal(markerNodes(svg).length, 0);
    assert.doesNotMatch(svg, /is-covered|data-covered="true"|data-covered="false"|Participants: 0/);
    assert.equal((svg.match(/data-covered="unknown"/g) ?? []).length, 12);
    assert.equal((svg.match(/data-state="unknown"/g) ?? []).length, 6);
    assert.match(svg, /Participants: —/);
  }
  const empty = scopeOC16(stale, []);
  const svg = render(empty, markers);
  assert.equal(markerNodes(svg).length, 0);
  assert.doesNotMatch(svg, /is-covered/);
  assert.match(svg, /Participants: 0/);
  assert.match(svg, /No member active/);
});

test('fixed compact board keeps constant height; markers fan beside gates without growing rows', () => {
  const { snapshot, prepared, markers } = sixteen(coreGates);
  const result = analyzeOC16(snapshot, prepared);
  const ROW_HEIGHT = 58;
  const VIEW_WIDTH = 360;
  const LEFT_GATE = 152;
  const RIGHT_GATE = 276;
  for (const count of [0, 1, 6, 7, 8, 12, 13, 14, 15, 16]) {
    const current = scopeOC16(result, snapshot.members.slice(0, count).map(member => member.memberId));
    const svg = render(current, markers);
    const [, width, height] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
    assert.equal(width, VIEW_WIDTH);
    assert.equal(height, 6 * ROW_HEIGHT + 4);
    assert.equal(markerNodes(svg).length, 12 * count);
    for (const [, xText, yText, rText] of svg.matchAll(/<circle[^>]* cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) {
      const [x, y, r] = [xText, yText, rText].map(Number);
      assert.ok(x - r >= 0 && x + r <= width, `circle x=${x}, r=${r}`);
      assert.ok(y - r >= 0 && y + r <= height, `circle y=${y}, r=${r}`);
    }
    const leftCenters = [...svg.matchAll(/class="wa-node-face" cx="152" cy="([\d.]+)"/g)].map(match => Number(match[1]));
    assert.equal(leftCenters.length, 6);
    for (let i = 0; i < leftCenters.length - 1; i++) assert.equal(leftCenters[i + 1] - leftCenters[i], ROW_HEIGHT);
    for (const gate of coreGates) {
      const badges = markerNodes(svg).filter(node => node.gate === gate);
      assert.equal(badges.length, count);
      for (const badge of badges) {
        const cy = Number(badge.body.match(/cy="([\d.]+)"/)[1]);
        const textY = Number(badge.body.match(/<text[^>]* y="([\d.]+)"/)[1]);
        assert.equal(textY, cy + 3.2);
        const rowIndex = leftCenters.findIndex(center => Math.abs(center - cy) <= 22);
        assert.ok(rowIndex >= 0, `marker cy=${cy} should stay near a row center`);
        assert.ok(Math.abs(cy - leftCenters[rowIndex]) <= 22);
      }
    }
    if (count > 0) {
      // Markers fan inward along the channel.
      const leftGate = coreGates[0];
      const rightGate = coreGates[1];
      const leftBadges = markerNodes(svg).filter(node => node.gate === leftGate);
      const rightBadges = markerNodes(svg).filter(node => node.gate === rightGate);
      if (leftBadges.length) assert.ok(leftBadges.every(node => Number(node.body.match(/cx="([\d.]+)"/)[1]) > LEFT_GATE));
      if (rightBadges.length) assert.ok(rightBadges.every(node => Number(node.body.match(/cx="([\d.]+)"/)[1]) < RIGHT_GATE));
    }
  }
});

test('HTML badges, compact legend and SVG circle titles escape names and IDs without inventing missing members', () => {
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
    assert.match(html, /data-wa-marker-member="synthetic-&quot;&lt;&amp;&gt;"/);
  }
  assert.match(svg, /<circle[^>]+><title>Synthetic .* · 1<\/title><\/circle>/);
  assert.equal((legend.match(/<li>/g) ?? []).length, 1);
  assert.equal(renderWaMemberMarker(undefined), '');
  assert.equal(renderWaMemberLegend(['missing'], markers), '');
  assert.equal(markerNodes(render(result, new Map())).length, 0);
});

test('legend follows organization numbers, while the legacy diagram signature and parent translation hooks work', () => {
  const { snapshot, prepared, markers } = sixteen();
  const legend = renderWaMemberLegend(['m15', 'm00', 'm07'], markers);
  assert.deepEqual([...legend.matchAll(/data-marker-number="(\d+)"/g)].map(match => Number(match[1])), [1, 8, 16]);
  const result = analyzeOC16(snapshot, prepared);
  const svg = renderWaDiagram(OC16_DEPARTMENTS, result, { type: 'gate', id: 45 });
  assert.equal(markerNodes(svg).length, 0);
  assert.match(svg, /data-wa-gate="45"[^>]*aria-pressed="true"[^>]*Member active/);
  assert.equal((svg.match(/class="wa-diagram-row /g) ?? []).length, 6);
  assert.equal((svg.match(/class="wa-pillar-ring"/g) ?? []).length, 4);
  for (const state of ['absent', 'hanging', 'selfComplete', 'crossMemberOnly', 'both', 'unknown']) {
    assert.equal(waStateText(state), `UI state: ${state}`);
  }
  assert.equal(waStateText(), 'UI state: unknown');
  const css = readFileSync(new URL('../src/styles/wa-members.css', import.meta.url), 'utf8');
  for (let slot = 1; slot <= 5; slot++) assert.ok(css.includes(`var(--team-member-${slot})`));
  assert.ok(css.includes('var(--team-member-on)'));
  assert.match(css,/\.wa-gate-member-marker text\s*\{[^}]*font-size:9px/);
});
