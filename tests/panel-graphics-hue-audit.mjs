// Hue and distinctness audit for the panel centre marks (issue #34, cut 5b).
//
// Why this exists: cut 5a darkened the centre marks toward the ink to clear 3:1.
// That trades hue fidelity for contrast, and "the hue is still recognisable" was
// checked by eye. This script makes the second half of that trade measurable.
//
// Two questions, two numbers:
//   1. Hue drift   - how far did the mark move away from the centre colour it is
//                    supposed to stand for? Measured in OKLCH hue degrees.
//                    Constraint: |drift| must stay UNDER the tolerance (the risk
//                    is drift, not sameness).
//   2. Separation  - are the nine marks still distinguishable from each other on
//                    the same screen? Measured as OKLab Euclidean distance x100
//                    between every pair. Constraint: the closest pair must stay
//                    ABOVE the floor.
//
// Colour space: OKLCH / OKLab (Ottosson 2020). Chosen over HSL because HSL's hue
// is not perceptually uniform - the same number of HSL degrees is a large visual
// jump in yellow and a small one in blue, which would make any threshold
// meaningless. OKLab is also what CSS `oklch()` and `color-mix(in oklch ...)` use,
// so the numbers here describe the same space the browser paints in.
//
//   node tests/panel-graphics-hue-audit.mjs [url] [--verbose]
import { chromium } from 'playwright-core';
import { SKINS } from '../src/lib/skin-registry.js';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const url = process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'http://127.0.0.1:5216/';
const verbose = process.argv.includes('--verbose');

const CENTRES = ['head', 'ajna', 'throat', 'g', 'heart', 'spleen', 'solar', 'sacral', 'root'];

// ------------------------------------------------------------------ thresholds
// Both numbers below are PROJECT thresholds, chosen here and waiting for
// validation against real thin-stroke samples. They are not WCAG, not
// CIEDE2000's guidance and not a published perceptual standard. OKLab/OKLCH is
// used because it is far better suited to this comparison than HSL (whose hue is
// not perceptually uniform) and because CSS Color 4 specifies both spaces - but
// the specification backs the colour space, not these two numbers.
const HUE_DRIFT_MAX = 12;      // degrees; "still the same colour family" budget
const RETENTION_MIN = Number(process.argv.find(arg => arg.startsWith('--retention='))?.slice(12) || 0.6);
// A pair whose palette colours are already this close has no separation to keep.
// 0.5 in OKLab dE x100 is well under any usable difference, so such a pair is
// recorded as exempt instead of being asked to retain a fraction of nothing.
const BASELINE_EQUAL_MAX = 0.5;
// Below this chroma the hue angle is numerically unstable and an angle-based
// verdict would be noise, so those centres are reported as not applicable.
const CHROMA_MIN = 0.01;

// ------------------------------------------------------------------ color math
const srgbToLinear = value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
function rgbToOklab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(value => srgbToLinear(value / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  ];
}
const oklabToOklch = ([L, a, b]) => {
  const C = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
};
const rgbToOklch = rgb => oklabToOklch(rgbToOklab(rgb));
const hueDelta = (a, b) => {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
};
// OKLab Euclidean distance, x100 so the numbers read like the familiar dE scale.
const deltaE = (first, second) => {
  const a = rgbToOklab(first), b = rgbToOklab(second);
  return Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 1000) / 10;
};

