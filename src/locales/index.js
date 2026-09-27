/** Add a reviewed language provider here; views do not import locale files. */
import en from './en.js';
import zhCN from './zh-CN/index.js';
import zhHant from './zh-Hant/index.js';
export const localeResources = { en, 'zh-CN': zhCN, 'zh-Hant': zhHant };

const loaders = {
  'zh-CN': () => import('./zh-CN/full.js'),
  'zh-Hant': () => import('./zh-Hant/full.js')
};
const flights = new Map();
export async function loadLocaleResource(code) {
  if (code === 'en') return localeResources.en;
  if (!loaders[code]) throw new Error(`Unsupported locale: ${code}`);
  if (!flights.has(code)) flights.set(code, loaders[code]().then(module => {
    Object.assign(localeResources[code], module.default);
    return localeResources[code];
  }).catch(error => { flights.delete(code); throw error; }));
  return flights.get(code);
}
