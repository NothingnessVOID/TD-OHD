/**
 * Warp texture: the parameters, the uniforms they produce and the pixel
 * post-processing — shared by the two places that render it.
 *
 *  - `scripts/build-definition-warp-texture.mjs` renders once, offline, into
 *    `src/features/transit-timeline/assets/definition-warp.png`.
 *  - `dev/definition-warp-panel.js` runs the same shader live on the demo page so
 *    the parameters can be steered by hand; it bakes the result to a data URL.
 *
 * Both use the real Warp fragment/vertex shader from `@paper-design/shaders`
 * (Apache-2.0). The values below are the ones the committed PNG was tuned with,
 * so the demo page starts on exactly that look.
 *
 * No DOM, no WebGL and no package import at module scope: this file has to load
 * in Node (the script) and in the browser (the demo page).
 */

/** Warp blends at most 10 RGBA slots; the shader declares `vec4 u_colors[10]`. */
export const MAX_COLORS = 10;
/** Bar height the values were tuned at. */
export const DESIGN_HEIGHT = 28;
/** Display tile: one horizontal repeat of the texture, in CSS px. */
export const DISPLAY_WIDTH = 800;
/** The PNG is a clean 3x render of that tile (28.57:1, same as the tile). */
export const RENDER_WIDTH = 2400;
export const RENDER_HEIGHT = 84;
/** Seam feather at each end, in render pixels. Scaled with the render width. */
export const FEATHER_PX = 45;

export const WARP_SHAPES = Object.freeze({ checks: 0, stripes: 1, edge: 2 });

/**
 * Slider ranges. One source of truth for the panel's inputs and for validating
 * a stored parameter set, so a hand-edited value can never reach the shader.
 */
export const WARP_NUMERIC = Object.freeze({
  proportion: { min: 0, max: 1, step: 0.01, initial: 0.45 },
  softness: { min: 0, max: 1, step: 0.01, initial: 0.65 },
  distortion: { min: 0, max: 1, step: 0.01, initial: 0.25 },
  swirl: { min: 0, max: 1, step: 0.01, initial: 0.8 },
  swirlIterations: { min: 2, max: 20, step: 1, initial: 10 },
  shapeScale: { min: 0, max: 1, step: 0.005, initial: 0.1 },
  scale: { min: 0.05, max: 1.5, step: 0.01, initial: 0.35 },
  rotation: { min: 0, max: 360, step: 1, initial: 0 },
  /** Milliseconds, matching `ShaderMount.setFrame`. The bar is static; this is the phase. */
  frame: { min: 0, max: 20000, step: 1, initial: 0 },
});

export const WARP_NUMERIC_KEYS = Object.freeze(Object.keys(WARP_NUMERIC));

/**
 * Tuned on 800x28 samples. Slots alternate transparent/colour so the orange base
 * keeps the larger share, with two colours adjacent (magenta + pink violet) and a
 * doubled gap after them, so the density is uneven instead of an even rainbow.
 * `alpha: 0` slots are fully transparent: that is what lets the CSS orange base
 * show through the texture instead of being covered by it.
 */
export const WARP_DEFAULTS = Object.freeze({
  colors: Object.freeze([
    { hex: '#000000', alpha: 0 },
    { hex: '#E01A6E', alpha: 1 },
    { hex: '#B44BE8', alpha: 1 },
    { hex: '#000000', alpha: 0 },
    { hex: '#000000', alpha: 0 },
    { hex: '#5A5BF0', alpha: 1 },
    { hex: '#000000', alpha: 0 },
    { hex: '#12C58B', alpha: 1 },
    { hex: '#000000', alpha: 0 },
    { hex: '#19BED8', alpha: 1 },
  ]),
  shape: 'checks',
  proportion: 0.45,
  softness: 0.65,
  shapeScale: 0.1,
  distortion: 0.25,
  swirl: 0.8,
  swirlIterations: 10,
  scale: 0.35,
  rotation: 0,
  frame: 0,
});

/** `{ hex, alpha }` → the four shader floats. `alpha: 0` is a pure gap. */
export function warpRgba(slot) {
  if (!slot || !slot.alpha) return [0, 0, 0, 0];
  const raw = String(slot.hex ?? '').replace('#', '');
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw.padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16) / 255).concat(1);
}

