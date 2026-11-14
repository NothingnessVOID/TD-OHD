/**
 * Demo-only texture panel: two groups, one payload.
 *
 * 1. **Warp form / colour / starting frame** — the real Warp shader from
 *    `@paper-design/shaders`, mounted live through the package's own
 *    `ShaderMount` (speed 0, explicit frame). The pixels are read back, run
 *    through the shared post-processing and handed to the page as
 *    `--warp-preview-image`.
 * 2. **Look** — how that texture is shown here: blur, brightness, saturation,
 *    glow strength and tile size. These are CSS-level values on the demo scope,
 *    mirroring the one place where the app's styling does something to the
 *    image, so the two groups never pretend to be the same kind of knob.
 *
 * The shader group changes the warped structure; the look group cannot. Copy,
 * load and reset act on both together.
 *
 * **Baseline.** `mountWarpPanel({ preset })` takes the parameter set the user
 * selected, read from `dev/warp-preset.json` by the page. That set — not the
 * committed PNG's tuning — is what a fresh browser starts on, what
 * 「载入你选定的参数」 reapplies and what 「恢复默认」 returns to. A browser that
 * already has saved values keeps them: the preset never overwrites storage on
 * load, it only does so when the user asks for it. Without a readable preset
 * file every path falls back to `WARP_DEFAULTS` + the stylesheet's look values.
 *
 * Nothing in `src/` imports this module, and the panel only writes custom
 * properties on the demo scope.
 */
import { ShaderMount, warpFragmentShader, getShaderNoiseTexture } from '@paper-design/shaders';
import { copyPlainText } from '../src/lib/clipboard.js';
import {
  MAX_COLORS, DESIGN_HEIGHT, DISPLAY_WIDTH, RENDER_WIDTH, FEATHER_PX,
  WARP_NUMERIC, WARP_SHAPES,
  normalizeWarpParams, randomWarpParams, warpUniforms, compositeWarpPixels,
} from './warp-texture.js';

/** Dedicated demo key: no production key is read or written. */
export const STORAGE_KEY = 'tdohd.definitionWarpTune.v1';

/** Order and wording of the shader rows. Ranges come from `WARP_NUMERIC`. */
const WARP_ROWS = [
  { key: 'proportion', label: '颜色比例', hint: '颜色在整条上怎么分布：越小越往一侧挤。' },
  { key: 'softness', label: '过渡柔和度', hint: '色块边缘是硬切还是慢慢化开。' },
  { key: 'distortion', label: '扭曲强度', hint: '噪声把色块推歪的程度。' },
  { key: 'swirl', label: '漩涡强度', hint: '在扭曲之上再加旋转拉扯，漩涡层数要大于 1 才看得出。' },
  { key: 'swirlIterations', label: '漩涡层数' },
  { key: 'shapeScale', label: '底纹缩放', hint: '棋盘 / 条纹 / 分边这层底纹的大小。' },
  { key: 'scale', label: '整体缩放' },
  { key: 'rotation', label: '旋转角度' },
  { key: 'frame', label: '初始帧', hint: '从动画的第几毫秒定帧；静止时就是一个固定相位。' },
];

/**
 * Display-only values. Defaults are exactly what `timeline.css` already does to
 * the texture, so an untouched panel renders the app's treatment.
 */
