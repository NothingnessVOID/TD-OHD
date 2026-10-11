import records from './content-data.json' with { type: 'json' };

/** Wa owns this catalog. These aliases do not alter ordinary channel knowledge. */
export const WA_CONTENT_ALIASES = Object.freeze({ '21-45':'45-21', '25-51':'51-25', '2-14':'2-14', '3-60':'3-60', '6-59':'59-6', '27-50':'27-50' });
export const WA_PAIR_IDS = Object.freeze(Object.keys(WA_CONTENT_ALIASES));
const locales = new Set(['en', 'zh-CN', 'zh-Hant']);
const clone = value => structuredClone(value);
export function canonicalWaContentId(id) {
  if(typeof id!=='string')return null;
  const bare=id.replace(/^wa\.(communication|topic)\./,'');
  return Object.keys(WA_CONTENT_ALIASES).find(key=>key===bare || WA_CONTENT_ALIASES[key]===bare) || bare;
}
export function readWaContent(id, locale = 'en') {
  if(!locales.has(locale))return null;
  const canonicalId=canonicalWaContentId(id), packageId=WA_CONTENT_ALIASES[canonicalId] || canonicalId;
  const record=records.find(item=>item.objectId===packageId);
  if(!record?.locales[locale])return null;
  return { ...clone(record), ...clone(record.locales[locale]), canonicalId, packageId:record.objectId };
}
export function listWaContent(locale = 'en') { return locales.has(locale)?records.map(record=>readWaContent(record.objectId,locale)):[]; }
export function waPairLabel(id, locale = 'en') {
  const entry=readWaContent(id,locale); if(!entry)return '';
  // The supplied catalog uses an en dash followed by one space. Change only that exact prefix.
  const prefix=entry.packageId.replace('-', '–')+' ';
  return entry.name.startsWith(prefix)?`${entry.canonicalId} ${entry.name.slice(prefix.length)}`:entry.name;
}
