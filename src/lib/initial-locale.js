// Shared by the pre-paint bootstrap and runtime i18n.
export const LOCALE_STORAGE_KEY = 'ohd-language';
export function resolveLocale(saved) {
  return ['en', 'zh-CN', 'zh-Hant'].includes(saved) ? saved : 'zh-CN';
}
export function readInitialLocale() {
  try { return resolveLocale(globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY)); }
  catch { return 'zh-CN'; }
}