const LOOK_ROWS = [
  { key: 'blur', label: '模糊', css: '--wt-blur', unit: 'px', min: 0, max: 16, step: 0.5, initial: 10, digits: 1, random: [3, 12],
    hint: '颜色层和它的柔光一起变；0 就是完全不模糊。' },
  { key: 'bright', json: 'brightness', label: '亮度', css: '--wt-bright', unit: '', min: 0.6, max: 1.8, step: 0.05, initial: 1.1, digits: 2, random: [0.85, 1.35],
    hint: '只调颜色层，1.10 就是正式样式里的样子。' },
  { key: 'sat', json: 'saturation', label: '饱和度', css: '--wt-sat', unit: '', min: 0, max: 2, step: 0.05, initial: 1.55, digits: 2, random: [0.9, 1.5] },
  { key: 'glow', label: '柔光', css: '--wt-veil', unit: '', min: 0, max: 1, step: 0.01, initial: null, digits: 2, random: [0.15, 0.6],
    hint: '不拖时用正式样式的 0.72（明暗相同）；拖过之后就是固定值。', state: true },
  { key: 'tile', label: '纹理大小', css: '--wt-tile', unit: 'px', min: 400, max: 1600, step: 25, initial: 1125, digits: 0, random: [600, 1100],
    hint: '一个重复周期的宽度：越小纹理越密。' },
  // Not drawn by 「随机一组」: the light direction is a user choice, not a look to shuffle.
  { key: 'light', json: 'lightPosition', label: '发光位置', css: '--wt-light-position', unit: '%', min: 0, max: 100, step: 1, initial: 0, digits: 0,
    hint: '每根条自己的坐标：0% 从左侧起亮往右渐暗，100% 反过来。',
    note: value => (value === 0 ? '左侧起点' : value === 100 ? '右侧起点' : value === 50 ? '居中' : value < 50 ? '偏左' : '偏右') },
];

const SHAPE_LABELS = { checks: '棋盘', stripes: '条纹', edge: '分边' };

/** The stored/copied name of a look value (`bright` → `brightness`). */
const jsonKey = row => row.json ?? row.key;
const cloneLookDefaults = () => Object.fromEntries(LOOK_ROWS.map(row => [row.key, row.initial]));

/** Decimals a slider step can actually express (`0.005` → 3, `0.01` → 2, `1` → 0).
 *  The shader readout uses it, so a 0.135 value never prints as a rounded 0.14. */
const decimalsOf = step => (step >= 1 ? 0 : (String(step).split('.')[1] ?? '').length);
const numberText = (row, value) => (row.digits === 0 ? String(Math.round(value)) : Number(value).toFixed(row.digits));
const displayOf = (row, value) => {
  const text = numberText(row, value);
  if (row.unit === '%') return `${text}%`;
  return row.unit ? `${text} ${row.unit}` : text;
};
const cssOf = (row, value) => {
  // Trim the display padding: the CSS string is meant to be pasted as-is.
  const text = String(Number(numberText(row, value)));
  return row.unit === 'px' ? `${text}px` : row.unit === '%' ? `${text}%` : text;
};

const warpRowMarkup = row => {
  const { min, max, step } = WARP_NUMERIC[row.key];
  return `<div class="warp-field">
      <label for="warp-${row.key}">${row.label}</label>
      <input type="range" id="warp-${row.key}" min="${min}" max="${max}" step="${step}">
      <output id="warp-${row.key}-value" for="warp-${row.key}"></output>
      ${row.hint ? `<p class="warp-field-hint">${row.hint}</p>` : ''}
    </div>`;
};

const lookRowMarkup = row => `<div class="warp-field">
      <label for="look-${row.key}">${row.label}</label>
      <input type="range" id="look-${row.key}" min="${row.min}" max="${row.max}" step="${row.step}">
      <output id="look-${row.key}-value" for="look-${row.key}"></output>
      ${row.hint ? `<p class="warp-field-hint">${row.hint}${row.state ? ' <span class="warp-field-state" data-look-state></span>' : ''}</p>` : ''}
    </div>`;

/** A writable copy of a normalized parameter set (colour slots included). */
const cloneWarpParams = params => ({ ...params, colors: params.colors.map(slot => ({ ...slot })) });

/**
 * Reads a `look` object from storage or from the preset into a fresh default set.
 * Out-of-range or non-numeric entries keep the default. `pinned` reports whether
 * the glow came in as a number (fixed) instead of null ("follow the theme").
 */
