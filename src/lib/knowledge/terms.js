import { TYPES } from '../human-design/catalog.js';
import { authorityNames } from '../human-design/identities.js';
import * as vocabulary from '../vocabulary.js';
import { t } from '../i18n.js';
import { esc } from '../format.js';
const conceptKeys = { strategy:'Strategy', authority:'Authority', signature:'Signature', notSelf:'Not-Self Theme', definition:'Definition',profile:'Profile',cross:'Incarnation Cross',response:'Response', recognition:'Recognition', invitation:'Invitation' };
const geometryKeys={rightAngle:'Right Angle',juxtaposition:'Juxtaposition',leftAngle:'Left Angle'};
const variableKeys = { determination:'Determination',environment:'Environment',motivation:'Motivation',perspective:'Perspective' };
// Lookup functions are called at render time so locale and vocabulary updates propagate.
export function knowledgeTerm(id, words = vocabulary, translate = t) {
  const [kind, key, ...rest] = id.split('.');
  if (rest.length) throw new TypeError(`Unknown knowledge term: ${id}`);
  if (kind === 'type' && Object.hasOwn(TYPES,key)) return words.typeName(TYPES[key].name);
  if (kind === 'authority' && Object.hasOwn(authorityNames,key)) return words.authorityName(authorityNames[key]);
  if (kind === 'center' && ['head','ajna','throat','g','heart','sacral','spleen','solar','root'].includes(key)) return words.centerName(key);
  if (kind === 'concept' && Object.hasOwn(conceptKeys,key)) return translate(conceptKeys[key]);
  if (kind === 'geometry' && Object.hasOwn(geometryKeys,key)) return translate(geometryKeys[key]);
  if (kind === 'variable' && Object.hasOwn(variableKeys,key)) return translate(variableKeys[key]);
  throw new TypeError(`Unknown knowledge term: ${id}`);
}
export function resolveKnowledgeText(template, { rich = false, term = knowledgeTerm } = {}) {
  if (typeof template !== 'string') throw new TypeError('Knowledge template must be text');
  const pattern = /\[\[term:([^\]]+)\]\]/g;
  let out = '', offset = 0;
  for (const match of template.matchAll(pattern)) {
    const literal = template.slice(offset, match.index), value = term(match[1]);
    out += (rich ? esc(literal) : literal) + (rich ? `<strong class="knowledge-term">${esc(value)}</strong>` : value);
    offset = match.index + match[0].length;
  }
  out += rich ? esc(template.slice(offset)) : template.slice(offset);
  if (out.includes('[[term:')) throw new TypeError('Malformed knowledge term reference');
  return out;
}
