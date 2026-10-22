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
// HUE_DRIFT_MAX: a project threshold, not a standard. The question it answers is
// "would a reader still call this the same colour family as the centre colour".
// 12 degrees is roughly the width of one hue-name boundary in the classic
// Berlin & Kay basic-colour categories for the non-primary regions, and it is
// deliberately looser than a just-noticeable hue shift (~2-4 degrees in OKLCH for
// saturated colours), because the mark is a 1.5px stroke rather than a large fill
// and is always printed next to the centre name.
const HUE_DRIFT_MAX = 12;
// SEPARATION_MIN: a project threshold, OKLab dE x100. 2 is about the
// just-noticeable level for OKLab, so 10 is five times that.
//
// BUT the absolute floor turned out to be the wrong test: several Center Palettes
// deliberately repeat a colour for different centres (classic paints Head and G
// both #E2C754, and Throat/Spleen/Solar/Root all #CA9963), so a nine-way
// separation demand asks the panel to fix something the graphic itself does not
// have. The check therefore runs against the palette's own separation: the marks
// must not collapse two centres that the palette kept apart. A pair the palette
// never separated is reported, not failed.
const SEPARATION_MIN = 10;
// RETENTION_MIN: how much of the palette's own separation the marks must keep.
// Mixing every colour with the same ink pulls them all toward that ink, so some
// convergence is unavoidable; 60% is the point where the ordering of "these two
// look closer than those two" is still preserved.
const RETENTION_MIN = Number(process.argv.find(arg => arg.startsWith('--retention='))?.slice(12) || 0.6);

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
    rows.push({
      skin: skin.id, theme: resolved.theme, centre: key,
      centreHue: Math.round(centre.h * 10) / 10, markHue: Math.round(mark.h * 10) / 10,
      drift: Math.round(hueDelta(centre.h, mark.h) * 10) / 10,
      centreChroma: Math.round(centre.C * 1000) / 1000, markChroma: Math.round(mark.C * 1000) / 1000,
      driftPass: hueDelta(centre.h, mark.h) <= HUE_DRIFT_MAX
    });
  }
  // Closest pair among this Skin's marks on one screen, and the same pair in the
  // untouched palette, so convergence can be measured instead of assumed.
  const centres = usable.map(key => ({ key, rgb: resolved.out[key].centre }));
  const closestOf = list => {
    let best = null;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const distance = deltaE(list[i].rgb, list[j].rgb);
        if (!best || distance < best.distance) best = { a: list[i].key, b: list[j].key, distance };
      }
    }
    return best;
  };
  const markClosest = closestOf(marks);
  const paletteClosest = closestOf(centres);
  const paletteDistinct = paletteClosest.distance >= SEPARATION_MIN;
  rows.push({
    skin: skin.id, theme: resolved.theme,
    separation: {
      ...markClosest,
      paletteDistance: paletteClosest.distance,
      palettePair: `${paletteClosest.a}/${paletteClosest.b}`,
      retention: paletteClosest.distance > 0 ? Math.round((markClosest.distance / paletteClosest.distance) * 100) / 100 : null,
      // A pair the palette never separated is not the panel's to fix.
      pass: paletteClosest.distance < SEPARATION_MIN ? true : markClosest.distance >= SEPARATION_MIN * RETENTION_MIN
    }
  });
}
await browser.close();

// ------------------------------------------------------------------ report
const driftRows = rows.filter(row => row.centre && !row.error);
const sepRows = rows.filter(row => row.separation);
const driftFails = driftRows.filter(row => !row.driftPass);
const sepFails = sepRows.filter(row => !row.separation.pass);

console.log(`skins ${sepRows.length} · centres ${CENTRES.length} · drift measurements ${driftRows.length}`);
console.log(`thresholds: hue drift <= ${HUE_DRIFT_MAX} deg, pairwise OKLab dE x100 >= ${SEPARATION_MIN}\n`);

for (const row of sepRows) {
  const drifts = driftRows.filter(item => item.skin === row.skin);
  const worst = drifts.reduce((acc, item) => (!acc || item.drift > acc.drift ? item : acc), null);
  const closest = row.separation;
  const flag = worst.drift > HUE_DRIFT_MAX || !closest.pass ? 'FAIL' : ' ok ';
  const baseline = closest.paletteDistance < SEPARATION_MIN ? 'palette never separated' : `retains ${Math.round(closest.retention * 100)}%`;
  console.log(`${flag} ${row.skin.padEnd(19)} ${row.theme.padEnd(5)} drift ${String(worst.drift).padStart(5)}° (${worst.centre}) · marks ${String(closest.distance).padStart(4)} vs palette ${String(closest.paletteDistance).padStart(4)} (${closest.palettePair}) — ${baseline}`);
}

if (driftFails.length) {
  console.log(`\nhue drift above ${HUE_DRIFT_MAX}° (${driftFails.length}):`);
  for (const row of driftFails) console.log(`  ${row.skin.padEnd(19)} ${row.centre.padEnd(7)} ${row.centreHue}° -> ${row.markHue}° = ${row.drift}°`);
}
if (sepFails.length) {
  console.log(`\nseparation lost beyond the floor (${sepFails.length}):`);
  for (const row of sepFails) console.log(`  ${row.skin.padEnd(19)} ${row.separation.a}/${row.separation.b} = ${row.separation.distance} (palette ${row.separation.paletteDistance})`);
}
if (verbose) {
  console.log('\nper-centre drift (--verbose):');
  for (const row of driftRows) {
    console.log(`  ${row.skin.padEnd(19)} ${row.centre.padEnd(7)} ${String(row.centreHue).padStart(6)}° -> ${String(row.markHue).padStart(6)}°  drift ${String(row.drift).padStart(5)}°  chroma ${row.centreChroma} -> ${row.markChroma}`);
  }
}
process.exit(driftFails.length || sepFails.length ? 1 : 0);
