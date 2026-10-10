/** Device-local typography preference, deliberately independent of appearance-v3. */
export const FONT_STORAGE_KEY = 'td-ohd-font-v1';
export const FONT_IDS = Object.freeze(['lxgw', 'original', 'ipa']);
const listeners = new Set();
export const getFontPreference = () => FONT_IDS.includes(document.documentElement.dataset.font) ? document.documentElement.dataset.font : 'lxgw';
export function setFontPreference(font) {
  if (!FONT_IDS.includes(font)) throw new TypeError('Unknown font preference');
  document.documentElement.dataset.font = font;
  try { localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify({ version: 1, font })); } catch { /* Current tab remains usable without storage. */ }
  for (const notify of listeners) notify(font);
}
export function onFontPreferenceChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
