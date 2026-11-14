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
 * devDependency used by this script and by the demo page's live panel.
 *
 * The parameters, the uniforms they produce and the pixel post-processing live
 * in `dev/warp-texture.js` and are shared with `dev/definition-warp-panel.js`,
 * which runs the same shader live on the demo page. Changing the look should
 * happen there; this script only bakes it.
 *
 * What "no squashing" means here
 * ------------------------------
 * Warp works in pixel space (`v_patternUV` is derived from `u_resolution`), so a
 * shape keeps its proportions as long as the render has the same aspect ratio as
 * the box it is displayed in, and `u_scale` is scaled with the pixel count. We
 * render 2400x84 (28.57:1) for the demo's 800x28 shader box, i.e. exactly 3x, and
 * multiply the display-tuned `u_scale` by 3.
 *
 * The bar does not repeat it on an 800px tile any more: `timeline.css` now uses
 * `--tl-def1-tile: 1125px`, so the shipped texture is stretched 1.406x
 * horizontally. That is the look the user selected in the demo (which shows the
 * 2400px live canvas on the same 1125px background-size), so the asset is kept at
 * the demo's render width rather than re-baked at the wider aspect — re-baking
 * would shrink every lobe relative to the bar and drift from the approved sample.
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
import { WARP_DEFAULTS, DISPLAY_WIDTH, FEATHER_PX } from '../dev/warp-texture.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = 'src/features/transit-timeline/assets/definition-warp.png';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const width = Number(opt('width', 2400));
const height = Number(opt('height', 84));
/** Alpha feather at each end, in device pixels. 0 disables it. */
const feather = Number(opt('feather', FEATHER_PX));
const out = path.resolve(ROOT, opt('out', DEFAULT_OUT));
/** Render/display pixel factor, derived from the display width so the structure
 *  seen at bar height is the structure the PNG holds. */
const scaleMultiplier = Number(opt('scale', width / DISPLAY_WIDTH));

const page = `<!doctype html><meta charset="utf-8"><body>
<script type="module">
import { warpFragmentShader, getShaderNoiseTexture } from '/node_modules/@paper-design/shaders/dist/index.js';
import { vertexShaderSource } from '/node_modules/@paper-design/shaders/dist/vertex-shader.js';
import { warpUniforms, compositeWarpPixels } from '/dev/warp-texture.js';

const W = ${width}, H = ${height}, FEATHER = ${feather};
const PARAMS = ${JSON.stringify(WARP_DEFAULTS)};

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

  const u = name => gl.getUniformLocation(program, name);
  gl.uniform2f(u('u_resolution'), W, H);
  gl.uniform1f(u('u_pixelRatio'), 1);
  gl.uniform1i(u('u_noiseTexture'), 0);
  gl.uniform1f(u('u_time'), PARAMS.frame * 1e-3);
  for (const [name, value] of Object.entries(warpUniforms(PARAMS, { scaleMultiplier: ${scaleMultiplier} }))) {
    if (Array.isArray(value) && Array.isArray(value[0])) {
      gl.uniform4fv(u(name), value.flat());
    } else {
      gl.uniform1f(u(name), value);
    }
  }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const { data, coverage } = compositeWarpPixels(px, W, H, FEATHER);

  const target = document.createElement('canvas');
  target.width = W; target.height = H;
  const ctx = target.getContext('2d');
  const image = ctx.createImageData(W, H);
  image.data.set(data);
  ctx.putImageData(image, 0, 0);
  return { url: target.toDataURL('image/png'), coverage };
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
  // Only the shader package and the shared parameter module are exposed.
  const allowed = 'node_modules/@paper-design/shaders/';
  const relative = path.relative(ROOT, path.join(ROOT, url));
  const permitted = relative.startsWith(allowed) || relative === 'dev/warp-texture.js';
  if (!permitted || relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403); return res.end();
  }
  try {
    const body = await fs.readFile(path.join(ROOT, relative));
    res.writeHead(200, { 'content-type': path.extname(relative) === '.js' ? 'text/javascript' : 'application/octet-stream' });
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