/** Always `MAX_COLORS` vec4s: the shader's array has a fixed length. */
export function warpColorsUniform(params) {
  const slots = Array.from(params.colors ?? []);
  while (slots.length < MAX_COLORS) slots.push({ hex: '#000000', alpha: 0 });
  return slots.slice(0, MAX_COLORS).map(warpRgba);
}

/**
 * The uniforms the caller supplies. `u_time`, `u_resolution` and `u_pixelRatio`
 * are owned by the renderer (ShaderMount sets them; the offline script sets them
 * itself), so they are not part of this object.
 *
 * `scaleMultiplier` exists because of one difference between the two callers:
 * ShaderMount divides the pattern space by `u_pixelRatio` (= its render scale),
 * so it takes the display-tuned `scale` as-is. The offline script renders at 3x
 * with `u_pixelRatio = 1`, so it has to multiply by 3 to get the same structure.
 */
export function warpUniforms(params, { scaleMultiplier = 1 } = {}) {
  return {
    u_colors: warpColorsUniform(params),
    u_colorsCount: MAX_COLORS,
    u_proportion: params.proportion,
    u_softness: params.softness,
    u_shape: WARP_SHAPES[params.shape] ?? WARP_SHAPES.checks,
    u_shapeScale: params.shapeScale,
    u_distortion: params.distortion,
    u_swirl: params.swirl,
    u_swirlIterations: params.swirlIterations,
    u_scale: params.scale * scaleMultiplier,
    u_fit: 0,
    u_rotation: params.rotation,
    u_originX: 0.5,
    u_originY: 0.5,
    u_offsetX: 0,
    u_offsetY: 0,
    u_worldWidth: 0,
    u_worldHeight: 0,
  };
}

/**
 * Raw `readPixels` output (bottom-up, premultiplied by the shader) → RGBA bytes
 * ready for an `ImageData`: rows flipped to top-down, RGB un-premultiplied so
 * colours keep their saturation, and alpha feathered to zero at both ends so the
 * 800px repeat has a short pure-orange gap instead of a seam.
 */
export function compositeWarpPixels(pixels, width, height, feather = FEATHER_PX) {
  const out = new Uint8ClampedArray(width * height * 4);
  const smoothstep = t => t * t * (3 - 2 * t);
  const wrap = x => (feather > 0
    ? Math.min(smoothstep(Math.min(1, x / feather)), smoothstep(Math.min(1, (width - 1 - x) / feather)))
    : 1);
  let covered = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = ((height - 1 - y) * width + x) * 4; // readPixels is bottom-up
      const dst = (y * width + x) * 4;
      const stored = pixels[src + 3] / 255;
      if (stored <= 0) continue;
      const alpha = stored * wrap(x);
      if (alpha < 0.012) continue;
      out[dst] = Math.min(255, pixels[src] / stored);
      out[dst + 1] = Math.min(255, pixels[src + 1] / stored);
      out[dst + 2] = Math.min(255, pixels[src + 2] / stored);
      out[dst + 3] = Math.round(alpha * 255);
      covered += alpha;
    }
  }
  return { data: out, coverage: covered / (width * height) };
}

/** Deep copy of the defaults, safe to mutate. */
export function cloneWarpDefaults() {
  return { ...WARP_DEFAULTS, colors: WARP_DEFAULTS.colors.map(slot => ({ ...slot })) };
}

/**
 * Colours a random set may use: the spectral family the bar was tuned with, plus
 * a warm and a lime patch. No dark or near-white entries, so a random draw can
 * never turn the bar into a grey or blown-out field.
 */
export const WARP_PALETTE = Object.freeze([
  'E01A6E', 'B44BE8', '5A5BF0', '12C58B', '19BED8', 'FF6A3D', '8FE04A', 'D8C24A',
]);

const between = (random, lo, hi, step) => {
  const value = lo + random() * (hi - lo);
  return step ? Math.round(value / step) * step : value;
};

/**
 * A controlled random set: the shape, the colour layout, every shader value and
 * the starting frame all move, but the bar always keeps the orange-gold base as
 * its main body. That is structural, not a matter of luck: slot 0 and at least
 * half of the remaining slots stay fully transparent, the 3–5 opaque slots sit in
 * one or two adjacent clusters, and the ranges below stay mid-way (they are all
 * inside `WARP_NUMERIC`, so the panel's own sliders can still represent them).
 */
