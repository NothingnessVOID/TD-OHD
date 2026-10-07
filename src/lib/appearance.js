import { getSkin as lookupSkin, getCenterPalette as lookupPalette, defaultSkinForMode } from './skin-registry.js';

export const DEFAULT_SITE_SKIN = 'default-light';
export const DEFAULT_HD_SKIN = 'classic'; // Legacy name: this now means Center Palette.
export const APPEARANCE_STORAGE_KEY = 'td-ohd-appearance-v3';
export const LEGACY_APPEARANCE_STORAGE_KEY = 'td-ohd-appearance-v1';
const THEME_STORAGE_KEY = 'bodygraph-theme';
const listeners = new Set();
let overridesBySkin = {};
let preferences = {};
let skinMode = 'manual';
let systemScheme = null;
export const SKIN_CUSTOM_TOKENS = Object.freeze({
  accent: '--accent', personality: '--hd-personality', design: '--hd-design',
  transit: '--hd-transit', graphBackground: '--hd-graph-bg'
});
export const CUSTOM_TOKENS = Object.freeze({ ...SKIN_CUSTOM_TOKENS, gateNumberSize: '--hd-gate-number-size' });
const root = () => document.documentElement;
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Current-session state still works. */ } };
const validValue = (key, value) => key === 'gateNumberSize'
  ? ['number', 'string'].includes(typeof value) && Number.isFinite(Number(value)) && Number(value) >= 14 && Number(value) <= 30
  : typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const validIdentifier = id => typeof id === 'string' && /^[a-z][a-z0-9-]*$/.test(id);
export const getSkinId = () => lookupSkin(root().getAttribute('data-skin'))?.id ?? DEFAULT_SITE_SKIN;
export const getSkinMode = () => skinMode;
export const getTheme = () => lookupSkin(getSkinId()).mode;
export const getCenterPalette = () => lookupPalette(root().getAttribute('data-center-palette'))?.id ?? DEFAULT_HD_SKIN;
export const getSiteSkin = getSkinId;
export const getHumanDesignSkin = getCenterPalette;
export const getAppearance = () => ({
  skin: getSkinId(), skinMode: getSkinMode(), centerPalette: getCenterPalette(),
  theme: getTheme(), siteSkin: getSkinId(), humanDesignSkin: getCenterPalette()
});
// Compatibility shape for existing color/size controls; persisted slots remain separate.
export const getCustomOverrides = () => ({ ...overridesBySkin[getSkinId()], ...preferences });
export const getSkinOverrides = (id = getSkinId()) => ({ ...overridesBySkin[id] });
export const getAppearancePreferences = () => ({ ...preferences });

