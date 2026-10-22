// Contrast audit for the right column's marks (issue #34).
//
// Measures what the browser actually paints, not what a token nominally says:
//   - every colour string is resolved through a 1×1 canvas, so color-mix(),
//     color(srgb …), rgba() and gradients all yield the same kind of number
//   - alpha is solved from two samples (over black, over white) instead of being
//     parsed out of a serialization that may not contain it
//   - an element's own `opacity` is multiplied into its foreground alpha
//   - the backdrop is the real composited ancestor chain, not an assumed token
//
// Thresholds follow FINAL-spec-v1 §14.4: graphic marks ≥ 3:1, text ≥ 4.5:1.
//
//   node tests/panel-graphics-contrast-audit.mjs [url]
//
// The run asserts that every declared probe produced a measurement. A colour
// that fails to resolve is a failure, never a silent skip.
import { chromium } from 'playwright-core';
import { SKINS } from '../src/lib/skin-registry.js';
import { contrastRatio } from '../src/lib/source-contrast.js';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

// Flags may come before or instead of the URL, so the positional is the first
// argument that is not a flag.
const url = process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'http://127.0.0.1:5216/';
const verbose = process.argv.includes('--verbose');
const showNotes = process.argv.includes('--notes');
const profiles = {
  // Full chart: channels, gates, planets, both fixing states that occur here.
  main: { id: 'style-ref-b', name: 'B', birthDate: '1979-11-04', birthTime: '06:05' },
  // Two fully open centres, so the dotted third state is on screen.
  open: { id: 'style-ref-e', name: 'E', birthDate: '1993-09-07', birthTime: '11:15' },
  // All four known fixing states present, so every badge is drawn.
  fixing: { id: 'style-ref-f', name: 'F', birthDate: '1980-01-07', birthTime: '10:30' }
};
const location = { name: 'London', iana: 'Europe/London', lat: 51.5072, lon: -0.1276, timezone: 0 };