export function randomWarpParams(random = Math.random) {
  const params = cloneWarpDefaults();
  const shapes = Object.keys(WARP_SHAPES);
  params.shape = shapes[Math.min(shapes.length - 1, Math.floor(random() * shapes.length))];

  const layout = new Array(MAX_COLORS).fill(false);
  const clusters = random() < 0.45 ? 2 : 1;
  for (let cluster = 0; cluster < clusters; cluster += 1) {
    let index = 1 + Math.floor(random() * (MAX_COLORS - 1));
    const length = 1 + Math.floor(random() * 3);
    for (let step = 0; step < length; step += 1) {
      if (index >= MAX_COLORS) break;
      layout[index] = true;
      index += 1;
    }
  }
  // Guarantee 3–5 opaque slots, so neither an all-gap nor a full-coverage draw
  // can come out of the loop above.
  const filled = () => layout.filter(Boolean).length;
  while (filled() < 3) {
    const free = layout.map((on, index) => (on || index === 0 ? -1 : index)).filter(index => index > 0);
    if (!free.length) break;
    layout[free[Math.floor(random() * free.length)]] = true;
  }
  while (filled() > 5) {
    const used = layout.map((on, index) => (on ? index : -1)).filter(index => index > 0);
    if (!used.length) break;
    layout[used[Math.floor(random() * used.length)]] = false;
  }

  const palette = [...WARP_PALETTE].sort(() => random() - 0.5);
  let next = 0;
  params.colors = layout.map(on => (on
    ? { hex: `#${palette[next++ % palette.length]}`, alpha: 1 }
    : { hex: '#000000', alpha: 0 }));

  const snap = (key, value) => {
    const { step } = WARP_NUMERIC[key];
    return step < 1 ? Number(value.toFixed(3)) : Math.round(value);
  };
  // Every value is snapped to the slider's own step, so the control, the output
  // and the copied JSON always read the same number.
  const draw = (key, lo, hi, step = WARP_NUMERIC[key].step) => snap(key, between(random, lo, hi, step));
  params.proportion = draw('proportion', 0.2, 0.8);
  params.softness = draw('softness', 0.35, 0.9);
  params.distortion = draw('distortion', 0.1, 0.6);
  params.swirl = draw('swirl', 0.2, 1);
  params.swirlIterations = draw('swirlIterations', 2, 20);
  params.shapeScale = draw('shapeScale', 0.04, 0.35);
  params.scale = draw('scale', 0.2, 0.6);
  params.rotation = draw('rotation', 0, 360);
  params.frame = draw('frame', 0, 20000, 10);
  return params;
}

const finite = value => typeof value === 'number' && Number.isFinite(value);

/** Accepts a whole parameter set; anything invalid falls back to its default. */
export function normalizeWarpParams(raw) {
  const params = cloneWarpDefaults();
  if (!raw || typeof raw !== 'object') return params;
  if (Array.isArray(raw.colors)) {
    params.colors = params.colors.map((fallback, index) => {
      const slot = raw.colors[index];
      // A slot is either `{ hex, alpha }` or the compact string form: six hex
      // digits (opaque) or eight, where the last two are the alpha.
      if (typeof slot === 'string') {
        const value = slot.trim().replace(/^#/, '').toLowerCase();
        if (/^[0-9a-f]{6}$/.test(value)) return { hex: `#${value}`, alpha: 1 };
        if (/^[0-9a-f]{8}$/.test(value)) {
          return { hex: `#${value.slice(0, 6)}`, alpha: value.slice(6) === '00' ? 0 : 1 };
        }
        return fallback;
      }
      if (!slot || typeof slot !== 'object') return fallback;
      const hex = typeof slot.hex === 'string' && /^#[0-9a-f]{6}$/i.test(slot.hex) ? slot.hex.toLowerCase() : fallback.hex;
      return { hex, alpha: slot.alpha ? 1 : 0 };
    });
  }
  if (Object.hasOwn(WARP_SHAPES, raw.shape)) params.shape = raw.shape;
  for (const key of WARP_NUMERIC_KEYS) {
    const value = raw[key];
    const { min, max, step } = WARP_NUMERIC[key];
    if (!finite(value) || value < min || value > max) continue;
    params[key] = step === 1 ? Math.round(value) : value;
  }
  return params;
}
