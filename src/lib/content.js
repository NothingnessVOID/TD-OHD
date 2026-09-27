/** Read-only display dictionaries. English reads the original engine objects. */
import * as engine from 'natalengine';
import { getLocale, getLocaleResources } from './i18n.js';
import { quarterForGate } from './quarter.js';

const content = () => getLocaleResources().content;
function dictionary(name) {
  return new Proxy(engine[name], {
    get: (_source, key) => {
      const value = content().data[name]?.[key] ?? engine[name][key];
      if (name !== 'GATE_DESCRIPTIONS' || typeof key !== 'string' || !/^\d+$/.test(key) || !value) return value;
      const quarter = quarterForGate(Number(key), getLocale());
      return quarter ? { ...value, quarter } : value;
    },
    set: () => false
  });
}
export const GATE_DESCRIPTIONS = dictionary('GATE_DESCRIPTIONS');
export const LINE_DESCRIPTIONS = dictionary('LINE_DESCRIPTIONS');
export const CHANNEL_DESCRIPTIONS = dictionary('CHANNEL_DESCRIPTIONS');
export const HEXAGRAM_DESCRIPTIONS = dictionary('HEXAGRAM_DESCRIPTIONS');
export const GENE_KEY_DESCRIPTIONS = dictionary('GENE_KEY_DESCRIPTIONS');
export const contentText = value => content().text(value);
export const crossName = cross => content().cross(cross);

/** Keep the source term alongside Chinese Gene Keys keywords for comparison. */
export function geneKeyTerm(gate, field) {
  const original = engine.GENE_KEY_DESCRIPTIONS[gate]?.[field] || '';
  const translated = GENE_KEY_DESCRIPTIONS[gate]?.[field] || original;
  return content().bilingualGeneKeys && original && translated !== original
    ? `${translated} ${original}` : translated;
}
