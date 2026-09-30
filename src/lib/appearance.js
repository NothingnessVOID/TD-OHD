/** Theme and skin selection are independent axes of the application's appearance. */

export const DEFAULT_SITE_SKIN = 'default';
export const DEFAULT_HD_SKIN = 'classic';

const THEME_STORAGE_KEY = 'bodygraph-theme';
const listeners = new Set();

function root() {
  return document.documentElement;
}

function notify() {
  const appearance = getAppearance();
  for (const listener of listeners) listener(appearance);
}

function setAttribute(name, value) {
  if (root().getAttribute(name) === value) return false;
  root().setAttribute(name, value);
  notify();
  return true;
}

export function getTheme() {
  return root().getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function getSiteSkin() {
  return root().getAttribute('data-skin') || DEFAULT_SITE_SKIN;
}

export function getHumanDesignSkin() {
  return root().getAttribute('data-hd-skin') || DEFAULT_HD_SKIN;
}

export function getAppearance() {
  return { theme: getTheme(), siteSkin: getSiteSkin(), humanDesignSkin: getHumanDesignSkin() };
}

export function initAppearance() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  root().setAttribute('data-theme', saved === 'dark' || (!saved && prefersDark) ? 'dark' : 'light');
  root().setAttribute('data-skin', DEFAULT_SITE_SKIN);
  root().setAttribute('data-hd-skin', DEFAULT_HD_SKIN);
}

export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') throw new TypeError('Unknown theme');
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  setAttribute('data-theme', theme);
}

function assertSkin(skin) {
  if (typeof skin !== 'string' || !/^[a-z][a-z0-9-]*$/.test(skin)) {
    throw new TypeError('Skin name must be a lowercase CSS identifier');
  }
}

export function setSiteSkin(skin) {
  assertSkin(skin);
  setAttribute('data-skin', skin);
}

export function setHumanDesignSkin(skin) {
  assertSkin(skin);
  setAttribute('data-hd-skin', skin);
}

export function onAppearanceChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