function applyOverrides() {
  const style = root().style;
  if (!style) return;
  for (const token of Object.values(CUSTOM_TOKENS)) style.removeProperty(token);
  for (const token of ['--accent-soft', '--accent-hover', '--accent-strong', '--accent-on', '--hd-graph-panel-bg', '--hd-transit-text']) style.removeProperty(token);
  for (const [key, value] of Object.entries(getCustomOverrides())) style.setProperty(CUSTOM_TOKENS[key], key === 'gateNumberSize' ? `${value}px` : value);
  const current = getSkinOverrides();
  // Only user-edited Transit uses the legacy column-text treatment.
  // Skin defaults keep their explicitly designed on/text/soft values.
  if (current.transit && !['default-light', 'default-dark'].includes(getSkinId())) style.setProperty('--hd-transit-text', getTheme() === 'dark'
    ? 'var(--hd-transit)' : 'color-mix(in srgb, var(--hd-transit) 65%, var(--text))');
  if (current.graphBackground) style.setProperty('--hd-graph-panel-bg', current.graphBackground);
  if (current.accent) {
    style.setProperty('--accent-soft', 'color-mix(in srgb, var(--accent) 16%, var(--bg))');
    style.setProperty('--accent-hover', 'color-mix(in srgb, var(--accent) 75%, var(--text))');
    style.setProperty('--accent-strong', 'color-mix(in srgb, var(--accent) 75%, var(--text))');
    const rgb = current.accent.slice(1).match(/../g).map(x => parseInt(x,16));
    style.setProperty('--accent-on', (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 > 150 ? '#16130f' : '#ffffff');
  }
}
function persist() {
  write(APPEARANCE_STORAGE_KEY, JSON.stringify({ version: 3, skinMode, skinId: getSkinId(), centerPalette: getCenterPalette(), overridesBySkin, preferences }));
  write(THEME_STORAGE_KEY, getTheme()); // Compatibility readers only; Skin is authoritative.
}
function notify() { applyOverrides(); for (const listener of listeners) listener(getAppearance()); }
const parse = key => { try { return JSON.parse(read(key)); } catch { return null; } };
function colors(values) {
  return Object.fromEntries(Object.entries(values || {}).filter(([key, value]) => Object.hasOwn(SKIN_CUSTOM_TOKENS, key) && validValue(key, value)));
}
function size(values) {
  return validValue('gateNumberSize', values?.gateNumberSize) ? { gateNumberSize: Number(values.gateNumberSize) } : {};
}
export function initAppearance() {
  overridesBySkin = {}; preferences = {}; skinMode = 'manual';
  // Reinitialization must not duplicate the system-theme listener.
  if (systemScheme?.removeEventListener) systemScheme.removeEventListener('change', onSystemSchemeChange);
  else systemScheme?.removeListener?.(onSystemSchemeChange);
  systemScheme = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  const savedTheme = read(THEME_STORAGE_KEY);
  const legacyMode = savedTheme === 'dark' || (!savedTheme && systemScheme?.matches) ? 'dark' : 'light';
  let skinId = defaultSkinForMode(legacyMode), centerPalette = DEFAULT_HD_SKIN;
  const saved = parse(APPEARANCE_STORAGE_KEY);
  if (saved?.version === 3) {
    // Existing v3 preferences stay manual unless Auto was explicitly chosen.
    skinMode = saved.skinMode === 'auto' ? 'auto' : 'manual';
    if (lookupSkin(saved.skinId)) skinId = saved.skinId;
    if (lookupPalette(saved.centerPalette)) centerPalette = saved.centerPalette;
    for (const [id, values] of Object.entries(saved.overridesBySkin || {})) {
      // Keep dormant future Skin preferences; never activate an unregistered Skin.
      if (validIdentifier(id)) Object.defineProperty(overridesBySkin, id, { value: colors(values), enumerable: true, writable: true, configurable: true });
    }
    preferences = size(saved.preferences);
  } else {
    const legacy = parse(LEGACY_APPEARANCE_STORAGE_KEY);
    if ([1, 2].includes(legacy?.version)) {
      if (lookupPalette(legacy.preset)) centerPalette = legacy.preset;
      let effective = {};
      if (legacy.version === 1) {
        // Exactly the previous effective-global precedence. Preserve raw legacy storage as well.
        for (const palette of ['classic', 'chakra']) for (const mode of [legacyMode === 'light' ? 'dark' : 'light', legacyMode]) {
          const values = legacy.overrides?.[`${palette}:${mode}`];
          effective = { ...effective, ...colors(values), ...size(values) };
        }
      }
      effective = { ...effective, ...colors(legacy.globalOverrides), ...size(legacy.globalOverrides) };
      // Old colors were global. Seed both defaults to retain the existing look in both modes.
      overridesBySkin = { 'default-light': colors(effective), 'default-dark': colors(effective) };
      preferences = size(effective);
    }
  }
  if (skinMode === 'auto') skinId = resolvedSystemSkin();
  root().setAttribute('data-skin', skinId);
  root().setAttribute('data-theme', lookupSkin(skinId).mode);
  root().setAttribute('data-center-palette', centerPalette);
  root().setAttribute('data-hd-skin', centerPalette); // Compatibility selector mirror.
  applyOverrides(); persist();
  if (systemScheme?.addEventListener) systemScheme.addEventListener('change', onSystemSchemeChange);
  else systemScheme?.addListener?.(onSystemSchemeChange);
}
const resolvedSystemSkin = () => defaultSkinForMode(systemScheme?.matches ? 'dark' : 'light');
function onSystemSchemeChange() {
  if (skinMode === 'auto') applySkin(resolvedSystemSkin(), 'auto');
}
// Auto resolves to a registered Skin and uses the same override/refresh path as manual selection.
function applySkin(id, mode) {
  const skin = lookupSkin(id);
  if (!skin) throw new TypeError('Unknown Skin');
  if (getSkinId() === id && skinMode === mode) return;
  skinMode = mode;
  root().setAttribute('data-skin', id);
  root().setAttribute('data-theme', skin.mode);
  persist(); notify();
}
export function setSkin(id) { applySkin(id, 'manual'); }
export function setAutoSkin() { applySkin(resolvedSystemSkin(), 'auto'); }
export function setTheme(mode) {
  if (!['light','dark'].includes(mode)) throw new TypeError('Unknown theme');
  setSkin(defaultSkinForMode(mode));
}
export function setSiteSkin(id) { setSkin(id === 'default' ? defaultSkinForMode(getTheme()) : id); }
export function setCenterPalette(id) {
  if (!lookupPalette(id)) throw new TypeError('Unknown Center Palette');
  if (getCenterPalette() === id) return;
  root().setAttribute('data-center-palette', id);
  root().setAttribute('data-hd-skin', id);
  persist(); notify();
}
export const setHumanDesignSkin = setCenterPalette;
export function setCustomOverride(key, value) {
  if (!Object.hasOwn(CUSTOM_TOKENS,key) || !validValue(key,value)) throw new TypeError('Invalid appearance override');
  if (key === 'gateNumberSize') preferences.gateNumberSize = Number(value);
  else {
    const id = getSkinId();
    overridesBySkin[id] = { ...getSkinOverrides(id), [key]: value };
  }
  persist(); notify();
}
export function restoreCurrentSkin() {
  delete overridesBySkin[getSkinId()];
  persist(); notify();
}
export const restoreCurrentPreset = restoreCurrentSkin;
export function resetAppearance() {
  // Existing API retains mode. Write an empty v3 state so old data cannot resurrect.
  const id = defaultSkinForMode(getTheme());
  skinMode = 'manual';
  overridesBySkin = {}; preferences = {};
  root().setAttribute('data-skin', id);
  root().setAttribute('data-theme', lookupSkin(id).mode);
  root().setAttribute('data-center-palette', DEFAULT_HD_SKIN);
  root().setAttribute('data-hd-skin', DEFAULT_HD_SKIN);
  persist(); notify();
}
export function onAppearanceChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