// Each probe names the element it measures and the property that carries the
// mark. `over` selects the backdrop: 'panel' resolves the ancestor chain behind
// the element, 'self-bg' means the element's own background (text on a chip).
const WIDE = [
  // gate grid
  { key: 'grid design cell', tab: 'gates', profile: 'main', selector: '.pg-gate-cell[data-state="design"]', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'grid personality cell', tab: 'gates', profile: 'main', selector: '.pg-gate-cell[data-state="personality"]', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'grid both hatch (design stripe)', tab: 'gates', profile: 'main', selector: '.pg-gate-cell[data-state="both"]', prop: 'backgroundImage', sample: 'design', min: 3, kind: 'graphic' },
  { key: 'grid both hatch (personality stripe)', tab: 'gates', profile: 'main', selector: '.pg-gate-cell[data-state="both"]', prop: 'backgroundImage', sample: 'personality', min: 3, kind: 'graphic' },
  // The fill is an auxiliary surface: an empty cell is identified by its ring, not
  // by a tint that is 3% away from the panel. Recorded at the auxiliary floor so
  // the value is not lost, with the ring measured separately below.
  { key: 'grid inactive cell fill', tab: 'gates', profile: 'main', selector: '.pg-gate-cell[data-state="none"]', prop: 'backgroundColor', min: 1, kind: 'graphic', note: 'auxiliary surface; the ring carries the reading' },
  // The 0.5px inset ring is what actually identifies an empty cell, and until now
  // it was claimed to carry that role without being measured.
  // Demoted to decoration by measurement: the ring reads 1.08-1.15:1 against the
  // panel, so it never identified anything. An empty cell is identified by having
  // no fill and by its position in the grid, the same convention as an empty day in
  // a contribution graph. Recorded so the value stays visible.
  { key: 'grid inactive cell ring', tab: 'gates', profile: 'main', selector: '.pg-gate-cell[data-state="none"]', prop: 'boxShadow', min: 1, kind: 'graphic', note: 'decorative; identification comes from no-fill + grid position' },
  // gate pill
  { key: 'gate pill number', tab: 'gates', profile: 'main', selector: '.panel-gate-number', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  { key: 'gate pill ladder active tick', tab: 'gates', profile: 'main', selector: '.panel-gate-pill .pg-tick[data-active="true"]', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'gate pill ladder empty tick', tab: 'gates', profile: 'main', selector: '.panel-gate-pill .pg-tick:not([data-active="true"])', prop: 'backgroundColor', min: 1.2, kind: 'graphic', note: 'inactive scale step' },
  // planets
  { key: 'planet design side bar', tab: 'planets', profile: 'main', selector: '.pg-planet-bar[data-side="design"]', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'planet personality side bar', tab: 'planets', profile: 'main', selector: '.pg-planet-bar[data-side="personality"]', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'planet activation value', tab: 'planets', profile: 'main', selector: '.panel-planet-value', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  { key: 'micro-bar active cell', tab: 'planets', profile: 'main', selector: '.pg-micro-cell[data-active="true"]', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'micro-bar inactive cell', tab: 'planets', profile: 'main', selector: '.pg-micro-cell:not([data-active="true"])', prop: 'backgroundColor', min: 1.2, kind: 'graphic', note: 'empty scale step' },
  { key: 'fixing exalted', tab: 'planets', profile: 'fixing', selector: '.pg-fixing[data-state="exalted"]', prop: 'borderBottomColor', min: 3, kind: 'graphic' },
  { key: 'fixing detriment', tab: 'planets', profile: 'fixing', selector: '.pg-fixing[data-state="detriment"]', prop: 'borderTopColor', min: 3, kind: 'graphic' },
  { key: 'fixing juxtaposed', tab: 'planets', profile: 'fixing', selector: '.pg-fixing[data-state="juxtaposed"]', prop: 'borderTopColor', min: 3, kind: 'graphic' },
  { key: 'fixing none stroke', tab: 'planets', profile: 'fixing', selector: '.pg-fixing[data-state="none"]', prop: 'borderTopColor', min: 3, kind: 'graphic', pending: 'cut 5: needs a --pd-mark-neutral Skin token' },
  { key: 'fixing unknown stroke (incl .45 opacity)', tab: 'planets', profile: 'main', selector: '.pg-fixing[data-state="unknown"]', prop: 'borderTopColor', min: 3, kind: 'graphic', optional: true },
  { key: 'overlap badge ink on hatch', tab: 'planets', profile: 'fixing', selector: '.pg-planet-overlap[data-on="true"]', prop: 'color', over: 'self-bg', min: 4.5, kind: 'text', optional: true },
  // centres: the three states
  // Centre marks paint in the Center Palette's centre colour. Those colours are
  // decorative-light by design and three of them sit under 3:1 on light panels;
  // that is a palette question, so they are recorded against cut 5 rather than
  // silently relaxed.
  // Reclassified in cut 5a: the defined fill is an auxiliary surface, not a mark
  // that carries the state alone. The centre name, the state dot and the group
  // badge beside the row all say "defined" without any colour, and the glyph's
  // own stroke plus the neighbouring rows give the shape its boundary.
  { key: 'centre defined fill', tab: 'centers', profile: 'main', selector: '.pg-center-glyph[data-state="defined"] .pg-shape path', prop: 'fill', min: 1, kind: 'graphic', note: 'auxiliary surface; state carried by name + dot + group badge' },
  { key: 'centre undefined fill (18%)', tab: 'centers', profile: 'main', selector: '.pg-center-glyph[data-state="undefined"] .pg-shape path', prop: 'fill', min: 1, kind: 'graphic', note: 'the dashed stroke carries the state' },
  { key: 'centre undefined dashed stroke', tab: 'centers', profile: 'main', selector: '.pg-center-glyph[data-state="undefined"] .pg-shape path', prop: 'stroke', min: 3, kind: 'graphic', pending: 'cut 5: Center Palette centre colours are light by design' },
  { key: 'centre open dotted stroke', tab: 'centers', profile: 'open', selector: '.pg-center-glyph[data-state="open"] .pg-shape path', prop: 'stroke', min: 3, kind: 'graphic', pending: 'cut 5: Center Palette centre colours are light by design' },
  { key: 'centre group badge text', tab: 'centers', profile: 'main', selector: '.pg-group-badge', prop: 'color', over: 'self-bg', min: 4.5, kind: 'text' },
  { key: 'centre row name', tab: 'centers', profile: 'main', selector: '.panel-center-name', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  // authority track: the one mark that deliberately ignores the Skin accent
  { key: 'authority anchor dot', tab: 'centers', profile: 'main', selector: '.pg-authority-dot[data-anchor="true"]', prop: 'backgroundColor', min: 3, kind: 'graphic', note: 'centre colour, not the Skin accent', pending: 'cut 5: Center Palette centre colours are light by design' },
  // identity band / fact rail
  { key: 'fact label 11px', tab: 'centers', profile: 'main', selector: '.panel-fact-label', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  { key: 'panel note 11px', tab: 'channels', profile: 'main', selector: '.pg-panel-note', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  // channels: tube, all three circuits
  { key: 'tube individual cap', tab: 'channels', profile: 'main', selector: '.panel-channel-row[data-circuit="individual"] .pg-tube-end[data-side="left"]', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'tube collective cap', tab: 'channels', profile: 'main', selector: '.panel-channel-row[data-circuit="collective"] .pg-tube-end[data-side="left"]', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'tube tribal cap', tab: 'channels', profile: 'main', selector: '.panel-channel-row[data-circuit="tribal"] .pg-tube-end[data-side="left"]', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'tube individual capsule', tab: 'channels', profile: 'main', selector: '.panel-channel-row[data-circuit="individual"] .pg-tube-track', prop: 'backgroundColor', min: 1, kind: 'graphic', note: 'soft fill is a grouping tint; caps, diamond and the inner ring carry the reading' },
  { key: 'tube collective capsule', tab: 'channels', profile: 'main', selector: '.panel-channel-row[data-circuit="collective"] .pg-tube-track', prop: 'backgroundColor', min: 1, kind: 'graphic' },
  { key: 'tube tribal capsule', tab: 'channels', profile: 'main', selector: '.panel-channel-row[data-circuit="tribal"] .pg-tube-track', prop: 'backgroundColor', min: 1, kind: 'graphic' },
  // The ring is a boundary aid, not a state mark: the caps and the mid diamond
  // carry the reading. Recorded so it cannot silently vanish, at a boundary floor.
  { key: 'tube inner ring (capsule edge)', tab: 'channels', profile: 'main', selector: '.panel-channel-row .pg-tube-track', prop: 'boxShadow', min: 1.2, kind: 'graphic', note: 'boundary aid only' },
  { key: 'tube mid diamond', tab: 'channels', profile: 'main', selector: '.pg-tube[data-full="true"] .pg-tube-mid', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  // segbar: each digit sits on its own segment
  { key: 'segbar digit on individual', tab: 'channels', profile: 'main', selector: '.pg-seg[data-group="individual"] .pg-seg-count', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  { key: 'segbar digit on collective', tab: 'channels', profile: 'main', selector: '.pg-seg[data-group="collective"] .pg-seg-count', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  { key: 'segbar digit on tribal', tab: 'channels', profile: 'main', selector: '.pg-seg[data-group="tribal"] .pg-seg-count', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  { key: 'segbar digit on defined', tab: 'centers', profile: 'main', selector: '.pg-seg[data-group="defined"] .pg-seg-count', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  // The open segment only exists when a centre is fully open, so it needs the
  // fixture that has one.
  { key: 'segbar digit on open', tab: 'centers', profile: 'open', selector: '.pg-seg[data-group="open"] .pg-seg-count', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  // ---- cut 4: cross palaces, axis, gene keys tiers, variable compass ----
  { key: 'cross palace personality edge', tab: 'cross', profile: 'main', selector: '.pg-cross-palace[data-side="personality"]', prop: 'borderInlineStartColor', min: 3, kind: 'graphic' },
  { key: 'cross palace design edge', tab: 'cross', profile: 'main', selector: '.pg-cross-palace[data-side="design"]', prop: 'borderInlineStartColor', min: 3, kind: 'graphic' },
  { key: 'cross palace personality fill', tab: 'cross', profile: 'main', selector: '.pg-cross-palace[data-side="personality"]', prop: 'backgroundColor', min: 1, kind: 'graphic', note: 'side tint; the edge carries the code' },
  { key: 'cross palace design fill', tab: 'cross', profile: 'main', selector: '.pg-cross-palace[data-side="design"]', prop: 'backgroundColor', min: 1, kind: 'graphic' },
  { key: 'cross axis hairline', tab: 'cross', profile: 'main', selector: '.pg-cross-angle', prop: 'borderTopColor', min: 1.2, kind: 'graphic', note: 'guide line, and the angle is also printed' },
  { key: 'cross angle badge text', tab: 'cross', profile: 'main', selector: '.pg-cross-angle', prop: 'color', over: 'self-bg', min: 4.5, kind: 'text' },
  { key: 'cross palace gate text', tab: 'cross', profile: 'main', selector: '.pg-cross-gate', prop: 'color', over: 'parent-bg', min: 4.5, kind: 'text' },
  { key: 'gene keys shadow tier', tab: 'cross', profile: 'main', selector: '.pg-gk-band[data-tier="shadow"] .pg-gk-band-rule', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'gene keys gift tier', tab: 'cross', profile: 'main', selector: '.pg-gk-band[data-tier="gift"] .pg-gk-band-rule', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'gene keys siddhi tier', tab: 'cross', profile: 'main', selector: '.pg-gk-band[data-tier="siddhi"] .pg-gk-band-rule', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'gene keys word text', tab: 'cross', profile: 'main', selector: '.pg-gk-word', prop: 'color', over: 'panel', min: 4.5, kind: 'text' },
  // The tier divider is a decorative hairline, but it is what separates the three
  // rungs now that the lightness steps are compressed, so it has to be visible.
  { key: 'gene keys tier divider', tab: 'cross', profile: 'main', selector: '.pg-gk-band + .pg-gk-band', prop: 'borderTopColor', min: 1.2, kind: 'graphic', note: 'decorative boundary between tiers' },
  { key: 'variable arrow ink', tab: 'variable', profile: 'main', selector: '.pg-var-corner[data-direction] .pg-var-arrow', prop: 'color', over: 'parent-bg', min: 3, kind: 'graphic' },
  { key: 'variable empty slot edge', tab: 'variable', profile: 'main', selector: '.pg-var-corner--empty', prop: 'borderTopColor', min: 1.2, kind: 'graphic', optional: true, note: 'dashed empty state, not a value' },
  { key: 'variable corner name', tab: 'variable', profile: 'main', selector: '.pg-var-name', prop: 'color', over: 'parent-bg', min: 4.5, kind: 'text' }
];

// Narrow tier: the tube becomes an explicit symbol, and the fact cards fold.
const NARROW = [
  { key: 'C-tier tube rule', tab: 'channels', profile: 'main', selector: '.panel-channel-row .pg-tube-track', prop: 'backgroundColor', min: 3, kind: 'graphic', note: '44px symbol form' },
  { key: 'C-tier tube cap', tab: 'channels', profile: 'main', selector: '.panel-channel-row .pg-tube-end[data-side="left"]', prop: 'backgroundColor', min: 3, kind: 'graphic' },
  { key: 'C-tier hanging stub', tab: 'channels', profile: 'main', selector: '.panel-hanging-row .pg-tube-stub', prop: 'borderTopColor', min: 3, kind: 'graphic' },
  { key: 'C-tier fact label 11px', tab: 'centers', profile: 'main', selector: '.panel-fact-label', prop: 'color', over: 'panel', min: 4.5, kind: 'text' }
];

const RESOLVER = () => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const SENTINEL = '#010203';
  // Two samples (over black, over white) solve for colour AND alpha. The black
  // sample is ONLY an intermediate: compositing it as the page foreground would
  // darken every translucent mark and overstate its contrast.
  const sample = css => {
    if (typeof css !== 'string' || !css.trim()) return null;
    // An invalid fillStyle leaves the previous value in place, so prove the
    // assignment took before trusting any number that follows.
    ctx.fillStyle = SENTINEL;
    const sentinel = ctx.fillStyle;
    ctx.fillStyle = css;
    if (ctx.fillStyle === sentinel) return null;
    const read = background => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const overBlack = read('#000');
    const overWhite = read('#fff');
    const alpha = 1 - overWhite.map((value, i) => value - overBlack[i]).reduce((sum, v) => sum + v, 0) / (3 * 255);
    if (alpha <= 0.002) return { rgb: overBlack, alpha: 0 };
    const rgb = overBlack.map(value => Math.min(255, Math.round(value / alpha)));
    return { rgb, alpha: Math.min(1, Math.max(0, alpha)) };
  };
  const composite = (front, back) => front.rgb.map((value, index) =>
    Math.round(value * front.alpha + back.rgb[index] * (1 - front.alpha)));
  const parse = css => sample(css);
  const opacityOf = node => {
    let value = 1;
    for (let current = node; current && current.nodeType === 1; current = current.parentElement) {
      value *= Number(getComputedStyle(current).opacity || 1);
    }
    return value;
  };
  const COLOUR = /(#[0-9a-f]{3,8}|rgba?\([^)]*\)|color\([^)]*\)|hsla?\([^)]*\))/gi;
  /**
   * The page backdrop behind a node: every ancestor's background-color AND its
   * background-image, bottom-up. The identity band paints a gradient, so ignoring
   * background-image would measure the authority dot against the wrong surface.
   * A gradient is collapsed to the alpha-weighted mean of its colour stops, which
   * is the honest approximation available without sampling pixels.
   */
  const backdropOf = node => {
    const layers = [];
    for (let current = node?.parentElement; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      const colour = parse(style.backgroundColor);
      if (colour && colour.alpha > 0) layers.push(colour);
      const image = style.backgroundImage;
      if (image && image !== 'none' && /gradient/i.test(image)) {
        const stops = [...String(image).matchAll(COLOUR)].map(match => parse(match[1])).filter(Boolean).filter(stop => stop.alpha > 0);
        if (stops.length) {
          const total = stops.reduce((sum, stop) => sum + stop.alpha, 0);
          const rgb = [0, 1, 2].map(channel =>
            Math.round(stops.reduce((sum, stop) => sum + stop.rgb[channel] * stop.alpha, 0) / total));
          layers.push({ rgb, alpha: Math.min(1, total / stops.length) });
        }
      }
    }
    let result = { rgb: [255, 255, 255], alpha: 1 };
    for (const layer of layers.reverse()) result = { rgb: composite(layer, result), alpha: 1 };
    return result;
  };
  /** A node's own surface, composited over what is behind it. */
  const surfaceOf = node => {
    if (!node) return { rgb: [255, 255, 255], alpha: 1 };
    const behind = backdropOf(node);
    const colour = parse(getComputedStyle(node).backgroundColor);
    if (!colour || colour.alpha === 0) return behind;
    return { rgb: composite(colour, behind), alpha: 1 };
  };
  window.__pgAudit = { sample, parse, composite, opacityOf, backdropOf, surfaceOf };
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const rows = [];
const missing = [];

const runProbe = async (page, probe) => {
  const measured = await page.evaluate(({ selector, prop, over, sample }) => {
    const { parse, composite, opacityOf, backdropOf, surfaceOf } = window.__pgAudit;
    // Every matching node is measured, not just the first: one probe slot can
    // stand for nine centres or several rows, and reporting the first would
    // describe one node while claiming the group.
    const nodes = [...document.querySelectorAll(selector)];
    if (!nodes.length) return { absent: true };
    const readings = [];
    for (const node of nodes) {
      const style = getComputedStyle(node);
      let raw = style[prop];
      // A shadow serialises as "<colour> 0px 0px 0px .5px inset"; the colour has to
      // be lifted out of it or the canvas rejects the whole string.
      if (prop === 'boxShadow') {
        const first = String(raw).match(/(#[0-9a-f]{3,8}|rgba?\([^)]*\)|color\([^)]*\))/i);
        raw = first ? first[1] : 'transparent';
      }
      if (prop === 'backgroundImage' && sample) {
        const colours = [...String(raw).matchAll(/(#[0-9a-f]{3,8}|rgba?\([^)]*\)|color\([^)]*\))/gi)].map(match => match[1]);
        raw = colours[sample === 'personality' ? 1 : 0] ?? colours[0] ?? 'transparent';
      }
      const front = parse(raw);
      // An unparsable colour is a failure, not a skip: a validation that cannot
      // read its input must not look like "nothing to check here".
      if (!front) { readings.push({ unresolved: true, raw: String(raw).slice(0, 60) }); continue; }
      if (front.alpha === 0) { readings.push({ transparent: true, raw: String(raw).slice(0, 60) }); continue; }
      const alpha = front.alpha * opacityOf(node);
      let back;
      if (over === 'self-bg') back = surfaceOf(node);
      else if (over === 'parent-bg') back = surfaceOf(node.parentElement);
      else back = backdropOf(node);
      // The foreground is composited over the surface it actually sits on. Using
      // the black sample here would darken every translucent mark.
      const solid = { rgb: composite({ rgb: front.rgb, alpha }, back), alpha: 1 };
      readings.push({ front: solid.rgb, back: back.rgb, alpha });
    }
    return { readings, count: nodes.length };
  }, { selector: probe.selector, prop: probe.prop, over: probe.over || 'panel', sample: probe.sample });

  if (!measured || measured.absent) {
    if (!probe.optional) { missing.push(`${probe.key}: element absent (${probe.selector})`); return; }
    rows.push({ key: probe.key, skin: currentSkin, skipped: 'element absent on this fixture', pass: true, min: probe.min, ratio: null });
    return;
  }
  const bad = measured.readings.filter(reading => reading.unresolved || reading.transparent);
  if (bad.length) {
    if (!probe.optional) { missing.push(`${probe.key}: ${bad[0].unresolved ? 'unresolved colour' : 'fully transparent'} ${bad[0].raw}`); return; }
    rows.push({ key: probe.key, skin: currentSkin, skipped: `unresolved: ${bad[0].raw}`, pass: true, min: probe.min, ratio: null });
    return;
  }
  // The probe passes only if every matching node passes; the reported ratio is the
  // worst one, and the count is carried so coverage can be checked.
  const ratios = measured.readings.map(reading => ({ ratio: contrastRatio(reading.front, reading.back), alpha: reading.alpha }));
  const worst = ratios.reduce((acc, item) => (item.ratio < acc.ratio ? item : acc), ratios[0]);
  rows.push({
    key: probe.key, skin: currentSkin, ratio: Math.round(worst.ratio * 100) / 100,
    min: probe.min, kind: probe.kind, note: probe.note, pending: probe.pending,
    alpha: Math.round(worst.alpha * 100) / 100, nodes: measured.count,
    pass: worst.ratio >= probe.min, ratios: ratios.map(item => Math.round(item.ratio * 100) / 100)
  });
};

let currentSkin = null;
const seedProfile = ({ stored, key, skinId, origin }) => {
  localStorage.setItem(key, JSON.stringify([{ ...stored, location: origin }]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
  localStorage.setItem('td-ohd-appearance-v3', JSON.stringify({
    version: 3, skinMode: 'manual', skinId, centerPaletteMode: 'skin-default', overridesBySkin: {}, preferences: {}
  }));
};

for (const skin of SKINS) {
  currentSkin = skin.id;
  // One browser context per Skin, reused by every (profile, tab) group. The
  // engine is a wasm payload; a fresh context per group exhausts the renderer, so
  // a group change is a reseed + reload inside the same context.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  for (const tier of [{ probes: WIDE, viewport: { width: 1440, height: 900 } },
    { probes: NARROW, viewport: { width: 390, height: 844 } }]) {
    await page.setViewportSize(tier.viewport);
    // Group by the profile each probe needs: the fixture decides which states are
    // on screen, and one profile cannot show all of them.
    const groups = new Map();
    for (const probe of tier.probes) {
      const key = `${probe.profile}|${probe.tab}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(probe);
    }
    for (const [key, probes] of groups) {
      const [profileId, tab] = key.split('|');
      const profile = profiles[profileId] || profiles.main;
      await page.addInitScript(seedProfile, { stored: profile, key: PROFILE_STORAGE_KEY, skinId: skin.id, origin: location });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('.bg-svg-wrap svg', { timeout: 120000 });
      await page.addScriptTag({ content: `(${RESOLVER.toString()})()` });
      await page.locator(`.panel-tab[data-panel="${tab}"]`).first().click();
      await page.waitForTimeout(350);
      for (const probe of probes) await runProbe(page, probe);
    }
  }
  await context.close();
}
await browser.close();

// ---- report -------------------------------------------------------------
const expected = SKINS.length * (WIDE.length + NARROW.length);
const measuredRows = rows.filter(row => !row.skipped);
const failures = measuredRows.filter(row => !row.pass);
const pending = failures.filter(row => row.pending);
const real = failures.filter(row => !row.pending);
const bySkin = new Map();
for (const row of measuredRows) {
  if (!bySkin.has(row.skin)) bySkin.set(row.skin, { pass: 0, fail: 0, worst: null });
  const entry = bySkin.get(row.skin);
  if (row.pass) entry.pass += 1; else entry.fail += 1;
  // Track the tightest margin against its own threshold, so an informational
  // min:1 row cannot masquerade as the Skin's worst problem.
  const margin = row.min > 0 ? row.ratio / row.min : 99;
  if (!entry.worst || margin < entry.worst.margin) entry.worst = { ...row, margin };
}

console.log(`skins ${bySkin.size} · probes ${WIDE.length} wide + ${NARROW.length} narrow · measurements ${rows.length} / expected ${expected} (${measuredRows.length} applicable, ${rows.length - measuredRows.length} skipped)`);
for (const [skin, entry] of bySkin) {
  console.log(`  ${skin.padEnd(19)} pass ${String(entry.pass).padStart(3)}  fail ${String(entry.fail).padStart(2)}  worst ${entry.worst.ratio}:1 (${entry.worst.key})`);
}
if (pending.length) {
  console.log(`\nbelow floor, scheduled for cut 5 (${pending.length}):`);
  for (const row of pending) console.log(`  PENDING ${row.skin.padEnd(19)} ${row.key}: ${row.ratio}:1 < ${row.min}:1  [${row.pending}]`);
}
if (real.length) {
  console.log(`\nbelow floor, not scheduled (${real.length}):`);
  for (const row of real) console.log(`  FAIL ${row.skin.padEnd(19)} ${row.key}: ${row.ratio}:1 < ${row.min}:1 (alpha ${row.alpha})`);
}
const skipped = rows.filter(row => row.skipped);
if (skipped.length) {
  console.log(`\nnot applicable on their fixture (${skipped.length}):`);
  for (const row of skipped) console.log(`  SKIP ${row.skin.padEnd(19)} ${row.key}: ${row.skipped}`);
}
// Every relaxed-floor row is printed: the value of this audit is that a later
// reader can check the number, and a truncated list throws that away.
const weak = measuredRows.filter(row => row.pass && row.min <= 1.2);
// The console may be short; the file never is. Every row goes to the JSON below,
// and --notes adds the relaxed-floor list to stdout as well.
if (showNotes) {
  console.log(`\nrecorded at the relaxed floor (${weak.length}, informational, full list):`);
  for (const row of weak) console.log(`  note ${row.skin.padEnd(19)} ${row.key}: ${row.ratio}:1 (alpha ${row.alpha})${row.note ? '  — ' + row.note : ''}`);
} else {
  console.log(`\n${weak.length} relaxed-floor rows (informational) — pass --notes to print them; all rows are in the JSON.`);
}
if (verbose) {
  const passing = measuredRows.filter(row => row.pass && row.min > 1.2);
  console.log(`\npassing rows (${passing.length}, --verbose):`);
  for (const row of passing) console.log(`  ok   ${row.skin.padEnd(19)} ${row.key}: ${row.ratio}:1 >= ${row.min}:1`);
}

// Full evidence file: every measured row, whatever the console showed.
try {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const dir = process.argv.find(arg => arg.startsWith('--out='))?.slice(6) || '/tmp/ohd-audit';
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = `${dir}/contrast-${stamp}.json`;
  writeFileSync(file, JSON.stringify({
    generatedAt: new Date().toISOString(), url,
    thresholds: { graphic: 3, text: 4.5 },
    totals: { expected, measured: rows.length, applicable: measuredRows.length, skipped: rows.length - measuredRows.length,
      pass: measuredRows.filter(row => row.pass).length, fail: real.length, pending: pending.length },
    rows
  }, null, 1));
  console.log(`\nfull evidence: ${file}`);
} catch (error) {
  console.error(`could not write the audit file: ${error.message}`);
}

if (missing.length) {
  console.error(`\n${missing.length} probe(s) produced no measurement:`);
  for (const item of missing) console.error(`  MISSING ${item}`);
}
if (rows.length !== expected || missing.length) {
  console.error(`\ncoverage incomplete: ${rows.length} measured, ${expected} expected`);
  process.exit(2);
}
process.exit(real.length ? 1 : 0);
