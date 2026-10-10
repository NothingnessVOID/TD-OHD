/** Embed only the selected CJK face ranges needed by a local PNG export.
 * Remote Latin CSS remains under the existing browser/system fallback behavior.
 */
import { getFontPreference } from './font-preference.js';
const downloads = new Map();
function dataUrl(url) {
 if (!downloads.has(url)) downloads.set(url, fetch(url).then(response => {
  if (!response.ok) throw Error('Export font unavailable');return response.blob();
 }).then(blob => new Promise((resolve,reject) => {const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);})).catch(error=>{downloads.delete(url);throw error;}));
 return downloads.get(url);
}
function contains(range, code) {
 return range.split(',').some(part=>{const value=part.trim().replace(/^U\+/i,'');const pieces=value.includes('?')?[value.replaceAll('?','0'),value.replaceAll('?','F')]:value.split('-');const low=parseInt(pieces[0],16),high=parseInt(pieces[1]||pieces[0],16);return code>=low&&code<=high;});
}
export async function fontCssForExport(root) {
 const preference=getFontPreference();if(preference==='original')return '';
 const family=preference==='ipa'?'TD IPA Original':'TD LXGW Neo ZhiSong';
 const text=[root.textContent,...[...root.querySelectorAll('input,textarea')].map(n=>n.value)].join('');
 await document.fonts.load(`16px "${family}"`,text);await document.fonts.ready;
 const codes=[...new Set(Array.from(text,c=>c.codePointAt(0)))],matches=[];
 function visit(sheet){let rules;try{rules=sheet.cssRules;}catch{return;}
  for(const rule of rules){if(rule.styleSheet){visit(rule.styleSheet);continue;}if(rule.type!==CSSRule.FONT_FACE_RULE)continue;
   if(rule.style.getPropertyValue('font-family').replaceAll(/["']/g,'').trim()!==family)continue;
   const range=rule.style.getPropertyValue('unicode-range');if(range&&!codes.some(c=>contains(range,c)))continue;
   matches.push({css:rule.cssText,base:sheet.href||document.baseURI});
  }
 }
 for(const sheet of document.styleSheets)visit(sheet);
 return (await Promise.all(matches.map(async({css,base})=>{const urls=[...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)];for(const match of urls)css=css.replace(match[0],`url("${await dataUrl(new URL(match[1],base).href)}")`);return css;}))).join('\n');
}
