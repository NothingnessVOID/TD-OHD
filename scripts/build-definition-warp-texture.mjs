#!/usr/bin/env node
/**
 * Generates the Single-definition bar texture: `definition-warp.png`.
 *
 * Why this exists
 * ---------------
 * The 1-bar (Single Definition) is an orange-gold base with local magenta,
 * pink-violet, blue-violet, cyan and green patches of uneven density. The
 * candidate look comes from the Warp shader published by Paper
 * (https://shaders.paper.design/warp, `@paper-design/shaders`, Apache-2.0).
 * We use the *real* fragment/vertex shader and the package's noise texture, but
 * render once, offline, and ship only the resulting PNG. Nothing from the
 * shader package is loaded by the app at runtime; the dependency is a
 * devDependency used by this script.
 *
 * What "no squashing" means here
 * ------------------------------
 * Warp works in pixel space (`v_patternUV` is derived from `u_resolution`), so a
 * shape keeps its proportions as long as the render has the same aspect ratio as
 * the tile it is displayed in, and `u_scale` is scaled with the pixel count. We
 * render 2400x84 (28.57:1) for the 800x28 CSS tile, i.e. exactly 3x, and multiply
 * the display-tuned `u_scale` by 3, so the structure seen at 28px is the same
 * structure the PNG contains, sampled at 3x for retina.
 *
 * Transparency
 * ------------
 * Warp blends up to 10 RGBA colours. Slot 0 and the repeated gap slots are fully
 * transparent, so the CSS orange base shows through untouched ("pure orange
 * gaps"). The alpha ramp between a gap and a colour is what makes each patch
 * glow out of the base instead of sitting on it. The shader writes premultiplied
 * RGB (it does `rgb *= a` before mixing), so pixels are un-premultiplied before
 * they are handed to the PNG encoder. `screen`/`lighten` compositing is
 * deliberately not used: over a bright base it bleaches every hue to white.
 *
 * Seam
 * ----
 * The tile repeats every 800px, and the pattern is not horizontally periodic. The
 * alpha is feathered to zero over `feather` device pixels at both ends, so the
 * seam is a short pure-orange gap rather than a colour jump. Because both sides
 * reach alpha 0, the wrap is value-continuous.
 *
 * Usage
 * -----
 *   node scripts/build-definition-warp-texture.mjs            # writes the asset
 *   node scripts/build-definition-warp-texture.mjs --out=/tmp/x.png
 * The machine needs Chrome (playwright-core) and a WebGL2-capable headless
 * browser; set CHROME_CHANNEL to override the channel.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = 'src/features/transit-timeline/assets/definition-warp.png';

/** Bar height the parameters below were tuned at; the render is a clean multiple. */
const DESIGN_HEIGHT = 28;
/**
 * Display tile: 800x28 CSS px (a 28px bar), i.e. the PNG below is a 3x render of it.
 * The wider tile is what keeps the horizontal repeat from reading as a rhythm: at
 * 400px the warped lobes repeated inside every second or third bar.
 */
const DISPLAY_WIDTH = 800;

/**
 * Tuned on 800x28 samples. Slots alternate transparent/colour so the orange base
 * keeps the larger share, with two colours adjacent (magenta + pink violet) and a
 * doubled gap after them, so the density is uneven instead of an even rainbow.
 */
const WARP = {
  colors: [
    '00000000', // orange base shows through
    'E01A6E', // magenta
    'B44BE8', // pink violet
    '00000000',
    '00000000',
    '5A5BF0', // blue violet
    '00000000',
    '12C58B', // green
    '00000000',
    '19BED8', // cyan
  ],
  shape: 'checks',
  proportion: 0.45,
  softness: 0.65,
  shapeScale: 0.1,
  distortion: 0.25,
  swirl: 0.8,
  swirlIterations: 10,
  /** u_scale at DESIGN_HEIGHT px; multiplied by the render/display pixel factor. */
  scale: 0.35,
  /** Frame offset passed as u_time: Warp is static here, the frame only sets the phase. */
  frame: 0,
};

const SHAPES = { checks: 0, stripes: 1, edge: 2 };

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const width = Number(opt('width', 2400));
const height = Number(opt('height', 84));
/** Alpha feather at each end, in device pixels. 0 disables it. */
const feather = Number(opt('feather', 45));
const out = path.resolve(ROOT, opt('out', DEFAULT_OUT));
/** Render/display pixel factor, derived from the display width so the structure
 *  seen at bar height is the structure the PNG holds. */
const scaleMultiplier = Number(opt('scale', width / DISPLAY_WIDTH));