function readLookValues(rawLook) {
  const look = cloneLookDefaults();
  let pinned = false;
  if (!rawLook || typeof rawLook !== 'object') return { look, pinned };
  for (const row of LOOK_ROWS) {
    const raw = rawLook[jsonKey(row)];
    if (raw === null || raw === undefined) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < row.min || value > row.max) continue;
    look[row.key] = row.step < 1 ? value : Math.round(value);
    if (row.key === 'glow') pinned = true;
  }
  return { look, pinned };
}

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Builds the panel inside `host` and starts the live shader.
 * Any failure to get a real WebGL2 context is reported in the panel and the
 * page's preview image is cleared — the old texture is never shown as if the
 * shader had run.
 */
export function mountWarpPanel({ host, scope, preset = null, storage = safeStorage(), copy = copyPlainText } = {}) {
  if (!host) throw new Error('mountWarpPanel needs a host element');
  const surface = scope ?? document.querySelector('.demo');
  if (!surface) throw new Error('mountWarpPanel needs the .demo scope');

  // The selected set (`dev/warp-preset.json`). Anything unreadable falls back to
  // the shipped parameters, so a broken file can never leave the panel inert.
  const presetRaw = preset && typeof preset === 'object' ? preset : null;
  const presetName = typeof presetRaw?.name === 'string' ? presetRaw.name.trim() : '';
  const hasPreset = Boolean(presetRaw && (presetRaw.warp || presetRaw.look));
  const presetLook = readLookValues(presetRaw?.look);
  const baseline = {
    params: normalizeWarpParams(presetRaw?.warp ?? presetRaw),
    look: presetLook.look,
    pinned: presetLook.pinned,
    name: presetName,
    has: hasPreset,
  };
  const presetLabel = baseline.name ? `「${baseline.name}」` : '';

  host.innerHTML = `<details class="warp-tune" open>
    <summary><span class="warp-tune-title">纹理参数</span><span class="warp-tune-tag" data-warp-tag>仅演示页 · 真实 shader 即时渲染</span></summary>
    <div class="warp-tune-body">
      <div class="warp-tune-error" data-warp-error hidden></div>
      <p class="warp-tune-intro">两组参数：<strong>Warp 形态 / 颜色 / 初始帧</strong>是 shader 自己的参数，改完立刻重画整张纹理；<strong>外观</strong>只决定这张纹理在本页怎么显示（模糊、亮度、饱和度、柔光、铺贴大小、发光位置），不改变形态。两组都作用于上面的 B、当前参数对比的两条、第一颗色块、场景里正常长度的 1 号条和放大预览；A 和短事件的小标记不参与。</p>
      <div class="warp-live"><div class="warp-shader-host" data-warp-host></div></div>
      <div class="warp-live-meta" data-warp-meta></div>
      <fieldset class="warp-group">
        <legend>Warp 形态 / 颜色 / 初始帧</legend>
        <div class="warp-shape-row">
          <label for="warp-shape">底纹形状</label>
          <select id="warp-shape">${Object.keys(WARP_SHAPES).map(key => `<option value="${key}">${SHAPE_LABELS[key]}</option>`).join('')}</select>
          <button type="button" data-warp-play aria-pressed="false">播放</button>
        </div>
        <div class="warp-tune-fields">${WARP_ROWS.map(warpRowMarkup).join('')}</div>
        <div class="warp-colors-block">
          <p class="warp-field-hint">勾上「透明」就是完全透明，让橙色底色露出来；不勾就是实色。相邻的两个实色会连成一片。</p>
          <div class="warp-colors">${Array.from({ length: MAX_COLORS }, (_, index) => `<div class="warp-color">
              <span class="warp-color-index">${index + 1}</span>
              <input type="color" id="warp-color-${index}" aria-label="第 ${index + 1} 个颜色">
              <label class="warp-color-alpha"><input type="checkbox" id="warp-alpha-${index}">透明</label>
            </div>`).join('')}</div>
        </div>
      </fieldset>
      <fieldset class="warp-group">
        <legend>外观</legend>
        <p class="warp-field-hint">这一组是本页的显示参数，不影响纹理本身的形状。不拖时用的是选定预设里的外观值；模糊 10px、亮度 1.10、饱和度 1.55、柔光 0.72、纹理 1125px，就是正式样式（<code>timeline.css</code>）的值。</p>
        <div class="warp-tune-fields" data-look-fields>${LOOK_ROWS.map(lookRowMarkup).join('')}</div>
      </fieldset>
      <div class="warp-tune-actions">
        <button type="button" data-warp-random>随机一组</button>
        <button type="button" data-warp-preset>载入你选定的参数</button>
        <button type="button" data-warp-reset>恢复默认（选定预设）</button>
        <button type="button" data-warp-copy>复制参数</button>
      </div>
      <p class="warp-preset-note" data-warp-preset-note></p>
      <p class="warp-tune-status" role="status" aria-live="polite"></p>
      <label class="warp-tune-json-label" for="warp-tune-json">当前参数（复制被拦住时可以手动选中）</label>
      <textarea class="warp-tune-json" id="warp-tune-json" rows="7" readonly spellcheck="false"></textarea>
      <p class="warp-tune-foot">默认值来自 <code>dev/warp-preset.json</code> 里选定的参数：这一组已经同步到 <code>dev/warp-texture.js</code> 的 <code>WARP_DEFAULTS</code>，正式资产 <code>definition-warp.png</code> 就是用同一组参数烘的（外观值则写在 <code>timeline.css</code>）。「随机一组」「载入你选定的参数」「恢复默认」「复制参数」都同时覆盖两组；随机只在保持橙金主底的前提下换形态、颜色和外观。这块面板不会改生产默认，也不重新生成 PNG：真要再改正式资产，仍需把数值抄回 <code>WARP_DEFAULTS</code> 并重跑生成脚本。</p>
    </div>
  </details>`;

  const $ = selector => host.querySelector(selector);
  const shaderHost = $('[data-warp-host]');
  const liveWrap = $('.warp-live');
  const metaNode = $('[data-warp-meta]');
  const errorNode = $('[data-warp-error]');
  const tagNode = $('[data-warp-tag]');
  const shapeSelect = $('#warp-shape');
  const playButton = $('[data-warp-play]');
  const statusNode = $('.warp-tune-status');
  const jsonNode = $('#warp-tune-json');
  const resetButton = $('[data-warp-reset]');
  const randomButton = $('[data-warp-random]');
  const copyButton = $('[data-warp-copy]');
  const presetButton = $('[data-warp-preset]');
  const presetNoteNode = $('[data-warp-preset-note]');
  const lookStateNode = $('[data-look-state]');

  // The baseline is the selected preset; "restore defaults" and "load selected"
  // both return to it. Without a preset file the button stays inert rather than
  // pretending to load something.
  presetButton.disabled = !baseline.has;
  presetButton.title = baseline.has
    ? `把保存在 dev/warp-preset.json 的选定参数${presetLabel}重新放回当前参数`
    : '没有读到 dev/warp-preset.json';
  presetNoteNode.textContent = baseline.has
    ? `本页的基线${presetLabel}保存在 dev/warp-preset.json：新打开、这台浏览器还没有保存过参数时，默认就是它。已经保存过的参数不会被替换，「载入你选定的参数」随时可以把它放回当前参数；「恢复默认」回到的也是这一组，并会清掉本机保存。`
    : '没有读到 dev/warp-preset.json，当前以正式 PNG 的参数和样式表的外观值作为默认。';

  const colorInputs = Array.from({ length: MAX_COLORS }, (_, index) => ({
    color: $(`#warp-color-${index}`),
    alpha: $(`#warp-alpha-${index}`),
  }));
  const warpNodes = new Map(WARP_ROWS.map(row => [row.key, {
    input: $(`#warp-${row.key}`),
    output: $(`#warp-${row.key}-value`),
  }]));
  const lookNodes = new Map(LOOK_ROWS.map(row => [row.key, {
    input: $(`#look-${row.key}`),
    output: $(`#look-${row.key}-value`),
  }]));

  let params = cloneWarpParams(baseline.params);
  let look = cloneLookDefaults();
  /** The glow slider follows the theme until the user touches it. */
  let glowDirty = false;
  let mount = null;
  let noise = null;
  let ready = false;
  let playing = false;
  let baking = 0;
  let rafId = 0;
  let playTimer = 0;
  let lastTick = 0;
  let disposed = false;
  const surface2d = document.createElement('canvas');
  const ctx2d = surface2d.getContext('2d');

  const setStatus = text => { statusNode.textContent = text; };
  metaNode.textContent = '正在启动真实 Warp shader…';

  /** Current theme's glow opacity, straight from the shared stylesheet. */
  function themeGlow() {
    const node = surface.querySelector('.tl');
    if (!node) return 0.72;
    const parsed = Number.parseFloat(getComputedStyle(node).getPropertyValue('--tl-def1-veil').trim());
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0.72;
  }

  const effectiveGlow = () => (glowDirty ? look.glow : themeGlow());

  function payload() {
    const { colors, ...numbers } = params;
    return {
      note: '仅演示页参数：warp 组是真实 shader 的形参，look 组是本页的显示值',
      warp: {
        ...numbers,
        // Compact slots as 8-digit hex: the last two digits are the alpha.
        colors: colors.map(slot => `${slot.hex.replace('#', '').toLowerCase()}${slot.alpha ? 'ff' : '00'}`),
      },
      // Keys come from the rows, so the stored/copied names and the reader can
      // never drift apart. A null glow means "follow the stylesheet's .72".
      look: Object.fromEntries(LOOK_ROWS.map(row => [
        jsonKey(row),
        row.key === 'glow' ? (glowDirty ? look.glow : null) : look[row.key],
      ])),
      lookCss: LOOK_ROWS.map(row => `${row.css}: ${cssOf(row, row.key === 'glow' ? effectiveGlow() : look[row.key])}`).join('; '),
    };
  }

  function renderValues() {
    for (const row of WARP_ROWS) {
      const { input, output } = warpNodes.get(row.key);
      input.value = String(params[row.key]);
      // Decimals follow the slider's step: 0.005 keeps three places, so 0.135 is
      // never shown (or screenshotted) as 0.14.
      output.textContent = Number(params[row.key]).toFixed(decimalsOf(WARP_NUMERIC[row.key].step));
    }
    for (const row of LOOK_ROWS) {
      const { input, output } = lookNodes.get(row.key);
      const value = row.key === 'glow' ? effectiveGlow() : look[row.key];
      input.value = String(value);
      output.textContent = row.note ? `${displayOf(row, value)} · ${row.note(value)}` : displayOf(row, value);
    }
    lookStateNode.textContent = glowDirty ? '当前：手动固定' : '当前：跟随正式样式';
    shapeSelect.value = params.shape;
    params.colors.forEach((slot, index) => {
      colorInputs[index].color.value = slot.hex;
      colorInputs[index].color.disabled = !slot.alpha;
      colorInputs[index].alpha.checked = !slot.alpha;
    });
    jsonNode.value = JSON.stringify(payload(), null, 2);
  }

  /** Writes the look group onto the demo scope; defaults are removed, not set. */
  function applyLook() {
    for (const row of LOOK_ROWS) {
      if (row.key === 'glow') {
        if (glowDirty) surface.style.setProperty(row.css, cssOf(row, look.glow));
        else surface.style.removeProperty(row.css);
        continue;
      }
      if (look[row.key] === row.initial) surface.style.removeProperty(row.css);
      else surface.style.setProperty(row.css, cssOf(row, look[row.key]));
    }
    // The brightness term is part of the demo's base filter now (the shipped
    // look is 1.10, not 1), so there is no second brightness pass to switch on.
  }

  function writeStorage() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, ...payload() }));
    } catch {
      /* private mode or quota: the live preview still works */
    }
  }

  const cloneBaselineParams = () => cloneWarpParams(baseline.params);
  const cloneBaselineLook = () => ({ ...baseline.look });

  /** Puts the selected preset back into the live state. `persist` decides whether
   *  the same values are also written to (or cleared from) this browser. */
  function applyBaseline({ persist }) {
    stopPlayback();
    params = cloneBaselineParams();
    look = cloneBaselineLook();
    glowDirty = baseline.pinned;
    if (persist) {
      commit();
      return;
    }
    try {
      storage?.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to clear */
    }
    commit({ persist: false });
  }

  function readStorage() {
    if (!storage) return null;
    try {
      const raw = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
      return raw && typeof raw === 'object' ? raw : null;
    } catch {
      return null; // unreadable or hand-edited junk: keep the defaults
    }
  }

  /** Reads the shader's own framebuffer back and re-bakes the preview image. */
  function bake() {
    if (!ready || disposed) return;
    const canvas = mount.canvasElement;
    const width = canvas.width;
    const height = canvas.height;
    if (!width || !height) return;
    const gl = canvas.getContext('webgl2');
    if (!gl) return;
    const started = performance.now();
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    // The seam feather is defined at the 2400px reference width.
    const feather = FEATHER_PX * (width / RENDER_WIDTH);
    const { data } = compositeWarpPixels(pixels, width, height, feather);
    surface2d.width = width;
    surface2d.height = height;
    const image = ctx2d.createImageData(width, height);
    image.data.set(data);
    ctx2d.putImageData(image, 0, 0);
    surface.style.setProperty('--warp-preview-image', `url("${surface2d.toDataURL('image/png')}")`);
    metaNode.textContent = `真实 shader 输出 · ${width}×${height}（${(width / DISPLAY_WIDTH).toFixed(2)} 倍）· 本次重绘 ${Math.round(performance.now() - started)}ms`;
  }

  /** Coalesces slider input into one re-render per frame. */
  function schedule() {
    clearTimeout(baking);
    baking = setTimeout(() => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        bake();
      });
    }, 70);
  }

  function pushUniforms() {
    if (!ready) return;
    mount.setUniforms({ ...warpUniforms(params), u_noiseTexture: noise });
    mount.setFrame(params.frame);
  }

  function commit({ persist = true } = {}) {
    renderValues();
    applyLook();
    pushUniforms();
    if (persist) writeStorage();
    schedule();
  }

  /** The canvas must keep an 800x28 layout box, so the preview is scaled visually. */
  function fitLivePreview() {
    const available = liveWrap.clientWidth || DISPLAY_WIDTH;
    const scale = Math.min(1, available / DISPLAY_WIDTH);
    shaderHost.style.transform = `scale(${scale})`;
    shaderHost.style.transformOrigin = '0 0';
    liveWrap.style.height = `${Math.round(DESIGN_HEIGHT * scale)}px`;
  }

  function fail(error) {
    ready = false;
    const message = error instanceof Error ? error.message : String(error);
    errorNode.hidden = false;
    errorNode.textContent = `真实 Warp shader 没有跑起来：${message}。下面的色块现在没有纹理，因为这里不会用旧贴图顶替；先解决这个问题再调参。`;
    tagNode.textContent = 'shader 未运行';
    tagNode.classList.add('is-error');
    host.querySelector('.warp-tune')?.classList.add('is-failed');
    surface.style.removeProperty('--warp-preview-image');
    metaNode.textContent = '';
    host.querySelectorAll('input, select, button').forEach(node => { node.disabled = true; });
    setStatus('shader 未运行，参数不生效。');
    console.error('[warp panel]', error);
  }

  async function init() {
    try {
      noise = getShaderNoiseTexture();
      if (!noise) throw new Error('噪声贴图没有生成');
      await noise.decode();
      mount = new ShaderMount(
        shaderHost,
        warpFragmentShader,
        { ...warpUniforms(params), u_noiseTexture: noise },
        { preserveDrawingBuffer: true },
        0, // speed: the bar is static; the frame is chosen explicitly
        params.frame,
        3, // minPixelRatio: aims for 2400x84 on the 800x28 box
      );
      // ShaderMount sizes its canvas from a ResizeObserver entry and can report a
      // smaller box for the first frames, so wait until the width stops changing.
      const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
      let previous = -1;
      for (let frame = 0; frame < 20; frame += 1) {
        await nextFrame();
        const width = mount.canvasElement.width;
        if (width && width === previous) break;
        previous = width;
      }
      if (!mount.canvasElement.width) throw new Error('画布没有拿到尺寸');
      // It derives the render scale from the device pixel ratio. Correcting the
      // ratio once per measured width converges on the 3x tile (2400x84); the
      // loop is bounded and gives up on screens that render denser than 3x.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await nextFrame();
        const current = mount.canvasElement.width;
        if (!current || Math.abs(current - RENDER_WIDTH) < 2) break;
        const wanted = mount.minPixelRatio * (RENDER_WIDTH / current);
        if (!Number.isFinite(wanted) || wanted <= 0 || wanted > 64) break;
        mount.setMinPixelRatio(Number(wanted.toFixed(3)));
      }
      ready = true;
      fitLivePreview();
      if (mount.canvasElement.width !== RENDER_WIDTH) {
        // A device pixel ratio above 3 renders larger; still a clean multiple,
        // just a heavier data URL.
        setStatus(`画布 ${mount.canvasElement.width}×${mount.canvasElement.height}，不是 3 倍，结构仍然一致。`);
      }
      commit({ persist: false });
    } catch (error) {
      fail(error);
    }
  }

  /** One draw of the look group, inside each row's own random window. Rows
      without a window (the light direction) keep whatever the user chose. */
  function randomLook() {
    const next = cloneLookDefaults();
    for (const row of LOOK_ROWS) {
      if (!row.random) {
        next[row.key] = look[row.key];
        continue;
      }
      const [lo, hi] = row.random;
      const raw = lo + Math.random() * (hi - lo);
      next[row.key] = row.step < 1 ? Number((Math.round(raw / row.step) * row.step).toFixed(3)) : Math.round(raw / row.step) * row.step;
    }
    return next;
  }

  function loadSelected() {
    applyBaseline({ persist: true });
    setStatus(`${baseline.has ? `已把选定参数${presetLabel}载入当前参数` : '没有读到选定的预设文件，载入的是内置默认参数'}，并保存到这台浏览器。`);
  }

  function randomize() {
    stopPlayback();
    params = randomWarpParams();
    look = randomLook();
    // A drawn glow is a fixed value, not "follow the theme".
    glowDirty = true;
    setStatus('已随机一组：形态、颜色、初始帧和外观都换了，「恢复默认」可以回到原来的样子。');
    commit();
  }

  function reset() {
    applyBaseline({ persist: false });
    setStatus(baseline.has
      ? `两组都已回到选定参数${presetLabel}，这台浏览器里保存的参数也清掉了。`
      : '两组都已恢复默认，这台浏览器里保存的参数也清掉了。');
  }

  let copying = false;
  async function copyParams() {
    if (copying) return;
    copying = true;
    copyButton.disabled = true;
    let copied = false;
    try {
      // Called inside the click, before any await, so user activation survives.
      copied = await copy(jsonNode.value);
    } catch {
      copied = false;
    } finally {
      copying = false;
      copyButton.disabled = false;
    }
    setStatus(copied
      ? '两组参数已经复制到剪贴板。'
      : '浏览器拦住了自动复制，可以直接选中下面的文本框手动复制。');
  }

  function stopPlayback() {
    if (!playing) return;
    playing = false;
    clearInterval(playTimer);
    playTimer = 0;
    params.frame = Math.round(params.frame);
    playButton.textContent = '播放';
    playButton.setAttribute('aria-pressed', 'false');
    warpNodes.get('frame').input.disabled = false;
    commit();
  }

  function startPlayback() {
    if (!ready || playing) return;
    playing = true;
    lastTick = performance.now();
    playButton.textContent = '暂停';
    playButton.setAttribute('aria-pressed', 'true');
    warpNodes.get('frame').input.disabled = true;
    // The frame is advanced here rather than by ShaderMount's own clocks: the
    // shader stays at speed 0, so the preview only moves while this runs.
    playTimer = setInterval(() => {
      if (!ready || !playing) return;
      const now = performance.now();
      const delta = now - lastTick;
      lastTick = now;
      params.frame = (params.frame + delta) % WARP_NUMERIC.frame.max;
      mount.setFrame(params.frame);
      warpNodes.get('frame').input.value = String(Math.round(params.frame));
      warpNodes.get('frame').output.textContent = String(Math.round(params.frame));
      bake();
    }, 100);
  }

  for (const row of WARP_ROWS) {
    warpNodes.get(row.key).input.addEventListener('input', event => {
      const value = Number(event.currentTarget.value);
      const { min, max, step } = WARP_NUMERIC[row.key];
      if (!Number.isFinite(value) || value < min || value > max) return;
      // Snapped to the step's own decimals (0.005 → 3), so the copied JSON never
      // carries float dust such as 0.14500000000000002.
      params[row.key] = step < 1 ? Number(value.toFixed(decimalsOf(step))) : Math.round(value);
      setStatus('');
      commit();
    });
  }
  for (const row of LOOK_ROWS) {
    lookNodes.get(row.key).input.addEventListener('input', event => {
      const value = Number(event.currentTarget.value);
      if (!Number.isFinite(value) || value < row.min || value > row.max) return;
      if (row.key === 'glow') glowDirty = true;
      look[row.key] = row.step < 1 ? value : Math.round(value);
      setStatus('');
      commit();
    });
  }
  shapeSelect.addEventListener('change', () => {
    if (!Object.hasOwn(WARP_SHAPES, shapeSelect.value)) return;
    params.shape = shapeSelect.value;
    setStatus('');
    commit();
  });
  colorInputs.forEach(({ color, alpha }, index) => {
    color.addEventListener('input', () => {
      params.colors[index] = { hex: color.value, alpha: 1 };
      setStatus('');
      commit();
    });
    alpha.addEventListener('change', () => {
      params.colors[index] = { hex: params.colors[index].hex, alpha: alpha.checked ? 0 : 1 };
      setStatus('');
      commit();
    });
  });
  playButton.addEventListener('click', () => (playing ? stopPlayback() : startPlayback()));
  randomButton.addEventListener('click', randomize);
  presetButton.addEventListener('click', loadSelected);
  resetButton.addEventListener('click', reset);
  copyButton.addEventListener('click', copyParams);

  // Saved values win over the preset on open: the preset is offered, never forced.
  const restore = readStorage();
  if (restore) {
    params = normalizeWarpParams(restore.warp ?? restore);
    const restoredLook = readLookValues(restore.look ?? restore);
    look = restoredLook.look;
    glowDirty = restoredLook.pinned;
  } else {
    params = cloneBaselineParams();
    look = cloneBaselineLook();
    glowDirty = baseline.pinned;
  }
  renderValues();
  applyLook();

  const resize = new ResizeObserver(() => { if (ready) fitLivePreview(); });
  resize.observe(liveWrap);
  // An untouched glow slider shows the current theme's value in the panel.
  const themeObserver = new MutationObserver(() => { if (!glowDirty) renderValues(); });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  init();

  return {
    reset,
    params: () => ({ warp: params, look }),
    stop: () => {
      disposed = true;
      stopPlayback();
      resize.disconnect();
      themeObserver.disconnect();
      mount?.dispose();
    },
  };
}
