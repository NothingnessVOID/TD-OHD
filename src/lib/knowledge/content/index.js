import en from './human-design-en.js';
import zhCN from './human-design-zh-CN.js';
import zhHant from './human-design-zh-Hant.js';
import { getLocale } from '../../i18n.js';
import { resolveKnowledgeText } from '../terms.js';
export const knowledgeContent = Object.freeze({ en, 'zh-CN':zhCN, 'zh-Hant':zhHant });
// Formal locale resources; never machine-translated at runtime or cross-language fallback.
export function reviewedText(key, slot) {
  const record = knowledgeContent[getLocale()]?.[key];
  if (!record || typeof record[slot] !== 'string') throw new TypeError(`Missing knowledge content: ${getLocale()}/${key}/${slot}`);
  return resolveKnowledgeText(record[slot]);
}
