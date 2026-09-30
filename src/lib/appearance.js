/** Theme, site skin and Human Design skin share one appearance state. */
export const DEFAULT_SITE_SKIN = 'default';
export const DEFAULT_HD_SKIN = 'classic';
export const APPEARANCE_STORAGE_KEY = 'td-ohd-appearance-v1';
const THEME_STORAGE_KEY = 'bodygraph-theme';
const listeners = new Set();
let overrides = {};
export const CUSTOM_TOKENS = Object.freeze({
  accent: '--accent', personality: '--hd-personality', design: '--hd-design',
  transit: '--hd-transit', graphBackground: '--hd-graph-bg', gateNumberSize: '--hd-gate-number-size'
});
const root = () => document.documentElement;
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Still works in private storage. */ } };
const validValue = (key, value) => key === 'gateNumberSize'
  ? ['number', 'string'].includes(typeof value) && Number.isFinite(Number(value)) && Number(value) >= 9 && Number(value) <= 14
  : typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
export const getTheme = () => root().getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
export const getSiteSkin = () => root().getAttribute('data-skin') || DEFAULT_SITE_SKIN;
export const getHumanDesignSkin = () => root().getAttribute('data-hd-skin') || DEFAULT_HD_SKIN;
export const getAppearance = () => ({ theme: getTheme(), siteSkin: getSiteSkin(), humanDesignSkin: getHumanDesignSkin() });
const scope = () => `${getHumanDesignSkin()}:${getTheme()}`;
export const getCustomOverrides = () => ({ ...overrides[scope()] });
function applyOverrides() {
  const style = root().style;
  if (!style) return;
  for (const token of Object.values(CUSTOM_TOKENS)) style.removeProperty(token);
  for (const token of ['--accent-soft', '--accent-hover', '--accent-strong', '--accent-on', '--hd-graph-panel-bg']) style.removeProperty(token);
  const current = getCustomOverrides();
  for (const [key, value] of Object.entries(current)) style.setProperty(CUSTOM_TOKENS[key], key === 'gateNumberSize' ? `${value}px` : value);
  if (current.graphBackground) style.setProperty('--hd-graph-panel-bg', current.graphBackground);
  if (current.accent) {
    style.setProperty('--accent-soft', 'color-mix(in srgb, var(--accent) 16%, var(--bg))');
    style.setProperty('--accent-hover', 'color-mix(in srgb, var(--accent) 75%, var(--text))');
    style.setProperty('--accent-strong', 'color-mix(in srgb, var(--accent) 75%, var(--text))');
    const rgb = current.accent.slice(1).match(/../g).map(x => parseInt(x,16));
    style.setProperty('--accent-on', (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 > 150 ? '#16130f' : '#ffffff');
  }
}
function persist() { write(APPEARANCE_STORAGE_KEY, JSON.stringify({ version: 1, preset: getHumanDesignSkin(), overrides })); }
function notify() { applyOverrides(); for (const listener of listeners) listener(getAppearance()); }
export function initAppearance() {
  overrides = {};
  let preset = DEFAULT_HD_SKIN;
  try {
    const saved = JSON.parse(read(APPEARANCE_STORAGE_KEY));
    if (saved?.version === 1) {
      if (['classic', 'chakra'].includes(saved.preset)) preset = saved.preset;
      for (const skin of ['classic','chakra']) for (const theme of ['light','dark']) {
        const name = `${skin}:${theme}`;
        for (const [key,value] of Object.entries(saved.overrides?.[name] || {})) {
          if (Object.hasOwn(CUSTOM_TOKENS,key) && validValue(key,value)) (overrides[name] ||= {})[key] = key === 'gateNumberSize' ? Number(value) : value;
        }
      }
    }
  } catch { /* Discard malformed preferences. */ }
  const savedTheme = read(THEME_STORAGE_KEY);
  root().setAttribute('data-theme', savedTheme === 'dark' || (!savedTheme && window.matchMedia?.('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');
  root().setAttribute('data-skin', DEFAULT_SITE_SKIN);
  root().setAttribute('data-hd-skin', preset);
  applyOverrides();
}
export function setTheme(theme) {
  if (!['light','dark'].includes(theme)) throw new TypeError('Unknown theme');
  write(THEME_STORAGE_KEY, theme);
  if (getTheme() !== theme) { root().setAttribute('data-theme', theme); notify(); }
}
function assertSkin(skin) {
  if (typeof skin !== 'string' || !/^[a-z][a-z0-9-]*$/.test(skin)) throw new TypeError('Skin name must be a lowercase CSS identifier');
}
export function setSiteSkin(skin) { assertSkin(skin); if (getSiteSkin() !== skin) { root().setAttribute('data-skin',skin); notify(); } }
export function setHumanDesignSkin(skin) {
  assertSkin(skin);
  if (getHumanDesignSkin() === skin) return;
  root().setAttribute('data-hd-skin',skin);
  // Non-preset skins remain available for token probes but are never restored.
  persist(); notify();
}
export function setCustomOverride(key, value) {
  if (!Object.hasOwn(CUSTOM_TOKENS,key) || !validValue(key,value)) throw new TypeError('Invalid appearance override');
  (overrides[scope()] ||= {})[key] = key === 'gateNumberSize' ? Number(value) : value;
  persist(); notify();
}
export function restoreCurrentPreset() { delete overrides[scope()]; persist(); notify(); }
export function resetAppearance() {
  overrides = {};
  try { localStorage.removeItem(THEME_STORAGE_KEY); localStorage.removeItem(APPEARANCE_STORAGE_KEY); } catch { /* No persistent storage. */ }
  root().setAttribute('data-theme',window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root().setAttribute('data-skin',DEFAULT_SITE_SKIN);
  root().setAttribute('data-hd-skin',DEFAULT_HD_SKIN);
  notify();
}
export function onAppearanceChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