// ------------------------------------------------------------------ collect
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const rows = [];
const pairs = [];
for (const skin of SKINS) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(({ stored, key, skinId }) => {
    localStorage.setItem(key, JSON.stringify([stored]));
    localStorage.setItem('ohd-last-person-id', stored.id);
    localStorage.setItem('ohd-language', 'zh-CN');
    localStorage.setItem('td-ohd-appearance-v3', JSON.stringify({
      version: 3, skinMode: 'manual', skinId, centerPaletteMode: 'skin-default', overridesBySkin: {}, preferences: {}
    }));
  }, {
    key: PROFILE_STORAGE_KEY, skinId: skin.id,
    stored: { id: 'hue', name: 'H', birthDate: '1979-11-04', birthTime: '06:05',
      location: { name: 'London', iana: 'Europe/London', lat: 51.5072, lon: -0.1276, timezone: 0 } }
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.bg-svg-wrap svg', { timeout: 120000 });
  const resolved = await page.evaluate(centres => {
    // Resolve through a canvas: these tokens serialise as `color(srgb ...)`, and a
    // getComputedStyle regex would silently miss them.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const probe = document.createElement('span');
    probe.hidden = true;
    document.body.appendChild(probe);
    const read = token => {
      probe.style.color = '';
      probe.style.color = `var(${token})`;
      const css = getComputedStyle(probe).color;
      if (!css) return null;
      const sample = background => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      const overBlack = sample('#000');
      const overWhite = sample('#fff');
      const deltas = overWhite.map((value, index) => value - overBlack[index]);
      const alpha = 1 - deltas.reduce((sum, value) => sum + value, 0) / (3 * 255);
      if (alpha <= 0.002) return null;
      return overBlack.map(value => Math.min(255, Math.round(value / alpha)));
    };
    const out = {};
    for (const key of centres) out[key] = { centre: read(`--hd-center-${key}`), mark: read(`--pd-center-mark-${key}`) };
    probe.remove();
    return { out, theme: document.documentElement.dataset.theme, skin: document.documentElement.dataset.skin };
  }, CENTRES);
  await context.close();

  // Any unresolved token is a failure, never a silent skip.
  for (const key of CENTRES) {
    const pair = resolved.out[key];
    if (!pair?.centre || !pair?.mark) rows.push({ skin: skin.id, theme: resolved.theme, centre: key, error: 'unresolved token' });
  }
  const usable = CENTRES.filter(key => resolved.out[key]?.centre && resolved.out[key]?.mark);
  const marks = usable.map(key => ({ key, rgb: resolved.out[key].mark }));

  for (const key of usable) {
    const centre = rgbToOklch(resolved.out[key].centre);
    const mark = rgbToOklch(resolved.out[key].mark);
    // Near zero chroma the hue angle is noise; reporting a number there would be
    // inventing precision.
    const na = centre.C < CHROMA_MIN || mark.C < CHROMA_MIN;
    const drift = na ? null : Math.round(hueDelta(centre.h, mark.h) * 10) / 10;
    rows.push({
      skin: skin.id, theme: resolved.theme, centre: key,
      centreHue: Math.round(centre.h * 10) / 10, markHue: Math.round(mark.h * 10) / 10,
      drift, na,
      centreChroma: Math.round(centre.C * 1000) / 1000, markChroma: Math.round(mark.C * 1000) / 1000,
      driftPass: na ? true : drift <= HUE_DRIFT_MAX
    });
  }
  // 36 pairs, each judged against its own baseline. A single repeated palette
  // colour must not exempt the other pairs, which is what a "closest pair" test
  // did: one duplicate made the whole Skin pass.
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const a = usable[i], b = usable[j];
      const baseline = deltaE(resolved.out[a].centre, resolved.out[b].centre);
      const actual = deltaE(resolved.out[a].mark, resolved.out[b].mark);
      const exempt = baseline <= BASELINE_EQUAL_MAX;
      const retention = baseline > 0 ? Math.round((actual / baseline) * 100) / 100 : null;
      pairs.push({
        skin: skin.id, theme: resolved.theme, a, b, baseline, actual, retention,
        exempt,
        pass: exempt ? true : actual >= baseline * RETENTION_MIN
      });
    }
  }
}
await browser.close();

