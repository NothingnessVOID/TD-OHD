/**
 * Rave Mandala wheel renderer — a faithful port of the official
 * hd-mandala component (myBodyGraph app bundle), driven by our own chart
 * contract instead of the official API response.
 *
 * Input: the presentation chart object (chart.gates.{personality,design},
 * chart.positions.{personality,design}). Output: an SVG string containing the
 * wheel rings only — gate wedges, gate numbers, planet glyphs, zodiac bands
 * and the 64-hexagram ring, all at the official geometry. The centre is left
 * as a transparent slot (r < 480) so the caller can drop the app's own
 * bodygraph SVG in, exactly like the official mandala does.
 *
 * All geometry, gradients, symbols and colours come from the extracted
 * official assets in ./mandala-data.js — nothing here is hand-approximated.
 */
import { WHEEL, HEXAGRAMS, ZODIAC_NAMES, PLANET_GLYPHS, ZODIAC_GLYPHS, GEO, rim } from './mandala-data.js';

// Engine body order — identical to the official planet ids 0..12.
const BODY_ORDER = ['sun', 'earth', 'moon', 'northNode', 'southNode', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

const ZODIAC_ARC_START = id => (id * 30 + 60) % 360; // official: Gemini 60-90, Cancer 90-120, …

function inner(svgStr) {
  return svgStr.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

/**
 * Project our chart contract onto the official activation shape.
 * @returns {{ planets: Array, gateActs: Object, definedZodiacs: Set<number>, zodHasPlanet: Set<number> }}
 */
export function mandalaActivations(chart) {
  const planets = [];
  const sides = [['personality', 1], ['design', 0]]; // official: activation 1 = personality, 0 = design
  for (const [side, activation] of sides) {
    BODY_ORDER.forEach((body, id) => {
      const a = chart?.gates?.[side]?.[body];
      if (!a || !Number.isInteger(a.gate)) return;
      const longitude = chart?.positions?.[side]?.[body]?.longitude;
      planets.push({ id, gate: a.gate, line: a.line, activation, chartId: 0, longitude: Number.isFinite(longitude) ? longitude : null });
    });
  }
  // group per gate, ordered by longitude (official sorts slot order by longitude)
  const gateActs = {};
  for (const p of planets) (gateActs[p.gate] = gateActs[p.gate] || []).push(p);
  for (const list of Object.values(gateActs)) {
    list.sort((a, b) => (a.longitude ?? 0) - (b.longitude ?? 0));
  }
  // zodiacs that contain at least one activated gate (official getDefinedZodiacs)
  const definedZodiacs = new Set();
  WHEEL.forEach(([id, zodiac]) => {
    if (gateActs[id]) definedZodiacs.add(zodiac === null ? 11 : zodiac); // gate 27 sits on the Pisces/Taurus seam; official table puts it in Taurus
  });
  // zodiacs carrying a planet longitude (official getCssClassesForZodiac → defined)
  const zodHasPlanet = new Set();
  for (const p of planets) {
    if (p.longitude == null) continue;
    const lon = ((p.longitude % 360) + 360) % 360;
    for (let i = 0; i < 12; i++) {
      const s = ZODIAC_ARC_START(i);
      const inArc = lon >= s && lon < s + 30 ? true : (s + 30 > 360 && lon < (s + 30) % 360);
      if (inArc) zodHasPlanet.add(i);
    }
  }
  return { planets, gateActs, definedZodiacs, zodHasPlanet };
}

const GRADIENTS = `
<radialGradient id="md-bg" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f5f5f5" stop-opacity="0.7"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<radialGradient id="md-gate-red" gradientUnits="userSpaceOnUse"><stop offset=".1" stop-color="#D04A49" stop-opacity="0"/><stop offset=".3" stop-color="#D04A49" stop-opacity="0"/><stop offset=".5" stop-color="#D04A49" stop-opacity=".4"/><stop offset=".653" stop-color="#D04A49" stop-opacity="0"/><stop offset=".749" stop-color="#D04A49" stop-opacity="0"/><stop offset=".749" stop-color="#D04A49" stop-opacity="1"/><stop offset=".82" stop-color="#D04A49" stop-opacity="1"/><stop offset=".82" stop-color="#D04A49" stop-opacity="0"/></radialGradient>
<radialGradient id="md-gate-brown" gradientUnits="userSpaceOnUse"><stop offset=".1" stop-color="#57423E" stop-opacity="0"/><stop offset=".3" stop-color="#57423E" stop-opacity="0"/><stop offset=".5" stop-color="#57423E" stop-opacity=".4"/><stop offset=".653" stop-color="#57423E" stop-opacity="0"/><stop offset=".749" stop-color="#57423E" stop-opacity="0"/><stop offset=".749" stop-color="#57423E" stop-opacity="1"/><stop offset=".82" stop-color="#57423E" stop-opacity="1"/><stop offset=".82" stop-color="#57423E" stop-opacity="0"/></radialGradient>
<radialGradient id="md-gate-yellow" gradientUnits="userSpaceOnUse"><stop offset=".1" stop-color="#FBF7AD" stop-opacity="0"/><stop offset=".3" stop-color="#FBF7AD" stop-opacity="0"/><stop offset=".5" stop-color="#FBF7AD" stop-opacity=".4"/><stop offset=".653" stop-color="#FBF7AD" stop-opacity="0"/><stop offset=".749" stop-color="#FBF7AD" stop-opacity="0"/><stop offset=".749" stop-color="#FBF7AD" stop-opacity="1"/><stop offset=".82" stop-color="#FBF7AD" stop-opacity="1"/><stop offset=".82" stop-color="#FBF7AD" stop-opacity="0"/></radialGradient>
<radialGradient id="md-gate-green" gradientUnits="userSpaceOnUse"><stop offset=".1" stop-color="#669A8D" stop-opacity="0"/><stop offset=".3" stop-color="#669A8D" stop-opacity="0"/><stop offset=".5" stop-color="#669A8D" stop-opacity=".4"/><stop offset=".653" stop-color="#669A8D" stop-opacity="0"/><stop offset=".749" stop-color="#669A8D" stop-opacity="0"/><stop offset=".749" stop-color="#669A8D" stop-opacity="1"/><stop offset=".82" stop-color="#669A8D" stop-opacity="1"/><stop offset=".82" stop-color="#669A8D" stop-opacity="0"/></radialGradient>`;

const CSS = `
.md-root .md-gates .num { stroke:none; font-size:34px; font-family:Roboto,sans-serif; text-anchor:middle; alignment-baseline:central; pointer-events:none; opacity:.4; fill:#000; }
.md-root .md-gates .num.defined { font-size:38px; font-weight:700; opacity:1; }
.md-root .md-gates .num.b.defined { fill:#fff; }
.md-root .md-gates .radial { stroke:none; }
.md-root .md-gates .radial .defined.y { fill:url(#md-gate-yellow); }
.md-root .md-gates .radial .defined.g { fill:url(#md-gate-green); }
.md-root .md-gates .radial .defined.b { fill:url(#md-gate-brown); }
.md-root .md-gates .radial .defined.r { fill:url(#md-gate-red); }
.md-root .md-gates .planets .act_0 { fill:red; stroke:red; }
.md-root .md-gates .planets .act_1 { fill:#000; stroke:#000; }
.md-root .md-zodiacs { fill:#f2f2f2; color:#fefefe; stroke:silver; pointer-events:none; }
.md-root .md-zodiacs .defined { fill:#e9eced; }
.md-root .md-zodiacs .Aries.defined, .md-root .md-zodiacs .Leo.defined, .md-root .md-zodiacs .Sagittarius.defined { fill:#f8e0be; }
.md-root .md-zodiacs .Capricorn.defined, .md-root .md-zodiacs .Taurus.defined, .md-root .md-zodiacs .Virgo.defined { fill:#e8dac8; }
.md-root .md-zodiacs .Aquarius.defined, .md-root .md-zodiacs .Gemini.defined, .md-root .md-zodiacs .Libra.defined { fill:#d5e8c8; }
.md-root .md-zodiacs .Cancer.defined, .md-root .md-zodiacs .Pisces.defined, .md-root .md-zodiacs .Scorpio.defined { fill:#c8e1e8; }
.md-root .md-zodiacs .symbol { fill:#000; stroke:#000; stroke-width:13; opacity:.5; }
.md-root .md-zodiacs .defined .symbol { fill:#303030; opacity:1; }
.md-root .md-zodiacs .ticks { stroke-width:1; }
.md-root .md-hexagrams { fill:#000; pointer-events:none; }
.md-root .md-hexagrams .defined { opacity:1; }
.md-root .md-hexagrams .undefined { opacity:.2; }
.md-root .md-circles, .md-root .md-gates, .md-root .md-lines { stroke:#dcdcdc; }
.md-root .md-lines line { stroke:#dcdcdc; stroke-width:1; }
[data-theme="dark"] .md-root .md-gates .num { fill:#e8e4de; }
[data-theme="dark"] .md-root .md-gates .num.b.defined { fill:#fff; }
[data-theme="dark"] .md-root .md-hexagrams { fill:#fff; }
[data-theme="dark"] .md-root .md-circles, [data-theme="dark"] .md-root .md-gates, [data-theme="dark"] .md-root .md-lines { stroke:#4a4a4a; }
[data-theme="dark"] .md-root .md-lines line { stroke:#4a4a4a; }
[data-theme="dark"] .md-root .md-zodiacs { fill:#161515; stroke:#595959; color:#161515; }
[data-theme="dark"] .md-root .md-zodiacs .symbol { stroke:#fff; }
[data-theme="dark"] .md-root .md-zodiacs .defined { stroke:#595959; }
[data-theme="dark"] .md-root .md-zodiacs .Aries.defined, [data-theme="dark"] .md-root .md-zodiacs .Leo.defined, [data-theme="dark"] .md-root .md-zodiacs .Sagittarius.defined { fill:#53432d; }
[data-theme="dark"] .md-root .md-zodiacs .Capricorn.defined, [data-theme="dark"] .md-root .md-zodiacs .Taurus.defined, [data-theme="dark"] .md-root .md-zodiacs .Virgo.defined { fill:#42322f; }
[data-theme="dark"] .md-root .md-zodiacs .Aquarius.defined, [data-theme="dark"] .md-root .md-zodiacs .Gemini.defined, [data-theme="dark"] .md-root .md-zodiacs .Libra.defined { fill:#3d4d33; }
[data-theme="dark"] .md-root .md-zodiacs .Cancer.defined, [data-theme="dark"] .md-root .md-zodiacs .Pisces.defined, [data-theme="dark"] .md-root .md-zodiacs .Scorpio.defined { fill:#34464b; }
[data-theme="dark"] .md-root .md-gates .planets .act_1 { fill:#fff; stroke:#fff; }
`;

/**
 * Render the wheel rings as a standalone SVG string.
 * The centre (r < 480) stays empty for the caller's bodygraph.
 */
export function renderMandalaRings(chart) {
  const { gateActs, definedZodiacs, zodHasPlanet } = mandalaActivations(chart);
  const P = [];
  P.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 2000 2000" class="md-root">`);
  P.push(`<style>${CSS}</style>`);
  P.push(`<defs>${GRADIENTS}`);
  P.push(`<symbol id="md-gate"><path d="M1000,1000h953c0-32-2-63-5-93L1000,1000z"/></symbol>`);
  P.push(`<symbol id="md-zodiac"><path d="M1345.403,1555.453l38.029,61.156c107.841-67.202,196.761-161.912,256.964-274.31l-63.516-33.95C1522.648,1409.6,1442.549,1494.916,1345.403,1555.453z"/></symbol>`);
  P.push(`<symbol id="md-zodiacTick"><g>${[0, 1, 2].map(k => `<line x1="1000" y1="1669.066" x2="1000" y2="1654.002" transform="rotate(${-1.875 * k}, 1000, 1000)"/>`).join('')}</g></symbol>`);
  ZODIAC_GLYPHS.forEach((svgStr, i) => {
    P.push(`<symbol id="md-zodiac-sym-${i}" viewBox="0 0 511.713 432.621" preserveAspectRatio="xMinYMid">${inner(svgStr)}</symbol>`);
  });
  PLANET_GLYPHS.forEach((svgStr, i) => {
    P.push(`<symbol id="md-planet-${i}" viewBox="0 0 612 612" preserveAspectRatio="xMinYMid">${inner(svgStr)}</symbol>`);
  });
  P.push(`</defs>`);

  P.push(`<circle cx="1000" cy="1000" r="1000" fill="url(#md-bg)"/>`);

  // 64 full-diameter guide lines (official #lines)
  P.push(`<g class="md-lines" fill="none">${Array.from({ length: 64 }, (_, k) => `<line x1="1000" y1="136" x2="1000" y2="1864" transform="rotate(${5.625 * k}, 1000, 1000)"/>`).join('')}</g>`);

  // gate wedges + numbers + planet glyphs
  let g = `<g class="md-gates"><g class="radial">`;
  for (let idx = 0; idx < 64; idx++) {
    const [id, , color] = WHEEL[idx];
    if (gateActs[id]) g += `<use xlink:href="#md-gate" class="g${id} ${color} defined" transform="rotate(${5.625 * idx}, 1000, 1000)"/>`;
  }
  g += `</g>`;
  for (let idx = 0; idx < 64; idx++) {
    const [id, , color] = WHEEL[idx];
    const defined = Boolean(gateActs[id]);
    g += `<text class="num${defined ? ' defined' : ''} ${color}" transform="translate(${rim(GEO.gates.center, GEO.gates.radius, idx)})">${id}</text>`;
  }
  for (let idx = 0; idx < 64; idx++) {
    const [id] = WHEEL[idx];
    const acts = gateActs[id];
    if (!acts) continue;
    g += `<g class="planets gs_${id}">`;
    acts.forEach((p, slot) => {
      const pos = rim(GEO.planets.center, GEO.planets.radius[Math.min(slot, 5)], idx);
      const w = 30 - 3 * slot;
      g += `<use class="ch_${p.chartId} act_${p.activation}" xlink:href="#md-planet-${p.id}" transform="translate(${pos})" width="${w}" height="${w}" x="${-w / 2}" y="${-w / 2}"/>`;
    });
    g += `</g>`;
  }
  g += `</g>`;
  P.push(g);

  // zodiac bands
  let z = `<g class="md-zodiacs">`;
  for (let i = 0; i < 12; i++) {
    if (!definedZodiacs.has(i)) continue;
    const defined = zodHasPlanet.has(i);
    z += `<g class="${ZODIAC_NAMES[i]} orange${defined ? ' defined' : ''}">`;
    z += `<use xlink:href="#md-zodiac" transform="rotate(${GEO.zodiacWedgeRotate(i)}, 1000, 1000)"/>`;
    z += `<use class="symbol" xlink:href="#md-zodiac-sym-${i}" x="970" y="290" height="40" transform="rotate(${GEO.zodiacSymbolRotate(i)}, 1000, 1000)"/>`;
    z += `</g>`;
  }
  z += `<g class="ticks">${Array.from({ length: 64 }, (_, k) => `<use xlink:href="#md-zodiacTick" transform="rotate(${5.625 * k}, 1000, 1000)"/>`).join('')}</g>`;
  z += `</g>`;
  P.push(z);

  // hexagram ring — official anchors, index used directly
  let h = `<g class="md-hexagrams">`;
  for (const hx of HEXAGRAMS) {
    const pos = rim(GEO.hexagrams.center, GEO.hexagrams.radius, hx.i);
    const defined = Boolean(gateActs[hx.g]);
    const rects = arr => arr.map(r => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}"/>`).join('');
    h += `<g class="g${hx.g} ${defined ? 'defined' : 'undefined'}" transform="translate(${pos})"><g>${rects(hx.a)}</g><g>${rects(hx.b)}</g></g>`;
  }
  h += `</g>`;
  P.push(h);

  P.push(`<g class="md-circles" fill="none"><circle cx="1000" cy="1000" r="749"/><circle cx="1000" cy="1000" r="819"/><circle cx="1000" cy="1000" r="840"/></g>`);
  P.push(`</svg>`);
  return P.join('');
}
