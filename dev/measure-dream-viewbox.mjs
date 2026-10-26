/**
 * Derives the DreamRave portal stubs and re-measures the graph viewBox.
 *
 * Gates 12, 19 and 62 are portals: their waking half-channel reaches a gate in a
 * centre the sleep design removes (12→22 and 19→49 in the Solar Plexus, 62→17 in
 * the Ajna). Keeping the full path would leave a long line hanging over empty
 * space, so 12 and 19 are truncated to the same ~51-unit stub gate 62 already
 * has. The stub keeps the original direction and the catalog's 17.4-unit bar
 * width; only its length changes.
 *
 * Run: node dev/measure-dream-viewbox.mjs
 * Output is pasted into src/lib/human-design/dream-topology.js as constants,
 * because the geometry it derives from is static vendored data.
 */

import { CENTER_SHAPES, GATE_PATHS, GATE_CIRCLE_POSITIONS } from '../src/lib/human-design/bodygraph-geometry.js';
import { INTEGRATION_SPAN } from '../src/lib/bodygraph-integration.js';

const DREAM_CENTERS = ['Throat', 'G', 'Spleen', 'Sacral', 'Root'];
const DREAM_GATES = [1, 5, 8, 12, 15, 19, 20, 27, 28, 38, 42, 50, 53, 57, 62];
const PORTALS = [12, 19, 62];
const STUB_LENGTH = 51.2; // matches gate 62's existing stub
const PAD = 16;           // BODYGRAPH_PAD in src/bodygraph.js
const VIEW_BOX = { x: 0, y: 0, w: 851.41, h: 1309.4 };

const round = (v, p = 2) => Number(v.toFixed(p));

/**
 * Absolute-coordinate walker. Returns the corner points of a path in order.
 * Arc bulge is ignored: the radii here are 5-6 units and PAD is 16.
 */
function walk(d) {
  const pts = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  const tokens = d.match(/[A-Za-z]|[-+]?[0-9]*[.]?[0-9]+/g) || [];
  let i = 0, cmd = null;
  const num = () => Number(tokens[i++]);
  const point = rel => { const nx = num(), ny = num(); x = rel ? x + nx : nx; y = rel ? y + ny : ny; pts.push([x, y]); };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M': point(rel); sx = x; sy = y; cmd = rel ? 'l' : 'L'; break;
      case 'L': point(rel); break;
      case 'H': { const nx = num(); x = rel ? x + nx : nx; pts.push([x, y]); break; }
      case 'V': { const ny = num(); y = rel ? y + ny : ny; pts.push([x, y]); break; }
      case 'C': point(rel); point(rel); point(rel); break;
      case 'S': case 'Q': case 'T': point(rel); point(rel); break;
      case 'A': { num(); num(); num(); num(); num(); point(rel); break; }
      case 'Z': x = sx; y = sy; break;
      default: throw new Error(`Unhandled command ${cmd} in: ${d}`);
    }
  }
  return pts;
}

function boundsOf(pts) {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of pts) {
    if (x < b.minX) b.minX = x;
    if (x > b.maxX) b.maxX = x;
    if (y < b.minY) b.minY = y;
    if (y > b.maxY) b.maxY = y;
  }
  return b;
}
const union = (a, b) => ({
  minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
  maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY)
});

/**
 * Truncate a four-corner half-channel bar to `len` units, measured from the end
 * that sits at the gate circle. Corners arrive as [farA, nearB, nearC, farD].
 */
function stubPath(gate, len = STUB_LENGTH) {
  const [A, B, C, D] = walk(GATE_PATHS[gate]);
  const near = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2];
  const far = [(A[0] + D[0]) / 2, (A[1] + D[1]) / 2];
  const dx = far[0] - near[0], dy = far[1] - near[1];
  const full = Math.hypot(dx, dy);
  const ux = dx / full, uy = dy / full;
  const ox = ux * len, oy = uy * len;
  const B2 = [B[0] + ox, B[1] + oy];
  const C2 = [C[0] + ox, C[1] + oy];
  const fmt = p => `${round(p[0])},${round(p[1])}`;
  const d = `M${fmt(B2)}L${fmt(B)}L${fmt(C)}L${fmt(C2)}Z`;
  return { gate, fullLength: round(full, 1), barWidth: round(Math.hypot(C[0] - B[0], C[1] - B[1]), 2), d };
}

console.log('=== portal stubs (truncated to', STUB_LENGTH, 'units) ===');
const stubs = {};
for (const gate of PORTALS) {
  const s = stubPath(gate);
  const original = boundsOf(walk(GATE_PATHS[gate]));
  const stubbed = boundsOf(walk(s.d));
  console.log(`gate ${gate}: original length ${s.fullLength}u, bar width ${s.barWidth}u`);
  console.log(`  path: ${s.d}`);
  console.log(`  bbox shrinks from ${round(original.maxX - original.minX, 1)}x${round(original.maxY - original.minY, 1)} to ${round(stubbed.maxX - stubbed.minX, 1)}x${round(stubbed.maxY - stubbed.minY, 1)}`);
  stubs[gate] = s.d;
}

// --- viewBox, upright ---
let box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
for (const key of DREAM_CENTERS) box = union(box, boundsOf(walk(CENTER_SHAPES[key].path)));
for (const g of DREAM_GATES) box = union(box, boundsOf(walk(stubs[g] || GATE_PATHS[g])));
for (const span of INTEGRATION_SPAN) box = union(box, boundsOf(walk(span)));
for (const g of DREAM_GATES) {
  const c = GATE_CIRCLE_POSITIONS[g];
  const r = Math.max((c.r || 12.3) + 8.5, 24); // transit ring and the 44px touch hit area
  box = union(box, { minX: c.cx - r, minY: c.cy - r, maxX: c.cx + r, maxY: c.cy + r });
}

const upright = { x: round(box.minX), y: round(box.minY), w: round(box.maxX - box.minX), h: round(box.maxY - box.minY) };
console.log('\n=== upright viewBox (content only, renderer adds PAD) ===');
console.log(JSON.stringify(upright), ' aspect', round(upright.w / upright.h, 4));

// Rotated 90 degrees clockwise about the padded viewBox centre.
const pw = upright.w + PAD * 2, ph = upright.h + PAD * 2;
const cx = upright.x - PAD + pw / 2, cy = upright.y - PAD + ph / 2;
const rotated = { x: round(cx - ph / 2), y: round(cy - pw / 2), w: round(ph), h: round(pw) };
console.log('\n=== rotated 90deg CW ===');
console.log('padded upright viewBox :', `${round(upright.x - PAD)} ${round(upright.y - PAD)} ${round(pw)} ${round(ph)}`);
console.log('rotation centre        :', `${round(cx, 3)} ${round(cy, 3)}`);
console.log('rotated viewBox        :', `${rotated.x} ${rotated.y} ${rotated.w} ${rotated.h}`);
console.log('rotated aspect (w/h)   :', round(rotated.w / rotated.h, 4));

// Sanity: the stubs must not reach a removed centre.
console.log('\n=== stub reach check ===');
for (const [name, shape] of Object.entries(CENTER_SHAPES)) {
  if (DREAM_CENTERS.includes(name)) continue;
  const cb = boundsOf(walk(shape.path));
  for (const gate of PORTALS) {
    const sb = boundsOf(walk(stubs[gate]));
    const overlaps = !(sb.maxX < cb.minX || sb.minX > cb.maxX || sb.maxY < cb.minY || sb.minY > cb.maxY);
    console.log(`  gate ${gate} stub vs removed ${name}: ${overlaps ? 'OVERLAPS' : 'clear'}`);
  }
}