// ------------------------------------------------------------------ report
const driftRows = rows.filter(row => row.centre && !row.error);
const errorRows = rows.filter(row => row.error);
const judged = pairs.filter(pair => !pair.exempt);
const exemptPairs = pairs.filter(pair => pair.exempt);
const pairFails = judged.filter(pair => !pair.pass);
const driftFails = driftRows.filter(row => !row.driftPass);
const driftSkipped = driftRows.filter(row => row.na);

console.log(`skins ${new Set(rows.map(row => row.skin)).size} · centres ${CENTRES.length}`);
console.log(`hue drift <= ${HUE_DRIFT_MAX}° · pair retention >= ${Math.round(RETENTION_MIN * 100)}% of the palette pair · baseline-equal <= ${BASELINE_EQUAL_MAX}\n`);

const skinsSeen = [...new Set(rows.map(row => row.skin))];
for (const skin of skinsSeen) {
  const drifts = driftRows.filter(row => row.skin === skin);
  const worst = drifts.reduce((acc, row) => (!acc || row.drift > acc.drift ? row : acc), null);
  const skinPairs = judged.filter(pair => pair.skin === skin);
  const worstPair = skinPairs.reduce((acc, pair) => (!acc || pair.retention < acc.retention ? pair : acc), null);
  const driftFlag = worst.drift > HUE_DRIFT_MAX ? 'FAIL' : ' ok ';
  const pairFlag = skinPairs.some(pair => !pair.pass) ? 'FAIL' : ' ok ';
  console.log(`drift ${driftFlag} ${skin.padEnd(19)} worst ${String(worst.drift).padStart(5)}° (${worst.centre})`);
  if (worstPair) console.log(`pairs ${pairFlag} ${skin.padEnd(19)} worst retention ${String(Math.round(worstPair.retention * 100)).padStart(4)}% (${worstPair.a}/${worstPair.b}) · ${skinPairs.filter(pair => !pair.pass).length} failing of ${skinPairs.length}`);
}

console.log(`\n36-pair accounting: ${pairs.length} pairs total = ${exemptPairs.length} exempt (palette already identical) + ${judged.length} judged`);
console.log(`exempt pairs: ${[...new Set(exemptPairs.map(pair => `${pair.a}/${pair.b} (dE ${pair.baseline})`))].join(', ') || 'none'}`);

if (driftFails.length) {
  console.log(`\nhue drift above ${HUE_DRIFT_MAX}° (${driftFails.length}):`);
  for (const row of driftFails) console.log(`  ${row.skin.padEnd(19)} ${row.centre.padEnd(7)} ${row.centreHue}° -> ${row.markHue}° = ${row.drift}°`);
}
if (driftSkipped.length) {
  console.log(`\nhue not applicable, chroma below ${CHROMA_MIN} (${driftSkipped.length}):`);
  for (const row of driftSkipped) console.log(`  ${row.skin.padEnd(19)} ${row.centre.padEnd(7)} chroma ${row.centreChroma}/${row.markChroma}`);
}
if (pairFails.length) {
  console.log(`\npairs below retention (${pairFails.length}):`);
  for (const pair of pairFails) console.log(`  ${pair.skin.padEnd(19)} ${pair.a}/${pair.b}: palette ${pair.baseline} -> marks ${pair.actual} = ${Math.round(pair.retention * 100)}%`);
}
if (errorRows.length) {
  console.log(`\nunresolved tokens (${errorRows.length}):`);
  for (const row of errorRows) console.log(`  ${row.skin.padEnd(19)} ${row.centre}: ${row.error}`);
}

// Coverage is asserted, not assumed: 9 centres per Skin must be measured, and a
// token that would not resolve is a failure rather than a quiet omission.
const expectedDrift = skinsSeen.length * CENTRES.length;
const coverageOk = driftRows.length === expectedDrift && errorRows.length === 0;
console.log(`\ncoverage: ${driftRows.length} / ${expectedDrift} drift measurements${coverageOk ? '' : ' — INCOMPLETE'}`);
process.exit(driftFails.length || pairFails.length || errorRows.length || !coverageOk ? 1 : 0);