const page = `<!doctype html><meta charset="utf-8"><body>
<script type="module">
import { warpFragmentShader, getShaderNoiseTexture } from '/node_modules/@paper-design/shaders/dist/index.js';
import { vertexShaderSource } from '/node_modules/@paper-design/shaders/dist/vertex-shader.js';

const W = ${width}, H = ${height}, FEATHER = ${feather};
const WARP = ${JSON.stringify(WARP)};

const noise = getShaderNoiseTexture();
await noise.decode();

function compile(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function render() {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error('WebGL2 unavailable');

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, warpFragmentShader));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  for (const [pname, value] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.REPEAT]]) gl.texParameteri(gl.TEXTURE_2D, pname, value);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, noise);

  const rgba = hex => {
    const raw = hex.replace('#', '');
    const full = raw.length <= 4 ? raw.split('').map(c => c + c).join('') : raw.padEnd(8, 'f');
    return [0, 2, 4, 6].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
  };
  const colors = new Float32Array(40);
  WARP.colors.forEach((color, index) => colors.set(rgba(color), index * 4));

  const u = name => gl.getUniformLocation(program, name);
  gl.uniform2f(u('u_resolution'), W, H);
  gl.uniform1f(u('u_pixelRatio'), 1);
  gl.uniform1i(u('u_noiseTexture'), 0);
  gl.uniform4fv(u('u_colors'), colors);
  gl.uniform1f(u('u_colorsCount'), WARP.colors.length);
  gl.uniform1f(u('u_time'), WARP.frame);
  gl.uniform1f(u('u_proportion'), WARP.proportion);
  gl.uniform1f(u('u_softness'), WARP.softness);
  gl.uniform1f(u('u_shape'), ${JSON.stringify(SHAPES)}[WARP.shape]);
  gl.uniform1f(u('u_shapeScale'), WARP.shapeScale);
  gl.uniform1f(u('u_distortion'), WARP.distortion);
  gl.uniform1f(u('u_swirl'), WARP.swirl);
  gl.uniform1f(u('u_swirlIterations'), WARP.swirlIterations);
  gl.uniform1f(u('u_scale'), WARP.scale * ${scaleMultiplier});
  gl.uniform1f(u('u_fit'), 0);
  gl.uniform1f(u('u_rotation'), 0);
  gl.uniform1f(u('u_originX'), 0.5);
  gl.uniform1f(u('u_originY'), 0.5);
  gl.uniform1f(u('u_offsetX'), 0);
  gl.uniform1f(u('u_offsetY'), 0);
  gl.uniform1f(u('u_worldWidth'), 0);
  gl.uniform1f(u('u_worldHeight'), 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);

  const target = document.createElement('canvas');
  target.width = W; target.height = H;
  const ctx = target.getContext('2d');
  const image = ctx.createImageData(W, H);
  const smoothstep = t => t * t * (3 - 2 * t);
  const wrap = x => (FEATHER > 0
    ? Math.min(smoothstep(Math.min(1, x / FEATHER)), smoothstep(Math.min(1, (W - 1 - x) / FEATHER)))
    : 1);
  let covered = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const src = ((H - 1 - y) * W + x) * 4; // readPixels is bottom-up
      const dst = (y * W + x) * 4;
      const stored = px[src + 3] / 255;
      if (stored <= 0) continue;
      // The shader premultiplies RGB by alpha; divide it back out, then apply the
      // seam feather to alpha only, so colours keep their saturation.
      const alpha = stored * wrap(x);
      if (alpha < 0.012) continue;
      image.data[dst] = Math.min(255, px[src] / stored);
      image.data[dst + 1] = Math.min(255, px[src + 1] / stored);
      image.data[dst + 2] = Math.min(255, px[src + 2] / stored);
      image.data[dst + 3] = Math.round(alpha * 255);
      covered += alpha;
    }
  }
  ctx.putImageData(image, 0, 0);
  return { url: target.toDataURL('image/png'), coverage: covered / (W * H) };
}

window.__result = render();
window.__done = true;
</script>`;

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/__warp.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(page);
  }
  const file = path.join(ROOT, url);
  const relative = path.relative(ROOT, file);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !relative.startsWith('node_modules/@paper-design/shaders/')) {
    res.writeHead(403); return res.end();
  }
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { 'content-type': path.extname(file) === '.js' ? 'text/javascript' : 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

const { chromium } = await import('playwright-core');
const browser = await chromium.launch({
  channel: process.env.CHROME_CHANNEL || 'chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const tab = await browser.newPage();
  tab.on('pageerror', error => console.error('[page]', error.message));
  await tab.goto(`http://127.0.0.1:${server.address().port}/__warp.html`);
  await tab.waitForFunction(() => window.__done === true, null, { timeout: 60_000 });
  const result = await tab.evaluate(() => window.__result);
  const png = Buffer.from(result.url.split(',')[1], 'base64');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, png);
  console.log(`${path.relative(ROOT, out)}  ${width}x${height}  ${(png.length / 1024).toFixed(1)} kB  colour coverage ${(result.coverage * 100).toFixed(1)}%`);
} finally {
  await browser.close();
  server.close();
}
